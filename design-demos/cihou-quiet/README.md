# 此后 · 页面优先的主图样机

状态：2026-10-16 获认可的第一阶段匿名视觉基线。正式产品已提取到 [quiet 渲染器](../../afei-destiny-skill/scripts/render_quiet_report.py)及 [Skill 页面资产](../../afei-destiny-skill/assets/cihou/quiet/report.html)，新报告统一莫比乌斯环和九章正文。后续正式开发从 [交接说明](../../docs/CIHOU_HANDOFF.md)进入；本目录保留匿名片段、当时验收和生成记录。


2026-10-16。用户否定暮色风景方向后，重做的图像与 HTML 整体排版。最新可打开的[单文件样机](../cihou-quiet.html)；[拆分源码入口](index.html)。本目录为匿名虚构示例，不读取或替代私人咨询报告。

## 设计规则

首屏和正文共用 `#f4f2ed` 米白底，标题与正文为 `#252525`，人物和行动提示为 `#be452f`。生成图片有透明 alpha；空白由页面本身提供，图片没有另一个背景。图只承担道路形态与视角，所有文字、人物、阅读和状态由 HTML/CSS/JS 承担。

中文标题使用系统宋体／明体字族，正文使用系统黑体；不外载字体，不将文字烧进图片。桌面固定左文右图，手机顺序为标题、图、短解释，正文在同一底色与阅读尺度中继续。标题控制为两行，解释只有一句，图内只有一处操作提示。

本轮集中观察 [Igloo Inc.](https://www.igloo.inc/) 的实际页面：中央主体形成视觉中心，文字位于稳定边缘区域；其[作者案例入口](https://www.awwwards.com/igloo-inc-case-study.html)保留供核对。这次采用“同一主体、固定文字区、单一材质语言”的组织方式，具体米白纸面、中文字体和深色纸带为本产品的选择。网站中的雪景与特殊字效不承担此后报告的表达任务，未复制其图像或代码。

## 三个状态与时机

| 状态 | 标题 | 一句解释 | 图的工作 |
|---|---|---|---|
| 路上 | 再准备一点，就出发。 | 投递却一次次被推迟。 | 近景道路与反复经过的浅刻痕，第一视角不显示另一个人 |
| 看见环 | 走了很久，又回到准备。 | 没有反馈，又觉得自己准备不足。 | 同材质全环，朱红小人沿带面循环，环本身不自转 |
| 跨出 | 先试一次，让现实回答。 | 投递一份，再按反馈调整下一步。 | 人先回到前侧，再跨至页面留白；环保持原状 |

点击图立即响应，文字先淡出；图形切换或跨出动作结束后，新文字整句出现。文字位置固定，不逐字飞入，不自动轮播。图上交互不改变页面滚动位置，也不登记现实行动。重看、暂停、键盘 Enter／Space、离屏与后台暂停及减少动态效果分支均有实现。

正文只有两段匿名示例：循环怎样维持、怎样引入一次现实反馈。图文顺读；文末原位展开示例依据。这里用于验证主图与阅读衔接，不是完整咨询报告，也不补造命理分析或其他生活领域。

## 当前实现边界

两张透明图由内置 `image_gen` 生成后原样复制到本目录。转场采用短淡化与轻微缩放，人物是 SVG 路径动画。这不是同一 3D 模型的连续运镜；当前路径贴合是二维示意，不是空间行走或精确单面拓扑验证。未生成视频，也没有调用视频接口。

下一步若继续打磨空间动画，应保持本轮页面底、字色、文字区域与时机，替换图形渲染层；不要再先制作一幅独立风景再塞入页面。正式个人报告的内容与生成链路保持独立。

## 文件与重建

- [index.html](index.html)：语义页面与匿名正文。
- [styles.css](styles.css)：同一底色、排版、响应式与动效状态。
- [app.js](app.js)：图内点击、路径行走、字幕时机及暂停。
- [路上素材](assets/road.png)、[全环素材](assets/loop.png)：1448 × 1086 RGBA 原图，无背景。
- [build.py](build.py)：将 CSS、JS 和图片嵌入可离线打开的一个 HTML。

重建：

```sh
python3 design-demos/cihou-quiet/build.py
```

## 样机制作时的检查记录

- 浏览器检查 1280 × 720、390 × 844、320 × 568：主图可点击，三个状态文案一致，无页面横向溢出。390 视口坐标点按前后滚动位置保持为 0。
- 已实际操作暂停／继续、Enter／Space 与跨出；连续输入在过渡期间保持状态稳定。减少动态效果和离屏／后台分支已实现并代码核对，未切换系统设置或使用实体手机测试。
- 全环路径 505 个采样点全部落在所选素材的不透明带面；这只检验二维贴合，不证明真实三维行走。
- 单文件内嵌两张图片、CSS 与 JS，检查无外部运行依赖；约 2.8 MB。样机制作当时的工作区 64 项测试、环境检查、空白与 Markdown 本地链接检查通过；当前完整验证以交接说明中的命令为准。
- [桌面路上截图](qa/desktop-road.jpg)、[手机全环截图](qa/mobile-loop.jpg)供查看排版，连续体验以 HTML 为准。

## 素材生成提示词

工具：内置 `image_gen`，透明背景开启。先生成全环，调整前侧表面，再由全环生成对应近景道路。以下保存实际提示词，初稿留在生成工具原始路径，项目引用选定版本。

### 全环初稿

```text
Use case: stylized-concept.
Asset type: isolated transparent 3D illustration for a responsive Chinese editorial HTML report, NOT a scenic painting or a finished poster.
Primary request: ONE beautiful dark graphite Möbius ribbon as a walkable continuous road, seen from a slightly elevated three-quarter camera. One half twist, one continuous ring, wide walking surface, physically thin clean edge. Its distinctive open silhouette must remain legible at 350px width. The near/front stretch is mostly horizontal and low, the back stretch gently rises through one twist. Architectural scale, composed like a single carefully folded sheet of heavyweight graphite paper, not jewelry, machinery, chain or glossy toy.
Background: genuinely transparent alpha everywhere outside the object. No ground plane, horizon, sky, landscape, light beams, fog, gradients or backdrop. Include only a very restrained small contact shadow if it can remain translucent, otherwise no shadow.
Material: smooth matte charcoal paper, dark neutral graphite (#343536), underside lighter warm grey, crisp thin warm-white paper cut edge. Soft neutral studio lighting shows curvature with very few large tonal shapes; no noisy textures, speckles, stone, weathering, scratches, metallic reflections or colored lighting.
Composition: landscape 4:3, ribbon centered with all edges visible; object fills 80% of width and 65% of height with breathing room. Calm elegant silhouette, clear overlapping surfaces. Visual weight slightly right. The artwork will sit beside large black Chinese typography on a flat warm ivory HTML page; do not draw any typography. No people in this asset: an animated small vermilion person will be added in HTML. No arrows, markings, text, logo, symbols, frame or UI. High quality minimalist editorial CGI, precise and restrained.
```

### 全环调整

```text
Edit this isolated graphite Mobius paper loop. Keep its refined matte charcoal material, off-white thin cut edge, soft neutral lighting, transparent background and overall elegant single-loop silhouette. Change ONLY the loop's orientation and the front roadway geometry so a person could clearly WALK on its visible front surface: the nearest/front quarter must be a broad HORIZONTAL DECK seen from above, like a flat ribbon walkway, NOT an upright wall. The front inner edge is higher on the screen and the front outer edge is lower on the screen, with the walkable top surface clearly filling the area between those two curves. Use an elevated three-quarter camera, about 35 degrees downward. The rear part rises and makes one graceful HALF-TWIST; all of it remains one continuous true Mobius strip. Thin material, no thick pedestal or sidewall. Front deck soft dark grey, underside charcoal, thin pale cut edge. No person yet; no background, shadows outside the object, text, scenery, decor or paint. Whole loop visible, generous margins, 4:3 composition. This is a seamless transparent asset for a warm ivory HTML page, not standalone art or a product photograph.
```

### 道路近景

```text
Use case: stylized-concept. Create the matching FIRST-PERSON ROAD VIEW for the provided transparent graphite Möbius paper-road asset, as a second cutout asset for the SAME minimalist HTML report.
Only a close local segment of the same wide graphite ribbon road is visible. Camera stands at human eye height on its near segment, looking forward along a generous walkable surface which begins wide at the bottom of the composition, gradually narrows, gently curves LEFT and rises out of view in the upper middle. The INNER side of the curve is on the LEFT, the outer edge on the RIGHT. Do not show the entire circle or a full loop. The ribbon is a smooth dark neutral graphite paper surface with a very thin warm-white cut edge and a slightly lighter underside. Same soft neutral studio light as the reference, restrained charcoal tonal variation, no texture noise.
Background must be genuinely TRANSPARENT everywhere outside the roadway, including any opening and all upper space. No sky, horizon, ground, room, sunset, mountains, colored light, gradient or shadows detached from the road. The HTML itself supplies a flat warm ivory background. Composition landscape 4:3, roadway contained in the central/right area with breathing room, its lower end may reach the lower edge. This road will sit to the right of separate HTML typography on desktop and below it on phones. No text, people, footprints, road lines, arrows, UI, decorative marks, jewelry or glossy materials. Concentrate on forward perspective, one uninterrupted shape, clean editorial restraint.
```
