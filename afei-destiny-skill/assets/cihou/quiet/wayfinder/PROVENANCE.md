# Wayfinder 运行时与素材来源

此目录包含 [Wayfinder](https://wayfinder.nfb.ca/) 公开浏览器客户端的本地副本，
用于用户明确要求的原版视觉与交互复用。它不是此后独立创作的美术或从零重写的引擎。

原作由 Matt DesLauriers 与 National Film Board of Canada 制作，插画 Tiffany Beucher，
动画与三维 Guillaume Le Roux；完整参与者见原作 credits。客户端、字体、插画、模型、
视频、音频及其他素材保留各自权利归属；本地副本和配置补丁不构成商业再授权的声明。

## 授权状态

2026-10-20 的官方来源核对中，未找到完整客户端及素材的显式再分发许可。
[NFB 使用条款](https://help.nfb.ca/terms/)（更新于 2026-05-11）对超出列明用途的复制、
修改、上传与再分发要求书面许可。主站可公开访问、来源哈希可核验和保留署名，
均不等于获得完整打包发布的许可。项目根目录 MIT 不覆盖这些第三方内容。
授权状态与代码核验是两件事；后续取得许可时，应记录许可范围与可公开的凭据。

## 版本与核验

2026-10-19 的来源脚本为
[src.effdb523.js](https://wayfinder.nfb.ca/src.effdb523.js)，1,754,005 bytes，SHA-256：

```text
b6fbdca8d55595f538e4f06f498e01b464f7098794678650c93adca3b2c17b85
```

[runtime/wayfinder.js](runtime/wayfinder.js) 是经过本地资源 resolver、配置和统计地址补丁的
运行时基线，1,767,992 bytes，SHA-256：

```text
7c2652c135afd6a294b0429f56668d199854cba326c518bd314c101ef75f130b
```

[asset-manifest.json](asset-manifest.json) 记录 444 项素材的原路径、大小与 SHA-256，
合计 49,137,963 bytes。逐项核验零缺失、零不符；原 bundle 的 439 项独立资源路径
均包含在内，另外 5 项为本地 CSS 字体。镜像与公开版本均为相同的 807 个 Parcel 模块；
逆向撤销本地化补丁后与原脚本完全一致，仅省去 sourceMappingURL 注释。

公开发行脚本的 REA 静态分析 parent Evidence：
`ev_ef801ddf4d1ca2dda7b1a378773406658d4e6cde5f055cc0c22d27fae2dcdcfc`。
相关模块的有界分析 parent Evidence：
`ev_160c05c4343f2d7608d526d6146967cc88752d8812a574320a20cf24170c782e`。
它们是静态证据，不代表完整浏览器行为验证。

## 此后适配边界

[patches.json](patches.json) 保留早期镜像的补丁摘要；另有两个已核验的地址替换：
DoubleClick pixel 改为 `data:,`，NFB header script 改为 `data:text/javascript,`。
原 NFB 导航默认关闭。最终报告的适配层另负责禁用 analytics 导出、把素材内联为本地 Blob URL，
以及将当前咨询的文案、视角和选择接入原版世界。

运行需要原 runtime、对应 CSS 和 manifest 中的素材；两份 GLTF、四份 GLB 已内嵌其依赖，
不需要额外外部 bin。恢复源码、source map、研究记录与开发服务器不属于报告运行依赖。
报告适配层与当前咨询文字的来源、校验和登记仍遵循技能的报告协议。

V20 的 [choice-effects.js](choice-effects.js) 使用原 Parcel 模块的 `Line3D`、
光点材质与纹理、披风效果、母树帧动画、纸片和花草系统；[ui.js](ui.js)
使用原 `HaikuCard` 组件。新增的是一次选择后的路径、有限播放、文字绑定和清理逻辑。
三个选项共享“点选→自动展开→停下留卡”，无需再次点击或长按。
原版母树恢复动画会舒展枝条；草地场景的终态仍是裸枝，不等同于长出绿叶树冠。
