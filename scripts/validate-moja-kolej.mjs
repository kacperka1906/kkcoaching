import assert from 'node:assert/strict';
import fs from 'node:fs';

const file = new URL('../src/data/moja-kolej-2027.json', import.meta.url);
const data = JSON.parse(fs.readFileSync(file, 'utf8'));
const string = (value, context) => {
  assert.equal(typeof value, 'string', context + ' must be text');
  assert.ok(value.trim().length > 0, context + ' cannot be empty');
  assert.ok(value.length <= 4000, context + ' is unexpectedly long');
};
const array = (value, min, max, context) => {
  assert.ok(Array.isArray(value), context + ' must be a list');
  assert.ok(value.length >= min && value.length <= max, context + ' has wrong number of items');
};
for (const [k,v] of Object.entries(data.seo)) string(v, 'SEO '+k);
assert.ok(data.seo.title.length <= 70, 'Keep programme SEO title concise');
assert.ok(data.seo.description.length <= 200, 'Keep programme meta description concise');
for (const [k,v] of Object.entries(data.media)) string(v, 'Media '+k);
for (const k of ['year','startShort','startFull','endFull']) string(data.facts[k], 'Programme fact '+k);
assert.ok(Number.isSafeInteger(data.facts.durationWeeks) && data.facts.durationWeeks >= 1, 'Duration must be a positive number of weeks');
assert.ok(Number.isSafeInteger(data.facts.maxPlaces) && data.facts.maxPlaces >= 1 && data.facts.maxPlaces <= 200, 'Group capacity must be between 1 and 200');
for (const key of ['socialImage', 'heroImage', 'coachImage']) {
  const value = key === 'socialImage' ? data.seo.socialImage : data.media[key];
  assert.match(value, /^\/images\/[a-zA-Z0-9._/-]+\.(webp|png|jpg|jpeg|avif)$/i, key+' must be uploaded to the site media folder');
  assert.ok(!value.includes('..'), key+' cannot use parent paths');
}
for (const key of ['total','reservation','firstBlock','secondBlock']) {
  assert.ok(Number.isSafeInteger(data.pricing[key]) && data.pricing[key] >= 0, 'GBP price '+key+' must be a whole number');
}
assert.ok(data.pricing.total > 0, 'Positive total price required');
assert.equal(data.pricing.reservation + data.pricing.firstBlock + data.pricing.secondBlock, data.pricing.total, 'GBP instalments must sum to the total');
const expectedSections = ['hero','intro','community','coaching','roadmap','rhythm','fit','coach','price','application','faq','final'];
assert.deepEqual(Object.keys(data.copy.sections), expectedSections, 'All campaign sections must remain editable');
for (const [section, entries] of Object.entries(data.copy.sections)) {
  assert.ok(Object.keys(entries).length, section+' must contain copy');
  for (const [key,value] of Object.entries(entries)) string(value, section+'.'+key);
}
for (const [key,value] of Object.entries(data.copy.attributes)) string(value, 'Accessibility '+key);
array(data.features,6,6,'Core programme modules');
assert.deepEqual([...data.features.map(f=>f.id)].sort(),['grupa','podsumowania','spotkania','warsztaty','wyroznienia','zadania'].sort(),'Six distinct modules and identifiers required');
for (const feature of data.features) {
  assert.ok(['whatsapp','video','check','book','chart','star'].includes(feature.icon),'Only existing icons are supported');
  for (const field of ['eyebrow','title','detail']) string(feature[field],feature.id+'.'+field);
  array(feature.items,1,12,'Feature bullets');
  feature.items.forEach((v,i)=>string(v,feature.id+'.item '+i));
}
for(const key of ['coaching','people']){
  array(data[key],1,25,key);
  data[key].forEach((v,i)=>string(v,key+'.'+i));
}
array(data.phases,4,4,'Programme stages');
assert.equal(data.phases.reduce((n,stage)=>n+stage.weeks.length,0), data.facts.durationWeeks, 'Displayed duration must equal the timeline week count');
data.phases.forEach((stage,i)=>{
  assert.equal(stage.number,String(i+1).padStart(2,'0'),'Fixed phase numbering for visuals');
  for (const key of ['title','range']) string(stage[key], 'Phase '+i+'.'+key);
  array(stage.weeks,4,4,'Stage '+i+' must have four weeks');
  stage.weeks.forEach((v,n)=>string(v,'Week topic '+i+'.'+n));
});
array(data.week,7,7,'Weekly schedule');
assert.deepEqual(data.week.map(v=>v.day),['Pon.','Wt.','Śr.','Czw.','Pt.','Sob.','Niedz.'],'Keep Sunday in its fixed slot');
assert.match(data.week[6].title, /spotkani/i,'Sunday live meeting cannot silently disappear');
data.week.forEach((d,i)=>{ string(d.title,'Day '+i+' title'); string(d.body,'Day '+i+' body'); });
array(data.faqs,15,40,'Frequently asked questions');
data.faqs.forEach((entry,i)=>{string(entry.question,'FAQ question '+i);string(entry.answer,'FAQ answer '+i);});
const known = /^(total|reservation|firstBlock|secondBlock)$/;
for(const faq of data.faqs) {
  for (const [,token] of faq.answer.matchAll(/\{\{([^}]+)\}\}/g)) assert.match(token,known,'Unknown FAQ pricing token');
}
assert.ok(data.copy.sections.hero.text005.includes('{{weeks}}') && data.copy.sections.hero.text005.includes('{{places}}'), 'Hero numbers must use synchronised tokens');
assert.ok(data.copy.sections.hero.text002.includes('PODGLĄD'),'Preview banner must stay unmistakable');
assert.match(data.copy.sections.hero.text011,/Zapisy jeszcze nie ruszyły/i,'No enrolment before programme launch');
assert.match(data.copy.sections.application.text001,/PIERWSZA EDYCJA/i,'Application is explicitly the first edition');
assert.ok(JSON.stringify(data).includes('Nie przyjmujemy wpłat'),'No payment notice is required');
console.log('MOJA KOLEJ CMS data valid: SEO, uploads, 12 copy sections, 6 modules, 16 weeks, Sunday live, FAQ, GBP instalments and disabled-preview wording.');
