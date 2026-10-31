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
  assert.match(html,/Zapisy jeszcze nie ruszyły/,'No signup banner');
  assert.match(html,/<fieldset disabled/,'Form must be disabled');
  assert.match(html,/<button[^>]+disabled/,'Submit button must be disabled');
  assert.doesNotMatch(html,/<form\b/i,'No live enrolment form');
  assert.doesNotMatch(html,/checkout\.stripe\.com/i,'No checkout');
  assert.match(html,/16 niedzielnych spotkań na żywo/i,'Sunday live session headline');
  const config=JSON.parse(await get('/admin/config.yml'));
  assert.equal(config.backend.branch,'main','Production admin writes to main');
  assert.equal(config.collections.filter(c=>c.name==='moja_kolej_2027').length,1,'Dedicated editor is registered once');
  assert.ok(config.collections.length>=11,'All original admin collections preserved');
  const index=await get('/sitemap-index.xml');
  const paths=[...index.matchAll(/<loc>([^<]+)<\/loc>/g)].map(x=>new URL(x[1]).pathname);
  assert.ok(paths.length>0,'Sitemap index nonempty');
  for (const sitemap of paths) assert.ok(!(await get(sitemap)).includes('/pl/moja-kolej-2027'),'No hidden campaign in '+sitemap);
  for (const p of ['/','/pl/','/services/','/pl/services/']) {
    const data=await get(p);
    assert.ok(!data.includes('/moja-kolej-2027'),p+' must not link the test page');
    assert.doesNotMatch(data,/<meta name="robots" content="noindex/,p+' must stay indexable');
  }
}
const max=16;
for(let i=0;i<max;i++){
  try{await check();console.log('PASS: live hidden MOJA KOLEJ is HTTP 200, noindex, excluded from sitemap, unlinked, Polish-only, with inactive signup and safe CMS.');process.exit(0);}
  catch(e){console.error('Production check '+(i+1)+'/'+max+': '+e.message);if(i===max-1)process.exit(1);await new Promise(done=>setTimeout(done,15_000));}
}
