const STORAGE_KEY = 'modheader_config';
let config = null;

const profileList = document.getElementById('profileList');
const addProfileBtn = document.getElementById('addProfileBtn');
const exportBtn = document.getElementById('exportBtn');
const importBtn = document.getElementById('importBtn');
const importText = document.getElementById('importText');
const backLink = document.getElementById('backLink');

document.addEventListener('DOMContentLoaded', init);
backLink.addEventListener('click', (e) => {
  e.preventDefault();
  chrome.action.openPopup();
});

async function init() {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  config = result[STORAGE_KEY];
  if (!config) {
    config = {
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
    await saveConfig();
  }
  renderProfiles();
}

async function saveConfig() {
  await chrome.storage.local.set({ [STORAGE_KEY]: config });
}

function getHeaderCount(profile) {
  const all = [...profile.requestHeaders, ...profile.responseHeaders];
  const enabled = all.filter(h => h.enabled && h.name.trim());
  return { total: all.length, enabled: enabled.length };
}

function renderProfiles() {
  profileList.innerHTML = '';

  config.profiles.forEach((profile) => {
    const card = document.createElement('div');
    card.className = 'profile-card' + (profile.id === config.activeProfileId ? ' active' : '');

    const info = document.createElement('div');
    info.className = 'profile-card-info';

    const name = document.createElement('span');
    name.className = 'profile-card-name';
    name.textContent = profile.name;

    const counts = getHeaderCount(profile);

    const count = document.createElement('span');
    count.className = 'profile-card-count';
    count.textContent = `${counts.enabled}/${counts.total} headers enabled`;

    info.appendChild(name);
    if (profile.id === config.activeProfileId) {
      const badge = document.createElement('span');
      badge.className = 'profile-card-badge';
      badge.textContent = 'ACTIVE';
      info.appendChild(badge);
    }
    info.appendChild(count);

    const actions = document.createElement('div');
    actions.className = 'profile-card-actions';

    const setActiveBtn = document.createElement('button');
    setActiveBtn.className = 'btn btn-sm';
    setActiveBtn.textContent = 'Activate';
    setActiveBtn.disabled = profile.id === config.activeProfileId;
    setActiveBtn.addEventListener('click', async () => {
      config.activeProfileId = profile.id;
      await saveConfig();
      renderProfiles();
    });

    const renameBtn = document.createElement('button');
    renameBtn.className = 'btn btn-sm';
    renameBtn.textContent = 'Rename';
    renameBtn.addEventListener('click', () => {
      const newName = prompt('Rename profile:', profile.name);
      if (newName && newName.trim()) {
        profile.name = newName.trim();
        saveConfig();
        renderProfiles();
      }
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn btn-sm btn-danger';
    deleteBtn.textContent = 'Delete';
    deleteBtn.disabled = config.profiles.length <= 1;
    deleteBtn.addEventListener('click', async () => {
      if (config.profiles.length <= 1) return;
      if (!confirm(`Delete profile "${profile.name}"?`)) return;
      config.profiles = config.profiles.filter(p => p.id !== profile.id);
      if (profile.id === config.activeProfileId) {
        config.activeProfileId = config.profiles[0].id;
      }
      await saveConfig();
      renderProfiles();
    });

    actions.appendChild(setActiveBtn);
    actions.appendChild(renameBtn);
    actions.appendChild(deleteBtn);

    card.appendChild(info);
    card.appendChild(actions);
    profileList.appendChild(card);
  });
}

addProfileBtn.addEventListener('click', async () => {
  const name = prompt('New profile name:');
  if (!name || !name.trim()) return;
  config.profiles.push({
    id: `profile_${Date.now()}`,
    name: name.trim(),
    urlFilter: { type: 'all', value: '' },
    requestHeaders: [],
    responseHeaders: []
  });
  await saveConfig();
  renderProfiles();
  showToast(`Profile "${name.trim()}" created`);
});

exportBtn.addEventListener('click', () => {
  const json = JSON.stringify(config, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `modheader-config-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
});

importBtn.addEventListener('click', async () => {
  try {
    const data = JSON.parse(importText.value);
    if (!data.profiles || !Array.isArray(data.profiles)) {
      throw new Error('Invalid config: missing profiles array');
    }

    // Assign new rule IDs
    data.profiles.forEach(profile => {
      [...profile.requestHeaders, ...profile.responseHeaders].forEach(h => {
        h.ruleId = config.nextRuleId++;
      });
    });

    config.profiles = data.profiles;
    config.activeProfileId = data.activeProfileId || data.profiles[0]?.id || config.activeProfileId;
    if (!config.profiles.find(p => p.id === config.activeProfileId)) {
      config.activeProfileId = config.profiles[0]?.id;
    }

    await saveConfig();
    renderProfiles();
    importText.value = '';
    showToast('Configuration imported successfully');
  } catch (err) {
    alert('Invalid JSON: ' + err.message);
  }
});

function showToast(msg) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = msg;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}
