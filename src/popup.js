document.getElementById("openPage").addEventListener("click", () => {
  chrome.tabs.create({ url: "https://listen.style" });
});
