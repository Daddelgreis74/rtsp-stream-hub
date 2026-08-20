// Main Application Logic for RTSP Stream Hub with Full Internationalization (i18n)

const translations = {
  en: {
    loginSubtitle: 'Please sign in to continue',
    usernameLabel: 'Username',
    passwordLabel: 'Password',
    loginBtn: 'Sign In',
    navCameras: 'Cameras',
    navUsers: 'User Management',
    logoutBtn: 'Logout',
    myCamerasTitle: 'My Cameras',
    onvifScanBtn: 'ONVIF Discovery',
    addCameraBtn: 'Add Camera',
    usersTitle: 'User Management',
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
    btnSave: 'Save',
    modalCreateUser: 'Create New User',
    optRoleUser: 'Standard User',
    optRoleAdmin: 'Administrator',
    permAllowView: 'Can view cameras',
    permAllowEdit: 'Can edit cameras',
    btnCreate: 'Create',
    modalOnvifTitle: 'ONVIF Camera Discovery',
    onvifScanDesc: 'Scans local network for ONVIF compliant cameras.',
    btnStartScan: 'Start Scan',
    onvifScanning: 'Scanning network... Please wait...',
    onvifNoCameras: 'No ONVIF cameras found on the local network.',
    playerLoading: 'Loading live MJPEG stream...',
    playerError: 'Transcoding error (Check stream URL or camera availability)',
    noCamerasRegistered: 'No cameras registered yet. Click "Add Camera" or "ONVIF Discovery" to get started.',
    startStream: 'Start Stream',
    editBtn: 'Edit',
    deleteBtn: 'Delete',
    deleteCameraConfirm: 'Are you sure you want to delete this camera?',
    deleteUserConfirm: 'Are you sure you want to delete this user?',
    permissionYes: 'Yes',
    permissionNo: 'No',
    btnAdopt: 'Add'
  },
  de: {
    loginSubtitle: 'Bitte melde dich an',
    usernameLabel: 'Benutzername',
    passwordLabel: 'Passwort',
    loginBtn: 'Einloggen',
    navCameras: 'Kameras',
    navUsers: 'Benutzerverwaltung',
    logoutBtn: 'Logout',
    myCamerasTitle: 'Meine Kameras',
    onvifScanBtn: 'ONVIF-Suche',
    addCameraBtn: 'Kamera hinzufügen',
    usersTitle: 'Benutzerverwaltung',
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
    btnSave: 'Speichern',
    modalCreateUser: 'Neuen Benutzer erstellen',
    optRoleUser: 'Standard Benutzer',
    optRoleAdmin: 'Administrator',
    permAllowView: 'Kameras ansehen erlaubt',
    permAllowEdit: 'Kameras bearbeiten erlaubt',
    btnCreate: 'Erstellen',
    modalOnvifTitle: 'ONVIF Kamera-Suchlauf',
    onvifScanDesc: 'Scanner sucht nach Kameras im lokalen Netzwerk.',
    btnStartScan: 'Suchlauf starten',
    onvifScanning: 'Netzwerk-Suchlauf läuft... Bitte warten...',
    onvifNoCameras: 'Keine ONVIF Kameras im Netzwerk gefunden.',
    playerLoading: 'Live MJPEG Stream wird geladen...',
    playerError: 'Transcodierungs-Fehler (Prüfe die Stream URL oder Erreichbarkeit)',
    noCamerasRegistered: 'Noch keine Kameras eingerichtet. Klicke auf "Kamera hinzufügen" oder "ONVIF-Suche".',
    startStream: 'Stream starten',
    editBtn: 'Bearbeiten',
    deleteBtn: 'Löschen',
    deleteCameraConfirm: 'Möchtest du diese Kamera wirklich löschen?',
    deleteUserConfirm: 'Möchtest du diesen Benutzer wirklich löschen?',
    permissionYes: 'Ja',
    permissionNo: 'Nein',
    btnAdopt: 'Hinzufügen'
  }
};

let currentLang = localStorage.getItem('rsh_lang') || 'en';

function t(key) {
  return (translations[currentLang] && translations[currentLang][key]) || translations['en'][key] || key;
}

function applyLanguage(lang) {
  currentLang = lang;
  localStorage.setItem('rsh_lang', lang);
  document.documentElement.lang = lang;

  const langTextEl = document.getElementById('langText');
  const loginLangTextEl = document.getElementById('loginLangText');
  if (langTextEl) langTextEl.textContent = lang.toUpperCase();
  if (loginLangTextEl) loginLangTextEl.textContent = lang.toUpperCase();

  // Update all elements with data-i18n attribute
  document.querySelectorAll('[data-i18n]').forEach(elem => {
    const key = elem.getAttribute('data-i18n');
    if (translations[lang] && translations[lang][key]) {
      elem.textContent = translations[lang][key];
    }
  });

  // Re-render cameras or users if active
  if (state.token && state.user) {
    loadCameras();
    if (state.user.role === 'admin') loadUsers();
  }
}

const state = {
  token: localStorage.getItem('token') || null,
  user: JSON.parse(localStorage.getItem('user')) || null,
  activeCameraId: null
};

// UI Elements
const el = {
  loginSection: document.getElementById('loginSection'),
  mainSection: document.getElementById('mainSection'),
  loginForm: document.getElementById('loginForm'),
  usernameInput: document.getElementById('usernameInput'),
  passwordInput: document.getElementById('passwordInput'),
  loginAlert: document.getElementById('loginAlert'),
  
  navAdminLink: document.getElementById('navAdminLink'),
  userBadge: document.getElementById('userBadge'),
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
  userForm: document.getElementById('userForm'),
  newUsernameInput: document.getElementById('newUsernameInput'),
  newPasswordInput: document.getElementById('newPasswordInput'),
  newUserRole: document.getElementById('newUserRole'),
  newUserView: document.getElementById('newUserView'),
  newUserEdit: document.getElementById('newUserEdit'),
  
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
  return str.replace(/[&<>"']/g, function(m) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
  });
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
    el.themeIcon.className = 'fa-solid fa-sun';
  } else {
    el.themeIcon.className = 'fa-solid fa-moon';
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

function logout(notifyServer = true) {
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

// === VIEW SWITCHING ===

function showLoginView() {
  el.loginSection.classList.remove('d-none');
  el.mainSection.classList.add('d-none');
}

function showMainView() {
  el.loginSection.classList.add('d-none');
  el.mainSection.classList.remove('d-none');
  
  el.userBadge.textContent = `${state.user.username} (${state.user.role})`;
  
  if (state.user.role === 'admin') {
    el.navAdminLink.classList.remove('d-none');
  } else {
    el.navAdminLink.classList.add('d-none');
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
}

function showAdminPage() {
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

// === CAMERA MANAGEMENT ===

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
    renderCameras(cameras);
  } catch (err) {
    console.error('Failed to load cameras:', err);
  }
}

function renderCameras(cameras) {
  el.cameraGrid.innerHTML = '';
  if (cameras.length === 0) {
    el.cameraGrid.innerHTML = `
      <div class="col-12 text-center text-muted p-5 card shadow-sm">
        <i class="fa-solid fa-video-slash fa-3x mb-3 text-secondary"></i>
        <h5>${t('noCamerasRegistered')}</h5>
      </div>
    `;
    return;
  }

  cameras.forEach(c => {
    const card = document.createElement('div');
    card.className = 'col';

    const editButtons = state.user.can_edit ? `
      <div class="card-footer bg-transparent border-top-0 d-flex justify-content-end gap-2 pt-0">
        <button class="btn btn-outline-secondary btn-sm" onclick="event.stopPropagation(); openEditCameraModal(${c.id}, '${escapeHtml(c.name)}', '${escapeHtml(c.url)}', '${c.stream_type}', ${c.refresh_interval || 2})">
          <i class="fa-solid fa-pen me-1"></i>${t('editBtn')}
        </button>
        <button class="btn btn-outline-danger btn-sm" onclick="event.stopPropagation(); deleteCamera(${c.id})">
          <i class="fa-solid fa-trash me-1"></i>${t('deleteBtn')}
        </button>
      </div>
    ` : '';

    let badgeClass = 'bg-secondary';
    let badgeText = c.stream_type ? c.stream_type.toUpperCase() : 'AUTO';
    if (c.stream_type === 'rtsp') badgeClass = 'bg-primary';
    else if (c.stream_type === 'mjpeg') badgeClass = 'bg-info text-dark';
    else if (c.stream_type === 'hls') badgeClass = 'bg-warning text-dark';
    else if (c.stream_type === 'snapshot') badgeClass = 'bg-success';

    card.innerHTML = `
      <div class="card h-100 shadow-sm border-0 bg-body-flat camera-card" style="cursor: pointer;" onclick="openPlayer(${c.id}, '${escapeHtml(c.name)}')">
        <div class="card-body d-flex flex-column justify-content-between">
          <div>
            <div class="d-flex justify-content-between align-items-start mb-2">
              <h5 class="card-title fw-bold mb-0"><i class="fa-solid fa-video me-2 text-primary"></i>${escapeHtml(c.name)}</h5>
              <span class="badge ${badgeClass} ms-2">${badgeText}</span>
            </div>
            <p class="text-muted small text-break mb-0">${escapeHtml(c.url)}</p>
          </div>
          <div class="mt-3 text-end text-primary small fw-bold">
            ${t('startStream')} <i class="fa-solid fa-chevron-right ms-1"></i>
          </div>
        </div>
        ${editButtons}
      </div>
    `;
    el.cameraGrid.appendChild(card);
  });
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
window.openEditCameraModal = async (id, name, url, streamType = 'auto', refreshInterval = 2) => {
  el.cameraIdField.value = id;
  el.cameraNameInput.value = name;
  el.cameraUrlInput.value = url;
  el.cameraStreamType.value = streamType || 'auto';
  el.cameraRefreshInterval.value = refreshInterval || 2;
  
  if (el.cameraStreamType.value === 'snapshot') {
    el.refreshIntervalContainer.classList.remove('d-none');
  } else {
    el.refreshIntervalContainer.classList.add('d-none');
  }

  el.cameraModalTitle.textContent = t('modalEditCamera');
  el.dashboardLinkContainer.classList.add('d-none');

  try {
    const res = await authFetch(`/api/cameras/${id}/token`);
    if (res.ok) {
      const data = await res.json();
      if (data.token) {
        const portPart = window.location.port ? `:${window.location.port}` : '';
        const streamUrl = `${window.location.protocol}//${window.location.hostname}${portPart}/api/streams/mjpeg/${id}?token=${data.token}`;
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

window.openPlayer = (id, name) => {
  state.activeCameraId = id;
  el.playerModalTitle.textContent = name;
  el.playerModal.show();
  
  el.playerStatus.textContent = t('playerLoading');
  el.mjpegImg.src = `/api/streams/mjpeg/${id}?token=${state.token}`;
  el.mjpegImg.classList.remove('d-none');
  
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

// === USER MANAGEMENT (Admin only) ===

async function loadUsers() {
  try {
    const res = await authFetch('/api/users');
    if (!res.ok) return;
    const users = await res.json();
    renderUsers(users);
  } catch (err) {
    console.error('Failed to load users:', err);
  }
}

function renderUsers(users) {
  el.userTableBody.innerHTML = '';
  users.forEach(u => {
    const row = document.createElement('tr');
    
    const viewBadge = u.can_view ? `<span class="badge bg-success">${t('permissionYes')}</span>` : `<span class="badge bg-danger">${t('permissionNo')}</span>`;
    const editBadge = u.can_edit ? `<span class="badge bg-success">${t('permissionYes')}</span>` : `<span class="badge bg-danger">${t('permissionNo')}</span>`;
    const roleBadge = u.role === 'admin' ? '<span class="badge bg-primary">Admin</span>' : '<span class="badge bg-secondary">User</span>';

    const deleteBtn = u.id === state.user.id ? '' : `
      <button class="btn btn-outline-danger btn-sm" onclick="deleteUser(${u.id})">
        <i class="fa-solid fa-trash"></i>
      </button>
    `;

    row.innerHTML = `
      <td class="fw-bold">${escapeHtml(u.username)}</td>
      <td>${roleBadge}</td>
      <td>${viewBadge}</td>
      <td>${editBadge}</td>
      <td class="text-end">${deleteBtn}</td>
    `;
    el.userTableBody.appendChild(row);
  });
}

// Open Add User Modal
el.btnAddUserModalOpenBtn.addEventListener('click', () => {
  el.userForm.reset();
  el.userModal.show();
});

// Save New User
el.userForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = el.newUsernameInput.value.trim();
  const password = el.newPasswordInput.value;
  const role = el.newUserRole.value;
  const can_view_cameras = el.newUserView.checked;
  const can_edit_cameras = el.newUserEdit.checked;

  try {
    const res = await authFetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, role, can_view_cameras, can_edit_cameras })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Create user failed');
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
    if (!res.ok) throw new Error('Delete user failed');
    loadUsers();
  } catch (err) {
    alert(err.message);
  }
};

// Copy Dashboard Link to Clipboard (Supports HTTP and HTTPS)
el.btnCopyDashboardLink.addEventListener('click', () => {
  el.dashboardLinkInput.select();
  el.dashboardLinkInput.setSelectionRange(0, 99999);

  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(el.dashboardLinkInput.value).then(() => {
      showCopySuccess();
    }).catch(() => {
      document.execCommand('copy');
      showCopySuccess();
    });
  } else {
    try {
      document.execCommand('copy');
      showCopySuccess();
    } catch (err) {
      console.error('Copy failed:', err);
    }
  }
});

function showCopySuccess() {
  const copyIcon = el.btnCopyDashboardLink.querySelector('i');
  copyIcon.className = 'fa-solid fa-check';
  el.btnCopyDashboardLink.classList.remove('btn-outline-success');
  el.btnCopyDashboardLink.classList.add('btn-success');
  
  setTimeout(() => {
    copyIcon.className = 'fa-solid fa-copy';
    el.btnCopyDashboardLink.classList.remove('btn-success');
    el.btnCopyDashboardLink.classList.add('btn-outline-success');
  }, 2000);
}

// === ONVIF CAMERA DISCOVERY ===

el.btnDiscoverOpenBtn.addEventListener('click', () => {
  el.discoveryResultsList.innerHTML = `<div class="text-center p-4 text-muted">${t('onvifScanDesc')}</div>`;
  el.discoveryStatus.classList.add('d-none');
  el.discoveryModal.show();
});

el.btnRunDiscovery.addEventListener('click', async () => {
  el.discoveryStatus.textContent = t('onvifScanning');
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
    el.discoveryStatus.classList.remove('d-none');
    el.discoveryStatus.className = 'alert alert-danger';
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
    item.className = 'list-group-item list-group-item-action d-flex justify-content-between align-items-center p-3';
    
    const ip = d.address || (d.xaddrs && d.xaddrs[0] ? new URL(d.xaddrs[0]).hostname : '');
    const model = d.hardware || d.name || 'Unknown Camera';
    
    item.innerHTML = `
      <div>
        <h6 class="fw-bold mb-1"><i class="fa-solid fa-microchip text-primary me-2"></i>${escapeHtml(model)}</h6>
        <span class="badge bg-secondary mb-1">IP: ${escapeHtml(ip)}</span>
        <div class="text-muted small">Location: ${escapeHtml(d.location || 'N/A')}</div>
      </div>
      <button class="btn btn-primary btn-sm fw-bold" onclick="selectDiscoveredCamera('${escapeHtml(model)}', '${escapeHtml(ip)}')">
        <i class="fa-solid fa-plus me-1"></i>${t('btnAdopt')}
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
