const HOST = 'kkcoaching.fit';
const KEY = '2ca0dc9694c94dc0a3db606bd33c9130';
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`;
const SITEMAP_INDEX = `https://${HOST}/sitemap-index.xml`;

function extractLocs(xml) {
  return [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)].map((match) =>
    match[1]
      .replaceAll('&amp;', '&')
      .replaceAll('&lt;', '<')
      .replaceAll('&gt;', '>')
      .trim()
  );
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: { 'user-agent': 'KKCoaching-IndexNow/1.0' },
    cache: 'no-store'
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: HTTP ${response.status}`);
  }

  return response.text();
}

async function collectUrls() {
  const indexXml = await fetchText(SITEMAP_INDEX);
  const sitemapUrls = extractLocs(indexXml).filter((url) => url.endsWith('.xml'));

  if (sitemapUrls.length === 0) {
    throw new Error('No child sitemaps found in sitemap-index.xml');
  }

  const pages = [];
  for (const sitemapUrl of sitemapUrls) {
    const sitemapXml = await fetchText(sitemapUrl);
    pages.push(...extractLocs(sitemapXml));
  }

  return [...new Set(pages)].filter((url) => {
    try {
      return new URL(url).hostname === HOST;
    } catch {
      return false;
    }
  });
}

async function submitIndexNow(urlList) {
  const response = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify({
      host: HOST,
      key: KEY,
      keyLocation: KEY_LOCATION,
      urlList
    })
  });

  if (![200, 202].includes(response.status)) {
    const body = await response.text();
    throw new Error(`IndexNow rejected submission: HTTP ${response.status} ${body}`);
  }

  console.log(`IndexNow accepted ${urlList.length} URLs (HTTP ${response.status}).`);
}

try {
  const urls = await collectUrls();
  if (urls.length === 0) throw new Error('No indexable URLs found in live sitemap.');
  await submitIndexNow(urls);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
