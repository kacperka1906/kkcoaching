import { sortReviews } from './review-utils';
import type { ReviewItem } from './review-types';
import { applyCachedReviews } from './review-cache';
export function initializeReviews(root: HTMLElement) {
  if (root.dataset.initialized) return;
  applyCachedReviews(root);
  root.dataset.initialized = 'true';
  const track = root.querySelector<HTMLElement>('[data-track]')!;
  const cards = [...track.querySelectorAll<HTMLElement>('[data-review-card]')];
  const prev = root.querySelector<HTMLButtonElement>('[data-prev]');
  const next = root.querySelector<HTMLButtonElement>('[data-next]');
  const counter = root.querySelector<HTMLElement>('[data-counter]');
  const progress = root.querySelector<HTMLElement>('[data-progress]');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let pending = 0;
  const visible = () => [...track.querySelectorAll<HTMLElement>('[data-review-card]')].filter(card => !card.hidden);
  const offset = (card: HTMLElement) => card.getBoundingClientRect().left - track.getBoundingClientRect().left + track.scrollLeft;
  function position() {
    const list = visible();
    const maximum = Math.max(0, track.scrollWidth - track.clientWidth);
    const atEnd = track.scrollLeft >= maximum - 2;
    let index = list.length ? list.reduce((closest, card, i) => Math.abs(offset(card) - track.scrollLeft) < Math.abs(offset(list[closest]) - track.scrollLeft) ? i : closest, 0) : -1;
    // At the end, report the final card even when several cards share the viewport.
    if (list.length && atEnd && maximum > 2) index = list.length - 1;
    if (prev) prev.disabled = track.scrollLeft <= 2 || maximum <= 2;
    if (next) next.disabled = atEnd || !list.length;
    if (counter) counter.textContent = `${index + 1} / ${list.length}`;
    if (progress) {
      progress.style.width = `${list.length ? maximum <= 2 ? 100 : (index + 1) / list.length * 100 : 0}%`;
      progress.parentElement!.setAttribute('aria-valuemax', String(list.length));
      progress.parentElement!.setAttribute('aria-valuenow', String(index + 1));
    }
  }
  function clamps() {
    cards.forEach(card => {
      if (card.hidden) return;
      const quote = card.querySelector<HTMLElement>('[data-quote]')!;
      const button = card.querySelector<HTMLButtonElement>('[data-expand]');
      if (!button) return;
      const expanded = button.getAttribute('aria-expanded') === 'true';
      button.hidden = !expanded && quote.scrollHeight <= quote.clientHeight + 1;
    });
  }
  function refresh() { cancelAnimationFrame(pending); pending = requestAnimationFrame(() => { position(); clamps(); }); }
  function navigate(direction: number) {
    const list = visible();
    const targets = list.map(offset);
    const current = track.scrollLeft;
    const target = direction > 0 ? targets.find(value => value > current + 3) ?? track.scrollWidth : [...targets].reverse().find(value => value < current - 3) ?? 0;
    track.scrollTo({ left: target, behavior: reduced.matches ? 'instant' : 'smooth' });
  }
  prev?.addEventListener('click', () => navigate(-1));
  next?.addEventListener('click', () => navigate(1));
  track.addEventListener('keydown', event => {
    if (event.target !== track || root.dataset.layout !== 'carousel') return;
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); navigate(event.key === 'ArrowRight' ? 1 : -1); }
    if (event.key === 'Home' || event.key === 'End') { event.preventDefault(); track.scrollTo({ left: event.key === 'Home' ? 0 : track.scrollWidth, behavior: reduced.matches ? 'instant' : 'smooth' }); }
  });
  root.querySelectorAll<HTMLButtonElement>('[data-filter]').forEach(button => button.addEventListener('click', () => {
    root.querySelectorAll('[data-filter]').forEach(tab => tab.setAttribute('aria-pressed', String(tab === button)));
    cards.forEach(card => { card.hidden = button.dataset.filter !== 'all' && card.dataset.source !== button.dataset.filter; });
    root.querySelector<HTMLElement>('[data-empty]')!.hidden = visible().length > 0;
    track.scrollTo({ left: 0, behavior: 'instant' }); refresh();
  }));
  cards.forEach(card => {
    const button = card.querySelector<HTMLButtonElement>('[data-expand]');
    button?.addEventListener('click', () => {
      const expanded = button.getAttribute('aria-expanded') !== 'true';
      button.setAttribute('aria-expanded', String(expanded));
      card.toggleAttribute('data-expanded', expanded);
      button.firstChild!.textContent = expanded ? root.dataset.less! : root.dataset.more!;
      refresh();
    });
    const img = card.querySelector<HTMLImageElement>('.rw-avatar img');
    const fallback = () => { if (!img) return; if (img.dataset.fallback) { img.src = img.dataset.fallback; delete img.dataset.fallback; } else img.hidden = true; };
    img?.addEventListener('error', fallback);
    if (img?.complete && !img.naturalWidth) fallback();
  });
  if (root.dataset.sort === 'random') {
    let seed = String(Math.random());
    try { seed = sessionStorage.getItem('kk-review-seed') || seed; sessionStorage.setItem('kk-review-seed', seed); } catch {}
    const ordered = sortReviews(cards.map(card => ({ id: card.dataset.reviewId! }) as ReviewItem), 'random', seed);
    ordered.forEach(item => track.append(cards.find(card => card.dataset.reviewId === item.id)!));
  }
  track.addEventListener('scroll', refresh, { passive: true });
  new ResizeObserver(refresh).observe(track);
  new MutationObserver(() => { track.scrollTo({ left: 0, behavior: 'instant' }); refresh(); }).observe(root, { attributes: true, attributeFilter: ['data-layout'] });
  refresh();
}
