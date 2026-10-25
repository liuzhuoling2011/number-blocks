# 数字积木

在线试玩：https://liuzhuoling2011.github.io/number-blocks/

给小朋友的数字启蒙小游戏。第一集大约 30 秒可以玩完：认识红色积木「一」，把它拖到发光的圈圈上。

美术是原创的软塑料积木，不是任何播出节目的素材。

## 玩法

1. 打开页面，点 **开始**。
2. 按住红色的「一」，拖到右边发光的圈圈里，松手。
3. 放对了会吸过去，跳一下，然后出现「太棒了！」。
4. 放偏了会弹回原处，可以一直试。没有倒计时，也没有失败。

手机和电脑都可以玩。点右上角可以关掉声音。

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

- `src/levels/level01/` — 第一集（标题 → 游玩 → 通关）
- `src/levels/index.ts` — 以后加关卡时从这里注册
- `public/models/` — `one.glb`（One v9）、`pad.glb`（Pad v5）
- `public/previews/` — `one-v9.png`、`pad-v5.png`
- `docs/ep01-one-design.md` — 第一集策划
- `docs/style-guide-v0.1.md` — 造型规范

---

# Number Blocks

Play it: https://liuzhuoling2011.github.io/number-blocks/

A short counting toy for young children. Episode One takes about half a minute: meet the red block called One, and drag it onto the glowing pad.

The models are original soft-plastic blocks. They are not artwork from any broadcast show.

## How to play

1. Open the page and press **开始** (Start).
2. Press and drag the red One onto the glowing ring, then let go.
3. A good drop snaps into place, celebrates, and shows the clear card.
4. A miss hops back home. There is no timer and no fail state.

Mouse and touch both work. The button at the top right mutes the sounds.

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

- `src/levels/level01/` — episode one (`TITLE → PLAY → CLEAR`)
- `src/levels/index.ts` — where later episodes get registered
- `public/models/` — `one.glb` (One v9) and `pad.glb` (Pad v5)
- `public/previews/` — `one-v9.png` and `pad-v5.png`
- `docs/` — episode design and the style guide
