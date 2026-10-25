# 数字积木

在线试玩：https://liuzhuoling2011.github.io/number-blocks/

给小朋友的数字启蒙小游戏。第一集约一分钟：认识红色积木「一」，找出三样「只有一个」的东西，再把它拖到发光的圈圈上。

美术是原创的软塑料积木，不是任何播出节目的素材。

## 玩法

1. 打开页面，点 **开始**。标题卡还是「第一集 · 一」。
2. 「一」说「我是一！」。等两三秒，或者点一下它。
3. 点花、蜜蜂、太阳。每点中一个，身上会出现「1」，并提示「一朵花」「一只蜜蜂」或「一个太阳」。进度从 0/3 到 3/3。三个都点到，才会出现「都是一个！」，然后才能拖积木。
4. 按住红色的「一」，拖到右边发光的圈圈里，松手。
5. 放对了会吸过去，跳一下，说「一个奇妙的世界，还有一个我！」，然后出现「太棒了！」。
6. 放偏了会弹回原处，并提示「再拖到发光的圈圈里」。没有倒计时，也没有失败。
7. **再玩一次** 回到「我是一！」，进度清零，要重新找、再拖一次。

手机和电脑都可以玩。点右上角可以关掉声音。

## 已知限制

花、蜜蜂、太阳这一轮是程序化的软塑料占位，方便先把这一关玩厚。定稿模型会是 `flower.glb`、`bee.glb`、`sun.glb`，还没放进 `public/models/`。`one.glb`（One v9）和 `pad.glb`（Pad v5）仍是定稿，没有换掉。

## 本地运行

```bash
npm install
npm run dev
```

浏览器打开 http://127.0.0.1:4731/number-blocks/

生产构建：

```bash
npm run build
npm run preview
```

Vite `base` 为 `/number-blocks/`。

这个仓库的 GitHub Pages 从 **`main` 分支根目录**发布（没有 `gh-pages` 分支）。`npm run build` 会把构建结果同步到仓库根目录的 `pages-entry.js` 和 `assets/`，合并到 `main` 后，上面的网址就是这版重制。`.github/workflows/deploy.yml` 会在推送到 `main` 时再用 GitHub Actions 部署 `dist`；Pages 来源改成 GitHub Actions 之后，以该工作流为准。

## 目录

- `src/levels/level01/` — 第一集（标题 → 见面 → 寻找 → 回家 → 通关）
- `src/levels/index.ts` — 以后加关卡时从这里注册
- `public/models/` — `one.glb`（One v9）、`pad.glb`（Pad v5）
- `public/previews/` — `one-v9.png`、`pad-v5.png`
- `docs/ep01-one-design-v2.md` — 第一集加厚策划（当前玩法）
- `docs/ep01-one-design.md` — 第一集薄版策划
- `docs/style-guide-v0.1.md` — 造型规范

---

# Number Blocks

Play it: https://liuzhuoling2011.github.io/number-blocks/

A short counting toy for young children. Episode One takes about a minute: meet the red block called One, tap three singular things, then drag One onto the glowing pad.

The models are original soft-plastic blocks. They are not artwork from any broadcast show.

## How to play

1. Open the page and press **开始** (Start). The title card is unchanged.
2. One says 「我是一！」. Wait two or three seconds, or tap One.
3. Tap the flower, the bee, and the sun. Each tap shows a 「1」 badge and a short line (一朵花 / 一只蜜蜂 / 一个太阳). The counter runs from 0/3 to 3/3. After the third, 「都是一个！」 plays, and only then can One be dragged.
4. Press and drag the red One onto the glowing ring, then let go.
5. A good drop snaps into place, cheers 「一个奇妙的世界，还有一个我！」, and shows the clear card.
6. A miss hops back home and says 「再拖到发光的圈圈里」. There is no timer and no fail state.
7. **再玩一次** (Play again) returns to the hello, clears the counter, and requires the find and the drop again.

Mouse and touch both work. The button at the top right mutes the sounds.

## Known limits

The flower, bee, and sun are procedural soft-plastic stand-ins for this pass. Final models would be `flower.glb`, `bee.glb`, and `sun.glb`; they are not in `public/models/` yet. `one.glb` (One v9) and `pad.glb` (Pad v5) stay as the approved art.

## Run locally

```bash
npm install
npm run dev
```

Then open http://127.0.0.1:4731/number-blocks/

```bash
npm run build
npm run preview
```

Vite `base` is `/number-blocks/`.

GitHub Pages for this repo publishes the **root of `main`** (there is no `gh-pages` branch). `npm run build` syncs the playable build to `pages-entry.js` and `assets/` in the repo root, so a merge to `main` is what the live URL serves. `.github/workflows/deploy.yml` also deploys `dist` with GitHub Actions on each push to `main`; that workflow is the publisher once the Pages source is set to GitHub Actions.

## Layout

- `src/levels/level01/` — episode one (`TITLE → MEET → FIND → HOME → CLEAR`)
- `src/levels/index.ts` — where later episodes get registered
- `public/models/` — `one.glb` (One v9) and `pad.glb` (Pad v5)
- `public/previews/` — `one-v9.png` and `pad-v5.png`
- `docs/ep01-one-design-v2.md` — thickened episode design (current play)
- `docs/` — also the thin v1 design and the style guide
