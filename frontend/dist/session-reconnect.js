(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.SessionReconnect = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const MAX_SECONDS = 7 * 24 * 60 * 60;

  function parseSeconds(value) {
    const text = String(value ?? '').trim();
    if (!/^\d+$/.test(text)) return { error: '请输入正整数秒数' };
    const seconds = Number(text);
    if (!Number.isSafeInteger(seconds) || seconds < 1 || seconds > MAX_SECONDS) {
      return { error: `重连间隔必须在 1 到 ${MAX_SECONDS} 秒之间` };
    }
    return { seconds };
  }

  return { MAX_SECONDS, parseSeconds };
});
