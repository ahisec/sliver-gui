const assert = require('node:assert/strict');
const test = require('node:test');
const { normalizeRpcError, rpcErrorMessage, safeRpcErrorMessage } = require('../dist/rpc-errors.js');

test('translates common gRPC errors and keeps the original detail', () => {
  const result = normalizeRpcError(
    'rpc error: code = Unavailable desc = transport is closing',
    '加载会话',
  );

  assert.equal(result.code, 'unavailable');
  assert.equal(result.message, '加载会话：团队服务器暂时不可用或连接已中断');
  assert.equal(result.detail, 'code = Unavailable desc = transport is closing');
  assert.equal(result.cancelled, false);
});

test('recognises unsupported RPCs', () => {
  assert.equal(
    rpcErrorMessage(new Error('rpc error: code = Unimplemented desc = method missing')),
    '当前 Teamserver 版本不支持此功能',
  );
});

test('uses cleaned backend text when no translation rule matches', () => {
  const result = normalizeRpcError('Error: custom server failure', '保存配置');
  assert.equal(result.code, 'unknown');
  assert.equal(result.message, '保存配置：custom server failure');
  assert.equal(result.detail, '');
});

test('marks a cancelled file dialog without treating it as an unknown error', () => {
  const result = normalizeRpcError('selection cancelled');
  assert.equal(result.message, '操作已取消');
  assert.equal(result.cancelled, true);
});

test('translates operator configuration and connection failures', () => {
  assert.equal(
    rpcErrorMessage('parse config: invalid character'),
    '无法读取或解析操作员配置',
  );
  assert.equal(
    rpcErrorMessage('dial example.test:31337: connection refused'),
    '团队服务器暂时不可用或连接已中断',
  );
});

test('hides unknown backend details in task-safe summaries', () => {
  assert.equal(
    safeRpcErrorMessage('token=secret custom failure', '生成植入体失败'),
    '生成植入体失败：请求失败，请在当前操作界面查看详情',
  );
  assert.equal(
    safeRpcErrorMessage('rpc error: code = Unavailable desc = transport is closing', 'Beacon 命令提交失败'),
    'Beacon 命令提交失败：团队服务器暂时不可用或连接已中断',
  );
});
