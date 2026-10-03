export function isPreview(context) {
  return context?.deploy?.context === 'deploy-preview' && context.deploy.published === false && /^[a-zA-Z0-9-]+$/.test(context.deploy.id || '');
}
export async function authorized(request, secret) {
  if (typeof secret !== 'string' || secret.length < 32) return false;
  const header = request.headers.get('authorization') || '';
  if (!header.startsWith('Bearer ') || header.length > 512) return false;
  const hash = text => crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));
  const [a,b] = await Promise.all([hash(header.slice(7)),hash(secret)]);
  const x=new Uint8Array(a), y=new Uint8Array(b);let difference=0;
  for(let i=0;i<x.length;i++)difference|=x[i]^y[i];
  return difference===0;
}
export const json = (value,status=200) => new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow','X-Content-Type-Options':'nosniff'}});
export const serializePublic = value => JSON.stringify(value).replace(/</g,'\\u003c').replace(/>/g,'\\u003e').replace(/&/g,'\\u0026');
