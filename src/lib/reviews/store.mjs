// Inject an official SDK Store. No site-wide store or credentials in this module.
export class BlobReviewStore {
  kind = 'netlify-deploy-blobs';
  constructor(blobs) { this.blobs = blobs; }
  async read(source) {
    const record = await this.blobs.getWithMetadata(`provider-${source}`,{type:'json',consistency:'strong'});
    return record ? {data:record.data,etag:record.etag} : {data:null,etag:null};
  }
  async compareAndSet(source,etag,data) {
    const result = await this.blobs.setJSON(`provider-${source}`,data,etag ? {onlyIfMatch:etag} : {onlyIfNew:true});
    return result.modified ? result.etag : null;
  }
  async getSnapshot(source) { return (await this.read(source)).data?.snapshot ?? null; }
}
