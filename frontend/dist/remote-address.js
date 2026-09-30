(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.RemoteAddress = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function stripPort(value) {
    const text = String(value || '').trim();
    const bracketed = text.match(/^\[([^\]]+)\](?::\d+)?$/);
    if (bracketed) return bracketed[1];
    const ipv4OrHost = text.match(/^([^:]+):\d+$/);
    return ipv4OrHost ? ipv4OrHost[1] : text;
  }

  function sourceIP(value) {
    const raw = String(value || '').trim();
    if (!raw) return '-';
    const endpoint = raw.includes('->') ? raw.slice(raw.lastIndexOf('->') + 2).trim() : raw;
    return stripPort(endpoint) || raw;
  }

  return { sourceIP };
});
