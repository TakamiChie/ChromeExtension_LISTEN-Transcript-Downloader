(function () {
  const BUTTON_ID = "listendltool_download";
  const COPYBUTTON_ID = "listendltool_copy";
  const STORAGE_KEY = "transcript_selection";
  const SORT_ORDER_KEY = "transcript_sort_order"; // ソート順序を保存するためのキー
  const DOWNLOAD_CONTAINER_ID = "listendltool_download_container"; // ダウンロードボタンとスピナーを囲むコンテナのID
  const CLEAR_STORAGE_BUTTON_ID = "listendltool_clear_storage"; // ローカルストレージをクリアするボタンのID
  const extractEpisodeId = u => u.split`/p/`[1].split`/`.join``;

  function addCopyButton() {
    let downloadContainer = document.createElement("div");
    downloadContainer.id = DOWNLOAD_CONTAINER_ID;
    document.querySelector("main").appendChild(downloadContainer);

    // 文字起こしをクリップボードにコピーするボタンを追加
    let copyButton = document.createElement("button");
    copyButton.textContent = "文字起こしをコピー";
    copyButton.addEventListener("click", () => {
      // コンテントデータの取得
      const summaryElement = document.querySelector("main div.mx-auto:nth-child(3)");
      const summary = summaryElement ? summaryElement.innerText.trim() : "概要なし";
      const title = document.querySelector("h1").textContent.trim();
      const url =  location.href;
      const id = `check_${extractEpisodeId(url)}`;
      const dateElement = document.querySelector("main div.mx-auto:nth-child(1) div[x-data]:first-child").childNodes[0];
      let formattedEpisodeDate = dateElement ? dateToStr(new Date(dateElement.textContent.trim()), "-") : "日付不明";
      const podcastName = document.title.split("-").at(-2).trim();
      let content = {};
      content[id] = { summary, title, url, date: formattedEpisodeDate, podcastName: podcastName};
      localStorage.setItem(STORAGE_KEY, JSON.stringify(content));

      do_copy();
    });
    copyButton.id = COPYBUTTON_ID;
    downloadContainer.appendChild(copyButton);

    const container = document.getElementById(DOWNLOAD_CONTAINER_ID);
    container.style.opacity = 1;
    container.style.visibility = "visible";
  }

  function addCheckBoxes() {
    // ダウンロードボタンとスピナーを囲むコンテナを作成
    let downloadContainer = document.createElement("div");
    downloadContainer.id = DOWNLOAD_CONTAINER_ID;
    document.querySelector("main").appendChild(downloadContainer);

    // 文字起こしをクリップボードにコピーするボタンを追加
    let copyButton = document.createElement("button");
    copyButton.textContent = "文字起こしをコピー";
    copyButton.addEventListener("click", () => do_copy());
    copyButton.id = COPYBUTTON_ID;
    downloadContainer.appendChild(copyButton);

    // 自分が管理しているポッドキャストなら、チェックボックスと一括ダウンロードボタンを作成
    let button = document.createElement("button");
    button.textContent = "文字起こしの一括ダウンロード";
    button.addEventListener("click", () => do_download());
    button.id = BUTTON_ID;
    downloadContainer.appendChild(button);

    // スピナーの追加
    let sortSelect = document.createElement("select");
    sortSelect.id = "listendltool_sort_order";
    let optionDesc = document.createElement("option");
    optionDesc.value = "desc";
    optionDesc.text = "降順";
    let optionAsc = document.createElement("option");
    optionAsc.value = "asc";
    optionAsc.text = "昇順";
    sortSelect.appendChild(optionDesc);
    sortSelect.appendChild(optionAsc);
    sortSelect.addEventListener("change", handleSortOrderChange);
    downloadContainer.appendChild(sortSelect);

    // ローカルストレージをクリアするボタンを追加
    let clearStorageButton = document.createElement("button");
    clearStorageButton.id = CLEAR_STORAGE_BUTTON_ID;
    clearStorageButton.textContent = "選択をクリア";
    clearStorageButton.addEventListener("click", clearLocalStorage);
    downloadContainer.appendChild(clearStorageButton);

    // ソート順序を復元
    restoreSortOrder(sortSelect);

    // 検索結果ページには.playable-episodeがない＝見つからなかった場合.items-startを探す
    let targetNodes = document.querySelectorAll(".playable-episode");
    if (targetNodes.length === 0) {
      targetNodes = document.querySelectorAll("main > div > div:nth-child(2) .items-start");
      if (targetNodes.length === 0) {
        console.log("再生可能なエピソードが見つかりませんでした。");
      }
    }

    Array.from(targetNodes).forEach(e => {
      const a = e.querySelector("h2 > a");
      if (!a) return; // a要素が見つからない場合はスキップ
      const episodeId = extractEpisodeId(a.href);
      let check = document.createElement("input");
      check.type = "checkbox";
      check.id = `check_${episodeId}`;
      check.className = "transcript-checkbox";
      check.addEventListener("change", handleCheckboxChange); // イベントリスナーを更新
      e.querySelector("h2").insertBefore(check, a);

      // ローカルストレージから状態を復元
      restoreCheckboxState(check);
    });
  }

  function dateToStr(date, separator = "") {
    return date.getFullYear() + separator +
      String(date.getMonth() + 1).padStart(2, "0") + separator +
      String(date.getDate()).padStart(2, "0");
  }

  function updateButtonVisibility() {
    const button = document.getElementById(BUTTON_ID);
    if (button) {
      const container = document.getElementById(DOWNLOAD_CONTAINER_ID);
      const hasData = Object.keys(loadStorageData()).length > 0;
      container.style.opacity = hasData ? 1 : 0;
      container.style.visibility = hasData ? "visible" : "hidden" ;
    }
  }

  // チェックボックスの状態変更時にローカルストレージに保存
  function handleCheckboxChange(event) {
    const checkbox = event.target;
    saveCheckboxState(checkbox);
    updateButtonVisibility();
  }

  // チェックボックスの状態をローカルストレージに保存
  function saveCheckboxState(checkbox) {
    const storageData = loadStorageData();
    const parent = checkbox.parentElement;
    const summaryElement = parent.parentElement?.parentElement?.querySelector("p");
    /*
     * # 検索ページの概要欄について
     * 検索ページの概要欄には検索にヒットした部分の抜粋が出てくる為、この方法では概要が取得できない
     * もちろんRSSやエピソードページには概要が記述されているのでそれを読むこともできるが、ダウンロードするファイル数が増えてしまう為、あまり効率的ではない。
     * ひとまずこのまま実装しておいて、もし要望があればダウンロードを増やしてでも概要を解決するかどうか選べるようにするぐらいでどうか。
     */
    const summary = summaryElement ? summaryElement.textContent.trim() : "概要なし";
    const anchor = parent.querySelector("a");
    if (!anchor) return;

    const title = anchor.textContent.trim();
    const url = anchor.href;

    // 配信日を取得
    let dateDiv = summaryElement?.previousElementSibling;
    let rawDate = dateDiv ? dateDiv.childNodes[0].textContent.trim() : null;
    let formattedEpisodeDate = rawDate ? dateToStr(new Date(rawDate), "-") : "日付不明";

    // ポッドキャスト名を取得
    const podcastName = document.title.replace("- LISTEN", "").trim();

    if (checkbox.checked) {
      storageData[checkbox.id] = { summary, title, url, date: formattedEpisodeDate, podcastName: podcastName };
    } else {
      delete storageData[checkbox.id];
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(storageData));
  }

  // ローカルストレージからチェックボックスの状態を復元
  function restoreCheckboxState(checkbox) {
    const storageData = loadStorageData();
    if (storageData[checkbox.id]) {
      checkbox.checked = true;
    }
    updateButtonVisibility();
  }

  // ローカルストレージからデータをロード
  function loadStorageData() {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  }

  // ソート順序の変更をローカルストレージに保存
  function handleSortOrderChange(event) {
    const sortOrder = event.target.value;
    localStorage.setItem(SORT_ORDER_KEY, sortOrder);
  }

  // ソート順序をローカルストレージから復元
  function restoreSortOrder(selectElement) {
    const sortOrder = localStorage.getItem(SORT_ORDER_KEY);
    if (sortOrder) {
      selectElement.value = sortOrder;
    } else {
      selectElement.value = "desc"; // デフォルトは降順
    }
  }

  async function do_copy() {
    const finalText = await get_transcript_text();
    try {
      await navigator.clipboard.writeText(finalText);
      console.log('Text copied to clipboard');
    } catch (error) {
      console.error('Failed to copy text: ', error);
    }
  }

  async function do_download() {
    const finalText = await get_transcript_text();
    await chrome.storage.sync.get(['fileExtension'], (setting) => {
      const today = new Date();
      const formattedDate = dateToStr(today);
      const fileExtension = setting.fileExtension || ".txt";
      const blob = new Blob([finalText], { type: "text/plain" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${formattedDate}_summary${fileExtension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    });
  }

  async function get_transcript_text() {
    return new Promise((resolve, reject) => {
      chrome.storage.sync.get(['fileFormat', 'includeUrl', 'includeSummary', 'includePodcastName'], async(setting) => {
      const storageData = loadStorageData();
      let transcriptData = [];
      const fileFormat = setting.fileFormat || ".txt";
      const includeUrl = setting.includeUrl !== undefined ? setting.includeUrl : true;
      const includeSummary = setting.includeSummary !== undefined ? setting.includeSummary : true;
      const includePodcastName = setting.includePodcastName !== undefined ? setting.includePodcastName : true;

      const checkedIds = Object.keys(storageData);
      if (checkedIds.length === 0) {
        alert("選択された文字起こしがありません。");
        reject("選択された文字起こしがありません。");
      }

      // ソート順序を取得
      const sortOrder = localStorage.getItem(SORT_ORDER_KEY) || "desc"; // デフォルトは降順

      // 日付順にソート
      const sortedData = Object.entries(storageData).sort(([, a], [, b]) => {
        if (a.date === "日付不明") return 1; // 日付不明は最後に配置
        if (b.date === "日付不明") return -1; // 日付不明は最後に配置
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        if (sortOrder === "asc") {
          return dateA - dateB; // 昇順
        } else {
          return dateB - dateA; // 降順
        }
      });

      for (const [id, { summary, title, url, date, podcastName }] of sortedData) {
        const transcriptUrl = `${url}/transcript${fileFormat}`;

        try {
          const response = await fetch(transcriptUrl);
          if (!response.ok) throw new Error("Failed to download: " + transcriptUrl);

          const text = await response.text();

          let transcriptEntry = `\n# ${date}`;
          if (includePodcastName) {
            transcriptEntry += `  ${podcastName}`;
          }
          transcriptEntry +=  ` ${title}\n`;
          if (includeUrl) {
            transcriptEntry += `${url}\n`;
          }
          if (includeSummary) {
            transcriptEntry += `\n${summary}\n`;
          }
          transcriptEntry += `\n${text}`;
          transcriptData.push(transcriptEntry);
        } catch (error) {
          console.error(error);
        }
      }

      if (transcriptData.length === 0) {
        alert("選択された文字起こしがありません。");
        reject("選択された文字起こしがありません。");
      }

      const finalText = transcriptData.join("\n\n");
      localStorage.removeItem(STORAGE_KEY); //ダウンロード完了後にローカルストレージをクリア
      const checkboxes = document.querySelectorAll("input[class^='transcript-checkbox']");
      checkboxes.forEach(checkbox => {
        checkbox.checked = false
      });
      updateButtonVisibility();
      resolve(finalText);
      });
    });
  }

  // ローカルストレージをクリアする関数
  function clearLocalStorage() {
    localStorage.removeItem(STORAGE_KEY);
    const checkboxes = document.querySelectorAll("input[class^='transcript-checkbox']");
    checkboxes.forEach(checkbox => {
      checkbox.checked = false;
    });
    updateButtonVisibility();
  }

  function isMyPodcast(url) {
    let myPodcasts = Array.from(document.querySelectorAll("body > div > nav > div a"))
      .map(a => a.href)
      .filter(href => href.startsWith("https://listen.style/p/"))
      .map(href => href.split("?")[0])
      .filter((href, index, self) => self.indexOf(href) === index)
    return myPodcasts.some(href => url.startsWith(href));
  }

  document.addEventListener("DOMContentLoaded", () => {
    if(isMyPodcast(window.location.href.split("?")[0])) {
      if(document.querySelector("article#transcript")){
        addCopyButton();
      }else{
        addCheckBoxes();
      }
    }
  });
})();
