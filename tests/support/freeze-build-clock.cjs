// Test-only preload; production code never reads or sets this override.
const NativeDate = Date;
const instant = process.env.PROMOTION_TEST_INSTANT;
if (!instant || !Number.isFinite(new NativeDate(instant).valueOf())) {
  throw new Error('A valid PROMOTION_TEST_INSTANT is required');
}
global.Date = class extends NativeDate {
  constructor(...args) { super(...(args.length ? args : [instant])); }
  static now() { return new NativeDate(instant).valueOf(); }
};
