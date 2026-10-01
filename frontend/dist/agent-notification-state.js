(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.AgentNotificationState = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function create() {
    const seen = new Set();
    const key = (kind, id) => `${String(kind || '').toLowerCase()}:${String(id || '').trim()}`;
    return {
      reset(sessions = [], beacons = []) {
        seen.clear();
        sessions.forEach(agent => { if (agent?.id) seen.add(key('session', agent.id)); });
        beacons.forEach(agent => { if (agent?.id) seen.add(key('beacon', agent.id)); });
      },
      take(kind, agent) {
        if (!agent?.id) return false;
        const value = key(kind, agent.id);
        if (seen.has(value)) return false;
        seen.add(value);
        return true;
      },
      clear() { seen.clear(); },
    };
  }
  return { create };
});
