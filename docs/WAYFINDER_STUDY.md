# Wayfinder 实现研究与 V15 取舍

研究日期：2026-10-19。目标为 [Wayfinder](https://wayfinder.nfb.ca/)，使用
[reverse-engineer-anything](https://github.com/morluto/rea) 对公开发行脚本作静态分析。
本文件记录可复核的实现机制与本项目的设计决定；原站代码、图片、视频未引入技能包。

## 来源与证据边界

本轮重新读取的首页引用 [src.effdb523.js](https://wayfinder.nfb.ca/src.effdb523.js)，
脚本为 1,754,005 bytes，SHA-256：

```text
b6fbdca8d55595f538e4f06f498e01b464f7098794678650c93adca3b2c17b85
```

REA 原包分析 parent Evidence 为
`ev_ef801ddf4d1ca2dda7b1a378773406658d4e6cde5f055cc0c22d27fae2dcdcfc`；
原包解析成功，语义分析因工作进程的 1 GB heap 上限而不完整。随后按 Parcel 模块边界
抽取 11 个相关模块，65,668 bytes，全部解析成功，parent Evidence 为
`ev_160c05c4343f2d7608d526d6146967cc88752d8812a574320a20cf24170c782e`。
这次抽取的文件清单覆盖完整，跨模块动态调用和值传播仍有未知项，不能将其称为完整运行验证。
UserMoveSystem 的模块 Evidence 为
`ev_09df28fb7292770bda7ce5558774ee8b5b1458f420c313ee3db4ebb4033c7811`。

公开脚本、原始摘录映射与完整 REA 导出保存在本轮临时目录
`/private/tmp/cihou-wayfinder-20261019/`；临时文件不属于仓库交付，也不保证长期保留。
下表的定位为 Parcel 模块 ID 及原 bundle 中模块正文的零基 UTF-8 字节偏移，
可对照上述 hash 的脚本重新检查。

历史现场记录见 [benchmark-interaction.txt](../design-demos/cihou-reference-study/reviews/benchmark-interaction.txt)：
其操作者曾完成森林、草地、雪地、六首诗与回树结尾。本轮未重新运行原站，
因此该记录只支持已记录的视觉流程，不能证明本轮音效、帧率或所有设备表现。

## 已观察实现与 V15 对应决定

| 原站静态观察 | 源码定位 | V15 的对应决定 |
|---|---|---|
| Three.js r118 绘制世界，Svelte 负责界面；实体、标签与系统分工。 | `N5rp` / `i35p` | 延续现有 Three.js 场景与独立报告控制器；个人文案从报告数据进入。 |
| 指针坐标转 NDC，Raycaster 与地面求交；按住向命中点移动，速度与转向经过阻尼。 | `OAsz`，1067036 | 按用户要求改为左右方向驱动环路，中心停下；提供触摸、键盘与直接阶段导航。这是本项目的新交互。 |
| 相机跟随角色目标，固定倾斜方向、低 FOV、距离阻尼；目标聚焦可作 2 秒缓动。 | `mMRI`，1235893 | 采用平滑跟随与分层景深，让人物、道路和风景构成同一空间。 |
| 世界 x/z 被限制在 ±243.2；环境顺序是 forest、grasslands、tundra。 | `OAsz` / `S3Ot`，1540419 | 环与重复路径是此后的语义，不把原站称为无限或莫比乌斯世界。 |
| 完成诗作后引导回中心树，渐变 solved、聚焦镜头，再触发换环境。 | `PA4C` / `S3Ot` | 三视角分别表达过去的适应、当前循环与更多可能；阅读不以完成漫游为前提。 |
| 换场有预渲染叶片视频；Overlay 开始后 1250 ms 才允许替换环境。 | `HRhJ`，972772；`cFDn`，963001 | 借用“遮住时换场”的节奏，用本项目自己的过渡与资产，不复制原视频。 |
| TextHint 有位置、延时与时长；文字以 DOM 投影到三维坐标，1.5 秒浮起、2 秒淡入。 | `UyFp`，776027；`YZbv`，771199 | 关键文案保留为可访问的 HTML，每次少量出现，并留阅读时间；长解释进入九章正文。 |
| 一部分景物是面向相机的 RGBA 贴图平面；也有 glTF、sprite sheet 与程序地面。 | `BAw8`，1217033 | 原创绘画资产与立体道路配合，统一人物、地表与植物的画风。 |
| 后处理使用噪声、轻微色差、暗角、按环境选择 LUT，条件允许时使用 bloom。 | `sAA7`；`QoXi`，1075826 | 用低饱和色域、纸纹、薄雾与场景调色建立统一画面；强度需由实际可读性决定。 |

三种走法先展示各自条件和行动文字，只有用户明确选择“走这一步”才切换路线。
这种对照是理解更多选择的方式，不把一次交互表现成问题已经解决。
求职示例与个人报告保持隔离；个人文字仍须来自当前咨询的已登记来源。

## 未验证与验证分工

- 原站的真实音轨、连续帧率、手机性能、所有开场和结尾分支未在本轮运行验证。
- 静态代码只能说明绘制方法，无法确定插画的创作软件、完整制作流程或每项素材来源。
- V15 控制器行为由 [test_exploration_controller.py](../afei-destiny-skill/scripts/test_exploration_controller.py)
  用合成数据、mock DOM 和真实控制器脚本验证；它不替代浏览器中的构图、步态、遮挡与性能检查。
- 当前产品边界和完整报告交付约定仍见 [CIHOU_HANDOFF.md](CIHOU_HANDOFF.md)
  与 [HTML 报告协议](../afei-destiny-skill/references/html-report.md)。

## V16：直接复用原运行时与素材的后续核验

后续用户将原版画风的一致性设为首要要求，明确选择直接逆向复刻。上文是 V15 首轮研究的
当时边界；V16 改为复用本机已有的公开客户端镜像。原运行时与素材已进入对应本地研发目录
及技能资源，原作品归属见技能内 [PROVENANCE.md](../afei-destiny-skill/assets/cihou/quiet/wayfinder/PROVENANCE.md)。
V15 的实现观察不因这次产品取舍而改变；“只做原创近似”的决定由 V16 直接复用方案替代。

2026-10-19 对复制后的镜像重新核验：444 项素材共 49,137,963 bytes，全部与既有
asset manifest 的大小、SHA-256 相同；本轮独立取得的 10 项地面、LUT、atlas 与 sheet
也全部一致。原 bundle 的 439 个独立资源路径均已覆盖，另外 5 项是 CSS 字体。
镜像 bundle 的 807 个 Parcel 模块 ID 与本轮公开版本完全相同；逆向撤销资源 resolver、
query 默认值、诗作数量、locale 和统计地址补丁后，与上述公开脚本完全相同，
仅省去 sourceMappingURL 尾注。镜像基线 SHA-256：

```text
7c2652c135afd6a294b0429f56668d199854cba326c518bd314c101ef75f130b
```

这是原版地面、贴图、植物、相机、后处理来自同一发行版本的字节证据。两份 GLTF
与四份 GLB 均无外部资源 URI，适合通过报告内的 Blob URL 提供完整本地资源。
原镜像移除了 Facebook loader，将远程 NFB header 与 DoubleClick 地址改为 data URL；
条件 analytics hook 仍在，最终报告需在 init 前显式禁用，不能把镜像描述为删除了全部统计代码。

详细定位、可逆比对、最低依赖与验证限制见
[V16 镜像 QA](../design-demos/cihou-wayfinder-v16/wayfinder/reference/cihou-mirror-audit.md)
和对应 [JSON](../design-demos/cihou-wayfinder-v16/wayfinder/reference/cihou-mirror-audit.json)。
该核验覆盖镜像基线；最终单 HTML 的启动、网络、交互与阅读仍需针对最终构建验证。
