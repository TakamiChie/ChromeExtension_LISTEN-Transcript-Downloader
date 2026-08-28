const test = require("node:test");
const assert = require("node:assert/strict");
const { chromium } = require("playwright");

const EPISODE_URL = "https://listen.style/p/takamichie/lhaturos";

// このエピソードで期待する概要の文章を指定してください。
const EXPECTED_SUMMARY =
  "ここ最近のできごとについて30分話す回。 #声日記 #ちえラジライブ再配信";

test(
  "個別エピソードページから期待する概要を取得できる",
  { timeout: 60_000 },
  async () => {
    const cdpUrl = process.env.LISTEN_E2E_CDP_URL;
    assert.ok(
      cdpUrl,
      "リモートデバッグを有効にしたChromeのURLを" +
        " LISTEN_E2E_CDP_URL に指定してください（例: http://localhost:9222）。"
    );
    assert.notEqual(
      EXPECTED_SUMMARY,
      "ここに期待する概要を入力してください",
      "EXPECTED_SUMMARY に期待する概要の文章を指定してください"
    );

    const browser = await chromium.connectOverCDP(cdpUrl);
    const context = browser.contexts()[0];
    assert.ok(context, "Chromeのブラウザコンテキストを取得できませんでした");

    await context.grantPermissions(["clipboard-read", "clipboard-write"], {
      origin: new URL(EPISODE_URL).origin,
    });

    let page;
    try {
      page = await context.newPage();
      await page.goto(EPISODE_URL, { waitUntil: "domcontentloaded" });

      await Promise.race([
        page.locator("#listendltool_trigger").waitFor({ state: "attached" }),
        page
          .waitForURL(
            url =>
              url.hostname === "accounts.google.com" ||
              url.pathname.startsWith("/login")
          )
          .then(() => {
            throw new Error("接続先のChromeでLISTENへログインしてください。");
          }),
      ]);

      await page.evaluate(() => navigator.clipboard.writeText(""));

      const transcriptMenu = page.getByRole("button", {
        name: /文字起こしメニュー/,
      });
      await transcriptMenu.hover();

      const copyButton = page.getByRole("button", {
        name: "文字起こしをコピー",
        exact: true,
      });
      await copyButton.waitFor({ state: "visible" });
      await copyButton.click();

      const copiedText = await waitForClipboardText(page);
      const lines = copiedText.split(/\r?\n/);
      // 1行目は空行、2行目はタイトル、3行目はURL、4行目は空行。
      const actualSummary = normalizeWhitespace(lines[4] || "");

      const expectedSummary = normalizeWhitespace(EXPECTED_SUMMARY);

      console.log("期待する概要:", expectedSummary);
      console.log("コピー結果の概要行:", actualSummary);
      assert.equal(actualSummary, expectedSummary);
    } finally {
      if (page) await page.close();
    }
  }
);

function normalizeWhitespace(text) {
  return text.replace(/\s+/g, " ").trim();
}

async function waitForClipboardText(page) {
  const deadline = Date.now() + 15_000;

  while (Date.now() < deadline) {
    const text = await page.evaluate(() => navigator.clipboard.readText());
    if (text.trim()) return text;
    await new Promise(resolve => setTimeout(resolve, 250));
  }

  assert.fail("文字起こしが15秒以内にクリップボードへコピーされませんでした");
}
