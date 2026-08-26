(function (root, factory) {
  const api = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else {
    root.ListendlDownloadFilename = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function sanitizeFilenamePart(value) {
    return value.replace(/[\\/:*?"<>|]/g, "_");
  }

  function buildSpeakerDownloadFilename(date, title, speaker, extension) {
    return `${date}_${sanitizeFilenamePart(title)}_${sanitizeFilenamePart(speaker)}${extension}`;
  }

  return { buildSpeakerDownloadFilename };
});
