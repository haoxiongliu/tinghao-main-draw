import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the draw tool and corrected roster", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>第十届挺好萌 · 正赛抽签器<\/title>/);
  assert.match(html, /四十八强/);
  assert.match(html, /纯田真奈/);
  assert.match(html, />503</);
  assert.match(html, /温水佳树/);
  assert.match(html, /仓上日向/);
  assert.match(html, /川澄樱翔/);
  assert.doesNotMatch(html, /均衡种子分区/);
  assert.doesNotMatch(html, /宫永野乃花/);
});

test("contains the official 48 entrants, avatars, and no starter preview", async () => {
  const [page, packageJson, avatars, actualDraw] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readdir(new URL("../public/tinghao/avatars", import.meta.url)),
    readFile(new URL("../public/data/tinghao-main-draw-2026-actual.json", import.meta.url), "utf8").then(JSON.parse),
  ]);

  const rosterRows = page.match(/\["[^"]+",\d+(?:\.\d+)?,\d+(?:\.\d+)?,"(?:seed|direct|repechage)"\]/g) ?? [];
  assert.equal(rosterRows.length, 48);
  assert.equal(rosterRows.filter((row) => row.endsWith('"seed"]')).length, 8);
  assert.equal(rosterRows.filter((row) => row.endsWith('"repechage"]')).length, 8);
  assert.equal(avatars.filter((name) => name.endsWith(".avif")).length, 48);
  assert.match(page, /function normalizeWinners/);
  assert.match(page, /aria-pressed/);
  assert.match(page, /const groupLetters = "ABCDEFGHIJKLMNOP"/);
  assert.match(page, /每个1\/4区最多三名种子/);
  assert.match(page, /quarterCounts\.every\(\(count\) => count <= 3\)/);
  assert.match(page, /function parseCsv/);
  assert.match(page, /function createRandomSeed/);
  assert.match(page, /useState\(actualDrawSeed\)/);
  assert.match(page, /useState<Participant\[\] \| null>\(\(\) => \[\.\.\.actualPlan\]\)/);
  assert.match(page, /seedText === actualDrawSeed \? \[\.\.\.actualPlan\] : makePlan\(seedText\)/);
  assert.match(page, /当前展示运营公布的第十届实际签表/);
  assert.equal(actualDraw.draw.length, 48);
  assert.equal(new Set(actualDraw.draw.map((row) => row.name)).size, 48);
  assert.deepEqual(actualDraw.draw.slice(0, 3).map((row) => row.name), ["仲町阿拉蕾", "郡上奏", "优木雪菜"]);
  assert.deepEqual(actualDraw.draw.slice(-3).map((row) => row.name), ["社美胡", "砺波伊吹", "凉风凉"]);
  assert.match(page, /下载第十届实际签表 JSON/);
  assert.doesNotMatch(page, /useState\("tinghao-2026"\)/);
  assert.match(page, /加载 JSON \/ CSV/);
  assert.match(page, /accept="\.json,\.csv,application\/json,text\/csv"/);
  assert.match(page, /toBlob\(capture/);
  assert.match(page, /bracketCaptureRef/);
  assert.match(page, /签表分享图/);
  assert.match(page, /推演分享图/);
  assert.match(page, /抽签算法与概率证明/);
  assert.match(page, /算法与概率说明/);
  assert.match(page, /357,212,160/);
  assert.match(page, /1\.91 × 10⁶⁰/);
  assert.match(page, /3⁸ = 6561/);
  assert.match(page, /预先生成，再逐位揭晓/);
  assert.match(page, /概率链式法则/);
  assert.match(page, /决赛 · 挺王/);
  assert.match(page, /挺王待定/);
  assert.doesNotMatch(page, /冠军/);
  assert.match(page, /久石奏",449,65\.55,"seed"/);
  assert.match(page, /三角初华",434,63\.36,"seed"/);
  assert.match(page, /社美胡",357,52\.12,"direct"/);
  assert.match(page, /仓上日向",212,30\.95,"repechage"/);
  assert.match(page, /const avatarIds = \[1,2,3,4,5,6,8,7/);
  assert.match(page, /github\.com\/haoxiongliu\/tinghao-main-draw/);
  assert.match(page, /图片已包含签位生成种子/);
  assert.match(page, /className="capture-seed"/);
  assert.match(page, /复制种子/);
  assert.match(page, /text: `签位生成种子：\$\{seedText\}`/);
  assert.doesNotMatch(page, /balanced/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  await assert.rejects(access(new URL("../app/_sites-preview", import.meta.url)));
});
