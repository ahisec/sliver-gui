(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.RpcErrors = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  const rules = [
    { code: 'not-connected', test: /not connected to a teamserver/i, message: '尚未连接到团队服务器' },
    { code: 'config-read', test: /read config|parse config/i, message: '无法读取或解析操作员配置' },
    { code: 'certificate', test: /certificate|client cert|private key|teamserver ca/i, message: '证书或私钥校验失败，请检查操作员配置' },
    { code: 'timeout', test: /deadline exceeded|timed? out|timeout/i, message: '请求超时，请检查网络和团队服务器状态' },
    { code: 'permission-denied', test: /permission denied|code\s*=\s*PermissionDenied|access is denied|unauthorized|forbidden/i, message: '权限不足，当前操作员无法执行此操作' },
    { code: 'unimplemented', test: /code\s*=\s*Unimplemented|not implemented|unsupported/i, message: '当前 Teamserver 版本不支持此功能' },
    { code: 'unavailable', test: /code\s*=\s*Unavailable|connection refused|transport is closing|connection reset|broken pipe|eof\b/i, message: '团队服务器暂时不可用或连接已中断' },
    { code: 'dial-failed', test: /\bdial\b|no such host|network is unreachable/i, message: '无法连接团队服务器，请检查地址、端口和网络' },
    { code: 'invalid-argument', test: /code\s*=\s*InvalidArgument|invalid argument|invalid .*json|parse .*json/i, message: '提交的参数或配置格式不正确' },
    { code: 'not-found', test: /code\s*=\s*NotFound|not found|no such file/i, message: '未找到请求的资源' },
    { code: 'already-exists', test: /code\s*=\s*AlreadyExists|already exists|already running/i, message: '同名资源已存在或任务已在运行' },
    { code: 'cancelled', test: /code\s*=\s*Canceled|cancelled|canceled|selection cancelled|save cancelled/i, message: '操作已取消' },
  ];

  function rawError(error) {
    if (error == null) return '';
    if (typeof error === 'string') return error.trim();
    if (typeof error.message === 'string') return error.message.trim();
    try { return JSON.stringify(error); } catch (_) { return String(error); }
  }

  function cleanError(raw) {
    return String(raw || '')
      .replace(/^\s*(?:uncaught\s+)?error:\s*/i, '')
      .replace(/^rpc error:\s*/i, '')
      .trim();
  }

  function normalizeRpcError(error, context = '') {
    const raw = rawError(error);
    const cleaned = cleanError(raw);
    const rule = rules.find(item => item.test.test(cleaned));
    const summary = rule ? rule.message : (cleaned || '发生未知错误');
    return {
      code: rule ? rule.code : 'unknown',
      message: context ? `${context}：${summary}` : summary,
      detail: cleaned && cleaned !== summary ? cleaned : '',
      cancelled: rule?.code === 'cancelled',
    };
  }

  function rpcErrorMessage(error, context = '') {
    return normalizeRpcError(error, context).message;
  }

  function safeRpcErrorMessage(error, context = '') {
    const result = normalizeRpcError(error, context);
    if (result.code !== 'unknown') return result.message;
    return context ? `${context}：请求失败，请在当前操作界面查看详情` : '请求失败，请在当前操作界面查看详情';
  }

  return { normalizeRpcError, rpcErrorMessage, safeRpcErrorMessage };
});
