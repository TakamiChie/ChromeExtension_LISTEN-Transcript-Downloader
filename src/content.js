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
      div.id = BUTTON_ID;
      div.appendChild(button);
      nav.parentElement.insertBefore(div, nav);
    }
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
