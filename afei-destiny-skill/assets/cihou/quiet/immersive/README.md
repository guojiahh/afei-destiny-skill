# 此后主图 · V8 保存基线

保存日期：2026-10-18。用户选定 V8 作为当前保存、展示与完整报告的主图基线。选定版本与独立审美评审是两件事：历史第 07 轮对 V8 的评分为 4.5/10；保存此版本不表示已通过独立审美验收。

## 版本与画面

这是 2.5D 绘画场景：世界画稿、纸偶分件与程序投影共同组成画面，使用 Three.js 渲染。画中的环用于表达循环隐喻；它不是数学莫比乌斯曲面，也不是后续版本的原生三维场景。

各组成部分独立编号，不能因为报告选 V8，就把素材编号统一改成 V8：

| 组成 | 本次版本与文件 |
| --- | --- |
| 场景 | V8：[hero-scene-v8.js](hero-scene-v8.js) |
| 人物关节 | V8：[hero-character-rig-v8.js](hero-character-rig-v8.js) |
| 人物画稿与坐标 | V5：[PNG](girl-rig-parts-v5.png)、[JSON](girl-rig-parts-v5.json)、[生成来源](generation-notes-rig-v5.json) |
| 环形世界画稿 | V3：[PNG](world-keyart-v3.png)、[生成来源](world-keyart-v3-provenance.json) |
| 纸路材质 | V1：[PNG](paper-road-v1.png)、[生成来源](paper-road-v1-source.json) |
| 花石标记 | V1：[PNG](flower-stone-v1.png)、[坐标与生成来源](flower-stone-v1.json) |
| 渲染库 | [three.min.js](three.min.js)、[Three.js MIT 授权全文](THREE-LICENSE.txt) |

[原始 V8 原型](prototype-v8.html)保留独立主图的交互。按住累计 10.5 秒，从行走近景逐渐看见全环，松开保留当前景别；全环之后主动选择“再往前一步”，离环叙事为 9.5 秒。减少动态模式使用静态状态。原型仅包含正文衔接示意；完整个人报告由共享模板和来源绑定生成器装入九章内容。

## 素材与内容边界

人物、世界、纸路与花石是本项目指导生成的原创美术，来源 JSON 保留生成说明与参考用途。历史 GameArt2D 人物的 CC0 授权不适用于本次原创人物。Three.js 的 MIT 授权随库与完整 HTML 一起保留。

共享目录只存框架、素材、动作与交互。个人报告的文字、来源绑定模型与咨询材料留在各自的私有会话中，不进入共享资产或 Git。每份报告填写内容模型，再由固定生成器内联所选主图与九章正文；不为每份咨询改写场景代码。

[可复核清单](v8-bundle.json)记录精确 `HERO_BUNDLE`、10 项运行资产与原型的 SHA-256 和字节数，以及素材来源。已有历史素材保持原样；本次以清单明确选中的 V8 运行链。
