// Main Application Logic for RTSP Stream Hub

const state = {
  token: localStorage.getItem('token') || null,
  user: JSON.parse(localStorage.getItem('user')) || null,
  activeCameraId: null,
  playbackMode: 'webrtc' // 'webrtc' or 'mjpeg'
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
  
  btnCamerasView: document.getElementById('btnCamerasView'),
  btnAdminView: document.getElementById('btnAdminView'),
  camerasPage: document.getElementById('camerasPage'),
  adminPage: document.getElementById('adminPage'),
  
  cameraGrid: document.getElementById('cameraGrid'),
  btnAddCameraModalOpenBtn: document.getElementById('btnAddCameraModalOpenBtn'),
  userTableBody: document.getElementById('userTableBody'),
  btnAddUserModalOpenBtn: document.getElementById('btnAddUserModalOpenBtn'),
  
  cameraModal: new bootstrap.Modal(document.getElementById('cameraModal')),
  cameraModalTitle: document.getElementById('cameraModalTitle'),
  cameraForm: document.getElementById('cameraForm'),
  cameraIdField: document.getElementById('cameraIdField'),
  cameraNameInput: document.getElementById('cameraNameInput'),
  cameraUrlInput: document.getElementById('cameraUrlInput'),
  
  userModal: new bootstrap.Modal(document.getElementById('userModal')),
  userForm: document.getElementById('userForm'),
  newUsernameInput: document.getElementById('newUsernameInput'),
  newPasswordInput: document.getElementById('newPasswordInput'),
  newUserRole: document.getElementById('newUserRole'),
  newUserView: document.getElementById('newUserView'),
  newUserEdit: document.getElementById('newUserEdit'),
  
  playerModal: new bootstrap.Modal(document.getElementById('playerModal')),
  playerModalTitle: document.getElementById('playerModalTitle'),
  webrtcVideo: document.getElementById('webrtcVideo'),
  mjpegImg: document.getElementById('mjpegImg'),
  playerStatus: document.getElementById('playerStatus'),
  btnStopStream: document.getElementById('btnStopStream'),
  btnModeWebRTC: document.getElementById('btnModeWebRTC'),
  btnModeMJPEG: document.getElementById('btnModeMJPEG')
};

// Theme Toggle
let currentTheme = localStorage.getItem('theme') || 'dark';
document.documentElement.setAttribute('data-bs-theme', currentTheme);
updateThemeIcon(currentTheme);

el.btnThemeToggle.addEventListener('click', () => {
  currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-bs-theme', currentTheme);
  localStorage.setItem('theme', currentTheme);
  updateThemeIcon(currentTheme);
});

function updateThemeIcon(theme) {
  if (theme === 'dark') {
    el.themeIcon.className = 'fa-solid fa-sun';
  } else {
    el.themeIcon.className = 'fa-solid fa-moon';
  }
}

// === AUTHENTICATION ===

el.loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = el.usernameInput.value;
  const password = el.passwordInput.value;

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login fehlgeschlagen');

    state.token = data.token;
    state.user = data.user;
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));

    initApp();
  } catch (err) {
    el.loginAlert.textContent = err.message;
    el.loginAlert.classList.remove('d-none');
  }
});

el.btnLogoutBtn.addEventListener('click', () => {
  state.token = null;
  state.user = null;
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  location.reload();
});

// === APP INITIALIZATION ===

function initApp() {
  if (!state.token) {
    el.loginSection.classList.remove('d-none');
    el.mainSection.classList.add('d-none');
    return;
  }

  el.loginSection.classList.add('d-none');
  el.mainSection.classList.remove('d-none');
  el.userBadge.textContent = `${state.user.username} (${state.user.role === 'admin' ? 'Admin' : 'User'})`;

  // Show/Hide Admin links and Camera Edit buttons based on permissions
  if (state.user.role === 'admin') {
    el.navAdminLink.classList.remove('d-none');
  } else {
    el.navAdminLink.classList.add('d-none');
  }

  if (state.user.can_edit) {
    el.btnAddCameraModalOpenBtn.classList.remove('d-none');
  } else {
    el.btnAddCameraModalOpenBtn.classList.add('d-none');
  }

  loadCameras();
}

// Navigation
el.btnCamerasView.addEventListener('click', (e) => {
  e.preventDefault();
  el.camerasPage.classList.remove('d-none');
  el.adminPage.classList.add('d-none');
  el.btnCamerasView.classList.add('active');
  el.btnAdminView.classList.remove('active');
  loadCameras();
});

el.btnAdminView.addEventListener('click', (e) => {
  e.preventDefault();
  el.camerasPage.classList.add('d-none');
  el.adminPage.classList.remove('d-none');
  el.btnCamerasView.classList.remove('active');
  el.btnAdminView.classList.add('active');
  loadUsers();
});

// === CAMERA CRUD ===

async function loadCameras() {
  if (!state.user.can_view) {
    el.cameraGrid.innerHTML = '<div class="alert alert-warning w-100">Keine Berechtigung zum Betrachten von Kameras.</div>';
    return;
  }

  try {
    const res = await fetch('/api/cameras', {
      headers: { 'Authorization': `Bearer ${state.token}` }
    });
    const cameras = await res.json();
    renderCameras(cameras);
  } catch (err) {
    console.error('Failed to load cameras:', err);
  }
}

function renderCameras(cameras) {
  el.cameraGrid.innerHTML = '';
  if (cameras.length === 0) {
    el.cameraGrid.innerHTML = '<div class="col-12"><div class="alert alert-info text-center">Keine Kameras vorhanden. Klicke auf "Kamera hinzufügen".</div></div>';
    return;
  }

  cameras.forEach(c => {
    const card = document.createElement('div');
    card.className = 'col';
    
    // Check if user has edit rights to show modify buttons
    const editButtons = state.user.can_edit ? `
      <div class="card-footer bg-transparent border-top-0 d-flex justify-content-between">
        <button class="btn btn-outline-secondary btn-sm" onclick="openEditCameraModal(${c.id}, '${c.name}', '${c.url}')"><i class="fa-solid fa-edit me-1"></i>Edit</button>
        <button class="btn btn-outline-danger btn-sm" onclick="deleteCamera(${c.id})"><i class="fa-solid fa-trash me-1"></i>Löschen</button>
      </div>
    ` : '';

    card.innerHTML = `
      <div class="card h-100 shadow-sm camera-card-hover">
        <div class="card-body d-flex flex-column justify-content-between" onclick="openPlayer(${c.id}, '${c.name}')" style="cursor: pointer;">
          <div>
            <h5 class="card-title fw-bold mb-1"><i class="fa-solid fa-video me-2 text-primary"></i>${c.name}</h5>
            <p class="text-muted small text-break mb-0">${c.url}</p>
          </div>
          <div class="mt-3 text-end text-primary small fw-bold">
            Stream starten <i class="fa-solid fa-chevron-right ms-1"></i>
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
  el.cameraModalTitle.textContent = 'Kamera hinzufügen';
  el.cameraModal.show();
});

// Open Edit Camera Modal
window.openEditCameraModal = (id, name, url) => {
  el.cameraIdField.value = id;
  el.cameraNameInput.value = name;
  el.cameraUrlInput.value = url;
  el.cameraModalTitle.textContent = 'Kamera bearbeiten';
  el.cameraModal.show();
};

// Save Camera (Create / Update)
el.cameraForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = el.cameraIdField.value;
  const name = el.cameraNameInput.value;
  const url = el.cameraUrlInput.value;

  const method = id ? 'PUT' : 'POST';
  const apiPath = id ? `/api/cameras/${id}` : '/api/cameras';

  try {
    const res = await fetch(apiPath, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.token}`
      },
      body: JSON.stringify({ name, url })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Speichern fehlgeschlagen');
    }
    el.cameraModal.hide();
    loadCameras();
  } catch (err) {
    alert(err.message);
  }
});

// Delete Camera
window.deleteCamera = async (id) => {
  if (!confirm('Möchtest du diese Kamera wirklich löschen?')) return;
  try {
    const res = await fetch(`/api/cameras/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${state.token}` }
    });
    if (!res.ok) throw new Error('Löschen fehlgeschlagen');
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
  
  // Start with default WebRTC
  switchPlaybackMode('webrtc');
};

function switchPlaybackMode(mode) {
  state.playbackMode = mode;
  stopPlayback();

  if (mode === 'webrtc') {
    el.btnModeWebRTC.classList.add('active');
    el.btnModeMJPEG.classList.remove('active');
    playWebRTC(state.activeCameraId, el.webrtcVideo, el.playerStatus, state.token);
  } else {
    el.btnModeWebRTC.classList.remove('active');
    el.btnModeMJPEG.classList.add('active');
    
    el.playerStatus.textContent = 'Verbinde mit MJPEG-Transcoder...';
    el.mjpegImg.src = `/api/streams/mjpeg/${state.activeCameraId}?token=${state.token}`;
    el.mjpegImg.classList.remove('d-none');
    
    el.mjpegImg.onload = () => {
      el.playerStatus.textContent = 'Verbunden (Live MJPEG)';
    };
    el.mjpegImg.onerror = () => {
      el.playerStatus.textContent = 'Transcodierungs-Fehler (Prüfe die RTSP URL)';
    };
  }
}

function stopPlayback() {
  stopWebRTC();
  el.webrtcVideo.srcObject = null;
  el.webrtcVideo.classList.add('d-none');
  
  el.mjpegImg.src = '';
  el.mjpegImg.classList.add('d-none');
}

el.btnModeWebRTC.addEventListener('click', () => switchPlaybackMode('webrtc'));
el.btnModeMJPEG.addEventListener('click', () => switchPlaybackMode('mjpeg'));

document.getElementById('playerModal').addEventListener('hidden.bs.modal', () => {
  stopPlayback();
});

// === USER MANAGEMENT (Admin only) ===

async function loadUsers() {
  try {
    const res = await fetch('/api/users', {
      headers: { 'Authorization': `Bearer ${state.token}` }
    });
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
    
    // Enable toggles only if it's not the logged-in admin user themselves
    const isSelf = u.id === state.user.id;
    const disabledAttr = isSelf ? 'disabled' : '';

    row.innerHTML = `
      <td class="fw-bold">${u.username} ${isSelf ? '<span class="badge bg-secondary text-light ms-1">Du</span>' : ''}</td>
      <td>
        <select class="form-select form-select-sm" ${disabledAttr} onchange="updateUserPermissions(${u.id}, this.value, ${u.can_view}, ${u.can_edit})">
          <option value="user" ${u.role === 'user' ? 'selected' : ''}>Standard Benutzer</option>
          <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Administrator</option>
        </select>
      </td>
      <td>
        <div class="form-check form-switch">
          <input class="form-check-input" type="checkbox" ${disabledAttr} ${u.can_view ? 'checked' : ''} onchange="updateUserPermissions(${u.id}, null, this.checked, null)">
        </div>
      </td>
      <td>
        <div class="form-check form-switch">
          <input class="form-check-input" type="checkbox" ${disabledAttr} ${u.can_edit ? 'checked' : ''} onchange="updateUserPermissions(${u.id}, null, null, this.checked)">
        </div>
      </td>
      <td class="text-end">
        <button class="btn btn-outline-danger btn-sm" ${disabledAttr} onclick="deleteUser(${u.id})"><i class="fa-solid fa-user-xmark"></i></button>
      </td>
    `;
    el.userTableBody.appendChild(row);
  });
}

// Open Add User Modal
el.btnAddUserModalOpenBtn.addEventListener('click', () => {
  el.userForm.reset();
  el.userModal.show();
});

// Create User
el.userForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = el.newUsernameInput.value;
  const password = el.newPasswordInput.value;
  const role = el.newUserRole.value;
  const can_view = el.newUserView.checked;
  const can_edit = el.newUserEdit.checked;

  try {
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.token}`
      },
      body: JSON.stringify({ username, password, role, can_view, can_edit })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Erstellen fehlgeschlagen');
    }
    el.userModal.hide();
    loadUsers();
  } catch (err) {
    alert(err.message);
  }
});

// Update User Permissions
window.updateUserPermissions = async (id, newRole = null, newCanView = null, newCanEdit = null) => {
  // Find current user row configuration in UI
  try {
    // Get all current users to find the correct state if parameters are null
    const resList = await fetch('/api/users', {
      headers: { 'Authorization': `Bearer ${state.token}` }
    });
    const users = await resList.json();
    const targetUser = users.find(u => u.id === id);
    if (!targetUser) return;

    const role = newRole !== null ? newRole : targetUser.role;
    const can_view = newCanView !== null ? newCanView : targetUser.can_view;
    const can_edit = newCanEdit !== null ? newCanEdit : targetUser.can_edit;

    const res = await fetch(`/api/users/${id}/permissions`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.token}`
      },
      body: JSON.stringify({ role, can_view, can_edit })
    });
    if (!res.ok) throw new Error('Berechtigungen konnten nicht aktualisiert werden');
    loadUsers();
  } catch (err) {
    alert(err.message);
  }
};

// Delete User
window.deleteUser = async (id) => {
  if (!confirm('Möchtest du diesen Benutzer wirklich löschen?')) return;
  try {
    const res = await fetch(`/api/users/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${state.token}` }
    });
    if (!res.ok) throw new Error('Löschen fehlgeschlagen');
    loadUsers();
  } catch (err) {
    alert(err.message);
  }
};

// Init application
initApp();
