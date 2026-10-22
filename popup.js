const SEARCH_DEBOUNCE_MS = 180;
const TOAST_DURATION_MS = 4000;
const TOAST_ERROR_DURATION_MS = 6000;
const TOAST_MS_PER_CHAR = 120;
const UNDO_TOAST_DURATION_MS = 8000;
const RENDER_BATCH_SIZE = 30;
const LOAD_MORE_ROOT_MARGIN = '300px';
let searchDebounceTimer = null;
let allArticles = [];
let filteredArticles = [];
let currentSort = 'savedAt-desc';
let selectedArticleIds = new Set();
let currentFilter = 'all';
let currentFilterValue = '';
let renderedCount = 0;
let loadMoreObserver = null;
const searchTextCache = new WeakMap();
const sortCollator = new Intl.Collator('zh-TW');
function pruneSelection() {
  const ids = new Set(allArticles.map(a => a.id));
  selectedArticleIds.forEach(id => {
    if (!ids.has(id)) selectedArticleIds.delete(id);
  });
}
async function restoreDeletedArticles(deletedArticles) {
  const presentKeys = new Set(allArticles.map(getArticleStorageKey));
  const restorable = deletedArticles.filter(a => !presentKeys.has(getArticleStorageKey(a)));
  await saveArticleRecords(restorable);
  allArticles = sortArticlesBySavedAt([...allArticles, ...restorable]);
}
function setupStorageSync() {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'local') return;
    const result = applyStoredArticleChanges(allArticles, changes);
    if (!result.changed) return;
    allArticles = result.articles;
    pruneSelection();
    updateFilterValueOptions();
    applyFilters({ keepRendered: true });
  });
}
function sanitizeUrl(rawUrl, base = 'https://www.threads.com') {
  if (!rawUrl || typeof rawUrl !== 'string') return '#';
  try {
    const url = new URL(rawUrl, base);
    if (!['http:', 'https:'].includes(url.protocol)) {
      return '#';
    }
    return url.href;
  } catch (err) {
    return '#';
  }
}
function isExpiredArticle(article) {
  return article?.status === 'expired' || !!article?.expiredAt || !!article?.expiredReason;
}
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', async () => {
    void setupThemePreference(null);
    await loadArticles();
    setupEventListeners();
    setupStorageSync();
  });
}
async function loadArticles() {
  try {
    allArticles = await loadArticleRecords();
  } catch (err) {
    console.error('[Popup] 讀取資料失敗:', err);
    showToast('讀取資料失敗：' + (err.message || '請重新開啟'), { type: 'error' });
  }
  filteredArticles = [...allArticles];
  sortArticles();
  renderArticles();
  updateFilterValueOptions();
}
function setupEventListeners() {
  const openDashboardBtn = document.getElementById('openDashboardBtn');
  if (openDashboardBtn) {
    openDashboardBtn.addEventListener('click', () => {
      chrome.tabs.create({ url: 'dashboard.html' });
    });
  }
  document.getElementById('searchInput').addEventListener('input', () => {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
      applyFilters();
    }, SEARCH_DEBOUNCE_MS);
  });
  const filterSelect = document.getElementById('filterSelect');
  if (filterSelect) {
    filterSelect.addEventListener('change', (e) => {
      currentFilter = e.target.value;
      currentFilterValue = '';
      updateFilterValueOptions();
      applyFilters();
    });
  }
  const filterValueSelect = document.getElementById('filterValueSelect');
  if (filterValueSelect) {
    filterValueSelect.addEventListener('change', (e) => {
      currentFilterValue = e.target.value;
      applyFilters();
    });
  }
  document.getElementById('exportBtn').addEventListener('click', exportAllEmbedCodes);
  const exportFeaturedBtn = document.getElementById('exportFeaturedBtn');
  if (exportFeaturedBtn) {
    exportFeaturedBtn.addEventListener('click', exportFeaturedData);
  }
  const exportFullBtn = document.getElementById('exportFullBtn');
  if (exportFullBtn) {
    exportFullBtn.addEventListener('click', exportFullData);
  }
  document.getElementById('importBtn').addEventListener('click', async () => {
    const source = await showImportSourceChoice();
    if (source === 'file') {
      const fileInput = document.getElementById('importFileInput');
      if (fileInput) fileInput.click();
      return;
    }
    if (source !== 'paste') return;
    const text = await showImportPasteDialog();
    if (!text) return;
    try {
      const imported = parseJsEmbedFile(text);
      if (!imported || imported.length === 0) {
        showToast('未辨識到任何匯入項目', { type: 'error' });
        return;
      }
      const mode = await showImportModeChoice(imported.length);
      if (!mode) {
        showToast('已取消匯入');
        return;
      }
      if (mode === 'merge') {
        const existingKeys = new Set(allArticles.map(getArticleStorageKey));
        const newArticles = Object.values(toArticleRecords(imported)).filter(a => !existingKeys.has(getArticleStorageKey(a)));
        if (newArticles.length === 0) {
          showToast('所有項目都已存在，無需匯入');
          return;
        }
        await saveArticleRecords(newArticles);
        allArticles = sortArticlesBySavedAt([...allArticles, ...newArticles]);
        filteredArticles = [...allArticles];
        sortArticles();
        renderArticles();
        showToast(`已匯入 ${newArticles.length} 筆新資料（跳過 ${imported.length - newArticles.length} 筆重複）`);
      } else {
        allArticles = await replaceAllArticleRecords(allArticles, imported);
        filteredArticles = [...allArticles];
        sortArticles();
        renderArticles();
        showToast(`已匯入 ${allArticles.length} 筆資料（取代原有資料）`);
      }
    } catch (err) {
      console.error('[Popup] paste import error', err);
      showToast('貼上匯入失敗: ' + (err.message || '未知錯誤'), { type: 'error' });
    }
  });
  const importFileInput = document.getElementById('importFileInput');
  if (importFileInput) {
    importFileInput.addEventListener('change', handleImportFile);
  }
  document.getElementById('clearBtn').addEventListener('click', clearAllArticles);
  document.getElementById('sortSelect').addEventListener('change', (e) => {
    currentSort = e.target.value;
    sortArticles();
    renderArticles();
  });
  const selectAllCheckbox = document.getElementById('selectAllCheckbox');
  if (selectAllCheckbox) {
    selectAllCheckbox.addEventListener('change', (e) => {
      toggleSelectAll(e.target.checked);
    });
  }
  const clearSelectionBtn = document.getElementById('clearSelectionBtn');
  if (clearSelectionBtn) {
    clearSelectionBtn.addEventListener('click', clearSelection);
  }
  const articlesContainer = document.getElementById('articlesContainer');
  articlesContainer.addEventListener('click', handleArticleListClick);
  articlesContainer.addEventListener('change', handleArticleListChange);
  updateFilterValueOptions();
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
function applyFilters({ keepRendered = false } = {}) {
  const searchTerm = (document.getElementById('searchInput')?.value || '').toLowerCase();
  filteredArticles = allArticles.filter(article => {
    if (!matchesFilter(article)) {
      return false;
    }
    return !searchTerm || getArticleSearchText(article).includes(searchTerm);
  });
  sortArticles();
  renderArticles({ keepRendered });
}
function matchesFilter(article) {
  switch (currentFilter) {
    case 'all':
      return true;
    case 'author':
      if (!currentFilterValue) return true;
      return (article.author || '').toLowerCase() === currentFilterValue.toLowerCase();
    case 'tag':
      if (!currentFilterValue) return true;
      return (article.tags || []).some(tag =>
        (tag || '').toLowerCase() === currentFilterValue.toLowerCase()
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
function updateFilterValueOptions() {
  const filterValueContainer = document.getElementById('filterValueContainer');
  const filterValueSelect = document.getElementById('filterValueSelect');
  if (!filterValueContainer || !filterValueSelect) return;
  filterValueSelect.innerHTML = '<option value="">全部</option>';
  let values = [];
  switch (currentFilter) {
    case 'author':
      values = [...new Set(allArticles.map(a => a.author).filter(Boolean))];
      values.sort((a, b) => a.localeCompare(b, 'zh-TW'));
      break;
    case 'tag':
      values = getTagGroups(allArticles).map(group => group.label);
      values.sort((a, b) => a.localeCompare(b, 'zh-TW'));
      break;
    default:
      filterValueContainer.style.display = 'none';
      return;
  }
  if (values.length > 0) {
    filterValueContainer.style.display = 'flex';
    values.forEach(value => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = value;
      option.selected = value.toLowerCase() === currentFilterValue.toLowerCase();
      filterValueSelect.appendChild(option);
    });
  } else {
    filterValueContainer.style.display = 'none';
  }
}
function getArticleSortKey(article, field) {
  const parseDate = (dateStr) => {
    if (!dateStr) return 0;
    const parsed = new Date(dateStr).getTime();
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
    const comparison = typeof a.key === 'string' ? sortCollator.compare(a.key, b.key) : a.key - b.key;
    return direction * comparison;
  });
  filteredArticles = keyed.map(entry => entry.article);
}
function renderArticles({ keepRendered = false } = {}) {
  const container = document.getElementById('articlesContainer');
  const countElement = document.getElementById('articleCount');
  countElement.textContent = `${filteredArticles.length} 篇`;
  if (loadMoreObserver) loadMoreObserver.disconnect();
  const targetCount = keepRendered ? Math.max(renderedCount, RENDER_BATCH_SIZE) : RENDER_BATCH_SIZE;
  renderedCount = 0;
  if (filteredArticles.length === 0) {
    container.innerHTML = '';
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'currentColor');
    svg.innerHTML = '<path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/>';
    empty.appendChild(svg);
    const msg = document.createElement('p');
    msg.textContent = allArticles.length === 0 ? '尚未儲存任何程式碼' : '找不到符合的程式碼';
    empty.appendChild(msg);
    if (allArticles.length === 0) {
      const help = document.createElement('p');
      help.className = 'empty-help';
      help.textContent = '在 Threads 含程式碼的文章旁點擊儲存按鈕';
      empty.appendChild(help);
    }
    container.appendChild(empty);
    return;
  }
  container.innerHTML = '';
  appendArticleCards(container, targetCount);
  updateSelectionUI();
}
function appendArticleCards(container, count) {
  const previousButton = container.querySelector('.load-more-btn');
  if (previousButton) previousButton.remove();
  const fragment = document.createDocumentFragment();
  const end = Math.min(filteredArticles.length, renderedCount + count);
  let firstNewCard = null;
  for (let i = renderedCount; i < end; i++) {
    const card = createArticleCard(filteredArticles[i]);
    if (!firstNewCard) firstNewCard = card;
    fragment.appendChild(card);
  }
  renderedCount = end;
  let loadMoreBtn = null;
  if (renderedCount < filteredArticles.length) {
    loadMoreBtn = document.createElement('button');
    loadMoreBtn.type = 'button';
    loadMoreBtn.className = 'btn load-more-btn';
    loadMoreBtn.dataset.action = 'load-more';
    loadMoreBtn.textContent = `顯示更多（還有 ${filteredArticles.length - renderedCount} 篇）`;
    fragment.appendChild(loadMoreBtn);
  }
  container.appendChild(fragment);
  if (loadMoreObserver) loadMoreObserver.disconnect();
  if (loadMoreBtn) {
    if (!loadMoreObserver) {
      loadMoreObserver = new IntersectionObserver((entries) => {
        if (entries.some(entry => entry.isIntersecting)) renderMoreArticles();
      }, { root: container, rootMargin: LOAD_MORE_ROOT_MARGIN });
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
function createArticleCard(article) {
  const card = document.createElement('div');
  card.className = 'article-card';
  if (selectedArticleIds.has(article.id)) {
    card.classList.add('selected');
  }
  card.dataset.id = article.id;
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.className = 'article-checkbox';
  checkbox.checked = selectedArticleIds.has(article.id);
  checkbox.dataset.articleId = article.id;
  card.appendChild(checkbox);
  const header = document.createElement('div');
  header.className = 'article-header';
  const authorEl = document.createElement('div');
  authorEl.className = 'author';
  authorEl.textContent = article.author || '';
  const timeInfo = document.createElement('div');
  timeInfo.className = 'time-info';
  const timePost = document.createElement('div');
  timePost.className = 'time';
  timePost.title = article.timestampTitle || article.timestamp || '';
  timePost.textContent = '發文：' + (article.timestampTitle ? article.timestampTitle : formatTime(article.timestamp));
  const timeSaved = document.createElement('div');
  timeSaved.className = 'time';
  timeSaved.title = article.savedAt || '';
  timeSaved.textContent = '儲存：' + formatTime(article.savedAt);
  timeInfo.appendChild(timePost);
  timeInfo.appendChild(timeSaved);
  header.appendChild(authorEl);
  header.appendChild(timeInfo);
  card.appendChild(header);
  const contentEl = document.createElement('div');
  contentEl.className = 'article-content';
  const contentText = (article.content || '').substring(0, 200);
  contentEl.textContent = contentText + ((article.content || '').length > 200 ? '...' : '');
  card.appendChild(contentEl);
  if (isExpiredArticle(article)) {
    const statusBadge = document.createElement('span');
    statusBadge.className = 'tag';
    statusBadge.textContent = '失效貼文';
    statusBadge.title = article.expiredReason ? `原因：${article.expiredReason}` : '已歸類為失效貼文';
    statusBadge.style.background = 'rgba(255, 48, 64, 0.12)';
    statusBadge.style.color = 'var(--danger-color)';
    statusBadge.style.marginTop = '0';
    card.appendChild(statusBadge);
  }
  if (article.tags && article.tags.length > 0) {
    const tagsContainer = document.createElement('div');
    tagsContainer.className = 'tags';
    article.tags.forEach(tag => {
      const tagEl = document.createElement('span');
      tagEl.className = 'tag';
      tagEl.textContent = '#' + (tag || '');
      tagsContainer.appendChild(tagEl);
    });
    card.appendChild(tagsContainer);
  }
  const actions = document.createElement('div');
  actions.className = 'article-actions';
  const link = document.createElement('a');
  link.className = 'action-btn';
  link.href = sanitizeUrl(article.postLink || '#');
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.textContent = '查看原文';
  actions.appendChild(link);
  if (article.embedCode) {
    const copyEmbedBtn = document.createElement('button');
    copyEmbedBtn.className = 'action-btn copy-embed-btn';
    copyEmbedBtn.setAttribute('data-article-id', article.id);
    copyEmbedBtn.dataset.action = 'copy-embed';
    copyEmbedBtn.textContent = '複製內嵌程式碼';
    actions.appendChild(copyEmbedBtn);
  }
  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'action-btn delete-btn delete-article-btn';
  deleteBtn.setAttribute('data-article-id', article.id);
  deleteBtn.dataset.action = 'delete';
  deleteBtn.textContent = '刪除';
  actions.appendChild(deleteBtn);
  card.appendChild(actions);
  return card;
}
function handleArticleListClick(e) {
  const actionEl = e.target.closest('[data-action]');
  if (!actionEl || !e.currentTarget.contains(actionEl)) return;
  switch (actionEl.dataset.action) {
    case 'load-more': {
      const firstNewCard = renderMoreArticles();
      const firstFocusable = firstNewCard ? firstNewCard.querySelector('input, button, a') : null;
      if (firstFocusable) firstFocusable.focus();
      break;
    }
    case 'copy-embed':
      copyEmbed(actionEl.dataset.articleId);
      break;
    case 'delete':
      deleteArticle(actionEl.dataset.articleId);
      break;
  }
}
function handleArticleListChange(e) {
  const checkbox = e.target;
  if (!checkbox.classList.contains('article-checkbox')) return;
  const articleId = checkbox.dataset.articleId;
  const card = checkbox.closest('.article-card');
  if (checkbox.checked) {
    selectedArticleIds.add(articleId);
    card.classList.add('selected');
  } else {
    selectedArticleIds.delete(articleId);
    card.classList.remove('selected');
  }
  updateSelectionUI();
}
function syncRenderedSelection() {
  document.querySelectorAll('#articlesContainer .article-card').forEach(card => {
    const isSelected = selectedArticleIds.has(card.dataset.id);
    card.classList.toggle('selected', isSelected);
    const checkbox = card.querySelector('.article-checkbox');
    if (checkbox) checkbox.checked = isSelected;
  });
}
function updateSelectionUI() {
  const countElement = document.getElementById('articleCount');
  const selectAllCheckbox = document.getElementById('selectAllCheckbox');
  const selectionInfo = document.getElementById('selectionInfo');
  if (selectedArticleIds.size > 0) {
    countElement.textContent = `${filteredArticles.length} 篇 (已選 ${selectedArticleIds.size})`;
    if (selectionInfo) {
      selectionInfo.textContent = `已選取 ${selectedArticleIds.size} 篇`;
      selectionInfo.style.display = 'inline';
    }
  } else {
    countElement.textContent = `${filteredArticles.length} 篇`;
    if (selectionInfo) {
      selectionInfo.style.display = 'none';
    }
  }
  if (selectAllCheckbox && filteredArticles.length > 0) {
    const allSelected = filteredArticles.every(a => selectedArticleIds.has(a.id));
    const someSelected = filteredArticles.some(a => selectedArticleIds.has(a.id));
    selectAllCheckbox.checked = allSelected;
    selectAllCheckbox.indeterminate = someSelected && !allSelected;
  }
}
function toggleSelectAll(checked) {
  if (checked) {
    filteredArticles.forEach(a => selectedArticleIds.add(a.id));
  } else {
    filteredArticles.forEach(a => selectedArticleIds.delete(a.id));
  }
  syncRenderedSelection();
  updateSelectionUI();
}
function clearSelection() {
  selectedArticleIds.clear();
  syncRenderedSelection();
  updateSelectionUI();
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
async function deleteArticle(articleId) {
  const article = allArticles.find(a => a.id === articleId);
  if (!article) return;
  allArticles = allArticles.filter(a => a.id !== articleId);
  await removeArticleRecords([article]);
  filteredArticles = filteredArticles.filter(a => a.id !== articleId);
  selectedArticleIds.delete(articleId);
  renderArticles({ keepRendered: true });
  showUndoToast('已刪除 1 篇貼文', async () => {
    await restoreDeletedArticles([article]);
    applyFilters({ keepRendered: true });
    showToast('已復原');
  });
}
if (typeof window !== 'undefined') {
  window.copyArticle = async function (articleId) {
    const article = allArticles.find(a => a.id === articleId);
    if (!article) return;
    const textToCopy = `${article.author}\n\n${article.content}\n\n來源: ${article.postLink}`;
    try {
      await navigator.clipboard.writeText(textToCopy);
      showToast('已複製到剪貼簿');
    } catch (err) {
      console.error('複製失敗:', err);
    }
  };
}
async function copyEmbed(articleId) {
  const article = allArticles.find(a => a.id === articleId);
  if (!article || !article.embedCode) {
    showToast('找不到內嵌程式碼');
    return;
  }
  try {
    await navigator.clipboard.writeText(article.embedCode);
    showToast('已複製內嵌程式碼');
  } catch (err) {
    console.error('[Popup] 複製失敗:', err);
    showToast('複製失敗: ' + err.message);
  }
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
  const blob = new Blob([jsContent], { type: 'text/javascript;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `threads-embed-codes-${new Date().toISOString().split('T')[0]}.js`;
  link.click();
  URL.revokeObjectURL(url);
  const isSelected = selectedArticleIds.size > 0;
  showToast(`已匯出 ${isSelected ? '已選取的 ' : ''}${articlesWithEmbed.length} 個內嵌程式碼`);
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
      tags: article.tags || []
    };
  });
  const jsContent = `const posts = ${JSON.stringify(exportData, null, 4)};`;
  const blob = new Blob([jsContent], { type: 'text/javascript;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `threads-featured-data-${new Date().toISOString().split('T')[0]}.js`;
  link.click();
  URL.revokeObjectURL(url);
  const isSelected = selectedArticleIds.size > 0;
  showToast(`已匯出 ${isSelected ? '已選取的 ' : ''}${exportData.length} 筆精選格式資料`);
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
      expiredCheckedAt: article.expiredCheckedAt || ''
    };
  });
  const jsContent = `const posts = ${JSON.stringify(exportData, null, 4)};`;
  const blob = new Blob([jsContent], { type: 'text/javascript;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `threads-full-data-${new Date().toISOString().split('T')[0]}.js`;
  link.click();
  URL.revokeObjectURL(url);
  const isSelected = selectedArticleIds.size > 0;
  showToast(`已匯出 ${isSelected ? '已選取的 ' : ''}${exportData.length} 筆完整資料`);
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
      showToast('檔案中沒有可匯入的資料', { type: 'error' });
      return;
    }
    const mode = await showImportModeChoice(importedArticles.length);
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
    } else {
      allArticles = await replaceAllArticleRecords(allArticles, importedArticles);
      showToast(`已匯入 ${allArticles.length} 筆資料（取代原有資料）`);
    }
    filteredArticles = [...allArticles];
    renderArticles();
  } catch (err) {
    console.error('[Popup] 匯入失敗:', err);
    showToast('匯入失敗：' + (err.message || '檔案格式錯誤'), { type: 'error' });
  } finally {
    try {
      const target = event && event.target;
      if (target && target.id === 'importFileInput') {
        target.value = '';
      }
    } catch (e) { }
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
              importedFrom: 'full-data-file'
            };
          });
        }
      }
    } catch (e) {
      console.log('[Popup] 不是 JSON 格式，嘗試解析簡易格式', e);
    }
  }
  const arrayMatch = content.match(/(?:const\s+)?posts\s*=\s*\[([\s\S]*?)\];/);
  if (arrayMatch) {
    const arrayContent = arrayMatch[1];
    const embedCodeRegex = /'((?:[^'\\]|\\.)*)'/g;
    let match;
    while ((match = embedCodeRegex.exec(arrayContent)) !== null) {
      let embedCode = match[1];
      embedCode = embedCode
        .replace(/\\'/g, "'")
        .replace(/\\\\/g, '\\');
      const linkMatch = embedCode.match(/data-text-post-permalink="([^"]+)"/);
      const postLink = linkMatch ? linkMatch[1] : '';
      if (postLink) {
        const usernameMatch = postLink.match(/threads\.(?:com)\/@([^\/]+)/);
        const username = usernameMatch ? `@${usernameMatch[1]}` : '匯入的文章';
        const fullEmbedCode = embedCode + '\n<script async src="https://www.threads.com/embed.js"></script>';
        articles.push({
          id: `imported_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          content: '',
          author: username,
          postLink: postLink,
          embedCode: fullEmbedCode,
          timestamp: new Date().toISOString(),
          tags: [],
          savedAt: new Date().toISOString(),
          importedFrom: 'js-embed-file'
        });
      }
    }
  }
  return articles;
}
async function clearAllArticles() {
  if (allArticles.length === 0) {
    showToast('目前沒有文章可以清除');
    return;
  }
  const confirmed = await showConfirm(
    '清除全部資料',
    `這會刪除已儲存的全部 ${allArticles.length} 篇貼文。此動作無法復原，建議先執行「匯出完整備份」。`,
    { confirmText: '清除全部' }
  );
  if (!confirmed) return;
  const snapshot = [...allArticles];
  await removeArticleRecords(snapshot);
  allArticles = [];
  filteredArticles = [];
  selectedArticleIds.clear();
  renderArticles();
  showUndoToast(`已清除 ${snapshot.length} 篇貼文`, async () => {
    await restoreDeletedArticles(snapshot);
    applyFilters();
    showToast('已復原全部貼文');
  });
}
function getToastDuration(message, isError) {
  const baseDuration = isError ? TOAST_ERROR_DURATION_MS : TOAST_DURATION_MS;
  return Math.max(baseDuration, String(message).length * TOAST_MS_PER_CHAR);
}
function fadeOutToast(toast) {
  toast.classList.add('fade-out');
  toast.addEventListener('animationend', () => toast.remove());
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
  toast.textContent = message;
  container.appendChild(toast);
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
  text.textContent = message;
  const undoBtn = document.createElement('button');
  undoBtn.className = 'toast-undo-btn';
  undoBtn.type = 'button';
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
let modalDismiss = null;
function getFocusableElements(modal) {
  return Array.from(modal.querySelectorAll(FOCUSABLE_SELECTOR))
    .filter(el => el.offsetParent !== null || el === document.activeElement);
}
function handleModalKeydown(e) {
  if (!activeModal) return;
  if (e.key === 'Escape') {
    e.preventDefault();
    if (modalDismiss) modalDismiss();
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
function openModal(modalId, { initialFocusId, onDismiss } = {}) {
  const modal = document.getElementById(modalId);
  if (!modal) return null;
  modalReturnFocus = document.activeElement;
  activeModal = modal;
  modalDismiss = onDismiss || null;
  modal.hidden = false;
  document.addEventListener('keydown', handleModalKeydown, true);
  requestAnimationFrame(() => {
    modal.classList.add('active');
    if (activeModal !== modal) return;
    const initial = initialFocusId ? document.getElementById(initialFocusId) : null;
    const target = initial || getFocusableElements(modal)[0];
    if (target) target.focus();
  });
  return modal;
}
function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  modal.classList.remove('active');
  modal.hidden = true;
  if (activeModal === modal) {
    document.removeEventListener('keydown', handleModalKeydown, true);
    activeModal = null;
    modalDismiss = null;
    if (modalReturnFocus && typeof modalReturnFocus.focus === 'function') {
      modalReturnFocus.focus();
    }
    modalReturnFocus = null;
  }
}
function showConfirm(title, message, { confirmText = '確定', danger = true } = {}) {
  return new Promise(resolve => {
    const titleEl = document.getElementById('confirmModalTitle');
    const messageEl = document.getElementById('confirmModalMessage');
    const confirmBtn = document.getElementById('confirmModalConfirmBtn');
    const cancelBtn = document.getElementById('confirmModalCancelBtn');
    const closeBtn = document.getElementById('confirmModalCloseBtn');
    titleEl.textContent = title;
    messageEl.textContent = message;
    confirmBtn.textContent = confirmText;
    confirmBtn.className = danger ? 'btn btn-clear' : 'btn btn-dashboard';
    const settle = (result) => {
      confirmBtn.removeEventListener('click', onConfirm);
      cancelBtn.removeEventListener('click', onCancel);
      closeBtn.removeEventListener('click', onCancel);
      closeModal('confirmModal');
      resolve(result);
    };
    const onConfirm = () => settle(true);
    const onCancel = () => settle(false);
    confirmBtn.addEventListener('click', onConfirm);
    cancelBtn.addEventListener('click', onCancel);
    closeBtn.addEventListener('click', onCancel);
    openModal('confirmModal', { initialFocusId: 'confirmModalCancelBtn', onDismiss: onCancel });
  });
}
function showImportSourceChoice() {
  return new Promise(resolve => {
    const fileBtn = document.getElementById('importSourceFileBtn');
    const pasteBtn = document.getElementById('importSourcePasteBtn');
    const cancelBtn = document.getElementById('importSourceCancelBtn');
    const closeBtn = document.getElementById('importSourceCloseBtn');
    const settle = (result) => {
      fileBtn.removeEventListener('click', onFile);
      pasteBtn.removeEventListener('click', onPaste);
      cancelBtn.removeEventListener('click', onCancel);
      closeBtn.removeEventListener('click', onCancel);
      closeModal('importSourceModal');
      resolve(result);
    };
    const onFile = () => settle('file');
    const onPaste = () => settle('paste');
    const onCancel = () => settle(null);
    fileBtn.addEventListener('click', onFile);
    pasteBtn.addEventListener('click', onPaste);
    cancelBtn.addEventListener('click', onCancel);
    closeBtn.addEventListener('click', onCancel);
    openModal('importSourceModal', { initialFocusId: 'importSourceFileBtn', onDismiss: onCancel });
  });
}
function showImportPasteDialog() {
  return new Promise(resolve => {
    const textarea = document.getElementById('importPasteTextarea');
    const errorEl = document.getElementById('importPasteError');
    const nextBtn = document.getElementById('importPasteNextBtn');
    const cancelBtn = document.getElementById('importPasteCancelBtn');
    const closeBtn = document.getElementById('importPasteCloseBtn');
    textarea.value = '';
    errorEl.textContent = '';
    errorEl.classList.add('is-hidden');
    const settle = (result) => {
      nextBtn.removeEventListener('click', onNext);
      cancelBtn.removeEventListener('click', onCancel);
      closeBtn.removeEventListener('click', onCancel);
      closeModal('importPasteModal');
      resolve(result);
    };
    const onNext = () => {
      const text = textarea.value.trim();
      if (!text) {
        errorEl.textContent = '請先貼上匯出檔的內容。';
        errorEl.classList.remove('is-hidden');
        textarea.focus();
        return;
      }
      settle(text);
    };
    const onCancel = () => settle(null);
    nextBtn.addEventListener('click', onNext);
    cancelBtn.addEventListener('click', onCancel);
    closeBtn.addEventListener('click', onCancel);
    openModal('importPasteModal', { initialFocusId: 'importPasteTextarea', onDismiss: onCancel });
  });
}
function showImportModeChoice(count) {
  return new Promise(resolve => {
    const messageEl = document.getElementById('importModeModalMessage');
    const mergeBtn = document.getElementById('importModeMergeBtn');
    const overwriteBtn = document.getElementById('importModeOverwriteBtn');
    const cancelBtn = document.getElementById('importModeCancelBtn');
    const closeBtn = document.getElementById('importModeCloseBtn');
    messageEl.textContent = `檔案中找到 ${count} 筆貼文資料。請選擇匯入方式：`;
    const teardown = () => {
      mergeBtn.removeEventListener('click', onMerge);
      overwriteBtn.removeEventListener('click', onOverwrite);
      cancelBtn.removeEventListener('click', onCancel);
      closeBtn.removeEventListener('click', onCancel);
      closeModal('importModeModal');
    };
    const settle = (result) => {
      teardown();
      resolve(result);
    };
    const onMerge = () => settle('merge');
    const onOverwrite = async () => {
      teardown();
      const confirmed = await showConfirm(
        '確認完全覆寫',
        `這會刪除目前已儲存的 ${allArticles.length} 篇貼文，改以匯入的 ${count} 筆資料取代。此動作無法復原。`,
        { confirmText: '覆寫全部資料' }
      );
      resolve(confirmed ? 'overwrite' : null);
    };
    const onCancel = () => settle(null);
    mergeBtn.addEventListener('click', onMerge);
    overwriteBtn.addEventListener('click', onOverwrite);
    cancelBtn.addEventListener('click', onCancel);
    closeBtn.addEventListener('click', onCancel);
    openModal('importModeModal', { initialFocusId: 'importModeMergeBtn', onDismiss: onCancel });
  });
}