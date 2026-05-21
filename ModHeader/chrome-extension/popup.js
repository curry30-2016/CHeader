const STORAGE_KEY = 'modheader_config';
let config = null;
let activeTab = 'request';
let draggedItem = null;

// DOM refs
const globalToggle = document.getElementById('globalToggle');
const profileSelect = document.getElementById('profileSelect');
const addProfileBtn = document.getElementById('addProfileBtn');
const deleteProfileBtn = document.getElementById('deleteProfileBtn');
const profileRename = document.getElementById('profileRename');
const profileNameInput = document.getElementById('profileNameInput');
const renameProfileBtn = document.getElementById('renameProfileBtn');
const headerList = document.getElementById('headerList');
const emptyState = document.getElementById('emptyState');
const addHeaderBtn = document.getElementById('addHeaderBtn');
const filterType = document.getElementById('filterType');
const filterValue = document.getElementById('filterValue');
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const exportBtn = document.getElementById('exportBtn');
const importBtn = document.getElementById('importBtn');
const importModal = document.getElementById('importModal');
const importText = document.getElementById('importText');
const importCancelBtn = document.getElementById('importCancelBtn');
const importConfirmBtn = document.getElementById('importConfirmBtn');
const optionsBtn = document.getElementById('optionsBtn');

// Initialize
document.addEventListener('DOMContentLoaded', init);

// Tab switching
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    activeTab = tab.dataset.tab;
    renderHeaders();
  });
});

// Filter change
filterType.addEventListener('change', async () => {
  const show = filterType.value !== 'all';
  filterValue.style.display = show ? 'block' : 'none';
  if (!show) filterValue.value = '';
  await saveFilter();
});

filterValue.addEventListener('change', saveFilter);
filterValue.addEventListener('blur', saveFilter);

// Global toggle
globalToggle.addEventListener('change', async () => {
  config.enabled = globalToggle.checked;
  await saveConfig();
  updateStatus();
});

// Profile actions
profileSelect.addEventListener('change', async () => {
  config.activeProfileId = profileSelect.value;
  await saveConfig();
  loadProfile();
});

addProfileBtn.addEventListener('click', () => {
  const name = prompt('New profile name:');
  if (!name || !name.trim()) return;
  addProfile(name.trim());
});

deleteProfileBtn.addEventListener('click', async () => {
  const profile = getActiveProfile();
  if (!profile) return;
  if (config.profiles.length <= 1) {
    showToast('Cannot delete the last profile');
    return;
  }
  if (!confirm(`Delete profile "${profile.name}"?`)) return;
  config.profiles = config.profiles.filter(p => p.id !== profile.id);
  if (!config.profiles.find(p => p.id === config.activeProfileId)) {
    config.activeProfileId = config.profiles[0].id;
  }
  await saveConfig();
  loadProfiles();
  loadProfile();
});

document.getElementById('optionsBtn').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

// Rename profile
profileNameInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') renameCurrentProfile();
});
renameProfileBtn.addEventListener('click', renameCurrentProfile);

// Export/Import
exportBtn.addEventListener('click', exportConfig);
importBtn.addEventListener('click', () => {
  importModal.style.display = 'flex';
  importText.value = '';
  importText.focus();
});
importCancelBtn.addEventListener('click', () => {
  importModal.style.display = 'none';
});
importConfirmBtn.addEventListener('click', importConfig);

// Add header
addHeaderBtn.addEventListener('click', () => addHeader());

// --- Core Functions ---

async function init() {
  config = await getConfig();
  if (!config) {
    config = createDefaultConfig();
    await saveConfig();
  }
  globalToggle.checked = config.enabled;
  loadProfiles();
  loadProfile();
  updateStatus();
}

function createDefaultConfig() {
  return {
    enabled: true,
    nextRuleId: 1,
    profiles: [
      {
        id: 'profile_default',
        name: 'Default Profile',
        urlFilter: { type: 'all', value: '' },
        requestHeaders: [],
        responseHeaders: []
      }
    ],
    activeProfileId: 'profile_default'
  };
}

async function getConfig() {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  return result[STORAGE_KEY] || null;
}

async function saveConfig() {
  await chrome.storage.local.set({ [STORAGE_KEY]: config });
}

function getActiveProfile() {
  return config.profiles.find(p => p.id === config.activeProfileId);
}

function loadProfiles() {
  const currentValue = profileSelect.value;
  profileSelect.innerHTML = '';
  config.profiles.forEach(p => {
    const option = document.createElement('option');
    option.value = p.id;
    option.textContent = p.name + (p.id === 'profile_default' ? ' (default)' : '');
    profileSelect.appendChild(option);
  });
  if (config.profiles.find(p => p.id === currentValue)) {
    profileSelect.value = currentValue;
  } else {
    profileSelect.value = config.activeProfileId;
  }
}

function loadProfile() {
  const profile = getActiveProfile();
  if (!profile) return;

  // Filter
  filterType.value = profile.urlFilter?.type || 'all';
  filterValue.value = profile.urlFilter?.value || '';
  filterValue.style.display = filterType.value !== 'all' ? 'block' : 'none';

  renderHeaders();
  updateStatus();
}

function renderHeaders() {
  const profile = getActiveProfile();
  if (!profile) return;

  const headers = activeTab === 'request' ? profile.requestHeaders : profile.responseHeaders;

  // Clear existing items (keep empty state)
  document.querySelectorAll('.header-item').forEach(el => el.remove());

  if (headers.length === 0) {
    emptyState.style.display = 'block';
    return;
  }

  emptyState.style.display = 'none';

  headers.forEach((header, index) => {
    const item = createHeaderElement(header, index);
    headerList.insertBefore(item, emptyState);
  });
}

function createHeaderElement(header, index) {
  const div = document.createElement('div');
  div.className = 'header-item';
  div.dataset.index = index;
  div.draggable = true;

  // Drag handle
  const drag = document.createElement('span');
  drag.className = 'header-drag';
  drag.textContent = '≡';
  drag.addEventListener('mousedown', () => {
    div.draggable = true;
  });

  // Checkbox
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.className = 'header-check';
  checkbox.checked = header.enabled;
  checkbox.addEventListener('change', async () => {
    header.enabled = checkbox.checked;
    await saveConfig();
    updateStatus();
  });

  // Name input
  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.className = 'input header-name';
  nameInput.placeholder = 'Header name';
  nameInput.value = header.name || '';
  nameInput.addEventListener('change', async () => {
    header.name = nameInput.value.trim();
    await saveConfig();
    updateStatus();
  });
  nameInput.addEventListener('blur', async () => {
    header.name = nameInput.value.trim();
    await saveConfig();
    updateStatus();
  });

  // Value input
  const valInput = document.createElement('input');
  valInput.type = 'text';
  valInput.className = 'input header-value';
  valInput.placeholder = 'Value';
  valInput.value = header.value || '';
  valInput.addEventListener('change', async () => {
    header.value = valInput.value;
    await saveConfig();
    updateStatus();
  });
  valInput.addEventListener('blur', async () => {
    header.value = valInput.value;
    await saveConfig();
    updateStatus();
  });

  // Delete button
  const del = document.createElement('button');
  del.className = 'header-delete';
  del.textContent = '✕';
  del.title = 'Remove header';
  del.addEventListener('click', async () => {
    const profile = getActiveProfile();
    const arr = activeTab === 'request' ? profile.requestHeaders : profile.responseHeaders;
    const idx = parseInt(div.dataset.index);
    arr.splice(idx, 1);
    await saveConfig();
    renderHeaders();
    updateStatus();
  });

  div.appendChild(drag);
  div.appendChild(checkbox);
  div.appendChild(nameInput);
  div.appendChild(valInput);
  div.appendChild(del);

  // Drag and drop
  div.addEventListener('dragstart', (e) => {
    draggedItem = div;
    div.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index);
  });

  div.addEventListener('dragend', () => {
    div.classList.remove('dragging');
    document.querySelectorAll('.header-item').forEach(el => el.classList.remove('drag-over'));
    draggedItem = null;
  });

  div.addEventListener('dragover', (e) => {
    e.preventDefault();
    if (div !== draggedItem) {
      div.classList.add('drag-over');
    }
  });

  div.addEventListener('dragleave', () => {
    div.classList.remove('drag-over');
  });

  div.addEventListener('drop', async (e) => {
    e.preventDefault();
    div.classList.remove('drag-over');
    if (draggedItem === div) return;

    const fromIdx = parseInt(draggedItem.dataset.index);
    const toIdx = parseInt(div.dataset.index);

    const profile = getActiveProfile();
    const arr = activeTab === 'request' ? profile.requestHeaders : profile.responseHeaders;
    const [item] = arr.splice(fromIdx, 1);
    arr.splice(toIdx, 0, item);
    await saveConfig();
    renderHeaders();
    updateStatus();
  });

  // Allow drop on empty state
  emptyState.addEventListener('dragover', (e) => e.preventDefault());
  emptyState.addEventListener('drop', async (e) => {
    e.preventDefault();
    if (!draggedItem) return;
    const fromIdx = parseInt(draggedItem.dataset.index);
    const profile = getActiveProfile();
    const arr = activeTab === 'request' ? profile.requestHeaders : profile.responseHeaders;
    const [item] = arr.splice(fromIdx, 1);
    arr.push(item);
    await saveConfig();
    renderHeaders();
    updateStatus();
  });

  return div;
}

async function addHeader() {
  const profile = getActiveProfile();
  if (!profile) return;

  const arr = activeTab === 'request' ? profile.requestHeaders : profile.responseHeaders;
  const ruleId = config.nextRuleId++;

  arr.push({
    id: `hdr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    ruleId: ruleId,
    name: '',
    value: '',
    enabled: true,
    operation: 'set',
    type: activeTab === 'request' ? 'request' : 'response'
  });

  await saveConfig();
  renderHeaders();
  updateStatus();

  // Focus the last added header's name input
  const items = document.querySelectorAll('.header-item');
  if (items.length > 0) {
    const last = items[items.length - 1];
    const nameInput = last.querySelector('.header-name');
    if (nameInput) nameInput.focus();
  }
}

async function addProfile(name) {
  const newProfile = {
    id: `profile_${Date.now()}`,
    name: name,
    urlFilter: { type: 'all', value: '' },
    requestHeaders: [],
    responseHeaders: []
  };
  config.profiles.push(newProfile);
  config.activeProfileId = newProfile.id;
  await saveConfig();
  loadProfiles();
  profileSelect.value = newProfile.id;
  loadProfile();
}

async function renameCurrentProfile() {
  const name = profileNameInput.value.trim();
  if (!name) return;
  const profile = getActiveProfile();
  if (!profile) return;
  profile.name = name;
  await saveConfig();
  profileRename.style.display = 'none';
  loadProfiles();
}

async function saveFilter() {
  const profile = getActiveProfile();
  if (!profile) return;
  profile.urlFilter = {
    type: filterType.value,
    value: filterValue.value.trim()
  };
  await saveConfig();
  updateStatus();
}

function updateStatus() {
  if (!config.enabled) {
    statusDot.className = 'status-dot';
    statusText.textContent = 'Disabled';
    return;
  }

  const profile = getActiveProfile();
  if (!profile) {
    statusDot.className = 'status-dot';
    statusText.textContent = 'No profile';
    return;
  }

  const activeHeaders = [...profile.requestHeaders, ...profile.responseHeaders]
    .filter(h => h.enabled && h.name.trim());

  if (activeHeaders.length === 0) {
    statusDot.className = 'status-dot';
    statusText.textContent = 'No active headers';
  } else {
    statusDot.className = 'status-dot active';
    statusText.textContent = `${activeHeaders.length} header${activeHeaders.length > 1 ? 's' : ''} active`;
  }
}

async function exportConfig() {
  const json = JSON.stringify(config, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `modheader-config-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

async function importConfig() {
  try {
    const data = JSON.parse(importText.value);
    if (!data.profiles || !Array.isArray(data.profiles)) {
      throw new Error('Invalid config: missing profiles array');
    }

    // Reset rule IDs to avoid conflicts
    data.nextRuleId = config.nextRuleId;
    data.profiles.forEach(profile => {
      [...profile.requestHeaders, ...profile.responseHeaders].forEach(h => {
        h.ruleId = data.nextRuleId++;
      });
    });

    // Merge: replace profiles and activeProfileId, keep nextRuleId
    config.profiles = data.profiles;
    config.activeProfileId = data.activeProfileId || data.profiles[0]?.id || config.activeProfileId;
    if (!config.profiles.find(p => p.id === config.activeProfileId)) {
      config.activeProfileId = config.profiles[0]?.id;
    }

    await saveConfig();
    loadProfiles();
    loadProfile();
    importModal.style.display = 'none';
    showToast('Configuration imported successfully');
  } catch (err) {
    alert('Invalid JSON: ' + err.message);
  }
}

// Toast notification
function showToast(msg) {
  const toast = document.createElement('div');
  toast.textContent = msg;
  toast.style.cssText = `
    position: fixed; bottom: 10px; left: 50%; transform: translateX(-50%);
    background: var(--primary); color: #fff; padding: 8px 16px;
    border-radius: 6px; font-size: 12px; z-index: 200;
    opacity: 0; transition: opacity 0.3s;
  `;
  document.body.appendChild(toast);
  requestAnimationFrame(() => { toast.style.opacity = '1'; });
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}

// Show rename input when profile name is clicked
document.querySelector('.profile-label')?.addEventListener('dblclick', () => {
  const profile = getActiveProfile();
  if (profile) {
    profileNameInput.value = profile.name;
    profileRename.style.display = 'flex';
    profileNameInput.focus();
  }
});
