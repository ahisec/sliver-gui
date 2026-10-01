const assert = require('node:assert/strict');
const test = require('node:test');
const { MAX_SECONDS, parseSeconds } = require('../dist/session-reconnect.js');

test('parses a valid Session reconnect interval', () => {
  assert.deepEqual(parseSeconds('90'), { seconds: 90 });
});

test('rejects malformed and out-of-range Session reconnect intervals', () => {
  for (const value of ['', '0', '-1', '60s', String(MAX_SECONDS + 1)]) {
    assert.equal(typeof parseSeconds(value).error, 'string');
  }
});
