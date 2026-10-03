import { getDeployStore } from '@netlify/blobs';
import local from '../../src/data/reviews/reviews.json';
import { BlobReviewStore } from '../../src/lib/reviews/store.mjs';
import { refreshReviews } from '../../src/lib/reviews/sync.mjs';
import { isPreview, authorized, json } from '../../src/lib/reviews/security.mjs';

// Meta Recommendation reference: deprecated from v22.0, error 12. No transport.
export const facebook = {source:'facebook',mode:'disabled',configured:false,fetch:async()=>{throw new Error('not_configured');}};
export function createHandler({ openStore = () => new BlobReviewStore(getDeployStore('reviews-phase2-preview')), secret = () => process.env.REVIEWS_REFRESH_SECRET } = {}) {
  return async (request,context) => {
    if (!isPreview(context)) return json({ok:false,code:'preview_only'},404);
    if (!['GET','POST'].includes(request.method)) return json({ok:false,code:'method_not_allowed'},405);
    if (request.method === 'POST') {
      const origin=request.headers.get('origin');
      if(origin && origin!==new URL(request.url).origin)return json({ok:false,code:'forbidden'},403);
      if(!await authorized(request,secret()))return json({ok:false,code:'unauthorized',error:'Refresh requires a configured preview-only admin credential.'},401);
      if(Number(request.headers.get('content-length')||0)>1024)return json({ok:false,code:'invalid_request'},400);
      let body;try{const text=await request.text();if(text.length>1024)throw new Error();body=JSON.parse(text);}catch{return json({ok:false,code:'invalid_request'},400);}
      if(body.source!=='facebook'||!['manual','daily'].includes(body.mode))return json({ok:false,code:'invalid_request'},400);
      // Missing configuration should be clear even if storage is unavailable.
      if(!facebook.configured)return json({ok:false,source:'facebook',code:'not_configured',error:'Facebook provider is not configured. Meta deprecated Recommendation access from v22.0 (error 12); a token alone cannot fix this. No request was sent to Meta.'},503);
      try {
        const result=await refreshReviews({store:openStore(),provider:facebook,local,mode:body.mode});
        return json(result,result.ok?200:result.code==='rate_limited'?429:result.code==='busy'?409:503);
      } catch {return json({ok:false,code:'storage_unavailable',error:'Preview cache unavailable. Existing reviews are unchanged.'},503);}
    }
    let stored=null,storage='unavailable';
    try{const store=openStore();stored=(await store.read('facebook')).data;storage=store.kind;}catch{}
    return json({previewOnly:true,authenticationConfigured:typeof secret()==='string' && secret().length>=32,storage,
      providers:[
        {source:'facebook',status:'requires configuration',configured:false,connected:false,lastSync:stored?.snapshot?.syncedAt??null,lastAttempt:stored?.lastAttempt??null,
          cachedCount:stored?.snapshot?.reviews?.length??0,stats:stored?.snapshot?.stats??null,error:stored?.error?'Last refresh failed; existing reviews were preserved.':'Meta deprecated Recommendation access from v22.0 (error 12). A supported replacement must be confirmed before enabling sync.'},
        {source:'google',status:'disabled',configured:false,connected:false,message:'Waiting for Google Business Profile verification'},
        {source:'whatsapp',status:'disabled',configured:false,connected:false,message:'Approval-based ingestion planned; approval and consent are required'}]});
  };
}
export default createHandler();
