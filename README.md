<div align="center">

# Threadkeep

**自動擷取、清理、管理與匯出 Threads 貼文的內嵌碼與中繼資料**

舊名「Threads 程式碼儲存器」(Threads Code Saver)，2.7.0 起改名為 Threadkeep；repo 也從 threads-embedded-code 改名為 Threadkeep

**[前往介紹頁](https://scorpio-meow.github.io/Threadkeep/)**：功能導覽、互動清洗示範與安裝教學

[![Website](https://img.shields.io/badge/Website-GitHub_Pages-D12F35?style=for-the-badge&logo=githubpages&logoColor=white)](https://scorpio-meow.github.io/Threadkeep/)
[![Version](https://img.shields.io/badge/version-2.8.0-blue?style=for-the-badge)](./manifest.json)
[![Manifest](https://img.shields.io/badge/Manifest-V3-brightgreen?style=for-the-badge&logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![License](https://img.shields.io/badge/license-MIT-yellow?style=for-the-badge)](./LICENSE)
[![Dependencies](https://img.shields.io/badge/dependencies-0-success?style=for-the-badge)](#技術規格與技術棧)
[![Platform](https://img.shields.io/badge/platform-Chromium-orange?style=for-the-badge&logo=googlechrome&logoColor=white)](#前置條件與環境需求)
[![Build](https://img.shields.io/badge/build-zero--build--step-informational?style=for-the-badge)](#技術規格與技術棧)
[![Companion Site](https://img.shields.io/badge/Companion_Site-Threadfolio-8A2BE2?style=for-the-badge&logo=cloudflare&logoColor=white)](https://scorpio-meow.github.io/Threadfolio-Example/)

---

基於 Google Chrome Manifest V3 標準設計的輕量級瀏覽器擴充功能。  
純前端架構、零外部依賴。所有資料均安全儲存於瀏覽器本機的 chrome.storage.local，  
無需任何後端伺服器、外部資料庫或第三方 API 金鑰，完整保障您的隱私與資料安全。

</div>

---

## 目錄

- [專案簡介與核心價值](#專案簡介與核心價值)
- [生態系與關聯專案](#生態系與關聯專案)
- [快速開始](#快速開始)
  - [前置條件與環境需求](#前置條件與環境需求)
  - [安裝與載入擴充功能](#安裝與載入擴充功能)
  - [基本操作流程](#基本操作流程)
- [核心功能特性](#核心功能特性)
  - [1. 智慧攔截與安全儲存](#1-智慧攔截與安全儲存)
  - [2. 頂層排版保留與深層文本清洗](#2-頂層排版保留與深層文本清洗)
  - [3. 多維度結構化欄位提取](#3-多維度結構化欄位提取)
  - [4. 控制面板即時預覽 (Live Preview)](#4-控制面板即時預覽-live-preview)
  - [5. 背景循序同步與失效監控佇列](#5-背景循序同步與失效監控佇列)
  - [6. 雙檢視介面與全方位批次操作](#6-雙檢視介面與全方位批次操作)
  - [7. 多維度分類篩選與彈性排序體系](#7-多維度分類篩選與彈性排序體系)
  - [8. 互動式標籤與作者統計雲](#8-互動式標籤與作者統計雲)
  - [9. 智慧容錯匯入與多格式匯出](#9-智慧容錯匯入與多格式匯出)
  - [10. 無障礙設計與可復原操作](#10-無障礙設計與可復原操作)
  - [11. 音效、背景音樂與視覺質感](#11-音效背景音樂與視覺質感)
- [技術規格與技術棧](#技術規格與技術棧)
- [專案目錄與模組架構](#專案目錄與模組架構)
  - [專案檔案結構](#專案檔案結構)
  - [檔案職責對照表](#檔案職責對照表)
- [系統架構與流程圖](#系統架構與流程圖)
  - [整體系統架構圖](#整體系統架構圖)
  - [背景同步與失效恢復流程圖](#背景同步與失效恢復流程圖)
  - [即時預覽安全通訊協定圖](#即時預覽安全通訊協定圖)
- [核心演算法與技術實作細節](#核心演算法與技術實作細節)
  - [1. 頂層文字容器排版擷取演算法](#1-頂層文字容器排版擷取演算法)
  - [2. 嵌入碼對話框權重評分演算法](#2-嵌入碼對話框權重評分演算法)
  - [3. 標籤擷取與正規化](#3-標籤擷取與正規化)
  - [4. 44 條 UI 雜訊與時間過濾鏈](#4-44-條-ui-雜訊與時間過濾鏈)
  - [5. 非同步循序更新佇列與工作分頁架構](#5-非同步循序更新佇列與工作分頁架構)
  - [6. 即時預覽動態高度自適應通訊](#6-即時預覽動態高度自適應通訊)
- [資料模型與儲存 Schema](#資料模型與儲存-schema)
  - [SavedArticle 介面定義](#savedarticle-介面定義)
  - [儲存空間管理](#儲存空間管理)
- [配置與權限宣告](#配置與權限宣告)
  - [權限清單與使用目的](#權限清單與使用目的)
  - [內容安全政策 (CSP) 規範](#內容安全政策-csp-規範)
- [備份、匯出與匯入規範](#備份匯出與匯入規範)
  - [匯出格式對比與規範](#匯出格式對比與規範)
  - [匯出檔案範例](#匯出檔案範例)
  - [智慧匯入解析機制](#智慧匯入解析機制)
- [操作指南與快捷鍵速查](#操作指南與快捷鍵速查)
  - [控制面板即時預覽快捷鍵](#控制面板即時預覽快捷鍵)
  - [控制面板常用操作對照表](#控制面板常用操作對照表)
- [常見問題與疑難排解 (FAQ)](#常見問題與疑難排解-faq)
- [開發與貢獻指南](#開發與貢獻指南)
  - [開發與修改流程](#開發與修改流程)
  - [開發注意事項與架構規範](#開發注意事項與架構規範)
- [版本更新紀錄 (Changelog)](#版本更新紀錄-changelog)
- [AI 友善文件說明 (llms.txt)](#ai-友善文件說明-llmstxt)
- [授權條款與免責聲明](#授權條款與免責聲明)

---

## 專案簡介與核心價值

Threads 內建的「儲存」只能在 Threads 裡回頭翻看。想把喜歡的貼文嵌進自己的網站、整理成清單或留一份備份，就得一篇篇打開「取得內嵌程式碼」複製，再自己記下內文、作者與發文時間。

「**Threadkeep**」為解決此痛點而生，具備以下核心價值：

| 核心價值 | 說明 |
| :--- | :--- |
| **無感自動擷取** | 在貼文選單點「取得內嵌程式碼」，內嵌碼、內文、作者、發文時間與標籤就自動存下，不必另外複製。 |
| **原始排版保真** | 採用頂層文字容器分析演算法，完整保留段落與換行，不會把多行內文壓成一行。 |
| **多層雜訊過濾** | 內建 44 條過濾正規表達式，自動剝離作者簡介、相對發文時間、輪播計數及平台導覽文字。 |
| **本機隱私安全** | 資料 100% 留存於瀏覽器本機儲存區，不會上傳到任何伺服器；對外連線僅限 Threads 官方網域（即時預覽與背景更新）及介面字型所用的 Google Fonts，音效與背景音樂隨擴充功能打包，無追蹤、無遙測。 |
| **靈活跨端複用** | 提供三種匯出，都是內容為 `const posts = [...]` 的 `.js` 檔：「僅內嵌碼」只含內嵌碼（`threads-embed-codes-*.js`），可直接貼進網頁；「精選格式」附上連結、作者、內文與標籤（`threads-featured-data-*.js`），給 Threadfolio 當資料來源；「完整備份」保留發文時間、失效狀態等全部欄位（`threads-full-data-*.js`），用於備份與還原。 |

---

## 生態系與關聯專案

本專案作為「**資料擷取與本機管理中樞**」，與前端展示網站 **[Threadfolio](https://scorpio-meow.github.io/Threadfolio-Example/)** 構成完整的 Threads 內容收藏與公開展示生態系：

| 專案名稱 | 專案定位與職責 | 專案連結 |
| :--- | :--- | :--- |
| **Threadkeep** (本專案) | 瀏覽器擴充功能：負責 Threads 貼文智慧擷取、DOM 雜訊清洗、本機儲存、即時預覽與多格式匯出 | [GitHub 專案庫](https://github.com/Scorpio-meow/Threadkeep) |
| **Threadfolio** (關聯專案) | 前端展示網站：接收本擴充功能匯出的「精選貼文資料 (threads-featured-data-*.js)」，提供響應式卡片流與展示介面 | [Threadfolio 網站](https://scorpio-meow.github.io/Threadfolio-Example/) |

### 雙專案協同運作流程

```mermaid
flowchart LR
    A["在 Threads 瀏覽貼文"] -->|"取得內嵌程式碼"| B["Threadkeep 擴充功能"]
    B -->|"匯出「精選格式」"| C["threads-featured-data-*.js"]
    C -->|"作為資料來源"| D["Threadfolio 精選貼文網站"]
```

1. 在 Threads 看到想留下的貼文時，從貼文選單點「取得內嵌程式碼」，**Threadkeep** 就會把它存進瀏覽器。
2. 在控制面板側欄「資料」的「匯出」選單選「**精選格式**」，擴充功能會自動去除作者帳號 `@` 前綴並格式化為前端配置物件。
3. 將匯出的檔案直接提供給 **[Threadfolio](https://scorpio-meow.github.io/Threadfolio-Example/)** 作為資料來源，即刻完成個人精選貼文網站的更新與展示。

---

## 快速開始

### 前置條件與環境需求

- 支援 Manifest V3 的 Chromium 核心瀏覽器：
  - Google Chrome (版本 123 以上，`manifest.json` 的 `minimum_chrome_version`；介面配色使用 CSS `light-dark()`)
  - Microsoft Edge (版本 123 以上)
  - Brave Browser
  - Opera / Opera GX
  - Arc Browser
- 純前端原生專案，不需安裝任何額外編譯環境、執行環境或打包工具。

### 安裝與載入擴充功能

1. 取得專案原始碼：
   ```bash
   git clone https://github.com/Scorpio-meow/Threadkeep.git
   cd Threadkeep
   ```
2. 開啟瀏覽器並進入擴充功能管理頁面：
   - Google Chrome 請於網址列輸入：`chrome://extensions/`
   - Microsoft Edge 請於網址列輸入：`edge://extensions/`
3. 開啟頁面右上角的「**開發人員模式** (Developer mode)」。
4. 點擊左上角的「**載入未封裝項目** (Load unpacked)」。
5. 選取本專案的根目錄（即包含 [manifest.json](./manifest.json) 的資料夾）。
6. 在瀏覽器工具列的擴充功能圖示清單中，將「Threadkeep」釘選至工具列。

### 基本操作流程

1. 在 Threads 貼文右上角點「⋯」，選「取得內嵌程式碼」。
2. 擴充功能攔截內嵌對話框，擷取內嵌碼、內文、作者、發文時間與標籤並存進瀏覽器，頁面右上角出現「內嵌程式碼已儲存」通知。
3. 點瀏覽器工具列的 Threadkeep 圖示開啟 Popup，可以搜尋、篩選、排序、複製或刪除貼文，並從「更多」選單匯出或匯入。
4. 需要完整管理時，在 Popup 點「開啟控制面板」：以瀑布流卡片瀏覽、用側欄分類與標籤雲篩選、在預覽抽屜檢視官方內嵌卡片，或勾選多篇做批次處理。

---

## 核心功能特性

### 1. 智慧攔截與安全儲存
- **點擊委派與對話框偵測**：在 `document` 以捕獲階段掛一個點擊監聽，只有點到「取得內嵌程式碼」時才擷取貼文內容；`MutationObserver` 只負責在 DOM 變動後（每個畫面影格最多一次）檢查是否出現內嵌對話框，不掃描整頁按鈕。只有在點擊之後，才會每 250ms（`EMBED_DIALOG_POLL_MS`）檢查一次內嵌碼是否出現，最多等 8 秒（`EMBED_DIALOG_TIMEOUT_MS`）。
- **主動式偵測機制**：透過 `processOpenEmbedDialogs` 函式，即使對話框由非擴充功能按鈕開啟，也能自動解析對話框中的唯讀輸入框並儲存。
- **上下文保護封裝**：內建 `safeStorageGet` 與 `safeStorageSet`，自動檢查擴充功能執行環境生命週期 (`isExtensionAlive`)，避免擴充功能更新或重載時拋出未捕獲的 `Extension context invalidated` 例外。

### 2. 頂層排版保留與深層文本清洗
- **原生排版與換行保留**：使用頂層文字容器 `innerText` 擷取策略，完整保留貼文的自然段落換行（`\n`）與 `<br>` 標籤，解決傳統遍歷子節點時將多行內文壓縮為單行空格的問題，並確保同行的 `@提及` 與 `#標籤` 保持排版連貫。
- **UI 與時間雜訊深度過濾**：自動識別並清除作者簡介、追蹤者人數、串文數量、相對時間（如「2天」、「1小時」、「剛剛」）、貼文標頭的「已釘選」「作者」標籤以及各類平台引導文字。目前共 44 條規則，涵蓋繁體中文與英文介面。
- **嚴格排除標頭連結**：精確過濾 `time` 標籤、`a[href*="/post/"]`、`a[href*="/t/"]` 貼文永久連結、`a[href*="/@"]` 作者主頁連結與 `a[href*="/search"]` 主題／熱門話題連結（如「超夯：…」），防止中繼標籤誤混入文章主體。
- **行內貼圖不影響內文**：內文中夾帶的 GIF 貼圖或表情圖片（`aria-hidden="true"` 的 `img`）不會被視為媒體，整段文字照常擷取；只有含影片、`picture`、`canvas` 或一般圖片的容器才會排除。
- **回覆邊界隔離**：在動態牆或個人首頁擷取時，偵測到「回覆...」邊界元素時自動切斷，確保僅擷取發文者所發布的主內容。
- **純圖片說明過濾**：透過 `isLikelyImageOnlyDescription` 智慧判別僅含圖片說明的貼文（如 `Photo by ... on ...`），避免無效擷取。

### 3. 多維度結構化欄位提取
系統會將每篇貼文完整解析為標準化的結構化資料物件：

| 欄位名稱 | 類型 | 說明 |
| :--- | :--- | :--- |
| **貼文內文** | `string` | 經過去除 UI 雜訊與中繼標籤後的純文字（保留完整段落換行） |
| **發文作者** | `string` | 發文者帳號，取自貼文標頭的作者連結文字（通常不含 `@`）；取不到時改用網址中的帳號，仍取不到則為「未知作者」 |
| **發文時間** | `string` | 包含標準 ISO 8601 時間字串與格式化標題文字 |
| **標籤清單** | `string[]` | 結合官方 Hashtag 連結與內文 `#hashtag` 的標籤陣列 |
| **內嵌代碼** | `string` | Threads 官方原生的標準 `<blockquote>` 嵌入代碼 |
| **貼文狀態** | `'active' \| 'expired'` | 標記貼文為正常存取中或已失效 |

### 4. 控制面板即時預覽 (Live Preview)
- **點了才滑出的預覽抽屜**：平常不佔版面；點卡片上的作者名稱或卡片空白處（拖曳選取文字時不觸發），抽屜從右側滑出、背景變暗。抽屜是對話框（`role="dialog"`、`aria-modal="true"`），開啟時焦點移到關閉鈕並鎖在抽屜內；標題列顯示作者與「第 N / M 篇」。
- **雙分頁即時渲染**：
  - **內嵌預覽 (Official Embed)**：遵循 Chrome Manifest V3 與 Threads 官方嵌入規範，透過安全 Frame 直接載入官方即時卡片，呈現完整的互動按鈕與動態樣式。
  - **原始碼與中繼資料 (Embed Code & Metadata)**：檢視完整內文、乾淨的 `<blockquote>` 代碼與貼文中繼屬性對照表格。
- **寬度與高度自適應**：抽屜最寬 560px（窄螢幕時等於視窗寬），內嵌卡片隨抽屜寬度縮放；高度由注入至 iframe 的 Content Script 量測 `.Embed` 容器後回報，長短貼文皆精準貼合，不留多餘空白或捲軸。
- **實際載入狀態回饋**：區分「載入中」、「載入逾時（10 秒）」與「載入失敗」三種狀態，逾時或失敗時顯示錯誤說明與「重新載入」按鈕；若該貼文沒有可用連結，則直接提示改看「原始碼與中繼資料」分頁。Threads 不提供內嵌的貼文（`/embed` 回 HTTP 500）會顯示中文說明，不會出現 Meta 的英文錯誤頁。
- **帶著登入狀態預覽**：預覽從 `www.threads.com` 載入，會沿用瀏覽器的 Threads 登入狀態；只開放登入者觀看的貼文（例如被列為敏感內容），登入 Threads 後也能預覽。這類貼文的內嵌碼放到網站上時，只有已登入 Threads、且瀏覽器允許第三方 Cookie 的訪客看得到。
- **全方位快捷鍵與導覽**：支援鍵盤 `ESC`、點背景或關閉鈕關閉，左/右方向鍵切換上一篇/下一篇貼文（背後對應的卡片會捲到可見範圍並加上外框），一鍵複製內嵌碼及直接開啟原文；關閉後焦點回到正在預覽的那張卡片。載入中顯示吉祥物動畫。

### 5. 背景循序同步與失效監控佇列
- **循序非同步更新**：點擊「更新貼文資料」時，系統會依照當前篩選與排序後的結果建立佇列（若已勾選貼文，則僅更新目前篩選結果中被勾選的項目；勾選後又被篩掉的貼文不會更新），並重複使用**同一個背景工作分頁**循序載入，有效避免多開分頁導致的系統卡頓或平台流量限制。
- **寬鬆的安全上限**：每篇的分頁載入與頁面解析合計最多等 60 秒，超過只記為「失敗」、不標記失效，網路較慢的正常貼文不會被誤判；注入腳本以 `MutationObserver` 在頁面渲染時立即檢查（兩次檢查至少間隔 80ms），不受背景分頁的計時器節流影響。
- **分批寫回**：每處理 20 篇、按下暫停或佇列結束時才寫回一次，而且只寫這幾篇各自的紀錄：先讀取它們目前的內容，只覆蓋發文時間、內文、標籤與失效狀態等欄位，期間被刪除的貼文不會被寫回來，在 Threads 新存的貼文也不受影響。進行中只重繪該篇卡片與分類篇數，佇列結束後才更新清單篩選與標籤雲、作者雲。
- **進度與中斷控制**：側欄「資料」下方即時顯示「更新中 (X/Y)」與進度條，右上角頂欄也會顯示「更新中 X/Y」；提供「**暫停 / 繼續**」與「**停止**」按鈕，暫停時進度條轉為琥珀色。
- **智慧失效標記與自動恢復**：
  - 若貼文被刪除、轉為私密或發生轉導（`redirected`），系統將自動標記為 `expired` 並記錄原因。
  - 若頁面文字或標題出現不存在或已移除的訊息（例如「此頁面無法使用」「此串文已被移除」「Page Not Found」），將記錄為 `post-not-found`；只是找不到貼文元素時會等到 60 秒上限後記為失敗，不標記失效。
  - 若下次更新時貼文恢復可存取狀態，系統會自動清除失效標籤並恢復為 `active`。
- **內嵌可用性檢查**：每篇在背景分頁裡以同源、不帶 Cookie 的請求打一次 `/embed`，結果寫入 `embeddable` 與 `embeddableCheckedAt`。回 HTTP 500（例如只開放登入者觀看的貼文）記為 `false`，回 200 且含 `.Embed` 記為 `true`；逾時、限流或其他回應不寫入，保留上次的結論。必須在 threads.com 的分頁裡檢查，因為擴充功能頁面跨站請求 `/embed` 只會拿到 Threads 的一般頁面殼。在 Threads 儲存新貼文時，`content.js` 也會在背景檢查一次。

### 6. 雙檢視介面與全方位批次操作
- **Popup 快速面板**（480×600px）：頁首右側是「開啟控制面板」與「更多」，「更多」選單收納三種匯出（各附一行說明）、匯入與清除全部；下方是搜尋、篩選與排序，以及單欄貼文卡片（內文最多 3 行，按鈕依序為在 Threads 查看原文、複製內嵌碼、刪除）。
- **控制面板**：全螢幕桌面工作區。左側欄由上而下是歡迎卡片、2×2 分類格、標籤雲、作者雲與資料按鈕格；中間是瀑布流卡片，依視窗寬度自動分欄（每欄至少 280px，窄螢幕一欄），卡片高度隨內文長短排列、不留空隙；預覽是點了才出現的右側抽屜。
- **瀑布流排版**：瀏覽器還沒有原生的 CSS 瀑布流，所以清單是 4px 列高的 CSS Grid，由 `ResizeObserver` 依每張卡片的實際高度設定 `grid-row-end: span N`；展開全文或視窗變寬時卡片會自動重排。DOM 與鍵盤順序仍照排序由左到右，不會像 `columns` 那樣先跑完一欄。
- **分批渲染長清單**：清單一次只建立 60 張卡片（Popup 為 30 張），捲到接近底部或按「顯示更多」才載入下一批；卡片上的按鈕事件統一由清單容器委派。
- **跨介面同步**：Popup 與控制面板監聽 `chrome.storage.onChanged`，在 Threads 新存或在另一個介面刪除的貼文會即時反映到清單。事件只帶來有變動的那幾篇；內容和畫面上相同的變動（例如自己寫入引起的事件）會略過，不重複重繪。
- **搜尋範圍**：比對內文、作者、標籤與貼文連結的路徑（`postLink` 去掉網域後的 `/@作者/post/貼文代碼`），可用帳號或貼文代碼找貼文。每篇的搜尋字串在第一次搜尋時建立並快取，排序也先算好每篇的比較值再排序。
- **批次勾選管理**：Popup 與控制面板的「全選」都會勾選目前篩選結果的全部貼文，包含尚未載入的卡片，並支援半選（Indeterminate）狀態顯示；沒有結果時全選停用。控制面板勾選任何貼文後，列表頭會換成批次列：「更新資料」「複製內嵌碼」「刪除」與「取消選取」，沒有勾選時批次列不顯示；Popup 則顯示「已選取 N 篇」與「取消選取」。
- **頁內確認 Modal**：破壞性操作（清除全部、覆寫匯入，以及控制面板的單篇與批次刪除）全面改用頁內 Modal 二次確認；Popup 沒有批次刪除，單篇刪除不另外確認，改以「復原」提示補救。兩個介面都完全不使用原生 `confirm()`、`alert()` 與 `prompt()`；這對 Popup 尤其關鍵——原生對話框會在 Popup 失焦時連同 Popup 一併關閉並回傳預設值。

### 7. 多維度分類篩選與彈性排序體系
系統在 Popup 與控制面板均提供 6 種篩選維度與 6 種排序規則：

- **6 種分類篩選模式**：
  - `全部貼文 (all)`: 顯示資料庫中所有貼文。
  - `依作者 (author)`: 控制面板在側欄作者雲點選；Popup 以二級下拉選單列出所有作者。
  - `依標籤 (tag)`: 控制面板在側欄標籤雲或卡片上的標籤點選；Popup 以二級下拉選單列出所有標籤。
  - `無內文 (noContent)`: 快速找出 `content` 為空的貼文（例如純圖片或未成功擷取內文者），便於集中維護。
  - `無發文時間 (noTimestamp)`: 篩選出未成功擷取官方發布時間或時間戳記與儲存時間異常之項目。
  - `失效貼文 (expired)`: 篩選出被原作者刪除、私密化或轉導的失效貼文。
- **控制面板的分類格**：全部、失效、無內文、無發文時間做成側欄頂端的 2×2 分類格，直接顯示各自的篇數，有失效貼文時篇數變紅；選中的分類會成為列表標題（例如「失效貼文」「#台南」），旁邊顯示篇數。再點一次已選的標籤或作者即回到全部貼文。
- **6 種排序規則**（控制面板／Popup 的顯示名稱）：
  - `savedAt-desc`「儲存時間（新到舊）」／「最新儲存」、`savedAt-asc`「儲存時間（舊到新）」／「最早儲存」
  - `timestamp-desc`「發文時間（新到舊）」／「最新發文」、`timestamp-asc`「發文時間（舊到新）」／「最早發文」
  - `author-asc`「作者（A-Z）」／「作者 A–Z」、`author-desc`「作者（Z-A）」／「作者 Z–A」
- **卡片時間跟著排序**：控制面板卡片右上角依目前排序顯示「儲存」或「發文」時間（依作者排序時顯示發文時間），滑鼠停留可看完整日期時間。

### 8. 互動式標籤與作者統計雲
- **即時頻次計算**：側欄的標籤雲與作者雲依篇數排序，預設顯示前 15 個，超過時最後有「全部 N 個標籤／位作者」可展開、「收合」收回；目前選中的項目即使不在前 15 名也會顯示。篇數越多字越粗（相對最多的一項達 60% 以上為粗體、30% 以上為中粗）。標籤不分大小寫合併計數（`React`、`react` 算同一個），以最常見的寫法顯示，Popup 的篩選選單與側欄的標籤總數也依同樣規則合併。
- **點擊即時篩選**：點擊標籤雲或作者雲中的任一項，即可切換控制面板清單的篩選條件，選中的項目以墨黑底標示；再次點擊即可取消篩選。卡片上的標籤是香檳色小膠囊，點擊效果相同。

### 9. 智慧容錯匯入與多格式匯出
- **三種專業匯出格式**：僅內嵌碼（貼進網頁用的 `.js` 檔）、精選格式（Threadfolio 精選貼文用）、完整備份（含時間、作者與內文）。三者皆會在有勾選項目時**僅匯出勾選的貼文**，未勾選時則匯出目前的篩選結果。控制面板在側欄「資料」的「匯出」選單，選單標題會寫出這次的範圍（「匯出已選取的 3 篇」或「匯出目前列表的 11 篇」）；Popup 在頁首「更多」選單。
- **雙來源匯入**：Popup 在「更多」選單點「匯入…」後可選擇「選擇檔案」讀取 `.js` / `.json` 備份，或以「貼上內容」直接貼上匯出檔文字；控制面板則在側欄「資料」點「匯入」以檔案選擇器匯入。
- **雙模式智慧匯入**：
  - **合併資料 (Merge)**：以貼文代碼（儲存 key）比對，略過已存在的貼文，匯入檔內的重複項目也只保留一筆；新貼文依儲存時間（`savedAt`）排入清單。
  - **完全覆寫 (Overwrite)**：清空現有資料庫，以匯入檔案內容完全取代；此模式必須再通過一次「確認完全覆寫」對話框才會執行。
- **兩階段解析**：先以 `JSON.parse` 解析 `const posts = [...]`，失敗時改用正規表達式抽出每段內嵌碼，相容三種匯出格式與標準 JSON 備份。

### 10. 無障礙設計與可復原操作
- **完整 Modal 無障礙語意**：所有對話框均具備 `role="dialog"`、`aria-modal="true"` 與標題關聯，確認與匯入方式對話框另有描述關聯；開啟時自動聚焦、`Tab` 焦點鎖定於對話框內、`ESC` 可關閉，關閉後焦點自動回到觸發按鈕。
- **可復原的刪除與清除**：單篇刪除、批次刪除與清除全部資料後，會顯示帶有「復原」按鈕的提示（預設 8 秒）；滑鼠移到提示上或鍵盤焦點停在「復原」按鈕時暫停倒數。同一時間僅保留一則復原提示，避免舊快照回捲較新的變更。
- **即時語音回饋**：Popup、控制面板的 Toast 容器與注入 Threads 頁面的通知皆為 live region。Popup 與控制面板的 Toast 一律為 `role="status"`（錯誤只改變外觀），Threads 頁面上的錯誤通知才改用 `role="alert"`。一般訊息至少顯示 4 秒、錯誤至少 6 秒，較長的訊息依字數延長（每字約 0.12 秒），滑鼠移到提示上時暫停倒數。
- **清楚的焦點外框**：按鈕、連結與輸入框的鍵盤焦點一律以 2px 實線外框標示，顏色是香檳金（淺色 `#83632a`、深色 `#d9bc7a`），與底色的對比至少 5:1；高對比模式下改回系統顏色外框。
- **深色與高對比模式**：控制面板右上角「設定」選單的「外觀」可選跟隨系統、淺色或深色，設定存在 `chrome.storage.local`，Popup 與 Threads 頁面上的通知一併套用；顏色集中定義在 `ui.css` 的 `:root`，以 `light-dark()` 同時給出淺色與深色值，淺色與深色的文字對比都至少 4.5:1；Windows 高對比模式（`forced-colors`）下，焦點外框、勾選框、選取狀態與進度條改用系統顏色標示。
- **可操作的分類、標籤與作者**：側欄分類格、標籤雲與作者雲的每一項都是 `button` 並標註 `aria-pressed`，可用鍵盤聚焦並切換篩選狀態；卡片上的標籤也是可切換的按鈕。
- **螢幕閱讀器結構**：貼文卡片是清單項目、作者名稱是標題，標題裡的按鈕會開啟預覽；卡片的勾選框與操作按鈕名稱帶上作者與發文時間（例如「刪除：user174 於 18 小時前發布的貼文」），相對時間另附完整日期時間。搜尋、篩選與勾選後會朗讀結果數量（「找到 5 篇貼文」「已選取 3 篇」）。
- **焦點不遺失**：點分類或標籤篩選、刪除、復原或背景更新重畫卡片後，焦點留在原控制項，或移到同一位置的下一篇、還原的那篇，不會跳回頁首；關閉預覽抽屜後焦點回到該卡片的作者名稱。
- **視覺與動態友善**：字級只用 12、14、16、20px，下限 12px；偏小的按鈕點擊目標放大至 24×24px 以上（勾選框例外，見 [ACCESSIBILITY.md](./ACCESSIBILITY.md) 的已知限制）。所有樣式表都支援 `prefers-reduced-motion: reduce`：系統要求減少動態時停用轉場、卡片淡入、背景流動與游標光斑。
- **聲音只是輔助**：每個音效對應的結果都有畫面上的提示或狀態變化，也會由 live region 朗讀，關掉音效不會漏掉資訊；音效與背景音樂都能在「設定」關閉，背景音樂預設關閉、不會自動響起。
- **輸入防抖**：兩個介面的搜尋框皆加入 180ms debounce，資料量大時輸入不再卡頓。

> [!NOTE]
> 無障礙目標、已知限制（例如即時預覽的卡片由 Meta 決定）與障礙回報方式，請見 [ACCESSIBILITY.md](./ACCESSIBILITY.md)。

### 11. 音效、背景音樂與視覺質感
- **六種短音效**：豎琴與鋼琴，全部是 D 大調，連續操作時彼此和諧。

  | 時機 | 檔案 | 聲音 | 長度 |
  | :--- | :--- | :--- | :--- |
  | 在 Threads 儲存或更新貼文 | `sounds/save.ogg` | 豎琴 D–F♯–A–D 上行琶音 | 0.74 秒 |
  | 複製內嵌碼（單篇、批次、預覽抽屜） | `sounds/copy.ogg` | 鋼琴 A 八度輕點 | 0.32 秒 |
  | 刪除、批次刪除、清除全部（確認後） | `sounds/delete.ogg` | 豎琴 A→D 下行 | 0.42 秒 |
  | 按「復原」還原成功 | `sounds/undo.ogg` | 豎琴 D→A 上行 | 0.36 秒 |
  | 匯入、匯出成功，批次更新貼文資料完成 | `sounds/complete.ogg` | 豎琴 Dadd9 琶音接鋼琴和弦，尾端極輕的指鈸 | 1.12 秒 |
  | 顯示錯誤提示、Threads 頁面儲存失敗 | `sounds/error.ogg` | 鋼琴低音 E→D♯ 小二度 | 0.42 秒 |

  使用者取消操作、批次更新被停止或寫回失敗時不播完成音效。音效預設開啟，可在控制面板右上角「設定」關閉，Popup 與 Threads 頁面共用同一個設定（`soundEffects`）；開啟時會先播一次儲存音效試聽。
- **背景音樂**：`sounds/background-music.ogg`，2 分鐘可無縫循環的新古典鋼琴與弦樂（D 大調、64 BPM、32 小節：鋼琴主題、弦樂加入、主題高八度變奏加豎琴、收束後接回開頭）。只在控制面板播放，預設關閉（`backgroundMusic`）；開啟時 1.8 秒淡入，切到別的分頁會停止、回來再從頭淡入；瀏覽器尚未允許自動播放時，會在第一次點擊或按鍵後開始。
- **播放方式**：`sound.js` 以 Web Audio API 解碼並播放，每個檔案只下載與解碼一次；循環用 `AudioBufferSourceNode.loop`，接縫無間隙。Threads 頁面的 content script 只會取用 `save.ogg` 與 `error.ogg`，`manifest.json` 只對 Threads 網域開放這兩個檔案（`web_accessible_resources`）。
- **音源來源與授權**：由小寶樂隊（XSXB-Band）本機編曲工作室以 CC0 授權的實錄採樣（立式鋼琴、豎琴、小提琴組、大提琴組、指鈸）編曲並渲染，再轉成 48kHz Ogg Opus（音效單聲道約 56 kbps、配樂立體聲約 96 kbps）；沒有使用音樂生成模型。
- **視覺系統**：象牙白、墨黑、香檳金。主要按鈕、勾選框、開關與選中的分類用墨黑，選中的卡片、焦點外框、分頁底線、進度條與重點數字用香檳金，紅色只留給刪除、清除全部與失效標記；線條是 0.5px 髮絲線，圓角只用在按鈕、欄位（6px）與卡片、浮層（10px）。內文字型是 Geist 與 Noto Sans TC，程式碼是 Geist Mono，品牌名、標題與分類數字是 Playfair Display 與 Noto Serif TC（數字設為等高）。
- **動態質感**：背景有緩慢流動的香檳金柔光（約 28 秒一個來回）；游標移動時有一圈柔光跟著走，滑過貼文卡片時卡片內也會亮起局部高光，卡片微微浮起；切換分類或搜尋時卡片依序淡入。光層在文字與卡片底下，不影響文字對比也不擋點擊，觸控操作不會觸發；系統要求減少動態時全部關閉。
- **歡迎卡片**：控制面板側欄頂端依時段顯示「早安、午安、晚安、夜深了」，以及收藏總數與最近 7 天新增的篇數。

---

## 技術規格與技術棧

| 項目 | 內容 |
| :--- | :--- |
| 規範標準 | Chrome Extensions Manifest V3 |
| 核心語言 | 原生 JavaScript (ES6+)、HTML5、CSS 自訂屬性 |
| 依賴套件 | 無 npm 套件；介面字型由 Google Fonts 載入 |
| 介面樣式 | CSS `light-dark()` 色彩變數、Popover API、以 CSS Grid 實作的瀑布流 |
| 音訊播放 | Web Audio API（`AudioContext`），音檔為 Ogg Opus |
| 資料儲存 | 瀏覽器本機的 `chrome.storage.local`，以 `unlimitedStorage` 解除 10MB 配額 |
| 安全規範 | 嚴格 CSP（Content Security Policy），沒有行內事件處理器 |
| 相容平台 | Chrome、Edge 123 以上，以及 Brave、Opera、Arc 等 Chromium 瀏覽器 |
| 建置流程 | 零編譯步驟，直接載入資料夾即可使用 |

---

## 專案目錄與模組架構

### 專案檔案結構

```
Threadkeep/
├── manifest.json         # 擴充功能設定檔 (Manifest V3 權限與腳本規則)
├── article-store.js      # 共用儲存層 (每篇一個 key、舊資料搬移、跨介面同步、標籤合併)
├── theme.js              # 外觀設定 (跟隨系統／淺色／深色，Popup 與控制面板共用)
├── ui.css                # 共用設計系統 (色彩與字型變數、按鈕、欄位、勾選框、開關、選單、對話框、提示、標籤、背景光)
├── ui.js                 # 共用介面行為 (Popover 選單定位、游標光斑追蹤)
├── sound.js              # 音效與背景音樂播放 (Web Audio、偏好設定、分頁切換時停播)
├── sounds/               # 音效與背景音樂 (Ogg Opus：save、copy、delete、undo、complete、error、background-music)
├── content.js            # Content Script (DOM 監聽、對話框攔截、文本清洗、資料提取)
├── styles.css            # 注入至 Threads 網頁的通知提示樣式
├── popup.html            # 瀏覽器工具列彈出視窗 HTML
├── popup.css             # 彈出視窗版面 (頁首、工具列、單欄卡片)
├── popup.js              # 彈出視窗控制邏輯 (搜尋、排序、篩選、更多選單、頁內 Modal、匯出、匯入)
├── dashboard.html        # 控制面板 HTML (側欄、瀑布流清單、預覽抽屜、設定與匯出選單)
├── dashboard.css         # 控制面板版面 (側欄分類格與標籤雲、瀑布流卡片、預覽抽屜、響應式)
├── dashboard.js          # 控制面板控制邏輯 (篩選導覽、瀑布流排版、預覽抽屜、循序佇列、批次處理、復原機制)
├── icons/                # 擴充功能圖示 (16、32、48、128 px)
├── images/               # 吉祥物圖 (mascot-320.webp，空狀態、歡迎卡片與預覽載入中)
├── docs/                 # GitHub Pages 介紹頁 (index.html、互動清洗示範、介面截圖與 assets/video/ 操作示範影片)
├── llms.txt              # AI 友善架構與 RAG 快速索引規範文件
├── README.md             # 專案說明文件 (本檔案)
├── CHANGELOG.md          # 版本更新紀錄 (Keep a Changelog 格式)
├── CONTRIBUTING.md       # 貢獻指南
├── CODE_OF_CONDUCT.md    # 貢獻者行為準則
├── SECURITY.md           # 安全政策與漏洞回報方式
├── ACCESSIBILITY.md      # 無障礙聲明
├── LICENSE               # MIT 授權條款
└── .github/              # Issue 範本 (ISSUE_TEMPLATE/) 與 Pull Request 範本
```

### 檔案職責對照表

| 檔案路徑 | 模組層級 | 主要職責與實作內容 |
| :--- | :--- | :--- |
| `manifest.json` | 設定層 | 聲明 Manifest V3 規格、最低 Chrome 版本（123）、儲存與分頁權限、主機比對規則、CSP 配置，以及只對 Threads 網域開放的兩個音效檔。 |
| `article-store.js` | 儲存層 | 由 content script、Popup 與控制面板共用：決定每篇貼文的儲存 key、搬移舊版 `savedArticles` 陣列、逐篇讀寫與刪除、合併批次更新欄位、把 `chrome.storage.onChanged` 的逐篇變動套用到清單，以及不分大小寫合併標籤統計（`getTagGroups`）。另外存放外觀與聲音設定的儲存 key（`THEME_PREFERENCE_KEY`、`SOUND_EFFECTS_KEY`、`BACKGROUND_MUSIC_KEY`），以及內嵌可用性檢查的共用函式（`getThreadsEmbedPath`、`checkEmbeddable`、`applyEmbeddableResult`、`pickEmbeddableFields`）。 |
| `theme.js` | 外觀層 | 由 Popup 與控制面板在 `<head>` 載入：先以 `localStorage` 的快取立即套用 `data-theme`，避免載入時閃爍，再讀取 `chrome.storage.local` 的 `themePreference` 並同步各頁面；控制面板「設定」選單裡的「外觀」也由它處理。 |
| `ui.css` | 設計系統層 | Popup 與控制面板共用：以 `light-dark()` 定義的色彩、字型、字級、圓角與動態變數，按鈕、欄位、勾選框、開關、Popover 選單、對話框、提示、標籤與空狀態等元件，背景流動光與游標光斑，以及減少動態與高對比模式的降級。 |
| `ui.js` | 共用介面行為 | `setupMenus` 依觸發按鈕位置擺放 Popover 選單（下方放不下就翻到上方）、點選項目後關閉、視窗縮放時收合；`setupAmbientLight` 以 `requestAnimationFrame` 節流追蹤游標，更新背景光斑與滑過卡片的局部高光位置。 |
| `sound.js` | 聲音層 | 由 Popup、控制面板與 content script 共用：讀取 `soundEffects`／`backgroundMusic` 設定並跟著 `chrome.storage.onChanged` 同步，以 Web Audio API 解碼與播放 `sounds/` 裡的音檔（`playSound`），控制面板的背景音樂開關、淡入淡出與分頁切換時停播（`setupBackgroundMusic`、`setupSoundSwitches`）。 |
| `sounds/` | 音訊資源層 | 六個短音效與一段 2 分鐘背景音樂（Ogg Opus），由小寶樂隊本機工作室以 CC0 採樣編曲渲染。 |
| `content.js` | 注入腳本層 | 負責監聽 Threads DOM 變化、攔截內嵌對話框、頂層排版提取與正規表達式文本清洗，並在 Threads 頁面顯示儲存結果通知與播放儲存／錯誤音效、儲存後於背景檢查內嵌可用性；在預覽用的 `/embed` iframe 裡則改為回報卡片高度與載入錯誤給控制面板。 |
| `styles.css` | 注入樣式層 | 定義顯示於 Threads 頁面之儲存成功/失敗浮動通知外觀（墨黑底加香檳金細框）、進場動畫、`prefers-reduced-motion` 降級，以及深色與高對比模式樣式。 |
| `popup.html` / `popup.js` | 快速檢視層 | 提供 480×600px 的工具列快速面板，支援即時關鍵字查詢、6 種分類、6 種排序、單篇維護、「更多」選單匯出匯入、頁內確認／匯入 Modal 與音效。 |
| `dashboard.html` / `dashboard.js` | 完整管理層 | 全螢幕控制面板，提供側欄分類格與標籤／作者雲、瀑布流卡片、預覽抽屜、批次管理、背景更新佇列、可復原的刪除操作、設定選單與背景音樂。 |
| `llms.txt` | 規範說明層 | 提供 AI 代理與 RAG 檢索系統快速索引之結構化摘要說明文件。 |
| `README.md` | 完整文檔層 | 專案主要說明文件，包含完整系統架構、演算法剖析、資料 Schema 與常見問題。 |
| `CHANGELOG.md` | 完整文檔層 | 各版本的新增、改善、修正與移除項目，格式遵循 Keep a Changelog。 |
| `docs/` | 介紹頁層 | GitHub Pages 介紹頁，不隨擴充功能載入。互動清洗示範由 `assets/js/cleaner-worker.js` 在 Web Worker 中從 `main` 分支載入 `content.js`，直接呼叫 `cleanExtractedPostContent` 與 `isLikelyThreadsFallbackDescription`；更名或移除這兩個函式會讓示範失效。頁面上的版本資訊同樣從 `main` 分支的 `manifest.json` 讀取。 |

---

## 系統架構與流程圖

### 整體系統架構圖

```mermaid
flowchart TD
    subgraph ClientThreadsPage["Threads 網頁前端 (Content Script Scope)"]
        A["Threads 貼文 DOM 結構"] -->|"使用者點擊「取得內嵌程式碼」"| B["官方嵌入對話框 (Role Dialog)"]
        C["MutationObserver 監聽器"] -->|"自動捕獲對話框開啟"| B
        B -->|"提取 input/textarea 內容"| D["嵌入碼權重計分演算法 (Embed Scorer)"]
        A -->|"定位頂層文字容器"| E["頂層文字容器排版擷取器"]
        E -->|"過濾 UI/時間雜訊 (44 條 Regex)"| F["純淨內文與中繼資料"]
        D & F -->|"組合資料物件"| G["saveArticleFromEmbedDialog"]
    end

    subgraph LocalDatabase["本機安全儲存 (Storage Scope)"]
        G -->|"safeStorageSet (防例外寫入)"| H[("chrome.storage.local\n[post:貼文代碼] 每篇一筆")]
    end

    subgraph PopupView["Popup 彈出面板 (480×600px)"]
        H -->|"loadArticleRecords (讀取)"| I["popup.js 渲染引擎"]
        I --> J["全文搜尋 / 6種排序 / 6種篩選"]
        I --> K["單篇卡片維護 / 「更多」選單匯出匯入"]
    end

    subgraph DashboardView["控制面板"]
        H -->|"loadArticleRecords (讀取)"| L["dashboard.js 核心引擎"]
        L --> M["側欄：分類格 / 標籤雲 / 作者雲 / 資料按鈕"]
        L --> N["瀑布流卡片清單與批次列"]
        L --> O["預覽抽屜 (Live Preview Drawer)"]
        O --> P["官方 Frame 預覽 / 原始碼中繼資料雙分頁"]
    end

    subgraph BackgroundQueue["背景循序更新佇列"]
        L -->|"觸發「更新貼文資料」"| Q["Sequential Update Queue"]
        Q -->|"重用單一靜默分頁"| R["chrome.tabs.update (active: false)"]
        R -->|"注入提取腳本"| S["chrome.scripting.executeScript"]
        S -->|"檢查轉導 / 404 / DOM 資訊"| T{"存活狀態判定"}
        T -->|"正常 (Active)"| U["更新發文時間與內容"]
        T -->|"異常 (Expired)"| V["標記失效狀態與原因"]
        U & V -->|"回寫儲存"| H
        T -->|"佇列結束或發生錯誤"| W["chrome.tabs.remove (關閉工作分頁)"]
    end
```

### 背景同步與失效恢復流程圖

```mermaid
sequenceDiagram
    autonumber
    participant UI as 控制面板 (dashboard.js)
    participant Queue as 更新佇列控制器
    participant Tab as 背景靜默分頁 (chrome.tabs)
    participant Page as Threads 貼文伺服器
    participant Storage as chrome.storage.local

    UI->>Queue: 啟動更新佇列 (依勾選項目或當前篩選清單)
    loop 依序處理每一篇貼文
        Queue->>Tab: 重用單一隱藏分頁載入 postLink
        Tab->>Page: 發送 HTTP 請求
        Page-->>Tab: 回傳 HTML 與動態內容
        Queue->>Tab: 等待分頁載入與解析 (載入加解析合計最多 60 秒)
        alt 貼文網址變更 (Redirected)
            Queue->>Queue: 標記 status='expired', reason='redirected'
        else 頁面不存在或已被移除
            Queue->>Queue: 標記 status='expired', reason='post-not-found'
        else 成功讀取發布時間與最新內容
            Queue->>Queue: 更新 timestampTitle, 清除失效狀態 status='active'
        end
        opt 累積 20 篇或按下暫停
            Queue->>Storage: 只寫回這批貼文各自的紀錄 (合併更新欄位)
        end
        Queue->>UI: 更新進度條與該篇卡片 (X/Y)
    end
    Queue->>Tab: 佇列結束後關閉工作分頁 (chrome.tabs.remove)
    Queue->>Storage: 寫回剩餘的更新
    Queue->>UI: 更新完畢通知
```

### 即時預覽安全通訊協定圖

```mermaid
sequenceDiagram
    autonumber
    participant User as 使用者操作
    participant Modal as 預覽抽屜控制器 (dashboard.js)
    participant Iframe as 安全預覽框架 (iframe, 最寬 560px)
    participant Content as iframe 內的 content.js (all_frames)
    participant ThreadsEmbed as Threads 原生內嵌伺服器

    User->>Modal: 點作者名稱或卡片空白處，或在抽屜裡按方向鍵
    Modal->>Modal: 解析貼文 postLink 產生標準 Embed URL
    Modal->>Iframe: 設定 iframe.src = https://www.threads.com/.../embed
    Modal->>Modal: 顯示吉祥物載入動畫並啟動 10 秒逾時計時器
    Iframe->>ThreadsEmbed: 載入原生卡片資源
    ThreadsEmbed-->>Iframe: 渲染互動卡片
    Content->>Content: ResizeObserver / MutationObserver 量測 .Embed 容器高度
    Content->>Modal: window.postMessage ({ type: 'THREADS_EMBED_RESIZE', height })
    Modal->>Modal: 驗證 origin (threads.net / threads.com / instagram.com)
    Modal->>Iframe: 動態調整 iframe.style.height = targetHeight (100~5000px)
    alt 載入完成
        Modal->>Modal: 清除計時器，隱藏載入動畫，呈現完美貼合之原生預覽
    else Threads 不提供內嵌（HTTP 500）
        Content->>Modal: window.postMessage ({ type: 'THREADS_EMBED_ERROR' })
        Modal->>User: 顯示中文說明，隱藏 Meta 錯誤頁
    else 逾時或載入失敗
        Modal->>User: 顯示錯誤說明與「重新載入」按鈕
    end
```

---

## 核心演算法與技術實作細節

### 1. 頂層文字容器排版擷取演算法

為避免抓取到的內文換行被過度壓平，`content.js` 採用頂層文字容器鎖定策略：

1. **定位候選容器**：選取 `span[class*="xo1l8bm"][dir="auto"]`、`span[class*="xi7mnp6"][dir="auto"]` 與 `div[class*="x1iorvi4"][dir="auto"]` 等主內容區塊。
2. **嚴格過濾時間與標頭節點**：
   - 排除 `time` 標籤本身及其父容器（`closest('time') || querySelector('time')`）。
   - 排除貼文固定網址標籤（`a[href*="/post/"]`、`a[href*="/t/"]`）。
   - 排除純作者標頭連結（`a[href*="/@"]`）。
   - 排除主題標籤與熱門話題連結（`a[href*="/search"]`）。
   - 排除含媒體的容器，但內文裡 `aria-hidden="true"` 的行內貼圖與表情圖片不算媒體。
   - 排除 Meta AI 引導文案與輪播指示器。
   - 單篇貼文頁的 `threads_post_page_0` 只在有文字時才當作搜尋範圍；Threads 目前把它渲染成空的佔位元素，目標貼文改由永久連結定位。
3. **頂層去重 (Top-level Deduplication)**：僅保留未被其他候選容器包含的最頂層容器，防止子節點文字重複提取。
4. **原生排版輸出**：沒有可用的 `threads_post_page_0` 範圍時（目前一律如此），以第一個「回覆…」容器為界，只保留它之前的候選容器。每個頂層容器先複製一份，移除翻譯、「查看原文」與雜訊按鈕後再讀 `innerText`，保留 `<br>` 與天然段落換行。各段經 `cleanExtractedPostContent` 清洗，丟掉整段都是雜訊的內容與重複段落，以 `\n\n` 拼接後再整體清洗一次。

```javascript
const beforeReply = replyBoundary
  ? candidateContainers.filter(el =>
    el.compareDocumentPosition(replyBoundary) & Node.DOCUMENT_POSITION_FOLLOWING
  )
  : candidateContainers;
const topContainers = beforeReply.filter(el =>
  !beforeReply.some(other => other !== el && other.contains(el))
);
const candidates = topContainers
  .map(el => {
    const clone = el.cloneNode(true);
    const childButtons = clone.querySelectorAll('button, [role="button"]');
    for (const btn of childButtons) {
      const btnText = (btn.innerText || btn.textContent || '').trim();
      if (
        isLikelyThreadsFallbackDescription(btnText) ||
        /^(?:查看|隱藏)?翻譯$/i.test(btnText) ||
        /^(?:See|Hide)?\s*translation$/i.test(btnText) ||
        /^查看原文$/i.test(btnText)
      ) {
        btn.remove();
      }
    }
    return (clone.innerText || clone.textContent || '').trim();
  })
  .map(text => cleanExtractedPostContent(text))
  .filter(text => text && !isLikelyThreadsFallbackDescription(text))
  .filter((text, index, array) => array.indexOf(text) === index);
return cleanExtractedPostContent(candidates.join('\n\n'));
```

### 2. 嵌入碼對話框權重評分演算法

當 Threads 彈出嵌入對話框時，頁面可能存在多個唯讀欄位（如純連結或短網址）。`extractEmbedCodeFromDialog` 對所有輸入框進行權重評分：

```javascript
let score = value.length;
if (/data-text-post-permalink=/i.test(value)) score += 1000;
if (/<blockquote/i.test(value)) score += 500;
if (/threads\.com/i.test(value)) score += 100;
```
最後挑選分數最高的內容作為最佳的 `embedCode`，確保 100% 取得包含完整 `blockquote` 的標準內嵌碼。

### 3. 標籤擷取與正規化

`extractTags` 由兩個來源合併標籤，最後統一正規化並去重：

1. **官方 Hashtag 連結**：掃描貼文容器中的 `a[href*="serp_type=tags"]` 與 `a[href*="tag_id="]`，優先取網址中的 `q` 查詢參數，取不到時才退回連結文字，並去除開頭的 `#`。
2. **內文 Hashtag**：以 `#` 或全形 `＃` 開頭、由任何語言的文字、數字或底線組成，而且至少含一個文字的詞，例如 `#台南美食`、`#ラーメン`、`#라면`、`#café`、`#2024台南燈會`。規則為 `/(?<![\p{Script=Latin}\p{Script=Greek}\p{Script=Cyrillic}\p{N}\p{M}_&\/])[#＃](?![\uFE0F\u20E3])([\p{L}\p{M}\p{N}_]*\p{L}[\p{L}\p{M}\p{N}_]*)/gu`，掃描前會先移除 `http://`、`https://` 與 `www.` 開頭的網址。`#` 前面緊接拉丁、希臘或西里爾字母、數字、底線、`&` 或 `/` 時不算，因此 `example.com/docs#install`、`C#12`、`&#39;` 都不會變成標籤；純數字的 `#1`、`#2024` 與鍵帽表情符號 `#️⃣` 也不算。`#` 前面是中日韓字元時（例如「去吃#台南美食」）照樣算。
內文沒有 `#` 的詞不會變成標籤。2.7.0 起移除了原本的技術關鍵字映射，它會依內文補上 JavaScript、Python 等 12 個標籤，詳見 [CHANGELOG.md](./CHANGELOG.md)。

最後以 `String.prototype.normalize('NFC')` 統一 Unicode 表示法，再不分大小寫去重並保留第一次出現的寫法，避免同一個中文標籤因組合字元差異而重複計數，也避免官方連結的 `JavaScript` 和內文的 `#javascript` 同時出現。

> [!NOTE]
> 背景更新佇列注入的 `extractPostInfoFromPage` 不另外保留擷取邏輯，而是直接呼叫 Threads 頁面上 `content.js` 的 `findPostElementFromPostLink`、`extractPostContent` 與 `extractTags`，因此「更新貼文資料」抓到的內文與標籤和存檔時一致。

### 4. 44 條 UI 雜訊與時間過濾鏈

擷取到的原始文字會先經過 `cleanExtractedPostContent` 逐行處理（正規化空白、剝除輪播計數與翻譯按鈕、壓縮多餘空行），再由 `isLikelyThreadsFallbackDescription` 以 44 條正規表達式逐行比對，命中即整行剔除：

```javascript
function isLikelyThreadsFallbackDescription(text) {
  const normalizedText = String(text).replace(/\s+/g, ' ').trim();
  return [
    /\d[\d,.]*\s*(?:萬|千)?次?瀏覽/i,
    /^回覆[\s\S]*[…\.]{1,3}$/i,
    /^尚無回覆$/i,
    /^查看動態$/i,
    /^更多$/i,
    /^返回$/i,
    /^直欄標題$/i,
    /^附加影音內容$/i,
    /^新增 GIF$/i,
    /^展開撰寫工具$/i,
    /^分享$/i,
    /^轉發$/i,
    /^讚$/i,
    /^為你推薦$/,
    /^新串文$/,
    /^搜尋$/,
    /^動態$/,
    /^個人檔案$/,
    /^聯邦宇宙$/,
    /^洞察報告$/,
    /^已儲存$/,
    /^追蹤中$/,
    /^追蹤$/,
    /^已追蹤$/,
    /^(?:已釘選|Pinned)$/i,
    /^(?:作者|Author)$/i,
    /^[·•]$/,
    /^(?:查看|隱藏)?翻譯$/i,
    /^(?:See|Hide)?\s*translation$/i,
    /^查看原文$/i,
    /^附帶原始貼文的回覆內容$/,
    /\d[\d,.]*\s*位粉絲\s*•\s*\d[\d,.]*\s*則串文/i,
    /\d[\d,.]*\s*followers\s*•\s*\d[\d,.]*\s*threads/i,
    /查看\s*@.+\s*參與的最新對話/i,
    /See\s*what\s*@.+\s*is\s*saying\s*on\s*Threads/i,
    /在貼文中提及\s*@meta\.ai\s*，即可在這裡獲得解答/i,
    /^\d+\s*(?:秒|分|分鐘|小時|天|週|年|s|m|h|d|w|y)(?:前)?$/i,
    /^\d{1,2}\s*月\s*\d{1,2}\s*日$/i,
    /^\d{4}\s*年\s*\d{1,2}\s*月\s*\d{1,2}\s*日$/i,
    /^[A-Z][a-z]{2}\s+\d{1,2}(?:,\s*\d{4})?$/i,
    /^(?:剛剛|昨天|前天|yesterday|just now)$/i,
    /^\d+\s*[\/／]\s*\d+(?:\s*[•·]\s*[\u4e00-\u9fa5\w]+)?$/i,
    /^\d+\s*(?:of|之)\s*\d+$/i,
    /^(?:圖片|相片|photo|image)\s*\d+\s*[\/／,，共of\s]+\d+(?:\s*張)?$/i
  ].some(pattern => pattern.test(normalizedText));
}
```

### 5. 非同步循序更新佇列與工作分頁架構

在 `dashboard.js` 中，貼文更新採用**單一可重用工作分頁**的循序控制迴圈，並於每一輪開頭檢查「取消」與「暫停」訊號：

```javascript
for (const article of articlesNeedingUpdate) {
  if (cancelUpdateRequested) break;
  if (isUpdatePaused) await flushPendingUpdates();                 // 暫停前先寫回已完成的部分
  while (isUpdatePaused && !cancelUpdateRequested) {
    await new Promise(resolve => setTimeout(resolve, 150)); // 暫停中等待恢復
  }
  if (cancelUpdateRequested) break;

  const tabId = await getOrCreateWorkerTab();                      // 重用同一個背景分頁
  const postInfo = await fetchPostInfoWithReusableTab(tabId, article.postLink); // 最多等 60 秒
  if (postInfo && postInfo.status === 'expired') {
    markArticleAsExpired(article, postInfo.reason);                // redirected / post-not-found / fallback-summary
  } else if (postInfo) {
    clearArticleExpiredStatus(article);                            // 貼文復活則清除失效標記
    // 寫回 timestamp、timestampTitle、content 與 tags
  }
  pendingArticles.add(article);
  if (pendingArticles.size >= UPDATE_PERSIST_BATCH_SIZE) await flushPendingUpdates(); // 每 20 篇合併寫回
  refreshRenderedCard(article);                                    // 只重繪這一張卡片
}
// finally：關閉工作分頁、寫回剩餘的更新，再整體重繪清單與標籤雲、作者雲
```

- **分批合併寫回**：`flushPendingUpdates` 呼叫 `mergeArticleUpdates`，只讀取這批貼文各自的 key，把 `ARTICLE_UPDATE_FIELDS`（`timestamp`、`timestampTitle`、`content`、`tags`、失效狀態、`timestampUpdatedAt`、`embeddable`、`embeddableCheckedAt`）以記憶體中的值套到目前儲存的紀錄上再寫回，記憶體中沒有的欄位會從紀錄刪除；已不存在的 key 代表貼文在佇列期間被刪除，會直接略過。中途關閉頁面最多遺失最後未寫回的 19 篇更新結果，重新執行即可補上。
- **分頁生命週期**：工作分頁僅在擷取失敗或整個佇列結束（`finally`）時關閉，其餘時間重複使用，避免反覆開關分頁的成本。
- **安全上限**：`fetchPostInfoWithReusableTab` 以 60 秒（`POST_FETCH_TIMEOUT_MS`）為上限，涵蓋分頁載入與頁面解析；逾時回傳 `null`，記為失敗並關閉工作分頁，不會標記為失效。注入頁面的解析器以 `MutationObserver` 觸發檢查，兩次檢查至少間隔 80ms（`POST_INFO_CHECK_INTERVAL_MS`）。

### 6. 即時預覽動態高度自適應通訊

Threads 官方 `/embed` 頁面只會對父視窗送出一個不帶型別的數字字串，無法和其他訊息區分，因此本擴充功能透過 `manifest.json` 的 `all_frames: true` 將 `content.js` 一併注入預覽 iframe。當腳本偵測到自己位於 `/embed` 或非頂層框架時，改走 `handleEmbedFrameResize()` 分支：以 `ResizeObserver` 觀測 `.Embed` 容器與 `body` 的第一個子元素，容器被替換時由只看節點增減的 `MutationObserver` 重新掛上觀測。量測合併到每個畫面影格最多一次，高度有變化才將量得的高度回傳父視窗：

```javascript
window.parent.postMessage({ type: 'THREADS_EMBED_RESIZE', height: h }, parentOrigin);
```

Threads 不提供內嵌的貼文（已刪除、不公開，或只開放登入的使用者觀看，例如被列為敏感內容），`/embed` 會回 HTTP 500 與 Meta 的錯誤頁；這類貼文的內嵌碼放到網站上，未登入 Threads 或封鎖第三方 Cookie 的訪客同樣顯示不出來。預覽從 `www.threads.com` 載入，會帶著瀏覽器的 Threads 登入狀態，所以只開放登入者觀看的貼文在已登入時可以正常預覽。iframe 一樣會觸發 `load`，所以 `content.js` 在 `/embed` 頁找不到 `.Embed` 容器時改送 `{ type: 'THREADS_EMBED_ERROR' }`。控制面板確認訊息來自目前的預覽 iframe 後，顯示自己的錯誤提示並隱藏錯誤頁，之後的 `load` 事件也不會再把狀態改回「已載入」。

`content.js` 會注入所有 threads.com 框架，包括其他網站嵌入的 Threads iframe，但只有在直接父視窗是本擴充功能的頁面時才送訊息：以 `location.ancestorOrigins[0]` 的 host 比對 `chrome.runtime.id`，相符才送出，而且 `postMessage` 只指定該來源，不用 `'*'`。其他網站嵌入的 Threads iframe 不會收到 `THREADS_EMBED_RESIZE` 或 `THREADS_EMBED_ERROR`，也就看不出瀏覽器裝了本擴充功能。

控制面板端先驗證來源網域；`THREADS_EMBED_ERROR` 只在 `event.source` 是目前的預覽 iframe 時才處理。高度依序取 `THREADS_EMBED_RESIZE` 的 `height`、官方 `MEASURE` 等格式的 `details.height`（字串會先解析成 JSON），再退回 `height` 或 `scrollHeight`，只套用 100–5000px 之間的值：

```javascript
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

window.addEventListener('message', (event) => {
  if (!isAllowedEmbedOrigin(event.origin)) return;
  let data = event.data;
  if (typeof data === 'string') {
    try { data = JSON.parse(data); } catch (_) { }
  }
  const iframe = document.getElementById('previewIframe');
  if (data && data.type === 'THREADS_EMBED_ERROR') {
    if (iframe && event.source === iframe.contentWindow) {
      clearTimeout(previewLoadTimer);
      setPreviewState('error', '…');
    }
    return;
  }
  if (!data || typeof data !== 'object') return;

  let details = data.details;
  if (typeof details === 'string') {
    try { details = JSON.parse(details); } catch (_) { }
  }
  let targetHeight = 0;
  if (data.type === 'THREADS_EMBED_RESIZE' && data.height) {
    targetHeight = Number(data.height);
  } else if (details && details.height) {
    targetHeight = Number(details.height);
  } else if (data.height) {
    targetHeight = Number(data.height);
  } else if (data.scrollHeight) {
    targetHeight = Number(data.scrollHeight);
  }
  if (targetHeight > 100 && targetHeight < 5000 && iframe) {
    iframe.style.height = `${targetHeight}px`;
  }
});
```

---

## 資料模型與儲存 Schema

每篇貼文是一個 `SavedArticle` 物件，各自存在 `chrome.storage.local` 的一個 key 底下。key 為 `post:` 加上貼文網址中的貼文代碼（例如 `post:DezKX7tE_q9`）；沒有可辨識連結的匯入資料改用 `post:id:<id>`。同一篇貼文（包括 threads.com 與 threads.net 的網址）會對應到同一個 key，再存一次會覆蓋整筆紀錄，但保留先前的 `embeddable`／`embeddableCheckedAt`，並在背景重新檢查一次。各介面讀取後依 `savedAt` 由新到舊排列。

> [!NOTE]
> 2.2.1 以前的版本把所有貼文存成 `savedArticles` 鍵裡的一個陣列。新版第一次開啟 Popup、控制面板或在 Threads 存檔時，會把舊陣列拆成逐篇紀錄：只寫入尚未存在的 key（不覆蓋較新的紀錄），同一篇的重複紀錄保留陣列中較前面（較新）的那筆，讀回確認全部寫入後才刪除 `savedArticles`。搬移後改裝舊版會讀不到資料，若需要降版，請先匯出完整備份再匯入。

### SavedArticle 介面定義

```typescript
interface SavedArticle {
  /** 唯一主鍵識別碼 (新儲存為 embed_[時間戳]_[隨機字串]；匯入資料為 imported_[時間戳]_[隨機字串]，來源檔已有 id 則沿用) */
  id: string;

  /** 貼文原始 URL，作為去重與更新的主鍵 */
  postLink: string;

  /** Threads 官方原生 <blockquote> HTML 內嵌碼 */
  embedCode: string;

  /** 發布時間 (ISO 8601 標準格式) */
  timestamp: string;

  /** 格式化發布時間標題 (例如: "2026年5月29日 上午10:00") */
  timestampTitle: string;

  /** 儲存至本機資料庫的時間 (ISO 8601) */
  savedAt: string;

  /** 貼文純文字內容 (已保留段落換行並清除 UI 雜訊) */
  content: string;

  /** 發文者帳號，取自作者連結文字 (通常不含 @，如 "username")；取不到時用網址中的帳號，否則為「未知作者」 */
  author: string;

  /** 分類標籤清單 (官方 Hashtag 連結與內文 #hashtag) */
  tags: string[];

  /** 貼文存活狀態 */
  status: 'active' | 'expired';

  /** 標記為失效的時間 (ISO 8601) */
  expiredAt?: string;

  /** 失效具體原因 */
  expiredReason?: 'redirected' | 'post-not-found' | 'fallback-summary' | 'unknown';

  /** 最後一次檢查存活狀態的時間 (ISO 8601) */
  expiredCheckedAt?: string;

  /** 發布時間戳記最後更新時間 (ISO 8601) */
  timestampUpdatedAt?: string;

  /** 不帶 Cookie 時 Threads 是否提供內嵌卡片：/embed 回 HTTP 500 為 false，回 200 且含 .Embed 為 true；從未得出結論時不存在，之後的檢查沒有結論時保留上次的值 */
  embeddable?: boolean;

  /** 最後一次得出 embeddable 結論的時間 (ISO 8601) */
  embeddableCheckedAt?: string;

  /** 匯入來源標記，只有 Popup 匯入 .js 檔時寫入；控制面板匯入與 .json 匯入不寫入 */
  importedFrom?: 'full-data-file' | 'js-embed-file';
}
```

> [!NOTE]
> 自 v2.1.0 起，`codeBlocks` 與 `codeCount` 欄位已移除。相關抽取邏輯在舊版儲存流程被嵌入對話框攔截取代後即未再接線，新資料一律為空陣列；匯入舊備份時也不會再保留這兩個欄位，程式碼內容亦不再納入搜尋範圍。自 v2.2.1 起，搜尋比對 `content`、`author`、`tags` 與 `postLink` 的路徑部分（不含網域）；先前比對的 `embedCode` 大多是固定的官方樣板（SVG 與行內樣式），搜尋「threads」之類的字會命中所有貼文。

### 儲存空間管理

- **儲存配額**：Chromium `chrome.storage.local` 預設配額為 **10MB**，每篇貼文含官方內嵌碼約 3–4 KB，約兩、三千篇就會用完。本擴充功能宣告 `unlimitedStorage` 權限解除這個上限，實際容量取決於磁碟空間。
- **逐篇寫入**：在 Threads 存一篇只寫入那一篇（約 3–4 KB），刪除只移除對應的 key，不必讀寫全部資料；開啟 Popup 或控制面板時仍會一次讀取全部貼文。
- **寫入失敗提示**：若儲存時仍發生錯誤，系統會自動彈出提示。建議定期將資料匯出為「完整版資料備份檔案」並清理不必要的舊資料。
- **偏好設定**：與貼文分開存在 `chrome.storage.local` 的三個 key：`themePreference`（`light`／`dark`，跟隨系統時不存在）、`soundEffects`（`false` 表示關閉音效，不存在時視為開啟）與 `backgroundMusic`（`true` 表示開啟背景音樂，不存在時視為關閉）。這三個 key 不屬於貼文，不會被匯出、匯入或「清除全部」影響。

---

## 配置與權限宣告

### 權限清單與使用目的

本擴充功能嚴格遵循最小權限原則（Principle of Least Privilege），僅宣告達成功能所需之必要權限：

| 權限項目 | 權限類型 | 宣告用途與安全說明 |
| :--- | :--- | :--- |
| `storage` | API 權限 | 讀取與寫入本機 `chrome.storage.local` 資料庫。 |
| `unlimitedStorage` | API 權限 | 解除 `chrome.storage.local` 的 10MB 配額，收藏數千篇貼文時不會寫入失敗；Chrome 安裝時不會因此顯示額外的權限警告。 |
| `tabs` | API 權限 | 在背景建立靜默分頁以執行「更新貼文資料」與失效檢查。 |
| `scripting` | API 權限 | 向背景載入的 Threads 分頁動態注入資訊擷取腳本。 |
| `https://www.threads.com/*` | 主機權限 | 允許在標準 Threads 網域注入 Content Script 並讀取貼文內容。 |
| `https://threads.com/*` | 主機權限 | 允許在非 www 前綴的 Threads 網域執行相同操作。 |
| `https://www.threads.net/*` | 主機權限 | 支援透過官方 threads.net 網域載入即時預覽 Frame 與發文時間同步。 |
| `https://threads.net/*` | 主機權限 | 支援非 www threads.net 網域主機權限。 |
| `web_accessible_resources` | 資源開放 | 只把 `sounds/save.ogg` 與 `sounds/error.ogg` 開放給上述四個 Threads 網域，讓 Threads 頁面上的 content script 能播放儲存與錯誤音效；其他網站讀不到這兩個檔案。 |
| `minimum_chrome_version: 123` | 相容性 | 介面配色使用 CSS `light-dark()`，需要 Chrome 123 以上；較舊的瀏覽器不會安裝這個版本。 |

### 內容安全政策 (CSP) 規範

```json
"content_security_policy": {
  "extension_pages": "script-src 'self'; object-src 'self'; frame-src https://www.threads.com https://www.threads.net https://*.threads.com https://*.threads.net;"
}
```
- **禁止外部腳本**：所有頁面僅載入本機自帶之腳本（`script-src 'self'`），不載入任何外部 CDN 腳本或遠端代碼；唯一的外部資源是 `ui.css` 以 `@import` 引入的 Google Fonts 字型樣式表（Playfair Display、Noto Serif TC、Geist、Geist Mono、Noto Sans TC）；音效與背景音樂隨擴充功能打包，不從網路載入。
- **安全 Frame 來源**：僅限定允許嵌入來自 Threads 官方網域（`threads.com` 與 `threads.net`）之 iframe 預覽元件。

---

## 備份、匯出與匯入規範

### 匯出格式對比與規範

三種匯出皆以「目前的選取狀態」決定範圍：**有勾選貼文時僅匯出勾選項目**，未勾選時則匯出當前篩選與排序後的清單。

| 格式名稱 | 匯出檔案名稱規範 | 格式結構 | 適用情境與特點 |
| :--- | :--- | :--- | :--- |
| **簡易版嵌入碼 (Embed Only)** | `threads-embed-codes-YYYY-MM-DD.js` | `const posts = ['<blockquote>...</blockquote>', ...];` | 專為靜態網頁快速引用設計，已自動移除重複的 script 標籤並轉義引號。 |
| **精選貼文資料 (Featured Data)** | `threads-featured-data-YYYY-MM-DD.js` | `const posts = [{ embedCode, postLink, author, content, tags, embeddable?, embeddableCheckedAt? }, ...];` | 專為關聯專案 [Threadfolio](https://scorpio-meow.github.io/Threadfolio-Example/) 設計，author 欄位自動去除 `@` 前綴以利作為 Key 或展示標籤使用。檢查過內嵌可用性的貼文才帶 `embeddable` 與 `embeddableCheckedAt`；網站只在 `embeddable === false` 且 iframe 載入失敗時改顯示「只限登入者觀看」的說明。 |
| **完整版備份資料 (Full Data)** | `threads-full-data-YYYY-MM-DD.js` | `const posts = [{ embedCode, postLink, author, content, timestamp, timestampTitle, savedAt, tags, status, ... }, ...];` | 包含內文、時間、標籤、失效狀態與內嵌可用性（檢查過才有）等欄位，適用於跨裝置備份、資料遷移與災難還原。不含 `id`，匯入時會重新產生。 |

### 匯出檔案範例

#### 1. 簡易版嵌入碼 (threads-embed-codes-YYYY-MM-DD.js)
```javascript
const posts = [
    '<blockquote class="text-post-media" data-text-post-permalink="https://www.threads.com/@user/post/abc123xyz">...</blockquote>',
    '<blockquote class="text-post-media" data-text-post-permalink="https://www.threads.com/@developer/post/def456uvw">...</blockquote>'
];
```

#### 2. 精選貼文資料 (threads-featured-data-YYYY-MM-DD.js)
```javascript
const posts = [
    {
        "embedCode": "<blockquote class=\"text-post-media\" data-text-post-permalink=\"https://www.threads.com/@user/post/abc123xyz\">...</blockquote>",
        "postLink": "https://www.threads.com/@user/post/abc123xyz",
        "author": "user",
        "content": "分享一段實用的 JavaScript 技巧：...",
        "tags": ["JavaScript", "Frontend"]
    }
];
```

#### 3. 完整版備份資料 (threads-full-data-YYYY-MM-DD.js)
```javascript
const posts = [
    {
        "embedCode": "<blockquote class=\"text-post-media\" ...>...</blockquote>",
        "postLink": "https://www.threads.com/@user/post/abc123xyz",
        "author": "user",
        "content": "完整貼文內容...",
        "timestamp": "2026-05-29T02:00:00.000Z",
        "timestampTitle": "2026年5月29日 上午10:00",
        "savedAt": "2026-05-29T02:10:00.000Z",
        "tags": ["JavaScript", "WebDev"],
        "status": "active",
        "expiredAt": "",
        "expiredReason": "",
        "expiredCheckedAt": ""
    }
];
```

### 智慧匯入解析機制

匯入模組採兩階段解析管線：

```mermaid
flowchart TD
    A["選擇檔案（.js / .json）"] --> C
    B["在 Popup 貼上匯出檔內容"] --> C
    C["階段一：JSON.parse 解析 const posts = [...] 陣列"] -->|"成功"| E
    C -->|"失敗，例如單引號字串或未加引號的鍵"| D["階段二：正規表達式抽出內嵌碼"]
    D --> E["選擇匯入方式：合併資料或完全覆寫"]
    E -->|"合併資料"| F["加入尚未存在的貼文"]
    E -->|"完全覆寫"| G["二次確認：確認完全覆寫或取消"]
```

> [!NOTE]
> `.json` 檔會直接以 `JSON.parse` 解析（支援純陣列或 `{ "savedArticles": [...] }` 包裝）；`.js` 檔與 Popup 貼上的文字則走上述兩階段管線。三種匯出格式中，「精選格式」與「完整備份」是標準 JSON，會在階段一解析；「僅內嵌碼」是單引號字串陣列，由階段二抽出每段帶有 `data-text-post-permalink` 的內嵌碼。擴充功能頁面的 CSP 禁止 `eval` 與 `new Function`，因此不以動態求值解析 JavaScript 物件寫法。

> [!IMPORTANT]
> - **合併資料 (Merge)**：以貼文代碼（儲存 key）判斷重複，threads.com 與 threads.net 的同一篇視為同一筆。已存在的貼文會略過，現有資料完全保留。
> - **完全覆寫 (Overwrite)**：清空現有的本機資料，完全以匯入檔案中的內容取代。此模式必須再通過一次「確認完全覆寫」對話框；直接關閉或按 `ESC` 一律視為取消，不會誤觸覆寫。

---

## 操作指南與快捷鍵速查

### 控制面板即時預覽快捷鍵

| 按鍵 | 操作動作 |
| :--- | :--- |
| `ESC` | 關閉預覽抽屜，焦點回到該卡片的作者名稱 |
| `←` (左方向鍵) | 切換至上一篇貼文預覽 (Navigate Previous) |
| `→` (右方向鍵) | 切換至下一篇貼文預覽 (Navigate Next) |
| `Tab` | 在抽屜內循環移動焦點，不會跑到背後的頁面 |
| `點擊背景` | 關閉預覽抽屜 |

### 控制面板常用操作對照表

| 操作目標 | 操作方式 |
| :--- | :--- |
| **開啟即時預覽** | 點卡片上的作者名稱或卡片空白處，預覽抽屜從右側滑出。 |
| **切換預覽分頁** | 在抽屜上方點「內嵌預覽」或「原始碼與中繼資料」；內嵌卡片隨抽屜寬度縮放（最寬 560px），高度自動貼合貼文內容。 |
| **批次操作** | 勾選卡片左上角的核取方塊，或點列表頭的「全選」勾選目前篩選結果的全部貼文（包含尚未載入的卡片）；勾選後列表頭換成批次列，可使用「更新資料」「複製內嵌碼」「刪除」與「取消選取」。 |
| **分類與篩選** | 點側欄頂端的分類格（全部、失效、無內文、無發文時間），或標籤雲、作者雲、卡片上的標籤；再點一次已選的標籤或作者即取消。標籤或作者超過 15 個時，點「全部 N 個…」展開。 |
| **排序** | 在列表頭右側的排序選單切換 6 種排序規則；卡片上的時間會跟著顯示「儲存」或「發文」時間。 |
| **背景同步更新** | 側欄「資料」的「更新資料」與批次列的「更新資料」行為相同：有勾選時只更新目前篩選結果中被勾選的貼文，沒有勾選時更新整個篩選結果。執行中側欄會出現進度條，可隨時「暫停／繼續」或「停止」。 |
| **自選範圍匯出** | 先勾選欲匯出的貼文，再從側欄「資料」的「匯出」選單選格式，即只匯出勾選項目；未勾選時匯出目前篩選結果。選單標題會寫出這次的範圍。 |
| **外觀與聲音** | 點右上角的「設定」：外觀可選跟隨系統、淺色或深色；音效與背景音樂各有一個開關。 |
| **復原誤刪** | 單篇刪除、批次刪除與清除全部後，畫面下方中央的提示會出現「復原」按鈕，預設 8 秒內點擊即可還原；滑鼠移到提示上或焦點停在按鈕上時暫停倒數。 |
| **匯入資料** | Popup 在「更多」選單點「匯入…」後可選擇讀取檔案或直接貼上內容；控制面板在側欄「資料」點「匯入」選擇備份檔，接著選擇合併或覆寫。 |

---

## 常見問題與疑難排解 (FAQ)

> [!WARNING]
> **問題：點擊取得內嵌程式碼後，網頁上沒有出現「儲存成功」提示？**
> - 請確認瀏覽器是否已登入 Threads 帳號。未登入狀態下，Threads 官方對話框可能無法正確產生內嵌代碼。
> - 確認當前頁面網址是否為標準的 `threads.com` 或 `www.threads.com` 網域。
> - 若瀏覽器開發者主控台出現 `Extension context invalidated` 警告，此為 Chrome 重新載入擴充功能後的常見安全機制，只需重新整理對應的 Threads 網頁即可恢復運作。
> - 若 Threads 顯示「發生錯誤。這可能是技術錯誤所導致，我們正努力修復。」，代表 Threads 這次沒有產生內嵌程式碼，擴充功能會提示「Threads 回報錯誤，請稍後再試」。這是 Threads 端的暫時錯誤，稍等一下再點一次「取得內嵌程式碼」即可。

> [!NOTE]
> **問題：為什麼有些貼文在背景更新後被標記為「失效貼文」？**
> - 這代表貼文可能已被原作者刪除、帳號被設為私密，或原作者封鎖了匿名存取。
> - 背景分頁若確認頁面不存在（例如 404 或已刪除），也會判定為失效。
> - 若貼文隨後恢復正常，在下一次更新時，系統偵測到內容便會自動將其回復為 `active` 狀態。
> - 只開放登入者觀看的貼文（例如被列為敏感內容），在已登入 Threads 的瀏覽器裡更新時會正常載入，不會被標成失效；未登入時會被導回 Threads 首頁，記為 `redirected`。

> [!NOTE]
> **問題：即時預覽顯示「Threads 不提供這篇貼文的內嵌卡片」？**
> - Threads 對這篇的 `/embed` 回了 HTTP 500。可能是貼文已刪除、不公開，或只開放登入的使用者觀看。
> - 若是只開放登入者觀看，在這個瀏覽器登入 threads.com 後按「重新載入」即可預覽。這類貼文的內嵌碼放到網站上時，只有已登入 Threads、且瀏覽器允許第三方 Cookie 的訪客看得到，其他訪客只能點連結到 Threads 觀看。
> - 開發者工具裡的 `Error with Permissions-Policy header: Unrecognized feature: 'attribution-reporting'`（以及 `shared-storage`、`shared-storage-select-url`）是 Meta 回應標頭宣告了瀏覽器不認得的功能，正常的貼文也會出現，與載入失敗無關。

> [!CAUTION]
> **問題：Threads 官方改版後，擴充功能無法正常擷取？**
> - 本工具高度依賴 Threads 前端網頁的 DOM 選擇器特徵（例如特定編碼的 class 類別）。
> - 若 Threads 官方進行了重大的結構或樣式修改，將會導致擷取演算法失效。此時請將問題提交至 GitHub Issue，我們將會盡快更新 `content.js` 中對應的 CSS 選擇器。

> [!IMPORTANT]
> **問題：本機儲存空間是否有限制？**
> - `chrome.storage.local` 在多數 Chromium 瀏覽器中預設有 **10MB** 的配額限制；本擴充功能宣告 `unlimitedStorage` 權限解除這個上限，實際容量取決於磁碟空間。
> - 若寫入仍然失敗，擴充功能會提示您。建議定期將完整版資料匯出備份，並清除不需要的舊貼文。

> [!TIP]
> **問題：不小心刪錯貼文或按到「清除全部資料」怎麼辦？**
> - 刪除、批次刪除與清除全部皆為可復原操作，畫面下方中央的提示列會顯示「復原」按鈕，預設 8 秒內點擊即可完整還原；滑鼠移到提示上或焦點停在按鈕上時倒數會暫停。
> - 提示消失後即無法復原，因此執行清除前仍建議先以「完整備份」格式匯出。
> - 匯入時若選擇「完全覆寫」，必須再通過一次確認對話框；關閉視窗或按 `ESC` 一律視為取消。

---

## 開發與貢獻指南

歡迎所有開發者協助改進本專案！如果您有任何建議或發現 Bug，請隨時提交 Issue 或 Pull Request。

| 文件 | 內容 |
| :--- | :--- |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | 回報問題、開發環境、手動測試清單、Commit 與 PR 流程 |
| [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md) | 社群行為準則與檢舉方式 |
| [SECURITY.md](./SECURITY.md) | 支援版本、私密漏洞回報管道與回報範圍 |
| [ACCESSIBILITY.md](./ACCESSIBILITY.md) | 無障礙目標、已知限制與障礙回報方式 |
| [CHANGELOG.md](./CHANGELOG.md) | 各版本的新增、改善、修正與移除項目 |

### 開發與修改流程

本專案為純原生前端架構之瀏覽器擴充功能，零外部相依、無編譯打包步驟、亦無需啟動任何本機伺服器：

```bash
# 複製專案庫
git clone https://github.com/Scorpio-meow/Threadkeep.git
cd Threadkeep

# 直接在瀏覽器擴充功能頁面載入未封裝項目，即可開始偵錯與開發
```

### 開發注意事項與架構規範

- **零外部依賴原則**：專案嚴格保持原生輕量化設計，請勿引入任何 npm 執行期依賴或外部 CDN 框架。
- **嚴格 CSP 相容**：HTML 中**禁止使用 `style` 屬性與行內事件監聽器**（例如 `onclick="..."`），必須使用 `addEventListener` 進行事件綁定；需要由程式決定的數值（例如瀑布流的跨列數、游標光斑位置、卡片淡入順序）一律由 JS 設定 CSS 變數或單一屬性。
- **共用設計系統**：顏色、字型、字級與圓角一律使用 `ui.css` 的變數，新元件先找 `ui.css` 裡現成的 `.btn`、`.field`、`.check`、`.switch`、`.menu`、`.tag-chip` 等類別；字級只用 12、14、16、20px。新增顏色時要同時給出淺色與深色值，並確認文字對比至少 4.5:1。
- **欄位擴展規範**：若在 `content.js` 中新增或修改了儲存欄位，請務必同步更新本 README 的 [資料模型與儲存 Schema](#資料模型與儲存-schema) 區段、[llms.txt](./llms.txt) 與匯出/匯入模組。
- **禁用原生對話框**：`confirm()`、`alert()` 與 `prompt()` 一律以頁內 Modal 取代。Popup 失焦時原生對話框會連同 Popup 一併關閉並回傳預設值，極易造成誤觸破壞性操作。
- **聲音**：新增音效時把檔案放進 `sounds/` 並登記到 `sound.js` 的 `SOUND_EFFECT_FILES`，在真的成功或失敗時才呼叫 `playSound`；若要在 Threads 頁面播放，還要加進 `manifest.json` 的 `web_accessible_resources`。音效只能補充，畫面與 live region 仍要傳達同樣的結果。
- **無障礙基本要求**：新增的 Modal 需具備 `role="dialog"`、`aria-modal="true"`、焦點鎖定與焦點還原；可點擊元素請使用 `button` 並維持 24×24px 以上的點擊區域；停用狀態請使用 `disabled` 而非僅靠 `pointer-events: none`。卡片上重複出現的按鈕要在名稱帶上是哪一篇；重畫清單時保留焦點；對話框內的元件不要用 `transition: all`。

---

## 版本更新紀錄 (Changelog)

各版本的新增、改善、修正與移除項目記錄在 [CHANGELOG.md](./CHANGELOG.md)，格式遵循 [Keep a Changelog](https://keepachangelog.com/zh-TW/1.0.0/)。

---

## AI 友善文件說明 (llms.txt)

本專案已在根目錄提供獨立的 **[llms.txt](./llms.txt)** 規格文件，專供 AI 代理、LLM 檢索工具與 RAG 索引系統快速讀取與結構化解析本專案：

- 獨立文件路徑：`llms.txt`
- 包含內容：專案核心資訊、核心模組路徑、完整資料模型 Schema、核心演算法實作機制與關聯專案資訊。

---

## 授權條款與免責聲明

### 授權條款

本專案採用 **[MIT 授權條款](./LICENSE)** 開源釋出。您可以自由使用、修改、分發與整合於個人或商業專案中。

### 免責聲明

本擴充功能為第三方獨立開發之開源工具，與 Meta 或 Threads 官方無任何關聯、授權或隸屬關係。Threads 平台的網頁結構、API 與使用規範可能隨時變更，若因官方平台改版導致擷取功能暫時失效，需等待維護者更新選擇器規則。使用者須自行承擔使用本工具之相關風險。

---

<div align="center">

**Threadkeep**（舊名 Threads 程式碼儲存器）  
由 [Scorpio-meow](https://github.com/Scorpio-meow) 開發與維護

</div>