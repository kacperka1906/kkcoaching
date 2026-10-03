import data from '../../data/reviews/reviews.json';
import type { ReviewItem, ReviewProvider, ReviewProviderState } from './review-types';
export const providerStates: ReviewProviderState[] = [
  { source: 'facebook', enabled: false, connected: false, status: 'requires configuration', lastSync: null, lastAttempt: null },
  { source: 'manual', enabled: true, connected: false, status: 'ready', lastSync: null, lastAttempt: null },
  { source: 'google', enabled: false, connected: false, status: 'disabled', lastSync: null, lastAttempt: null },
  { source: 'whatsapp', enabled: false, connected: false, status: 'disabled', lastSync: null, lastAttempt: null }
];
// Local ingestion only. Provider source remains Facebook for manually transcribed recommendations.
export const localProvider: ReviewProvider = {
  source: 'manual',
  getStatus: () => providerStates.find(state => state.source === 'manual')!,
  normalize(raw) {
    if (!Array.isArray(raw)) return [];
    const ids = new Set<string>();
    return raw.filter((item): item is ReviewItem => {
      if (!item || typeof item !== 'object' || typeof item.id !== 'string' || ids.has(item.id)
        || !['facebook', 'google', 'whatsapp', 'manual'].includes(item.source)
        || typeof item.client !== 'string' || typeof item.quote !== 'string') return false;
      ids.add(item.id); return true;
    });
  }
};
export const localReviews = localProvider.normalize(data);
