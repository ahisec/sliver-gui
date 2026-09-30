(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.NotificationRules = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  const rank = { info: 1, warning: 2, critical: 3 };

  function minutes(value) {
    const match = /^(\d{1,2}):(\d{2})$/.exec(String(value || ''));
    if (!match) return null;
    const hour = Number(match[1]), minute = Number(match[2]);
    if (hour > 23 || minute > 59) return null;
    return hour * 60 + minute;
  }

  function isQuietTime(now, start, end) {
    const from = minutes(start), to = minutes(end);
    if (from == null || to == null || from === to) return false;
    const current = now.getHours() * 60 + now.getMinutes();
    return from < to ? current >= from && current < to : current >= from || current < to;
  }

  function shouldNotify(event, settings, now = new Date()) {
    if (!event || !settings) return false;
    if (settings.enabled === false) return false;
    if (settings.categories && settings.categories[event.category] === false) return false;
    if ((rank[event.level] || 1) < (rank[settings.minimumLevel] || 1)) return false;
    if (isQuietTime(now, settings.quietStart, settings.quietEnd)) return false;
    return true;
  }

  return { isQuietTime, shouldNotify };
});
