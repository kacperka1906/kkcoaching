export type ReviewSource = 'facebook' | 'google' | 'whatsapp' | 'manual';
export interface ReviewItem {
  id: string; source: ReviewSource; externalId?: string | null;
  client: string; quote: string; avatar?: string | null;
  rating?: number | null; date?: string | null; reviewUrl?: string | null;
  recommendation?: boolean | null;
  enabled: boolean; featured: boolean; approved: boolean;
  consentConfirmed?: boolean | null;
  createdAt?: string | null; updatedAt?: string | null; importedAt?: string | null;
  sourceMeta?: Record<string, unknown>;
}
export interface ReviewProviderState {
  source: ReviewSource; enabled: boolean; connected: boolean;
  status: 'disabled' | 'ready' | 'syncing' | 'error' | 'requires configuration';
  lastSync?: string | null; lastAttempt?: string | null; error?: string | null;
}
export interface ReviewProvider {
  source: ReviewSource;
  getStatus(): ReviewProviderState;
  normalize(raw: unknown): ReviewItem[];
}
export interface SyncProvider {
  source: ReviewSource; mode: 'disabled' | 'local-test' | 'official-api'; configured: boolean;
  fetch(options: { signal: AbortSignal }): Promise<{ complete: boolean; reviews: ReviewItem[] }>;
}
export interface StoredReviewSnapshot {
  source: ReviewSource; reviews: ReviewItem[]; syncedAt: string; attemptedAt: string;
  complete: true; origin: SyncProvider['mode'];
  stats: { imported: number; updated: number; skipped: number; total: number };
}
export interface ReviewStoreState {
  snapshot: StoredReviewSnapshot | null; lastAttempt: string | null; error: string | null;
  lease: { token: string; expiresAt: string } | null;
}
export interface ReviewStore {
  kind: string;
  read(source: ReviewSource): Promise<{ data: ReviewStoreState | null; etag: string | null }>;
  compareAndSet(source: ReviewSource, etag: string | null, state: ReviewStoreState): Promise<string | null>;
  getSnapshot(source: ReviewSource): Promise<StoredReviewSnapshot | null>;
}
export interface ReviewFilters {
  source?: ReviewSource; minRating?: number;
  authorInclude?: string[]; authorExclude?: string[];
  keywordInclude?: string[]; keywordExclude?: string[];
  hideEmpty?: boolean; featuredOnly?: boolean;
}
export interface ReviewsWidgetConfig {
  layout: 'carousel' | 'grid' | 'list'; theme: 'site' | 'light' | 'dark';
  showHeader: boolean; showSourceSummary: boolean; showReviewerAvatar: boolean;
  showReviewerName: boolean; showSourceIcon: boolean; showDate: boolean;
  showRating: boolean; showRecommendationState: boolean;
  reviewTextMode: 'short' | 'full'; reviewClampLines: number;
  desktopColumns: 2 | 3 | 4; tabletColumns: 1 | 2; mobileCardWidth: string;
  showNavigationArrows: boolean; showProgress: boolean; showCounter: boolean;
  sort: 'manual' | 'newest' | 'oldest' | 'random';
  showWriteReviewButton: boolean; writeReviewUrl?: string | null;
  accentMode: 'site-red' | 'source';
}
