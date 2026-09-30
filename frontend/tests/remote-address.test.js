const test = require('node:test');
const assert = require('node:assert/strict');
const remoteAddress = require('../dist/remote-address.js');

test('extracts the outer source IP from a Teamserver connection chain', () => {
  assert.equal(remoteAddress.sourceIP('tcp(127.0.0.1:55010)->183.151.144.200'), '183.151.144.200');
  assert.equal(remoteAddress.sourceIP('tcp(127.0.0.1:55010)->183.151.144.200:443'), '183.151.144.200');
});

test('removes ports from plain IPv4, host and bracketed IPv6 endpoints', () => {
  assert.equal(remoteAddress.sourceIP('203.0.113.8:49152'), '203.0.113.8');
  assert.equal(remoteAddress.sourceIP('proxy.example:443'), 'proxy.example');
  assert.equal(remoteAddress.sourceIP('[2001:db8::8]:443'), '2001:db8::8');
});

test('keeps unbracketed IPv6 and safely handles empty values', () => {
  assert.equal(remoteAddress.sourceIP('2001:db8::8'), '2001:db8::8');
  assert.equal(remoteAddress.sourceIP(''), '-');
  assert.equal(remoteAddress.sourceIP(null), '-');
});
