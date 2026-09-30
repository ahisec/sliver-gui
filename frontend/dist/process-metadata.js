(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.ProcessMetadata = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function displayProcessMetadata(value, fieldName) {
    const text = String(value || '').trim();
    if (text) return { text, available: true, title: text };
    return {
      text: '不可用',
      available: false,
      title: `Teamserver、植入体或当前权限未提供${fieldName}信息`,
    };
  }

  return { displayProcessMetadata };
});
