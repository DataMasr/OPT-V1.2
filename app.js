// ==========================================================
// CyperOpt - Modern Client Script & Hardware Bridge
// ==========================================================

const SoundEngine = {
  ctx: null,
  getAudio() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    return this.ctx;
  },
  playClick() {
    try {
      const ctx = this.getAudio();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(580, now);
      osc.frequency.exponentialRampToValueAtTime(320, now + 0.035);

      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.045);
    } catch (e) { }
  },
  playCopy() {
    try {
      const ctx = this.getAudio();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(659.25, now);
      osc.frequency.exponentialRampToValueAtTime(987.77, now + 0.14);

      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.20);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.20);
    } catch (e) { }
  }
};

const IS_NATIVE = !!(window.chrome && window.chrome.webview);

// ==========================================================
// Security & Anti-Tamper UI Protections
// ==========================================================
// 1. Disable Right-Click Context Menu globally
window.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  e.stopPropagation();
  return false;
}, true);

// 2. Block Inspect, DevTools, View Source & Reload Shortcuts
window.addEventListener('keydown', (e) => {
  // F12
  if (e.key === 'F12' || e.keyCode === 123) {
    e.preventDefault();
    e.stopPropagation();
    return false;
  }
  // Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C
  if (e.ctrlKey && e.shiftKey && ['I', 'i', 'J', 'j', 'C', 'c'].includes(e.key)) {
    e.preventDefault();
    e.stopPropagation();
    return false;
  }
  // Ctrl+U (View Source)
  if (e.ctrlKey && (e.key === 'u' || e.key === 'U')) {
    e.preventDefault();
    e.stopPropagation();
    return false;
  }
  // Ctrl+R or F5 (Browser Reload)
  if ((e.ctrlKey && (e.key === 'r' || e.key === 'R')) || e.key === 'F5' || e.keyCode === 116) {
    e.preventDefault();
    e.stopPropagation();
    return false;
  }
}, true);

let currentTab = 'home';

function renderTabHeader() {
  const titleEl = document.getElementById('view-title');
  const descEl = document.getElementById('view-desc');
  if (titleEl) titleEl.textContent = t(`tab.${currentTab}.title`);
  if (descEl) descEl.textContent = t(`tab.${currentTab}.desc`);
}

// Switch Tab
function switchTab(tabId, silent) {
  if ((tabId === 'modskin' || tabId === 'memory') && isLevel2License()) {
    showToast(tabId === 'memory' ? t('auth.err.level2Memory') : t('auth.err.level2Modskin'), 'error');
    return;
  }
  if (!silent) SoundEngine.playClick();
  currentTab = tabId;

  document.querySelectorAll('.menu-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabId);
  });

  document.querySelectorAll('.tab-view').forEach(panel => {
    panel.classList.toggle('active', panel.id === `tab-${tabId}`);
  });

  const viewport = document.querySelector('.app-content-viewport');
  if (viewport) viewport.scrollTop = 0;

  if (tabId === 'paks' && Bridge.state === 'connected') requestPaksInfo();
  if (tabId === 'tweaks' && Auth.unlocked) sendAction('get_pc_check');
  if (tabId === 'display-res') sendAction('get_display_info');
  if (tabId === 'fixer32') sendAction('get_hosts_fix_status');
  if (tabId === 'roblox-vpn') sendAction('get_roblox_vpn_status');

  renderTabHeader();
}

// ----------------------------------------------------------
// Toast Notifications
// ----------------------------------------------------------
const TOAST_ICONS = {
  success: '<polyline points="20 6 9 17 4 12"></polyline>',
  error: '<circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line>',
  info: '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line>'
};

function showToast(text, type = 'success', customDuration = 0) {
  const container = document.getElementById('toast-wrapper');
  if (!container) return;
  if (!TOAST_ICONS[type]) type = 'success';

  const duration = customDuration > 0 ? customDuration : (type === 'error' ? 4800 : 3400);

  const item = document.createElement('div');
  item.className = `toast-item toast-${type}`;

  const icon = document.createElement('div');
  icon.className = 'toast-icon-box';
  icon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${TOAST_ICONS[type]}</svg>`;

  const body = document.createElement('div');
  body.className = 'toast-text';
  body.textContent = text;

  const progress = document.createElement('div');
  progress.className = 'toast-progress';
  progress.style.animationDuration = `${duration}ms`;

  item.append(icon, body, progress);
  container.appendChild(item);
  SoundEngine.playCopy();

  // Keep the stack short
  while (container.children.length > 4) container.firstChild.remove();

  setTimeout(() => {
    item.classList.add('is-leaving');
    setTimeout(() => item.remove(), 250);
  }, duration);
}

// ----------------------------------------------------------
// GFX Log Console
// ----------------------------------------------------------
function inferLogKind(tag) {
  const tg = String(tag).toUpperCase();
  if (['SUCCESS', 'CONNECTED', 'OK', 'APPLIED'].includes(tg)) return 'ok';
  if (['ERROR', 'FAIL', 'FAILED'].includes(tg)) return 'err';
  if (['WAIT', 'BOOT', 'KILL', 'WARN'].includes(tg)) return 'warn';
  if (tg === 'GAME') return 'game';
  return 'info';
}

function appendGfxLog(tag, text, kind) {
  const consoleEl = document.getElementById('gfx-log-console');
  if (!consoleEl) return;

  const d = new Date();
  const time = [d.getHours(), d.getMinutes(), d.getSeconds()].map(n => String(n).padStart(2, '0')).join(':');

  const entry = document.createElement('div');
  entry.className = `log-line is-${kind || inferLogKind(tag)}`;

  const timeEl = document.createElement('span');
  timeEl.className = 'log-time';
  timeEl.textContent = time;

  const tagEl = document.createElement('span');
  tagEl.className = 'log-tag';
  tagEl.textContent = `[${tag}]`;

  const textEl = document.createElement('span');
  textEl.className = 'log-text';
  textEl.dir = 'auto';
  textEl.textContent = text;

  entry.append(timeEl, tagEl, textEl);
  consoleEl.appendChild(entry);

  // Cap history
  while (consoleEl.children.length > 200) consoleEl.firstChild.remove();
  consoleEl.scrollTop = consoleEl.scrollHeight;
}

// ----------------------------------------------------------
// License login
// The native backend owns the real lock: it ignores every tool action until the
// license server has accepted a key. This screen only mirrors that state.
// ----------------------------------------------------------
const Auth = {
  state: 'locked',    // locked | checking | success | authed
  automatic: false,
  unlocked: false,
  started: false,
  error: null,        // { code, message, automatic }
  canUpdate: false,
  license: null       // { key, subscription, expiry }
};

const KEY_PATTERN = /^[A-Za-z0-9_-]{4,128}$/;

function translateServerMessage(message) {
  const s = String(message || '').toLowerCase();
  if (!s || s.includes('invalid') || s.includes('not found') || s.includes('does not exist') || s.includes("doesn't exist")) return t('auth.err.invalid');
  if (s.includes('expired')) return t('auth.err.expired');
  if (s.includes('banned') || s.includes('blacklist')) return t('auth.err.banned');
  if (s.includes('hwid')) return t('auth.err.hwid');
  if (s.includes('paused')) return t('auth.err.paused');
  return t('auth.err.generic', { msg: message });
}

function authErrorText(error) {
  const text = {
    empty: () => t('auth.err.empty'),
    format: () => t('auth.err.format'),
    network: () => t('auth.err.network'),
    server: () => t('auth.err.server'),
    signature: () => t('auth.err.signature'),
    version: () => t('auth.err.version'),
    clipboard: () => t('auth.pasteFailed'),
    rejected: () => translateServerMessage(error.message)
  }[error.code];
  const body = text ? text() : t('auth.err.server');
  return error.automatic ? `${t('auth.err.autoFailed')} ${body}` : body;
}

function renderAuth() {
  const screen = document.getElementById('auth-screen');
  if (!screen) return;
  screen.dataset.state = Auth.state;

  const busy = ['checking', 'success', 'authed'].includes(Auth.state);
  ['auth-key', 'auth-paste', 'auth-remember', 'auth-submit'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.disabled = busy;
  });

  const label = document.getElementById('auth-submit-label');
  if (label) {
    label.textContent = Auth.state === 'checking' ? t('auth.checking')
      : Auth.state === 'success' || Auth.state === 'authed' ? t('auth.success')
        : t('auth.login');
  }

  const box = document.getElementById('auth-message');
  const boxText = document.getElementById('auth-message-text');
  if (box && boxText) {
    let kind = '';
    let text = '';
    if (Auth.error) {
      kind = 'error';
      text = authErrorText(Auth.error);
    } else if (Auth.state === 'checking' && Auth.automatic) {
      kind = 'info';
      text = t('auth.autoChecking');
    } else if (Auth.state === 'success') {
      kind = 'success';
      text = t('auth.welcome');
    }
    box.hidden = !text;
    box.dataset.kind = kind;
    boxText.textContent = text;
  }

  const update = document.getElementById('auth-update');
  if (update) update.hidden = !Auth.canUpdate;
}

function shakeAuthPanel() {
  const panel = document.querySelector('.auth-panel');
  if (!panel) return;
  panel.classList.remove('is-shaking');
  void panel.offsetWidth; // restart the animation
  panel.classList.add('is-shaking');
}

function focusAuthInput() {
  const input = document.getElementById('auth-key');
  if (input && !input.disabled) setTimeout(() => input.focus(), 60);
}

function handleAuthState(msg) {
  if (msg.state === 'logged_out') {
    window.location.reload();
    return;
  }
  if (Auth.unlocked) return;

  if (msg.state === 'checking') {
    Auth.state = 'checking';
    Auth.automatic = !!msg.automatic;
    Auth.error = null;
    Auth.canUpdate = false;
  } else {
    Auth.state = 'locked';
  }
  renderAuth();
  if (Auth.state === 'locked') focusAuthInput();
}

function handleAuthResult(msg) {
  clearTimeout(Auth.checkTimeout);
  if (msg.ok) {
    Auth.license = { key: msg.key || '', subscription: msg.subscription || '', expiry: Number(msg.expiry) || 0 };
    Auth.error = null;
    Auth.canUpdate = false;
    renderLicense();
    if (Auth.unlocked) return;
    Auth.state = 'success';
    renderAuth();
    setTimeout(unlockApp, 700);
    return;
  }

  Auth.state = 'locked';
  Auth.error = { code: msg.code || 'server', message: msg.message || '', automatic: !!msg.automatic };
  Auth.canUpdate = !!msg.canUpdate;
  const input = document.getElementById('auth-key');
  if (input && msg.automatic && msg.key) input.value = msg.key;
  renderAuth();
  shakeAuthPanel();
  focusAuthInput();

  if (msg.code === 'version') {
    ensureAuthUpdateBox();
    handleUpdateProgress({ status: 'downloading', percent: 0, downloaded: 0, total: 0 });
  }
}

function ensureAuthUpdateBox() {
  let box = document.getElementById('auth-update-box');
  if (box) return box;

  const form = document.getElementById('auth-form');
  if (!form) return null;

  box = document.createElement('div');
  box.className = 'auth-update-box';
  box.id = 'auth-update-box';
  box.innerHTML = `
    <div class="auth-update-header">
      <div class="auth-update-icon-wrapper">
        <svg class="auth-update-spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
        </svg>
        <svg class="auth-update-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="7 10 12 15 17 10"></polyline>
          <line x1="12" y1="15" x2="12" y2="3"></line>
        </svg>
      </div>
      <div class="auth-update-info">
        <h4 class="auth-update-title" id="auth-update-title">${t('auth.updateTitle')}</h4>
        <p class="auth-update-status" id="auth-update-status">${t('auth.updateDownloading')}</p>
      </div>
    </div>
    <div class="auth-update-progress-bar">
      <div class="auth-update-progress-fill" id="auth-update-progress-fill" style="width: 0%;"></div>
    </div>
    <div class="auth-update-meta">
      <span class="auth-update-size" id="auth-update-size">0 MB / 0 MB</span>
      <span class="auth-update-percent" id="auth-update-percent">0%</span>
    </div>
    <div class="auth-update-actions" id="auth-update-actions" hidden>
      <button type="button" class="btn-update-retry" id="btn-update-retry">${t('auth.updateRetry')}</button>
      <button type="button" class="btn-update-browser" id="btn-update-browser">${t('auth.updateManual')}</button>
    </div>
  `;
  form.appendChild(box);

  document.getElementById('btn-update-retry')?.addEventListener('click', () => {
    sendAction('auth_retry_update');
    handleUpdateProgress({ status: 'downloading', percent: 0, downloaded: 0, total: 0 });
  });

  document.getElementById('btn-update-browser')?.addEventListener('click', () => {
    sendAction('auth_open_download');
  });

  return box;
}

function handleUpdateProgress(msg) {
  const box = ensureAuthUpdateBox();
  if (!box) return;

  box.hidden = false;

  // Lock auth controls
  ['auth-key', 'auth-paste', 'auth-remember', 'auth-submit', 'auth-update'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.disabled = true;
      if (id === 'auth-update' || id === 'auth-submit') el.hidden = true;
    }
  });

  const fill = document.getElementById('auth-update-progress-fill');
  const percentText = document.getElementById('auth-update-percent');
  const sizeText = document.getElementById('auth-update-size');
  const statusText = document.getElementById('auth-update-status');
  const titleText = document.getElementById('auth-update-title');
  const actions = document.getElementById('auth-update-actions');
  const spinner = box.querySelector('.auth-update-spinner');

  if (titleText) titleText.textContent = t('auth.updateTitle');

  if (msg.status === 'downloading') {
    if (actions) actions.hidden = true;
    if (spinner) spinner.style.display = '';

    const percent = Math.max(0, Math.min(100, Number(msg.percent) || 0));
    if (fill) fill.style.width = percent + '%';
    if (percentText) percentText.textContent = percent + '%';

    const downloadedMB = ((Number(msg.downloaded) || 0) / (1024 * 1024)).toFixed(1);
    const totalMB = ((Number(msg.total) || 0) / (1024 * 1024)).toFixed(1);
    if (sizeText) {
      sizeText.textContent = (Number(msg.total) > 0)
        ? `${downloadedMB} MB / ${totalMB} MB`
        : `${downloadedMB} MB`;
    }

    if (statusText) statusText.textContent = t('auth.updateDownloading');
  } else if (msg.status === 'installing') {
    if (actions) actions.hidden = true;
    if (spinner) spinner.style.display = '';
    if (fill) fill.style.width = '100%';
    if (percentText) percentText.textContent = '100%';
    if (statusText) statusText.textContent = t('auth.updateInstalling');
  } else if (msg.status === 'error') {
    if (spinner) spinner.style.display = 'none';
    if (actions) actions.hidden = false;
    if (statusText) statusText.textContent = msg.message || t('auth.updateFailed');
    showToast(msg.message || t('auth.updateFailed'), 'error');
  }
}

function unlockApp() {
  if (Auth.unlocked) return;
  Auth.unlocked = true;
  Auth.state = 'authed';

  const screen = document.getElementById('auth-screen');
  document.body.classList.remove('is-locked');
  document.body.classList.add('is-unlocking');
  if (screen) {
    screen.classList.add('is-leaving');
    setTimeout(() => {
      screen.hidden = true;
      document.body.classList.remove('is-unlocking');
    }, 650);
  }

  startApp();
  applyLicenseLevelPermissions();
  showToast(t('auth.welcome'), 'success');
}

// Initial sync + telemetry polling, only once the license is verified
function startApp() {
  if (Auth.started) return;
  Auth.started = true;

  sendAction('get_pc_check');
  sendAction('get_system_info');
  sendAction('get_gameloop_config');
  sendAction('get_tweaks_status');
  sendAction('get_resolution');
  sendAction('get_display_info');
  setTimeout(() => sendAction('get_system_info'), 1200);
  setInterval(() => sendAction('get_system_info'), 3500);

  // Check and ensure GameLoop ADB settings on startup:
  // In Easy Mode: enables ADB if disabled, then launches emulator/game.
  // In Advanced Mode: enables ADB if disabled, does NOT launch emulator.
  setTimeout(() => {
    sendAction('startup_check_adb', { isEasyMode: EasyModeState.enabled ? 1 : 0 });
  }, 500);
}

function licenseRemainingText(lic) {
  if (!lic || !lic.expiry) return t('license.active');
  const days = Math.ceil((lic.expiry * 1000 - Date.now()) / 86400000);
  if (days > 3650) return t('license.lifetime');
  if (days <= 0) return t('license.today');
  if (days === 1) return t('license.day1');
  if (days === 2) return t('license.day2');
  if (days <= 10) return t('license.daysFew', { n: days });
  return t('license.daysMany', { n: days });
}

function isLevel2License() {
  const sub = (Auth.license && Auth.license.subscription ? String(Auth.license.subscription) : '').trim().toLowerCase();
  return sub === '2';
}

function applyLicenseLevelPermissions() {
  const isL2 = isLevel2License();
  document.body.classList.toggle('license-level-2', isL2);
  document.body.classList.toggle('license-level-1', !isL2);

  const modskinTabBtn = document.querySelector('.menu-tab[data-tab="modskin"]');
  if (modskinTabBtn) {
    if (isL2) {
      modskinTabBtn.style.display = 'none';
      modskinTabBtn.hidden = true;
    } else if (!EasyModeState.enabled) {
      modskinTabBtn.style.display = '';
      modskinTabBtn.hidden = false;
    }
  }

  const memoryTabBtn = document.querySelector('.menu-tab[data-tab="memory"]');
  if (memoryTabBtn) {
    if (isL2) {
      memoryTabBtn.style.display = 'none';
      memoryTabBtn.hidden = true;
    } else if (!EasyModeState.enabled) {
      memoryTabBtn.style.display = '';
      memoryTabBtn.hidden = false;
    }
  }

  const modskinTile = document.querySelector('.tool-tile[data-tab="modskin"]');
  if (modskinTile) {
    modskinTile.style.display = isL2 ? 'none' : '';
    modskinTile.hidden = isL2;
  }

  const memoryTile = document.querySelector('.tool-tile[data-tab="memory"]');
  if (memoryTile) {
    memoryTile.style.display = isL2 ? 'none' : '';
    memoryTile.hidden = isL2;
  }

  const easyModskinBtn = document.getElementById('btn-easy-modskin');
  if (easyModskinBtn) {
    easyModskinBtn.style.display = isL2 ? 'none' : '';
    easyModskinBtn.hidden = isL2;
  }

  const easyMemoryBtn = document.getElementById('btn-easy-memory');
  if (easyMemoryBtn) {
    easyMemoryBtn.style.display = isL2 ? 'none' : '';
    easyMemoryBtn.hidden = isL2;
  }

  if (isL2 && currentTab === 'modskin') {
    switchTab('home', true);
    showToast(t('auth.err.level2Modskin'), 'error');
  }

  if (isL2 && currentTab === 'memory') {
    switchTab('home', true);
    showToast(t('auth.err.level2Memory'), 'error');
  }

  const tierBadge = document.getElementById('license-tier-badge');
  if (tierBadge) {
    if (isL2) {
      tierBadge.textContent = 'Level 2';
      tierBadge.className = 'license-badge license-badge-l2';
      tierBadge.title = t('license.level2');
    } else if (Auth.license) {
      const sub = (Auth.license.subscription || 'default').trim();
      tierBadge.textContent = (sub === 'default' || !sub) ? 'Level 1' : sub;
      tierBadge.className = 'license-badge license-badge-l1';
      tierBadge.title = t('license.level1');
    }
  }
}

function renderLicense() {
  const lic = Auth.license;
  const text = lic ? licenseRemainingText(lic) : '--';
  let tip = '';
  if (lic) {
    const parts = [];
    if (lic.key) parts.push(lic.key);
    const isL2 = isLevel2License();
    parts.push(isL2 ? t('license.level2') : t('license.level1'));
    if (lic.expiry && lic.expiry * 1000 - Date.now() < 3650 * 86400000) {
      const date = new Date(lic.expiry * 1000).toLocaleDateString(Lang.locale(), { year: 'numeric', month: 'long', day: 'numeric' });
      parts.push(t('license.expiresOn', { date }));
    }
    tip = parts.join(' · ');
  }

  ['license-expiry', 'hero-license-value'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = text;
    el.title = tip;
  });

  applyLicenseLevelPermissions();
}

// ----------------------------------------------------------
// ADB Bridge State
// The UI never decides on its own that the bridge is connected:
// it only mirrors "adb_status" events from the native backend, which
// verifies the transport state AND Android boot completion first.
// ----------------------------------------------------------
const BRIDGE_DOT = { offline: 'offline', launching: 'busy', connecting: 'busy', booting: 'busy', connected: 'ok', error: 'error' };

const Bridge = {
  state: 'offline',
  serial: '',
  message: '',
  messageKey: 'bridge.msg.default',
  emulatorRunning: null,
  failedStep: 'emulator',
  attempt: 0,
  maxAttempts: 30,
  lastLogged: '',
  readingGame: false
};

const BUSY_STATES = ['launching', 'connecting', 'booting'];

function setBridgeState(state, serial, message, messageKey) {
  if (!BRIDGE_DOT[state]) state = 'offline';
  const prev = Bridge.state;

  if (state === 'error') {
    Bridge.failedStep = prev === 'booting' ? 'boot' : prev === 'connecting' ? 'transport' : 'emulator';
  }
  if (state === 'offline') Bridge.attempt = 0;

  Bridge.state = state;
  Bridge.serial = (state === 'connected' || state === 'booting') ? (serial || Bridge.serial) : '';
  if (messageKey) {
    Bridge.messageKey = messageKey;
    Bridge.message = '';
  } else if (message) {
    Bridge.message = message;
    Bridge.messageKey = '';
  }
  renderBridge();
}

function computeBridgeSteps() {
  const emu = Bridge.emulatorRunning;
  switch (Bridge.state) {
    case 'connected': return { emulator: 'done', transport: 'done', boot: 'done' };
    case 'booting': return { emulator: 'done', transport: 'done', boot: 'active' };
    case 'connecting': return { emulator: 'done', transport: 'active', boot: 'pending' };
    case 'launching': return { emulator: 'active', transport: 'pending', boot: 'pending' };
    case 'error': {
      const failed = emu === false ? 'emulator' : Bridge.failedStep;
      const steps = { emulator: emu ? 'done' : 'pending', transport: 'pending', boot: 'pending' };
      if (failed !== 'emulator') steps.emulator = 'done';
      if (failed === 'boot') steps.transport = 'done';
      steps[failed] = 'fail';
      return steps;
    }
    default:
      return { emulator: emu ? 'done' : 'pending', transport: 'pending', boot: 'pending' };
  }
}

function renderBridge() {
  const state = Bridge.state;

  const card = document.getElementById('bridge-card');
  if (card) card.dataset.state = state;

  const label = document.getElementById('bridge-state-label');
  if (label) label.textContent = t(`bridge.${state}.label`);

  const msg = document.getElementById('bridge-state-msg');
  if (msg) {
    msg.textContent = Bridge.messageKey ? t(Bridge.messageKey) : Bridge.message;
    msg.dir = 'auto';
  }

  const serialEl = document.getElementById('bridge-serial');
  if (serialEl) {
    serialEl.textContent = Bridge.serial;
    serialEl.hidden = !Bridge.serial;
  }

  // Verification steps
  const steps = computeBridgeSteps();
  Object.entries({ emulator: 'step-emulator', transport: 'step-transport', boot: 'step-boot' }).forEach(([key, id]) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('is-done', 'is-active', 'is-fail');
    if (steps[key] !== 'pending') el.classList.add(`is-${steps[key]}`);
  });

  const emuSub = document.getElementById('step-emulator-sub');
  if (emuSub) {
    emuSub.textContent = state === 'launching'
      ? t('bridge.emu.starting')
      : Bridge.emulatorRunning === true
        ? t('bridge.emu.detected')
        : Bridge.emulatorRunning === false
          ? t('bridge.emu.notRunning')
          : t('bridge.emu.checking');
  }

  const transportSub = document.getElementById('step-transport-sub');
  if (transportSub) {
    transportSub.textContent = Bridge.serial
      ? t('bridge.transport.serial', { serial: Bridge.serial })
      : t('bridge.transport.default');
  }

  // Attempt meter
  const busy = BUSY_STATES.includes(state);
  const meter = document.getElementById('attempt-meter');
  if (meter) meter.hidden = !(busy || (state === 'error' && Bridge.attempt > 0));
  const count = document.getElementById('attempt-count');
  if (count) count.textContent = `${Bridge.attempt} / ${Bridge.maxAttempts}`;
  const fill = document.getElementById('attempt-fill');
  if (fill) fill.style.width = `${Math.min(100, (Bridge.attempt / Bridge.maxAttempts) * 100)}%`;

  // Buttons
  const btnConnect = document.getElementById('btn-connect-gameloop');
  const btnConnectLabel = document.getElementById('btn-connect-label');
  if (btnConnect) {
    btnConnect.disabled = busy;
    btnConnect.classList.toggle('is-busy', busy);
  }
  if (btnConnectLabel) {
    btnConnectLabel.textContent = busy
      ? (state === 'launching' ? t('bridge.btn.starting') : t('bridge.btn.connecting'))
      : state === 'connected'
        ? t('bridge.btn.reverify')
        : Bridge.emulatorRunning ? t('bridge.btn.connect') : t('bridge.btn.launch');
  }

  const btnApply = document.getElementById('btn-apply-gfx');
  if (btnApply) {
    btnApply.disabled = state !== 'connected';
    btnApply.title = state === 'connected' ? '' : t('bridge.connectFirst');
  }

  const btnResetGuest = document.getElementById('btn-reset-guest');
  if (btnResetGuest) {
    btnResetGuest.disabled = false;
    btnResetGuest.title = '';
  }

  renderBoost();
  if (typeof renderPaks === 'function' && typeof PaksState !== 'undefined') renderPaks();

  const btnRead = document.getElementById('btn-read-game');
  if (btnRead) {
    btnRead.disabled = state !== 'connected' || Bridge.readingGame;
    btnRead.classList.toggle('is-busy', Bridge.readingGame);
    btnRead.title = state === 'connected' ? t('bridge.readTitle') : t('bridge.connectFirst');
  }

  // Header chip
  const chip = document.getElementById('header-bridge-chip');
  const chipText = document.getElementById('header-bridge-text');
  if (chip) chip.dataset.state = state;
  if (chipText) chipText.textContent = t(`bridge.${state}.chip`);

  // Sidebar + dashboard status
  const emuKnown = Bridge.emulatorRunning !== null;
  const emuText = Bridge.emulatorRunning ? t('side.running') : t('side.notRunning');
  const emuDot = Bridge.emulatorRunning ? 'ok' : 'offline';

  [['sidebar-adb-dot', 'sidebar-adb-status'], ['hero-adb-dot', 'hero-adb-value']].forEach(([dotId, textId]) => {
    const dot = document.getElementById(dotId);
    const text = document.getElementById(textId);
    if (dot) dot.dataset.state = BRIDGE_DOT[state];
    if (text) text.textContent = t(`bridge.${state}.side`);
  });

  [['sidebar-emu-dot', 'sidebar-telemetry'], ['hero-emu-dot', 'hero-emu-value']].forEach(([dotId, textId]) => {
    const dot = document.getElementById(dotId);
    const text = document.getElementById(textId);
    if (dot) dot.dataset.state = emuDot;
    if (text && emuKnown) text.textContent = emuText;
  });

  const easyConnectStatus = document.getElementById('easy-connect-status');
  if (easyConnectStatus) {
    easyConnectStatus.textContent = t(`bridge.${state}.side`) || state;
    easyConnectStatus.dataset.state = state;
  }
}

function handleAdbStatus(msg) {
  const state = msg.state || 'offline';
  const message = msg.message || '';
  if (typeof msg.attempt === 'number') Bridge.attempt = msg.attempt;
  if (msg.maxAttempts) Bridge.maxAttempts = msg.maxAttempts;
  if (state === 'launching' && Bridge.emulatorRunning === false) Bridge.emulatorRunning = null;
  if (state === 'connecting' || state === 'booting' || state === 'connected') Bridge.emulatorRunning = true;
  setBridgeState(state, msg.serial || '', message);

  // Log each distinct step once instead of every poll
  if (message && message !== Bridge.lastLogged) {
    Bridge.lastLogged = message;
    const tag = { connected: 'CONNECTED', error: 'ERROR', booting: 'BOOT', launching: 'LAUNCH', connecting: 'ADB', offline: 'ADB' }[state] || 'ADB';
    appendGfxLog(tag, message);
  }

  if (state === 'connected' && !(msg.attempt > 0)) {
    // Bridge restored after a fast Paks transfer - not a new connection
    renderBridge();
  } else if (state === 'connected') {
    if (document.getElementById('tab-paks')?.classList.contains('active')) setTimeout(requestPaksInfo, 300);
    Bridge.readingGame = true;
    renderBridge();
    showToast(t('bridge.verifiedOn', { serial: msg.serial || 'GameLoop' }), 'success');
  } else if (state === 'error') {
    showToast(message || t('bridge.failed'), 'error');
  }
}

// ----------------------------------------------------------
// In-game graphics (read from PUBG's Active.sav by the backend)
// Raw save values -> chip values of the GFX panel.
// ----------------------------------------------------------
const GAME_QUALITY = {
  1: { chip: 2, key: 'q.smooth' },
  2: { chip: 3, key: 'q.balanced' },
  3: { chip: 4, label: 'HD' },
  4: { chip: 5, label: 'HDR' },
  5: { chip: 6, key: 'q.ultraHd' }
};
const GAME_FPS = {
  2: { label: '20 FPS' },
  3: { label: '25 FPS' },
  4: { chip: 1, label: '30 FPS' },
  5: { chip: 2, label: '40 FPS' },
  6: { chip: 3, label: '60 FPS' },
  7: { chip: 4, label: '90 FPS' },
  8: { chip: 5, label: '120 FPS' }
};
const GAME_STYLE = {
  1: { chip: 1, key: 'st.classic' },
  2: { chip: 2, key: 'st.colorful' },
  3: { chip: 3, key: 'st.realistic' },
  4: { chip: 4, key: 'st.soft' },
  5: { chip: 5, key: 'st.movie' }
};
const GAME_GROUPS = [
  ['#grp-gfx-quality', GAME_QUALITY, 'quality', 'game.quality'],
  ['#grp-gfx-fps', GAME_FPS, 'fps', 'game.fps'],
  ['#grp-gfx-style', GAME_STYLE, 'style', 'game.style']
];

const entryLabel = entry => entry.key ? t(entry.key) : entry.label;
const versionName = version => [1, 2, 3, 4, 5].includes(Number(version)) ? t(`ver.${version}`) : '';

const GameSync = { last: null };

function gameDisplayName(msg) {
  return `${versionName(msg.version) || msg.package}${msg.gameVersion ? ' ' + msg.gameVersion : ''}`;
}

function markInGame(groupSelector, value) {
  const group = document.querySelector(groupSelector);
  if (!group) return;
  group.querySelectorAll('.chip-item').forEach(c => {
    const match = value !== null && c.dataset.val === String(value);
    c.classList.toggle('in-game', match);
    if (match) c.title = t('game.currentSetting');
    else c.removeAttribute('title');
  });
}

// Labels of the in-game values + the ones that have no matching chip
function gameSummary(msg) {
  const parts = [];
  const unknown = [];
  GAME_GROUPS.forEach(([, map, field, nameKey]) => {
    const raw = msg[field];
    if (typeof raw !== 'number' || raw < 0) return;
    const entry = map[raw];
    if (entry && entry.chip) {
      parts.push(entryLabel(entry));
    } else {
      const name = t(nameKey);
      parts.push(entry ? entryLabel(entry) : `${name} #${raw}`);
      unknown.push(t('game.unknownValue', { name, raw, label: entry ? ` (${entryLabel(entry)})` : '' }));
    }
  });
  return { parts, unknown };
}

function renderGameSync() {
  const banner = document.getElementById('game-sync-banner');
  const bannerText = document.getElementById('game-sync-text');
  const msg = GameSync.last;
  if (!msg) {
    if (banner) banner.hidden = true;
    return;
  }

  markInGame('#grp-gfx-version', msg.version);
  GAME_GROUPS.forEach(([group, map, field]) => {
    const raw = msg[field];
    const entry = typeof raw === 'number' && raw >= 0 ? map[raw] : null;
    markInGame(group, entry && entry.chip ? entry.chip : null);
  });

  if (bannerText) bannerText.textContent = t('game.synced', { game: gameDisplayName(msg), summary: gameSummary(msg).parts.join(' · ') });
  if (banner) banner.hidden = false;
}

function handleGameGraphics(msg) {
  Bridge.readingGame = false;
  renderBridge();

  if (msg.status === 'error') {
    showToast(msg.message || t('game.readFail'), 'error');
    appendGfxLog('ERROR', msg.message || t('game.readFail'));
    return;
  }

  if (!msg.version) {
    GameSync.last = null;
    renderGameSync();
    appendGfxLog('GAME', t('game.notInstalledLog'), 'warn');
    showToast(t('game.notInstalled'), 'info');
    return;
  }

  const gameName = gameDisplayName(msg);
  selectChipOption('#grp-gfx-version', msg.version);

  if (!msg.fileRead) {
    GameSync.last = null;
    renderGameSync();
    markInGame('#grp-gfx-version', msg.version);
    appendGfxLog('GAME', t('game.noSaveLog', { game: gameName }), 'warn');
    showToast(t('game.noSave', { game: gameName }), 'info');
    return;
  }

  GAME_GROUPS.forEach(([group, map, field]) => {
    const entry = typeof msg[field] === 'number' ? map[msg[field]] : null;
    if (entry && entry.chip) selectChipOption(group, entry.chip);
  });

  GameSync.last = msg;
  renderGameSync();

  const { parts, unknown } = gameSummary(msg);
  const summary = parts.join(' · ');
  appendGfxLog('GAME', `${t('game.log', { game: gameName, summary })} [raw q=${msg.quality}, fps=${msg.fps}, style=${msg.style}]`);
  unknown.forEach(u => appendGfxLog('GAME', u, 'warn'));
  showToast(t('game.loaded', { summary }), 'success');
}

// ----------------------------------------------------------
// RAM Gauge + hardware cards
// ----------------------------------------------------------
const GAUGE_CIRCUMFERENCE = 364.42; // 2 * PI * r(58)

function setRamGauge(percent) {
  const p = Math.min(100, Math.max(0, percent));
  const bar = document.getElementById('ram-gauge-bar');
  const gauge = document.getElementById('ram-gauge');
  const valueEl = document.getElementById('home-ram-percent');
  const fillEl = document.getElementById('ram-progress-fill');

  if (bar) bar.style.strokeDashoffset = String(GAUGE_CIRCUMFERENCE * (1 - p / 100));
  if (gauge) gauge.classList.toggle('is-high', p >= 85);
  if (valueEl) valueEl.textContent = `${p}%`;
  if (fillEl) fillEl.style.width = `${p}%`;
}

const SysInfo = { last: null };

function renderSystemInfo() {
  const msg = SysInfo.last;
  if (!msg) return;

  const setSpec = (id, value) => {
    const el = document.getElementById(id);
    if (el && value) {
      el.textContent = value;
      el.title = value;
    }
  };
  setSpec('spec-cpu', msg.cpu);
  setSpec('spec-gpu', msg.gpu);
  setSpec('spec-ram', msg.ram);
  setSpec('spec-os', msg.os);

  const detail = document.getElementById('home-ram-detail');
  if (detail && msg.ram) detail.textContent = String(msg.ram).replace(/\s*\(\d+%\)\s*$/, '');

  if (msg.ramPercent !== undefined) {
    setRamGauge(parseInt(msg.ramPercent, 10) || 0);
  }
}

// ----------------------------------------------------------
// Copy Code to Clipboard
// ----------------------------------------------------------
function copyScopeCode(inputId, code) {
  SoundEngine.playClick();

  const doCopySuccess = () => {
    showToast(t('sc.toast', { code }));

    const inputEl = document.getElementById(inputId);
    const card = inputEl && inputEl.closest('.scope-card');
    const btn = card && card.querySelector('.btn-copy-code');
    const label = btn && btn.querySelector('span');
    if (btn && label) {
      label.textContent = t('sc.copied');
      btn.classList.add('is-copied');
      setTimeout(() => {
        label.textContent = t('sc.copy');
        btn.classList.remove('is-copied');
      }, 1800);
    }
  };

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(code).then(doCopySuccess).catch(() => {
      fallbackCopy(inputId, doCopySuccess);
    });
  } else {
    fallbackCopy(inputId, doCopySuccess);
  }
}

function fallbackCopy(inputId, callback) {
  const input = document.getElementById(inputId);
  if (!input) return;
  input.select();
  input.setSelectionRange(0, 99999);
  try {
    document.execCommand('copy');
    callback();
  } catch (err) {
    showToast(t('sc.copyFail'), 'error');
  }
}

// ----------------------------------------------------------
// IPC Bridge to the C++ Backend
// ----------------------------------------------------------
function sendAction(action, data = {}) {
  const payload = { action, ...data };
  if (IS_NATIVE) {
    window.chrome.webview.postMessage(JSON.stringify(payload));
    return;
  }

  // Browser preview: no native backend, so never pretend hardware actions succeeded
  console.log("[IPC Preview] Send:", payload);
  setTimeout(() => {
    if (action === 'auth_status') {
      handleNativeMessage({ action: 'auth_state', state: 'locked' });
    } else if (action === 'auth_login') {
      handleNativeMessage({ action: 'auth_state', state: 'checking', automatic: false });
      setTimeout(() => {
        handleNativeMessage(/^demo/i.test(payload.key)
          ? { action: 'auth_result', ok: true, key: 'DEMO••••••' + payload.key.slice(-4), subscription: 'default', expiry: Math.floor(Date.now() / 1000) + 30 * 86400 }
          : { action: 'auth_result', ok: false, code: 'rejected', message: 'Invalid license key', automatic: false });
      }, 900);
    } else if (action === 'auth_logout') {
      handleNativeMessage({ action: 'auth_state', state: 'logged_out' });
    } else if (action === 'get_system_info') {
      handleNativeMessage({
        type: 'system_info',
        cpu: 'Intel Core i7-12700F @ 2.10 GHz',
        gpu: 'NVIDIA GeForce RTX 3060',
        ram: '6.1 GB / 16.0 GB (38%)',
        ramPercent: 38,
        os: 'Windows 11 Pro 64-bit',
        emulatorRunning: false,
        adbConnected: false
      });
    } else if (action === 'get_gameloop_config') {
      // nothing to sync in preview
    } else if (action === 'get_tweaks_status') {
      const ids = [...document.querySelectorAll('input[data-tweak-toggle]')].map(i => i.dataset.tweakToggle);
      handleNativeMessage({ action: 'tweaks_status', elevated: true, tweaks: Object.fromEntries(ids.map(id => [id, { applied: false, available: true, needsAdmin: false }])) });
    } else if (action === 'get_pc_check') {
      handleNativeMessage({ action: 'pc_check', hypervisor: false, memoryIntegrity: false, vtFirmware: true, powerPlan: 'Balanced', highPerfAvailable: true, highPerfActive: false });
    } else if (action === 'get_paks_info') {
      handleNativeMessage({ action: 'paks_info', connected: false, busy: false, folder: 'Paks', games: [] });
    } else if (action === 'get_resolution') {
      handleNativeMessage({ action: 'resolution_info', width: 1680, height: 1050, dpi: 480, emulatorRunning: false, saved: [] });
    } else if (action === 'get_display_info') {
      handleNativeMessage({
        action: 'display_info',
        currentWidth: 1920,
        currentHeight: 1080,
        currentHz: 144,
        nativeWidth: 1920,
        nativeHeight: 1080,
        nativeHz: 144,
        supportedHz: [59, 60, 72, 75, 120, 144, 165, 180, 200, 240, 360]
      });
    } else if (action === 'set_display_res') {
      handleNativeMessage({
        action: 'display_result',
        ok: true,
        width: payload.width,
        height: payload.height,
        hz: payload.hz,
        synced: !!payload.syncGameloop,
        message: payload.syncGameloop
          ? t('dres.appliedSyncSuccess', { w: payload.width, h: payload.height, hz: payload.hz })
          : t('dres.appliedSuccess', { w: payload.width, h: payload.height, hz: payload.hz })
      });
    } else if (action === 'restore_display_res') {
      handleNativeMessage({
        action: 'display_restore_result',
        ok: true,
        message: t('dres.restoredSuccess')
      });
    } else if (action === 'connect_gameloop') {
      handleNativeMessage({
        action: 'adb_status',
        state: 'error',
        message: 'Preview mode: the ADB bridge only works inside the CyperOpt app.'
      });
    } else if (action === 'apply_gfx') {
      handleNativeMessage({ action: 'apply_gfx', status: 'error', message: 'Preview mode: connect to GameLoop inside the app first.' });
    } else if (action === 'reset_guest') {
      handleNativeMessage({ action: 'reset_guest', status: 'success', message: 'Preview mode: Reset Guest simulated for Global (com.tencent.ig).' });
    } else if (action === 'fix_twitter_apply') {
      handleNativeMessage({ action: 'twitter_status', status: 'error', message: 'Preview mode: run inside CyperOpt app to apply fix.' });
    } else if (action === 'fix_twitter_restore') {
      handleNativeMessage({ action: 'twitter_status', status: 'error', message: 'Preview mode: run inside CyperOpt app to restore files.' });
    } else {
      handleNativeMessage({ action, status: 'info', message: `Preview mode: "${action}" runs only inside the app.` });
    }
  }, 250);
}

function toastTypeFor(msg) {
  if (msg.status === 'error') return 'error';
  if (msg.status === 'info') return 'info';
  return 'success';
}

// Handle Incoming IPC Messages from Native C++
function handleNativeMessage(data) {
  try {
    const msg = typeof data === 'string' ? JSON.parse(data) : data;
    if (!msg) return;

    const action = msg.action || msg.type;

    if (action === 'auth_state') {
      handleAuthState(msg);
      return;
    }
    if (action === 'auth_result') {
      handleAuthResult(msg);
      return;
    }
    if (action === 'update_progress') {
      handleUpdateProgress(msg);
      return;
    }
    if (!Auth.unlocked) return;

    if (action === 'system_info') {
      SysInfo.last = msg;
      renderSystemInfo();

      if (typeof msg.emulatorRunning === 'boolean') {
        Bridge.emulatorRunning = msg.emulatorRunning;
      }
      // Backend flag is the source of truth for an established bridge
      if (msg.adbConnected === false && Bridge.state === 'connected') {
        setBridgeState('offline', '', '', 'bridge.msg.disconnected');
      } else if (msg.adbConnected === true && Bridge.state !== 'connected') {
        setBridgeState('connected', '', '', 'bridge.msg.verified');
      }
      renderBridge();
    } else if (action === 'gameloop_config') {
      if (msg.apiMode !== undefined) selectChipOption('#grp-render-api', msg.apiMode);
      if (msg.resolution !== undefined) selectChipOption('#grp-game-res', msg.resolution);
      if (msg.quality !== undefined) selectChipOption('#grp-gl-quality', msg.quality);
      if (msg.fps !== undefined) selectChipOption('#grp-gl-fps', msg.fps);

      if (msg.activeHooks && Array.isArray(msg.activeHooks)) {
        [301, 302, 303, 304, 307, 308].forEach(id => {
          const chk = document.getElementById(`chk-${id}`);
          if (chk) chk.checked = msg.activeHooks.includes(id);
        });
      } else {
        [301, 302, 303, 304, 307, 308].forEach(id => {
          if (msg[`hook${id}`] !== undefined) {
            const chk = document.getElementById(`chk-${id}`);
            if (chk) chk.checked = (msg[`hook${id}`] === 1 || msg[`hook${id}`] === true);
          }
        });
      }
    } else if (action === 'gameloop_adb_status') {
      if (msg.vpnOnly) {
        switchTab('roblox-vpn');
        showToast(t('rvpn.vpnOnlyMode'), 'info');
      } else if (msg.wasAlreadyEnabled === false) {
        showToast(Lang.current === 'ar'
          ? 'تم تفعيل وضع تصحيح أخطاء ADB في محاكي GameLoop تلقائياً!'
          : 'GameLoop ADB debugging has been automatically enabled!', 'success');
        const chk308 = document.getElementById('chk-308');
        if (chk308) chk308.checked = true;
      }
    } else if (action === 'adb_status') {
      handleAdbStatus(msg);
    } else if (action === 'game_graphics') {
      handleGameGraphics(msg);
    } else if (action === 'boost_status') {
      handleBoostStatus(msg);
    } else if (action === 'tweaks_status') {
      handleTweaksStatus(msg);
    } else if (action === 'tweak_result') {
      handleTweakResult(msg);
    } else if (action === 'resolution_info') {
      handleResolutionInfo(msg);
    } else if (action === 'display_info') {
      handleDisplayInfo(msg);
    } else if (action === 'display_result') {
      handleDisplayResult(msg);
    } else if (action === 'display_restore_result') {
      handleDisplayRestoreResult(msg);
    } else if (action === 'gpu_panel_result') {
      handleGpuPanelResult(msg);
    } else if (action === 'pc_check') {
      handlePcCheck(msg);
    } else if (action === 'paks_info') {
      handlePaksInfo(msg);
    } else if (action === 'paks_status') {
      handlePaksStatus(msg);
    } else if (action === 'modskin_status') {
      handleModSkinStatus(msg);
    } else if (action === 'memory_status') {
      handleMemoryStatus(msg);
    } else if (action === 'twitter_status') {
      handleTwitterStatus(msg);
    } else if (action === 'facebook_status') {
      handleFacebookStatus(msg);
    } else if (action === 'hosts_fix_status') {
      handleHostsFixStatus(msg);
    } else if (action === 'hosts_fix_result') {
      handleHostsFixResult(msg);
    } else if (action === 'roblox_vpn_status') {
      handleRobloxVpnStatus(msg);
    } else if (action === 'create_vpn_shortcut_result') {
      if (msg.success) {
        showToast(t('rvpn.shortcutCreated'), 'success');
      } else {
        showToast(msg.message || t('rvpn.shortcutFailed'), 'error');
      }
    } else if (action === 'startup_mode') {
      if (msg.vpnOnly) {
        switchTab('roblox-vpn');
        showToast(t('rvpn.vpnOnlyMode'), 'info');
      }
    } else if (action === 'gfx_log') {
      appendGfxLog(msg.tag || "ADB", msg.text || "");
    } else if (action === 'apply_gfx' || action === 'kill_emulator' || action === 'reset_guest') {
      const type = toastTypeFor(msg);
      showToast(msg.message || t('common.done'), type);
      appendGfxLog(type === 'error' ? 'ERROR' : type === 'info' ? 'INFO' : 'SUCCESS', msg.message || '');
      if (action === 'reset_guest') {
        const isSuccess = msg.status === 'success';
        EasyActionModal.complete(isSuccess, msg.message || (isSuccess ? t('common.done') : 'Failed'));
        const btn = document.getElementById('btn-reset-guest');
        if (btn) {
          btn.disabled = false;
          btn.classList.remove('is-busy');
        }
        const btnEasy = document.getElementById('btn-easy-reset-guest');
        if (btnEasy) {
          btnEasy.classList.remove('is-busy');
        }
      }
    } else if (action === 'action_result') {
      showToast(msg.message || t('common.actionDone'), toastTypeFor(msg));
      if (msg.gfx_log) appendGfxLog("SYSTEM", msg.gfx_log);
    } else if (msg.message) {
      showToast(msg.message, toastTypeFor(msg));
      if (action === 'clean_ram' || action === 'turbo_boost') {
        setTimeout(() => sendAction('get_system_info'), 400);
      }
    }
  } catch (err) {
    console.error("[IPC Parse Error]", err);
  }
}

// ----------------------------------------------------------
// Performance tweak toggles (System Optimizer)
// The switch always mirrors the real registry state reported by the backend.
// ----------------------------------------------------------
const TweakState = { pending: new Set(), elevated: true, info: {} };

function renderTweakRow(id, info) {
  const row = document.querySelector(`.tweak-toggle-row[data-tweak="${id}"]`);
  const input = document.querySelector(`input[data-tweak-toggle="${id}"]`);
  if (!row || !input) return;
  TweakState.info[id] = info;

  input.checked = !!info.applied;
  const locked = !info.available || (info.needsAdmin && !TweakState.elevated);
  input.disabled = locked;
  row.classList.toggle('is-on', !!info.applied);
  row.classList.toggle('is-unavailable', locked);
  row.classList.toggle('is-pending', TweakState.pending.has(id));

  const tag = row.querySelector('.tweak-state-tag');
  if (tag) {
    tag.hidden = !locked;
    tag.textContent = !info.available ? t('tw.state.na') : t('tw.state.admin');
  }
}

function handleTweaksStatus(msg) {
  TweakState.elevated = msg.elevated !== false;
  Object.entries(msg.tweaks || {}).forEach(([id, info]) => renderTweakRow(id, info));
}

function handleTweakResult(msg) {
  TweakState.pending.delete(msg.id);
  renderTweakRow(msg.id, { applied: msg.applied, available: true, needsAdmin: false });
  showToast(msg.message || (msg.ok ? t('common.done') : t('common.failed')), msg.ok ? 'success' : 'error');
}

function requestTweak(id, enable) {
  if (TweakState.pending.has(id)) return;
  TweakState.pending.add(id);
  const row = document.querySelector(`.tweak-toggle-row[data-tweak="${id}"]`);
  if (row) row.classList.add('is-pending');
  sendAction('set_tweak', { id, enable: enable ? 1 : 0 });
}

// ----------------------------------------------------------
// Resolution page
// ----------------------------------------------------------
const RES_PRESETS = [
  { id: 'hd169', cat: 'standard', w: 1280, h: 720 },
  { id: 'fhd169', cat: 'standard', w: 1920, h: 1080 },
  { id: 'qhd169', cat: 'standard', w: 2560, h: 1440 },
  { id: 'wide1610', cat: 'standard', w: 1720, h: 1080 },
  { id: 'lowTall', cat: 'tall', w: 1280, h: 1080 },
  { id: 'classic43', cat: '43', w: 1440, h: 1080 },
  { id: 'sharp43', cat: '43', w: 1920, h: 1440 },
  { id: 'native43', cat: '43', w: 2880, h: 2160 },
  { id: 'ipadSquare', cat: 'ipad', w: 2300, h: 1920 },
  { id: 'ipadPro', cat: 'ipad', w: 2200, h: 2180 },
  { id: 'uwTall', cat: 'tall', w: 1920, h: 1800 },
  { id: 'uwMax', cat: 'tall', w: 1920, h: 1900 }
];

const ResState = { width: 0, height: 0, dpi: 0, emulatorRunning: false, restartNeeded: false, restarting: false, saved: [] };

function aspectLabel(w, h) {
  if (!w || !h) return '--';
  const r = w / h;
  const known = [[16 / 9, '16:9'], [16 / 10, '16:10'], [4 / 3, '4:3'], [5 / 4, '5:4'], [1, '1:1']];
  for (const [value, label] of known) if (Math.abs(r - value) < 0.012) return label;
  return `${r.toFixed(2)}:1`;
}

const isHeavy = (w, h) => w * h >= 4000000;

const ARROW_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"></path></svg>';

function renderResolutionPage() {
  const { width, height, dpi } = ResState;
  const known = width > 0 && height > 0;

  const value = document.getElementById('res-current-value');
  if (value) value.textContent = known ? `${width} × ${height}` : t('res.unknown');
  const aspect = document.getElementById('res-current-aspect');
  if (aspect) aspect.textContent = known ? aspectLabel(width, height) : '--';
  const dpiEl = document.getElementById('res-current-dpi');
  if (dpiEl) dpiEl.textContent = dpi ? `DPI ${dpi}` : 'DPI --';
  const emu = document.getElementById('res-emulator-state');
  if (emu) {
    emu.textContent = ResState.emulatorRunning ? t('res.glRunning') : t('res.glClosed');
    emu.classList.toggle('is-on', ResState.emulatorRunning);
  }

  const banner = document.getElementById('res-restart-banner');
  if (banner) banner.hidden = !(ResState.restartNeeded && ResState.emulatorRunning) && !ResState.restarting;
  const restartBtn = document.getElementById('btn-res-restart');
  if (restartBtn) {
    restartBtn.disabled = ResState.restarting;
    restartBtn.textContent = ResState.restarting ? t('res.restarting') : t('res.restart');
  }

  // Presets
  const grid = document.getElementById('res-preset-grid');
  if (grid) {
    grid.innerHTML = '';
    RES_PRESETS.forEach(p => {
      const current = p.w === width && p.h === height;
      const card = document.createElement('div');
      card.className = `res-preset${current ? ' is-current' : ''}`;

      const head = document.createElement('div');
      head.className = 'res-preset-head';
      const name = document.createElement('span');
      name.className = 'res-preset-name';
      name.textContent = t(`res.p.${p.id}`);
      const size = document.createElement('span');
      size.className = 'res-preset-size';
      size.textContent = `${p.w}×${p.h}`;
      head.append(name, size);

      const cat = document.createElement('div');
      cat.className = 'res-preset-cat';
      cat.textContent = `${t(`res.cat.${p.cat}`)} · ${aspectLabel(p.w, p.h)}`;
      if (current) cat.append(makeResTag(t('res.tag.current'), 'is-current'));
      if (isHeavy(p.w, p.h)) cat.append(makeResTag(t('res.tag.heavy'), 'is-heavy'));

      const desc = document.createElement('div');
      desc.className = 'res-preset-desc';
      desc.textContent = t(`res.p.${p.id}.desc`);

      const btn = document.createElement('button');
      btn.className = 'btn-module-action';
      btn.type = 'button';
      btn.disabled = current;
      const label = document.createElement('span');
      label.textContent = current ? t('res.active') : t('res.apply');
      btn.append(label);
      btn.insertAdjacentHTML('beforeend', ARROW_ICON);
      btn.addEventListener('click', () => {
        SoundEngine.playClick();
        sendAction('set_resolution', { width: p.w, height: p.h, dpi: 0 });
      });

      card.append(head, cat, desc, btn);
      grid.appendChild(card);
    });
  }
}

function makeResTag(text, cls) {
  const tag = document.createElement('span');
  tag.className = `res-tag ${cls || ''}`;
  tag.textContent = text;
  return tag;
}

function renderSavedResolutions() {
  const list = document.getElementById('res-saved-list');
  if (!list) return;
  const saved = ResState.saved;
  list.innerHTML = '';

  if (!saved.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = t('res.emptySaved');
    list.appendChild(empty);
    return;
  }

  saved.forEach(r => {
    const current = r.width === ResState.width && r.height === ResState.height && (!r.dpi || r.dpi === ResState.dpi);
    const item = document.createElement('div');
    item.className = `res-saved-item${current ? ' is-current' : ''}`;

    const info = document.createElement('div');
    info.className = 'res-saved-info';
    const title = document.createElement('div');
    title.className = 'res-saved-title';
    const size = document.createElement('span');
    size.className = 'ltr-text';
    size.textContent = `${r.width} × ${r.height}`;
    title.append(size);
    if (r.note === 'Original') title.append(makeResTag(t('res.tag.original'), 'is-original'));
    if (current) title.append(makeResTag(t('res.tag.current'), 'is-current'));
    const sub = document.createElement('div');
    sub.className = 'res-saved-sub';
    sub.textContent = `${aspectLabel(r.width, r.height)} · DPI ${r.dpi || '--'} · ${r.date}`;
    info.append(title, sub);

    const restore = document.createElement('button');
    restore.className = 'btn-res-small';
    restore.type = 'button';
    restore.textContent = current ? t('res.active') : t('res.restore');
    restore.disabled = current;
    restore.addEventListener('click', () => {
      SoundEngine.playClick();
      sendAction('restore_resolution', { id: r.id });
    });

    const del = document.createElement('button');
    del.className = 'btn-res-small is-danger';
    del.type = 'button';
    del.textContent = t('res.delete');
    del.addEventListener('click', () => {
      if (r.note === 'Original' && !confirm(t('res.confirmDeleteOriginal'))) return;
      SoundEngine.playClick();
      sendAction('delete_resolution', { id: r.id });
    });

    item.append(info, restore, del);
    list.appendChild(item);
  });
}

function handleResolutionInfo(msg) {
  ResState.width = msg.width || 0;
  ResState.height = msg.height || 0;
  ResState.dpi = msg.dpi || 0;
  ResState.emulatorRunning = !!msg.emulatorRunning;
  ResState.saved = msg.saved || [];
  if (msg.restartNeeded) ResState.restartNeeded = true;
  if (msg.status) ResState.restarting = false;
  if (msg.message && msg.message.startsWith('GameLoop restarted')) ResState.restartNeeded = false;

  renderResolutionPage();
  renderSavedResolutions();

  if (msg.message) {
    showToast(msg.message, msg.status === 'error' ? 'error' : msg.status === 'info' ? 'info' : 'success');
  }
}

// ----------------------------------------------------------
// Display Resolution & Stretched iPad View
// ----------------------------------------------------------
const DisplayResState = {
  currentWidth: 0,
  currentHeight: 0,
  currentHz: 0,
  nativeWidth: 0,
  nativeHeight: 0,
  nativeHz: 0,
  supportedHz: [59, 60, 72, 75, 120, 144, 165, 180, 200, 240, 360],
  selectedWidth: 1440,
  selectedHeight: 1080,
  selectedHz: 144,
  usePreferredHz: true,
  favorite: null
};

function gcd(a, b) {
  a = Math.abs(Math.round(a));
  b = Math.abs(Math.round(b));
  while (b) {
    const t = b;
    b = a % b;
    a = t;
  }
  return a || 1;
}

function calculateAspectRatio(w, h) {
  if (!w || !h) return { text: '--', badge: '', isIpad: false, ratio: 1 };
  const r = w / h;
  const d = gcd(w, h);
  const rw = Math.round(w / d);
  const rh = Math.round(h / d);

  let isIpad = false;
  let badge = '';

  if (Math.abs(r - 4 / 3) < 0.02) {
    badge = '4:3 ' + t('dres.tag.ipad');
    isIpad = true;
  } else if (Math.abs(r - 16 / 10) < 0.02 || Math.abs(r - 8 / 5) < 0.02) {
    badge = '16:10 ' + t('dres.tag.balanced');
    isIpad = true;
  } else if (Math.abs(r - 5 / 4) < 0.02) {
    badge = '5:4 ' + t('dres.tag.stretched');
    isIpad = true;
  } else if (Math.abs(r - 16 / 9) < 0.02) {
    badge = '16:9 ' + t('dres.tag.native');
  } else {
    badge = `${rw}:${rh}`;
  }

  let text = `${rw}:${rh}`;
  if (Math.abs(r - 4 / 3) < 0.005) text = '4:3';
  else if (Math.abs(r - 16 / 10) < 0.005) text = '16:10';
  else if (Math.abs(r - 16 / 9) < 0.005) text = '16:9';
  else if (Math.abs(r - 5 / 4) < 0.005) text = '5:4';

  return { text, badge, isIpad, ratio: r };
}

function updateDisplayResUI() {
  const w = DisplayResState.selectedWidth || 1440;
  const h = DisplayResState.selectedHeight || 1080;
  const hz = DisplayResState.selectedHz || 60;

  // Inputs
  const inW = document.getElementById('dres-input-w');
  const inH = document.getElementById('dres-input-h');
  if (inW && parseInt(inW.value, 10) !== w) inW.value = w;
  if (inH && parseInt(inH.value, 10) !== h) inH.value = h;

  // Aspect ratio calculation
  const ar = calculateAspectRatio(w, h);
  const ratioText = document.getElementById('dres-ratio-text');
  const ratioBadge = document.getElementById('dres-ratio-badge');
  if (ratioText) ratioText.textContent = ar.text;
  if (ratioBadge) {
    ratioBadge.textContent = ar.badge;
    ratioBadge.classList.toggle('is-ipad', ar.isIpad);
  }

  // Monitor preview
  const screen = document.getElementById('dres-monitor-screen');
  const hudRes = document.getElementById('dres-hud-res');
  const hudHz = document.getElementById('dres-hud-hz');
  if (screen) {
    screen.style.aspectRatio = `${w} / ${h}`;
  }
  if (hudRes) hudRes.textContent = `${w} × ${h}`;
  if (hudHz) hudHz.textContent = `${hz} Hz`;

  // Quick chips active state
  document.querySelectorAll('.dres-chip[data-set-w]').forEach(chip => {
    chip.classList.toggle('active', parseInt(chip.dataset.setW, 10) === w);
  });
  document.querySelectorAll('.dres-chip[data-set-h]').forEach(chip => {
    chip.classList.toggle('active', parseInt(chip.dataset.setH, 10) === h);
  });

  // Presets cards active state
  document.querySelectorAll('.dres-preset-card').forEach(card => {
    const pw = parseInt(card.dataset.pw, 10);
    const ph = parseInt(card.dataset.ph, 10);
    card.classList.toggle('is-active', pw === w && ph === h);
  });

  // Telemetry status bar
  const statusPreview = document.getElementById('dres-status-preview');
  const statusHz = document.getElementById('dres-status-hz');
  const statusRatio = document.getElementById('dres-status-ratio');
  const statusCurrent = document.getElementById('dres-status-current');

  if (statusPreview) statusPreview.textContent = `${w} × ${h}`;
  if (statusHz) statusHz.textContent = `${hz} Hz`;
  if (statusRatio) statusRatio.textContent = ar.text;
  if (statusCurrent) {
    const curW = DisplayResState.currentWidth;
    const curH = DisplayResState.currentHeight;
    const curHz = DisplayResState.currentHz;
    statusCurrent.textContent = curW > 0 ? `${curW} × ${curH} @ ${curHz}Hz` : '-- × -- @ --Hz';
  }
}

function renderHzSelector() {
  const container = document.getElementById('dres-hz-selector');
  if (!container) return;

  container.innerHTML = '';
  const list = DisplayResState.supportedHz.length ? DisplayResState.supportedHz : [59, 60, 72, 75, 120, 144, 165, 180, 200, 240, 360];
  list.forEach(hz => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `dres-hz-pill${hz === DisplayResState.selectedHz ? ' active' : ''}`;
    btn.dataset.hz = hz;
    btn.textContent = `${hz} Hz`;
    btn.addEventListener('click', () => {
      SoundEngine.playClick();
      DisplayResState.selectedHz = hz;
      renderHzSelector();
      updateDisplayResUI();
    });
    container.appendChild(btn);
  });
}

function handleDisplayInfo(msg) {
  DisplayResState.currentWidth = msg.currentWidth || 0;
  DisplayResState.currentHeight = msg.currentHeight || 0;
  DisplayResState.currentHz = msg.currentHz || 0;
  DisplayResState.nativeWidth = msg.nativeWidth || 0;
  DisplayResState.nativeHeight = msg.nativeHeight || 0;
  DisplayResState.nativeHz = msg.nativeHz || 0;
  if (Array.isArray(msg.supportedHz) && msg.supportedHz.length) {
    DisplayResState.supportedHz = msg.supportedHz.sort((a, b) => a - b);
  }

  // Pick suitable Hz if none or not available
  if (!DisplayResState.selectedHz || !DisplayResState.supportedHz.includes(DisplayResState.selectedHz)) {
    DisplayResState.selectedHz = DisplayResState.currentHz || DisplayResState.supportedHz[DisplayResState.supportedHz.length - 1] || 60;
  }

  renderHzSelector();
  updateDisplayResUI();
}

function handleDisplayResult(msg) {
  if (msg.ok) {
    showToast(msg.message || t('dres.appliedSuccess', { w: msg.width, h: msg.height, hz: msg.hz }), 'success');
  } else {
    showToast(msg.message || t('dres.applyFailed'), 'error');
  }
}

function handleDisplayRestoreResult(msg) {
  if (msg.ok) {
    showToast(msg.message || t('dres.restoredSuccess'), 'success');
  } else {
    showToast(msg.message || 'Failed to restore display', 'error');
  }
}

function handleGpuPanelResult(msg) {
  if (msg.ok) {
    showToast(msg.message || `Opened ${msg.vendor || 'GPU'} Control Panel.`, 'info');
  } else {
    showToast(msg.message || 'Could not open GPU Control Panel.', 'error');
  }
}

// ----------------------------------------------------------
// GameLoop ADB boost (GFX tab)
// ----------------------------------------------------------
const BoostState = { running: false, steps: [], results: [] };

// Step names as sent by the backend - mapped onto translated labels
const BOOST_STEPS_EN = [
  'UI animations off',
  'Close idle background apps',
  'Keep PUBG awake (Doze whitelist)',
  'Faster app optimization (dex2oat threads)',
  'Background apps to low priority',
  'PUBG high priority'
];

function boostStepLabel(name) {
  const i = BOOST_STEPS_EN.indexOf(name);
  return i >= 0 ? t(`boost.step.${i}`) : name;
}

function renderBoost() {
  const card = document.getElementById('boost-card');
  const title = document.getElementById('boost-title');
  const fill = document.getElementById('boost-fill');
  const list = document.getElementById('boost-steps');
  const steps = BoostState.steps.length ? BoostState.steps : BOOST_STEPS_EN;

  const finished = BoostState.results.filter(r => r && r.status !== 'running').length;
  const anyResult = BoostState.results.some(Boolean);
  if (card) card.dataset.state = BoostState.running ? 'running' : anyResult ? 'done' : 'idle';
  if (fill) fill.style.width = `${Math.round((finished / steps.length) * 100)}%`;

  if (title) {
    if (BoostState.running) title.textContent = t('boost.running', { done: finished, total: steps.length });
    else if (anyResult) {
      const done = BoostState.results.filter(r => r && r.status === 'done').length;
      title.textContent = t('boost.applied', { done, total: steps.length });
    } else {
      const auto = document.getElementById('chk-auto-boost');
      title.textContent = auto && auto.checked ? t('boost.autoIdle') : t('boost.manualIdle');
    }
  }

  if (list) {
    list.innerHTML = '';
    steps.forEach((name, i) => {
      const result = BoostState.results[i];
      const li = document.createElement('li');
      li.className = `boost-step${result ? ` is-${result.status}` : ''}`;
      const dot = document.createElement('span');
      dot.className = 'boost-step-dot';
      if (result && result.status === 'done') dot.textContent = '✓';
      if (result && result.status === 'failed') dot.textContent = '!';
      const text = document.createElement('div');
      text.className = 'boost-step-text';
      const n = document.createElement('span');
      n.className = 'boost-step-name';
      n.textContent = boostStepLabel(name);
      text.appendChild(n);
      if (result && result.detail) {
        const d = document.createElement('span');
        d.className = 'boost-step-detail';
        d.dir = 'auto';
        d.textContent = result.detail;
        text.appendChild(d);
      }
      li.append(dot, text);
      list.appendChild(li);
    });
  }

  const btn = document.getElementById('btn-run-boost');
  if (btn) {
    btn.disabled = BoostState.running || Bridge.state !== 'connected';
    btn.classList.toggle('is-busy', BoostState.running);
    btn.title = Bridge.state === 'connected' ? '' : t('bridge.connectFirst');
    const label = btn.querySelector('span');
    if (label) label.textContent = BoostState.running ? t('boost.btn.running') : anyResult ? t('boost.btn.again') : t('boost.btn.run');
  }
}

function handleBoostStatus(msg) {
  if (msg.phase === 'start') {
    BoostState.running = true;
    BoostState.steps = msg.steps || BOOST_STEPS_EN;
    BoostState.results = [];
    appendGfxLog('BOOST', t('boost.log.start'));
  } else if (msg.phase === 'step') {
    BoostState.results[msg.index] = { status: msg.status, detail: msg.detail };
    if (msg.status !== 'running') {
      const name = BoostState.steps[msg.index] ? boostStepLabel(BoostState.steps[msg.index]) : t('boost.stepN', { n: msg.index + 1 });
      const kind = msg.status === 'done' ? 'ok' : msg.status === 'failed' ? 'err' : 'warn';
      appendGfxLog('BOOST', `${name}: ${msg.detail || msg.status}`, kind);
    }
  } else if (msg.phase === 'done') {
    BoostState.running = false;
    const summary = t('boost.summary', { applied: msg.applied, skipped: msg.skipped }) +
      (msg.failed ? t('boost.summaryFailed', { failed: msg.failed }) : '');
    appendGfxLog('BOOST', summary, msg.failed ? 'warn' : 'ok');
    showToast(summary, msg.failed ? 'info' : 'success');
  } else if (msg.phase === 'error') {
    BoostState.running = false;
    showToast(msg.message || t('boost.failed'), 'error');
  }
  renderBoost();
}

// ----------------------------------------------------------
// PC check (System Optimizer)
// ----------------------------------------------------------
const PcState = { last: null };

function setPcRow(id, level, detail) {
  const row = document.getElementById(id);
  if (!row) return;
  row.dataset.level = level;
  const d = row.querySelector('.pc-check-detail');
  if (d) d.textContent = detail;
}

function renderPcCheck() {
  const msg = PcState.last;
  if (!msg) return;

  if (msg.hypervisor) setPcRow('pc-row-virt', 'warn', t('pc.virt.hyperv'));
  else if (!msg.vtFirmware) setPcRow('pc-row-virt', 'bad', t('pc.virt.bios'));
  else setPcRow('pc-row-virt', 'ok', t('pc.virt.ok'));

  setPcRow('pc-row-hvci', msg.memoryIntegrity ? 'warn' : 'ok', msg.memoryIntegrity ? t('pc.hvci.on') : t('pc.hvci.off'));

  const plan = msg.powerPlan || t('pc.power.unknown');
  if (msg.highPerfActive) setPcRow('pc-row-power', 'ok', t('pc.power.high', { plan }));
  else if (msg.highPerfAvailable) setPcRow('pc-row-power', 'warn', t('pc.power.warn', { plan }));
  else setPcRow('pc-row-power', 'ok', t('pc.power.oem', { plan }));
}

function handlePcCheck(msg) {
  PcState.last = msg;
  renderPcCheck();
}

// ----------------------------------------------------------
// Paks Tool
// ----------------------------------------------------------
const PaksState = { info: null, selected: '', busy: false, op: '', done: 0, total: 0, index: 0, count: 0, file: '', startedAt: 0, startDone: 0, loading: false };

function formatBytes(bytes) {
  if (!bytes) return '0 MB';
  if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(2)} GB`;
  return `${Math.round(bytes / 1048576)} MB`;
}

function requestPaksInfo() {
  if (PaksState.busy || PaksState.loading) return;
  PaksState.loading = true;
  renderPaks();
  sendAction('get_paks_info');
}

function selectedPaksGame() {
  const games = (PaksState.info && PaksState.info.games) || [];
  return games.find(g => g.package === PaksState.selected) || games.find(g => g.installed) || games[0] || null;
}

function renderPaks() {
  const info = PaksState.info;
  const connected = Bridge.state === 'connected';
  const game = selectedPaksGame();
  if (game) PaksState.selected = game.package;

  const banner = document.getElementById('paks-connect-banner');
  if (banner) banner.hidden = connected;

  // Game picker (only when more than one PUBG build is involved)
  const picker = document.getElementById('paks-game-select');
  const games = (info && info.games) || [];
  if (picker) {
    picker.hidden = games.length < 2;
    picker.innerHTML = '';
    games.forEach(g => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = `chip-item${g.package === PaksState.selected ? ' selected' : ''}`;
      chip.textContent = versionName(g.version) || g.package;
      chip.addEventListener('click', () => { PaksState.selected = g.package; renderPaks(); });
      picker.appendChild(chip);
    });
  }

  const set = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };
  const name = game ? (versionName(game.version) || game.package) : '--';

  // Emulator side
  set('paks-remote-game', game && game.installed ? name : (connected ? t('paks.notInstalled') : '--'));
  set('paks-remote-version', game && game.gameVersion ? game.gameVersion : '--');
  set('paks-remote-files', game && game.installed ? String(game.remoteFiles) : '--');
  set('paks-remote-size', game && game.installed ? formatBytes(game.remoteBytes) : '--');
  let note = '';
  if (PaksState.loading) note = t('paks.reading');
  else if (connected && info && !games.some(g => g.installed)) note = t('paks.noPubg');
  else if (game && game.installed && game.remoteFiles === 0) note = t('paks.noPaks');
  else if (game && game.running) note = t('paks.running');
  set('paks-remote-note', note);

  // PC side
  const backup = game && game.backup;
  set('paks-local-path', backup ? backup.path : (info ? info.folder : t('paks.defaultFolder')));
  set('paks-local-date', backup && backup.exists ? backup.date : t('paks.noBackup'));
  set('paks-local-version', backup && backup.exists ? (backup.version || '--') : '--');
  set('paks-local-files', backup && backup.exists ? String(backup.files) : '--');
  set('paks-local-size', backup && backup.exists ? formatBytes(backup.bytes) : '--');

  // Buttons
  const canPull = connected && !PaksState.busy && game && game.installed && game.remoteFiles > 0;
  const canPush = connected && !PaksState.busy && game && game.installed && backup && backup.exists && !game.running;
  const pull = document.getElementById('btn-paks-pull');
  const push = document.getElementById('btn-paks-push');
  if (pull) pull.disabled = !canPull;
  if (push) push.disabled = !canPush;
  const cancel = document.getElementById('btn-paks-cancel');
  if (cancel) cancel.hidden = !PaksState.busy;
  const refresh = document.getElementById('btn-paks-refresh');
  if (refresh) refresh.disabled = PaksState.busy || PaksState.loading;

  // Progress
  const progress = document.getElementById('paks-progress');
  if (progress) progress.hidden = !PaksState.busy && !PaksState.op;
  if (PaksState.op) {
    const pct = PaksState.total ? Math.min(100, Math.floor((PaksState.done / PaksState.total) * 100)) : 0;
    set('paks-progress-title', PaksState.busy
      ? (PaksState.op === 'pull' ? t('paks.pulling') : t('paks.pushing'))
      : (PaksState.op === 'pull' ? t('paks.pullDone') : t('paks.pushDone')));
    set('paks-progress-pct', `${pct}%`);
    const fill = document.getElementById('paks-fill');
    if (fill) fill.style.width = `${pct}%`;
    set('paks-progress-file', PaksState.count ? t('paks.fileProgress', { i: PaksState.index, n: PaksState.count, file: PaksState.file }) : '');
    const elapsed = (Date.now() - PaksState.startedAt) / 1000;
    const speed = elapsed > 1 ? (PaksState.done - PaksState.startDone) / elapsed : 0;
    const eta = speed > 0 ? Math.max(0, (PaksState.total - PaksState.done) / speed) : 0;
    set('paks-progress-speed', PaksState.busy && speed > 0
      ? `${formatBytes(PaksState.done)} / ${formatBytes(PaksState.total)} · ${(speed / 1048576).toFixed(1)} MB/s · ${t('paks.minLeft', { min: Math.ceil(eta / 60) })}`
      : `${formatBytes(PaksState.done)} / ${formatBytes(PaksState.total)}`);
  }
}

function handlePaksInfo(msg) {
  PaksState.loading = false;
  PaksState.info = msg;
  if (msg.busy) PaksState.busy = true;
  renderPaks();
}

function handlePaksStatus(msg) {
  const opName = msg.op === 'pull' ? t('paks.op.pull') : t('paks.op.push');
  if (msg.phase === 'mode') {
    PaksState.mode = msg.message;
    appendGfxLog('PAKS', msg.message, msg.message.startsWith('Fast') ? 'ok' : 'warn');
  } else if (msg.phase === 'start') {
    PaksState.busy = true;
    PaksState.op = msg.op;
    PaksState.done = 0;
    PaksState.total = msg.total;
    PaksState.count = msg.count;
    PaksState.index = 0;
    PaksState.startedAt = Date.now();
    PaksState.startDone = 0;
    appendGfxLog('PAKS', msg.message);
  } else if (msg.phase === 'progress') {
    PaksState.busy = true;
    PaksState.op = msg.op;
    PaksState.done = msg.done;
    PaksState.total = msg.total;
    PaksState.index = msg.index;
    PaksState.count = msg.count;
    PaksState.file = msg.file;
  } else if (msg.phase === 'done') {
    PaksState.busy = false;
    PaksState.done = msg.total;
    appendGfxLog('PAKS', msg.message, 'ok');
    showToast(msg.message, 'success');
  } else if (msg.phase === 'confirm') {
    PaksState.busy = false;
    if (confirm(msg.message)) {
      PaksState.busy = true;
      sendAction('push_paks', { package: msg.package, force: 1 });
    }
  } else if (msg.phase === 'cancelled') {
    PaksState.busy = false;
    appendGfxLog('PAKS', msg.message, 'warn');
    showToast(msg.message, 'info');
  } else if (msg.phase === 'error') {
    PaksState.busy = false;
    appendGfxLog('PAKS', t('paks.opFailed', { op: opName, msg: msg.message }), 'err');
    showToast(msg.message, 'error');
  }
  renderPaks();
}

// ----------------------------------------------------------
// ModSkin + Twitter fix status (badge, buttons, log)
// ----------------------------------------------------------
const ModSkinState = { status: 'ready', busyKey: 'ms.working', op: '' };
const TwitterState = { status: 'ready', busyKey: 'ms.working' };

function appendStatusLog(boxId, itemClass, status, text) {
  const logBox = document.getElementById(boxId);
  if (!logBox || !text) return;
  const item = document.createElement('div');
  item.className = `${itemClass} ${status || 'info'}`;
  item.dir = 'auto';
  item.textContent = `[${new Date().toLocaleTimeString('en-GB')}] ${text}`;
  logBox.appendChild(item);
  logBox.scrollTop = logBox.scrollHeight;
}

function renderModSkin() {
  const badge = document.getElementById('modskin-status-badge');
  const btnAdd = document.getElementById('btn-modskin-add');
  const btnRemove = document.getElementById('btn-modskin-remove');
  const status = ModSkinState.status;
  const isBusy = status === 'busy';

  if (badge) {
    badge.dataset.status = status;
    badge.textContent = isBusy ? t(ModSkinState.busyKey)
      : status === 'success' ? t('ms.active')
        : status === 'removed' ? t('ms.removed')
          : status === 'error' ? t('ms.error') : t('ms.ready');
  }
  if (btnAdd) {
    btnAdd.disabled = isBusy;
    btnAdd.classList.toggle('is-busy', isBusy && ModSkinState.op === 'add');
    const label = btnAdd.querySelector('span');
    if (label) label.textContent = isBusy && ModSkinState.op === 'add' ? t('ms.injecting') : t('ms.add');
  }
  if (btnRemove) {
    btnRemove.disabled = isBusy;
    btnRemove.classList.toggle('is-busy', isBusy && ModSkinState.op === 'remove');
  }
}

function handleModSkinStatus(msg) {
  ModSkinState.status = msg.status || 'ready';
  if (ModSkinState.status === 'busy') ModSkinState.busyKey = 'ms.working';
  else ModSkinState.op = '';
  renderModSkin();

  appendStatusLog('modskin-log-box', 'modskin-log-item', msg.status, msg.message);

  if (EasyActionModal.currentOp === 'modskin') {
    if (msg.status === 'busy') {
      EasyActionModal.updateMessage(msg.message);
    } else if (msg.status === 'success') {
      EasyActionModal.complete(true, msg.message || t('ms.toast.ok'));
    } else if (msg.status === 'error') {
      EasyActionModal.complete(false, msg.message || t('ms.toast.err'));
    }
  }

  if (msg.status === 'success') {
    showToast(msg.message || t('ms.toast.ok'), 'success', 7500);
    NoticePopup.open(
      Lang.current === 'ar' ? 'تم تثبيت ModSkin بنجاح!' : 'ModSkin Applied Successfully!',
      msg.message || t('ms.toast.ok'),
      Lang.current === 'ar' ? 'فهمت / حسناً' : 'Got it'
    );
  } else if (msg.status === 'removed') {
    showToast(msg.message || t('ms.toast.removed'), 'info');
  } else if (msg.status === 'error') {
    showToast(msg.message || t('ms.toast.err'), 'error');
  }
}

// ----------------------------------------------------------
// Memory Manager (badge, buttons, log)
// ----------------------------------------------------------
const MemoryState = { status: 'ready', busyKey: 'mem.working', op: '' };

function renderMemory() {
  const badge = document.getElementById('memory-status-badge');
  const btnAdd = document.getElementById('btn-memory-add');
  const btnRemove = document.getElementById('btn-memory-remove');
  const status = MemoryState.status;
  const isBusy = status === 'busy';

  if (badge) {
    badge.dataset.status = status;
    badge.textContent = isBusy ? t(MemoryState.busyKey)
      : status === 'success' ? t('mem.active')
        : status === 'removed' ? t('mem.removed')
          : status === 'error' ? t('mem.error') : t('mem.ready');
  }
  if (btnAdd) {
    btnAdd.disabled = isBusy;
    btnAdd.classList.toggle('is-busy', isBusy && MemoryState.op === 'add');
    const label = btnAdd.querySelector('span');
    if (label) label.textContent = isBusy && MemoryState.op === 'add' ? t('mem.injecting') : t('mem.add');
  }
  if (btnRemove) {
    btnRemove.disabled = isBusy;
    btnRemove.classList.toggle('is-busy', isBusy && MemoryState.op === 'remove');
  }
}

function handleMemoryStatus(msg) {
  MemoryState.status = msg.status || 'ready';
  if (MemoryState.status === 'busy') MemoryState.busyKey = 'mem.working';
  else MemoryState.op = '';
  renderMemory();

  appendStatusLog('memory-log-box', 'modskin-log-item', msg.status, msg.message);

  if (EasyActionModal.currentOp === 'memory') {
    if (msg.status === 'busy') {
      EasyActionModal.updateMessage(msg.message);
    } else if (msg.status === 'success') {
      EasyActionModal.complete(true, msg.message || t('mem.toast.ok'));
    } else if (msg.status === 'error') {
      EasyActionModal.complete(false, msg.message || t('mem.toast.err'));
    }
  }

  if (msg.status === 'success') {
    showToast(msg.message || t('mem.toast.ok'), 'success');
  } else if (msg.status === 'removed') {
    showToast(msg.message || t('mem.toast.removed'), 'info');
  } else if (msg.status === 'error') {
    showToast(msg.message || t('mem.toast.err'), 'error');
  }
}

function renderTwitter() {
  const badge = document.getElementById('twitter-status-badge');
  const btnApply = document.getElementById('btn-twitter-apply');
  const btnRestore = document.getElementById('btn-twitter-restore');
  const status = TwitterState.status;
  const isBusy = status === 'busy';

  if (badge) {
    badge.dataset.status = status;
    badge.textContent = isBusy ? t(TwitterState.busyKey)
      : status === 'success' ? t('tt.applied')
        : status === 'error' ? t('ms.error') : t('ms.ready');
  }
  if (btnApply) {
    btnApply.disabled = isBusy;
    btnApply.classList.toggle('is-busy', isBusy);
  }
  if (btnRestore) {
    btnRestore.disabled = isBusy;
    btnRestore.classList.toggle('is-busy', isBusy);
  }
}

function handleTwitterStatus(msg) {
  TwitterState.status = msg.status || 'ready';
  if (TwitterState.status === 'busy') TwitterState.busyKey = 'ms.working';
  renderTwitter();

  appendStatusLog('twitter-log-box', 'twitter-log-item', msg.status, msg.message);

  if (EasyActionModal.currentOp === 'fix_twitter') {
    if (msg.status === 'busy') {
      EasyActionModal.updateMessage(msg.message);
    } else if (msg.status === 'success' || msg.status === 'restored') {
      EasyActionModal.complete(true, msg.message || t('tt.toast.ok'));
    } else if (msg.status === 'error') {
      EasyActionModal.complete(false, msg.message || t('tt.toast.err'));
    }
  }

  if (msg.status === 'success') {
    showToast(msg.message || t('tt.toast.ok'), 'success');
  } else if (msg.status === 'restored') {
    showToast(msg.message || t('tt.toast.restored'), 'info');
  } else if (msg.status === 'error') {
    showToast(msg.message || t('tt.toast.err'), 'error');
  }
}

// ----------------------------------------------------------
// Fix Facebook Controller
// ----------------------------------------------------------
const FacebookState = {
  status: 'ready',
  busyKey: ''
};

function renderFacebook() {
  const badge = document.getElementById('facebook-status-badge');
  const btnApply = document.getElementById('btn-facebook-apply');

  if (badge) {
    badge.dataset.status = FacebookState.status;
    let label = t('ms.ready');
    if (FacebookState.status === 'busy') label = t(FacebookState.busyKey || 'ms.working');
    else if (FacebookState.status === 'success') label = t('ms.active');
    else if (FacebookState.status === 'error') label = t('ms.error');
    badge.textContent = label;
  }

  const isBusy = FacebookState.status === 'busy';
  if (btnApply) {
    btnApply.disabled = isBusy;
    btnApply.classList.toggle('is-busy', isBusy);
  }
}

function handleFacebookStatus(msg) {
  FacebookState.status = msg.status || 'ready';
  if (FacebookState.status === 'busy') FacebookState.busyKey = 'ms.working';
  renderFacebook();

  appendStatusLog('facebook-log-box', 'twitter-log-item', msg.status, msg.message);

  if (EasyActionModal.currentOp === 'fix_facebook') {
    if (msg.status === 'busy') {
      EasyActionModal.updateMessage(msg.message);
    } else if (msg.status === 'success') {
      EasyActionModal.complete(true, msg.message || 'Facebook fix applied!');
    } else if (msg.status === 'error') {
      EasyActionModal.complete(false, msg.message || 'Facebook fix failed');
    }
  }

  if (msg.status === 'success') {
    showToast(msg.message || 'Facebook fix applied!', 'success');
  } else if (msg.status === 'error') {
    showToast(msg.message || 'Facebook fix error', 'error');
  }
}

// ----------------------------------------------------------
// Fixer 32Bit Controller
// ----------------------------------------------------------
const Fixer32State = {
  applied: false,
  busy: false
};

function handleHostsFixStatus(msg) {
  Fixer32State.applied = !!msg.applied;
  renderFixer32();
}

function handleHostsFixResult(msg) {
  Fixer32State.busy = false;
  const isSuccess = msg.status === 'success' || msg.status === 'already_applied';
  showToast(msg.message, isSuccess ? 'success' : 'error');
  const logEl = document.getElementById('fixer32-log-msg');
  if (logEl) {
    logEl.textContent = msg.message;
    logEl.className = `twitter-log-item ${isSuccess ? 'ok' : 'err'}`;
  }
  renderFixer32();
}

function renderFixer32() {
  const badge = document.getElementById('fixer32-status-badge');
  const btnApply = document.getElementById('btn-fixer32-apply');
  const btnRemove = document.getElementById('btn-fixer32-remove');

  if (badge) {
    if (Fixer32State.applied) {
      badge.dataset.status = 'applied';
      badge.textContent = t('fixer32.applied');
    } else {
      badge.dataset.status = 'ready';
      badge.textContent = t('fixer32.notApplied');
    }
  }

  if (btnApply) {
    btnApply.disabled = Fixer32State.busy;
  }
  if (btnRemove) {
    btnRemove.disabled = Fixer32State.busy;
  }
}

// ----------------------------------------------------------
// Roblox Vpn Controller
// ----------------------------------------------------------
const RobloxVpnState = {
  status: 'disconnected', // 'disconnected', 'connecting', 'connected', 'disconnecting', 'error'
  ping: -1,
  busy: false
};

function handleRobloxVpnStatus(msg) {
  RobloxVpnState.busy = false;
  RobloxVpnState.status = msg.status || 'disconnected';
  if (typeof msg.ping === 'number' && msg.ping >= 0) {
    RobloxVpnState.ping = msg.ping;
  } else if (msg.status === 'disconnected') {
    RobloxVpnState.ping = -1;
  }

  if (msg.message) {
    const isSuccess = msg.status === 'connected';
    const isErr = msg.status === 'error';
    const logEl = document.getElementById('rvpn-log-msg');
    if (logEl) {
      logEl.textContent = msg.message;
      logEl.className = `twitter-log-item ${isSuccess ? 'ok' : isErr ? 'err' : 'info'}`;
    }
    if (isSuccess && msg.showToast !== false) showToast(t('rvpn.toastConnected'), 'success');
    else if (msg.status === 'disconnected' && msg.toast) showToast(t('rvpn.toastDisconnected'), 'info');
    else if (isErr) showToast(msg.message, 'error');
  }

  renderRobloxVpn();
}

function renderRobloxVpn() {
  const badge = document.getElementById('rvpn-status-badge');
  const pingVal = document.getElementById('rvpn-ping-val');
  const statPing = document.getElementById('rvpn-stat-ping');
  const btnToggle = document.getElementById('btn-roblox-vpn-toggle');
  const toggleLabel = document.getElementById('rvpn-toggle-label');
  const btnPing = document.getElementById('btn-roblox-vpn-ping');
  const circle = document.getElementById('rvpn-circle-indicator');
  const easyStatus = document.getElementById('easy-rvpn-status');

  if (circle) {
    circle.classList.toggle('is-connected', RobloxVpnState.status === 'connected');
    circle.classList.toggle('is-busy', RobloxVpnState.status === 'connecting' || RobloxVpnState.status === 'disconnecting');
  }

  if (badge) {
    if (RobloxVpnState.status === 'connected') {
      badge.dataset.status = 'applied';
      badge.textContent = t('rvpn.connected');
    } else if (RobloxVpnState.status === 'connecting') {
      badge.dataset.status = 'busy';
      badge.textContent = t('rvpn.connecting');
    } else if (RobloxVpnState.status === 'disconnecting') {
      badge.dataset.status = 'busy';
      badge.textContent = t('rvpn.disconnecting');
    } else if (RobloxVpnState.status === 'error') {
      badge.dataset.status = 'error';
      badge.textContent = 'Error';
    } else {
      badge.dataset.status = 'ready';
      badge.textContent = t('rvpn.disconnected');
    }
  }

  const formatPing = (el) => {
    if (!el) return;
    if (RobloxVpnState.ping >= 0) {
      el.textContent = `${RobloxVpnState.ping} ms`;
      if (RobloxVpnState.ping < 100) el.style.color = '#34d399';
      else if (RobloxVpnState.ping < 160) el.style.color = '#fbbf24';
      else el.style.color = '#f87171';
    } else {
      el.textContent = '-- ms';
      el.style.color = '#38bdf8';
    }
  };

  formatPing(pingVal);
  formatPing(statPing);

  if (easyStatus) {
    if (RobloxVpnState.status === 'connected') {
      easyStatus.dataset.state = 'connected';
      easyStatus.textContent = RobloxVpnState.ping >= 0 ? `${t('rvpn.connected')} (${RobloxVpnState.ping}ms)` : t('rvpn.connected');
    } else if (RobloxVpnState.status === 'connecting' || RobloxVpnState.status === 'disconnecting') {
      easyStatus.dataset.state = 'busy';
      easyStatus.textContent = t('rvpn.' + RobloxVpnState.status);
    } else {
      easyStatus.dataset.state = 'idle';
      easyStatus.textContent = t('rvpn.disconnected');
    }
  }

  if (btnToggle && toggleLabel) {
    btnToggle.disabled = RobloxVpnState.busy;
    if (RobloxVpnState.status === 'connected') {
      btnToggle.classList.add('is-danger');
      toggleLabel.textContent = t('rvpn.btnDisconnect');
    } else {
      btnToggle.classList.remove('is-danger');
      toggleLabel.textContent = t('rvpn.btnConnect');
    }
  }

  if (btnPing) {
    btnPing.disabled = RobloxVpnState.busy;
  }
}

// ----------------------------------------------------------
// Easy Mode Controller (Cyber Cafe / Player Mode)
// ----------------------------------------------------------
const EasyModeState = {
  enabled: false,
  allowedTabs: ['home', 'roblox-vpn', 'facebook']
};

function autoConnectGameLoop() {
  if (Bridge.state === 'connected' || BUSY_STATES.includes(Bridge.state)) return;
  Bridge.lastLogged = '';
  appendGfxLog("ADB", Bridge.emulatorRunning ? t('log.checkBridge') : t('log.startingGl'));
  BoostState.results = [];
  renderBoost();
  sendAction('connect_gameloop', { autoBoost: document.getElementById('chk-auto-boost')?.checked ? 1 : 0 });
}

function applyEasyMode(enabled, showNotification = false) {
  EasyModeState.enabled = !!enabled;
  localStorage.setItem('cyperopt_easy_mode', EasyModeState.enabled ? '1' : '0');

  document.body.classList.toggle('is-easy-mode', EasyModeState.enabled);

  // Badge in header
  const badge = document.getElementById('header-easy-badge');
  if (badge) {
    badge.style.display = EasyModeState.enabled ? 'inline-flex' : 'none';
  }

  // Toggle in settings modal
  const chk = document.getElementById('chk-easy-mode');
  if (chk) {
    chk.checked = EasyModeState.enabled;
  }

  // Row active highlight in settings modal
  const row = document.getElementById('settings-row-easy');
  if (row) {
    row.classList.toggle('is-active', EasyModeState.enabled);
  }

  // Status tag in settings modal
  const statusTag = document.getElementById('easy-mode-status-tag');
  if (statusTag) {
    statusTag.textContent = EasyModeState.enabled ? t('settings.active') : t('settings.inactive');
  }

  // Filter sidebar navigation tabs (in Easy Mode, ONLY home is visible!)
  document.querySelectorAll('.menu-tab').forEach(tab => {
    const tabName = tab.dataset.tab;
    if (EasyModeState.enabled && !EasyModeState.allowedTabs.includes(tabName)) {
      tab.style.display = 'none';
    } else {
      tab.style.display = '';
    }
  });

  // If current active tab is not in allowedTabs in Easy Mode, switch to home
  if (EasyModeState.enabled && !EasyModeState.allowedTabs.includes(currentTab)) {
    switchTab('home');
  }

  // If newly turned on and auth is unlocked, trigger auto-connect
  if (EasyModeState.enabled && Auth.unlocked) {
    autoConnectGameLoop();
  }

  // Maintain license level visibility overrides
  applyLicenseLevelPermissions();

  if (showNotification) {
    showToast(EasyModeState.enabled ? t('settings.toastOn') : t('settings.toastOff'), EasyModeState.enabled ? 'success' : 'info');
  }
}

function openSettingsModal() {
  SoundEngine.playClick();
  const modal = document.getElementById('settings-modal');
  if (modal) {
    modal.removeAttribute('hidden');
    modal.classList.add('open');
    const chk = document.getElementById('chk-easy-mode');
    if (chk) chk.checked = EasyModeState.enabled;
    const row = document.getElementById('settings-row-easy');
    if (row) row.classList.toggle('is-active', EasyModeState.enabled);
    const statusTag = document.getElementById('easy-mode-status-tag');
    if (statusTag) statusTag.textContent = EasyModeState.enabled ? t('settings.active') : t('settings.inactive');
  }
}

function closeSettingsModal() {
  SoundEngine.playClick();
  const modal = document.getElementById('settings-modal');
  if (modal) {
    modal.classList.remove('open');
    modal.setAttribute('hidden', '');
  }
}

// ----------------------------------------------------------
// Easy Mode Action Loading Modal Controller
// ----------------------------------------------------------
const EasyActionModal = {
  currentOp: null,
  timer: null,

  open(op, title, desc, iconSvg) {
    this.currentOp = op;
    clearTimeout(this.timer);

    const modal = document.getElementById('easy-loading-modal');
    const card = document.getElementById('easy-loading-card');
    const titleEl = document.getElementById('easy-loading-title');
    const descEl = document.getElementById('easy-loading-desc');
    const spinner = document.getElementById('easy-loading-spinner');
    const resultIcon = document.getElementById('easy-loading-result-icon');
    const iconEl = document.getElementById('easy-loading-icon');
    const actions = document.getElementById('easy-loading-actions');
    const bar = document.getElementById('easy-loading-bar');

    if (!modal) return;

    modal.hidden = false;
    modal.classList.add('open');
    if (card) {
      card.className = 'action-modal-card is-loading';
    }

    if (titleEl) titleEl.textContent = title;
    if (descEl) descEl.textContent = desc;
    if (spinner) spinner.hidden = false;
    if (resultIcon) resultIcon.hidden = true;
    if (actions) actions.hidden = true;
    if (bar) {
      bar.style.width = '45%';
      bar.className = 'action-modal-progress-fill is-animating';
      bar.style.background = '';
    }

    if (iconEl && iconSvg) {
      iconEl.innerHTML = iconSvg;
    }
  },

  updateMessage(desc) {
    const descEl = document.getElementById('easy-loading-desc');
    if (descEl && desc) descEl.textContent = desc;
  },

  complete(isSuccess, message) {
    if (!this.currentOp) return;
    const card = document.getElementById('easy-loading-card');
    const titleEl = document.getElementById('easy-loading-title');
    const descEl = document.getElementById('easy-loading-desc');
    const spinner = document.getElementById('easy-loading-spinner');
    const resultIcon = document.getElementById('easy-loading-result-icon');
    const actions = document.getElementById('easy-loading-actions');
    const bar = document.getElementById('easy-loading-bar');

    if (card) {
      card.className = `action-modal-card ${isSuccess ? 'is-success' : 'is-error'}`;
    }

    if (spinner) spinner.hidden = true;
    if (resultIcon) {
      resultIcon.hidden = false;
      resultIcon.innerHTML = isSuccess
        ? '<svg viewBox="0 0 24 24" width="42" height="42" fill="none" stroke="#22c55e" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>'
        : '<svg viewBox="0 0 24 24" width="42" height="42" fill="none" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>';
    }

    if (titleEl) {
      titleEl.textContent = isSuccess ? t('easy.modal.success') : t('easy.modal.error');
    }
    if (descEl && message) {
      descEl.textContent = message;
    }

    if (bar) {
      bar.className = 'action-modal-progress-fill';
      bar.style.width = isSuccess ? '100%' : '0%';
      bar.style.background = isSuccess ? '#22c55e' : '#ef4444';
    }

    if (actions) {
      actions.hidden = false;
    }

    // Auto-close on success after 1.8 seconds
    if (isSuccess) {
      this.timer = setTimeout(() => {
        this.close();
      }, 1800);
    }
  },

  close() {
    clearTimeout(this.timer);
    this.currentOp = null;
    const modal = document.getElementById('easy-loading-modal');
    if (modal) {
      modal.classList.remove('open');
      setTimeout(() => {
        modal.hidden = true;
      }, 300);
    }
  }
};

const NoticePopup = {
  open(title, desc, btnText = '') {
    const modal = document.getElementById('notice-popup-modal');
    const titleEl = document.getElementById('notice-popup-title');
    const descEl = document.getElementById('notice-popup-desc');
    const btnClose = document.getElementById('btn-close-notice-popup');

    if (!modal) return;
    if (titleEl) titleEl.textContent = title;
    if (descEl) descEl.textContent = desc;
    if (btnClose && btnText) {
      const span = btnClose.querySelector('span');
      if (span) span.textContent = btnText;
    }

    modal.hidden = false;
    modal.classList.add('open');
  },

  close() {
    const modal = document.getElementById('notice-popup-modal');
    if (modal) {
      modal.classList.remove('open');
      setTimeout(() => {
        modal.hidden = true;
      }, 300);
    }
  }
};

// Select a chip option helper
function selectChipOption(groupSelector, value) {
  const group = document.querySelector(groupSelector);
  if (!group) return;
  const chip = group.querySelector(`.chip-item[data-val="${value}"]`);
  if (chip) {
    group.querySelectorAll('.chip-item').forEach(c => c.classList.remove('selected'));
    chip.classList.add('selected');
  }
}

const selectedChipLabel = group => {
  const chip = document.querySelector(`${group} .chip-item.selected`);
  return chip ? (chip.querySelector('span') || chip).textContent.trim() : '';
};

// Listen for Native WebView Messages
if (IS_NATIVE) {
  window.chrome.webview.addEventListener('message', (event) => {
    handleNativeMessage(event.data);
  });
}

// Live Clock
function startClock() {
  const clock = document.getElementById('clock-display');
  const tick = () => {
    if (clock) {
      const d = new Date();
      const h = String(d.getHours()).padStart(2, '0');
      const m = String(d.getMinutes()).padStart(2, '0');
      const s = String(d.getSeconds()).padStart(2, '0');
      clock.textContent = `${h}:${m}:${s}`;
    }
  };
  setInterval(tick, 1000);
  tick();
}

// Re-render everything that is built from state after a language switch
function rerenderAll() {
  renderTabHeader();
  renderAuth();
  renderLicense();
  renderBridge();
  renderSystemInfo();
  renderPcCheck();
  Object.entries(TweakState.info).forEach(([id, info]) => renderTweakRow(id, info));
  renderResolutionPage();
  renderSavedResolutions();
  renderGameSync();
  renderModSkin();
  renderMemory();
  renderTwitter();
  renderFixer32();
  updateDisplayResUI();
  renderHzSelector();
  applyEasyMode(EasyModeState.enabled);
}

// ----------------------------------------------------------
// Splash / Loading Screen Controller
// ----------------------------------------------------------
function runSplashScreen() {
  const splash = document.getElementById('splash-screen');
  const bar = document.getElementById('splash-progress-bar');
  const pct = document.getElementById('splash-percentage');
  const status = document.getElementById('splash-status-text');

  if (!splash) return;

  const steps = [
    { target: 20, text: 'INITIALIZING ENGINE CORE...', delay: 180 },
    { target: 45, text: 'CALIBRATING MEMORY HOOKS...', delay: 320 },
    { target: 70, text: 'VERIFYING SECURITY INTEGRITY...', delay: 450 },
    { target: 90, text: 'LOADING HARDWARE TELEMETRY...', delay: 350 },
    { target: 100, text: 'CYPEROPT SYSTEM READY', delay: 300 }
  ];

  let currentPct = 0;
  let stepIndex = 0;

  function advance() {
    if (stepIndex >= steps.length) {
      setTimeout(() => {
        splash.classList.add('fade-out');
        setTimeout(() => {
          splash.style.display = 'none';
        }, 700);
      }, 350);
      return;
    }

    const { target, text, delay } = steps[stepIndex];
    if (status) status.textContent = text;

    const interval = setInterval(() => {
      if (currentPct < target) {
        currentPct++;
        if (bar) bar.style.width = `${currentPct}%`;
        if (pct) pct.textContent = `${currentPct}%`;
      } else {
        clearInterval(interval);
        stepIndex++;
        setTimeout(advance, delay);
      }
    }, 10);
  }

  advance();
}

// ----------------------------------------------------------
// Initialize Application on DOM Ready
// ----------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  runSplashScreen();
  switchTab('home', true);
  startClock();
  renderBridge();
  renderAuth();
  onLanguageChange(rerenderAll);

  appendGfxLog('INIT', t('log.init'));
  appendGfxLog('READY', t('log.ready'));

  // Language toggles (login screen + header)
  document.querySelectorAll('[data-lang-toggle]').forEach(btn => {
    btn.addEventListener('click', () => {
      SoundEngine.playClick();
      setLanguage(Lang.current === 'ar' ? 'en' : 'ar');
    });
  });

  // License login form
  const authForm = document.getElementById('auth-form');
  const authInput = document.getElementById('auth-key');
  authForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    if (Auth.state !== 'locked') return;

    const key = (authInput?.value || '').replace(/\s+/g, '');
    if (authInput) authInput.value = key;
    Auth.error = !key ? { code: 'empty' } : !KEY_PATTERN.test(key) ? { code: 'format' } : null;
    Auth.canUpdate = false;
    if (Auth.error) {
      renderAuth();
      shakeAuthPanel();
      focusAuthInput();
      return;
    }

    SoundEngine.playClick();
    Auth.state = 'checking';
    Auth.automatic = false;
    renderAuth();

    clearTimeout(Auth.checkTimeout);
    Auth.checkTimeout = setTimeout(() => {
      if (Auth.state === 'checking') {
        Auth.state = 'locked';
        Auth.error = { code: 'network' };
        renderAuth();
        shakeAuthPanel();
      }
    }, 15000);

    sendAction('auth_login', { key, remember: document.getElementById('auth-remember')?.checked ? 1 : 0 });
  });
  authInput?.addEventListener('input', () => {
    if (!Auth.error) return;
    Auth.error = null;
    renderAuth();
  });
  document.getElementById('auth-paste')?.addEventListener('click', async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (authInput) authInput.value = String(text || '').replace(/\s+/g, '');
      Auth.error = null;
    } catch (err) {
      Auth.error = { code: 'clipboard' };
    }
    renderAuth();
    focusAuthInput();
  });
  document.getElementById('auth-update')?.addEventListener('click', () => sendAction('auth_open_download'));
  document.getElementById('btn-update-retry')?.addEventListener('click', () => {
    sendAction('auth_retry_update');
    handleUpdateProgress({ status: 'downloading', percent: 0, downloaded: 0, total: 0 });
  });
  document.getElementById('btn-update-browser')?.addEventListener('click', () => {
    sendAction('auth_open_download');
  });

  // Logout
  document.getElementById('btn-logout')?.addEventListener('click', () => {
    if (!confirm(t('auth.logoutConfirm'))) return;
    SoundEngine.playClick();
    sendAction('auth_logout');
  });

  // Navigation Sidebar Tabs
  document.querySelectorAll('.menu-tab').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // Chip Selectors
  document.querySelectorAll('.chips-selector').forEach(group => {
    group.addEventListener('click', (e) => {
      const chip = e.target.closest('.chip-item');
      if (!chip) return;

      SoundEngine.playClick();
      group.querySelectorAll('.chip-item').forEach(c => c.classList.remove('selected'));
      chip.classList.add('selected');
    });
  });

  // Hook Toggle Rows (clicks on the switch itself are handled natively by the label)
  document.querySelectorAll('.hook-row').forEach(row => {
    row.addEventListener('click', (e) => {
      if (e.target.closest('.modern-switch')) return;
      SoundEngine.playClick();
      const chk = row.querySelector('input[type="checkbox"]');
      if (chk) chk.checked = !chk.checked;
    });
  });

  // Save GameLoop Registry Button
  const btnSaveGl = document.getElementById('btn-save-gameloop');
  if (btnSaveGl) {
    btnSaveGl.addEventListener('click', () => {
      SoundEngine.playClick();

      const apiMode = parseInt(document.querySelector('#grp-render-api .chip-item.selected')?.dataset.val || "1");
      const resolution = parseInt(document.querySelector('#grp-game-res .chip-item.selected')?.dataset.val || "2");
      const quality = parseInt(document.querySelector('#grp-gl-quality .chip-item.selected')?.dataset.val || "2");
      const fps = parseInt(document.querySelector('#grp-gl-fps .chip-item.selected')?.dataset.val || "0");

      const activeHooks = [301, 302, 303, 304, 307, 308].filter(id => document.getElementById(`chk-${id}`)?.checked);

      appendGfxLog("REGISTRY", t('gl.committing'));
      sendAction('save_gameloop_config', { apiMode, resolution, quality, fps, activeHooks });
    });
  }

  // GFX Actions
  const btnConnect = document.getElementById('btn-connect-gameloop');
  if (btnConnect) {
    btnConnect.addEventListener('click', () => {
      SoundEngine.playClick();
      Bridge.lastLogged = '';
      appendGfxLog("ADB", Bridge.emulatorRunning ? t('log.checkBridge') : t('log.startingGl'));
      BoostState.results = [];
      renderBoost();
      sendAction('connect_gameloop', { autoBoost: document.getElementById('chk-auto-boost')?.checked ? 1 : 0 });
    });
  }

  const btnApplyGfx = document.getElementById('btn-apply-gfx');
  if (btnApplyGfx) {
    btnApplyGfx.addEventListener('click', () => {
      if (Bridge.state !== 'connected') {
        showToast(t('bridge.connectFirst'), 'error');
        return;
      }
      SoundEngine.playClick();

      const pick = (grp, def) => parseInt(document.querySelector(`${grp} .chip-item.selected`)?.dataset.val || def);
      const version = pick('#grp-gfx-version', "1");
      const quality = pick('#grp-gfx-quality', "2");
      const fps = pick('#grp-gfx-fps', "5");
      const style = pick('#grp-gfx-style', "1");
      const shadows = pick('#grp-gfx-shadows', "1");

      appendGfxLog("GFX", t('log.applyProfile', { q: selectedChipLabel('#grp-gfx-quality') || quality, f: selectedChipLabel('#grp-gfx-fps') || fps }));
      sendAction('apply_gfx', { version, quality, fps, style, shadows });
    });
  }

  const btnReadGame = document.getElementById('btn-read-game');
  if (btnReadGame) {
    btnReadGame.addEventListener('click', () => {
      if (Bridge.state !== 'connected') return;
      SoundEngine.playClick();
      Bridge.readingGame = true;
      renderBridge();
      sendAction('read_game_gfx');
    });
  }

  const btnKill = document.getElementById('btn-kill-emulator');
  if (btnKill) {
    btnKill.addEventListener('click', () => {
      SoundEngine.playClick();
      appendGfxLog("KILL", t('log.kill'));
      sendAction('kill_emulator');
    });
  }

  const btnResetGuest = document.getElementById('btn-reset-guest');
  if (btnResetGuest) {
    btnResetGuest.addEventListener('click', () => {
      SoundEngine.playClick();
      appendGfxLog("GUEST", "Resetting guest account for Global (com.tencent.ig)...");
      btnResetGuest.disabled = true;
      btnResetGuest.classList.add('is-busy');
      sendAction('reset_guest');
    });
  }

  const btnClearLog = document.getElementById('btn-clear-log');
  if (btnClearLog) {
    btnClearLog.addEventListener('click', () => {
      const consoleEl = document.getElementById('gfx-log-console');
      if (consoleEl) consoleEl.innerHTML = '';
      Bridge.lastLogged = '';
    });
  }

  // Tweaks Category Filtering
  document.querySelectorAll('.filter-tab-btn').forEach(tab => {
    tab.addEventListener('click', () => {
      SoundEngine.playClick();
      document.querySelectorAll('.filter-tab-btn').forEach(tb => tb.classList.remove('active'));
      tab.classList.add('active');

      const filter = tab.dataset.filter;
      document.querySelectorAll('.tweak-item, .tweak-toggle-row').forEach(item => {
        item.hidden = !(filter === 'all' || item.dataset.category === filter);
      });
    });
  });

  // Scopes Search
  const searchInput = document.getElementById('scopes-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase().trim();
      let visible = 0;
      document.querySelectorAll('.scope-card').forEach(card => {
        const text = (card.dataset.search || card.innerText).toLowerCase();
        const match = !query || text.includes(query);
        card.hidden = !match;
        if (match) visible++;
      });
      const empty = document.getElementById('scopes-empty');
      if (empty) empty.hidden = visible > 0;
    });
  }

  // Reload Hardware Specs
  const reloadBtn = document.getElementById('btn-reload-specs');
  if (reloadBtn) {
    reloadBtn.addEventListener('click', () => {
      sendAction('get_system_info');
      showToast(t('toast.telemetry'), 'info');
    });
  }

  // Master Turbo Boost Action
  const turboBtn = document.getElementById('btn-turbo-boost');
  if (turboBtn) {
    turboBtn.addEventListener('click', () => {
      SoundEngine.playClick();
      showToast(t('toast.turbo'), 'info');
      sendAction('turbo_boost');
    });
  }

  // Tweak toggles
  document.querySelectorAll('input[data-tweak-toggle]').forEach(input => {
    input.addEventListener('change', () => {
      SoundEngine.playClick();
      const id = input.dataset.tweakToggle;
      const wanted = input.checked;
      input.checked = !wanted; // show the real state until the backend confirms
      requestTweak(id, wanted);
    });
  });
  document.querySelectorAll('.tweak-toggle-row').forEach(row => {
    row.addEventListener('click', (e) => {
      if (e.target.closest('.modern-switch')) return;
      const input = row.querySelector('input[data-tweak-toggle]');
      if (input && !input.disabled) input.click();
    });
  });

  // Resolution page
  renderResolutionPage();
  renderSavedResolutions();
  document.getElementById('btn-res-save')?.addEventListener('click', () => {
    SoundEngine.playClick();
    sendAction('save_resolution');
  });
  document.getElementById('btn-res-restart')?.addEventListener('click', () => {
    SoundEngine.playClick();
    ResState.restarting = true;
    renderResolutionPage();
    appendGfxLog('LAUNCH', t('log.restartRes'));
    sendAction('restart_gameloop');
  });
  document.getElementById('btn-res-apply-custom')?.addEventListener('click', () => {
    const w = parseInt(document.getElementById('res-input-w').value, 10);
    const h = parseInt(document.getElementById('res-input-h').value, 10);
    const dpiRaw = document.getElementById('res-input-dpi').value.trim();
    const dpi = dpiRaw ? parseInt(dpiRaw, 10) : 0;
    if (!(w >= 640 && w <= 4096 && h >= 480 && h <= 4096)) {
      showToast(t('res.errRange'), 'error');
      return;
    }
    if (dpiRaw && !(dpi >= 120 && dpi <= 640)) {
      showToast(t('res.errDpi'), 'error');
      return;
    }
    SoundEngine.playClick();
    sendAction('set_resolution', { width: w, height: h, dpi });
  });

  // GameLoop boost
  const autoBoost = document.getElementById('chk-auto-boost');
  if (autoBoost) {
    autoBoost.checked = localStorage.getItem('cyperopt.autoBoost') !== '0';
    autoBoost.addEventListener('change', () => {
      localStorage.setItem('cyperopt.autoBoost', autoBoost.checked ? '1' : '0');
      renderBoost();
    });
  }
  document.getElementById('btn-run-boost')?.addEventListener('click', () => {
    if (Bridge.state !== 'connected' || BoostState.running) return;
    SoundEngine.playClick();
    sendAction('adb_boost');
  });
  renderBoost();

  // Paks Tool
  document.getElementById('btn-paks-connect')?.addEventListener('click', () => {
    switchTab('gfx');
    document.getElementById('btn-connect-gameloop')?.click();
  });
  document.getElementById('btn-paks-refresh')?.addEventListener('click', () => { SoundEngine.playClick(); requestPaksInfo(); });
  document.getElementById('btn-paks-open')?.addEventListener('click', () => sendAction('open_paks_folder', { package: PaksState.selected }));
  document.getElementById('btn-paks-cancel')?.addEventListener('click', () => sendAction('cancel_paks'));
  document.getElementById('btn-paks-pull')?.addEventListener('click', () => {
    const game = selectedPaksGame();
    if (!game) return;
    if (game.backup && game.backup.exists && !confirm(t('paks.confirmReplace', { date: game.backup.date }))) return;
    SoundEngine.playClick();
    PaksState.busy = true;
    PaksState.op = 'pull';
    renderPaks();
    sendAction('pull_paks', { package: game.package });
  });
  document.getElementById('btn-paks-push')?.addEventListener('click', () => {
    const game = selectedPaksGame();
    if (!game) return;
    SoundEngine.playClick();
    PaksState.busy = true;
    PaksState.op = 'push';
    renderPaks();
    sendAction('push_paks', { package: game.package });
  });
  renderPaks();

  // ModSkin Actions
  document.getElementById('btn-modskin-add')?.addEventListener('click', () => {
    if (isLevel2License()) {
      showToast(t('auth.err.level2Modskin'), 'error');
      return;
    }
    SoundEngine.playClick();
    ModSkinState.status = 'busy';
    ModSkinState.busyKey = 'ms.injectingBadge';
    ModSkinState.op = 'add';
    renderModSkin();
    appendStatusLog('modskin-log-box', 'modskin-log-item', 'busy', t('ms.log.init'));
    sendAction('modskin_add');
  });

  document.getElementById('btn-modskin-remove')?.addEventListener('click', () => {
    if (isLevel2License()) {
      showToast(t('auth.err.level2Modskin'), 'error');
      return;
    }
    SoundEngine.playClick();
    ModSkinState.status = 'busy';
    ModSkinState.busyKey = 'ms.removingBadge';
    ModSkinState.op = 'remove';
    renderModSkin();
    appendStatusLog('modskin-log-box', 'modskin-log-item', 'busy', t('ms.log.wipe'));
    sendAction('modskin_remove');
  });

  // Memory Actions
  document.getElementById('btn-memory-add')?.addEventListener('click', () => {
    if (isLevel2License()) {
      showToast(t('auth.err.level2Memory'), 'error');
      return;
    }
    SoundEngine.playClick();
    MemoryState.status = 'busy';
    MemoryState.busyKey = 'mem.injectingBadge';
    MemoryState.op = 'add';
    renderMemory();
    appendStatusLog('memory-log-box', 'modskin-log-item', 'busy', t('mem.log.init'));
    sendAction('memory_add');
  });

  document.getElementById('btn-memory-remove')?.addEventListener('click', () => {
    if (isLevel2License()) {
      showToast(t('auth.err.level2Memory'), 'error');
      return;
    }
    SoundEngine.playClick();
    MemoryState.status = 'busy';
    MemoryState.busyKey = 'mem.removingBadge';
    MemoryState.op = 'remove';
    renderMemory();
    appendStatusLog('memory-log-box', 'modskin-log-item', 'busy', t('mem.log.wipe'));
    sendAction('memory_remove');
  });

  // Twitter Login Fix Listeners
  document.getElementById('btn-twitter-apply')?.addEventListener('click', () => {
    SoundEngine.playClick();
    TwitterState.status = 'busy';
    TwitterState.busyKey = 'tt.applying';
    renderTwitter();
    appendStatusLog('twitter-log-box', 'twitter-log-item', 'busy', t('tt.log.start'));
    sendAction('fix_twitter_apply');
  });

  document.getElementById('btn-twitter-restore')?.addEventListener('click', () => {
    SoundEngine.playClick();
    TwitterState.status = 'busy';
    TwitterState.busyKey = 'tt.restoring';
    renderTwitter();
    appendStatusLog('twitter-log-box', 'twitter-log-item', 'busy', t('tt.log.restore'));
    sendAction('fix_twitter_restore');
  });

  // Fixer 32Bit Listeners
  document.getElementById('btn-fixer32-apply')?.addEventListener('click', () => {
    SoundEngine.playClick();
    Fixer32State.busy = true;
    renderFixer32();
    const logEl = document.getElementById('fixer32-log-msg');
    if (logEl) {
      logEl.textContent = 'Applying 32Bit Stability Shield...';
      logEl.className = 'twitter-log-item info';
    }
    sendAction('apply_hosts_fix');
  });

  document.getElementById('btn-fixer32-remove')?.addEventListener('click', () => {
    SoundEngine.playClick();
    Fixer32State.busy = true;
    renderFixer32();
    const logEl = document.getElementById('fixer32-log-msg');
    if (logEl) {
      logEl.textContent = 'Restoring default configuration...';
      logEl.className = 'twitter-log-item info';
    }
    sendAction('remove_hosts_fix');
  });

  // Roblox Vpn Listeners
  document.getElementById('btn-roblox-vpn-toggle')?.addEventListener('click', () => {
    SoundEngine.playClick();
    if (RobloxVpnState.status === 'connected') {
      RobloxVpnState.busy = true;
      RobloxVpnState.status = 'disconnecting';
      renderRobloxVpn();
      const logEl = document.getElementById('rvpn-log-msg');
      if (logEl) {
        logEl.textContent = t('rvpn.logDisconnecting');
        logEl.className = 'twitter-log-item info';
      }
      sendAction('disconnect_roblox_vpn');
    } else {
      RobloxVpnState.busy = true;
      RobloxVpnState.status = 'connecting';
      renderRobloxVpn();
      const logEl = document.getElementById('rvpn-log-msg');
      if (logEl) {
        logEl.textContent = t('rvpn.logConnecting');
        logEl.className = 'twitter-log-item info';
      }
      sendAction('connect_roblox_vpn');
    }
  });

  document.getElementById('btn-create-vpn-shortcut')?.addEventListener('click', () => {
    SoundEngine.playClick();
    sendAction('create_vpn_shortcut');
  });

  document.getElementById('btn-roblox-vpn-ping')?.addEventListener('click', () => {
    SoundEngine.playClick();
    const pingVal = document.getElementById('rvpn-ping-val');
    if (pingVal) pingVal.textContent = '...';
    sendAction('ping_roblox_vpn');
  });

  // Display Resolution (iPad View) Page
  const dresInW = document.getElementById('dres-input-w');
  const dresInH = document.getElementById('dres-input-h');

  const onDimChange = () => {
    const w = parseInt(dresInW?.value, 10) || 1440;
    const h = parseInt(dresInH?.value, 10) || 1080;
    DisplayResState.selectedWidth = w;
    DisplayResState.selectedHeight = h;
    updateDisplayResUI();
  };

  dresInW?.addEventListener('input', onDimChange);
  dresInH?.addEventListener('input', onDimChange);

  // Stepper buttons
  document.getElementById('dres-w-up')?.addEventListener('click', () => {
    SoundEngine.playClick();
    DisplayResState.selectedWidth = (DisplayResState.selectedWidth || 1440) + 10;
    updateDisplayResUI();
  });
  document.getElementById('dres-w-down')?.addEventListener('click', () => {
    SoundEngine.playClick();
    DisplayResState.selectedWidth = Math.max(640, (DisplayResState.selectedWidth || 1440) - 10);
    updateDisplayResUI();
  });
  document.getElementById('dres-h-up')?.addEventListener('click', () => {
    SoundEngine.playClick();
    DisplayResState.selectedHeight = (DisplayResState.selectedHeight || 1080) + 10;
    updateDisplayResUI();
  });
  document.getElementById('dres-h-down')?.addEventListener('click', () => {
    SoundEngine.playClick();
    DisplayResState.selectedHeight = Math.max(480, (DisplayResState.selectedHeight || 1080) - 10);
    updateDisplayResUI();
  });

  // Quick chips
  document.querySelectorAll('.dres-chip[data-set-w]').forEach(chip => {
    chip.addEventListener('click', () => {
      SoundEngine.playClick();
      DisplayResState.selectedWidth = parseInt(chip.dataset.setW, 10);
      updateDisplayResUI();
    });
  });
  document.querySelectorAll('.dres-chip[data-set-h]').forEach(chip => {
    chip.addEventListener('click', () => {
      SoundEngine.playClick();
      DisplayResState.selectedHeight = parseInt(chip.dataset.setH, 10);
      updateDisplayResUI();
    });
  });

  // Preset cards
  document.querySelectorAll('.dres-preset-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.dres-preset-apply-btn')) return;
      SoundEngine.playClick();
      DisplayResState.selectedWidth = parseInt(card.dataset.pw, 10);
      DisplayResState.selectedHeight = parseInt(card.dataset.ph, 10);
      updateDisplayResUI();
    });
  });
  document.querySelectorAll('.dres-preset-apply-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      SoundEngine.playClick();
      const card = btn.closest('.dres-preset-card');
      if (card) {
        DisplayResState.selectedWidth = parseInt(card.dataset.pw, 10);
        DisplayResState.selectedHeight = parseInt(card.dataset.ph, 10);
        updateDisplayResUI();
      }
      sendAction('set_display_res', {
        width: DisplayResState.selectedWidth,
        height: DisplayResState.selectedHeight,
        hz: DisplayResState.selectedHz,
        syncGameloop: 1,
        launchGame: 0
      });
    });
  });

  // Preferred Hz checkbox
  const chkPrefHz = document.getElementById('dres-chk-pref-hz');
  if (chkPrefHz) {
    chkPrefHz.checked = localStorage.getItem('cyperopt_pref_hz') !== '0';
    chkPrefHz.addEventListener('change', () => {
      localStorage.setItem('cyperopt_pref_hz', chkPrefHz.checked ? '1' : '0');
    });
  }

  // Favorite preset
  document.getElementById('dres-btn-save-fav')?.addEventListener('click', () => {
    SoundEngine.playClick();
    const fav = {
      w: DisplayResState.selectedWidth,
      h: DisplayResState.selectedHeight,
      hz: DisplayResState.selectedHz
    };
    localStorage.setItem('cyperopt_dres_fav', JSON.stringify(fav));
    showToast(`Saved ${fav.w}×${fav.h} @ ${fav.hz}Hz as favorite preset!`, 'success');
  });

  // Action buttons
  document.getElementById('dres-btn-apply')?.addEventListener('click', () => {
    SoundEngine.playClick();
    sendAction('set_display_res', {
      width: DisplayResState.selectedWidth,
      height: DisplayResState.selectedHeight,
      hz: DisplayResState.selectedHz,
      syncGameloop: 1,
      launchGame: 1
    });
  });

  document.getElementById('dres-btn-restore')?.addEventListener('click', () => {
    SoundEngine.playClick();
    sendAction('restore_display_res');
  });

  renderHzSelector();
  updateDisplayResUI();

  // Settings Modal & Easy Mode
  document.getElementById('btn-settings')?.addEventListener('click', openSettingsModal);
  document.getElementById('btn-close-settings')?.addEventListener('click', closeSettingsModal);
  document.getElementById('settings-backdrop')?.addEventListener('click', closeSettingsModal);

  const chkEasy = document.getElementById('chk-easy-mode');
  if (chkEasy) {
    chkEasy.addEventListener('change', (e) => {
      SoundEngine.playClick();
      applyEasyMode(e.target.checked, true);
    });
  }

  document.getElementById('settings-row-easy')?.addEventListener('click', (e) => {
    if (e.target.closest('.modern-switch')) return;
    const chk = document.getElementById('chk-easy-mode');
    if (chk) {
      chk.checked = !chk.checked;
      SoundEngine.playClick();
      applyEasyMode(chk.checked, true);
    }
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const modal = document.getElementById('settings-modal');
      if (modal && modal.classList.contains('open')) {
        closeSettingsModal();
      }
    }
  });

  // Hero Connect Button
  document.getElementById('btn-hero-connect-gameloop')?.addEventListener('click', () => {
    SoundEngine.playClick();
    autoConnectGameLoop();
  });

  // Easy Mode Dashboard Actions
  document.getElementById('btn-easy-connect')?.addEventListener('click', () => {
    SoundEngine.playClick();
    autoConnectGameLoop();
  });

  document.getElementById('btn-easy-reset-guest')?.addEventListener('click', () => {
    SoundEngine.playClick();
    const btn = document.getElementById('btn-easy-reset-guest');
    if (btn) btn.classList.add('is-busy');
    EasyActionModal.open(
      'reset_guest',
      t('easy.modal.resetGuestTitle'),
      t('easy.modal.resetGuestDesc'),
      '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><line x1="19" y1="8" x2="19" y2="14"></line><line x1="22" y1="11" x2="16" y2="11"></line>'
    );
    sendAction('reset_guest');
  });

  document.getElementById('btn-easy-fix-twitter')?.addEventListener('click', () => {
    SoundEngine.playClick();
    TwitterState.status = 'busy';
    TwitterState.busyKey = 'tt.applying';
    renderTwitter();
    EasyActionModal.open(
      'fix_twitter',
      t('easy.modal.twitterTitle'),
      t('easy.modal.twitterDesc'),
      '<path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"></path>'
    );
    sendAction('fix_twitter_apply');
  });

  document.getElementById('btn-easy-modskin')?.addEventListener('click', () => {
    if (isLevel2License()) {
      showToast(t('auth.err.level2Modskin'), 'error');
      return;
    }
    SoundEngine.playClick();
    ModSkinState.status = 'busy';
    ModSkinState.busyKey = 'ms.injectingBadge';
    ModSkinState.op = 'add';
    renderModSkin();
    EasyActionModal.open(
      'modskin',
      t('easy.modal.modskinTitle'),
      t('easy.modal.modskinDesc'),
      '<path d="M12 2L2 7l10 5 10-5-10-5z"></path><path d="M2 17l10 5 10-5"></path><path d="M2 12l10 5 10-5"></path>'
    );
    sendAction('modskin_add');
  });

  document.getElementById('btn-easy-memory')?.addEventListener('click', () => {
    if (isLevel2License()) {
      showToast(t('auth.err.level2Memory'), 'error');
      return;
    }
    SoundEngine.playClick();
    MemoryState.status = 'busy';
    MemoryState.busyKey = 'mem.injectingBadge';
    MemoryState.op = 'add';
    renderMemory();
    EasyActionModal.open(
      'memory',
      t('easy.modal.memoryTitle'),
      t('easy.modal.memoryDesc'),
      '<rect x="4" y="4" width="16" height="16" rx="2"></rect><rect x="9" y="9" width="6" height="6"></rect><line x1="9" y1="1" x2="9" y2="4"></line><line x1="15" y1="1" x2="15" y2="4"></line><line x1="9" y1="20" x2="9" y2="23"></line><line x1="15" y1="20" x2="15" y2="23"></line><line x1="20" y1="9" x2="23" y2="9"></line><line x1="20" y1="14" x2="23" y2="14"></line><line x1="1" y1="9" x2="4" y2="9"></line><line x1="1" y1="14" x2="4" y2="14"></line>'
    );
    sendAction('memory_add');
  });

  // Action Loading Modal Close handlers
  document.getElementById('btn-close-easy-loading')?.addEventListener('click', () => {
    SoundEngine.playClick();
    EasyActionModal.close();
  });
  document.getElementById('easy-loading-backdrop')?.addEventListener('click', () => {
    if (EasyActionModal.currentOp && document.getElementById('easy-loading-actions')?.hidden === false) {
      EasyActionModal.close();
    }
  });

  document.getElementById('btn-close-notice-popup')?.addEventListener('click', () => {
    SoundEngine.playClick();
    NoticePopup.close();
  });

  document.getElementById('notice-popup-backdrop')?.addEventListener('click', () => {
    NoticePopup.close();
  });

  document.getElementById('btn-easy-ipad-view')?.addEventListener('click', () => {
    SoundEngine.playClick();
    // Temporary Advanced Mode for this session:
    // DO NOT change localStorage ('cyperopt_easy_mode' remains '1')
    EasyModeState.enabled = false;
    document.body.classList.remove('is-easy-mode');

    // Show all tabs in sidebar
    document.querySelectorAll('.menu-tab').forEach(tab => {
      tab.style.display = '';
    });

    // Enforce license level restrictions (e.g. keep ModSkin hidden for Level 2)
    applyLicenseLevelPermissions();

    // Hide easy mode badge in header
    const badge = document.getElementById('header-easy-badge');
    if (badge) badge.style.display = 'none';

    // Navigate to iPad view tab (display-res)
    switchTab('display-res');
    showToast(t('easy.tempAdvancedToast'), 'info');
  });

  document.getElementById('btn-facebook-apply')?.addEventListener('click', () => {
    SoundEngine.playClick();
    FacebookState.status = 'busy';
    FacebookState.busyKey = 'ms.working';
    renderFacebook();
    sendAction('fix_facebook_login');
  });

  document.getElementById('btn-easy-fix-facebook')?.addEventListener('click', () => {
    SoundEngine.playClick();
    FacebookState.status = 'busy';
    FacebookState.busyKey = 'ms.working';
    renderFacebook();
    EasyActionModal.open(
      'fix_facebook',
      t('easy.btnFacebook'),
      t('easy.descFacebook'),
      '<path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>'
    );
    sendAction('fix_facebook_login');
  });

  document.getElementById('btn-easy-roblox-vpn')?.addEventListener('click', () => {
    SoundEngine.playClick();
    switchTab('roblox-vpn');
  });

  // Load saved Easy Mode state (Cyber Cafe mode)
  applyEasyMode(localStorage.getItem('cyperopt_easy_mode') === '1');

  // Everything else waits for the license check
  sendAction('auth_status');
});
