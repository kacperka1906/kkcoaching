// Read-only post-release test for the hidden Polish MOJA KOLEJ 2027 page.
// Never submits forms, analytics events, payments or website changes.
import assert from 'node:assert/strict';

const origin = 'https://kkcoaching.fit';
async function get(path) {
  const result=await fetch(origin + path,{
    headers:{'Cache-Control':'no-cache','User-Agent':'KK-Coaching-Moja-Kolej-ReadOnly-QA/1.0'},
    signal:AbortSignal.timeout(15_000)
  });
  assert.equal(result.status,200, path+' must return HTTP 200; got '+result.status);
  return result.text();
}
async function check() {
  const html=await get('/pl/moja-kolej-2027/');
  const head=html.split('</head>')[0];
  assert.match(html,/<html lang="pl">/,'Must be Polish');
  assert.match(head,/<meta name="robots" content="noindex, follow"/,'Noindex and follow');
  assert.match(head,/<link rel="canonical" href="https:\/\/kkcoaching\.fit\/pl\/moja-kolej-2027\/"/,'Correct self canonical');
  assert.doesNotMatch(head,/hreflang=/i,'No fictional English equivalent');
  assert.match(html,/Zapisy już ruszyły/,'Live recruitment banner');
  assert.match(html,/<form\b[^>]*id="moja-kolej-form"/,'Dedicated application form exists');
  assert.match(html,/name="campaign" value="moja-kolej-2027"/,'Campaign identity present');
  assert.doesNotMatch(html,/checkout\.stripe\.com/i,'No checkout');
  assert.match(html,/Spotkania na żywo/i,'Group meetings headline');
  const config=JSON.parse(await get('/admin/config.yml'));
  assert.equal(config.backend.branch,'main','Production admin writes to main');
  assert.equal(config.collections.filter(c=>c.name==='moja_kolej_2027').length,1,'Dedicated editor is registered once');
  assert.ok(config.collections.length>=11,'All original admin collections preserved');
  const photo = await fetch(origin + '/images/moja-kolej-hero.webp', {signal: AbortSignal.timeout(15000)});
  assert.equal(photo.status,200,'Live mirror artwork must be HTTP 200');
  assert.match(photo.headers.get('content-type')||'',/image\/webp/i,'Live artwork must return image/webp');
  assert.ok((await photo.arrayBuffer()).byteLength>10000,'Live mirror artwork must be a valid nonempty image');
  const index=await get('/sitemap-index.xml');
  const paths=[...index.matchAll(/<loc>([^<]+)<\/loc>/g)].map(x=>new URL(x[1]).pathname);
  assert.ok(paths.length>0,'Sitemap index nonempty');
  for (const sitemap of paths) assert.ok(!(await get(sitemap)).includes('/pl/moja-kolej-2027'),'No hidden campaign in '+sitemap);
  for (const p of ['/','/pl/','/services/','/pl/services/']) {
    const data=await get(p);
    if(p.startsWith('/pl/')) assert.ok(data.includes('/pl/moja-kolej-2027/'),p+' should promote campaign in PL navigation');
    else assert.ok(!data.includes('/moja-kolej-2027'),p+' must not promote campaign in EN navigation');
    if(p==='/pl/') assert.ok(data.includes('campaign-spotlight'),'Polish homepage spotlight missing');
    if(p==='/') assert.ok(!data.includes('campaign-spotlight'),'English homepage must stay unchanged');
    assert.doesNotMatch(data,/<meta name="robots" content="noindex/,p+' must stay indexable');
  }
}
const max=16;
for(let i=0;i<max;i++){
  try{await check();console.log('PASS: live MOJA KOLEJ is HTTP 200, noindex, excluded from sitemap, unlinked, Polish-only, with active application form and isolated CMS.');process.exit(0);}
  catch(e){console.error('Production check '+(i+1)+'/'+max+': '+e.message);if(i===max-1)process.exit(1);await new Promise(done=>setTimeout(done,15_000));}
}
