(function () {
  const BUTTON_ID = "listendltool_download";

  function addCheckBoxes(params) {
    if(isMyPodcast(window.location.href.split("?")[0])) {
      // 自分が管理しているポッドキャストなら、チェックボックスと一括ダウンロードボタンを作成
      Array.from(document.querySelectorAll(".playable-episode")).forEach(e => {
        let check = document.createElement("input");
        check.type ="checkbox";
        check.id = `check_${e.dataset.episodeId}`;
        check.className = "transcript-checkbox";
        e.querySelector("h2").insertBefore(check, e.querySelector("h2 > a"));
      });
      let div = document.createElement("div");
      let button = document.createElement("button");
      let nav = document.querySelector("div nav");
      button.textContent = "文字起こしの一括ダウンロード";
      button.addEventListener("click", () => do_download());
      div.id = BUTTON_ID;
      div.appendChild(button);
      nav.parentElement.insertBefore(div, nav);
    }
  }

  function dateToStr(date, separator = "") {
    return date.getFullYear() + separator +
      String(date.getMonth() + 1).padStart(2, "0") + separator +
      String(date.getDate()).padStart(2, "0");
  }
  async function do_download(p) {
    const checkboxes = document.querySelectorAll("input[class^='transcript-checkbox']:checked");
    const today = new Date();
    const formattedDate = dateToStr(today);
    let transcriptData = [];

    for (let checkbox of checkboxes) {
      let parent = checkbox.parentElement;

      // `parentElement` を2回たどって、その配下の `p` タグを取得
      let summaryElement = parent.parentElement?.parentElement?.querySelector("p");
      let summary = summaryElement ? summaryElement.textContent.trim() : "概要なし";

      // 配信日を取得（pタグの一つ上のdivの最初のテキストノード）
      let dateDiv = summaryElement?.previousElementSibling;
      let rawDate = dateDiv ? dateDiv.childNodes[0].textContent.trim() : null;
      let formattedEpisodeDate = rawDate ? dateToStr(new Date(rawDate), "-") : "日付不明";

      // 隣接する `a` タグを取得
      let anchor = parent.querySelector("a");
      if (!anchor) continue;

      const transcriptUrl = anchor.href + "/transcript.txt";

      try {
        const response = await fetch(transcriptUrl);
        if (!response.ok) throw new Error("Failed to download: " + transcriptUrl);

        const text = await response.text();
        const title = anchor.textContent.trim();
        const date = formattedEpisodeDate

        transcriptData.push(`# ${date} ${title}\n${anchor.href}\n\n${summary}\n\n${text}`);
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
