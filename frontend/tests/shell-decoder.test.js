const assert = require('node:assert/strict');
const test = require('node:test');

global.atob = value => Buffer.from(value, 'base64').toString('binary');
const { createShellOutputDecoder } = require('../dist/shell-decoder.js');

function b64(bytes) {
  return Buffer.from(bytes).toString('base64');
}

test('decodes Windows GB18030 output split across tunnel frames', () => {
  const decoder = createShellOutputDecoder(true);
  assert.equal(decoder.decode(b64([0xd6]), true), '');
  assert.equal(decoder.decode(b64([0xd0, 0xce, 0xc4]), true), '中文');
  assert.equal(decoder.flush(), '');
});

test('decodes UTF-8 output split across tunnel frames', () => {
  const decoder = createShellOutputDecoder(false);
  assert.equal(decoder.decode(b64([0xe4, 0xb8]), true), '');
  assert.equal(decoder.decode(b64([0xad]), true), '中');
  assert.equal(decoder.flush(), '');
});

test('preserves UTF-8 output from a Windows shell', () => {
  const decoder = createShellOutputDecoder(true);
  assert.equal(decoder.decode(b64(Buffer.from('中文', 'utf8')), true), '中文');
  assert.equal(decoder.flush(), '');
});
