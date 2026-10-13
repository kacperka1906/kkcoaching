const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const { transformSync } = require('esbuild');
const { handler } = require('../netlify/functions/contact.js');

const valid = { name: 'Internal test', email: 'test@example.invalid', phone: '01234567890', goal: 'Test goal', consent: 'on' };
const root = path.resolve(__dirname, '..');

// Every fetch in this suite is replaced by a local stub. No enquiries or GA requests are sent.
function contactPage(lang, intent = '', fetchImpl = async () => ({ ok: true }), analytics = true) {
  const source = fs.readFileSync(path.join(root, 'src/pages', lang === 'pl' ? 'pl/contact.astro' : 'contact.astro'), 'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
  const interest = { value: '' };
  const leadIntent = { value: 'direct' };
  const button = { disabled: false };
  const status = { textContent: '' };
  const events = [];
  const requests = [];
  const attributes = new Map();
  let submit;
  let isValid = true;
  const fields = { ...valid };
  const form = {
    dataset: { leadLanguage: lang, thankYou: lang === 'pl' ? '/pl/thank-you' : '/thank-you', error: 'Failed' },
    querySelector: selector => selector === '#interest' ? interest : selector === '#lead-intent' ? leadIntent : button,
    addEventListener: (event, listener) => { if (event === 'submit') submit = listener; },
    checkValidity: () => isValid,
    reportValidity() {},
    setAttribute: (key, value) => attributes.set(key, value),
    removeAttribute: key => attributes.delete(key)
  };
  class MockFormData extends Map {
    constructor() { super(Object.entries({ ...fields, interest: interest.value, lead_intent: leadIntent.value })); }
  }
  const window = { location: { search: intent ? `?interest=${intent}` : '', href: '' } };
  if (analytics) window.gtag = (...args) => events.push(args);
  vm.runInNewContext(transformSync(source, { loader: 'ts' }).code, {
    document: { getElementById: id => id === 'contact-form' ? form : status }, window,
    URLSearchParams, FormData: MockFormData,
    fetch: async (url, options) => { requests.push({ url, body: JSON.parse(options.body) }); return fetchImpl(); }
  });
  return { interest, leadIntent, button, status, attributes, window, events, requests, fields,
    submit: () => submit({ preventDefault() {} }), setValidity: value => { isValid = value; } };
}

for (const lang of ['en', 'pl']) {
  for (const intent of ['', 'pt', 'online', 'hybrid', 'training-plan', 'taster', 'invalid']) {
    test(`${lang}: ${intent || 'direct'} intent survives changed interest and rapid double submission`, async () => {
      let finish;
      const page = contactPage(lang, intent, () => new Promise(resolve => { finish = resolve; }));
      const expected = intent && intent !== 'invalid' ? intent : 'direct';
      assert.equal(page.interest.value, expected === 'direct' ? '' : expected);
      assert.equal(page.leadIntent.value, expected);
      page.interest.value = 'unsure';
      const first = page.submit();
      const second = page.submit();
      assert.equal(page.requests.length, 1);
      assert.equal(page.button.disabled, true);
      assert.equal(page.attributes.get('aria-busy'), 'true');
      finish({ ok: true });
      await Promise.all([first, second]);
      await page.submit();
      assert.equal(page.requests.length, 1);
      assert.equal(page.events.length, 1);
      assert.equal(page.events[0][1], 'generate_lead');
      assert.equal(page.events[0][2].lead_intent, expected);
      assert.equal(page.events[0][2].interest, 'unsure');
      assert.equal(page.events[0][2].lead_language, lang);
      assert.equal(page.requests[0].body.lead_intent, expected);
      assert.equal(page.requests[0].body.interest, 'unsure');
      assert.equal(page.window.location.href, lang === 'pl' ? '/pl/thank-you' : '/thank-you');
    });
  }
  test(`${lang}: failed delivery permits a successful retry without counting failure as a lead`, async () => {
    let attempts = 0;
    const page = contactPage(lang, 'online', async () => ({ ok: ++attempts > 1 }));
    await page.submit();
    assert.equal(page.button.disabled, false);
    assert.equal(page.attributes.has('aria-busy'), false);
    assert.equal(page.status.textContent, 'Failed');
    assert.equal(page.events.length, 0);
    assert.equal(page.window.location.href, '');
    await page.submit();
    assert.equal(page.requests.length, 2);
    assert.equal(page.events.length, 1);
  });
  test(`${lang}: validation and honeypot do not send or track; no analytics consent still allows an enquiry`, async () => {
    const invalid = contactPage(lang);
    invalid.setValidity(false);
    await invalid.submit();
    assert.equal(invalid.requests.length, 0);
    assert.equal(invalid.events.length, 0);
    const bot = contactPage(lang);
    bot.fields.company = 'Bot';
    await bot.submit();
    assert.equal(bot.requests.length, 0);
    assert.equal(bot.events.length, 0);
    const noConsent = contactPage(lang, '', undefined, false);
    await noConsent.submit();
    assert.equal(noConsent.requests.length, 1);
    assert.equal(noConsent.events.length, 0);
    assert.ok(noConsent.window.location.href);
  });
}

test('backend validates malformed requests before the mocked email provider', async () => {
  const originalFetch = global.fetch;
  const emails = [];
  global.fetch = async (url, options) => { emails.push(JSON.parse(options.body)); return { ok: true }; };
  try {
    for (const body of ['null', '[]', 'true', '"text"', '{broken']) {
      assert.equal((await handler({ httpMethod: 'POST', body })).statusCode, 400);
    }
    for (const field of ['name', 'email', 'phone', 'goal']) {
      for (const value of ['', '   ', {}, [], 12, true]) {
        assert.equal((await handler({ httpMethod: 'POST', body: JSON.stringify({ ...valid, [field]: value }) })).statusCode, 400);
      }
    }
    for (const consent of [false, 'false', '', {}, [], 1]) {
      assert.equal((await handler({ httpMethod: 'POST', body: JSON.stringify({ ...valid, consent }) })).statusCode, 400);
    }
    assert.equal((await handler({ httpMethod: 'GET' })).statusCode, 405);
    assert.equal((await handler({ httpMethod: 'POST', body: JSON.stringify({ company: 'Bot' }) })).statusCode, 200);
    assert.equal(emails.length, 0);
    for (const consent of ['on', true]) {
      const result = await handler({ httpMethod: 'POST', body: JSON.stringify({ ...valid, consent, interest: 'unsure', lead_intent: 'pt', name: '<script>test</script>' }) });
      assert.equal(result.statusCode, 200);
      assert.ok(emails.at(-1).html.includes('Interested in:</strong> Not sure yet'));
      assert.ok(emails.at(-1).html.includes('Original lead intent:</strong> pt'));
      assert.ok(emails.at(-1).html.includes('&lt;script&gt;'));
      assert.equal(emails.at(-1).reply_to, valid.email);
    }
  } finally { global.fetch = originalFetch; }
});

test('analytics is loaded once only after accepted consent', () => {
  const source = fs.readFileSync(path.join(root, 'src/components/Analytics.astro'), 'utf8').match(/<script[^>]*>([\s\S]*?)<\/script>/)[1];
  for (const initial of [null, 'rejected', 'accepted']) {
    let consent = initial;
    const scripts = [];
    const listeners = new Map();
    const window = { location: { pathname: '/contact' }, addEventListener: (name, listener) => listeners.set(name, listener) };
    vm.runInNewContext(source, { window, localStorage: { getItem: () => consent }, GA_MEASUREMENT_ID: 'G-TEST',
      document: { createElement: () => ({}), head: { appendChild: script => scripts.push(script) }, addEventListener() {} } });
    assert.equal(scripts.length, initial === 'accepted' ? 1 : 0);
    consent = 'accepted';
    listeners.get('kk-analytics-consent-granted')();
    listeners.get('kk-analytics-consent-granted')();
    assert.equal(scripts.length, 1);
    assert.equal(window.dataLayer.filter(args => args[0] === 'config').length, 1);
  }
});
