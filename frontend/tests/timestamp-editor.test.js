const assert = require('node:assert/strict');
const test = require('node:test');
const { localInputToUnixSeconds, unixSecondsToLocalInput } = require('../dist/timestamp-editor.js');

test('round trips a local date-time with seconds', () => {
  const parsed = localInputToUnixSeconds('2026-10-01T09:08:07');
  assert.equal(parsed.error, undefined);
  assert.equal(unixSecondsToLocalInput(parsed.seconds), '2026-10-01T09:08:07');
});

test('rejects missing and normalized invalid dates', () => {
  assert.match(localInputToUnixSeconds('').error, /完整/);
  assert.match(localInputToUnixSeconds('2026-02-30T12:00:00').error, /无效/);
});
