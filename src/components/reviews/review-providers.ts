import fallbackData from '../../data/reviews/reviews.json';
import admin from '../../data/admin-v2.json';
import type { ReviewItem, ReviewProvider, ReviewProviderState, ReviewSource } from './review-types';

export const providerStates: ReviewProviderState[] = [
  { source: 'facebook', enabled: true, connected: false, status: 'ready', lastSync: null, lastAttempt: null },
  { source: 'manual', enabled: true, connected: false, status: 'ready', lastSync: null, lastAttempt: null },
  { source: 'google', enabled: false, connected: false, status: 'disabled', lastSync: null, lastAttempt: null },
  { source: 'whatsapp', enabled: true, connected: false, status: 'ready', lastSync: null, lastAttempt: null },
  { source: 'messenger', enabled: true, connected: false, status: 'ready', lastSync: null, lastAttempt: null }
];

const supported = new Set<ReviewSource>(['facebook', 'google', 'whatsapp', 'messenger', 'manual']);
const stableId = (client: string, quote: string) => {
  let h = 2166136261;
  for (const c of `${client}\n${quote}`) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return `review-${(h >>> 0).toString(16)}`;
};
const normalizeSource = (source: unknown): ReviewSource =>
  typeof source === 'string' && supported.has(source as ReviewSource) ? source as ReviewSource : 'manual';

const normalizeAdminItem = (item: any): ReviewItem | null => {
  if (!item || typeof item !== 'object' || typeof item.client !== 'string' || typeof item.quote !== 'string') return null;
  const source = normalizeSource(item.source);
  return {
    id: typeof item.id === 'string' && item.id.trim() ? item.id.trim() : stableId(item.client, item.quote),
    source,
    externalId: null,
    client: item.client,
    quote: item.quote,
    avatar: typeof item.avatar === 'string' && item.avatar ? item.avatar : null,
    rating: source === 'google' && typeof item.rating === 'number' ? item.rating : null,
    date: typeof item.date === 'string' && item.date ? item.date : null,
    reviewUrl: typeof item.reviewUrl === 'string' && item.reviewUrl ? item.reviewUrl : null,
    recommendation: source === 'facebook' ? item.recommendation !== false : null,
    enabled: item.enabled !== false,
    featured: item.featured !== false,
    approved: item.approved === true,
    consentConfirmed: item.consentConfirmed === true,
    sourceMeta: {
      language: item.language === 'pl' ? 'pl' : 'en',
      screenshot: typeof item.screenshot === 'string' && item.screenshot ? item.screenshot : undefined,
      origin: 'admin'
    }
  };
};

export const localProvider: ReviewProvider = {
  source: 'manual',
  getStatus: () => providerStates.find(state => state.source === 'manual')!,
  normalize(raw) {
    if (!Array.isArray(raw)) return [];
    const ids = new Set<string>();
    return raw.map(normalizeAdminItem).filter((item): item is ReviewItem => {
      if (!item || ids.has(item.id)) return false;
      ids.add(item.id);
      return true;
    });
  }
};

const adminReviews = localProvider.normalize(admin.reviews?.items ?? []);
const fallbackReviews = fallbackData as ReviewItem[];

// Admin is canonical once it contains review records. Static JSON remains a safe fallback.
export const localReviews = adminReviews.length ? adminReviews : fallbackReviews;
