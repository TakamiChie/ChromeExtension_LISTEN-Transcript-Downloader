(function () {
  const BUTTON_ID = "listendltool_download";
  const STORAGE_KEY = "transcript_selection";

  function addCheckBoxes(params) {
    if (isMyPodcast(window.location.href.split("?")[0])) {
      // 自分が管理しているポッドキャストなら、チェックボックスと一括ダウンロードボタンを作成
      let button = document.createElement("button");
      button.textContent = "文字起こしの一括ダウンロード";
      button.addEventListener("click", () => do_download());
      button.id = BUTTON_ID;
      document.body.appendChild(button);

      Array.from(document.querySelectorAll(".playable-episode")).forEach(e => {
        let check = document.createElement("input");
        check.type = "checkbox";
        check.id = `check_${e.dataset.episodeId}`;
        check.className = "transcript-checkbox";
        check.addEventListener("change", handleCheckboxChange); // イベントリスナーを更新
        e.querySelector("h2").insertBefore(check, e.querySelector("h2 > a"));

        // ローカルストレージから状態を復元
        restoreCheckboxState(check);
      });
    }
  }

  function dateToStr(date, separator = "") {
    return date.getFullYear() + separator +
      String(date.getMonth() + 1).padStart(2, "0") + separator +
      String(date.getDate()).padStart(2, "0");
  }

  function updateButtonVisibility() {
    const button = document.getElementById(BUTTON_ID);
    if(button){
      button.style.opacity = Object.keys(loadStorageData()).length > 0 ? 1 : 0;
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
    const summary = summaryElement ? summaryElement.textContent.trim() : "概要なし";
    const anchor = parent.querySelector("a");
    if (!anchor) return;

    const title = anchor.textContent.trim();
    const url = anchor.href;

    // 配信日を取得
    let dateDiv = summaryElement?.previousElementSibling;
    let rawDate = dateDiv ? dateDiv.childNodes[0].textContent.trim() : null;
    let formattedEpisodeDate = rawDate ? dateToStr(new Date(rawDate), "-") : "日付不明";

    if (checkbox.checked) {
      storageData[checkbox.id] = { summary, title, url, date: formattedEpisodeDate};
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

  async function do_download(p) {
    const storageData = loadStorageData();
    const today = new Date();
    const formattedDate = dateToStr(today);
    let transcriptData = [];

    const checkedIds = Object.keys(storageData);
    if (checkedIds.length === 0){
      alert("選択された文字起こしがありません。");
      return;
    }
    // 日付順にソート
    const sortedData = Object.entries(storageData).sort(([, a], [, b]) => {
        if (a.date === "日付不明") return 1; // 日付不明は最後に配置
        if (b.date === "日付不明") return -1; // 日付不明は最後に配置
        return new Date(a.date) - new Date(b.date); // 日付順に並び替え
    });

    for (const [id, { summary, title, url, date }] of sortedData) {
      const transcriptUrl = url + "/transcript.txt";

      try {
        const response = await fetch(transcriptUrl);
        if (!response.ok) throw new Error("Failed to download: " + transcriptUrl);

        const text = await response.text();

        transcriptData.push(`# ${date} ${title}\n${url}\n\n${summary}\n\n${text}`);
      } catch (error) {
        console.error(error);
      }
    }

    if (transcriptData.length === 0) {
      alert("選択された文字起こしがありません。");
      return;
    }

    const finalText = transcriptData.join("\n\n");
    const blob = new Blob([finalText], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${formattedDate}_summary.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    localStorage.removeItem(STORAGE_KEY); //ダウンロード完了後にローカルストレージをクリア
    const checkboxes = document.querySelectorAll("input[class^='transcript-checkbox']");
    checkboxes.forEach(checkbox => {
        checkbox.checked = false
    });
    updateButtonVisibility();
  }

  function isMyPodcast(url) {
    let myPodcasts = Array.from(document.querySelectorAll("nav > div a"))
      .map(a => a.href)
      .filter(href => href.startsWith("https://listen.style/p/"))
      .map(href => href.split("?")[0])
      .filter((href, index, self) => self.indexOf(href) === index)
    return myPodcasts.some(href => url.startsWith(href));
  }

  const observer = new MutationObserver(() => {
    if (!document.getElementById(BUTTON_ID) && document.querySelector('div[x-data=newPlayer]')) {
      addCheckBoxes();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
})();
