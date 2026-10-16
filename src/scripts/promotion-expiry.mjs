import { isOfferActive } from '../lib/promotions.mjs';

// Covers an older cached build and pages left open across a London midnight.
function active(element, now) {
  return isOfferActive({
    enabled: element.dataset.enabled !== 'false',
    startDate: element.dataset.startDate,
    endDate: element.dataset.endDate,
    autoDisableAfterEndDate: element.dataset.autoDisable === 'true'
  }, now);
}

export function applyPromotionExpiry(now = new Date()) {
  document.querySelectorAll('[data-promotion-card]').forEach(card => {
    card.hidden = !active(card, now);
  });
  document.querySelectorAll('[data-promotions-section]').forEach(section => {
    section.hidden = ![...section.querySelectorAll('[data-promotion-card]')].some(card => !card.hidden);
  });
  document.querySelectorAll('[data-october-pricing]').forEach(block => {
    const visible = active(block, now);
    if (block.hasAttribute('data-october-only')) {
      block.hidden = !visible;
      return;
    }
    block.querySelectorAll('[data-standard-only]').forEach(el => { el.hidden = visible; });
    block.querySelectorAll('[data-october-only]').forEach(el => { el.hidden = !visible; });
    if (!block.dataset.priceSchemaId) return;
    const price = Number(visible ? block.dataset.promotionalPrice : block.dataset.standardPrice);
    document.querySelectorAll('script[type="application/ld+json"]').forEach(script => {
      const schema = JSON.parse(script.textContent);
      const service = (schema['@graph'] ?? [schema]).find(node => node['@id'] === block.dataset.priceSchemaId);
      if (service?.offers && service.offers.price !== price) {
        service.offers.price = price;
        script.textContent = JSON.stringify(schema);
      }
    });
  });
}

if (document.querySelector('[data-promotion-card], [data-october-pricing]')) {
  applyPromotionExpiry();
  setInterval(() => applyPromotionExpiry(), 60_000);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) applyPromotionExpiry();
  });
}
