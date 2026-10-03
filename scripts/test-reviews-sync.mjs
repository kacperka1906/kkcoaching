import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { build } from 'esbuild';
import { DAY, shouldRefresh, cleanReview, mergeReviews, readReviews, MemoryReviewStore, refreshReviews, createLocalTestProvider } from '../src/lib/reviews/sync.mjs';
import { BlobReviewStore } from '../src/lib/reviews/store.mjs';
import { authorized, isPreview, serializePublic } from '../src/lib/reviews/security.mjs';
const local=JSON.parse(await readFile(new URL('../src/data/reviews/reviews.json',import.meta.url)));
const time=new Date('2026-10-03T12:00:00Z');
const provider=createLocalTestProvider(local);
const run=(store,extra={})=>refreshReviews({store,provider,local,now:()=>time,...extra});
const bundle=await build({entryPoints:['netlify/functions/reviews-preview.mts'],bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent'});
const { createHandler }=await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
const edgeBundle=await build({entryPoints:['netlify/edge-functions/reviews-cache.ts'],bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent'});
const {createEdgeHandler}=await import(`data:text/javascript;base64,${Buffer.from(edgeBundle.outputFiles[0].text).toString('base64')}`);
const context={deploy:{context:'deploy-preview',published:false,id:'test-deploy'}};
const secret='fixture-only-credential-32-characters';
test('freshness uses a timezone-safe inclusive 24h boundary',()=>{
 assert.equal(shouldRefresh(null,time),true);
 assert.equal(shouldRefresh('2026-10-02T12:00:01Z',time),false);
 assert.equal(shouldRefresh('2026-10-02T13:00:00+01:00',time),true);
 assert.equal(shouldRefresh('2026-10-04T12:00:00Z',time),false);
 assert.equal(shouldRefresh('corrupt',time),false);
});
test('deduplication, stable external identity updates, normalized fallback matches',()=>{
 const first={...local[0],externalId:'real-id'};
 const merged=mergeReviews([], [first,first],local);
 assert.equal(merged.reviews.length,1);assert.equal(merged.stats.skipped,1);
 assert.equal(merged.reviews[0].id,local[0].id);
 const repeat=mergeReviews(merged.reviews,[first],local);assert.equal(repeat.stats.skipped,1);
 const changed=mergeReviews(merged.reviews,[{...first,quote:'Changed review text'}]);
 assert.equal(changed.stats.updated,1);assert.equal(changed.reviews[0].externalId,'real-id');
 const whitespace={...local[0],client:local[0].client.toUpperCase(),quote:'  '+local[0].quote.replace(/\s+/g,'   ').toUpperCase()+'  ',avatar:null};
 const noId=mergeReviews([],[local[0],whitespace],local);assert.equal(noId.reviews.length,1);
 const imported=mergeReviews([],[{...whitespace,externalId:'import',date:'2026-09-07'}],local);
 assert.equal(imported.reviews[0].avatar,local[0].avatar);assert.equal(imported.reviews[0].id,local[0].id);
});
test('cache priority, corrupt/empty fallback, manual dedup and WhatsApp gates',()=>{
 const cached={source:'facebook',complete:true,syncedAt:time.toISOString(),reviews:[{...local[0],quote:'Cached original'}]};
 assert.equal(readReviews(cached,local).length,1);assert.equal(readReviews(cached,local)[0].quote,'Cached original');
 for(const bad of [null,{...cached,reviews:[]},{...cached,reviews:[{source:'facebook'}]},{...cached,reviews:[{...local[0],approved:false}]}])assert.equal(readReviews(bad,local).length,5);
 const extra=[{...local[0],source:'manual'},{...local[1],source:'whatsapp',consentConfirmed:false},{...local[2],source:'whatsapp',consentConfirmed:true,approved:false},{...local[3],source:'google',rating:5}];
 assert.equal(readReviews(null,[...local,...extra]).length,5);
 assert.equal(readReviews(null,[...local,{...local[1],id:'consented',source:'whatsapp',quote:'Approved with consent',consentConfirmed:true}]).length,6);
 assert.equal(cleanReview({...local[0],rating:5}).rating,null);
 assert.equal(cleanReview({...local[0],avatar:'https://facebook.com/temp.jpg',reviewUrl:'https://facebook.com/review?access_token=secret'}).avatar,null);
 assert.equal(cleanReview({...local[0],sourceMeta:{access_token:'sensitive'}}).sourceMeta.access_token,undefined);
});
test('success persisted, manual cooldown, daily skip, failure retains last-good without leaking errors',async()=>{
 const store=new MemoryReviewStore();const success=await run(store);assert.equal(success.ok,true);assert.equal(success.stats.total,5);
 const good=await store.getSnapshot('facebook');
 assert.equal((await run(store)).code,'rate_limited');
 assert.equal((await run(store,{mode:'daily'})).code,'fresh');
 const next=new Date(time.getTime()+DAY);
 const failure=await run(store,{now:()=>next,provider:{...provider,fetch:async()=>{throw new Error('token=sensitive-provider-response');}}});
 assert.equal(failure.ok,false);assert.doesNotMatch(JSON.stringify(failure),/sensitive-provider-response/);
 assert.deepEqual(await store.getSnapshot('facebook'),good);
 assert.equal((await run(store,{now:()=>new Date(next.getTime()+60001),mode:'daily'})).code,'fresh');
 assert.equal((await run(store,{now:()=>new Date(next.getTime()+DAY),mode:'daily'})).ok,true);
});
test('partial, empty, invalid and timed-out provider responses never erase good cache',async()=>{
 for(const response of [{complete:false,reviews:local},{complete:true,reviews:[]},{complete:true,reviews:[{source:'facebook'}]},{complete:true,reviews:[{...local[0],source:'google'}]}]){
  const store=new MemoryReviewStore();await run(store);const before=await store.getSnapshot('facebook');
  const result=await run(store,{now:()=>new Date(time.getTime()+DAY),provider:{...provider,fetch:async()=>response}});
  assert.equal(result.ok,false);assert.deepEqual(await store.getSnapshot('facebook'),before);
 }
 const store=new MemoryReviewStore();assert.equal((await run(store,{provider:{...provider,fetch:()=>new Promise(()=>{})},timeoutMs:5})).code,'sync_failed');
 assert.equal(await store.getSnapshot('facebook'),null);
});
test('CAS excludes concurrent refreshes and fences expired lease writers',async()=>{
 const store=new MemoryReviewStore();let release,entered;
 const started=new Promise(resolve=>entered=resolve);
 const pending=run(store,{provider:{...provider,fetch:()=>{entered();return new Promise(resolve=>release=resolve);}}});
 await started;assert.equal((await run(store)).code,'busy');
 const newer=await run(store,{now:()=>new Date(time.getTime()+DAY)});assert.equal(newer.ok,true);
 release({complete:true,reviews:local});assert.equal((await pending).code,'superseded');
 assert.equal((await store.getSnapshot('facebook')).syncedAt,new Date(time.getTime()+DAY).toISOString());
});
test('missing config and storage failure are safe',async()=>{
 const store=new MemoryReviewStore();assert.equal((await run(store,{provider:{...provider,configured:false}})).code,'not_configured');
 assert.equal(await store.getSnapshot('facebook'),null);
 assert.equal((await run({read:async()=>{throw new Error('secret')}})).code,'storage_unavailable');
});
test('Blob adapter uses strongly consistent deploy-store reads and atomic conditional writes',async()=>{
 let options;
 const store=new BlobReviewStore({getWithMetadata:async(key,o)=>{assert.equal(key,'provider-facebook');assert.equal(o.consistency,'strong');return {data:{snapshot:null},etag:'v1'};},setJSON:async(key,data,o)=>{options=o;return {modified:o.onlyIfMatch!=='stale',etag:'v2'};}});
 assert.equal((await store.read('facebook')).etag,'v1');
 assert.equal(await store.compareAndSet('facebook',null,{}),'v2');assert.deepEqual(options,{onlyIfNew:true});
 assert.equal(await store.compareAndSet('facebook','v1',{}),'v2');assert.deepEqual(options,{onlyIfMatch:'v1'});
 assert.equal(await store.compareAndSet('facebook','stale',{}),null);
});
test('auth, production guard, endpoint failures, and safe status',async()=>{
 const request=(token=secret,body={source:'facebook',mode:'manual'},origin='https://preview.example')=>new Request('https://preview.example/.netlify/functions/reviews-preview',{method:'POST',headers:{Authorization:`Bearer ${token}`,Origin:origin},body:JSON.stringify(body)});
 assert.equal(await authorized(request(),undefined),false);assert.equal(await authorized(request(),secret),true);
 assert.equal(await authorized(request('wrong'),secret),false);assert.equal(isPreview({deploy:{...context.deploy,published:true}}),false);
 const handler=createHandler({secret:()=>secret,openStore:()=>new MemoryReviewStore()});
 assert.equal((await handler(request(),{deploy:{...context.deploy,context:'production'}})).status,404);
 assert.equal((await handler(request('wrong'),context)).status,401);
 assert.equal((await handler(request(secret,{},'https://evil.example'),context)).status,403);
 assert.equal((await handler(request(secret,{}),context)).status,400);
 const disabled=await handler(request(),context);assert.equal(disabled.status,503);assert.equal((await disabled.json()).code,'not_configured');
 const status=await (await handler(new Request('https://preview.example/.netlify/functions/reviews-preview'),context)).json();
 assert.equal(status.providers[0].connected,false);assert.equal(status.providers[1].status,'disabled');assert.equal(status.providers[2].status,'disabled');
 assert.doesNotMatch(JSON.stringify(status),new RegExp(secret));
 assert.doesNotMatch(serializePublic([{quote:'</script><script>alert(1)</script>'}]),/<|>/);
});
test('built preview SEO, local fallback, and no server credentials/SDK in public bundles',async()=>{
 const admin=await readFile('dist/reviews-admin-preview/index.html','utf8');
 assert.match(admin,/name="robots" content="noindex, nofollow"/);
 assert.doesNotMatch(await readFile('dist/sitemap-0.xml','utf8'),/reviews-(admin|widget)-preview/);
 for(const route of ['dist/index.html','dist/pl/index.html']){
  const html=await readFile(route,'utf8');assert.equal((html.match(/data-review-card(?:\s|>)/g)||[]).length,5);
  assert.match(html,/<script type="application\/json" data-review-cache>\[\]<\/script>/);
  assert.doesNotMatch(html,/href="[^"]*reviews-admin-preview|FACEBOOK_PAGE_ACCESS_TOKEN|REVIEWS_REFRESH_SECRET|AggregateRating/);
 }
 for(const name of await readdir('dist/_astro'))if(name.endsWith('.js')){
  const text=await readFile(`dist/_astro/${name}`,'utf8');assert.doesNotMatch(text,/FACEBOOK_PAGE_ACCESS_TOKEN|REVIEWS_REFRESH_SECRET|graph\.facebook\.com|@netlify\/blobs/);
 }
});
test('edge middleware isolates production, rejects test snapshots, injects safe cached data and falls back',async()=>{
 const html=await readFile('dist/index.html','utf8');
 const ctx={...context,next:async()=>new Response(html,{headers:{'content-type':'text/html'}})};
 let snapshot=null,reads=0;
 const handler=createEdgeHandler({openStore:()=>({getSnapshot:async()=>{reads++;return snapshot;}})});
 const request=new Request('https://preview.example/');
 assert.equal(await (await handler(request,ctx)).text(),html);
 snapshot={source:'facebook',complete:true,syncedAt:time.toISOString(),origin:'local-test',reviews:local};
 assert.equal(await (await handler(request,ctx)).text(),html);
 snapshot={...snapshot,origin:'official-api',reviews:[{...local[0],quote:'</script> Literal review text'}]};
 const injected=await handler(request,ctx),body=await injected.text();
 assert.equal(injected.headers.get('cache-control'),'private, no-store');
 assert.match(body,/\\u003c\/script\\u003e Literal review text/);
 assert.equal(body.replace(/(<script type="application\/json" data-review-cache>).*?(<\/script>)/s,'$1[]$2'),html);
 const before=reads,production={...ctx,deploy:{...context.deploy,context:'production',published:true}};
 assert.equal(await (await handler(request,production)).text(),html);assert.equal(reads,before);
 assert.equal((await handler(new Request('https://preview.example/reviews-admin-preview/'),production)).status,404);
 const broken=createEdgeHandler({openStore:()=>{throw new Error('private error');}});
 assert.equal(await (await broken(request,ctx)).text(),html);
});
