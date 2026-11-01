// November 2026 live audit. READ-ONLY: no forms, GSC requests, payments or deploy hooks.
// Uses GitHub Actions as a network vantage point to inspect actual Netlify HTML.
import assert from 'node:assert/strict';
import { setTimeout as sleep } from 'node:timers/promises';

const site='https://kkcoaching.fit';
const checkedAt=new Date().toISOString();
const entries=[
  {path:'/',lang:'en',kind:'home'},
  {path:'/pl/',lang:'pl',kind:'home'},
  {path:'/services/',lang:'en',kind:'services'},
  {path:'/pl/services/',lang:'pl',kind:'services'},
  {path:'/personal-training-cwmbran/',lang:'en',kind:'pt'},
  {path:'/pl/personal-training-cwmbran/',lang:'pl',kind:'pt'},
  {path:'/hybrid-coaching/',lang:'en',kind:'hybrid'},
  {path:'/pl/hybrid-coaching/',lang:'pl',kind:'hybrid'},
  {path:'/online-coaching/',lang:'en',kind:'online'},
  {path:'/pl/online-coaching/',lang:'pl',kind:'online'},
  {path:'/training-plan/',lang:'en',kind:'plan'},
  {path:'/pl/training-plan/',lang:'pl',kind:'plan'}
];
const legacy=[
  ['October 20%-off promotion id',/data-promotion-id=["']october-2026-20-off-everything/i],
  ['October discount HTML',/data-october-only/i],
  ['Old October sales headline',/20%\s*OFF\s*EVERYTHING|20%\s*TANIEJ\s*NA\s*WSZYSTKO|October Offer|Oferta październikowa/i],
  ['Old October prices copy',/See all October prices|Zobacz wszystkie ceny październikowe|October prices|Ceny październikowe/i],
  ['Old September promo copy',/September (?:Offer|Special|Discount|Promotion)|Wrześniowa oferta|Oferta wrześniowa|Promocja wrześniowa|September 2026.{0,60}%/i]
];
const issues=[];
const reports=[];
const errors=(msg)=>{issues.push(msg);console.log('FAIL '+msg)};
const expect=(condition,message)=>{if(!condition)errors(message)};
async function read(path, cacheBust=false) {
  const u=new URL(site+path);
  if(cacheBust)u.searchParams.set('_seo_audit','20261101_'+Date.now());
  const res=await fetch(u,{headers:{'Cache-Control':'no-cache','Pragma':'no-cache','User-Agent':'KK-Coaching-Independent-SEO-Verification/1.0'},signal:AbortSignal.timeout(18000)});
  const body=await res.text();
  return {status:res.status,url:u.toString(),body,age:res.headers.get('age'),cache:res.headers.get('cache-control'),lastModified:res.headers.get('last-modified'),etag:res.headers.get('etag'),xrobots:res.headers.get('x-robots-tag')};
}
function metadata(html){
  const head=html.split('</head>')[0];
  const title=(head.match(/<title[^>]*>([\s\S]*?)<\/title>/i)||[])[1]||'';
  const description=(head.match(/<meta\s+name="description"\s+content="([^"]+)"/i)||[])[1]||'';
  return {head,title,description};
}
function ldJson(html,path){
  const scripts=[...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  let values=[];
  for(const [,content] of scripts){try{values.push(JSON.parse(content))}catch(e){errors(path+': invalid JSON-LD: '+e.message)}}
  return values;
}
function offers(node,out=[]){
  if(!node || typeof node!=='object')return out;
  if(Array.isArray(node)){for(const c of node)offers(c,out);return out}
  if(node['@type']==='Offer'||(Array.isArray(node['@type'])&&node['@type'].includes('Offer')))out.push({price:node.price,priceCurrency:node.priceCurrency,id:node['@id']||null,validThrough:node.priceValidUntil||null});
  for(const [key,value] of Object.entries(node))if(key!=='@context')offers(value,out);
  return out;
}
const manifest=await read('/promotion-state.json');
let state={};
try{state=JSON.parse(manifest.body)}catch(e){errors('Manifest is not valid JSON: '+e.message)}
console.log('LIVE_MANIFEST '+JSON.stringify({status:manifest.status,age:manifest.age,cache:manifest.cache,xrobots:manifest.xrobots,...state}));
expect(manifest.status===200,'Manifest does not return 200');
const requiredIds=['free-7-day-kk-coaching-trial','october-2026-free-pt-taster','winter-kickstart-2026-pt','winter-kickstart-2026-hybrid'];
const liveIds=(state.activeOfferIds||[]).slice().sort();
expect(JSON.stringify(liveIds)===JSON.stringify(requiredIds.sort()),'Active offer ids differ from two permanent free offers + two November Winter offers: '+JSON.stringify(liveIds));
expect(!liveIds.includes('october-2026-20-off-everything'),'October discount still active in manifest');
expect(manifest.cache?.includes('no-store'),'Manifest missing no-store header');
expect(manifest.xrobots?.includes('noindex'),'Manifest missing X-Robots-Tag noindex');
for(const entry of entries){
  let current;
  try{current=await read(entry.path)}catch(e){errors(entry.path+' fetch failed: '+e.message);continue;}
  if(current.status!==200){errors(entry.path+' HTTP '+current.status);continue}
  const {head,title,description}=metadata(current.body);
  const ld=ldJson(current.body,entry.path);
  const offerPrices=offers(ld);
  const ids=[...current.body.matchAll(/data-promotion-id="([^"]+)"/g)].map(m=>m[1]);
  const hits=legacy.filter(([name,re])=>re.test(current.body)).map(([name])=>name);
  for(const hit of hits)errors(entry.path+' contains expired promotion text: '+hit);
  const schemaLegacy=ld.filter(v=>/20%\s*OFF\s*EVERYTHING|20%\s*TANIEJ\s*NA\s*WSZYSTKO|September Offer|Oferta październikowa/i.test(JSON.stringify(v))).length;
  expect(schemaLegacy===0,entry.path+' contains old promo offer description in JSON-LD');
  expect(!/20%\s*OFF\s*EVERYTHING|20%\s*TANIEJ\s*NA\s*WSZYSTKO|October Offer|September Offer/i.test(head),entry.path+' contains old offer in page HEAD');
  expect(!ids.includes('october-2026-20-off-everything'),entry.path+' contains October 20% card');
  if(entry.kind==='home'){
    for(const id of requiredIds)expect(ids.includes(id),entry.path+' missing live homepage card '+id+'; found '+JSON.stringify(ids));
    expect(current.body.includes('£159'),entry.path+' homepage lacks Winter PT £159');
    expect(current.body.includes('£219'),entry.path+' homepage lacks Winter Hybrid £219');
  }
  if(entry.kind==='pt'){
    expect(ids.includes('winter-kickstart-2026-pt'),entry.path+' PT page lacks Winter PT promo');
    expect(current.body.includes('£159'),entry.path+' lacks PT £159');
  }
  if(entry.kind==='hybrid'){
    expect(ids.includes('winter-kickstart-2026-hybrid'),entry.path+' Hybrid page lacks November promo');
    expect(current.body.includes('£219'),entry.path+' lacks Hybrid £219');
  }
  if(entry.kind==='plan'){
    const all=offerPrices.filter(x=>x.price!==undefined).map(x=>Number(x.price));
    expect(!all.includes(24),entry.path+' JSON-LD has October £24 discounted training plan');
  }
  if(entry.kind==='online'){
    const all=offerPrices.filter(x=>x.price!==undefined).map(x=>Number(x.price));
    expect(!all.includes(64),entry.path+' JSON-LD has October £64 online price');
  }
  const report={path:entry.path,status:current.status,age:current.age,cache:current.cache,title,description,ids,legacyHits:hits,jsonLdOffers:offerPrices,hasWinterText:current.body.includes('WINTER KICKSTART')};
  reports.push(report);
  console.log('LIVE_PAGE '+JSON.stringify(report));
}
// Cache-bust representative home pages: old CDNs may serve stale versions.
for(const p of ['/','/pl/','/personal-training-cwmbran/','/pl/hybrid-coaching/']){
  const b=await read(p,true);
  const hits=legacy.filter(([,re])=>re.test(b.body)).map(x=>x[0]);
  console.log('CACHE_BUST '+JSON.stringify({path:p,status:b.status,age:b.age,expiredOfferHits:hits,winter:b.body.includes('WINTER KICKSTART')}));
  expect(b.status===200,p+' cache-busted check not HTTP 200');
  expect(hits.length===0,p+' stale offer persists after bypassing cache');
}
const xml=await read('/sitemap-index.xml');
expect(xml.status===200,'Sitemap index not 200');
let links=[...xml.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map(x=>new URL(x[1]).pathname);
console.log('SITEMAP_INDEX '+JSON.stringify({status:xml.status,links}));
for(const link of links){
  const response=await read(link);
  expect(response.status===200,'Sitemap '+link+' not 200');
  const expired=[...response.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map(x=>x[1]).filter(x=>/(september|october|wrzes|pazdzier|pa%C5%BAdzier)/i.test(x));
  console.log('SITEMAP_EXPIRED_PATHS '+JSON.stringify({path:link,paths:expired}));
  expect(expired.length===0,'Sitemap includes old seasonal promo routes '+JSON.stringify(expired));
}
console.log('RESULT '+JSON.stringify({checkedAt,checked:reports.length,errors:issues.length,issues}));
if(issues.length)process.exitCode=1; else console.log('PASS: All live 2026-11-01 promotions and 12 URL HTML pages free of old September/October promotion text; November offers and structured data verified.');
