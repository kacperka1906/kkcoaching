// Isolated application handler for KK Coaching "MOJA KOLEJ 2027".
// No payments or confirmed bookings. Emails use existing Resend environment settings.
const RESEND_API_URL='https://api.resend.com/emails';
const GOALS = new Set(['redukcja','miesnie','sprawnosc','regularnosc','inny']);
const allowedOrigin = /^https:\/\/(?:www\.)?kkcoaching\.fit$/i;
const escapeHtml = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fail = (statusCode,message) => ({statusCode,headers:{'Content-Type':'application/json','Cache-Control':'no-store'},body:JSON.stringify({ok:false,error:message})});
exports.handler=async event=>{
  if(event.httpMethod!=='POST') return fail(405,'Method not allowed');
  const h=event.headers||{};
  if(h.origin && !allowedOrigin.test(String(h.origin))) return fail(403,'Invalid origin');
  if(typeof event.body!=='string' || event.body.length>6500) return fail(413,'Invalid request size');
  let input;try{input=JSON.parse(event.body)}catch{return fail(400,'Invalid JSON')}
  if(!input||typeof input!=='object'||Array.isArray(input))return fail(400,'Invalid input');
  if(input.company) return {statusCode:200,headers:{'Content-Type':'application/json','Cache-Control':'no-store'},body:JSON.stringify({ok:true,discarded:true})};
  if(input.campaign!=='moja-kolej-2027')return fail(400,'Invalid campaign');
  const required=['name','email','goal','why'];
  if(required.some(k=>typeof input[k]!=='string'||!input[k].trim()))return fail(400,'Uzupełnij wymagane pola');
  if(input.consent!==true && input.consent!=='on')return fail(400,'Potwierdź zapoznanie się z polityką prywatności');
  const name=input.name.trim(),email=input.email.trim(),goal=input.goal,why=input.why.trim();
  const phone=typeof input.phone==='string'?input.phone.trim():'';
  if(name.length>100||name.length<2 || email.length>150 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
     !GOALS.has(goal)||why.length<10||why.length>1200||phone.length>40)return fail(400,'Sprawdź poprawność wpisanych danych');
  if(/[\r\n]/.test(email)||/[\r\n]/.test(name))return fail(400,'Invalid characters');
  // Friction-free antispam: honeypot above plus optional elapsed time guard; never rely on the browser alone.
  if(Number.isFinite(input.elapsedMs)&&input.elapsedMs>0&&input.elapsedMs<2500)return fail(429,'Spróbuj ponownie za chwilę');
  const apiKey=process.env.RESEND_API_KEY;
  const to=process.env.CONTACT_TO_EMAIL;
  const from=process.env.CONTACT_FROM_EMAIL;
  if(!apiKey||!to||!from){console.error('MOJA KOLEJ: mail delivery not configured');return fail(503,'Zgłoszenia są chwilowo niedostępne. Spróbuj później.')}
  const clean = {name,email,phone,goal,why};
  const html = [
    '<h2>Nowe zgłoszenie: MOJA KOLEJ 2027</h2>',
    '<p><strong>Kampania:</strong> moja-kolej-2027</p>',
    '<p><strong>Imię:</strong> '+escapeHtml(clean.name)+'</p>',
    '<p><strong>Email:</strong> '+escapeHtml(clean.email)+'</p>',
    '<p><strong>Telefon (opcjonalnie):</strong> '+escapeHtml(clean.phone)+'</p>',
    '<p><strong>Cel:</strong> '+escapeHtml(clean.goal)+'</p>',
    '<p><strong>Dlaczego chce dołączyć:</strong></p><p>'+escapeHtml(clean.why).replace(/\n/g,'<br>')+'</p>',
    '<p>Zgłoszenie nie oznacza automatycznej rezerwacji miejsca ani wpłaty.</p>'
  ].join('');
  try{
    const result=await fetch(RESEND_API_URL,{
      method:'POST',
      headers:{Authorization:'Bearer '+apiKey,'Content-Type':'application/json'},
      body:JSON.stringify({
        from,to,reply_to:clean.email,
        subject:'MOJA KOLEJ 2027 — nowe zgłoszenie: '+clean.name,
        html
      }),
      signal:AbortSignal.timeout(10000)
    });
    if(!result.ok){console.error('MOJA KOLEJ: mail delivery HTTP',result.status);return fail(502,'Nie udało się wysłać zgłoszenia. Spróbuj ponownie.')}
    return {statusCode:200,headers:{'Content-Type':'application/json','Cache-Control':'no-store'},body:JSON.stringify({ok:true})};
  }catch{console.error('MOJA KOLEJ: mail delivery/network failure');return fail(502,'Nie udało się wysłać zgłoszenia. Spróbuj ponownie.')}
};