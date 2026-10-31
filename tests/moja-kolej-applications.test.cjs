const {test}=require('node:test');
const assert=require('node:assert/strict');
const {handler}=require('../netlify/functions/moja-kolej-2027.js');
const good={campaign:'moja-kolej-2027',name:'Testowy Uczestnik',email:'test@example.invalid',phone:'',goal:'regularnosc',why:'Chcę wprowadzić systematyczne treningi.',consent:true,elapsedMs:6000};
const event=(data,method='POST',headers={origin:'https://kkcoaching.fit'})=>({httpMethod:method,body:typeof data==='string'?data:JSON.stringify(data),headers});
test('validation rejects malformed requests and requires privacy consent',async()=>{
  for(const x of ['null','[]','{bad','true','"x"'])assert.equal((await handler(event(x))).statusCode,400);
  for(const k of ['name','email','goal','why']){
    for(const value of ['',false,null,{},[]])assert.equal((await handler(event({...good,[k]:value}))).statusCode,400);
  }
  for(const v of [false,'false',null,''])assert.equal((await handler(event({...good,consent:v}))).statusCode,400);
  assert.equal((await handler(event({...good,goal:'bogus'}))).statusCode,400);
  assert.equal((await handler(event({...good,campaign:'contact'}))).statusCode,400);
  assert.equal((await handler(event({...good,elapsedMs:800}))).statusCode,429);
  assert.equal((await handler(event(good,'GET'))).statusCode,405);
  assert.equal((await handler(event(good,'POST',{origin:'https://evil.example'}))).statusCode,403);
  assert.equal((await handler(event({...good,company:'SpamBot'}))).statusCode,200);
});
test('successful mail, escaping and resilient provider errors (all mocked)',async()=>{
  const before={RESEND_API_KEY:process.env.RESEND_API_KEY,CONTACT_TO_EMAIL:process.env.CONTACT_TO_EMAIL,CONTACT_FROM_EMAIL:process.env.CONTACT_FROM_EMAIL};
  const oldFetch=global.fetch;const calls=[];
  try{
    process.env.RESEND_API_KEY='fake-key';process.env.CONTACT_TO_EMAIL='coach@example.invalid';process.env.CONTACT_FROM_EMAIL='noreply@example.invalid';
    global.fetch=async (url,options)=>{calls.push({url,options,body:JSON.parse(options.body)});return {ok:true,status:200}};
    const result=await handler(event({...good,name:'<script>alert(1)</script>'}));
    assert.equal(result.statusCode,200);
    assert.equal(JSON.parse(result.body).ok,true);
    assert.equal(calls.length,1);
    assert.equal(calls[0].url,'https://api.resend.com/emails');
    assert.match(calls[0].body.subject,/MOJA KOLEJ 2027/);
    assert.ok(calls[0].body.html.includes('moja-kolej-2027'));
    assert.ok(calls[0].body.html.includes('&lt;script&gt;'));
    assert.equal(calls[0].body.reply_to,good.email);
    assert.ok(!calls[0].body.html.includes('stripe'));
    const original=console.error;console.error=()=>{};
    try{
      global.fetch=async()=>({ok:false,status:503});
      assert.equal((await handler(event(good))).statusCode,502);
      global.fetch=async()=>{throw new Error('secret provider details')};
      assert.equal((await handler(event(good))).statusCode,502);
    }finally{console.error=original}
  }finally{
    global.fetch=oldFetch;
    for(const [k,v]of Object.entries(before)){if(v===undefined)delete process.env[k];else process.env[k]=v}
  }
});
test('missing provider configuration returns failure rather than fake confirmation',async()=>{
  const before={RESEND_API_KEY:process.env.RESEND_API_KEY,CONTACT_TO_EMAIL:process.env.CONTACT_TO_EMAIL,CONTACT_FROM_EMAIL:process.env.CONTACT_FROM_EMAIL};
  const original=console.error;console.error=()=>{};
  try{
    delete process.env.RESEND_API_KEY;delete process.env.CONTACT_TO_EMAIL;delete process.env.CONTACT_FROM_EMAIL;
    const result=await handler(event(good));
    assert.equal(result.statusCode,503);
    assert.equal(JSON.parse(result.body).ok,false);
  }finally{
    console.error=original;
    for(const [k,v]of Object.entries(before)){if(v===undefined)delete process.env[k];else process.env[k]=v}
  }
});
