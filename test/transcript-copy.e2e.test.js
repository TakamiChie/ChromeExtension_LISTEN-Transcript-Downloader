const test = require("node:test");
const assert = require("node:assert/strict");
const { chromium } = require("playwright");

const EPISODE_URL = "https://listen.style/p/takamichie/qbgfjqwo";

// このエピソードで期待するタイトル文字列を指定してください。
const EXPECTED_TITLE = "# 2026-08-26  ちえラジ Chat ポッドキャスト版 まちのえんがわキャスト #8 わこう子育てネットワーク 南條有希子さん回振り返り";

test(
  "文字起こしメニューからコピーした文字起こしの先頭行にタイトルが含まれる",
  { timeout: 60_000 },
  async () => {
    const cdpUrl = process.env.LISTEN_E2E_CDP_URL;
    assert.ok(
      cdpUrl,
      "リモートデバッグを有効にしたログイン済みChromeのURLを" +
      " LISTEN_E2E_CDP_URL に指定してください（例: http://localhost:9222）。"
    );
    assert.notEqual(
      EXPECTED_TITLE,
      "ここに期待するタイトルを入力してください",
      "EXPECTED_TITLE に期待するタイトル文字列を指定してください"
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
      const firstLine = copiedText.split(/\r?\n/).find(line => line.trim())?.trim();

      console.log("期待するタイトル文字列:", EXPECTED_TITLE);
      console.log("コピー結果の先頭行:", firstLine);

      assert.ok(firstLine, "コピーした文字起こしに先頭行があること");
      assert.ok(
        firstLine.includes(EXPECTED_TITLE),
        `先頭行にタイトル「${EXPECTED_TITLE}」が含まれること（実際: ${firstLine}）`
      );
    } finally {
      if (page) await page.close();
    }
  }
);

async function waitForClipboardText(page) {
  const deadline = Date.now() + 15_000;

  while (Date.now() < deadline) {
    const text = await page.evaluate(() => navigator.clipboard.readText());
    if (text.trim()) return text;
    await new Promise(resolve => setTimeout(resolve, 250));
  }

  assert.fail("文字起こしが15秒以内にクリップボードへコピーされませんでした");
}
