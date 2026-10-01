const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const source = fs.readFileSync(path.join(__dirname, '..', 'dist', 'main.js'), 'utf8');

test('agent refresh uses the existing persistence function', () => {
  assert.equal(source.includes('saveAgentState('), false);
  assert.equal(source.includes('if (integrityChanged) saveState();'), true);
});

test('directory downloads declare recursive intent', () => {
  assert.equal(source.includes('{ isDirectory: file.isDir }'), true);
  assert.equal(source.includes('DownloadPathTracked(transferID, sessionID, remotePath, Boolean(options.isDirectory))'), true);
});
