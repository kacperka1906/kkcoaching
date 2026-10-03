import type { ReviewItem, ReviewFilters, ReviewsWidgetConfig } from './review-types';
export const sourceNames = { facebook: 'Facebook', google: 'Google', whatsapp: 'WhatsApp', manual: 'KK Coaching' };
export const safeUrl = (url?: unknown): string | undefined => {
  if (typeof url !== 'string') return;
  if (/^\/(?!\/)/.test(url)) return url;
  try { const parsed = new URL(url); if (parsed.protocol === 'https:') return parsed.href; } catch {}
};
export const legitimateRating = (item: ReviewItem): number | null =>
  item.source === 'google' && typeof item.rating === 'number' && Number.isFinite(item.rating) && item.rating >= 1 && item.rating <= 5 ? item.rating : null;
export function filterReviews(items: ReviewItem[], filters: ReviewFilters = {}): ReviewItem[] {
  const includes = (text: string, terms?: string[]) => !terms?.length || terms.some(term => text.toLocaleLowerCase().includes(term.toLocaleLowerCase()));
  const excludes = (text: string, terms?: string[]) => !terms?.some(term => text.toLocaleLowerCase().includes(term.toLocaleLowerCase()));
  return items.filter(item => item.enabled === true && item.approved === true
    && (item.source !== 'whatsapp' || item.consentConfirmed === true)
    && (!filters.source || item.source === filters.source)
    && (filters.minRating == null || (legitimateRating(item) ?? -1) >= filters.minRating)
    && includes(item.client, filters.authorInclude) && excludes(item.client, filters.authorExclude)
    && includes(item.quote, filters.keywordInclude) && excludes(item.quote, filters.keywordExclude)
    && (filters.hideEmpty === false || item.quote.trim().length > 0)
    && (!filters.featuredOnly || item.featured));
}
export function sortReviews(items: ReviewItem[], sort: ReviewsWidgetConfig['sort'], seed = 'default'): ReviewItem[] {
  const result = [...items];
  const time = (item: ReviewItem) => item.date && Number.isFinite(Date.parse(item.date)) ? Date.parse(item.date) : null;
  if (sort === 'newest' || sort === 'oldest') result.sort((a, b) => {
    const x = time(a), y = time(b);
    if (x === null) return y === null ? 0 : 1;
    if (y === null) return -1;
    return sort === 'newest' ? y - x : x - y;
  });
  if (sort === 'random') {
    const hash = (id: string) => { let h = 2166136261; for (const c of seed + id) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };
    result.sort((a, b) => hash(a.id) - hash(b.id));
  }
  return result;
}
export const initials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();
export function sourceSummary(items: ReviewItem[]) {
  return Object.entries(sourceNames).map(([source, name]) => {
    const reviews = items.filter(item => item.source === source);
    const ratings = reviews.map(legitimateRating).filter((rating): rating is number => rating !== null);
    return { source, name, count: reviews.length, recommendations: reviews.filter(item => item.recommendation === true).length,
      average: ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null, ratingCount: ratings.length };
  }).filter(summary => summary.count > 0);
}
