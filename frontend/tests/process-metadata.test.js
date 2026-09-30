const assert = require('node:assert/strict');
const test = require('node:test');
const { displayProcessMetadata } = require('../dist/process-metadata.js');

test('keeps process metadata returned by Sliver', () => {
  assert.deepEqual(displayProcessMetadata('x86_64', '架构'), {
    text: 'x86_64',
    available: true,
    title: 'x86_64',
  });
});

test('labels missing process metadata as unavailable', () => {
  assert.deepEqual(displayProcessMetadata('', '所有者'), {
    text: '不可用',
    available: false,
    title: 'Teamserver、植入体或当前权限未提供所有者信息',
  });
});
