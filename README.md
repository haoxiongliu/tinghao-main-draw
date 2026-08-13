# 挺好萌正赛抽签器

第十届挺好萌 48 强正赛抽签与晋级推演工具。

在线使用：[tinghao-main-draw-2026.vivacem22.chatgpt.site](https://tinghao-main-draw-2026.vivacem22.chatgpt.site/)

## 功能

- 依据当前正赛规则生成可复现签表
- 八名种子分处不同小组，每个 1/4 区最多三名种子
- 1、2 号种子分处不同 1/4 区
- 支持逐位揭晓和一键生成
- 支持人工选择各轮赛果并推演挺王
- 支持 JSON / CSV 导入导出
- 支持生成签表与推演 PNG 分享图
- 内置算法与概率说明卡

## 本地运行

要求 Node.js `>=22.13.0`。

```bash
npm install
npm run dev
```

构建和测试：

```bash
npm run build
npm run lint
node --test tests/rendered-html.test.mjs
```

## 数据与素材

48 强名单、票数与晋级方式已按运营公布的修正海选结果整理。赛事数据、规则及视觉素材来源于 [tinghao.moe](https://tinghao.moe/)。

本项目是非官方工具，随机结果仅用于模拟，正式签表以赛事运营公布为准。

## 技术说明

项目使用 React、TypeScript、vinext 和 Cloudflare Workers 兼容构建。抽签结果由文字种子确定，相同种子可复现同一完整签表；逐位模式仅依次公开已经固定的结果。
