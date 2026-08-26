const test = require("node:test");
const assert = require("node:assert/strict");

const { buildSpeakerDownloadFilename } = require("../src/download-filename");

test("話者別ダウンロードのファイル名を日付_エピソード名_話者名.拡張子の形式で生成する", () => {
  const filename = buildSpeakerDownloadFilename(
    "20260826",
    "テストエピソード",
    "山田太郎",
    ".vtt"
  );

  assert.equal(filename, "20260826_テストエピソード_山田太郎.vtt");
});

test("エピソード名と話者名に含まれるファイル名に使用できない文字を置換する", () => {
  const filename = buildSpeakerDownloadFilename(
    "20260826",
    "前編/後編:特別回",
    "山田?太郎",
    ".txt"
  );

  assert.equal(filename, "20260826_前編_後編_特別回_山田_太郎.txt");
});
