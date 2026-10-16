// Calendar dates are inclusive and always evaluated in the business time zone.
export const promotionTimeZone = 'Europe/London';

export function londonDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: promotionTimeZone, year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function isOfferActive(offer, date = new Date()) {
  const today = londonDateKey(date);
  return Boolean(offer?.enabled
    && (!offer.startDate || today >= offer.startDate)
    && (!offer.autoDisableAfterEndDate || !offer.endDate || today <= offer.endDate));
}

export function activeOfferIds(offers, date = new Date()) {
  return offers.filter(offer => isOfferActive(offer, date)).map(offer => offer.id).sort();
}
