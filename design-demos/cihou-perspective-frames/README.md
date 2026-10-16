# 此后 · 路上与环外

2026-10-16。已弃用的视觉探索：用户指出暮色风景抢占表达重点、难以与 HTML 排版融合。当前改为[页面优先的主图样机](../cihou-quiet/README.md)。以下两张静态关键帧与原分镜保留为过程记录，未接入正式 HTML，未生成视频。

## 两个状态

1. [路上：第一视角](01-on-the-road.png)。只能看到眼前的道路与转弯，前方看起来仍有路。
2. [看见环：第三视角](02-see-the-loop.png)。镜头拉远，出现环的全貌，原来的观察者成为环上的小人。

采用玫瑰珊瑚色矿物带面、暮色紫灰环境和柔光，保留一个浅色磨痕作为连续性参照。文字全部留给 HTML 排版。两张图是同一设计意向，不是同一个 3D 模型的精确摄影；道路几何、视点与拓扑连续性需要在动画样片中验证。当前为横幅构图，尚未完成手机竖幅构图或真机验证。

## 参考与采用范围

实看网页并将临时截图作为内置图像生成工具的视觉参考。参考截图不随仓库分发；成图未复制其文字、标志、UI 或完整场景。

| 参考 | 具体借鉴 |
|---|---|
| [Monopo London](https://monopo.london/) · [Awwwards 归档](https://www.awwwards.com/sites/monopo-london) | 低频、柔和的色彩过渡；大面积空间中只留少数视觉焦点 |
| [David Whyte Experience](https://davidwhyte.com/experience/) · [作者案例](https://immersive-g.com/projects/david-whyte-experience/) | 诗意留白、轻盈环境、文字与景观的分工；不复制水彩树木与诗句 |
| [Samsara / World Creation Studio](https://worldcreation.studio/projects/samsara/) | 第一视角的身体尺度、暮色与空间纵深；不复制布墙、文字或路线，未将此案例标为获奖作品 |

中文界面拟用少量宋体／明体标题与易读黑体正文。首屏依次只出现一句话，待实际版式验证，不将小字烘焙进图片。正式阅读仍沿用[四层报告结构](../../docs/CIHOU_PHASE1_REDESIGN.md)。

## 动画与交互决策

采用代码负责状态与持续行走、可选首尾帧视频负责镜头过渡的组合。不要把整页做成需要看完才能操作的影片。

- **路上**：低速向前行走，熟悉的磨痕周期性再出现；保持循环，直到用户主动介入。只需一句“总觉得，再准备一点就好了。”（匿名示意，真实报告从咨询内容重新编写）。
- **发现**：点击主图道路，镜头上升、后退，逐步露出整个环。约 4–5 秒，保持同一太阳、道路与磨痕，禁止通过环凭空生长完成过渡。字幕“走了很久，还是回到这里。”
- **环上**：小人继续沿环行走，整体轮廓保持稳定。图内人物周边提供足够大的点按区域，必要时仅一次轻提示；不强迫点准小人。
- **介入**：点击小人所在区域，小人先走到画面左侧贴地的最低段，停下、转身，再跨到近旁的可见地面上。当前行者位置仍有落差，不能直接作为跨出点。先确认支撑面高度和落脚点；不从高处坠落，不消失，不让整环爆裂。此后试着做一件可获得外部反馈的事，画面短句必须说出具体改变。静帧尚未制作该状态。
- **此后**：环保留，旧方式仍可被看见。人离开熟悉轨迹，走向开放空间；不凭画面直接给出录用、财富或确定答案。新的路也可能需要调整。

循环不是强制持续占用设备：主图提供低调暂停，离屏和后台暂停；系统减少动画时以静态状态替代，保留相同点按和解释。点击切换在当前主图内完成，不自动跳转正文。

优先验证一段“路上 → 看见环”的样片，再考虑“环上 → 跨出”和“跨出 → 外部尝试”；后两段必须先有各自的关键帧。不能用仅有的两张图宣称已具备数段连贯过渡。第一人称循环和第三人称行走最好来自同一可控场景，生成视频承担经过检查的过渡片段，不充当核心交互逻辑。

## 视频准备情况

已查阅阿里云官方的 [Wan 3 视频 API](https://help.aliyun.com/zh/model-studio/wan3-video-generation-api-reference) 与 [Wan 2.2 首尾帧 API](https://help.aliyun.com/zh/model-studio/legacy-image-to-video-by-first-and-last-frame-api-reference)。用户指定的模型优先级保留为：有免费额度的 `wan3.0-video-prime`、有免费额度的 `wan3.0-video`、再到 `wan2.2-kf2v-flash`。

本轮未提交视频任务，未查询到当前账号免费余量或“免费额度用完即停”的生效状态。官方初始赠送量不代表账号当前余额；只凭推理密钥不能确认调用免费。免费额度与控制项以[官方说明](https://help.aliyun.com/zh/model-studio/new-free-quota)及实际控制台为准。文档和素材不保存密钥、私有端点或鉴权响应。

建议第一段使用 720P、5 秒、无声，只做连续镜头后退与上升。样片验收关注：无环形生长或熔化、无道路断接、无人物复制、太阳位置连续、首尾衔接自然。只在这些条件成立后接入页面；否则用同一 3D 场景进行真实镜头转换。

首段预备提示词（未提交）：

```text
One uninterrupted cinematic camera move, no cuts. Start from the first frame: the viewer stands on the rose-coral mineral road. Smoothly retreat and rise to the last frame, revealing that this same existing road forms one half-twisted loop, and the viewer's original position is now occupied by the single tiny plum-coated walker. The camera moves; the road never grows, melts, rearranges, or changes topology. Keep the sun on the left, lighting, lavender ground, mineral surface and pale oval scuff consistent. No new structures, people, objects, text or effects. Finish with the complete road loop and the single walker clearly visible. Gentle controlled motion; no spinning camera and no sudden acceleration.
```

## 图片生成记录

工具：内置 `image_gen`，无 CLI／第三方图片 API。先生成第三视角母版，再将母版作为本地参考图编辑为第一视角；生成后原样复制至本目录。没有使用真实咨询材料。

### 第三视角母版提示词

```text
Use case: stylized-concept. Make ONE exquisite cinematic keyframe, 16:9 landscape. This is shot B of a continuous philosophical interactive scene: the camera has pulled far back to reveal a tiny walker is walking around an immense Mobius-loop ROAD. Use the attached references only for visual direction: reference 1 Monopo for restrained low-frequency coral/lilac atmospheric color fields and generous composition; reference 2 David Whyte for poetic negative space and soft tactile light; reference 3 Samsara for the scale and depth of an inhabitable environment. Do NOT copy their logos, words, UI, trees, or fabric walls. Invent the coherent new scene described here.
Scene: a boundless quiet lavender-grey ground plane and misty dusty-lilac sky that gently merge. An extraordinary continuous architectural ribbon ROAD makes a single clearly readable half-twisted Mobius loop, lying broadly across the middle-right of the frame, a low front segment and a sweeping high rear bend. It is a walkable place at architectural scale, about sixty metres across and four metres wide; NOT jewelry, NOT a tabletop object, NOT a highway, NOT an infinity-logo, NOT interlocking rings. Road is solid matte rose-coral plaster on the top face, pale warm blush along a very thin beveled edge, with subtle mauve-to-dark-plum shading on its underside. Dry fine-grained mineral texture, physically coherent thickness, no metal, no gold, no clasp, no machinery. One narrow slightly lighter worn walking track is integrated in the centre of the road, never luminous and never a painted traffic line. Upper back twist and near front path must be visually separable, immaculate curved silhouette and genuine occlusion. A single very small stylized person in a dark plum simple coat is on the nearest low section of the road, walking to the right; this person will be the first-person camera in shot A. No other people. A single subtle pale oval scuff is next to the walker, a landmark for continuity. Front road lies only about one metre above the surrounding flat ground; rear ribbon rises and softly twists, permitting a later simple step off near the foreground rather than a fall. Place the loop in the central-right 65%, leaving a beautifully quiet upper-left area for later interface typography; full silhouette visible with generous breathing space. Elevated 3/4 wide camera, a believable cinematic 35mm view, not perfectly isometric. Large soft peach sunlight from upper left, gentle lavender contact shadows on ground, faint atmospheric depth, refined film grain, elegant magical realism with gallery-level art direction. Palette strictly warm coral/rose, dusty lilac, pale blush and deep plum, with high enough tonal contrast to read at phone size. Crisp important silhouette with softer atmospheric distance. NO TEXT ANYWHERE, no watermark, no chart, no dots, no arrows, no UI, no diagram labels, no gleaming toy or product-photography stage. Not glossy plastic. It must feel inviting, strange, contemplative, and inhabited. One frame only, no collage, no comparison layout.
```

### 第一视角定稿提示词

初稿把环内侧放在前进方向的右侧，与总览人物朝向不符。本次重新以总览为参考，改成前进方向的左侧；所选文件 `01-on-the-road.png` 为下面这次生成的原图。镜头实际连续性仍需动态验证。

```text
Edit the provided master overview into ONE 16:9 cinematic FIRST-PERSON keyframe from the exact position and forward heading of the tiny plum-coated walker on the NEAR FRONT segment of this road. This is a geometric perspective transformation of the SAME scene. The walker in the reference is moving RIGHT along the front segment: therefore the INSIDE OF THE LOOP IS ON THE WALKER'S LEFT, and the outside landscape is on the walker's RIGHT. Critical composition: the road fills the lower half at the bottom edge, advances into depth and curves GENTLY LEFT in the middle/far distance. The inner opening and visible inner drop of the ribbon must be on the LEFT SIDE of the road, never on the right. The outer ground plane lies beyond the RIGHT SIDE of the roadway. The road's next stretch rises and hides what comes next. Never show the entire loop, a whole circle, overview, or multiple pathways. Eye height 1.65 metres over the road surface, natural immersive 28mm camera, not aerial. The observer is the walker; do not show any person, hands, feet, body or shadow of camera. Preserve rose-coral dry mineral plaster, thin pale beveled edges, mauve/plum underside, purple-grey flat landscape, softly hazy peach dusk, fine tactile grain and reference color grading. Preserve the same small pale oval scuff near the foreground and naturally converging road edges. The sun may move OUT OF FRAME to camera-left as the camera changes heading; don't force the sun to the same screen position as in the aerial view. Keep illumination consistent, a diffuse peach glow from left, soft lilac shadow. A believable walkable road at immense architectural scale, continuous curvature, refined and quiet. Generous atmospheric negative space above. No jewelry, metal, rails, markings, glowing lines, buildings, trees, logos, text, UI, diagram arrows or collage. The emotional image says: a beautiful open way ahead, whose hidden return is not yet visible. Single high-quality artwork, same world, corrected road direction.
```

### 第一视角初稿提示词（方向问题，未选用）

```text
Edit the provided image into ONE new 16:9 cinematic keyframe of exactly the same architectural place, changing ONLY CAMERA POSITION and perspective. This is shot A, the first-person view from the eyes of the tiny walker on the nearest low section of the Mobius road. Move camera to where that walker is standing, eye height 1.65 metres above the coral walking surface, facing to the RIGHT along the direction the person is walking. The observer IS this walker: no visible body, feet, hands, another person or over-the-shoulder view. Keep the very same rose-coral mineral plaster road, mauve/plum underside, thin pale bevel, lavender flat ground and dusty lilac atmosphere, warm light direction from the same sun, realistic fine grain and filmic art quality. In this first-person perspective, the broad road begins at the bottom edge across the lower half of the image, its two subtle edges converging and bending gently toward the upper-right distance. The road climbs gradually beyond the bend and hides what comes next. The entire loop MUST NOT be visible; no circular object, no horizon with a whole ring, no overview. Only the walkable local roadway and a hint of distant structure disappearing into atmosphere. Convey the persuasive feeling 'there seems to be a way ahead' through the forward vanishing point and beautiful natural curvature, while the actual route is the same closed loop. Include the SAME very subtle pale oval scuff from the reference near the lower foreground as continuity anchor. Quiet pale lavender atmosphere in upper-left leaves breathing space for later typography. Do not add buildings, trees, railings, lane paint, vehicles, tunnel portals, fantasy stairs, machinery, jewellery or decorative arrows. This is a seamless single continuous place at large architectural scale, not a different scene inspired by it. First-person eye-level immersive point of view, elegant 28mm cinematic lens, precise road edges, fine dry mineral texture in foreground, atmospheric softness in distance, warm pink-coral highlights and lavender shadows. Preserve color grading and lighting intensity of the reference. NO TEXT, NO UI, NO LOGO, NO COLLAGE, one single frame.
```
