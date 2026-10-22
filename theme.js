const THEME_CACHE_KEY = 'threadsSaverTheme';
const THEME_CHOICES = ['light', 'dark'];
function applyThemePreference(preference) {
  const root = document.documentElement;
  const isExplicit = THEME_CHOICES.includes(preference);
  if (isExplicit) {
    root.dataset.theme = preference;
  } else {
    delete root.dataset.theme;
  }
  try {
    if (isExplicit) {
      localStorage.setItem(THEME_CACHE_KEY, preference);
    } else {
      localStorage.removeItem(THEME_CACHE_KEY);
    }
  } catch (_) { }
}
function readCachedThemePreference() {
  try {
    return localStorage.getItem(THEME_CACHE_KEY);
  } catch (_) {
    return null;
  }
}
async function setupThemePreference(select) {
  const syncSelect = () => {
    if (select) select.value = document.documentElement.dataset.theme || 'system';
  };
  const result = await chrome.storage.local.get([THEME_PREFERENCE_KEY]);
  applyThemePreference(result[THEME_PREFERENCE_KEY]);
  syncSelect();
  if (select) {
    select.addEventListener('change', async () => {
      if (THEME_CHOICES.includes(select.value)) {
        await chrome.storage.local.set({ [THEME_PREFERENCE_KEY]: select.value });
      } else {
        await chrome.storage.local.remove(THEME_PREFERENCE_KEY);
      }
    });
  }
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'local' || !(THEME_PREFERENCE_KEY in changes)) return;
    applyThemePreference(changes[THEME_PREFERENCE_KEY].newValue);
    syncSelect();
  });
}
applyThemePreference(readCachedThemePreference());
