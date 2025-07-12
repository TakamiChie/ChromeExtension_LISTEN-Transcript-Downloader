// popup.js

document.addEventListener('DOMContentLoaded', () => {
  const fileExtensionSelect = document.getElementById('file-extension');
  const includeUrlCheckbox = document.getElementById('include-url');
  const includeSummaryCheckbox = document.getElementById('include-summary');
  const includePodcastNameCheckbox = document.getElementById('include-podcast-name');

  // 変更を保存する関数
  const saveOptions = () => {
    const fileExtension = fileExtensionSelect.value;
    const includeUrl = includeUrlCheckbox.checked;
    const includeSummary = includeSummaryCheckbox.checked;
    const includePodcastName = includePodcastNameCheckbox.checked;

    chrome.storage.sync.set({
      fileExtension: fileExtension,
      includeUrl: includeUrl,
      includeSummary: includeSummary,
      includePodcastName: includePodcastName,
    }, () => {
      console.log('Options saved:', { fileExtension, includeUrl, includeSummary, includePodcastName });
    });
  };

  // 変更イベントリスナーを追加
  fileExtensionSelect.addEventListener('change', saveOptions);
  includeUrlCheckbox.addEventListener('change', saveOptions);
  includeSummaryCheckbox.addEventListener('change', saveOptions);
  includePodcastNameCheckbox.addEventListener('change', saveOptions);

  // ページ読み込み時に保存された設定を読み込む
  chrome.storage.sync.get(['fileExtension', 'includeUrl', 'includeSummary', 'includePodcastName'], (result) => {
    if (result.fileExtension) {
      fileExtensionSelect.value = result.fileExtension;
    }
    if (result.includeUrl !== undefined) {
      includeUrlCheckbox.checked = result.includeUrl;
    }
    if (result.includeSummary !== undefined) {
      includeSummaryCheckbox.checked = result.includeSummary;
    }
    if (result.includePodcastName !== undefined) {
      includePodcastNameCheckbox.checked = result.includePodcastName;
    }
    console.log('Options loaded:', result);
  });
});
