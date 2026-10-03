import { filterReviews, sortReviews, initials, safeUrl } from './review-utils';
import { reviewCopy } from './review-copy';
import type { ReviewItem } from './review-types';

// Consumes only an inert server-injected snapshot. No fetch, polling or provider SDK.
export function applyCachedReviews(root: HTMLElement) {
  const slot=root.querySelector('[data-review-cache]');
  if(!slot?.textContent||slot.textContent==='[]')return;
  try {
    const items=JSON.parse(slot.textContent) as ReviewItem[];
    if(!Array.isArray(items)||!items.length||items.length>1000)return;
    const options=JSON.parse(root.dataset.cacheOptions||'{}');
    const list=sortReviews(filterReviews(items,options.filters),options.sort==='random'?'manual':options.sort);
    if(!list.length)return;
    const track=root.querySelector<HTMLElement>('[data-track]')!;
    const templates=[...track.querySelectorAll<HTMLElement>('[data-review-card]')];
    // This phase only imports Facebook. Non-Facebook manual cards remain locally authored.
    if(list.some(item=>!templates.some(card=>card.dataset.source===item.source)))return;
    const lang=document.documentElement.lang==='pl'?'pl':'en',copy=reviewCopy[lang];
    const fragment=document.createDocumentFragment();
    list.forEach((item,index)=>{
      if(typeof item.quote!=='string'||typeof item.client!=='string')throw new Error();
      const existing=templates.find(card=>card.dataset.reviewId===item.id&&card.dataset.source===item.source);
      const card=(existing||templates.find(card=>card.dataset.source===item.source)!).cloneNode(true) as HTMLElement;
      if(item.source!=='facebook'){fragment.append(card);return;}
      card.dataset.reviewId=item.id;card.setAttribute('aria-label',item.client);card.removeAttribute('data-expanded');
      const name=card.querySelector('.rw-author strong');if(name)name.textContent=item.client;
      const avatar=card.querySelector<HTMLImageElement>('.rw-avatar img');
      const initialsNode=card.querySelector('.rw-avatar span');if(initialsNode)initialsNode.textContent=initials(item.client);
      if(avatar){const path=safeUrl(item.avatar);avatar.removeAttribute('data-fallback');if(path?.startsWith('/images/reviews/')){avatar.src=path;avatar.hidden=false;}else avatar.remove();}
      const quote=card.querySelector<HTMLElement>('[data-quote]')!;quote.textContent=item.quote;quote.id=`${track.id}-cached-${index}`;quote.lang=item.sourceMeta?.language==='pl'?'pl':'en';
      const recommendation=card.querySelector('.rw-recommendation');
      if(recommendation){const icon=document.createElement('span');icon.setAttribute('aria-hidden','true');icon.textContent=item.recommendation?'✓':'−';recommendation.replaceChildren();if(item.recommendation!=null)recommendation.append(icon,` ${item.recommendation?copy.recommends:copy.notRecommends}`);}
      card.querySelector('.rw-rating')?.remove();
      const expand=card.querySelector<HTMLButtonElement>('[data-expand]');
      if(expand){expand.setAttribute('aria-controls',quote.id);expand.setAttribute('aria-expanded','false');expand.firstChild!.textContent=copy.more;expand.querySelector('.rw-sr-only')!.textContent=` — ${item.client}`;}
      const footer=card.querySelector<HTMLElement>('.rw-card-foot')!;footer.querySelectorAll('time,a').forEach(node=>node.remove());
      if(options.showDate&&item.date&&Number.isFinite(Date.parse(item.date))){const time=document.createElement('time');time.dateTime=item.date;time.textContent=new Intl.DateTimeFormat(lang==='pl'?'pl-PL':'en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(item.date));footer.append(time);}
      const url=safeUrl(item.reviewUrl);if(url){const link=document.createElement('a');link.href=url;link.target='_blank';link.rel='noopener noreferrer';link.textContent=`${copy.view} — ${item.client} ↗`;footer.append(link);}
      fragment.append(card);
    });
    track.replaceChildren(fragment);
    root.querySelectorAll<HTMLElement>('[data-filter]').forEach(tab=>{const source=tab.dataset.filter;const count=source==='all'?list.length:list.filter(item=>item.source===source).length;tab.hidden=!count;tab.querySelector('span:last-child')!.textContent=String(count);});
    root.querySelectorAll<HTMLElement>('[data-summary-source]').forEach(summary=>{const source=summary.dataset.summarySource;const rows=list.filter(item=>item.source===source);summary.hidden=!rows.length;const count=summary.querySelector('[data-summary-count]');if(count&&source==='facebook')count.textContent=copy.recommendationCount(rows.filter(item=>item.recommendation===true).length);});
  }catch{ /* Invalid snapshot leaves the server-rendered local fallback intact. */ }
}
