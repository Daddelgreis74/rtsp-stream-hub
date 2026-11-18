// Main Application Logic for RTSP Stream Hub with Neo Deck Glassmorphism UI & Full i18n

const translations = {
  en: {
    loginSubtitle: 'Please sign in to continue',
    usernameLabel: 'Username',
    passwordLabel: 'Password',
    loginBtn: 'Sign In',
    navCameras: 'Cameras',
    navUsers: 'User Management',
    changePasswordBtn: 'Password',
    logoutBtn: 'Logout',
    myCamerasTitle: 'My Cameras',
    camerasSubtitle: 'Centralized live stream multiplexer & dashboard proxy',
    liveGridBtn: 'Live Grid',
    liveGridActiveBtn: 'Stop Live Grid',
    onvifScanBtn: 'ONVIF Discovery',
    addCameraBtn: 'Add Camera',
    usersTitle: 'User Management',
    usersSubtitle: 'Role hierarchy: Admin, CoAdmin, Moderator & User',
    createUserBtn: 'Create User',
    thUsername: 'Username',
    thRole: 'Role',
    thViewPermission: 'Can View Cameras',
    thEditPermission: 'Can Edit Cameras',
    thActions: 'Actions',
    modalAddCamera: 'Add Camera',
    modalEditCamera: 'Edit Camera',
    labelCameraName: 'Camera Name',
    labelCameraUrl: 'Camera Stream URL (RTSP, HTTP-MJPEG, HLS, Snapshot)',
    helpCameraUrl: 'Supports all stream formats (RTSP H.264/H.265, webcams, HLS streams and JPEG snapshots).',
    labelStreamType: 'Stream Type',
    optAuto: 'Auto Detect',
    optRtsp: 'RTSP Stream (H.264 / H.265)',
    optMjpeg: 'Direct MJPEG Stream',
    optHls: 'HLS Livestream (.m3u8)',
    optSnapshot: 'JPEG/PNG Snapshot (Interval)',
    labelInterval: 'Interval',
    labelDashboardLink: 'Dashboard Stream Link (MJPEG)',
    helpDashboardLink: 'Long-lived tokenized link for your SmartHome Dashboard (valid for 20 years).',
    copyDashLinkBtn: 'Copy Dashboard Link',
    copiedDashLinkBtn: 'Copied!',
    btnSave: 'Save',
    modalCreateUser: 'Create New User',
    modalEditUser: 'Edit User',
    optRoleAdmin: 'Administrator (Admin)',
    optRoleCoAdmin: 'Co-Administrator (CoAdmin)',
    optRoleModerator: 'Moderator',
    optRoleUser: 'Standard User (User)',
    roleBadgeAdmin: 'Admin',
    roleBadgeCoAdmin: 'CoAdmin',
    roleBadgeModerator: 'Moderator',
    roleBadgeUser: 'User',
    helpPasswordEdit: 'Leave empty to keep the current password.',
    helpRolePermissions: 'Selecting a role presets default camera permissions (can be customized below).',
    permAllowView: 'Can view cameras',
    permAllowEdit: 'Can edit cameras',
    btnCreate: 'Create',
    modalChangePassword: 'Change Own Password',
    currentPasswordLabel: 'Current Password',
    newPasswordLabel: 'New Password',
    confirmPasswordLabel: 'Confirm New Password',
    passwordMismatchError: 'New passwords do not match.',
    passwordChangeSuccess: 'Password updated successfully.',
    modalOnvifTitle: 'ONVIF Camera Discovery',
    onvifScanDesc: 'Scans local network for ONVIF compliant cameras.',
    btnStartScan: 'Start Scan',
    onvifScanning: 'Scanning network... Please wait...',
    onvifNoCameras: 'No ONVIF cameras found on the local network.',
    playerLoading: 'Loading live MJPEG stream...',
    playerError: 'Transcoding error (Check stream URL or camera availability)',
    noCamerasRegistered: 'No cameras registered yet. Click "Add Camera" or "ONVIF Discovery" to get started.',
    startStream: 'Open Live Stream',
    editBtn: 'Edit',
    deleteBtn: 'Delete',
    deleteCameraConfirm: 'Are you sure you want to delete this camera?',
    deleteUserConfirm: 'Are you sure you want to delete this user?',
    permissionYes: 'Allowed',
    permissionNo: 'Denied',
    btnAdopt: 'Add'
  },
  de: {
    loginSubtitle: 'Bitte melde dich an',
    usernameLabel: 'Benutzername',
    passwordLabel: 'Passwort',
    loginBtn: 'Einloggen',
    navCameras: 'Kameras',
    navUsers: 'Benutzerverwaltung',
    changePasswordBtn: 'Passwort',
    logoutBtn: 'Logout',
    myCamerasTitle: 'Meine Kameras',
    camerasSubtitle: 'Zentraler Livestream-Multiplexer & SmartHome-Dashboard Proxy',
    liveGridBtn: 'Live-Grid',
    liveGridActiveBtn: 'Live-Grid beenden',
    onvifScanBtn: 'ONVIF-Suche',
    addCameraBtn: 'Kamera hinzufügen',
    usersTitle: 'Benutzerverwaltung',
    usersSubtitle: 'Rollen-Hierarchie: Admin, CoAdmin, Moderator & User',
    createUserBtn: 'Benutzer erstellen',
    thUsername: 'Benutzername',
    thRole: 'Rolle',
    thViewPermission: 'Kameras ansehen',
    thEditPermission: 'Kameras bearbeiten',
    thActions: 'Aktionen',
    modalAddCamera: 'Kamera hinzufügen',
    modalEditCamera: 'Kamera bearbeiten',
    labelCameraName: 'Kameraname',
    labelCameraUrl: 'Kamera Stream URL (RTSP, HTTP-MJPEG, HLS, Snapshot)',
    helpCameraUrl: 'Unterstützt alle Formate (RTSP H.264/H.265, Webcams, HLS Streams und JPEG Bilder).',
    labelStreamType: 'Stream-Typ',
    optAuto: 'Automatisch erkennen',
    optRtsp: 'RTSP Stream (H.264 / H.265)',
    optMjpeg: 'Direkter MJPEG Stream',
    optHls: 'HLS Livestream (.m3u8)',
    optSnapshot: 'JPEG/PNG Snapshot (Intervall)',
    labelInterval: 'Intervall',
    labelDashboardLink: 'Dashboard Stream Link (MJPEG)',
    helpDashboardLink: 'Dauerhafter Link für dein SmartHome-Dashboard (20 Jahre gültig).',
    copyDashLinkBtn: 'Dashboard-Link kopieren',
    copiedDashLinkBtn: 'Kopiert!',
    btnSave: 'Speichern',
    modalCreateUser: 'Neuen Benutzer erstellen',
    modalEditUser: 'Benutzer bearbeiten',
    optRoleAdmin: 'Administrator (Admin)',
    optRoleCoAdmin: 'Co-Administrator (CoAdmin)',
    optRoleModerator: 'Moderator',
    optRoleUser: 'Standard Benutzer (User)',
    roleBadgeAdmin: 'Admin',
    roleBadgeCoAdmin: 'CoAdmin',
    roleBadgeModerator: 'Moderator',
    roleBadgeUser: 'User',
    helpPasswordEdit: 'Leer lassen, um das aktuelle Passwort beizubehalten.',
    helpRolePermissions: 'Die Rollenauswahl setzt passende Kamera-Rechte voraus (unten individuell anpassbar).',
    permAllowView: 'Kameras ansehen erlaubt',
    permAllowEdit: 'Kameras bearbeiten erlaubt',
    btnCreate: 'Erstellen',
    modalChangePassword: 'Eigenes Passwort ändern',
    currentPasswordLabel: 'Aktuelles Passwort',
    newPasswordLabel: 'Neues Passwort',
    confirmPasswordLabel: 'Neues Passwort bestätigen',
    passwordMismatchError: 'Die neuen Passwörter stimmen nicht überein.',
    passwordChangeSuccess: 'Passwort wurde erfolgreich geändert.',
    modalOnvifTitle: 'ONVIF Kamera-Suchlauf',
    onvifScanDesc: 'Scanner sucht nach Kameras im lokalen Netzwerk.',
    btnStartScan: 'Suchlauf starten',
    onvifScanning: 'Netzwerk-Suchlauf läuft... Bitte warten...',
    onvifNoCameras: 'Keine ONVIF Kameras im Netzwerk gefunden.',
    playerLoading: 'Live MJPEG Stream wird geladen...',
    playerError: 'Transcodierungs-Fehler (Prüfe die Stream URL oder Erreichbarkeit)',
    noCamerasRegistered: 'Noch keine Kameras eingerichtet. Klicke auf "Kamera hinzufügen" oder "ONVIF-Suche".',
    startStream: 'Livestream öffnen',
    editBtn: 'Bearbeiten',
    deleteBtn: 'Löschen',
    deleteCameraConfirm: 'Möchtest du diese Kamera wirklich löschen?',
    deleteUserConfirm: 'Möchtest du diesen Benutzer wirklich löschen?',
    permissionYes: 'Erlaubt',
    permissionNo: 'Gesperrt',
    btnAdopt: 'Hinzufügen'
  }
};

let currentLang = localStorage.getItem('rsh_lang') || 'en';

function t(key) {
  return (translations[currentLang] && translations[currentLang][key]) || translations['en'][key] || key;
}

const state = {
  token: localStorage.getItem('token') || null,
  user: JSON.parse(localStorage.getItem('user')) || null,
  activeCameraId: null,
  liveGridMode: false,
  camerasList: [],
  usersList: []
};

// UI Elements
const el = {
  loginSection: document.getElementById('loginSection'),
  mainSection: document.getElementById('mainSection'),
  loginForm: document.getElementById('loginForm'),
  usernameInput: document.getElementById('usernameInput'),
  passwordInput: document.getElementById('passwordInput'),
  loginAlert: document.getElementById('loginAlert'),
  
  userBadge: document.getElementById('userBadge'),
  userAvatarInitial: document.getElementById('userAvatarInitial'),
  btnChangeOwnPassword: document.getElementById('btnChangeOwnPassword'),
  btnLogoutBtn: document.getElementById('btnLogoutBtn'),
  btnThemeToggle: document.getElementById('btnThemeToggle'),
  themeIcon: document.getElementById('themeIcon'),
  btnLangToggle: document.getElementById('btnLangToggle'),
  btnLoginLangToggle: document.getElementById('btnLoginLangToggle'),
  
  btnCamerasView: document.getElementById('btnCamerasView'),
  btnAdminView: document.getElementById('btnAdminView'),
  camerasPage: document.getElementById('camerasPage'),
  adminPage: document.getElementById('adminPage'),
  
  cameraGrid: document.getElementById('cameraGrid'),
  btnToggleLiveGrid: document.getElementById('btnToggleLiveGrid'),
  btnDiscoverOpenBtn: document.getElementById('btnDiscoverOpenBtn'),
  btnAddCameraModalOpenBtn: document.getElementById('btnAddCameraModalOpenBtn'),
  userTableBody: document.getElementById('userTableBody'),
  btnAddUserModalOpenBtn: document.getElementById('btnAddUserModalOpenBtn'),
  
  cameraModal: new bootstrap.Modal(document.getElementById('cameraModal')),
  cameraModalTitle: document.getElementById('cameraModalTitle'),
  cameraForm: document.getElementById('cameraForm'),
  cameraIdField: document.getElementById('cameraIdField'),
  cameraNameInput: document.getElementById('cameraNameInput'),
  cameraUrlInput: document.getElementById('cameraUrlInput'),
  cameraStreamType: document.getElementById('cameraStreamType'),
  cameraRefreshInterval: document.getElementById('cameraRefreshInterval'),
  refreshIntervalContainer: document.getElementById('refreshIntervalContainer'),
  dashboardLinkContainer: document.getElementById('dashboardLinkContainer'),
  dashboardLinkInput: document.getElementById('dashboardLinkInput'),
  btnCopyDashboardLink: document.getElementById('btnCopyDashboardLink'),
  
  userModal: new bootstrap.Modal(document.getElementById('userModal')),
  userModalTitle: document.getElementById('userModalTitle'),
  userForm: document.getElementById('userForm'),
  editUserIdField: document.getElementById('editUserIdField'),
  newUsernameInput: document.getElementById('newUsernameInput'),
  newPasswordInput: document.getElementById('newPasswordInput'),
  passwordEditHelp: document.getElementById('passwordEditHelp'),
  newUserRole: document.getElementById('newUserRole'),
  optRoleAdminEl: document.getElementById('optRoleAdminEl'),
  optRoleCoAdminEl: document.getElementById('optRoleCoAdminEl'),
  newUserView: document.getElementById('newUserView'),
  newUserEdit: document.getElementById('newUserEdit'),
  btnSaveUser: document.getElementById('btnSaveUser'),
  
  ownPasswordModal: new bootstrap.Modal(document.getElementById('ownPasswordModal')),
  ownPasswordForm: document.getElementById('ownPasswordForm'),
  currentOwnPasswordInput: document.getElementById('currentOwnPasswordInput'),
  newOwnPasswordInput: document.getElementById('newOwnPasswordInput'),
  confirmOwnPasswordInput: document.getElementById('confirmOwnPasswordInput'),
  ownPasswordAlert: document.getElementById('ownPasswordAlert'),
  
  discoveryModal: new bootstrap.Modal(document.getElementById('discoveryModal')),
  btnRunDiscovery: document.getElementById('btnRunDiscovery'),
  discoveryStatus: document.getElementById('discoveryStatus'),
  discoveryResultsList: document.getElementById('discoveryResultsList'),
  
  playerModal: new bootstrap.Modal(document.getElementById('playerModal')),
  playerModalTitle: document.getElementById('playerModalTitle'),
  mjpegImg: document.getElementById('mjpegImg'),
  playerStatus: document.getElementById('playerStatus'),
  btnStopStream: document.getElementById('btnStopStream')
};

// Helper: Escape HTML string
function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, function(m) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
  });
}

// Helper: Mask embedded credentials in camera URLs for card display
function maskCameraUrl(rawUrl) {
  if (!rawUrl) return '';
  return String(rawUrl).replace(/(:\/\/[^:/@\s]+:)([^@\s]+)(@)/g, '$1•••••$3');
}

function updateLiveGridButtonState() {
  if (!el.btnToggleLiveGrid) return;
  if (state.liveGridMode) {
    el.btnToggleLiveGrid.classList.add('active');
    el.btnToggleLiveGrid.innerHTML = `<img src="icons/3d/grid.png" alt="" class="icon-3d icon-3d-sm"><span>${t('liveGridActiveBtn')}</span>`;
  } else {
    el.btnToggleLiveGrid.classList.remove('active');
    el.btnToggleLiveGrid.innerHTML = `<img src="icons/3d/grid.png" alt="" class="icon-3d icon-3d-sm"><span>${t('liveGridBtn')}</span>`;
  }
}

function applyLanguage(lang) {
  currentLang = lang;
  localStorage.setItem('rsh_lang', lang);
  document.documentElement.lang = lang;

  const langTextEl = document.getElementById('langText');
  const loginLangTextEl = document.getElementById('loginLangText');
  if (langTextEl) langTextEl.textContent = lang.toUpperCase();
  if (loginLangTextEl) loginLangTextEl.textContent = lang.toUpperCase();

  document.querySelectorAll('[data-i18n]').forEach(elem => {
    const key = elem.getAttribute('data-i18n');
    if (translations[lang] && translations[lang][key]) {
      elem.textContent = translations[lang][key];
    }
  });

  updateLiveGridButtonState();

  if (state.token && state.user) {
    updateNavbarUserBadge();
    renderCameras(state.camerasList);
    if (state.user.role === 'admin' || state.user.role === 'coadmin') {
      renderUsers(state.usersList);
    }
  }
}

// Helper for Authenticated Fetch with auto-logout on invalid or expired token
async function authFetch(url, options = {}) {
  options.headers = options.headers || {};
  if (state.token) {
    options.headers['Authorization'] = `Bearer ${state.token}`;
  }
  const res = await fetch(url, options);
  if (res.status === 401 || res.status === 403) {
    const cloned = res.clone();
    try {
      const data = await cloned.json();
      if (data.error && (data.error.includes('token') || data.error.includes('expired') || data.error.includes('missing') || data.error.includes('Invalid'))) {
        logout(false);
      }
    } catch (e) {}
  }
  return res;
}

// === INACTIVITY AUTO-LOGOUT (15 Minutes) ===
const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000;
let inactivityTimer = null;

function resetInactivityTimer() {
  if (!state.token) return;
  clearTimeout(inactivityTimer);
  inactivityTimer = setTimeout(() => {
    console.warn('Auto-logout triggered due to 15 minutes of inactivity');
    logout(false);
  }, INACTIVITY_TIMEOUT_MS);
}

['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll'].forEach(evt => {
  window.addEventListener(evt, resetInactivityTimer, { passive: true });
});

// Initialize Theme
function initTheme() {
  const savedTheme = localStorage.getItem('theme') || 'dark';
  document.documentElement.setAttribute('data-bs-theme', savedTheme);
  updateThemeIcon(savedTheme);
}

function updateThemeIcon(theme) {
  if (theme === 'dark') {
    el.themeIcon.className = 'fa-solid fa-sun text-warning';
  } else {
    el.themeIcon.className = 'fa-solid fa-moon text-primary';
  }
}

el.btnThemeToggle.addEventListener('click', () => {
  const currentTheme = document.documentElement.getAttribute('data-bs-theme');
  const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-bs-theme', nextTheme);
  localStorage.setItem('theme', nextTheme);
  updateThemeIcon(nextTheme);
});

// Language Switcher Events
const toggleLang = () => {
  const nextLang = currentLang === 'en' ? 'de' : 'en';
  applyLanguage(nextLang);
};
if (el.btnLangToggle) el.btnLangToggle.addEventListener('click', toggleLang);
if (el.btnLoginLangToggle) el.btnLoginLangToggle.addEventListener('click', toggleLang);

// === AUTHENTICATION LOGIC ===

function setAuthState(token, user) {
  state.token = token;
  state.user = user;
  if (token) {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
  } else {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }
}

function stopAllGridStreams() {
  document.querySelectorAll('.camera-live-img').forEach(img => {
    img.src = '';
  });
}

function logout(notifyServer = true) {
  stopAllGridStreams();
  stopPlayback();
  state.liveGridMode = false;
  setAuthState(null, null);
  clearTimeout(inactivityTimer);
  showLoginView();
}

el.btnLogoutBtn.addEventListener('click', () => logout(true));

el.loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = el.usernameInput.value.trim();
  const password = el.passwordInput.value;

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Login failed');
    }

    setAuthState(data.token, data.user);
    el.loginAlert.classList.add('d-none');
    el.loginForm.reset();
    showMainView();
  } catch (err) {
    el.loginAlert.textContent = err.message;
    el.loginAlert.classList.remove('d-none');
  }
});

function getRoleBadgeInfo(role) {
  switch (role) {
    case 'admin':
      return { label: t('roleBadgeAdmin'), pillClass: 'role-pill-admin', icon3d: 'icons/3d/shield.png' };
    case 'coadmin':
      return { label: t('roleBadgeCoAdmin'), pillClass: 'role-pill-coadmin', icon3d: 'icons/3d/shield.png' };
    case 'moderator':
      return { label: t('roleBadgeModerator'), pillClass: 'role-pill-moderator', icon3d: 'icons/3d/chip.png' };
    default:
      return { label: t('roleBadgeUser'), pillClass: 'role-pill-user', icon3d: 'icons/3d/users.png' };
  }
}

function updateNavbarUserBadge() {
  if (!state.user || !el.userBadge) return;
  const info = getRoleBadgeInfo(state.user.role);
  el.userBadge.textContent = `${state.user.username} (${info.label})`;
  if (el.userAvatarInitial) {
    el.userAvatarInitial.textContent = (state.user.username || 'U').charAt(0).toUpperCase();
  }
}

// === VIEW SWITCHING ===

function showLoginView() {
  el.loginSection.classList.remove('d-none');
  el.mainSection.classList.add('d-none');
}

function showMainView() {
  el.loginSection.classList.add('d-none');
  el.mainSection.classList.remove('d-none');
  
  updateNavbarUserBadge();
  
  if (state.user.role === 'admin' || state.user.role === 'coadmin') {
    el.btnAdminView.classList.remove('d-none');
  } else {
    el.btnAdminView.classList.add('d-none');
  }

  if (state.user.can_edit) {
    el.btnAddCameraModalOpenBtn.classList.remove('d-none');
    el.btnDiscoverOpenBtn.classList.remove('d-none');
  } else {
    el.btnAddCameraModalOpenBtn.classList.add('d-none');
    el.btnDiscoverOpenBtn.classList.add('d-none');
  }

  showCamerasPage();
  loadCameras();
  resetInactivityTimer();
}

function showCamerasPage() {
  el.camerasPage.classList.remove('d-none');
  el.adminPage.classList.add('d-none');
  el.btnCamerasView.classList.add('active');
  el.btnAdminView.classList.remove('active');
  if (state.liveGridMode) {
    renderCameras(state.camerasList);
  }
}

function showAdminPage() {
  stopAllGridStreams();
  el.camerasPage.classList.add('d-none');
  el.adminPage.classList.remove('d-none');
  el.btnCamerasView.classList.remove('active');
  el.btnAdminView.classList.add('active');
  loadUsers();
}

el.btnCamerasView.addEventListener('click', (e) => {
  e.preventDefault();
  showCamerasPage();
});

el.btnAdminView.addEventListener('click', (e) => {
  e.preventDefault();
  showAdminPage();
});

// === CAMERA MANAGEMENT & LIVE GRID ===

if (el.btnToggleLiveGrid) {
  el.btnToggleLiveGrid.addEventListener('click', () => {
    state.liveGridMode = !state.liveGridMode;
    if (!state.liveGridMode) {
      stopAllGridStreams();
    }
    updateLiveGridButtonState();
    renderCameras(state.camerasList);
  });
}

el.cameraStreamType.addEventListener('change', () => {
  if (el.cameraStreamType.value === 'snapshot') {
    el.refreshIntervalContainer.classList.remove('d-none');
  } else {
    el.refreshIntervalContainer.classList.add('d-none');
  }
});

async function loadCameras() {
  try {
    const res = await authFetch('/api/cameras');
    if (!res.ok) return;
    const cameras = await res.json();
    state.camerasList = cameras;
    renderCameras(cameras);
  } catch (err) {
    console.error('Failed to load cameras:', err);
  }
}

function renderCameras(cameras) {
  stopAllGridStreams();
  el.cameraGrid.innerHTML = '';

  if (!cameras || cameras.length === 0) {
    el.cameraGrid.innerHTML = `
      <div class="col-12">
        <div class="glass-panel text-center p-5">
          <img src="icons/3d/camera.png" alt="" class="icon-3d icon-3d-hero mb-3">
          <h5 class="fw-semibold mb-0 text-secondary">${t('noCamerasRegistered')}</h5>
        </div>
      </div>
    `;
    return;
  }

  cameras.forEach(c => {
    const col = document.createElement('div');
    col.className = 'col';

    let badgeBg = 'rgba(148, 163, 184, 0.25)';
    let badgeColor = '#e2e8f0';
    let badgeText = c.stream_type ? c.stream_type.toUpperCase() : 'AUTO';
    if (c.stream_type === 'rtsp') { badgeBg = 'rgba(56, 189, 248, 0.25)'; badgeColor = '#7dd3fc'; }
    else if (c.stream_type === 'mjpeg') { badgeBg = 'rgba(168, 85, 247, 0.25)'; badgeColor = '#d8b4fe'; }
    else if (c.stream_type === 'hls') { badgeBg = 'rgba(245, 158, 11, 0.25)'; badgeColor = '#fde68a'; }
    else if (c.stream_type === 'snapshot') { badgeBg = 'rgba(16, 185, 129, 0.25)'; badgeColor = '#6ee7b7'; }

    const maskedUrl = maskCameraUrl(c.url);
    const liveStreamSrc = `/api/streams/mjpeg/${c.id}?token=${state.token}`;

    const stageInner = state.liveGridMode
      ? `
        <img src="${liveStreamSrc}" class="camera-live-img" alt="${escapeHtml(c.name)}">
        <div class="camera-stage-badges">
          <span class="badge-live-dot">LIVE</span>
          <span class="badge-stream-type" style="background: ${badgeBg}; color: ${badgeColor};">${badgeText}</span>
        </div>
      `
      : `
        <div class="camera-stage-badges">
          <span></span>
          <span class="badge-stream-type" style="background: ${badgeBg}; color: ${badgeColor};">${badgeText}</span>
        </div>
        <div class="camera-preview-placeholder">
          <img src="icons/3d/camera.png" alt="" class="icon-3d icon-3d-hero">
          <span class="small fw-semibold">${t('startStream')}</span>
        </div>
      `;

    const editActionButtons = state.user.can_edit ? `
      <button class="btn btn-neo-glass btn-sm" onclick="event.stopPropagation(); openEditCameraModal(${c.id})" title="${t('editBtn')}">
        <i class="fa-solid fa-pen"></i>
      </button>
      <button class="btn btn-neo-glass btn-sm text-danger" onclick="event.stopPropagation(); deleteCamera(${c.id})" title="${t('deleteBtn')}">
        <i class="fa-solid fa-trash"></i>
      </button>
    ` : '';

    col.innerHTML = `
      <div class="camera-card h-100 d-flex flex-column justify-content-between">
        <div>
          <div class="camera-preview-stage" onclick="openPlayer(${c.id})">
            ${stageInner}
          </div>
          <div class="p-3 pb-2">
            <div class="d-flex justify-content-between align-items-center mb-2">
              <h5 class="fw-bold mb-0 text-truncate d-flex align-items-center gap-2" title="${escapeHtml(c.name)}">
                <img src="icons/3d/camera.png" alt="" class="icon-3d icon-3d-sm">${escapeHtml(c.name)}
              </h5>
            </div>
            <div class="camera-url-pill d-flex align-items-center gap-2" title="${escapeHtml(maskedUrl)}">
              <img src="icons/3d/link.png" alt="" class="icon-3d" style="width: 16px; height: 16px; border-radius: 4px;"><span class="text-truncate">${escapeHtml(maskedUrl)}</span>
            </div>
          </div>
        </div>
        <div class="p-3 pt-2 d-flex justify-content-between align-items-center gap-2">
          <button class="btn btn-neo-glass btn-sm flex-grow-1 text-truncate d-inline-flex align-items-center justify-content-center gap-2" id="btnQuickCopy_${c.id}" onclick="event.stopPropagation(); copyCameraDashboardLink(${c.id}, this)" title="${t('helpDashboardLink')}">
            <img src="icons/3d/link.png" alt="" class="icon-3d icon-3d-sm"><span>${t('copyDashLinkBtn')}</span>
          </button>
          <div class="d-flex gap-1">
            ${editActionButtons}
          </div>
        </div>
      </div>
    `;
    el.cameraGrid.appendChild(col);
  });
}

// Quick 1-click Copy Dashboard Link directly from Camera Card
window.copyCameraDashboardLink = async (cameraId, btnEl) => {
  try {
    const res = await authFetch(`/api/cameras/${cameraId}/token`);
    if (!res.ok) throw new Error('Token request failed');
    const data = await res.json();
    if (!data.token) throw new Error('No token received');

    const portPart = window.location.port ? `:${window.location.port}` : '';
    const streamUrl = `${window.location.protocol}//${window.location.hostname}${portPart}/api/streams/mjpeg/${cameraId}?token=${data.token}`;

    await copyTextToClipboard(streamUrl);

    if (btnEl) {
      const originalHtml = btnEl.innerHTML;
      btnEl.innerHTML = `<i class="fa-solid fa-check me-1 text-neo-accent"></i><span class="text-neo-accent">${t('copiedDashLinkBtn')}</span>`;
      setTimeout(() => {
        btnEl.innerHTML = originalHtml;
      }, 2000);
    }
  } catch (err) {
    console.error('Failed to copy dashboard link:', err);
  }
};

async function copyTextToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch (e) {}
  }
  const tempInput = document.createElement('textarea');
  tempInput.value = text;
  tempInput.style.position = 'fixed';
  tempInput.style.opacity = '0';
  document.body.appendChild(tempInput);
  tempInput.focus();
  tempInput.select();
  try { document.execCommand('copy'); } catch (e) {}
  document.body.removeChild(tempInput);
}

// Open Add Camera Modal
el.btnAddCameraModalOpenBtn.addEventListener('click', () => {
  el.cameraForm.reset();
  el.cameraIdField.value = '';
  el.cameraStreamType.value = 'auto';
  el.cameraRefreshInterval.value = '2';
  el.refreshIntervalContainer.classList.add('d-none');
  el.dashboardLinkContainer.classList.add('d-none');
  el.cameraModalTitle.textContent = t('modalAddCamera');
  el.cameraModal.show();
});

// Open Edit Camera Modal
window.openEditCameraModal = async (cameraId) => {
  const cam = state.camerasList.find(c => c.id === cameraId);
  if (!cam) return;

  el.cameraIdField.value = cam.id;
  el.cameraNameInput.value = cam.name;
  el.cameraUrlInput.value = cam.url;
  el.cameraStreamType.value = cam.stream_type || 'auto';
  el.cameraRefreshInterval.value = cam.refresh_interval || 2;
  
  if (el.cameraStreamType.value === 'snapshot') {
    el.refreshIntervalContainer.classList.remove('d-none');
  } else {
    el.refreshIntervalContainer.classList.add('d-none');
  }

  el.cameraModalTitle.textContent = t('modalEditCamera');
  el.dashboardLinkContainer.classList.add('d-none');

  try {
    const res = await authFetch(`/api/cameras/${cam.id}/token`);
    if (res.ok) {
      const data = await res.json();
      if (data.token) {
        const portPart = window.location.port ? `:${window.location.port}` : '';
        const streamUrl = `${window.location.protocol}//${window.location.hostname}${portPart}/api/streams/mjpeg/${cam.id}?token=${data.token}`;
        el.dashboardLinkInput.value = streamUrl;
        el.dashboardLinkContainer.classList.remove('d-none');
      }
    }
  } catch (err) {
    console.error('Failed to load dashboard token:', err);
  }

  el.cameraModal.show();
};

// Save Camera (Create / Update)
el.cameraForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = el.cameraIdField.value;
  const name = el.cameraNameInput.value;
  const url = el.cameraUrlInput.value;
  const stream_type = el.cameraStreamType.value;
  const refresh_interval = parseInt(el.cameraRefreshInterval.value, 10) || 2;

  const method = id ? 'PUT' : 'POST';
  const apiPath = id ? `/api/cameras/${id}` : '/api/cameras';

  try {
    const res = await authFetch(apiPath, {
      method,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name, url, stream_type, refresh_interval })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Save failed');
    }
    el.cameraModal.hide();
    loadCameras();
  } catch (err) {
    alert(err.message);
  }
});

// Delete Camera
window.deleteCamera = async (id) => {
  if (!confirm(t('deleteCameraConfirm'))) return;
  try {
    const res = await authFetch(`/api/cameras/${id}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Delete failed');
    loadCameras();
  } catch (err) {
    alert(err.message);
  }
};

// === STREAM PLAYER LOGIC ===

window.openPlayer = (cameraId) => {
  const cam = state.camerasList.find(c => c.id === cameraId);
  const name = cam ? cam.name : 'Camera Stream';
  state.activeCameraId = cameraId;
  el.playerModalTitle.textContent = name;
  el.playerModal.show();
  
  el.playerStatus.textContent = t('playerLoading');
  el.mjpegImg.src = `/api/streams/mjpeg/${cameraId}?token=${state.token}`;
  el.mjpegImg.classList.remove('d-none');
  
  el.mjpegImg.onload = () => {
    el.playerStatus.textContent = `${name} — Live MJPEG`;
  };

  el.mjpegImg.onerror = () => {
    el.playerStatus.textContent = t('playerError');
  };
};

function stopPlayback() {
  el.mjpegImg.src = '';
  el.mjpegImg.classList.add('d-none');
}

document.getElementById('playerModal').addEventListener('hidden.bs.modal', () => {
  stopPlayback();
});

// === USER MANAGEMENT (Admin & CoAdmin) ===

function applyRoleDefaultCheckboxes(role) {
  if (role === 'admin' || role === 'coadmin' || role === 'moderator') {
    el.newUserView.checked = true;
    el.newUserEdit.checked = true;
  } else {
    el.newUserView.checked = true;
    el.newUserEdit.checked = false;
  }
}

el.newUserRole.addEventListener('change', () => {
  applyRoleDefaultCheckboxes(el.newUserRole.value);
});

function configureRoleDropdownOptions(isSelfEdit = false, isLastAdminTarget = false) {
  const isCoAdminCaller = state.user && state.user.role === 'coadmin';
  if (el.optRoleAdminEl) {
    el.optRoleAdminEl.disabled = isCoAdminCaller;
    el.optRoleAdminEl.hidden = isCoAdminCaller;
  }
  if (el.optRoleCoAdminEl) {
    el.optRoleCoAdminEl.disabled = isCoAdminCaller;
    el.optRoleCoAdminEl.hidden = isCoAdminCaller;
  }
  el.newUserRole.disabled = isSelfEdit || isLastAdminTarget;
}

async function loadUsers() {
  try {
    const res = await authFetch('/api/users');
    if (!res.ok) return;
    const users = await res.json();
    state.usersList = users;
    renderUsers(users);
  } catch (err) {
    console.error('Failed to load users:', err);
  }
}

function renderUsers(users) {
  el.userTableBody.innerHTML = '';
  if (!users || users.length === 0) return;

  const adminCount = users.filter(u => u.role === 'admin').length;
  const callerRole = state.user ? state.user.role : 'user';

  users.forEach(u => {
    const row = document.createElement('tr');
    
    const viewBadge = u.can_view
      ? `<span class="perm-pill-yes"><i class="fa-solid fa-check"></i>${t('permissionYes')}</span>`
      : `<span class="perm-pill-no"><i class="fa-solid fa-xmark"></i>${t('permissionNo')}</span>`;
    const editBadge = u.can_edit
      ? `<span class="perm-pill-yes"><i class="fa-solid fa-check"></i>${t('permissionYes')}</span>`
      : `<span class="perm-pill-no"><i class="fa-solid fa-xmark"></i>${t('permissionNo')}</span>`;

    const roleInfo = getRoleBadgeInfo(u.role);
    const roleBadge = `<span class="role-pill ${roleInfo.pillClass}"><img src="${roleInfo.icon3d}" alt="" class="icon-3d" style="width: 16px; height: 16px; border-radius: 4px;">${escapeHtml(roleInfo.label)}</span>`;

    const canManageTarget = callerRole === 'admin' || (callerRole === 'coadmin' && u.role !== 'admin' && u.role !== 'coadmin');
    const isSelf = state.user && u.id === state.user.id;
    const isLastAdmin = u.role === 'admin' && adminCount <= 1;

    const editBtn = canManageTarget ? `
      <button class="btn btn-neo-glass btn-sm me-1" onclick="openEditUserModal(${u.id})" title="${t('editBtn')}">
        <i class="fa-solid fa-pen me-1"></i>${t('editBtn')}
      </button>
    ` : '';

    const deleteBtn = (canManageTarget && !isSelf && !isLastAdmin) ? `
      <button class="btn btn-neo-glass btn-sm text-danger" onclick="deleteUser(${u.id})" title="${t('deleteBtn')}">
        <i class="fa-solid fa-trash"></i>
      </button>
    ` : '';

    const initial = (u.username || 'U').charAt(0).toUpperCase();

    row.innerHTML = `
      <td>
        <div class="d-flex align-items-center gap-2">
          <span class="user-avatar-circle" style="width: 28px; height: 28px; font-size: 0.78rem;">${escapeHtml(initial)}</span>
          <span class="fw-bold">${escapeHtml(u.username)}</span>
        </div>
      </td>
      <td>${roleBadge}</td>
      <td>${viewBadge}</td>
      <td>${editBadge}</td>
      <td class="text-end">${editBtn}${deleteBtn}</td>
    `;
    el.userTableBody.appendChild(row);
  });
}

// Open Add User Modal
el.btnAddUserModalOpenBtn.addEventListener('click', () => {
  el.userForm.reset();
  el.editUserIdField.value = '';
  el.newPasswordInput.required = true;
  el.passwordEditHelp.classList.add('d-none');
  el.userModalTitle.textContent = t('modalCreateUser');
  el.btnSaveUser.textContent = t('btnCreate');

  configureRoleDropdownOptions(false, false);
  const defaultRole = 'user';
  el.newUserRole.value = defaultRole;
  applyRoleDefaultCheckboxes(defaultRole);

  el.userModal.show();
});

// Open Edit User Modal
window.openEditUserModal = (userId) => {
  const targetUser = state.usersList.find(u => u.id === userId);
  if (!targetUser) return;

  const adminCount = state.usersList.filter(u => u.role === 'admin').length;
  const isSelf = state.user && targetUser.id === state.user.id;
  const isLastAdmin = targetUser.role === 'admin' && adminCount <= 1;

  el.userForm.reset();
  el.editUserIdField.value = String(targetUser.id);
  el.newUsernameInput.value = targetUser.username;
  el.newPasswordInput.value = '';
  el.newPasswordInput.required = false;
  el.passwordEditHelp.classList.remove('d-none');

  configureRoleDropdownOptions(isSelf, isLastAdmin);
  el.newUserRole.value = targetUser.role;
  el.newUserView.checked = Boolean(targetUser.can_view);
  el.newUserEdit.checked = Boolean(targetUser.can_edit);

  el.userModalTitle.textContent = t('modalEditUser');
  el.btnSaveUser.textContent = t('btnSave');
  el.userModal.show();
};

// Save User (Create or Update)
el.userForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const editId = el.editUserIdField.value;
  const username = el.newUsernameInput.value.trim();
  const password = el.newPasswordInput.value;
  const role = el.newUserRole.value;
  const can_view = el.newUserView.checked;
  const can_edit = el.newUserEdit.checked;

  const isEdit = Boolean(editId);
  const url = isEdit ? `/api/users/${editId}` : '/api/users';
  const method = isEdit ? 'PUT' : 'POST';

  const payload = { username, role, can_view, can_edit };
  if (!isEdit || (password && password.length > 0)) {
    payload.password = password;
  }

  try {
    const res = await authFetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'User save failed');
    }

    if (isEdit && state.user && parseInt(editId, 10) === state.user.id) {
      state.user.username = username;
      state.user.can_view = can_view;
      state.user.can_edit = can_edit;
      localStorage.setItem('user', JSON.stringify(state.user));
      updateNavbarUserBadge();
      if (state.user.can_edit) {
        el.btnAddCameraModalOpenBtn.classList.remove('d-none');
        el.btnDiscoverOpenBtn.classList.remove('d-none');
      } else {
        el.btnAddCameraModalOpenBtn.classList.add('d-none');
        el.btnDiscoverOpenBtn.classList.add('d-none');
      }
    }

    el.userModal.hide();
    loadUsers();
  } catch (err) {
    alert(err.message);
  }
});

// Delete User
window.deleteUser = async (id) => {
  if (!confirm(t('deleteUserConfirm'))) return;
  try {
    const res = await authFetch(`/api/users/${id}`, {
      method: 'DELETE'
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Delete user failed');
    }
    loadUsers();
  } catch (err) {
    alert(err.message);
  }
};

// === CHANGE OWN PASSWORD ===

if (el.btnChangeOwnPassword) {
  el.btnChangeOwnPassword.addEventListener('click', () => {
    el.ownPasswordForm.reset();
    el.ownPasswordAlert.classList.add('d-none');
    el.ownPasswordModal.show();
  });
}

if (el.ownPasswordForm) {
  el.ownPasswordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const currentPassword = el.currentOwnPasswordInput.value;
    const newPassword = el.newOwnPasswordInput.value;
    const confirmPassword = el.confirmOwnPasswordInput.value;

    if (newPassword !== confirmPassword) {
      el.ownPasswordAlert.className = 'alert alert-danger py-2 small';
      el.ownPasswordAlert.textContent = t('passwordMismatchError');
      el.ownPasswordAlert.classList.remove('d-none');
      return;
    }

    try {
      const res = await authFetch('/api/auth/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Password change failed');
      }

      el.ownPasswordAlert.className = 'alert alert-success py-2 small';
      el.ownPasswordAlert.textContent = t('passwordChangeSuccess');
      el.ownPasswordAlert.classList.remove('d-none');
      el.ownPasswordForm.reset();

      setTimeout(() => {
        el.ownPasswordModal.hide();
      }, 1200);
    } catch (err) {
      el.ownPasswordAlert.className = 'alert alert-danger py-2 small';
      el.ownPasswordAlert.textContent = err.message;
      el.ownPasswordAlert.classList.remove('d-none');
    }
  });
}

// Copy Dashboard Link in Edit Modal
el.btnCopyDashboardLink.addEventListener('click', async () => {
  await copyTextToClipboard(el.dashboardLinkInput.value);
  showCopySuccess();
});

function showCopySuccess() {
  const copyIcon = el.btnCopyDashboardLink.querySelector('i');
  copyIcon.className = 'fa-solid fa-check';
  setTimeout(() => {
    copyIcon.className = 'fa-solid fa-copy';
  }, 2000);
}

// === ONVIF CAMERA DISCOVERY ===

el.btnDiscoverOpenBtn.addEventListener('click', () => {
  el.discoveryResultsList.innerHTML = `<div class="text-center p-4 text-secondary">${t('onvifScanDesc')}</div>`;
  el.discoveryStatus.classList.add('d-none');
  el.discoveryModal.show();
});

el.btnRunDiscovery.addEventListener('click', async () => {
  el.discoveryStatus.textContent = t('onvifScanning');
  el.discoveryStatus.className = 'alert alert-info py-2 small';
  el.discoveryStatus.classList.remove('d-none');
  el.discoveryResultsList.innerHTML = '';
  el.btnRunDiscovery.disabled = true;

  try {
    const res = await authFetch('/api/cameras/discovery');
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Discovery scan failed');
    }
    
    const devices = await res.json();
    el.discoveryStatus.classList.add('d-none');
    renderDiscoveryResults(devices);
  } catch (err) {
    el.discoveryStatus.textContent = `Error: ${err.message}`;
    el.discoveryStatus.className = 'alert alert-danger py-2 small';
    el.discoveryStatus.classList.remove('d-none');
  } finally {
    el.btnRunDiscovery.disabled = false;
  }
});

function renderDiscoveryResults(devices) {
  el.discoveryResultsList.innerHTML = '';
  
  if (devices.length === 0) {
    el.discoveryResultsList.innerHTML = `<div class="text-center p-4 text-warning"><i class="fa-solid fa-circle-exclamation fa-2x mb-2"></i><br>${t('onvifNoCameras')}</div>`;
    return;
  }
  
  devices.forEach(d => {
    const item = document.createElement('div');
    item.className = 'list-group-item list-group-item-action d-flex justify-content-between align-items-center p-3 mb-2 rounded-3';
    item.style.background = 'var(--surface-subtle)';
    item.style.border = '1px solid var(--glass-border)';
    
    const ip = d.address || (d.xaddrs && d.xaddrs[0] ? new URL(d.xaddrs[0]).hostname : '');
    const model = d.hardware || d.name || 'Unknown Camera';
    
    item.innerHTML = `
      <div class="d-flex align-items-center gap-3">
        <img src="icons/3d/chip.png" alt="" class="icon-3d icon-3d-lg">
        <div>
          <h6 class="fw-bold mb-1">${escapeHtml(model)}</h6>
          <span class="badge bg-secondary mb-1">IP: ${escapeHtml(ip)}</span>
          <div class="text-secondary small">Location: ${escapeHtml(d.location || 'N/A')}</div>
        </div>
      </div>
      <button class="btn btn-neo-primary btn-sm d-inline-flex align-items-center gap-2" onclick="selectDiscoveredCamera('${escapeHtml(model)}', '${escapeHtml(ip)}')">
        <img src="icons/3d/add-camera.png" alt="" class="icon-3d icon-3d-sm">${t('btnAdopt')}
      </button>
    `;
    el.discoveryResultsList.appendChild(item);
  });
}

window.selectDiscoveredCamera = (model, ip) => {
  el.discoveryModal.hide();
  
  el.cameraForm.reset();
  el.cameraIdField.value = '';
  el.dashboardLinkContainer.classList.add('d-none');
  el.cameraNameInput.value = `${model}`;
  el.cameraUrlInput.value = `rtsp://admin:passwort@${ip}:554/ch0`;
  el.cameraStreamType.value = 'rtsp';
  el.cameraRefreshInterval.value = '2';
  el.refreshIntervalContainer.classList.add('d-none');
  el.cameraModalTitle.textContent = t('modalAddCamera');
  el.cameraModal.show();
};

// Init application
function initApp() {
  initTheme();
  applyLanguage(currentLang);
  if (state.token && state.user) {
    showMainView();
  } else {
    showLoginView();
  }
}

initApp();
