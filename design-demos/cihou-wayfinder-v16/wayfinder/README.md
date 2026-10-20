# Wayfinder 本地复刻与可复用模板

这是原站公开浏览器客户端的本地化版本：保留实际使用的 Three.js / WebGL 场景、Svelte 界面、角色动画、森林 / 草地 / 苔原逻辑及本地美术和音频素材，增加可配置 HTML 外壳和可视化设置页。不是独立重写的通用游戏引擎，也不是 iframe 嵌入原站。

## 启动

macOS 可双击 `启动.command`（需要系统已安装 Python 3）。或在本文件夹运行：

```sh
python3 serve.py
```

打开终端打印的地址，默认 `http://127.0.0.1:8777/`。设置页是同一地址下的 `customize.html`。按 Ctrl+C 停止服务。

不能通过双击 `index.html` 的 file:// 协议运行：浏览器对模型、精灵表和音频加载有来源限制。本地服务器不需要互联网；不需要 npm、打包构建或远端 CDN。服务器仅监听本机。

## 每次复用

1. 复制整个 `wayfinder-template` 文件夹。
2. 修改 `config.js`，或在 `customize.html` 填写内容后导出配置并替换同名文件。
3. 重新加载页面即可。

支持网页标题、场景标题、副标题、按钮文案、品牌文字、导航显隐、默认静音、生成种子、节能画质和素材路径替换。`copy` 的可用键见 `reference/recovered-source/util/locale.js`。

默认保留原作标题贴图，视觉最接近原作。自定义 `title` 使用可编辑文字；如果需要与原作手绘字完全一致，应在 `assets` 配置中提供自己的标题贴图。中文使用系统字体回退，原字体不包含中文字形。

```js
copy: {
  introBlurbOne: "一次穿越自然的旅程",
  introBlurbTwo: "在风中发现你的故事",
  startButton: "开始探索",
  aboutButton: "关于"
}
```

所有正式配置保存在文件中。可视化设置页仅把草稿存在浏览器 localStorage，通过 `?draft=1` 预览，不会修改默认页面。

## 素材替换

`assets/` 中是带原始哈希名称的本地素材。在 `config.js` 的 `assets` 中把原资源路径映射到新文件，例如：

```js
assets: {
  "/music1.21713a23.mp3": "./custom/my-music.mp3",
  "/music1.d063251c.ogg": "./custom/my-music.ogg",
  "/title2_en.72341f63.png": "./custom/my-title.png"
}
```

同一音频可能有 MP3 / OGG 两个版本，替换时应同时提供。原引擎会根据浏览器能力选择。普通图片可以独立替换；图集、模型、动画帧数据存在相互约束，不能任意换一张图就改变整个世界。全新场景和任意可点击业务节点仍需修改运行时代码，当前配置接口不包含这些能力。

## 文件结构

- `index.html`：可部署的 HTML 入口。
- `config.js`：每个项目的配置。
- `customize.html`：本地可视化设置和配置导出。
- `template.js` / `template.css`：新加的配置接口和导航层。
- `runtime/`：经过路径本地化和配置补丁的原站浏览器客户端。
- `assets/`：本地模型、纹理、字体、精灵表、音频、视频。
- `reference/recovered-source/`：从公开 source map 恢复的应用模块，供继续研究；其中 Svelte 文件已经过原站编译处理，不是完整可重新构建的上游工程。
- `reference/patches.json`：本地化改动及 REA 分析引用。
- `serve.py`：支持视频 Range 请求的本地服务。

部署时上传本文件夹即可，支持放在域名根路径或子目录。`reference/`、`README.md`、`serve.py`、`启动.command` 可以不上传。

## 与原站的差别

- 保留原作实际客户端和素材；并非重新手写仿制的美术。
- 顶部 NFB 远程导航改为本地实现；网格按钮进入模板设置页，信息按钮打开本地说明。
- 页面未接入原站 Facebook、DoubleClick 和远程 NFB 统计导航。
- 世界默认具有随机性，因此每次加载的具体物体位置不同。`engine.deterministic=true` 使用原引擎固定种子模式。
- 目前面向电脑浏览器测试，完整游玩到结局与所有设备组合不在本次验证范围。

## 来源

原作品：https://wayfinder.nfb.ca/

原作由 Matt DesLauriers 与 National Film Board of Canada 制作；插画 Tiffany Beucher，动画 / 三维 Guillaume Le Roux，其他作者见原作 credits。原站客户端及素材的本地副本不改变其原有权利归属，本模板不宣称取得其商业再授权。

本次新增 HTML 配置层、设置页与本地服务器可独立修改。保留本段来源说明，便于区分原作和模板新增部分。
