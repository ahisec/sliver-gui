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

test('infrastructure snapshot has a UI timeout instead of spinning forever', () => {
  assert.equal(source.includes('Promise.race(['), true);
  assert.equal(source.includes("new Error('网络基础设施汇总超过 8 秒')"), true);
  assert.equal(source.includes('正在汇总 Pivot 与活动转发（最多等待 8 秒）'), true);
});

test('getprivs is routed before the generic Beacon shell fallback', () => {
  const builtIn = source.indexOf("if (cmd === 'getprivs') return runGetPrivsCommand(kind, id, tab.obj);");
  const beaconFallback = source.indexOf("if (kind === 'beacon') {");
  assert.ok(builtIn >= 0 && beaconFallback >= 0 && builtIn < beaconFallback);
  assert.equal(source.includes("case 'getprivs':"), false);
  assert.equal(source.includes('StartBeaconGetPrivs(id)'), true);
});
