// Environment-neutral engine. No credentials or provider transport belongs here.
export const DAY = 24 * 60 * 60 * 1000;
export const COOLDOWN = 60 * 1000;
export const LEASE = 30 * 1000;
export function shouldRefresh(lastSync, now = new Date()) {
  if (!lastSync) return true;
  const then = Date.parse(lastSync);
  return Number.isFinite(then) && now.getTime() - then >= DAY;
}
const normalized = value => String(value ?? '').normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('en');
const contentKey = item => JSON.stringify([item.source,normalized(item.client),normalized(item.quote)]);
export function identity(item) {
  return item.externalId ? JSON.stringify([item.source,'id',item.externalId]) : JSON.stringify([contentKey(item),item.date ?? '']);
}
function domId(item) {
  // Deterministic UI identifier only, never represented as a provider ID.
  let hash=14695981039346656037n;
  for(const byte of new TextEncoder().encode(identity(item)))hash=BigInt.asUintN(64,(hash^BigInt(byte))*1099511628211n);
  return `review-${item.source}-${hash.toString(16)}`;
}
export function visible(item) {
  return item.enabled === true && item.approved === true && item.quote.trim().length > 0
    && (item.source !== 'whatsapp' || item.consentConfirmed === true);
}
export function cleanReview(item) {
  if (!item || !['facebook', 'manual', 'google', 'whatsapp'].includes(item.source)
    || typeof item.client !== 'string' || !item.client.trim() || item.client.length > 200
    || typeof item.quote !== 'string' || item.quote.length > 30000) throw new Error('invalid_review');
  const externalId = typeof item.externalId === 'string' && item.externalId.length <= 250 ? item.externalId : null;
  const date = typeof item.date === 'string' && /^\d{4}-\d{2}-\d{2}/.test(item.date) && Number.isFinite(Date.parse(item.date)) ? item.date : null;
  // Only local approved assets: never persist or hotlink ephemeral provider URLs.
  const avatar = typeof item.avatar === 'string' && /^\/images\/reviews\/[a-z0-9_.-]+$/i.test(item.avatar) ? item.avatar : null;
  let reviewUrl = null;
  try { const url = new URL(item.reviewUrl); if (url.protocol === 'https:' && ['www.facebook.com','facebook.com'].includes(url.hostname) && !url.search && !url.hash) reviewUrl = url.href; } catch {}
  return { id: typeof item.id === 'string' && /^[\w-]{1,100}$/.test(item.id) ? item.id : 'review', source: item.source,
    externalId, client: item.client, quote: item.quote, avatar, date, reviewUrl,
    rating: item.source !== 'google' ? null : Number.isFinite(item.rating) && item.rating >= 1 && item.rating <= 5 ? item.rating : null,
    recommendation: typeof item.recommendation === 'boolean' ? item.recommendation : null,
    enabled: item.enabled === true, approved: item.approved === true, featured: item.featured === true,
    consentConfirmed: item.consentConfirmed === true,
    sourceMeta: { origin: item.sourceMeta?.origin === 'local-test' ? 'local-test' : 'normalized', language: item.sourceMeta?.language === 'pl' ? 'pl' : 'en' } };
}
const sameContent = (a, b) => contentKey(a) === contentKey(b) && (!a.date || !b.date || a.date === b.date);
export function mergeReviews(previous, incoming, local = []) {
  // Complete provider response is authoritative; old records enrich matching metadata only.
  const result = [], stats = { imported: 0, updated: 0, skipped: 0, total: 0 };
  for (const raw of incoming) {
    const item = cleanReview(raw);
    const match = list => list.find(old => identity(old) === identity(item) || sameContent(old, item));
    const duplicate = match(result);
    if (duplicate) { stats.skipped++; continue; }
    const old = match(previous), fallback = match(local);
    const base = old || fallback;
    item.avatar ||= base?.avatar ?? null;
    item.id = base?.id || domId(item);
    // DOM ID stays stable with provider identity; collisions are resolved below.
    if (result.some(r => r.id === item.id)) item.id = `${domId(item)}-${result.length}`;
    if (old && JSON.stringify(cleanReview(old)) === JSON.stringify(item)) stats.skipped++;
    else if (old) stats.updated++;
    else stats.imported++;
    result.push(item);
  }
  stats.total = result.length;
  return { reviews: result, stats };
}
export function readReviews(snapshot, local) {
  let facebook = local.filter(item => item.source === 'facebook');
  if (snapshot?.source === 'facebook' && snapshot?.complete === true && Array.isArray(snapshot.reviews) && snapshot.reviews.length && Number.isFinite(Date.parse(snapshot.syncedAt))) {
    try {
      const cleaned = snapshot.reviews.map(cleanReview);
      if (cleaned.every(item => item.source === 'facebook') && cleaned.some(visible)) facebook = cleaned;
    } catch { /* Corrupt cache fails back to supplied local records. */ }
  }
  const combined = [...facebook, ...local.filter(item => item.source === 'manual' || item.source === 'whatsapp')];
  return combined.filter(visible).filter((item, index, list) => !list.slice(0,index).some(old =>
    identity(old) === identity(item) || (normalized(old.client) === normalized(item.client) && normalized(old.quote) === normalized(item.quote))));
}
export class MemoryReviewStore {
  kind = 'memory-test-only'; entries = new Map(); sequence = 0;
  async read(source) { return structuredClone(this.entries.get(source) || { data: null, etag: null }); }
  async compareAndSet(source, etag, data) {
    if ((this.entries.get(source)?.etag ?? null) !== etag) return null;
    const next = String(++this.sequence); this.entries.set(source, { data: structuredClone(data), etag: next }); return next;
  }
  async getSnapshot(source) { return (await this.read(source)).data?.snapshot ?? null; }
}
export async function refreshReviews({ store, provider, local = [], mode = 'manual', now = () => new Date(), timeoutMs = 10000 }) {
  const source = provider.source;
  let current;
  try { current = await store.read(source); } catch { return { ok:false, source, code:'storage_unavailable', error:'Preview cache is unavailable; existing reviews are unchanged.' }; }
  const state = current.data || { snapshot: null, lastAttempt: null, error: null, lease: null };
  const time = now();
  const fail = (code, error, retryAfter) => ({ ok:false, source, code, error, retryAfter, syncedAt:state.snapshot?.syncedAt ?? null, stats:state.snapshot?.stats ?? null });
  if (state.lease && Date.parse(state.lease.expiresAt) > time.getTime()) return fail('busy','A refresh is already running.',30);
  if (mode === 'daily' && (!shouldRefresh(state.snapshot?.syncedAt,time) || !shouldRefresh(state.lastAttempt,time))) return { ok:true, source, code:'fresh', syncedAt:state.snapshot?.syncedAt ?? null, stats:state.snapshot?.stats ?? null };
  if (state.lastAttempt && time.getTime() - Date.parse(state.lastAttempt) < COOLDOWN) return fail('rate_limited','Wait before refreshing again.',60);
  const lease = { token:crypto.randomUUID(), expiresAt:new Date(time.getTime()+LEASE).toISOString() };
  let version;
  try { version = await store.compareAndSet(source,current.etag,{...state,lease,lastAttempt:time.toISOString(),error:null}); }
  catch { return fail('storage_unavailable','Preview cache is unavailable; existing reviews are unchanged.'); }
  if (!version) return fail('busy','A refresh is already running.',30);
  const controller = new AbortController(); let timer;
  let snapshot = state.snapshot, code = 'refreshed', error = null;
  try {
    if (!provider.configured) throw new Error('not_configured');
    const response = await Promise.race([provider.fetch({signal:controller.signal}),new Promise((_,reject) => { timer=setTimeout(()=>{controller.abort();reject(new Error('timeout'));},Math.min(timeoutMs,10000)); })]);
    if (!response?.complete || !Array.isArray(response.reviews) || response.reviews.length === 0 || response.reviews.length > 1000) throw new Error('incomplete');
    if (response.reviews.some(item => item.source !== source)) throw new Error('incomplete');
    const merged = mergeReviews(state.snapshot?.reviews || [],response.reviews,local);
    if (!merged.reviews.some(visible)) throw new Error('incomplete');
    snapshot = { source, ...merged, complete:true, syncedAt:now().toISOString(), attemptedAt:time.toISOString(), origin:provider.mode };
  } catch (cause) {
    // Never return provider exception text, URLs, raw payloads or credentials.
    code = cause?.message === 'not_configured' ? 'not_configured' : 'sync_failed';
    error = code === 'not_configured' ? 'Facebook provider is not configured; official API access requires verification.' : 'Refresh failed or returned incomplete data. Previous reviews were preserved.';
  } finally { clearTimeout(timer); }
  try {
    const committed = await store.compareAndSet(source,version,{ snapshot,lastAttempt:time.toISOString(),error,lease:null });
    if (!committed) return fail('superseded','This refresh expired; a newer attempt owns the cache.');
  } catch { return fail('storage_unavailable','Could not persist refresh; the previous snapshot remains in use.'); }
  return { ok:!error, source, code, error, syncedAt:snapshot?.syncedAt ?? null, attemptedAt:time.toISOString(),stats:snapshot?.stats ?? null };
}
export const createLocalTestProvider = reviews => ({ source:'facebook', mode:'local-test', configured:true,
  fetch:async () => ({ complete:true, reviews:reviews.map(item=>({...item,sourceMeta:{...item.sourceMeta,origin:'local-test'}})) }) });
