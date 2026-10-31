// Read-only check invoked by the scheduled GitHub workflow.
// Compare actual production static manifest with active London dates;
// never request a build early or log secrets.
import fs from 'node:fs';
import {activeOfferIds,londonDateKey} from '../src/lib/promotions.mjs';
const offers=JSON.parse(fs.readFileSync(new URL('../src/data/promotions.json',import.meta.url),'utf8')).offers;
const today=londonDateKey(new Date());
const supported=['2026-11-01','2026-12-01'];
const out=process.env.GITHUB_OUTPUT;
function emit(flag,reason){
  console.log('Promotion refresh: '+reason);
  if(out) fs.appendFileSync(out,'needs_refresh='+String(flag)+'\n');
}
if(!supported.includes(today)){emit(false,'No scheduled date boundary');process.exit(0)}
const expected=activeOfferIds(offers,new Date());
let published;
try{
  const res=await fetch('https://kkcoaching.fit/promotion-state.json',{
    headers:{'Cache-Control':'no-cache'},signal:AbortSignal.timeout(12000)});
  if(!res.ok)throw new Error('Manifest HTTP '+res.status);
  published=await res.json();
}catch(e){throw Error('Unable to verify production manifest: '+String(e.message).slice(0,120))}
if(!published||published.version!==1||!Array.isArray(published.activeOfferIds))throw Error('Invalid production manifest');
const current=published.activeOfferIds.slice().sort();
const differs=JSON.stringify(current)!==JSON.stringify(expected);
const markerFile=new URL('../.github/promotion-build-trigger.txt',import.meta.url);
const last=fs.existsSync(markerFile)?fs.readFileSync(markerFile,'utf8').trim():'';
const lastMs=Date.parse(last);
const now=Date.now();
if(differs && lastMs && now-lastMs<25*60*1000){
  emit(false,'Production is stale but a refresh was requested recently');
}else emit(differs,differs?'Production state differs from Europe/London expected offers':'Production manifest is current');
