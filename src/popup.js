// popup.js

document.addEventListener('DOMContentLoaded', () => {
  const fileExtensionSelect = document.getElementById('file-extension');
  const fileFormatSelect = document.getElementById('file-format');

  // 変更を保存する関数
  const saveOptions = () => {
    const fileExtension = fileExtensionSelect.value;
    const fileFormat = fileFormatSelect.value;

    chrome.storage.sync.set({
      fileExtension: fileExtension,
      fileFormat: fileFormat,
    }, () => {
      console.log('Options saved:', { fileExtension, fileFormat });

      // LISTEN のタブを探してメッセージを送信
      chrome.tabs.query({ url: 'https://listen.style/*' }, (tabs) => {
        tabs.forEach((tab) => {
          chrome.tabs.sendMessage(tab.id, { action: 'clearLocalStorage' });
        });
      });
    });
  };

  // 変更イベントリスナーを追加
  fileExtensionSelect.addEventListener('change', saveOptions);
  fileFormatSelect.addEventListener('change', saveOptions);

  // ページ読み込み時に保存された設定を読み込む
  chrome.storage.sync.get(['fileExtension', 'fileFormat'], (result) => {
    if (result.fileExtension) {
      fileExtensionSelect.value = result.fileExtension;
    }
    if (result.fileFormat) {
      fileFormatSelect.value = result.fileFormat;
    }
    console.log('Options loaded:', result);
  });
});
