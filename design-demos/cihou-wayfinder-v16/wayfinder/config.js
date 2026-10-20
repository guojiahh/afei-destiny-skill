/**
 * 每次复用先复制整个文件夹，再修改这个文件。无需 npm、无需构建。
 * 默认空值保留原作画面。浏览器通过本地 HTTP 服务打开 index.html。
 */
window.WAYFINDER_TEMPLATE = {
  pageTitle: "Wayfinder",
  description: "A game of poetry and animated exploration across the land.",
  language: "en", // 原引擎支持 en / fr；中文文案可通过 copy 覆盖。
  title: "", // 留空使用原作标题贴图；填文字则使用可编辑标题。
  header: true,
  headerLabel: "", // 留空显示原作 NFB / ONF 标识。
  muted: false,
  haikusPerBiome: 2,
  engine: {
    deterministic: false, // true 固定程序生成种子，适合反复对照预览。
    lowbattery: false // true 将像素密度限制为 1，降低显卡负担。
  },
  copy: {
    // introBlurbOne: "一次穿越自然的旅程",
    // introBlurbTwo: "在风中发现你的故事",
    // startButton: "开始探索",
    // aboutButton: "关于",
    // skipButton: "跳过",
    // introPresents: "你的品牌 · 呈现",
    // tutorialTapHold: "按住鼠标，在世界中探索",
    // wayfinderStrongText: "你的项目名",
    // wayfinderTextParagraph: "在这里填写你的项目介绍。",
  },
  assets: {
    // 原资源路径 -> 新素材路径；素材尺寸和格式应与原资源一致。
    // "/music1.21713a23.mp3": "./custom/my-music.mp3",
    // "/title2_en.72341f63.png": "./custom/my-title.png",
  },
};
