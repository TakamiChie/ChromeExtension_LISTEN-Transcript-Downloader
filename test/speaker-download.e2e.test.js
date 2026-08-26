const test = require("node:test");
const assert = require("node:assert/strict");
const { chromium } = require("playwright");

const d = new Date().toLocaleString('ja-JP', {
  timeZone: 'Asia/Tokyo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
}).replace(/\//g, '');

const EPISODES = [
  {
    name: "公開済みエピソード",
    url: "https://listen.style/p/takamichie_ai_research/lvuftedi",
    expectedFilenames: [
      // 期待するファイル名を入力してください。
      `${d}_都会の中のコミュニティカフェ：コミュニティカフェとフリースクールの運営・開業ガイド(コミュニティカフェ発社会人へのメッセージ)_ノオト・ブク子.txt`,
      `${d}_都会の中のコミュニティカフェ：コミュニティカフェとフリースクールの運営・開業ガイド(コミュニティカフェ発社会人へのメッセージ)_ノオト・ブク太郎.txt`,
    ],
  },
  {
    name: "未公開の予約投稿",
    url: "https://listen.style/p/takamichie_ai_research/ttjfbcr5",
    expectedFilenames: [
      // 期待するファイル名を入力してください。複数ある場合は要素を追加します。
      `${d}_子どもたちの遊び場事情：外遊びの危機と次世代の居場所づくり_ノオト・ブク子.txt`,
      `${d}_子どもたちの遊び場事情：外遊びの危機と次世代の居場所づくり_ノオト・ブク太郎.txt`,
    ],
  },
];

for (const episode of EPISODES) {
  test(
    `${episode.name}で話者別テキストを期待したファイル名でダウンロードできる`,
    { timeout: 60_000 },
    async () => runSpeakerDownloadTest(episode.url, episode.expectedFilenames)
  );
}

async function runSpeakerDownloadTest(episodeUrl, expectedFilenames) {
  const cdpUrl = process.env.LISTEN_E2E_CDP_URL;
  assert.ok(
    cdpUrl,
    "リモートデバッグを有効にしたログイン済みChromeのURLを" +
    " LISTEN_E2E_CDP_URL に指定してください（例: http://localhost:9222）。"
  );

  const browser = await chromium.connectOverCDP(cdpUrl);
  const context = browser.contexts()[0];
  assert.ok(context, "Chromeのブラウザコンテキストを取得できませんでした");
  let page;

  try {
    page = await context.newPage();
    await page.goto(episodeUrl, { waitUntil: "domcontentloaded" });

    await Promise.race([
      page.locator("#listendltool_speaker_download").waitFor({ state: "attached" }),
      page.waitForURL(url =>
        url.hostname === "accounts.google.com" || url.pathname.startsWith("/login")
      ).then(() => {
        throw new Error("接続先のChromeでLISTENへログインしてください。");
      }),
    ]);

    const downloads = [];
    page.on("download", download => downloads.push(download));

    const speakerDownloadButton = page.getByRole("button", {
      name: "話者別ダウンロード",
    });
    await page.locator("#listendltool_download_container").hover();
    await speakerDownloadButton.waitFor({ state: "visible" });
    await speakerDownloadButton.click();

    await waitUntilDownloadsSettle(downloads);
    assert.ok(downloads.length > 0, "話者別ファイルが1件以上ダウンロードされること");

    const actualFilenames = downloads
      .map(download => download.suggestedFilename())
      .sort();
    const sortedExpectedFilenames = [...expectedFilenames].sort();

    console.log("ダウンロードしたファイル名:", actualFilenames);
    console.log("期待しているファイル名:", sortedExpectedFilenames);
    assert.deepEqual(actualFilenames, sortedExpectedFilenames);
  } finally {
    if (page) await page.close();
  }
}

async function waitUntilDownloadsSettle(downloads) {
  const deadline = Date.now() + 15_000;
  let previousCount = -1;
  let stableChecks = 0;

  while (Date.now() < deadline) {
    await new Promise(resolve => setTimeout(resolve, 500));
    if (downloads.length > 0 && downloads.length === previousCount) {
      stableChecks += 1;
      if (stableChecks === 2) return;
    } else {
      stableChecks = 0;
      previousCount = downloads.length;
    }
  }

  assert.fail("話者別ファイルのダウンロードを15秒以内に確認できませんでした");
}
