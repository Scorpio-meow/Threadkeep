let allArticles = [];
let filteredArticles = [];
let currentSort = 'savedAt-desc';
let selectedArticleIds = new Set();
let currentFilter = 'all';
let currentFilterValue = '';
let isUpdatingTimestamps = false;
let isUpdatePaused = false;
let cancelUpdateRequested = false;
let activeProgressToast = null;
const CLOUD_VISIBLE_LIMIT = 15;
const SEARCH_DEBOUNCE_MS = 180;
const TOAST_DURATION_MS = 4000;
const TOAST_ERROR_DURATION_MS = 6000;
const TOAST_MS_PER_CHAR = 120;
const UNDO_TOAST_DURATION_MS = 8000;
const COPY_FEEDBACK_MS = 2500;
const RENDER_BATCH_SIZE = 60;
const LOAD_MORE_ROOT_MARGIN = '600px';
const CARD_PREVIEW_LENGTH = 150;
const UPDATE_PERSIST_BATCH_SIZE = 20;
const POST_INFO_CHECK_INTERVAL_MS = 80;
const POST_FETCH_TIMEOUT_MS = 60000;
const ANNOUNCE_DELAY_MS = 100;
const RELATIVE_TIME_PATTERN = /前$|^剛剛$/;
let searchDebounceTimer = null;
let announceTimer = null;
let confirmModalResolve = null;
let importModalResolve = null;
let currentPreviewIndex = -1;
let currentPreviewArticle = null;
let currentPreviewTab = 'embed';
let renderedCount = 0;
let loadMoreObserver = null;
const searchTextCache = new WeakMap();
const sortCollator = new Intl.Collator('zh-TW');
const textSegmenter = new Intl.Segmenter('zh-TW', { granularity: 'grapheme' });
const copyFeedbackTimers = new WeakMap();
const expandedNavGroups = new Set();
const WEEK_MS = 7 * 86400000;
const ENTER_STAGGER_LIMIT = 12;
const GREETINGS = [
  { until: 5, text: '夜深了' },
  { until: 11, text: '早安' },
  { until: 18, text: '午安' },
  { until: 24, text: '晚安' }
];
document.addEventListener('DOMContentLoaded', async () => {
  void setupThemePreference(document.getElementById('themeSelect'));
  void setupSoundSwitches({
    effectsSwitch: document.getElementById('soundEffectsSwitch'),
    musicSwitch: document.getElementById('backgroundMusicSwitch')
  });
  setupBackgroundMusic();
  setupMenus();
  setupAmbientLight();
  renderGreeting();
  await loadArticles();
  setupEventListeners();
  setupModalListeners();
  setupStorageSync();
});
function pruneSelection() {
  const ids = new Set(allArticles.map(a => a.id));
  selectedArticleIds.forEach(id => {
    if (!ids.has(id)) selectedArticleIds.delete(id);
  });
}
function setupStorageSync() {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'local') return;
    const result = applyStoredArticleChanges(allArticles, changes);
    if (!result.changed) return;
    allArticles = result.articles;
    pruneSelection();
    calculateStatistics();
    applyFilters({ keepRendered: true });
  });
}
async function loadArticles() {
  try {
    allArticles = await loadArticleRecords();
  } catch (err) {
    console.error('[Dashboard] 讀取資料失敗:', err);
    showToast('讀取資料失敗：' + (err.message || '請重新整理頁面'), { type: 'error' });
  }
  filteredArticles = [...allArticles];
  calculateStatistics();
  sortArticles();
  renderArticles();
  renderFilterNav();
}
function calculateStatistics() {
  const countOf = (filter) => allArticles.filter(article => articleMatchesFilter(article, filter, '')).length;
  const expired = countOf('expired');
  const expiredCount = document.getElementById('countExpired');
  document.getElementById('countAll').textContent = allArticles.length;
  expiredCount.textContent = expired;
  expiredCount.classList.toggle('is-alert', expired > 0);
  document.getElementById('countNoContent').textContent = countOf('noContent');
  document.getElementById('countNoTimestamp').textContent = countOf('noTimestamp');
  document.getElementById('uniqueAuthorsCount').textContent = getAuthorEntries().length;
  document.getElementById('uniqueTagsCount').textContent = getTagGroups(allArticles).length;
  const weekStart = Date.now() - WEEK_MS;
  document.getElementById('welcomeTotal').textContent = allArticles.length;
  document.getElementById('welcomeWeek').textContent = allArticles
    .filter(article => new Date(article.savedAt).getTime() >= weekStart).length;
}
function renderGreeting() {
  const hour = new Date().getHours();
  const greeting = GREETINGS.find(({ until }) => hour < until);
  document.getElementById('welcomeTitle').textContent = greeting.text;
}
function setFilter(filter, value = '') {
  currentFilter = filter;
  currentFilterValue = value;
  applyFilters({ announceResults: true });
}
function isActiveFilter(filter, value) {
  return currentFilter === filter && currentFilterValue.toLowerCase() === String(value).toLowerCase();
}
function toggleFilter(filter, value) {
  if (isActiveFilter(filter, value)) {
    setFilter('all');
  } else {
    setFilter(filter, value);
  }
}
function getFilterTitle() {
  if (currentFilter === 'tag') return `#${currentFilterValue}`;
  if (currentFilter === 'author') return currentFilterValue;
  return document.querySelector(`#viewNav [data-filter="${currentFilter}"]`).dataset.title;
}
function getTagEntries() {
  return getTagGroups(allArticles)
    .sort((a, b) => b.count - a.count)
    .map(({ key, label, count }) => ({ key, value: label, display: `#${label}`, count }));
}
function getAuthorEntries() {
  const authorCounts = new Map();
  allArticles.map(a => a.author).filter(Boolean).forEach(author => {
    authorCounts.set(author, (authorCounts.get(author) || 0) + 1);
  });
  return [...authorCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([author, count]) => ({ key: author.toLowerCase(), value: author, display: author, count }));
}
function getFocusedBadgeKey(container) {
  const active = document.activeElement;
  return active && container.contains(active) ? active.dataset.filterKey : null;
}
function restoreBadgeFocus(container, filterKey) {
  if (filterKey === null) return;
  const item = Array.from(container.querySelectorAll('[data-filter-key]'))
    .find(el => el.dataset.filterKey === filterKey);
  if (item) item.focus();
}
function getCloudWeight(count, maxCount) {
  const ratio = count / maxCount;
  if (ratio >= 0.6) return 'strong';
  if (ratio >= 0.3) return 'medium';
  return 'light';
}
function renderFilterNav() {
  document.querySelectorAll('#viewNav [data-filter]').forEach(item => {
    item.setAttribute('aria-pressed', String(item.dataset.filter === currentFilter));
  });
  renderNavGroup(document.getElementById('tagsCloud'), getTagEntries(), 'tag', '個標籤', '暫無標籤');
  renderNavGroup(document.getElementById('authorsCloud'), getAuthorEntries(), 'author', '位作者', '暫無作者');
}
function renderNavGroup(container, entries, filterType, unit, emptyText) {
  const focusedKey = getFocusedBadgeKey(container);
  container.replaceChildren();
  if (entries.length === 0) {
    const empty = document.createElement('span');
    empty.className = 'cloud-empty';
    empty.textContent = emptyText;
    container.appendChild(empty);
    return;
  }
  const expanded = expandedNavGroups.has(filterType);
  const maxCount = entries[0].count;
  const visible = expanded
    ? entries
    : entries.filter((entry, index) => index < CLOUD_VISIBLE_LIMIT || isActiveFilter(filterType, entry.value));
  visible.forEach(entry => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = filterType === 'tag' ? 'cloud-chip tag-chip' : 'cloud-chip';
    button.dataset.filterKey = entry.key;
    button.dataset.weight = getCloudWeight(entry.count, maxCount);
    button.setAttribute('aria-pressed', String(isActiveFilter(filterType, entry.value)));
    button.title = `${entry.display}，${entry.count} 篇`;
    const label = document.createElement('span');
    label.className = 'cloud-label';
    label.textContent = entry.display;
    const count = document.createElement('span');
    count.className = 'cloud-count num';
    count.textContent = entry.count;
    button.append(label, count);
    button.addEventListener('click', () => toggleFilter(filterType, entry.value));
    container.appendChild(button);
  });
  if (entries.length > CLOUD_VISIBLE_LIMIT) {
    const more = document.createElement('button');
    more.type = 'button';
    more.className = 'cloud-more';
    more.dataset.filterKey = `more-${filterType}`;
    more.setAttribute('aria-expanded', String(expanded));
    more.textContent = expanded ? '收合' : `全部 ${entries.length} ${unit}`;
    more.addEventListener('click', () => {
      if (expanded) {
        expandedNavGroups.delete(filterType);
      } else {
        expandedNavGroups.add(filterType);
      }
      renderFilterNav();
    });
    container.appendChild(more);
  }
  restoreBadgeFocus(container, focusedKey);
}
function setupEventListeners() {
  document.getElementById('searchInput').addEventListener('input', () => {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
      applyFilters({ announceResults: true });
    }, SEARCH_DEBOUNCE_MS);
  });
  document.getElementById('sortSelect').addEventListener('change', (e) => {
    currentSort = e.target.value;
    sortArticles();
    renderArticles();
  });
  document.getElementById('viewNav').addEventListener('click', (e) => {
    const item = e.target.closest('[data-filter]');
    if (item) setFilter(item.dataset.filter);
  });
  const selectAllCheckbox = document.getElementById('selectAllCheckbox');
  selectAllCheckbox.addEventListener('change', (e) => {
    toggleSelectAll(e.target.checked);
  });
  document.getElementById('clearSelectionBtn').addEventListener('click', clearSelection);
  document.getElementById('exportMenu').addEventListener('beforetoggle', (e) => {
    if (e.newState === 'open') updateExportScopeLabel();
  });
  const articlesContainer = document.getElementById('articlesContainer');
  articlesContainer.addEventListener('click', handleArticleListClick);
  articlesContainer.addEventListener('change', handleArticleListChange);
  document.getElementById('loadMoreContainer').addEventListener('click', handleLoadMoreClick);
  document.getElementById('exportBtn').addEventListener('click', exportAllEmbedCodes);
  document.getElementById('exportFeaturedBtn').addEventListener('click', exportFeaturedData);
  document.getElementById('exportFullBtn').addEventListener('click', exportFullData);
  document.getElementById('importBtn').addEventListener('click', () => {
    document.getElementById('importFileInput').click();
  });
  document.getElementById('importFileInput').addEventListener('change', handleImportFile);
  document.getElementById('updateTimestampsBtn').addEventListener('click', updateAllTimestamps);
  document.getElementById('pauseUpdateBtn')?.addEventListener('click', () => {
    if (!isUpdatingTimestamps) return;
    isUpdatePaused = !isUpdatePaused;
    const pauseBtn = document.getElementById('pauseUpdateBtn');
    const updateStatusBadge = document.getElementById('updateStatusBadge');
    const updateControlsContainer = document.getElementById('updateControlsContainer');
    if (isUpdatePaused) {
      pauseBtn.textContent = '繼續';
      updateControlsContainer.dataset.paused = 'true';
      updateStatusBadge.textContent = '已暫停';
      if (activeProgressToast) {
        activeProgressToast.setPaused(true);
      }
      showToast('貼文更新已暫停');
    } else {
      pauseBtn.textContent = '暫停';
      delete updateControlsContainer.dataset.paused;
      updateStatusBadge.textContent = '執行中';
      if (activeProgressToast) {
        activeProgressToast.setPaused(false);
      }
      showToast('繼續執行更新');
    }
  });
  document.getElementById('cancelUpdateBtn')?.addEventListener('click', () => {
    if (!isUpdatingTimestamps) return;
    cancelUpdateRequested = true;
    isUpdatePaused = false;
    const cancelBtn = document.getElementById('cancelUpdateBtn');
    if (cancelBtn) cancelBtn.disabled = true;
    const updateStatusBadge = document.getElementById('updateStatusBadge');
    if (updateStatusBadge) updateStatusBadge.textContent = '停止中...';
    showToast('正在停止更新作業...');
  });
  document.getElementById('clearBtn').addEventListener('click', clearAllArticles);
  document.getElementById('batchUpdateBtn')?.addEventListener('click', updateAllTimestamps);
  document.getElementById('batchCopyEmbedBtn').addEventListener('click', batchCopyEmbedCodes);
  document.getElementById('batchDeleteBtn').addEventListener('click', batchDeleteArticles);
}
function setupModalListeners() {
  setupPreviewModalListeners();
  document.getElementById('modalCloseBtn').addEventListener('click', () => {
    closeConfirmModal(false);
  });
  document.getElementById('modalCancelBtn').addEventListener('click', () => {
    closeConfirmModal(false);
  });
  document.getElementById('modalConfirmBtn').addEventListener('click', () => {
    closeConfirmModal(true);
  });
  document.getElementById('importModalCloseBtn').addEventListener('click', () => {
    closeImportModal(null);
  });
  document.getElementById('importModalCancelBtn').addEventListener('click', () => {
    closeImportModal(null);
  });
  document.getElementById('importModeMerge').addEventListener('click', () => {
    closeImportModal('merge');
  });
  document.getElementById('importModeOverwrite').addEventListener('click', async () => {
    const pendingResolve = importModalResolve;
    importModalResolve = null;
    deactivateModal('importModal');
    const confirmed = await showConfirm(
      '確認完全覆寫',
      `這會刪除目前已儲存的 ${allArticles.length} 篇貼文，改以匯入的檔案內容取代。此動作無法復原。`,
      { confirmText: '覆寫全部資料' }
    );
    if (pendingResolve) pendingResolve(confirmed ? 'overwrite' : null);
  });
}
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(', ');
let activeModal = null;
let modalReturnFocus = null;
let modalDismissHandler = null;
function getFocusableElements(modal) {
  return Array.from(modal.querySelectorAll(FOCUSABLE_SELECTOR))
    .filter(el => el.offsetParent !== null || el === document.activeElement);
}
function handleModalKeydown(e) {
  if (!activeModal) return;
  if (e.key === 'Escape') {
    e.preventDefault();
    if (modalDismissHandler) modalDismissHandler();
    return;
  }
  if (e.key !== 'Tab') return;
  const focusable = getFocusableElements(activeModal);
  if (focusable.length === 0) {
    e.preventDefault();
    return;
  }
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}
function activateModal(modalId, { initialFocusId, onDismiss } = {}) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  modalReturnFocus = document.activeElement;
  activeModal = modal;
  modalDismissHandler = onDismiss || null;
  modal.classList.add('active');
  document.addEventListener('keydown', handleModalKeydown, true);
  requestAnimationFrame(() => {
    if (activeModal !== modal) return;
    const initial = initialFocusId ? document.getElementById(initialFocusId) : null;
    const target = initial || getFocusableElements(modal)[0];
    if (target) target.focus();
  });
}
function deactivateModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  modal.classList.remove('active');
  if (activeModal === modal) {
    document.removeEventListener('keydown', handleModalKeydown, true);
    activeModal = null;
    modalDismissHandler = null;
    if (modalReturnFocus && typeof modalReturnFocus.focus === 'function') {
      modalReturnFocus.focus();
    }
    modalReturnFocus = null;
  }
}
function showConfirm(title, message, { confirmText = '確定', danger = true } = {}) {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalMessage').textContent = message;
  const confirmBtn = document.getElementById('modalConfirmBtn');
  confirmBtn.textContent = confirmText;
  confirmBtn.className = danger ? 'btn btn-danger-solid' : 'btn btn-primary';
  activateModal('confirmModal', {
    initialFocusId: 'modalCancelBtn',
    onDismiss: () => closeConfirmModal(false)
  });
  return new Promise((resolve) => {
    confirmModalResolve = resolve;
  });
}
function closeConfirmModal(result) {
  deactivateModal('confirmModal');
  if (confirmModalResolve) {
    confirmModalResolve(result);
    confirmModalResolve = null;
  }
}
function showImportModal(count) {
  document.getElementById('importModalMessage').textContent = `偵測到檔案中含有 ${count} 筆貼文資料。請選擇匯入模式：`;
  activateModal('importModal', {
    initialFocusId: 'importModeMerge',
    onDismiss: () => closeImportModal(null)
  });
  return new Promise((resolve) => {
    importModalResolve = resolve;
  });
}
function closeImportModal(mode) {
  deactivateModal('importModal');
  if (importModalResolve) {
    importModalResolve(mode);
    importModalResolve = null;
  }
}
function updateExportScopeLabel() {
  const count = getExportTargetArticles().length;
  document.getElementById('exportScopeLabel').textContent = selectedArticleIds.size > 0
    ? `匯出已選取的 ${count} 篇`
    : `匯出目前列表的 ${count} 篇`;
}
function getArticleSearchText(article) {
  let text = searchTextCache.get(article);
  if (text === undefined) {
    const postPath = (article.postLink || '').replace(/^https?:\/\/[^/]+/i, '');
    text = [article.content, article.author, ...(article.tags || []), postPath]
      .map(value => value || '')
      .join('\n')
      .toLowerCase();
    searchTextCache.set(article, text);
  }
  return text;
}
function applyFilters({ keepRendered = false, announceResults = false } = {}) {
  const searchTerm = document.getElementById('searchInput').value.trim().toLowerCase();
  filteredArticles = allArticles.filter(article => {
    if (!matchesFilter(article)) return false;
    return !searchTerm || getArticleSearchText(article).includes(searchTerm);
  });
  sortArticles();
  renderArticles({ keepRendered });
  renderFilterNav();
  if (announceResults) {
    announce(filteredArticles.length === 0 ? '找不到符合的貼文' : `找到 ${filteredArticles.length} 篇貼文`);
  }
}
function announce(message) {
  const region = document.getElementById('liveStatus');
  if (!region) return;
  clearTimeout(announceTimer);
  region.textContent = '';
  announceTimer = setTimeout(() => {
    region.textContent = message;
  }, ANNOUNCE_DELAY_MS);
}
function announceSelection() {
  announce(selectedArticleIds.size > 0 ? `已選取 ${selectedArticleIds.size} 篇` : '已取消全部選取');
}
function isFocusLost() {
  const active = document.activeElement;
  return !active || active === document.body || !active.isConnected || active.disabled;
}
function getCardFocusSelector(el) {
  if (el.classList.contains('article-checkbox')) return '.article-checkbox';
  if (el.dataset.action === 'filter-tag') return `[data-action="filter-tag"][data-tag="${CSS.escape(el.dataset.tag)}"]`;
  if (el.dataset.action) return `[data-action="${el.dataset.action}"]`;
  return el.tagName.toLowerCase();
}
function captureCardFocus(container) {
  const active = document.activeElement;
  const card = active && container.contains(active) ? active.closest('.article-card') : null;
  if (!card) return null;
  const cards = Array.from(container.querySelectorAll('.article-card'));
  return { id: card.dataset.id, index: cards.indexOf(card), selector: getCardFocusSelector(active) };
}
function restoreCardFocus(container, focus) {
  if (!focus) return;
  const card = container.querySelector(`.article-card[data-id="${CSS.escape(focus.id)}"]`);
  const target = card ? card.querySelector(focus.selector) : null;
  if (target) {
    target.focus();
    return;
  }
  focusArticleCardAt(focus.index);
}
function focusArticleCardAt(index) {
  const cards = document.querySelectorAll('#articlesContainer .article-card');
  const card = cards.length > 0 ? cards[Math.min(Math.max(index, 0), cards.length - 1)] : null;
  const target = card ? card.querySelector('.article-checkbox') : document.getElementById('articleListHeading');
  if (target) target.focus();
}
function focusArticleCard(articleId) {
  const card = document.querySelector(`#articlesContainer .article-card[data-id="${CSS.escape(articleId)}"]`);
  const target = card ? card.querySelector('.article-checkbox') : document.getElementById('articleListHeading');
  if (target) target.focus();
}
function focusRestoredArticle(articleId) {
  if (isFocusLost() || document.activeElement.closest('#toastContainer')) {
    focusArticleCard(articleId);
  }
}
function matchesFilter(article) {
  return articleMatchesFilter(article, currentFilter, currentFilterValue);
}
function articleMatchesFilter(article, filter, value) {
  switch (filter) {
    case 'all':
      return true;
    case 'author':
      if (!value) return true;
      return (article.author || '').toLowerCase() === value.toLowerCase();
    case 'tag':
      if (!value) return true;
      return (article.tags || []).some(tag =>
        (tag || '').toLowerCase() === value.toLowerCase()
      );
    case 'noContent':
      return !article.content || !article.content.trim();
    case 'noTimestamp':
      if (!article.timestamp) return true;
      if (!article.timestampTitle) {
        const timestamp = new Date(article.timestamp).getTime();
        const savedAt = new Date(article.savedAt).getTime();
        if (Math.abs(timestamp - savedAt) < 60000) return true;
      }
      return false;
    case 'expired':
      return isExpiredArticle(article);
    default:
      return true;
  }
}
function getArticleSortKey(article, field) {
  const parseDate = (dStr) => {
    if (!dStr) return 0;
    const parsed = new Date(dStr).getTime();
    return isNaN(parsed) ? 0 : parsed;
  };
  switch (field) {
    case 'timestamp':
      return parseDate(article.timestamp);
    case 'author':
      return (article.author || '').toLowerCase();
    default:
      return parseDate(article.savedAt);
  }
}
function sortArticles() {
  const [field, order] = currentSort.split('-');
  const direction = order === 'asc' ? 1 : -1;
  const keyed = filteredArticles.map(article => ({ article, key: getArticleSortKey(article, field) }));
  keyed.sort((a, b) => {
    const cmp = typeof a.key === 'string' ? sortCollator.compare(a.key, b.key) : a.key - b.key;
    return direction * cmp;
  });
  filteredArticles = keyed.map(entry => entry.article);
}
function setArticleListSemantics(container, hasCards) {
  if (hasCards) {
    container.setAttribute('role', 'list');
    container.setAttribute('aria-labelledby', 'articleListHeading');
  } else {
    container.removeAttribute('role');
    container.removeAttribute('aria-labelledby');
  }
}
function renderArticles({ keepRendered = false } = {}) {
  const container = document.getElementById('articlesContainer');
  if (!container) return;
  if (loadMoreObserver) loadMoreObserver.disconnect();
  masonryObserver.disconnect();
  const focus = captureCardFocus(container);
  container.innerHTML = '';
  container.classList.toggle('is-entering', !keepRendered);
  document.getElementById('loadMoreContainer').replaceChildren();
  const targetCount = keepRendered ? Math.max(renderedCount, RENDER_BATCH_SIZE) : RENDER_BATCH_SIZE;
  renderedCount = 0;
  document.getElementById('articleListHeading').textContent = getFilterTitle();
  document.getElementById('resultCount').textContent = `${filteredArticles.length} 篇`;
  setArticleListSemantics(container, filteredArticles.length > 0);
  if (filteredArticles.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.innerHTML = `
      <img class="empty-mascot" src="images/mascot-320.webp" alt="" width="320" height="334">
      <p class="empty-title">${allArticles.length === 0 ? '尚未儲存任何貼文' : '找不到符合的貼文'}</p>
      <p class="empty-description">${allArticles.length === 0 ? '在 Threads 貼文選單點「取得內嵌程式碼」，就會自動存到這裡。' : '換個分類或搜尋關鍵字試試。'}</p>
    `;
    container.appendChild(empty);
    updateSelectionUI();
    restoreCardFocus(container, focus);
    return;
  }
  appendArticleCards(container, targetCount);
  updateSelectionUI();
  markCurrentRow();
  restoreCardFocus(container, focus);
}
function appendArticleCards(container, count) {
  const loadMoreContainer = document.getElementById('loadMoreContainer');
  loadMoreContainer.replaceChildren();
  const fragment = document.createDocumentFragment();
  const end = Math.min(filteredArticles.length, renderedCount + count);
  let firstNewCard = null;
  for (let i = renderedCount; i < end; i++) {
    const card = createArticleCard(filteredArticles[i]);
    card.style.setProperty('--i', Math.min(i - renderedCount, ENTER_STAGGER_LIMIT));
    if (!firstNewCard) firstNewCard = card;
    fragment.appendChild(card);
    masonryObserver.observe(card);
  }
  renderedCount = end;
  let loadMoreBtn = null;
  if (renderedCount < filteredArticles.length) {
    loadMoreBtn = document.createElement('button');
    loadMoreBtn.type = 'button';
    loadMoreBtn.className = 'btn load-more-btn';
    loadMoreBtn.dataset.action = 'load-more';
    loadMoreBtn.textContent = `顯示更多（還有 ${filteredArticles.length - renderedCount} 篇）`;
    loadMoreContainer.appendChild(loadMoreBtn);
  }
  container.appendChild(fragment);
  if (loadMoreObserver) loadMoreObserver.disconnect();
  if (loadMoreBtn) {
    if (!loadMoreObserver) {
      loadMoreObserver = new IntersectionObserver((entries) => {
        if (entries.some(entry => entry.isIntersecting)) renderMoreArticles();
      }, { rootMargin: LOAD_MORE_ROOT_MARGIN });
    }
    loadMoreObserver.observe(loadMoreBtn);
  }
  return firstNewCard;
}
function renderMoreArticles() {
  const container = document.getElementById('articlesContainer');
  if (!container) return null;
  return appendArticleCards(container, RENDER_BATCH_SIZE);
}
function refreshRenderedCard(article) {
  const container = document.getElementById('articlesContainer');
  const card = container ? container.querySelector(`.article-card[data-id="${CSS.escape(article.id)}"]`) : null;
  if (!card) return;
  const focus = captureCardFocus(container);
  const nextCard = createArticleCard(article);
  masonryObserver.unobserve(card);
  card.replaceWith(nextCard);
  masonryObserver.observe(nextCard);
  if (focus && focus.id === article.id) restoreCardFocus(container, focus);
}
const masonryObserver = new ResizeObserver((entries) => {
  const container = document.getElementById('articlesContainer');
  const style = getComputedStyle(container);
  const rowHeight = parseFloat(style.gridAutoRows);
  const gap = parseFloat(style.columnGap);
  entries.forEach(({ target, borderBoxSize }) => {
    const height = borderBoxSize[0].blockSize;
    target.style.gridRowEnd = `span ${Math.ceil((height + gap) / rowHeight)}`;
  });
});
function findArticleById(articleId) {
  return allArticles.find(a => a.id === articleId) || null;
}
const CARD_ICON_MARKUP = {
  view: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg>',
  copy: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/></svg>',
  delete: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="4 7 20 7"/><path d="M18 7v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V7"/><path d="M9 7V4h6v3"/></svg>',
  check: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>'
};
const cardIconCache = new Map();
function cloneCardIcon(name) {
  let icon = cardIconCache.get(name);
  if (!icon) {
    const template = document.createElement('template');
    template.innerHTML = CARD_ICON_MARKUP[name];
    icon = template.content.firstElementChild;
    cardIconCache.set(name, icon);
  }
  return icon.cloneNode(true);
}
function getArticleLabel(article) {
  const author = article.author || '未填寫作者';
  const postedAt = article.timestampTitle || (article.timestamp ? formatTime(article.timestamp) : '');
  return postedAt ? `${author} 於 ${postedAt}發布的貼文` : `${author} 的貼文`;
}
function formatFullTime(isoString) {
  const date = new Date(isoString);
  if (!isoString || isNaN(date.getTime())) return '';
  return date.toLocaleString('zh-TW', { dateStyle: 'long', timeStyle: 'short' });
}
function createRowTime(article) {
  const useSavedTime = currentSort.startsWith('savedAt');
  const isoString = useSavedTime ? article.savedAt : article.timestamp;
  const displayText = formatTime(isoString);
  const line = document.createElement('span');
  line.className = 'time-info';
  line.textContent = `${useSavedTime ? '儲存' : '發文'} ${displayText}`;
  const fullTime = formatFullTime(isoString);
  line.title = fullTime || displayText;
  if (fullTime && RELATIVE_TIME_PATTERN.test(displayText)) {
    const srText = document.createElement('span');
    srText.className = 'sr-only';
    srText.textContent = `（${fullTime}）`;
    line.appendChild(srText);
  }
  return line;
}
function createCardIconButton(tagName, className, icon, label, title) {
  const button = document.createElement(tagName);
  button.className = `btn btn-icon btn-sm ${className}`.trim();
  if (tagName === 'button') button.type = 'button';
  button.setAttribute('aria-label', label);
  button.title = title;
  button.appendChild(cloneCardIcon(icon));
  return button;
}
function createArticleCard(article) {
  const card = document.createElement('div');
  card.className = 'article-card';
  card.setAttribute('role', 'listitem');
  if (selectedArticleIds.has(article.id)) {
    card.classList.add('selected');
  }
  card.dataset.id = article.id;
  const articleLabel = getArticleLabel(article);
  const chkInput = document.createElement('input');
  chkInput.type = 'checkbox';
  chkInput.className = 'check article-checkbox';
  chkInput.checked = selectedArticleIds.has(article.id);
  chkInput.dataset.articleId = article.id;
  chkInput.setAttribute('aria-label', `選取：${articleLabel}`);
  card.appendChild(chkInput);
  const wrapper = document.createElement('div');
  wrapper.className = 'card-content-wrapper';
  const header = document.createElement('div');
  header.className = 'card-header';
  const authorEl = document.createElement('h3');
  authorEl.className = 'author';
  const authorBtn = document.createElement('button');
  authorBtn.type = 'button';
  authorBtn.className = 'author-btn';
  authorBtn.dataset.action = 'preview';
  const authorName = article.author || '未填寫作者';
  const authorText = document.createElement('span');
  authorText.className = 'author-name';
  authorText.textContent = authorName;
  authorBtn.appendChild(authorText);
  authorBtn.setAttribute('aria-label', `預覽：${articleLabel}`);
  authorEl.appendChild(authorBtn);
  header.append(authorEl, createRowTime(article));
  wrapper.appendChild(header);
  const bodyEl = document.createElement('div');
  bodyEl.className = 'card-body';
  const rawContent = article.content || '';
  if (rawContent.length > CARD_PREVIEW_LENGTH) {
    const collapse = document.createElement('div');
    collapse.className = 'card-body-collapse';
    collapse.dataset.expanded = 'false';
    const textEl = document.createElement('div');
    textEl.className = 'card-body-text';
    textEl.textContent = rawContent;
    collapse.appendChild(textEl);
    bodyEl.appendChild(collapse);
    const expandBtn = document.createElement('button');
    expandBtn.type = 'button';
    expandBtn.className = 'expand-text-btn';
    expandBtn.dataset.action = 'toggle-expand';
    expandBtn.textContent = '展開全文';
    bodyEl.appendChild(expandBtn);
  } else if (rawContent) {
    bodyEl.textContent = rawContent;
  } else {
    bodyEl.classList.add('is-empty');
    bodyEl.textContent = '無內文';
  }
  wrapper.appendChild(bodyEl);
  const foot = document.createElement('div');
  foot.className = 'card-foot';
  const tagsContainer = document.createElement('div');
  tagsContainer.className = 'card-tags';
  if (isExpiredArticle(article)) {
    const badge = document.createElement('span');
    badge.className = 'badge badge-danger';
    badge.textContent = `已失效：${article.expiredReason || '無法解析'}`;
    tagsContainer.appendChild(badge);
  }
  (article.tags || []).forEach(tag => {
    const tagEl = document.createElement('button');
    tagEl.type = 'button';
    tagEl.className = 'tag-chip';
    tagEl.dataset.action = 'filter-tag';
    tagEl.dataset.tag = tag;
    tagEl.textContent = '#' + tag;
    tagEl.setAttribute('aria-pressed', String(isActiveFilter('tag', tag)));
    tagEl.setAttribute('aria-label', `依標籤「${tag}」篩選`);
    tagsContainer.appendChild(tagEl);
  });
  foot.appendChild(tagsContainer);
  const actions = document.createElement('div');
  actions.className = 'card-actions';
  const viewBtn = createCardIconButton('a', '', 'view', `在 Threads 查看原文：${articleLabel}`, '在 Threads 查看原文');
  viewBtn.href = sanitizeUrl(article.postLink || '#');
  viewBtn.target = '_blank';
  viewBtn.rel = 'noopener noreferrer';
  actions.appendChild(viewBtn);
  if (article.embedCode) {
    const copyEmbedBtn = createCardIconButton('button', 'copy-btn', 'copy', `複製內嵌碼：${articleLabel}`, '複製內嵌碼');
    copyEmbedBtn.dataset.action = 'copy-embed';
    const copyLabel = document.createElement('span');
    copyLabel.className = 'copy-label';
    copyLabel.appendChild(copyEmbedBtn.firstElementChild);
    const copyFeedback = document.createElement('span');
    copyFeedback.className = 'copy-feedback';
    copyFeedback.setAttribute('aria-hidden', 'true');
    copyFeedback.appendChild(cloneCardIcon('check'));
    copyEmbedBtn.append(copyLabel, copyFeedback);
    actions.appendChild(copyEmbedBtn);
  }
  const deleteBtn = createCardIconButton('button', 'btn-danger', 'delete', `刪除：${articleLabel}`, '刪除');
  deleteBtn.dataset.action = 'delete';
  actions.appendChild(deleteBtn);
  foot.appendChild(actions);
  wrapper.appendChild(foot);
  card.appendChild(wrapper);
  return card;
}
function handleArticleListClick(e) {
  const actionEl = e.target.closest('[data-action]');
  if (!actionEl || !e.currentTarget.contains(actionEl)) {
    openPreviewFromRowClick(e);
    return;
  }
  const card = actionEl.closest('.article-card');
  const articleId = card ? card.dataset.id : '';
  switch (actionEl.dataset.action) {
    case 'toggle-expand': {
      const collapse = actionEl.previousElementSibling;
      if (!collapse) return;
      const isExpanded = actionEl.dataset.expanded !== 'true';
      collapse.dataset.expanded = String(isExpanded);
      actionEl.textContent = isExpanded ? '收起全文' : '展開全文';
      actionEl.dataset.expanded = String(isExpanded);
      break;
    }
    case 'filter-tag':
      toggleFilter('tag', actionEl.dataset.tag);
      break;
    case 'preview':
      openPreviewModal(articleId);
      break;
    case 'copy-embed': {
      const article = findArticleById(articleId);
      if (article && article.embedCode) {
        copyTextToClipboard(article.embedCode, '內嵌代碼已複製', actionEl);
      }
      break;
    }
    case 'delete':
      deleteArticle(articleId);
      break;
  }
}
function openPreviewFromRowClick(e) {
  const card = e.target.closest('.article-card');
  if (!card || e.target.closest('a, button, input, label')) return;
  const selection = window.getSelection();
  if (selection && !selection.isCollapsed && card.contains(selection.anchorNode)) return;
  openPreviewModal(card.dataset.id);
}
function handleLoadMoreClick(e) {
  if (!e.target.closest('[data-action="load-more"]')) return;
  const firstNewCard = renderMoreArticles();
  const firstFocusable = firstNewCard ? firstNewCard.querySelector('input, button, a') : null;
  if (firstFocusable) firstFocusable.focus();
}
function handleArticleListChange(e) {
  const chk = e.target;
  if (!chk.classList.contains('article-checkbox')) return;
  const id = chk.dataset.articleId;
  const card = chk.closest('.article-card');
  if (chk.checked) {
    selectedArticleIds.add(id);
    card.classList.add('selected');
  } else {
    selectedArticleIds.delete(id);
    card.classList.remove('selected');
  }
  updateSelectionUI();
  announceSelection();
}
function syncRenderedSelection() {
  document.querySelectorAll('#articlesContainer .article-card').forEach(card => {
    const isSelected = selectedArticleIds.has(card.dataset.id);
    card.classList.toggle('selected', isSelected);
    const chk = card.querySelector('.article-checkbox');
    if (chk) chk.checked = isSelected;
  });
}
function updateSelectionUI() {
  const selectAll = document.getElementById('selectAllCheckbox');
  const batchActions = document.getElementById('batchActionsContainer');
  const selInfo = document.getElementById('selectionInfo');
  const hasSelection = selectedArticleIds.size > 0;
  if (hasSelection) {
    selInfo.textContent = `已選取 ${selectedArticleIds.size} 篇`;
  }
  batchActions.classList.toggle('is-hidden', !hasSelection);
  document.getElementById('listHeaderMain').classList.toggle('is-hidden', hasSelection);
  const hasArticles = filteredArticles.length > 0;
  const allChecked = hasArticles && filteredArticles.every(a => selectedArticleIds.has(a.id));
  const someChecked = filteredArticles.some(a => selectedArticleIds.has(a.id));
  selectAll.disabled = !hasArticles;
  selectAll.checked = allChecked;
  selectAll.indeterminate = someChecked && !allChecked;
}
function clearSelection() {
  selectedArticleIds.clear();
  syncRenderedSelection();
  updateSelectionUI();
  announceSelection();
  document.getElementById('selectAllCheckbox').focus();
}
function toggleSelectAll(checked) {
  if (checked) {
    filteredArticles.forEach(a => selectedArticleIds.add(a.id));
  } else {
    filteredArticles.forEach(a => selectedArticleIds.delete(a.id));
  }
  syncRenderedSelection();
  updateSelectionUI();
  announceSelection();
}
function showCopyFeedback(button) {
  clearTimeout(copyFeedbackTimers.get(button));
  button.dataset.feedback = 'copied';
  copyFeedbackTimers.set(button, setTimeout(() => {
    delete button.dataset.feedback;
  }, COPY_FEEDBACK_MS));
}
async function copyTextToClipboard(text, successMessage, button) {
  try {
    await navigator.clipboard.writeText(text);
    showCopyFeedback(button);
    announce(successMessage);
    void playSound('copy');
  } catch (err) {
    console.error('複製失敗:', err);
    showToast('複製失敗，瀏覽器權限受限', { type: 'error' });
  }
}
function getToastDuration(message, isError) {
  const baseDuration = isError ? TOAST_ERROR_DURATION_MS : TOAST_DURATION_MS;
  return Math.max(baseDuration, String(message).length * TOAST_MS_PER_CHAR);
}
function fadeOutToast(toast) {
  toast.classList.add('fade-out');
  toast.addEventListener('animationend', (e) => {
    if (e.target === toast) toast.remove();
  });
}
function appendStreamedText(target, text) {
  const spoken = document.createElement('span');
  spoken.className = 'sr-only';
  spoken.textContent = text;
  const visual = document.createElement('span');
  visual.setAttribute('aria-hidden', 'true');
  let index = 0;
  for (const { segment } of textSegmenter.segment(text)) {
    const char = document.createElement('span');
    char.className = 'stream-char';
    char.style.setProperty('--char-index', index++);
    char.textContent = segment;
    visual.appendChild(char);
  }
  target.append(spoken, visual);
}
function startToastTimer(toast, duration, onExpire) {
  let remaining = duration;
  let startedAt = 0;
  let timer = null;
  let stopped = false;
  const isHeld = () => toast.matches(':hover') || toast.contains(document.activeElement);
  const resume = () => {
    if (stopped || timer || isHeld()) return;
    startedAt = Date.now();
    timer = setTimeout(() => {
      timer = null;
      stopped = true;
      onExpire();
    }, remaining);
  };
  const pause = () => {
    if (!timer) return;
    clearTimeout(timer);
    timer = null;
    remaining = Math.max(0, remaining - (Date.now() - startedAt));
  };
  toast.addEventListener('mouseenter', pause);
  toast.addEventListener('focusin', pause);
  toast.addEventListener('mouseleave', resume);
  toast.addEventListener('focusout', () => setTimeout(resume));
  resume();
  return {
    stop() {
      stopped = true;
      clearTimeout(timer);
      timer = null;
    }
  };
}
function showToast(message, options = {}) {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const isError = options.type === 'error';
  const toast = document.createElement('div');
  toast.className = isError ? 'toast toast-error' : 'toast';
  appendStreamedText(toast, String(message));
  container.appendChild(toast);
  if (isError) void playSound('error');
  const duration = options.duration || getToastDuration(message, isError);
  startToastTimer(toast, duration, () => fadeOutToast(toast));
}
function showUndoToast(message, onUndo, duration = UNDO_TOAST_DURATION_MS) {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  container.querySelectorAll('.toast-undo').forEach(el => el.remove());
  const toast = document.createElement('div');
  toast.className = 'toast toast-undo';
  const text = document.createElement('span');
  appendStreamedText(text, message);
  const undoBtn = document.createElement('button');
  undoBtn.type = 'button';
  undoBtn.className = 'toast-undo-btn';
  undoBtn.textContent = '復原';
  let settled = false;
  let toastTimer = null;
  const dismiss = () => {
    if (settled) return;
    settled = true;
    toastTimer.stop();
    fadeOutToast(toast);
  };
  undoBtn.addEventListener('click', async () => {
    if (settled) return;
    dismiss();
    await onUndo();
  });
  toast.appendChild(text);
  toast.appendChild(undoBtn);
  container.appendChild(toast);
  toastTimer = startToastTimer(toast, duration, dismiss);
}
async function restoreArticles(deletedArticles, message) {
  const presentKeys = new Set(allArticles.map(getArticleStorageKey));
  const restorable = deletedArticles.filter(a => !presentKeys.has(getArticleStorageKey(a)));
  await saveArticleRecords(restorable);
  allArticles = sortArticlesBySavedAt([...allArticles, ...restorable]);
  applyFilters({ keepRendered: true });
  calculateStatistics();
  focusRestoredArticle(deletedArticles[0].id);
  showToast(message);
  void playSound('undo');
}
function createProgressToast(initialMessage) {
  const container = document.getElementById('toastContainer');
  if (!container) return null;
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = initialMessage;
  container.appendChild(toast);
  let currentMsg = initialMessage;
  let isPausedState = false;
  return {
    update(message) {
      currentMsg = message;
      if (toast && toast.parentElement) {
        toast.textContent = isPausedState ? `${currentMsg} (已暫停)` : currentMsg;
      }
    },
    setPaused(paused) {
      isPausedState = paused;
      if (toast && toast.parentElement) {
        toast.textContent = isPausedState ? `${currentMsg} (已暫停)` : currentMsg;
      }
    },
    finish(finalMessage) {
      if (!toast || !toast.parentElement) {
        showToast(finalMessage);
        return;
      }
      toast.textContent = finalMessage;
      startToastTimer(toast, getToastDuration(finalMessage, false), () => fadeOutToast(toast));
    },
    dismiss() {
      if (toast && toast.parentElement) {
        toast.remove();
      }
    }
  };
}
async function batchCopyEmbedCodes() {
  const targets = allArticles.filter(a => selectedArticleIds.has(a.id) && a.embedCode);
  if (targets.length === 0) {
    showToast('選取的貼文中不包含任何內嵌程式碼');
    return;
  }
  const codes = targets.map(article => {
    let blockquoteOnly = article.embedCode;
    let previous;
    do {
      previous = blockquoteOnly;
      blockquoteOnly = blockquoteOnly.replace(/<script\b[^>]*>[\s\S]*?<\/script\b[^>]*>/gi, '');
    } while (blockquoteOnly !== previous);
    blockquoteOnly = blockquoteOnly.trim();
    return blockquoteOnly;
  }).join('\n\n');
  await copyTextToClipboard(codes, `已批次複製 ${targets.length} 篇內嵌程式碼`, document.getElementById('batchCopyEmbedBtn'));
}
async function deleteArticle(articleId) {
  const article = allArticles.find(a => a.id === articleId);
  const authorName = article ? article.author : '此貼文';
  const confirmed = await showConfirm(
    '刪除貼文確認',
    `您確定要刪除由 ${authorName} 發布的貼文嗎？刪除後可在短時間內使用「復原」還原。`,
    { confirmText: '刪除' }
  );
  if (!confirmed) return;
  const deleted = allArticles.filter(a => a.id === articleId);
  allArticles = allArticles.filter(a => a.id !== articleId);
  await removeArticleRecords(deleted);
  selectedArticleIds.delete(articleId);
  if (currentPreviewArticle && currentPreviewArticle.id === articleId) closePreviewModal();
  applyFilters({ keepRendered: true });
  calculateStatistics();
  void playSound('delete');
  showUndoToast('已刪除 1 篇貼文', () => restoreArticles(deleted, '已復原貼文'));
}
async function batchDeleteArticles() {
  if (selectedArticleIds.size === 0) return;
  const count = selectedArticleIds.size;
  const confirmed = await showConfirm(
    '批次刪除確認',
    `您確定要刪除已選取的 ${count} 篇貼文嗎？刪除後可在短時間內使用「復原」還原。`,
    { confirmText: `刪除 ${count} 篇` }
  );
  if (!confirmed) return;
  const firstDeletedIndex = filteredArticles.findIndex(a => selectedArticleIds.has(a.id));
  const deleted = allArticles.filter(a => selectedArticleIds.has(a.id));
  allArticles = allArticles.filter(a => !selectedArticleIds.has(a.id));
  await removeArticleRecords(deleted);
  if (currentPreviewArticle && deleted.some(a => a.id === currentPreviewArticle.id)) closePreviewModal();
  selectedArticleIds.clear();
  applyFilters({ keepRendered: true });
  calculateStatistics();
  if (isFocusLost()) focusArticleCardAt(firstDeletedIndex);
  void playSound('delete');
  showUndoToast(`已批次刪除 ${count} 篇貼文`, () => restoreArticles(deleted, `已復原 ${count} 篇貼文`));
}
async function clearAllArticles() {
  if (allArticles.length === 0) {
    showToast('目前沒有任何貼文資料');
    return;
  }
  const confirmed = await showConfirm(
    '清除全部資料',
    `您確定要清除目前儲存的所有 ${allArticles.length} 篇資料嗎？清除後可在短時間內使用「復原」還原，但建議先匯出完整備份。`,
    { confirmText: '清除全部' }
  );
  if (!confirmed) return;
  const snapshot = [...allArticles];
  allArticles = [];
  filteredArticles = [];
  selectedArticleIds.clear();
  await removeArticleRecords(snapshot);
  if (currentPreviewArticle) closePreviewModal();
  applyFilters();
  calculateStatistics();
  void playSound('delete');
  showUndoToast(`已清除 ${snapshot.length} 篇貼文`, () => restoreArticles(snapshot, '已復原全部貼文'));
}
async function updateAllTimestamps() {
  const updateBtn = document.getElementById('updateTimestampsBtn');
  const updateControlsContainer = document.getElementById('updateControlsContainer');
  const updateProgressText = document.getElementById('updateProgressText');
  const updateProgressFill = document.getElementById('updateProgressFill');
  const updateStatusBadge = document.getElementById('updateStatusBadge');
  const pauseUpdateBtn = document.getElementById('pauseUpdateBtn');
  const cancelUpdateBtn = document.getElementById('cancelUpdateBtn');
  const updatingStatItem = document.getElementById('updatingStatItem');
  const updatingProgressCount = document.getElementById('updatingProgressCount');
  if (isUpdatingTimestamps) {
    showToast('更新作業已在進行中');
    return;
  }
  const baseArticles = selectedArticleIds.size > 0
    ? filteredArticles.filter(a => selectedArticleIds.has(a.id))
    : filteredArticles;
  if (baseArticles.length === 0) {
    showToast('沒有貼文可以更新');
    return;
  }
  const articlesNeedingUpdate = baseArticles.filter(a => a.postLink);
  if (articlesNeedingUpdate.length === 0) {
    showToast('沒有有效的貼文連結');
    return;
  }
  const isBatch = selectedArticleIds.size > 0;
  const confirmed = await showConfirm(
    '更新貼文資料',
    `確定要更新${isBatch ? '已選取的' : '全部'} ${articlesNeedingUpdate.length} 篇貼文的精確發文時間和內文嗎？\n\n系統將重用單一背景分頁依序快速抓取 Threads 貼文，可能需要一些時間。抓取完畢後分頁將自動關閉。`,
    { confirmText: '開始更新', danger: false }
  );
  if (!confirmed) return;
  isUpdatingTimestamps = true;
  isUpdatePaused = false;
  cancelUpdateRequested = false;
  if (updateBtn) updateBtn.classList.add('is-hidden');
  if (updateControlsContainer) updateControlsContainer.classList.remove('is-hidden');
  pauseUpdateBtn.textContent = '暫停';
  pauseUpdateBtn.disabled = false;
  cancelUpdateBtn.disabled = false;
  delete updateControlsContainer.dataset.paused;
  updateStatusBadge.textContent = '執行中';
  if (updateProgressText) updateProgressText.textContent = `更新中 (0/${articlesNeedingUpdate.length})`;
  if (updateProgressFill) updateProgressFill.style.width = '0%';
  if (updatingStatItem) updatingStatItem.classList.remove('is-hidden');
  if (updatingProgressCount) updatingProgressCount.textContent = `0/${articlesNeedingUpdate.length}`;
  activeProgressToast = createProgressToast(`正在背景更新資料... (0/${articlesNeedingUpdate.length})`);
  let successCount = 0;
  let failCount = 0;
  let currentIndex = 0;
  let workerTab = null;
  async function getOrCreateWorkerTab() {
    if (workerTab && workerTab.id) {
      try {
        const tab = await chrome.tabs.get(workerTab.id);
        if (tab) return workerTab.id;
      } catch (e) {
        workerTab = null;
      }
    }
    try {
      workerTab = await chrome.tabs.create({
        url: 'about:blank',
        active: false
      });
      return workerTab.id;
    } catch (e) {
      console.error('[Dashboard] 建立背景分頁失敗:', e);
      return null;
    }
  }
  async function closeWorkerTab() {
    if (workerTab && workerTab.id) {
      try {
        await chrome.tabs.remove(workerTab.id);
      } catch (e) { }
      workerTab = null;
    }
  }
  const pendingArticles = new Set();
  let persistFailed = false;
  async function flushPendingUpdates() {
    if (pendingArticles.size === 0 || persistFailed) return;
    try {
      await mergeArticleUpdates([...pendingArticles]);
      pendingArticles.clear();
    } catch (err) {
      persistFailed = true;
      cancelUpdateRequested = true;
      console.error('[Dashboard] 寫入更新結果失敗:', err);
      showToast('寫入更新結果失敗：' + (err.message || '請稍後再試'), { type: 'error' });
    }
  }
  let wasCancelled = false;
  try {
    for (const article of articlesNeedingUpdate) {
      if (cancelUpdateRequested) {
        console.log('[Dashboard] 使用者取消批次更新');
        break;
      }
      if (isUpdatePaused) {
        await flushPendingUpdates();
      }
      while (isUpdatePaused && !cancelUpdateRequested) {
        await new Promise(resolve => setTimeout(resolve, 150));
      }
      if (cancelUpdateRequested) {
        console.log('[Dashboard] 使用者取消批次更新');
        break;
      }
      currentIndex++;
      const progressPct = Math.round((currentIndex / articlesNeedingUpdate.length) * 100);
      if (updateProgressText) {
        updateProgressText.textContent = `更新中 (${currentIndex}/${articlesNeedingUpdate.length})`;
      }
      if (updateProgressFill) {
        updateProgressFill.style.width = `${progressPct}%`;
      }
      if (updatingProgressCount) {
        updatingProgressCount.textContent = `${currentIndex}/${articlesNeedingUpdate.length}`;
      }
      try {
        const tabId = await getOrCreateWorkerTab();
        if (!tabId) {
          failCount++;
          continue;
        }
        const postInfo = await fetchPostInfoWithReusableTab(tabId, article.postLink);
        applyEmbeddableResult(article, await checkEmbeddableInTab(tabId, article.postLink));
        if (postInfo) {
          if (postInfo.status === 'expired') {
            markArticleAsExpired(article, postInfo.reason);
            failCount++;
          } else {
            clearArticleExpiredStatus(article);
            if (postInfo.datetime) {
              article.timestamp = postInfo.datetime;
              article.timestampTitle = postInfo.title || '';
            }
            if (typeof postInfo.content === 'string' && !postInfo.content.includes('加入 Threads 即可分享意見')) {
              article.content = postInfo.content;
            }
            if (Array.isArray(postInfo.tags)) {
              article.tags = postInfo.tags;
            }
            article.timestampUpdatedAt = new Date().toISOString();
            successCount++;
          }
        } else {
          await closeWorkerTab();
          failCount++;
        }
      } catch (err) {
        console.error('[Dashboard] 擷取錯誤:', err);
        await closeWorkerTab();
        failCount++;
      }
      searchTextCache.delete(article);
      pendingArticles.add(article);
      if (pendingArticles.size >= UPDATE_PERSIST_BATCH_SIZE) {
        await flushPendingUpdates();
      }
      calculateStatistics();
      refreshRenderedCard(article);
      if (activeProgressToast) {
        activeProgressToast.update(`更新進度: ${currentIndex}/${articlesNeedingUpdate.length} (成功: ${successCount}, 失敗: ${failCount})`);
      }
    }
  } finally {
    await closeWorkerTab();
    await flushPendingUpdates();
    wasCancelled = cancelUpdateRequested;
    isUpdatingTimestamps = false;
    isUpdatePaused = false;
    cancelUpdateRequested = false;
    if (updateControlsContainer) updateControlsContainer.classList.add('is-hidden');
    if (updateBtn) updateBtn.classList.remove('is-hidden');
    if (updatingStatItem) updatingStatItem.classList.add('is-hidden');
    selectedArticleIds.clear();
    calculateStatistics();
    applyFilters({ keepRendered: true });
    if (!persistFailed && !wasCancelled) void playSound('complete');
    if (currentIndex < articlesNeedingUpdate.length && wasCancelled) {
      const msg = `更新已中途停止！已處理: ${currentIndex}/${articlesNeedingUpdate.length} (成功: ${successCount}, 失敗/失效: ${failCount})`;
      if (activeProgressToast) {
        activeProgressToast.finish(msg);
      } else {
        showToast(msg);
      }
    } else {
      const msg = `資料更新完成！成功: ${successCount}, 失敗/失效: ${failCount}`;
      if (activeProgressToast) {
        activeProgressToast.finish(msg);
      } else {
        showToast(msg);
      }
    }
    activeProgressToast = null;
  }
}
async function fetchPostInfoWithReusableTab(tabId, postLink) {
  let timeoutId = null;
  const timeout = new Promise((resolve) => {
    timeoutId = setTimeout(() => {
      console.warn('[Dashboard] 擷取超過安全上限，本篇記為失敗:', postLink);
      resolve(null);
    }, POST_FETCH_TIMEOUT_MS);
  });
  try {
    return await Promise.race([fetchPostInfoFromTab(tabId, postLink), timeout]);
  } finally {
    clearTimeout(timeoutId);
  }
}
async function checkEmbeddableInTab(tabId, postLink) {
  const embedPath = getThreadsEmbedPath(postLink);
  if (!embedPath) return null;
  try {
    const [injection] = await chrome.scripting.executeScript({
      target: { tabId },
      func: (path) => (typeof checkEmbeddable === 'function' ? checkEmbeddable(location.origin + path) : null),
      args: [embedPath]
    });
    return injection ? injection.result : null;
  } catch (err) {
    console.warn('[Dashboard] 內嵌檢查失敗:', err);
    return null;
  }
}
async function fetchPostInfoFromTab(tabId, postLink) {
  try {
    const safeUrl = sanitizeUrl(postLink);
    if (safeUrl === '#') return null;
    const navPromise = waitForTabNavigation(tabId);
    await chrome.tabs.update(tabId, { url: safeUrl });
    const isComplete = await navPromise;
    if (!isComplete) {
      console.warn('[Dashboard] 分頁載入失敗或分頁已關閉:', safeUrl);
      return null;
    }
    const loadedTab = await chrome.tabs.get(tabId);
    const currentUrl = loadedTab?.url || '';
    if (!currentUrl || currentUrl === 'about:blank' || currentUrl.startsWith('chrome-error://') || !currentUrl.startsWith('http')) {
      console.warn('[Dashboard] 分頁網址異常或無法載入:', currentUrl);
      return null;
    }
    if (!isSameThreadsPostLink(safeUrl, currentUrl)) {
      return {
        status: 'expired',
        reason: 'redirected'
      };
    }
    const results = await chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: extractPostInfoFromPage,
      args: [safeUrl, POST_INFO_CHECK_INTERVAL_MS]
    });
    if (results && results[0] && results[0].result) {
      return results[0].result;
    }
    return null;
  } catch (err) {
    console.error('[Dashboard] fetchPostInfoWithReusableTab 錯誤:', err);
    return null;
  }
}
function waitForTabNavigation(tabId) {
  return new Promise((resolve) => {
    let resolved = false;
    const cleanup = () => {
      chrome.tabs.onUpdated.removeListener(listener);
      chrome.tabs.onRemoved.removeListener(removeListener);
    };
    const removeListener = (removedTabId) => {
      if (removedTabId === tabId && !resolved) {
        resolved = true;
        cleanup();
        resolve(false);
      }
    };
    const listener = (updatedTabId, changeInfo) => {
      if (updatedTabId === tabId && changeInfo.status === 'complete') {
        if (!resolved) {
          resolved = true;
          cleanup();
          resolve(true);
        }
      }
    };
    chrome.tabs.onUpdated.addListener(listener);
    chrome.tabs.onRemoved.addListener(removeListener);
  });
}
async function extractPostInfoFromPage(requestedPostLink, checkIntervalMs) {
  const createExpiredPostResult = (reason) => ({
    status: 'expired',
    reason,
    datetime: '',
    title: '',
    content: ''
  });
  const isPlatformPlaceholderSummary = (text) => {
    const normalizedText = String(text).replace(/\s+/g, ' ').trim();
    return [
      /^加入\s*Threads\s*即可分享意見/i,
      /在貼文中提及\s*@meta\.ai\s*，即可在這裡獲得解答/i,
      /查看\s*@.+\s*參與的最新對話/i,
      /See\s*what\s*@.+\s*is\s*saying\s*on\s*Threads/i
    ].some(pattern => pattern.test(normalizedText));
  };
  const isContentScriptReady = () => typeof findPostElementFromPostLink === 'function' &&
    typeof extractPostContent === 'function' &&
    typeof extractTags === 'function';
  return new Promise((resolve) => {
    const check = () => {
      const bodyText = document.body ? (document.body.innerText || document.body.textContent || '') : '';
      const isExplicitlyNotFound = /此頁面無法使用|此串文已被移除|This page isn't available|Page Not Found|Sorry, this page isn't available/i.test(bodyText) ||
        /Page Not Found/i.test(document.title || '');
      if (isExplicitlyNotFound) {
        resolve(createExpiredPostResult('post-not-found'));
        return true;
      }
      if (!isContentScriptReady()) {
        return false;
      }
      const requestedPostElement = findPostElementFromPostLink(requestedPostLink);
      if (!requestedPostElement) {
        return false;
      }
      let datetime = null;
      let title = '';
      const timeElement = requestedPostElement.querySelector('time[datetime]') || document.querySelector('time[datetime]');
      if (timeElement) {
        datetime = timeElement.getAttribute('datetime');
        title = timeElement.getAttribute('title') || '';
      }
      if (!datetime) {
        const metaTime = document.querySelector('meta[property="article:published_time"]');
        if (metaTime) {
          datetime = metaTime.getAttribute('content');
        }
      }
      if (!datetime) {
        const scripts = document.querySelectorAll('script[type="application/ld+json"]');
        for (const script of scripts) {
          try {
            const jsonData = JSON.parse(script.textContent);
            if (jsonData.datePublished) {
              datetime = jsonData.datePublished;
              break;
            }
          } catch (e) { }
        }
      }
      const content = extractPostContent(requestedPostElement);
      const metaDescription = document.querySelector('meta[property="og:description"]')?.getAttribute('content') || '';
      if (!datetime && !content && isPlatformPlaceholderSummary(metaDescription)) {
        resolve(createExpiredPostResult('fallback-summary'));
        return true;
      }
      if (datetime || content) {
        resolve({
          status: 'active',
          datetime,
          title,
          content,
          tags: extractTags(content, requestedPostElement)
        });
        return true;
      }
      return false;
    };
    let lastCheckAt = 0;
    let trailingTimer = null;
    let done = false;
    const observer = new MutationObserver(() => {
      const elapsed = performance.now() - lastCheckAt;
      if (elapsed >= checkIntervalMs) {
        runCheck();
      } else if (!trailingTimer) {
        trailingTimer = setTimeout(runCheck, checkIntervalMs - elapsed);
      }
    });
    const runCheck = () => {
      clearTimeout(trailingTimer);
      trailingTimer = null;
      lastCheckAt = performance.now();
      if (check()) {
        done = true;
        observer.disconnect();
      } else if (!isContentScriptReady()) {
        trailingTimer = setTimeout(runCheck, checkIntervalMs);
      }
    };
    runCheck();
    if (!done) {
      observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: ['datetime', 'content']
      });
    }
  });
}
function buildThreadsEmbedCode(postLink) {
  if (!postLink) return '';
  const match = postLink.match(/\/(post|t)\/([^\/\?]+)/);
  const postId = match ? match[2] : '';
  return (
    `<blockquote class="text-post-media" data-text-post-permalink="${postLink}" data-text-post-version="0" id="ig-tp-${postId}" style=" background:#FFF; border-width: 1px; border-style: solid; border-color: #00000026; border-radius: 16px; max-width:650px; margin: 1px; min-width:270px; padding:0; width:99.375%; width:-webkit-calc(100% - 2px); width:calc(100% - 2px);"> <a href="${postLink}" style=" background:#FFFFFF; line-height:0; padding:0 0; text-align:center; text-decoration:none; width:100%; font-family: -apple-system, BlinkMacSystemFont, sans-serif;" target="_blank"> <div style=" padding: 40px; display: flex; flex-direction: column; align-items: center;"><div style=" display:block; height:32px; width:32px; padding-bottom:20px;"> <svg aria-label="Threads" height="32px" role="img" viewBox="0 0 192 192" width="32px" xmlns="http://www.w3.org/2000/svg"> <path d="M141.537 88.9883C140.71 88.5919 139.87 88.2104 139.019 87.8451C137.537 60.5382 122.616 44.905 97.5619 44.745C97.4484 44.7443 97.3355 44.7443 97.222 44.7443C82.2364 44.7443 69.7731 51.1409 62.102 62.7807L75.881 72.2328C81.6116 63.5383 90.6052 61.6848 97.2286 61.6848C97.3051 61.6848 97.3819 61.6848 97.4576 61.6855C105.707 61.7381 111.932 64.1366 115.961 68.814C118.893 72.2193 120.854 76.925 121.825 82.8638C114.511 81.6207 106.601 81.2385 98.145 81.7233C74.3247 83.0954 59.0111 96.9879 60.0396 116.292C60.5615 126.084 65.4397 134.508 73.775 140.011C80.8224 144.663 89.899 146.938 99.3323 146.423C111.79 145.74 121.563 140.987 128.381 132.296C133.559 125.696 136.834 117.143 138.28 106.366C144.217 109.949 148.617 114.664 151.047 120.332C155.179 129.967 155.42 145.8 142.501 158.708C131.182 170.016 117.576 174.908 97.0135 175.059C74.2042 174.89 56.9538 167.575 45.7381 153.317C35.2355 139.966 29.8077 120.682 29.6052 96C29.8077 71.3178 35.2355 52.0336 45.7381 38.6827C56.9538 24.4249 74.2039 17.11 97.0132 16.9405C119.988 17.1113 137.539 24.4614 149.184 38.788C154.894 45.8136 159.199 54.6488 162.037 64.9503L178.184 60.6422C174.744 47.9622 169.331 37.0357 161.965 27.974C147.036 9.60668 125.202 0.195148 97.0695 0H96.9569C68.8816 0.19447 47.2921 9.6418 32.7883 28.0793C19.8819 44.4864 13.2244 67.3157 13.0007 95.9325L13 96L13.0007 96.0675C13.2244 124.684 19.8819 147.514 32.7883 163.921C47.2921 182.358 68.8816 191.806 96.9569 192H97.0695C122.03 191.827 139.624 185.292 154.118 170.811C173.081 151.866 172.51 128.119 166.26 113.541C161.776 103.087 153.227 94.5962 141.537 88.9883ZM98.4405 129.507C88.0005 130.095 77.1544 125.409 76.6196 115.372C76.2232 107.93 81.9158 99.626 99.0812 98.6368C101.047 98.5234 102.976 98.468 104.871 98.468C111.106 98.468 116.939 99.0737 122.242 100.233C120.264 124.935 108.662 128.946 98.4405 129.507Z" /></svg></div><div style=" font-size: 15px; line-height: 21px; color: #000000; font-weight: 600; "> 在 Threads 查看</div></div></a></blockquote>\n` +
    `<script async src="https://www.threads.com/embed.js"></script>`
  );
}
function sanitizeUrl(rawUrl, base = 'https://www.threads.com') {
  if (!rawUrl || typeof rawUrl !== 'string') return '#';
  try {
    const url = new URL(rawUrl, base);
    if (!['http:', 'https:'].includes(url.protocol)) return '#';
    return url.href;
  } catch (err) {
    return '#';
  }
}
function extractThreadsPostIdFromLink(link) {
  if (!link || typeof link !== 'string') return '';
  const cleanLink = link.split(/[?#]/)[0].replace(/\/+$/, '');
  const match = cleanLink.match(/(?:\/|^)(?:post|t)\/([a-zA-Z0-9_-]+)/i);
  return match ? match[1] : '';
}
function isSameThreadsPostLink(expectedLink, actualLink) {
  const expectedPostId = extractThreadsPostIdFromLink(expectedLink);
  const actualPostId = extractThreadsPostIdFromLink(actualLink);
  return !!expectedPostId && !!actualPostId && expectedPostId === actualPostId;
}
function isExpiredArticle(article) {
  return article?.status === 'expired' || !!article?.expiredAt || !!article?.expiredReason;
}
function markArticleAsExpired(article, reason) {
  article.status = 'expired';
  article.expiredAt = article.expiredAt || new Date().toISOString();
  article.expiredReason = reason || article.expiredReason || 'unknown';
  article.expiredCheckedAt = new Date().toISOString();
}
function clearArticleExpiredStatus(article) {
  article.status = 'active';
  delete article.expiredAt;
  delete article.expiredReason;
  delete article.expiredCheckedAt;
}
function formatTime(isoString) {
  if (!isoString) return '未知';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '未知';
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return '剛剛';
  if (diffMins < 60) return `${diffMins} 分鐘前`;
  if (diffHours < 24) return `${diffHours} 小時前`;
  if (diffDays < 7) return `${diffDays} 天前`;
  return date.toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}
function getExportTargetArticles() {
  if (selectedArticleIds.size > 0) {
    const selectedList = filteredArticles.filter(a => selectedArticleIds.has(a.id));
    return selectedList.length === selectedArticleIds.size
      ? selectedList
      : allArticles.filter(a => selectedArticleIds.has(a.id));
  }
  return filteredArticles;
}
async function exportAllEmbedCodes() {
  const targetArticles = getExportTargetArticles();
  if (targetArticles.length === 0) {
    showToast('沒有內嵌程式碼可以匯出');
    return;
  }
  const articlesWithEmbed = targetArticles.filter(a => a.embedCode);
  if (articlesWithEmbed.length === 0) {
    showToast('沒有內嵌程式碼可以匯出');
    return;
  }
  const postsArray = articlesWithEmbed.map((article) => {
    let blockquoteOnly = article.embedCode;
    let previous;
    do {
      previous = blockquoteOnly;
      blockquoteOnly = blockquoteOnly.replace(/<script\b[^>]*>[\s\S]*?<\/script\b[^>]*>/gi, '');
    } while (blockquoteOnly !== previous);
    blockquoteOnly = blockquoteOnly.trim();
    const escapedCode = blockquoteOnly
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'");
    return `    '${escapedCode}'`;
  }).join(',\n');
  const jsContent = `const posts = [\n${postsArray}\n];`;
  downloadFile(jsContent, `threads-embed-codes-${new Date().toISOString().split('T')[0]}.js`, 'text/javascript');
  const isSelected = selectedArticleIds.size > 0;
  showToast(`已匯出 ${isSelected ? '已選取的 ' : ''}${articlesWithEmbed.length} 個內嵌程式碼`);
  void playSound('complete');
}
async function exportFeaturedData() {
  const targetArticles = getExportTargetArticles();
  if (targetArticles.length === 0) {
    showToast('沒有資料可以匯出');
    return;
  }
  const exportData = targetArticles.map((article) => {
    let blockquoteOnly = article.embedCode || '';
    let previous;
    do {
      previous = blockquoteOnly;
      blockquoteOnly = blockquoteOnly.replace(/<script\b[^>]*>[\s\S]*?<\/script\b[^>]*>/gi, '');
    } while (blockquoteOnly !== previous);
    blockquoteOnly = blockquoteOnly.trim();
    let author = article.author || '';
    if (author.startsWith('@')) {
      author = author.substring(1);
    }
    return {
      embedCode: blockquoteOnly,
      postLink: article.postLink || '',
      author: author,
      content: article.content || '',
      tags: article.tags || [],
      ...pickEmbeddableFields(article)
    };
  });
  const jsContent = `const posts = ${JSON.stringify(exportData, null, 4)};`;
  downloadFile(jsContent, `threads-featured-data-${new Date().toISOString().split('T')[0]}.js`, 'text/javascript');
  const isSelected = selectedArticleIds.size > 0;
  showToast(`已匯出 ${isSelected ? '已選取的 ' : ''}${exportData.length} 筆精選格式資料`);
  void playSound('complete');
}
async function exportFullData() {
  const targetArticles = getExportTargetArticles();
  if (targetArticles.length === 0) {
    showToast('沒有資料可以匯出');
    return;
  }
  const exportData = targetArticles.map((article) => {
    let blockquoteOnly = article.embedCode || '';
    let previous;
    do {
      previous = blockquoteOnly;
      blockquoteOnly = blockquoteOnly.replace(/<script\b[^>]*>[\s\S]*?<\/script\b[^>]*>/gi, '');
    } while (blockquoteOnly !== previous);
    blockquoteOnly = blockquoteOnly.trim();
    return {
      embedCode: blockquoteOnly,
      postLink: article.postLink || '',
      author: article.author || '',
      content: article.content || '',
      timestamp: article.timestamp || '',
      timestampTitle: article.timestampTitle || '',
      savedAt: article.savedAt || '',
      tags: article.tags || [],
      status: article.status || '',
      expiredAt: article.expiredAt || '',
      expiredReason: article.expiredReason || '',
      expiredCheckedAt: article.expiredCheckedAt || '',
      ...pickEmbeddableFields(article)
    };
  });
  const jsContent = `const posts = ${JSON.stringify(exportData, null, 4)};`;
  downloadFile(jsContent, `threads-full-data-${new Date().toISOString().split('T')[0]}.js`, 'text/javascript');
  const isSelected = selectedArticleIds.size > 0;
  showToast(`已匯出 ${isSelected ? '已選取的 ' : ''}${exportData.length} 筆完整資料`);
  void playSound('complete');
}
function downloadFile(content, fileName, contentType) {
  const blob = new Blob([content], { type: `${contentType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
async function handleImportFile(event) {
  const file = event.target.files[0];
  if (!file) return;
  event.target.value = '';
  try {
    const content = await file.text();
    let importedArticles = [];
    if (file.name.endsWith('.json')) {
      const jsonData = JSON.parse(content);
      if (Array.isArray(jsonData)) {
        importedArticles = jsonData;
      } else if (jsonData.savedArticles && Array.isArray(jsonData.savedArticles)) {
        importedArticles = jsonData.savedArticles;
      } else {
        throw new Error('無效的 JSON 格式');
      }
    } else {
      importedArticles = parseJsEmbedFile(content);
    }
    if (importedArticles.length === 0) {
      showToast('檔案中沒有可匯入的資料');
      return;
    }
    const mode = await showImportModal(importedArticles.length);
    if (!mode) {
      showToast('已取消匯入');
      return;
    }
    if (mode === 'merge') {
      const existingKeys = new Set(allArticles.map(getArticleStorageKey));
      const newArticles = Object.values(toArticleRecords(importedArticles)).filter(a => !existingKeys.has(getArticleStorageKey(a)));
      if (newArticles.length === 0) {
        showToast('所有項目都已存在，無需匯入');
        return;
      }
      await saveArticleRecords(newArticles);
      allArticles = sortArticlesBySavedAt([...allArticles, ...newArticles]);
      showToast(`已匯入 ${newArticles.length} 筆新資料（跳過 ${importedArticles.length - newArticles.length} 筆重複）`);
    } else if (mode === 'overwrite') {
      allArticles = await replaceAllArticleRecords(allArticles, importedArticles);
      showToast(`已匯入 ${allArticles.length} 筆資料（取代原有資料）`);
    }
    applyFilters();
    calculateStatistics();
    void playSound('complete');
  } catch (err) {
    console.error('[Dashboard] 匯入失敗:', err);
    showToast('匯入失敗：' + (err.message || '檔案格式錯誤'), { type: 'error' });
  }
}
function parseJsEmbedFile(content) {
  const articles = [];
  const jsonArrayMatch = content.match(/(?:const\s+)?posts\s*=\s*(\[[\s\S]*\])/);
  if (jsonArrayMatch) {
    try {
      const jsonData = JSON.parse(jsonArrayMatch[1].trim());
      if (Array.isArray(jsonData) && jsonData.length > 0) {
        if (jsonData[0].timestamp !== undefined || jsonData[0].postLink !== undefined) {
          return jsonData.map(item => {
            let fullEmbedCode = item.embedCode || '';
            if (fullEmbedCode && !fullEmbedCode.includes('<script')) {
              fullEmbedCode = fullEmbedCode + '\n<script async src="https://www.threads.com/embed.js"></script>';
            }
            return {
              id: item.id || `imported_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              content: item.content || '',
              author: item.author || '',
              postLink: item.postLink || '',
              embedCode: fullEmbedCode,
              timestamp: item.timestamp || '',
              timestampTitle: item.timestampTitle || '',
              tags: item.tags || [],
              savedAt: item.savedAt || new Date().toISOString(),
              status: item.status || '',
              expiredAt: item.expiredAt || '',
              expiredReason: item.expiredReason || '',
              expiredCheckedAt: item.expiredCheckedAt || '',
              ...pickEmbeddableFields(item)
            };
          });
        }
      }
    } catch (e) {
      console.log('[Dashboard] JSON 格式解析失敗，嘗試解析簡易格式', e);
    }
  }
  const arrayMatch = content.match(/(?:const\s+)?posts\s*=\s*\[([\s\S]*?)\];/);
  if (arrayMatch) {
    const arrayContent = arrayMatch[1];
    const embedCodeRegex = /'((?:[^'\\]|\\.)*)'/g;
    let match;
    while ((match = embedCodeRegex.exec(arrayContent)) !== null) {
      let embedCode = match[1];
      embedCode = embedCode.replace(/\\'/g, "'").replace(/\\\\/g, '\\');
      const linkMatch = embedCode.match(/data-text-post-permalink="([^"]+)"/);
      const postLink = linkMatch ? linkMatch[1] : '';
      if (postLink) {
        const usernameMatch = postLink.match(/threads\.(?:com)\/@([^\/]+)/);
        const username = usernameMatch ? `@${usernameMatch[1]}` : '匯入的貼文';
        const fullEmbedCode = embedCode + '\n<script async src="https://www.threads.com/embed.js"></script>';
        articles.push({
          id: `imported_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          content: '',
          author: username,
          postLink: postLink,
          embedCode: fullEmbedCode,
          timestamp: new Date().toISOString(),
          tags: [],
          savedAt: new Date().toISOString()
        });
      }
    }
  }
  return articles;
}
function isAllowedEmbedOrigin(origin) {
  if (!origin) return false;
  try {
    const url = new URL(origin);
    const hostname = url.hostname.toLowerCase();
    const allowedDomains = ['threads.net', 'threads.com', 'instagram.com'];
    return allowedDomains.some(domain => hostname === domain || hostname.endsWith('.' + domain));
  } catch (_) {
    return false;
  }
}
function setupPreviewModalListeners() {
  document.getElementById('previewRetryBtn').addEventListener('click', retryPreviewEmbed);
  document.getElementById('previewCloseBtn').addEventListener('click', closePreviewModal);
  document.getElementById('previewPrevBtn').addEventListener('click', () => navigatePreview(-1));
  document.getElementById('previewNextBtn').addEventListener('click', () => navigatePreview(1));
  document.getElementById('inspectorScrim').addEventListener('click', closePreviewModal);
  const previewCopyEmbedBtn = document.getElementById('previewCopyEmbedBtn');
  previewCopyEmbedBtn.addEventListener('click', () => {
    if (!currentPreviewArticle) return;
    let blockquoteOnly = currentPreviewArticle.embedCode || buildThreadsEmbedCode(currentPreviewArticle.postLink);
    let previous;
    do {
      previous = blockquoteOnly;
      blockquoteOnly = blockquoteOnly.replace(/<script\b[^>]*>[\s\S]*?<\/script\b[^>]*>/gi, '');
    } while (blockquoteOnly !== previous);
    blockquoteOnly = blockquoteOnly.trim();
    if (blockquoteOnly) {
      copyTextToClipboard(blockquoteOnly, '內嵌代碼已複製', previewCopyEmbedBtn);
    } else {
      showToast('無內嵌代碼可複製');
    }
  });
  document.querySelectorAll('.preview-tab').forEach(tabBtn => {
    tabBtn.addEventListener('click', () => switchPreviewTab(tabBtn.dataset.tab));
  });
  window.addEventListener('message', (event) => {
    if (!isAllowedEmbedOrigin(event.origin)) return;
    try {
      let data = event.data;
      if (typeof data === 'string') {
        try {
          data = JSON.parse(data);
        } catch (_) { }
      }
      const iframe = document.getElementById('previewIframe');
      if (data && data.type === 'THREADS_EMBED_ERROR') {
        if (iframe && event.source === iframe.contentWindow) {
          clearTimeout(previewLoadTimer);
          setPreviewState('error', 'Threads 不提供這篇貼文的內嵌卡片，可能是貼文已刪除、不公開，或只開放登入的使用者觀看（例如被列為敏感內容）。若是後者，在這個瀏覽器登入 Threads 後重新載入即可預覽；內嵌碼放到網站上時，未登入 Threads 或封鎖第三方 Cookie 的訪客也會看到錯誤。也可以切換到「原始碼與中繼資料」查看已儲存的內容，或按下方「在 Threads 開啟」。');
        }
        return;
      }
      if (data && typeof data === 'object') {
        let targetHeight = 0;
        let details = data.details;
        if (typeof details === 'string') {
          try {
            details = JSON.parse(details);
          } catch (_) { }
        }
        if (data.type === 'THREADS_EMBED_RESIZE' && data.height) {
          targetHeight = Number(data.height);
        } else if (data.type === 'MEASURE' && details && details.height) {
          targetHeight = Number(details.height);
        } else if (details && details.height) {
          targetHeight = Number(details.height);
        } else if (data.height) {
          targetHeight = Number(data.height);
        } else if (data.scrollHeight) {
          targetHeight = Number(data.scrollHeight);
        }
        if (targetHeight > 100 && targetHeight < 5000) {
          if (iframe) {
            iframe.style.height = `${targetHeight}px`;
          }
        }
      }
    } catch (e) { }
  });
  document.addEventListener('keydown', handleInspectorKeydown);
}
function handleInspectorKeydown(e) {
  if (!isInspectorShowing() || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
  if (activeModal && activeModal.id !== 'inspector') return;
  const target = e.target;
  if (target.getAttribute('role') === 'tab' || target.isContentEditable) return;
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    e.preventDefault();
    navigatePreview(e.key === 'ArrowLeft' ? -1 : 1);
  }
}
function isInspectorShowing() {
  return document.getElementById('inspector').classList.contains('active');
}
function markCurrentRow() {
  document.querySelectorAll('#articlesContainer .article-card.is-current').forEach(card => {
    card.classList.remove('is-current');
  });
  if (!currentPreviewArticle || !isInspectorShowing()) return null;
  const card = document.querySelector(`#articlesContainer .article-card[data-id="${CSS.escape(currentPreviewArticle.id)}"]`);
  if (card) card.classList.add('is-current');
  return card;
}
function openPreviewModal(articleId) {
  const index = filteredArticles.findIndex(a => a.id === articleId);
  if (index === -1) {
    const fallbackArticle = allArticles.find(a => a.id === articleId);
    if (!fallbackArticle) return;
    currentPreviewArticle = fallbackArticle;
    currentPreviewIndex = 0;
  } else {
    currentPreviewIndex = index;
    currentPreviewArticle = filteredArticles[index];
  }
  document.getElementById('inspectorScrim').classList.add('active');
  activateModal('inspector', {
    initialFocusId: 'previewCloseBtn',
    onDismiss: closePreviewModal
  });
  renderPreviewModalContent();
  markCurrentRow();
}
function closePreviewModal() {
  if (!isInspectorShowing()) return;
  const closingId = currentPreviewArticle ? currentPreviewArticle.id : null;
  document.getElementById('inspectorScrim').classList.remove('active');
  deactivateModal('inspector');
  clearTimeout(previewLoadTimer);
  document.getElementById('previewIframe').src = 'about:blank';
  currentPreviewArticle = null;
  currentPreviewIndex = -1;
  markCurrentRow();
  const card = closingId
    ? document.querySelector(`#articlesContainer .article-card[data-id="${CSS.escape(closingId)}"] .author-btn`)
    : null;
  if (card) card.focus();
}
function navigatePreview(direction) {
  if (filteredArticles.length === 0) return;
  let nextIndex = currentPreviewIndex + direction;
  if (nextIndex < 0) nextIndex = 0;
  if (nextIndex >= filteredArticles.length) nextIndex = filteredArticles.length - 1;
  if (nextIndex === currentPreviewIndex) return;
  currentPreviewIndex = nextIndex;
  currentPreviewArticle = filteredArticles[currentPreviewIndex];
  renderPreviewModalContent();
  const card = markCurrentRow();
  if (card) card.scrollIntoView({ block: 'nearest' });
}
function switchPreviewTab(tabName) {
  currentPreviewTab = tabName;
  document.querySelectorAll('.preview-tab').forEach(t => {
    const isActive = t.dataset.tab === tabName;
    t.classList.toggle('active', isActive);
    t.setAttribute('aria-selected', String(isActive));
  });
  document.querySelectorAll('.preview-pane').forEach(p => {
    p.classList.remove('active');
    p.hidden = true;
  });
  const activePane = tabName === 'embed'
    ? document.getElementById('paneEmbed')
    : document.getElementById('paneRaw');
  activePane.classList.add('active');
  activePane.hidden = false;
  renderPreviewModalContent();
}
function renderPreviewTimes(article) {
  const times = document.getElementById('previewPostTime');
  const postTimeStr = article.timestampTitle || (article.timestamp ? formatTime(article.timestamp) : '未知');
  const savedTimeStr = article.savedAt ? formatTime(article.savedAt) : '未知';
  times.replaceChildren();
  [['發文', postTimeStr, article.timestamp], ['儲存', savedTimeStr, article.savedAt]].forEach(([term, value, isoString]) => {
    const dt = document.createElement('dt');
    dt.textContent = term;
    const dd = document.createElement('dd');
    dd.textContent = value;
    dd.title = formatFullTime(isoString) || value;
    times.append(dt, dd);
  });
}
function renderPreviewModalContent() {
  if (!currentPreviewArticle) return;
  const article = currentPreviewArticle;
  const totalCount = filteredArticles.length || 1;
  const displayIndex = currentPreviewIndex >= 0 ? currentPreviewIndex + 1 : 1;
  const authorName = article.author || '未填寫作者';
  document.getElementById('previewAuthorTitle').textContent = authorName;
  document.getElementById('previewIndexCounter').textContent = `第 ${displayIndex} / ${totalCount} 篇`;
  document.getElementById('previewPrevBtn').disabled = currentPreviewIndex <= 0;
  document.getElementById('previewNextBtn').disabled = currentPreviewIndex >= totalCount - 1;
  document.getElementById('previewOpenThreadsLink').href = sanitizeUrl(article.postLink || '#');
  renderPreviewTimes(article);
  if (currentPreviewTab === 'embed') {
    renderEmbedPane(article);
  } else if (currentPreviewTab === 'raw') {
    renderRawPane(article);
  }
}
function getThreadsEmbedUrl(postLink) {
  const embedPath = getThreadsEmbedPath(postLink);
  return embedPath ? `https://www.threads.com${embedPath}` : '';
}
let previewLoadTimer = null;
function setPreviewState(state, message, { retryable = true } = {}) {
  const wrapper = document.getElementById('previewIframeWrapper');
  const spinner = document.getElementById('previewLoadingSpinner');
  const errorEl = document.getElementById('previewErrorState');
  const errorMsg = document.getElementById('previewErrorMessage');
  const retryBtn = document.getElementById('previewRetryBtn');
  if (wrapper) wrapper.dataset.state = state;
  if (spinner) spinner.classList.toggle('is-hidden', state !== 'loading');
  if (errorEl) errorEl.classList.toggle('is-hidden', state !== 'error');
  if (errorMsg && message) errorMsg.textContent = message;
  if (retryBtn) retryBtn.classList.toggle('is-hidden', !retryable);
}
function renderEmbedPane(article) {
  const iframe = document.getElementById('previewIframe');
  if (!iframe) return;
  clearTimeout(previewLoadTimer);
  iframe.onload = null;
  iframe.onerror = null;
  iframe.style.height = '360px';
  const embedUrl = getThreadsEmbedUrl(article.postLink);
  if (!embedUrl) {
    iframe.src = 'about:blank';
    setPreviewState(
      'error',
      '這篇貼文沒有可用的連結，無法載入 Threads 原生內嵌預覽。請切換到上方「原始碼與中繼資料」分頁，查看已儲存的內容。',
      { retryable: false }
    );
    return;
  }
  setPreviewState('loading');
  iframe.src = sanitizeUrl(embedUrl);
  iframe.onload = () => {
    clearTimeout(previewLoadTimer);
    const wrapper = document.getElementById('previewIframeWrapper');
    if (wrapper && wrapper.dataset.state === 'error') return;
    setPreviewState('ready');
  };
  iframe.onerror = () => {
    clearTimeout(previewLoadTimer);
    setPreviewState('error', '無法載入 Threads 原生內嵌預覽。可能是網路連線問題，或這篇貼文已被刪除。');
  };
  previewLoadTimer = setTimeout(() => {
    setPreviewState('error', '載入 Threads 原生內嵌預覽逾時。請確認網路連線後重試，或切換到「原始碼與中繼資料」分頁。');
  }, 10000);
}
function retryPreviewEmbed() {
  if (currentPreviewArticle) renderEmbedPane(currentPreviewArticle);
}
function renderRawPane(article) {
  const container = document.getElementById('previewRawView');
  if (!container) return;
  container.innerHTML = '';
  const textCard = document.createElement('section');
  textCard.className = 'preview-raw-card';
  textCard.innerHTML = `
    <h3>內文</h3>
    <p class="preview-raw-text">${escapeHtml(article.content || '無內文')}</p>
  `;
  container.appendChild(textCard);
  const embedCard = document.createElement('section');
  embedCard.className = 'preview-raw-card';
  embedCard.innerHTML = `
    <h3 id="previewRawEmbedTitle">內嵌程式碼</h3>
    <div class="preview-raw-content" role="group" aria-labelledby="previewRawEmbedTitle" tabindex="0"><code>${escapeHtml(article.embedCode || buildThreadsEmbedCode(article.postLink))}</code></div>
  `;
  container.appendChild(embedCard);
  const metaCard = document.createElement('section');
  metaCard.className = 'preview-raw-card';
  const tagsStr = (article.tags || []).map(t => escapeHtml(t)).join('、') || '無';
  const safePostLink = sanitizeUrl(article.postLink || '#');
  const postTimeStr = article.timestampTitle || article.timestamp || 'N/A';
  metaCard.innerHTML = `
    <h3>中繼資料</h3>
    <table class="preview-meta-table">
      <tbody>
        <tr><th scope="row">貼文識別碼 (ID)</th><td><code>${escapeHtml(article.id || 'N/A')}</code></td></tr>
        <tr><th scope="row">作者帳號</th><td>${escapeHtml(article.author || 'N/A')}</td></tr>
        <tr><th scope="row">貼文連結</th><td><a href="${safePostLink}" target="_blank" rel="noopener noreferrer">${escapeHtml(article.postLink || 'N/A')}</a></td></tr>
        <tr><th scope="row">發文時間</th><td>${escapeHtml(postTimeStr)}</td></tr>
        <tr><th scope="row">儲存時間</th><td>${escapeHtml(article.savedAt || 'N/A')}</td></tr>
        <tr><th scope="row">標籤清單</th><td>${tagsStr}</td></tr>
        <tr><th scope="row">貼文狀態</th><td>${escapeHtml(article.status || 'active')}${article.expiredReason ? ` (${escapeHtml(article.expiredReason)})` : ''}</td></tr>
      </tbody>
    </table>
  `;
  container.appendChild(metaCard);
}
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}