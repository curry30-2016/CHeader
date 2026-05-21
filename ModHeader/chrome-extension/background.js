const STORAGE_KEY = 'modheader_config';
const ALL_RESOURCE_TYPES = [
  'main_frame', 'sub_frame', 'stylesheet', 'script', 'image', 'font',
  'object', 'xmlhttprequest', 'ping', 'csp_report', 'media',
  'websocket', 'webtransport', 'webbundle', 'other'
];

chrome.runtime.onInstalled.addListener(async () => {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  if (!result[STORAGE_KEY]) {
    const defaultConfig = createDefaultConfig();
    await chrome.storage.local.set({ [STORAGE_KEY]: defaultConfig });
  }
  await syncRules();
});

chrome.storage.onChanged.addListener(async (changes) => {
  if (changes[STORAGE_KEY]) {
    await syncRules();
  }
});

function createDefaultConfig() {
  return {
    enabled: true,
    nextRuleId: 1,
    profiles: [
      {
        id: 'profile_default',
        name: 'Default',
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
  return result[STORAGE_KEY] || createDefaultConfig();
}

async function syncRules() {
  const config = await getConfig();

  // Remove all existing dynamic rules
  const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
  const existingIds = existingRules.map(r => r.id);

  if (!config.enabled) {
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: existingIds,
      addRules: []
    });
    return;
  }

  const activeProfile = config.profiles.find(p => p.id === config.activeProfileId);
  if (!activeProfile) {
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: existingIds,
      addRules: []
    });
    return;
  }

  const enabledReqHeaders = activeProfile.requestHeaders.filter(h => h.enabled);
  const enabledResHeaders = activeProfile.responseHeaders.filter(h => h.enabled);
  const allEnabledHeaders = [...enabledReqHeaders, ...enabledResHeaders];

  if (allEnabledHeaders.length === 0) {
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: existingIds,
      addRules: []
    });
    return;
  }

  const newRules = allEnabledHeaders.map(header => {
    const ruleId = header.ruleId;
    const condition = buildCondition(activeProfile.urlFilter);

    const requestHeaders = [];
    const responseHeaders = [];

    if (header.type === 'request') {
      requestHeaders.push({
        header: header.name,
        operation: header.operation || 'set',
        value: header.value
      });
    } else {
      responseHeaders.push({
        header: header.name,
        operation: header.operation || 'set',
        value: header.value
      });
    }

    return {
      id: ruleId,
      priority: 1,
      action: {
        type: 'modifyHeaders',
        requestHeaders: requestHeaders.length > 0 ? requestHeaders : undefined,
        responseHeaders: responseHeaders.length > 0 ? responseHeaders : undefined
      },
      condition
    };
  });

  const newRuleIds = newRules.map(r => r.id);
  const removeIds = existingIds.filter(id => !newRuleIds.includes(id));

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: removeIds,
    addRules: newRules
  });
}

function buildCondition(urlFilter) {
  const condition = {
    resourceTypes: ALL_RESOURCE_TYPES
  };

  if (!urlFilter || urlFilter.type === 'all') {
    // No URL filter — applies to all URLs
    condition.urlFilter = '*';
    return condition;
  }

  const value = urlFilter.value || '';
  if (!value) {
    condition.urlFilter = '*';
    return condition;
  }

  switch (urlFilter.type) {
    case 'contains':
      condition.urlFilter = '*' + value + '*';
      break;
    case 'prefix':
      condition.urlFilter = value + '*';
      break;
    case 'regex':
      condition.regexFilter = value;
      break;
    case 'exact':
      condition.urlFilter = value;
      break;
    default:
      condition.urlFilter = '*';
  }

  return condition;
}
