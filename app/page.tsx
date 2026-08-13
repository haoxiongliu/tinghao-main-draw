"use client";

import { toBlob } from "html-to-image";
import { type ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import actualDrawData from "@/public/data/tinghao-main-draw-2026-actual.json";

type Source = "seed" | "direct" | "repechage";
type Participant = {
  id: number;
  full: string;
  work: string;
  name: string;
  vote: number;
  rate: number;
  avatar: string;
  source: Source;
  seed?: number;
};

// 运营公布的砍票后最终 48 强名单；顺序即图中的“总排名”。
const officialData: ReadonlyArray<readonly [string, number, number, Source]> = [
  ["超时空辉夜姬!-绫紬芦花",552,74.8,"seed"],["BanG Dream!(ON)-纯田真奈",503,70.45,"seed"],["超时空辉夜姬!-月见八千代",493,72.18,"seed"],["上伊那牡丹,酒醉身姿似百合花般-郡上奏",487,69.77,"seed"],["BanG Dream!(ON)-薇欧拉",472,63.96,"seed"],["BanG Dream!(ON)-藤都子",470,63.69,"seed"],["吹响!上低音号-久石奏",449,65.55,"seed"],["BanG Dream!(ON)-三角初华",434,63.36,"seed"],
  ["恋人不行-濑名紫阳花",411,59.48,"direct"],["Love Live 虹咲-优木雪菜",404,57.88,"direct"],["超时空辉夜姬!-辉夜",401,62.85,"direct"],["恋人不行-小柳香穗",401,62.85,"direct"],["恋人不行-王冢真唯",397,56.88,"direct"],["恋人不行-甘织遥奈",381,53.36,"direct"],["星灵感应-明内幽",374,54.76,"direct"],["BadGirl-凉风凉",366,53.59,"direct"],
  ["GIRLS BAND CRY-货车",359,56.27,"direct"],["想吃掉我的非人少女-社美胡",357,52.12,"direct"],["BanG Dream!(ON)-仲町阿拉蕾",353,55.68,"direct"],["超时空辉夜姬!-酒寄彩叶",350,50.65,"direct"],["恋人不行-琴纱月",348,50.8,"direct"],["安达与岛村-岛村抱月",344,50.22,"direct"],["魔法少女小圆-佐仓杏子",327,51.58,"direct"],["少女歌剧-星见纯那",325,45.52,"direct"],
  ["败犬女主太多了!-八奈见杏菜",315,45.59,"direct"],["败犬女主太多了!-小鞠知花",312,44.7,"direct"],["我推的孩子-有马加奈",307,44.95,"direct"],["BanG Dream!(ON)-高松灯",305,42.72,"direct"],["辉夜大小姐想让我告白-四条真妃",290,42.34,"repechage"],["恋人不行-甘织玲奈子",289,39.16,"direct"],["孤独摇滚-伊地知虹夏",286,45.11,"direct"],["败犬女主太多了!-烧盐柠檬",284,38.48,"direct"],
  ["败犬女主太多了!-温水佳树",279,39.08,"direct"],["上伊那牡丹,酒醉身姿似百合花般-张景岚",269,38.54,"direct"],["吹响!上低音号-吉川优子",269,37.68,"repechage"],["孤独摇滚-后藤一里",261,38.21,"direct"],["我推的孩子-黑川茜",259,40.85,"direct"],["败犬女主太多了!-马剃天爱星",259,37.48,"direct"],["上伊那牡丹,酒醉身姿似百合花般-砺波伊吹",256,40.38,"direct"],["前桥魔女-上泉舞衣",256,35.85,"repechage"],
  ["葬送的芙莉莲-辛美尔",255,40.22,"repechage"],["恋语轻唱-泉志帆",253,37.04,"repechage"],["Love Live 虹咲-高咲侑",251,36.32,"direct"],["向日葵马戏团-川澄樱翔",249,39.27,"repechage"],["BadGirl-优谷优",238,37.3,"direct"],["闪耀路标-黑金莲",231,33.09,"repechage"],["终将成为你-七海灯子",223,34.95,"direct"],["向山进发-仓上日向",212,30.95,"repechage"],
] as const;

// 头像文件按上一版名单编号保存；修正排名后按角色重新映射，避免头像随名次错位。
const avatarIds = [1,2,3,4,5,6,8,7,9,10,11,12,13,14,15,16,17,19,20,22,21,18,23,24,25,26,27,28,29,30,31,32,33,35,34,37,39,38,41,40,42,43,44,45,46,47,48,36] as const;

function splitName(full: string) {
  const index = full.lastIndexOf("-");
  return { work: full.slice(0, index), name: full.slice(index + 1) };
}

const participants: Participant[] = officialData.map(([full, vote, rate, source], index) => ({
  id: index + 1,
  full,
  ...splitName(full),
  vote,
  rate,
  avatar: `/tinghao/avatars/${avatarIds[index]}.avif`,
  source,
  seed: source === "seed" ? index + 1 : undefined,
}));

function xmur3(value: string) {
  let hash = 1779033703 ^ value.length;
  for (let i = 0; i < value.length; i++) {
    hash = Math.imul(hash ^ value.charCodeAt(i), 3432918353);
    hash = hash << 13 | hash >>> 19;
  }
  return () => {
    hash = Math.imul(hash ^ hash >>> 16, 2246822507);
    hash = Math.imul(hash ^ hash >>> 13, 3266489909);
    return (hash ^= hash >>> 16) >>> 0;
  };
}

function mulberry32(seed: number) {
  return () => {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function createRandomSeed() {
  const randomPart = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID().replaceAll("-", "").slice(0, 12)
    : Math.random().toString(36).slice(2, 14);
  return `tinghao-${Date.now().toString(36)}-${randomPart}`;
}

function shuffle<T>(items: T[], random: () => number) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function makePlan(seedText: string) {
  const seed = xmur3(seedText)();
  const random = mulberry32(seed);
  const seeds = participants.filter((p) => p.seed);
  const others = participants.filter((p) => !p.seed);
  let seedGroups: number[] = [];

  for (let attempt = 0; attempt < 10000; attempt++) {
    const candidate = shuffle(Array.from({ length: 16 }, (_, i) => i), random).slice(0, 8);
    const topSeparate = Math.floor(candidate[0] / 4) !== Math.floor(candidate[1] / 4);
    const quarterCounts = candidate.reduce<number[]>((counts, group) => {
      counts[Math.floor(group / 4)]++;
      return counts;
    }, [0, 0, 0, 0]);
    const quarterBalanced = quarterCounts.every((count) => count <= 3);
    if (topSeparate && quarterBalanced) {
      seedGroups = candidate;
      break;
    }
  }

  if (!seedGroups.length) throw new Error("无法生成有效签表");

  const slots: Array<Participant | null> = Array(48).fill(null);
  seeds.forEach((player, index) => {
    const group = seedGroups[index];
    const open = shuffle([0, 1, 2], random).find((slot) => slots[group * 3 + slot] === null)!;
    slots[group * 3 + open] = player;
  });
  const remaining = shuffle(others, random);
  let cursor = 0;
  for (let i = 0; i < slots.length; i++) {
    if (!slots[i]) slots[i] = remaining[cursor++];
  }
  return slots as Participant[];
}

const regions = ["第1区", "第2区", "第3区", "第4区"];
const groupLetters = "ABCDEFGHIJKLMNOP";
type Winners = Record<string, number>;

function normalizeWinners(next: Winners, plan: Participant[] | null): Winners {
  if (!plan) return {};
  const valid = { ...next };
  const keep = (key: string, ids: Array<number | undefined>) => {
    if (!ids.includes(valid[key])) delete valid[key];
  };
  for (let i = 0; i < 16; i++) keep(`g${i}`, plan.slice(i * 3, i * 3 + 3).map((p) => p.id));
  for (let i = 0; i < 8; i++) keep(`r${i}`, [valid[`g${i * 2}`], valid[`g${i * 2 + 1}`]]);
  for (let i = 0; i < 4; i++) keep(`q${i}`, [valid[`r${i * 2}`], valid[`r${i * 2 + 1}`]]);
  for (let i = 0; i < 2; i++) keep(`s${i}`, [valid[`q${i * 2}`], valid[`q${i * 2 + 1}`]]);
  keep("f", [valid.s0, valid.s1]);
  return valid;
}

function playerFromId(id?: number) {
  return id ? participants.find((p) => p.id === id) ?? null : null;
}

type ImportRow = {
  group?: unknown;
  slot?: unknown;
  work?: unknown;
  name?: unknown;
};

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index++) {
    const character = text[index];
    if (character === '"') {
      if (quoted && text[index + 1] === '"') {
        field += '"';
        index++;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      row.push(field);
      field = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && text[index + 1] === "\n") index++;
      row.push(field);
      if (row.some((cell) => cell.trim())) rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }
  if (quoted) throw new Error("CSV 中有未闭合的引号");
  if (field || row.length) {
    row.push(field);
    if (row.some((cell) => cell.trim())) rows.push(row);
  }
  return rows;
}

function importedPlanFromRows(rows: ImportRow[]) {
  if (rows.length !== 48) throw new Error(`文件中应有 48 个签位，实际读取到 ${rows.length} 个`);
  const slots: Array<Participant | null> = Array(48).fill(null);
  const used = new Set<number>();

  rows.forEach((row, index) => {
    const group = Number(row.group);
    const slot = Number(row.slot);
    const name = String(row.name ?? "").trim();
    const work = String(row.work ?? "").trim();
    if (!Number.isInteger(group) || group < 1 || group > 16) throw new Error(`第 ${index + 1} 行的小组必须是 1–16`);
    if (!Number.isInteger(slot) || slot < 1 || slot > 3) throw new Error(`第 ${index + 1} 行的签位必须是 1–3`);
    if (!name) throw new Error(`第 ${index + 1} 行缺少角色名`);

    const byName = participants.filter((player) => player.name === name);
    const player = byName.find((candidate) => !work || candidate.work === work) ?? (byName.length === 1 ? byName[0] : null);
    if (!player) throw new Error(`无法在正式 48 强名单中找到“${work ? `${work}-` : ""}${name}”`);
    const position = (group - 1) * 3 + slot - 1;
    if (slots[position]) throw new Error(`${group} 组第 ${slot} 签位重复`);
    if (used.has(player.id)) throw new Error(`角色“${name}”在文件中重复出现`);
    slots[position] = player;
    used.add(player.id);
  });

  if (slots.some((player) => !player) || used.size !== 48) throw new Error("签位不完整或有角色重复");
  const plan = slots as Participant[];
  const seedCounts = plan.reduce<number[]>((counts, player, index) => {
    if (player.seed) counts[Math.floor(index / 12)]++;
    return counts;
  }, [0, 0, 0, 0]);
  if (seedCounts.some((count) => count > 3)) throw new Error("签表不符合种子平衡：每个 1/4 区最多三名种子");
  return plan;
}

const actualPlan = importedPlanFromRows(actualDrawData.draw);
const actualDrawSeed = actualDrawData.randomSeed;

function planForSeed(seedText: string) {
  return seedText === actualDrawSeed ? [...actualPlan] : makePlan(seedText);
}

function importedPlanFromCsv(text: string) {
  const matrix = parseCsv(text.replace(/^\uFEFF/, ""));
  if (matrix.length < 2) throw new Error("CSV 没有可读取的数据行");
  const headers = matrix[0].map((header) => header.trim());
  const indexOf = (...names: string[]) => headers.findIndex((header) => names.includes(header));
  const groupIndex = indexOf("小组", "group");
  const slotIndex = indexOf("签位", "slot");
  const workIndex = indexOf("作品", "work");
  const nameIndex = indexOf("角色", "name");
  if ([groupIndex, slotIndex, nameIndex].some((index) => index < 0)) throw new Error("CSV 表头必须包含小组、签位和角色");
  return importedPlanFromRows(matrix.slice(1).map((cells) => ({
    group: cells[groupIndex],
    slot: cells[slotIndex],
    work: workIndex >= 0 ? cells[workIndex] : "",
    name: cells[nameIndex],
  })));
}

function importedWinners(value: unknown, plan: Participant[]) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const keyPattern = /^(?:g(?:[0-9]|1[0-5])|r[0-7]|q[0-3]|s[01]|f)$/;
  const knownIds = new Set(participants.map((player) => player.id));
  const result: Winners = {};
  Object.entries(value).forEach(([key, id]) => {
    if (keyPattern.test(key) && typeof id === "number" && Number.isInteger(id) && knownIds.has(id)) result[key] = id;
  });
  return normalizeWinners(result, plan);
}

type ShareMode = "draw" | "prediction";

function DrawGroup({ group, plan, revealed, side, winnerId, onWinner }: { group: number; plan: Participant[] | null; revealed: number; side: "left" | "right"; winnerId?: number; onWinner: (id: number) => void }) {
  const ready = !!plan && revealed >= (group + 1) * 3;
  return <div className={`draw-group ${side}`}>
    <span className="group-side-label">{groupLetters[group]}</span>
    {[0, 1, 2].map((slot) => {
      const index = group * 3 + slot;
      const player = plan && index < revealed ? plan[index] : null;
      return <button type="button" disabled={!ready || !player} aria-pressed={!!player && winnerId === player.id} onClick={() => player && onWinner(player.id)} className={`draw-entry ${player?.seed ? "seed" : ""} ${player?.source === "repechage" ? "rep" : ""} ${player && winnerId === player.id ? "winner" : ""}`} key={slot}>
        <span>{slot + 1}</span>
        {player ? <><img src={player.avatar} alt=""/><b>{player.name}</b>{player.seed ? <em>S{player.seed}</em> : player.source === "repechage" ? <em>R</em> : null}</> : <><i className="avatar-placeholder"/><i>待抽取</i></>}
      </button>;
    })}
  </div>;
}

function AdvanceMatch({ players, winnerId, onWinner, side = "left" }: { players: [Participant | null, Participant | null]; winnerId?: number; onWinner: (id: number) => void; side?: "left" | "right" }) {
  return <div className={`advance-match ${side}`}>
    {players.map((player, index) => <button type="button" disabled={!player} aria-pressed={!!player && winnerId === player.id} onClick={() => player && onWinner(player.id)} className={player && winnerId === player.id ? "winner" : ""} key={index}>
      {player ? <img src={player.avatar} alt=""/> : <i/>}<span>{player?.name ?? "待定"}</span>{player && winnerId === player.id ? <b>✓</b> : <b>—</b>}
    </button>)}
  </div>;
}

function BracketConnector({ reverse = false }: { reverse?: boolean }) {
  return <div className={`bracket-connector ${reverse ? "reverse" : ""}`} aria-hidden="true"><i className="spine"/><i className="source one"/><i className="source two"/><i className="target one"/><i className="target two"/></div>;
}

function SingleConnector({ reverse = false, target }: { reverse?: boolean; target: "upper" | "lower" }) {
  return <div className={`single-connector ${reverse ? "reverse" : ""} ${target}`} aria-hidden="true"><i className="source"/><i className="spine"/><i className="target"/></div>;
}

function FinalStage({ players, winnerId, onWinner }: { players: [Participant | null, Participant | null]; winnerId?: number; onWinner: (id: number) => void }) {
  const champion = playerFromId(winnerId);
  return <div className="final-stage">
    <div className="final-match">
      {players.map((player, index) => <button type="button" disabled={!player} aria-pressed={!!player && winnerId === player.id} onClick={() => player && onWinner(player.id)} className={player && winnerId === player.id ? "winner" : ""} key={index}>
        {player ? <img src={player.avatar} alt=""/> : <i/>}<span>{player?.name ?? "待定"}</span>{player && winnerId === player.id ? <b>✓</b> : <b>—</b>}
      </button>)}
    </div>
    <div className={`champion-row ${champion ? "decided" : ""}`}>{champion ? <><img src={champion.avatar} alt=""/><span>{champion.name}</span><b>挺王</b></> : <><i/><span>挺王待定</span></>}</div>
  </div>;
}

export default function Home() {
  const [seedText, setSeedText] = useState(actualDrawSeed);
  const [plan, setPlan] = useState<Participant[] | null>(() => [...actualPlan]);
  const [revealed, setRevealed] = useState(48);
  const [winners, setWinners] = useState<Winners>({});
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | Source>("all");
  const [copied, setCopied] = useState(false);
  const [importNotice, setImportNotice] = useState<{ kind: "success" | "error"; text: string } | null>({ kind: "success", text: "当前展示运营公布的第十届实际签表" });
  const [sharePreview, setSharePreview] = useState<{ url: string; file: File; mode: ShareMode } | null>(null);
  const [shareBusy, setShareBusy] = useState<ShareMode | null>(null);
  const [seedCopied, setSeedCopied] = useState(false);
  const [proofOpen, setProofOpen] = useState(false);
  const bracketCaptureRef = useRef<HTMLDivElement>(null);

  useEffect(() => () => {
    if (sharePreview) URL.revokeObjectURL(sharePreview.url);
  }, [sharePreview]);

  const visibleParticipants = useMemo(() => participants.filter((p) => {
    const matchesFilter = filter === "all" || p.source === filter;
    return matchesFilter && p.full.toLowerCase().includes(query.toLowerCase());
  }), [query, filter]);

  const startDraw = (instant = false, fresh = false) => {
    const nextSeed = fresh ? createRandomSeed() : seedText.trim() || createRandomSeed();
    if (fresh || !seedText.trim()) setSeedText(nextSeed);
    setPlan(planForSeed(nextSeed));
    setRevealed(instant ? 48 : 0);
    setWinners({});
    setImportNotice(null);
  };

  const reset = () => {
    setPlan(null);
    setRevealed(0);
    setWinners({});
    setCopied(false);
    setImportNotice(null);
  };

  const loadDraw = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const isJson = file.name.toLowerCase().endsWith(".json") || file.type === "application/json";
      let nextPlan: Participant[];
      let nextSeed = `import-${file.name.replace(/\.[^.]+$/, "")}`;
      let nextWinners: Winners = {};

      if (isJson) {
        const parsed: unknown = JSON.parse(text.replace(/^\uFEFF/, ""));
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("JSON 顶层格式不正确");
        const data = parsed as { randomSeed?: unknown; draw?: unknown; winners?: unknown };
        if (!Array.isArray(data.draw)) throw new Error("JSON 中缺少 draw 签位数组");
        nextPlan = importedPlanFromRows(data.draw as ImportRow[]);
        nextSeed = typeof data.randomSeed === "string" && data.randomSeed.trim() ? data.randomSeed.trim() : nextSeed;
        nextWinners = importedWinners(data.winners, nextPlan);
      } else {
        nextPlan = importedPlanFromCsv(text);
      }

      setPlan(nextPlan);
      setRevealed(48);
      setSeedText(nextSeed);
      setWinners(nextWinners);
      setCopied(false);
      setImportNotice({ kind: "success", text: isJson ? `已加载 ${file.name}，签表与赛果已恢复` : `已加载 ${file.name}，48 个签位已恢复` });
    } catch (error) {
      setImportNotice({ kind: "error", text: error instanceof Error ? error.message : "文件读取失败" });
    } finally {
      input.value = "";
    }
  };

  const drawText = useMemo(() => {
    if (!plan || revealed < 48) return "";
    return regions.map((quarter, qi) => {
      const groups = Array.from({ length: 4 }, (_, local) => {
        const group = qi * 4 + local;
        return `${groupLetters[group]}组｜${plan.slice(group * 3, group * 3 + 3).map((p) => `${p.work}-${p.name}${p.seed ? `（${p.seed}号种子）` : ""}`).join(" / ")}`;
      });
      return `${quarter}\n${groups.join("\n")}`;
    }).join("\n\n");
  }, [plan, revealed]);

  const copyResult = async () => {
    if (!drawText) return;
    await navigator.clipboard.writeText(`第十届挺好萌淘汰赛抽签结果\n签位生成种子：${seedText}\n\n${drawText}`);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const download = (format: "json" | "csv") => {
    if (!plan || revealed < 48) return;
    const rows = plan.map((p, index) => ({
      quarter: regions[Math.floor(index / 12)], group: Math.floor(index / 3) + 1,
      slot: index % 3 + 1, work: p.work, name: p.name, seed: p.seed ?? "", source: p.source,
    }));
    const content = format === "json" ? JSON.stringify({ randomSeed: seedText, draw: rows, winners }, null, 2)
      : `分区,小组,签位,作品,角色,种子,晋级来源\n${rows.map((r) => [r.quarter,r.group,r.slot,r.work,r.name,r.seed,r.source].map((v) => `"${String(v).replaceAll('"','""')}"`).join(",")).join("\n")}`;
    const blob = new Blob([content], { type: format === "json" ? "application/json" : "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = `tinghao-draw-${seedText}.${format}`; link.click();
    URL.revokeObjectURL(url);
  };

  const createShareImage = async (mode: ShareMode) => {
    const capture = bracketCaptureRef.current;
    if (!plan || revealed < 48 || !capture) return;
    setShareBusy(mode);
    const preservedWinners = winners;
    try {
      if (mode === "draw" && Object.keys(winners).length) {
        setWinners({});
        await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      }
      capture.classList.add("is-capturing");
      capture.dataset.shareMode = mode;
      await Promise.all(Array.from(capture.querySelectorAll("img")).map((image) => image.complete ? image.decode().catch(() => undefined) : new Promise<void>((resolve) => {
        image.addEventListener("load", () => resolve(), { once: true });
        image.addEventListener("error", () => resolve(), { once: true });
      })));
      const blob = await toBlob(capture, {
        backgroundColor: "#eef1f7",
        cacheBust: true,
        pixelRatio: 2,
        width: 1410,
        height: capture.scrollHeight,
        style: { width: "1410px" },
      });
      if (!blob) throw new Error("图片编码失败");
      const file = new File([blob], `tinghao-${mode}-${seedText}.png`, { type: "image/png" });
      setSharePreview({ url: URL.createObjectURL(blob), file, mode });
    } catch (error) {
      setImportNotice({ kind: "error", text: error instanceof Error ? error.message : "分享图片生成失败" });
    } finally {
      capture.classList.remove("is-capturing");
      delete capture.dataset.shareMode;
      if (mode === "draw" && Object.keys(preservedWinners).length) setWinners(preservedWinners);
      setShareBusy(null);
    }
  };

  const downloadShareImage = () => {
    if (!sharePreview) return;
    const link = document.createElement("a");
    link.href = sharePreview.url;
    link.download = sharePreview.file.name;
    link.click();
  };

  const systemShareImage = async () => {
    if (!sharePreview || !navigator.share || !navigator.canShare?.({ files: [sharePreview.file] })) return;
    await navigator.share({ files: [sharePreview.file], title: sharePreview.mode === "prediction" ? "挺好萌淘汰赛推演预测" : "挺好萌淘汰赛签表", text: `签位生成种子：${seedText}` });
  };

  const copyShareSeed = async () => {
    await navigator.clipboard.writeText(seedText);
    setSeedCopied(true);
    window.setTimeout(() => setSeedCopied(false), 1800);
  };

  const completed = !!plan && revealed === 48;
  const chooseWinner = (key: string, id: number) => setWinners((current) => {
    const next = { ...current };
    if (current[key] === id) delete next[key];
    else next[key] = id;
    return normalizeWinners(next, plan);
  });
  const groupWinners = Array.from({ length: 16 }, (_, i) => playerFromId(winners[`g${i}`]));
  const round16Winners = Array.from({ length: 8 }, (_, i) => playerFromId(winners[`r${i}`]));
  const quarterWinners = Array.from({ length: 4 }, (_, i) => playerFromId(winners[`q${i}`]));
  const semiWinners = Array.from({ length: 2 }, (_, i) => playerFromId(winners[`s${i}`]));
  const seedGroups = plan ? plan.reduce<number[]>((acc, p, index) => {
    if (p.seed) acc[p.seed - 1] = Math.floor(index / 3);
    return acc;
  }, []) : [];
  const seedQuarterCounts = seedGroups.reduce<number[]>((counts, group) => {
    counts[Math.floor(group / 4)]++;
    return counts;
  }, [0, 0, 0, 0]);
  const checks = plan ? [
    { label: "48名选手不重不漏", okay: new Set(plan.map((p) => p.id)).size === 48 },
    { label: "八名种子首轮互不相遇", okay: new Set(seedGroups).size === 8 },
    { label: "每个1/4区最多三名种子", okay: seedQuarterCounts.every((count) => count <= 3) },
    { label: "一、二号种子分处不同1/4区", okay: Math.floor(seedGroups[0] / 4) !== Math.floor(seedGroups[1] / 4) },
  ] : [];

  return (
    <main>
      <header className="masthead">
        <a className="brand" href="#top" aria-label="返回顶部">
          <img src="/tinghao/logo26.avif" alt="第十届挺好萌"/>
        </a>
        <nav aria-label="页内导航">
          <a href="#draw">抽签台</a><a href="#bracket">签表</a><a href="#roster">名单</a><a href="#rules">规则</a>
        </nav>
        <a className="official-link" href="https://tinghao.moe/#/rule" target="_blank" rel="noreferrer">官网规则 ↗</a>
      </header>

      <section className="hero" id="top">
        <div className="hero-kicker"><span>THM · MAIN DRAW</span><i /></div>
        <div className="hero-grid">
          <div>
            <p className="eyebrow">第十届挺好萌 · 淘汰赛工具</p>
            <h1>四十八强<br/><em>淘汰赛抽签器</em></h1>
            <p className="hero-copy">八位种子落位，四大分区展开。支持完整随机、逐位揭晓与可复现签表。</p>
          </div>
          <img className="hero-logo" src="/tinghao/logo26.avif" alt="挺好萌 2026 官方视觉"/>
          <div className="hero-stats" aria-label="赛事数据">
            <div><strong>48</strong><span>淘汰赛选手</span></div>
            <div><strong>16</strong><span>首轮小组</span></div>
            <div><strong>8</strong><span>种子选手</span></div>
            <div><strong>4</strong><span>四分之一区</span></div>
          </div>
        </div>
      </section>

      <section className="workspace" id="draw">
        <div className="draw-console">
          <div className="section-heading">
            <div><span>01 / DRAW DESK</span><h2>抽签控制台</h2></div>
            <div className={`status-pill ${completed ? "done" : plan ? "active" : ""}`}><i />{completed ? "抽签完成" : plan ? `已揭晓 ${revealed} / 48` : "等待开始"}</div>
          </div>

          <div className="control-grid">
            <label className="seed-field">
              <span>签位生成种子 <small>相同文字可复现同一签表</small></span>
              <div><input value={seedText} onChange={(e) => setSeedText(e.target.value)} disabled={!!plan} suppressHydrationWarning aria-label="签位生成种子"/><button onClick={() => !plan && setSeedText(createRandomSeed())} disabled={!!plan} title="生成签位种子">↻</button></div>
            </label>
            <div className="draw-constraints"><b>当前抽签限制</b><small>八名种子不同组 · 每个1/4区最多三名 · 1、2号种子位于不同1/4区</small></div>
          </div>

          {!plan ? (
            <div className="primary-actions">
              <button className="primary" onClick={() => startDraw(false)}><span>开始逐位抽签</span><b>→</b></button>
              <button className="secondary" onClick={() => startDraw(true)}>一键生成完整签表</button>
            </div>
          ) : (
            <div className="live-actions">
              <div className="progress"><i style={{ width: `${revealed / 48 * 100}%` }}/></div>
              {revealed < 48 ? <>
                <button className="primary compact" onClick={() => setRevealed((value) => Math.min(48, value + 1))}>揭晓下一位 <b>→</b></button>
                <button className="secondary" onClick={() => setRevealed(48)}>全部揭晓</button>
              </> : <>
                <button className="primary compact" onClick={() => startDraw(true, true)}>重新抽签 <b>↻</b></button>
                <button className="secondary" onClick={copyResult}>{copied ? "已复制 ✓" : "复制结果"}</button>
              </>}
              <button className="ghost-button" onClick={reset}>重置</button>
            </div>
          )}

          <div className="import-row">
            <label className="import-button">
              <span>加载 JSON / CSV</span>
              <input type="file" accept=".json,.csv,application/json,text/csv" onChange={loadDraw}/>
            </label>
            <a className="actual-draw-download" href="/data/tinghao-main-draw-2026-actual.json" download>下载第十届实际签表 JSON</a>
            <small>JSON 可恢复签表、随机种子与赛果；CSV 恢复 48 个签位</small>
          </div>
          {importNotice && <p className={`import-notice ${importNotice.kind}`} role={importNotice.kind === "error" ? "alert" : "status"} aria-live="polite">{importNotice.kind === "success" ? "✓" : "!"} {importNotice.text}</p>}

          {plan && revealed < 48 && (
            <div className="current-ball" aria-live="polite">
              <span>{revealed === 0 ? "签池已经洗牌" : `第 ${revealed} 位已落定`}</span>
              <strong>{revealed === 0 ? "点击按钮，开始揭晓" : plan.filter((_, i) => i < revealed).at(-1)?.name}</strong>
              <small>{revealed === 0 ? "所有约束已预先校验" : plan.filter((_, i) => i < revealed).at(-1)?.work}</small>
            </div>
          )}
        </div>

        <aside className="rules-card" id="rules">
          <div className="rule-number">规则</div>
          <h3>抽签约束</h3>
          <ol>
            <li><b>种子保护与平衡</b><span>八名种子分入八个不同小组，且每个1/4区最多三名种子。</span></li>
            <li><b>立希规则</b><span>海选第一、第二分处不同1/4区，四强战前不会相遇。</span></li>
            <li><b>固定签表</b><span>48进16后不再重新抽签，胜者沿当前分区继续晋级。</span></li>
          </ol>
          <p>首轮16组，每组三人、仅第一名晋级；此后均为二选一。</p>
        </aside>
      </section>

      <section className="bracket-section" id="bracket">
        <div className="bracket-capture" ref={bracketCaptureRef}>
        <div className="capture-titlebar">
          <img src="/tinghao/logo26.avif" alt=""/>
          <div><b>第十届挺好萌 · 淘汰赛晋级推演图</b><span>相同种子可复现同一签表</span></div>
          <div className="capture-seed"><small>签位生成种子</small><code>{seedText}</code></div>
          <strong>{Object.keys(winners).length ? `推演预测 · 已选择 ${Object.keys(winners).length} 场` : "48 强正式签表"}</strong>
        </div>
        <div className="section-heading wide">
          <div><span>02 / TOURNAMENT BRACKET</span><h2>淘汰赛晋级推演图</h2></div>
          <div className="legend"><span><i className="seed-dot"/>种子</span><span><i className="rep-dot"/>复活晋级</span>{completed && <span className="interaction-hint">点击角色选择胜者</span>}</div>
        </div>

        <div className="region-key">
          {regions.map((region, index) => <span key={region}><i>0{index + 1}</i><b>{region}</b><small>{groupLetters[index * 4]}–{groupLetters[index * 4 + 3]} 组</small></span>)}
        </div>

        <div className="bracket-scroll">
          <div className="bracket-head">
            <b style={{gridColumn: 1}}>48进16</b><b style={{gridColumn: 3}}>16进8</b><b style={{gridColumn: 5}}>8进4</b><b style={{gridColumn: 7}}>半决赛</b><strong style={{gridColumn: 9}}>决赛 · 挺王</strong><b style={{gridColumn: 11}}>半决赛</b><b style={{gridColumn: 13}}>8进4</b><b style={{gridColumn: 15}}>16进8</b><b style={{gridColumn: 17}}>48进16</b>
          </div>
          <div className="bracket-board">
            {Array.from({length: 8}, (_, index) => <div key={`lg-${index}`} style={{gridColumn: 1, gridRow: index + 1}}><DrawGroup group={index} plan={plan} revealed={revealed} side="left" winnerId={winners[`g${index}`]} onWinner={(id) => chooseWinner(`g${index}`, id)}/></div>)}
            {Array.from({length: 4}, (_, index) => <div className="join-wrap" key={`lj1-${index}`} style={{gridColumn: 2, gridRow: `${index * 2 + 1} / span 2`}}><BracketConnector/></div>)}
            {Array.from({length: 4}, (_, index) => <div className="match-wrap" key={`lm1-${index}`} style={{gridColumn: 3, gridRow: `${index * 2 + 1} / span 2`}}><AdvanceMatch players={[groupWinners[index * 2], groupWinners[index * 2 + 1]]} winnerId={winners[`r${index}`]} onWinner={(id) => chooseWinner(`r${index}`, id)}/></div>)}
            {Array.from({length: 2}, (_, index) => <div className="join-wrap" key={`lj2-${index}`} style={{gridColumn: 4, gridRow: `${index * 4 + 1} / span 4`}}><BracketConnector/></div>)}
            {Array.from({length: 2}, (_, index) => <div className="match-wrap" key={`lm2-${index}`} style={{gridColumn: 5, gridRow: `${index * 4 + 1} / span 4`}}><AdvanceMatch players={[round16Winners[index * 2], round16Winners[index * 2 + 1]]} winnerId={winners[`q${index}`]} onWinner={(id) => chooseWinner(`q${index}`, id)}/></div>)}
            <div className="join-wrap" style={{gridColumn: 6, gridRow: "1 / span 8"}}><BracketConnector/></div>
            <div className="match-wrap" style={{gridColumn: 7, gridRow: "1 / span 8"}}><AdvanceMatch players={[quarterWinners[0], quarterWinners[1]]} winnerId={winners.s0} onWinner={(id) => chooseWinner("s0", id)}/></div>
            <div className="join-wrap" style={{gridColumn: 8, gridRow: "1 / span 8"}}><SingleConnector target="upper"/></div>

            <div className="final-wrap" style={{gridColumn: 9, gridRow: "1 / span 8"}}>
              <FinalStage players={[semiWinners[0], semiWinners[1]]} winnerId={winners.f} onWinner={(id) => chooseWinner("f", id)}/>
            </div>

            <div className="join-wrap" style={{gridColumn: 10, gridRow: "1 / span 8"}}><SingleConnector reverse target="lower"/></div>
            <div className="match-wrap" style={{gridColumn: 11, gridRow: "1 / span 8"}}><AdvanceMatch side="right" players={[quarterWinners[2], quarterWinners[3]]} winnerId={winners.s1} onWinner={(id) => chooseWinner("s1", id)}/></div>
            <div className="join-wrap" style={{gridColumn: 12, gridRow: "1 / span 8"}}><BracketConnector reverse/></div>
            {Array.from({length: 2}, (_, index) => <div className="match-wrap" key={`rm2-${index}`} style={{gridColumn: 13, gridRow: `${index * 4 + 1} / span 4`}}><AdvanceMatch side="right" players={[round16Winners[index * 2 + 4], round16Winners[index * 2 + 5]]} winnerId={winners[`q${index + 2}`]} onWinner={(id) => chooseWinner(`q${index + 2}`, id)}/></div>)}
            {Array.from({length: 2}, (_, index) => <div className="join-wrap" key={`rj2-${index}`} style={{gridColumn: 14, gridRow: `${index * 4 + 1} / span 4`}}><BracketConnector reverse/></div>)}
            {Array.from({length: 4}, (_, index) => <div className="match-wrap" key={`rm1-${index}`} style={{gridColumn: 15, gridRow: `${index * 2 + 1} / span 2`}}><AdvanceMatch side="right" players={[groupWinners[index * 2 + 8], groupWinners[index * 2 + 9]]} winnerId={winners[`r${index + 4}`]} onWinner={(id) => chooseWinner(`r${index + 4}`, id)}/></div>)}
            {Array.from({length: 4}, (_, index) => <div className="join-wrap" key={`rj1-${index}`} style={{gridColumn: 16, gridRow: `${index * 2 + 1} / span 2`}}><BracketConnector reverse/></div>)}
            {Array.from({length: 8}, (_, index) => <div key={`rg-${index}`} style={{gridColumn: 17, gridRow: index + 1}}><DrawGroup group={index + 8} plan={plan} revealed={revealed} side="right" winnerId={winners[`g${index + 8}`]} onWinner={(id) => chooseWinner(`g${index + 8}`, id)}/></div>)}
          </div>
        </div>
        </div>

        {completed && <div className="result-bar">
          <div className="checks">{checks.map((check) => <span key={check.label} className={check.okay ? "okay" : "bad"}>{check.okay ? "✓" : "!"} {check.label}</span>)}<span>{Object.keys(winners).length} 场结果已选择</span></div>
          <div>{Object.keys(winners).length > 0 && <button onClick={() => setWinners({})}>清空赛果</button>}<button onClick={copyResult}>{copied ? "已复制" : "复制文本"}</button><button onClick={() => createShareImage("draw")} disabled={!!shareBusy}>{shareBusy === "draw" ? "生成中…" : "签表分享图"}</button><button onClick={() => createShareImage("prediction")} disabled={!!shareBusy}>{shareBusy === "prediction" ? "生成中…" : "推演分享图"}</button><button onClick={() => download("csv")}>导出 CSV</button><button onClick={() => download("json")}>导出 JSON</button><button onClick={() => window.print()}>打印签表</button></div>
        </div>}
      </section>

      {sharePreview && <div className="share-overlay" role="dialog" aria-modal="true" aria-label="分享图片预览">
        <div className="share-dialog">
          <div className="share-dialog-head"><div><span>SHARE IMAGE</span><h3>{sharePreview.mode === "prediction" ? "推演预测分享图" : "签表分享图"}</h3><small>图片已包含签位生成种子，相同种子可复现同一签表</small></div><button onClick={() => setSharePreview(null)} aria-label="关闭预览">×</button></div>
          <img src={sharePreview.url} alt={sharePreview.mode === "prediction" ? "推演预测分享图预览" : "签表分享图预览"}/>
          <div className="share-seed-row"><span>签位生成种子</span><code>{seedText}</code><button onClick={copyShareSeed}>{seedCopied ? "已复制 ✓" : "复制种子"}</button></div>
          <div className="share-dialog-actions"><button className="primary" onClick={downloadShareImage}>下载 PNG <b>↓</b></button>{typeof navigator !== "undefined" && navigator.share && navigator.canShare?.({ files: [sharePreview.file] }) && <button className="secondary" onClick={systemShareImage}>系统分享</button>}</div>
        </div>
      </div>}

      {proofOpen && <div className="proof-overlay" role="dialog" aria-modal="true" aria-labelledby="proof-title">
        <article className="proof-card">
          <header className="proof-head">
            <div><span>ALGORITHM NOTE · 可截图说明卡</span><h2 id="proof-title">抽签算法与概率证明</h2><p>第十届挺好萌淘汰赛抽签器 · 当前实现说明</p></div>
            <button onClick={() => setProofOpen(false)} aria-label="关闭算法说明">×</button>
          </header>

          <div className="proof-verdict">
            <b>结论先行</b>
            <strong>理想随机模型下，所有合法签表等概率；当前32位可复现实现是大样本近似随机，但不覆盖全部合法签表。</strong>
            <p>因此它适合抽签模拟与娱乐使用，不应表述为“对全部合法组合的审计级严格均匀抽样”。</p>
          </div>

          <div className="proof-grid">
            <section>
              <span>01</span><h3>算法执行过程</h3>
              <ol>
                <li>将文字种子映射成32位整数，初始化可复现随机序列。</li>
                <li>把八名编号种子分配到八个不同小组。</li>
                <li>拒绝“1、2号同一1/4区”或“某区超过三名种子”的候选。</li>
                <li>每名种子在组三个签位中随机选择一个。</li>
                <li>将其余40名选手洗牌后填入40个空位。</li>
                <li>完整签表立即固定；逐位模式随后只按顺序公开，不再重新随机。</li>
              </ol>
            </section>

            <section>
              <span>02</span><h3>合法种子落组数量</h3>
              <p>每区有4组且至多容纳3名种子。先计入全部符合容量限制的落组，再扣除1、2号种子位于同一区的方案：</p>
              <code>A<sub>all</sub> = 8! [x⁸](1+4x+6x²+4x³)⁴<br/>= 439,326,720</code>
              <code>A<sub>bad</sub> = 4·P(4,2)·6! [x⁶](1+2x)(1+4x+6x²+4x³)³<br/>= 82,114,560</code>
              <code>A = A<sub>all</sub> − A<sub>bad</sub> = 357,212,160</code>
            </section>

            <section>
              <span>03</span><h3>理想模型下的等概率证明</h3>
              <p>若每次整数抽取严格无偏，Fisher–Yates 使种子落组候选等概率。拒绝采样只删除非法候选，所以在“候选合法”这一条件下，每种合法落组概率均为：</p>
              <code>P(落组) = 1 / A</code>
              <p>八名种子是有身份的编号角色，组三个签位也是有编号的不同位置。固定落组后，每名种子独立拥有3种组内位置，因此这里计算的是签位排列：</p>
              <code>3 × 3 × … × 3 = 3⁸ = 6561</code>
              <p>所以八个种子的指定组内排列概率为 <b>1/3⁸</b>；剩余40名有身份选手在40个有编号空位中的指定排列概率为 <b>1/40!</b>。故任意合法完整签表 ω：</p>
              <code>P(ω) = 1 / (A·3⁸·40!) = 1 / |Ω|</code>
              <p>这证明了理想随机模型中的合法签表等概率。</p>
            </section>

            <section>
              <span>04</span><h3>当前32位实现的严格边界</h3>
              <p>文字种子最终被压缩为32位状态，因此程序最多只有：</p>
              <code>2³² = 4,294,967,296 个初始状态</code>
              <p>而完整合法签表总数为：</p>
              <code>|Ω| = 357,212,160·3⁸·40!<br/>≈ 1.91 × 10⁶⁰</code>
              <p>因为 <b>|Ω| ≫ 2³²</b>，绝大多数合法签表不可达；且357,212,160不能整除2³²，严格均匀分配也不可能成立。</p>
            </section>

            <section className="proof-wide">
              <span>05</span><h3>“预先生成，再逐位揭晓”为何等价</h3>
              <p>当前网站在点击“开始抽签”时，根据页面上显示的随机种子一次性生成并固定完整签表 <b>X=(X₁,…,X₄₈)</b>。之后点击“揭晓下一位”只公开下一个既定签位，不会重抽，也不会修改尚未公开的结果。</p>
              <p>这与按照相同条件概率逐个抽取在联合分布上完全等价，因为概率链式法则给出：</p>
              <code>P(X₁,…,X₄₈) = P(X₁) · ∏ᵢ₌₂⁴⁸ P(Xᵢ | X₁,…,Xᵢ₋₁)</code>
              <p>左侧表示“一次生成完整签表”的概率，右侧表示“根据之前结果逐位条件抽取”的概率。两者对任意指定完整签表都相同，因此预生成只改变揭晓方式，不改变抽签分布。随机种子在开始后锁定，相同种子可复现同一完整签表。</p>
            </section>
          </div>

          <div className="proof-foot">
            <b>可以准确对外表述：</b>
            <p>“本工具从约42.95亿个可复现随机状态中生成符合全部约束的签表；分布在普通使用中近似随机，不承诺覆盖全部合法组合或提供审计级严格均匀性。”</p>
            <small>非官方工具 · 随机结果仅用于模拟 · 正式签表以赛事运营公布为准</small>
          </div>
        </article>
      </div>}

      <section className="roster-section" id="roster">
        <div className="section-heading wide">
          <div><span>03 / PARTICIPANTS</span><h2>四十八强名单</h2></div>
          <p>已按运营公布的砍票后正式名单校正</p>
        </div>
        <div className="roster-tools">
          <div className="tabs">
            {(["all","seed","direct","repechage"] as const).map((value) => <button key={value} className={filter === value ? "active" : ""} onClick={() => setFilter(value)}>{value === "all" ? "全部 48" : value === "seed" ? "种子 8" : value === "direct" ? "海选直通 32" : "复活晋级 8"}</button>)}
          </div>
          <label className="search"><span>⌕</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="搜索作品或角色…" aria-label="搜索选手"/></label>
        </div>
        <div className="roster-list">
          {visibleParticipants.map((p) => <article key={p.id}>
            <span className="rank">{String(p.id).padStart(2,"0")}</span>
            <img className="roster-avatar" src={p.avatar} alt={`${p.name}头像`}/>
            <div><b>{p.name}</b><small>{p.work}</small></div>
            <div className="vote"><strong>{p.vote}</strong><small>有效票 · {p.rate}%</small></div>
            <span className={`tag ${p.source}`}>{p.seed ? `${p.seed}号种子` : p.source === "repechage" ? "复活晋级" : "海选直通"}</span>
          </article>)}
        </div>
      </section>

      <footer>
        <div><img className="footer-logo" src="/tinghao/logo26.avif" alt="挺好萌 2026"/><p><b>第十届挺好萌淘汰赛抽签器</b><small>非官方工具 · 数据、规则与视觉素材来源于 tinghao.moe</small></p></div>
        <div className="footer-note"><p>随机结果仅用于模拟，正式签表以赛事运营公布为准。</p><button onClick={() => setProofOpen(true)}>算法与概率说明</button><a href="https://github.com/haoxiongliu/tinghao-main-draw" target="_blank" rel="noreferrer">GitHub 源码 ↗</a></div>
      </footer>
    </main>
  );
}
