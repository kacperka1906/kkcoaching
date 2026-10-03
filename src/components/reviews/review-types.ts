export type ReviewSource = 'facebook' | 'google' | 'whatsapp' | 'messenger' | 'manual';
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
  status: 'disabled' | 'ready' | 'syncing' | 'error';
  lastSync?: string | null; lastAttempt?: string | null; error?: string | null;
}
export interface ReviewProvider {
  source: ReviewSource;
  getStatus(): ReviewProviderState;
  normalize(raw: unknown): ReviewItem[];
}
// Phase 2 server-side orchestration contract only. No implementation or endpoint.
export interface ReviewSyncService {
  manualRefresh(source: ReviewSource): Promise<ReviewProviderState>;
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
