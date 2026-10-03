import { getDeployStore } from '@netlify/blobs';
import local from '../../src/data/reviews/reviews.json' with { type: 'json' };
import { BlobReviewStore } from '../../src/lib/reviews/store.mjs';
import { readReviews, cleanReview } from '../../src/lib/reviews/sync.mjs';
import { isPreview, serializePublic } from '../../src/lib/reviews/security.mjs';

export function createEdgeHandler({openStore=()=>new BlobReviewStore(getDeployStore('reviews-phase2-preview'))}={}) {
return async (request,context) => {
  if(new URL(request.url).pathname.replace(/\/$/,'')==='/reviews-admin-preview') {
    return isPreview(context) ? context.next() : new Response('Not found',{status:404});
  }
  // Platform context, never a user-supplied Host/header, determines isolation.
  if(!isPreview(context)||request.method!=='GET')return context.next();
  const response=await context.next();
  if(!response.ok||!response.headers.get('content-type')?.includes('text/html'))return response;
  let timer;
  try {
    const store=openStore();
    const snapshot=await Promise.race([store.getSnapshot('facebook'),new Promise(resolve=>{timer=setTimeout(()=>resolve(null),250);})]);
    // Never publish local test fixtures through the actual Facebook cache path.
    if(!snapshot||snapshot.origin==='local-test')return response;
    const reviews=readReviews(snapshot,local).map(cleanReview);
    const text=await response.text();
    const marker='<script type="application/json" data-review-cache>[]</script>';
    if(!text.includes(marker))return new Response(text,response);
    const headers=new Headers(response.headers);headers.delete('content-length');headers.delete('etag');headers.set('cache-control','private, no-store');
    return new Response(text.replace(marker,`<script type="application/json" data-review-cache>${serializePublic(reviews)}</script>`),{status:response.status,headers});
  }catch{return response;}finally{clearTimeout(timer);}
};
}
export default createEdgeHandler();
export const config={path:['/','/pl/','/reviews-widget-preview/','/pl/reviews-widget-preview/','/reviews-admin-preview','/reviews-admin-preview/']};
