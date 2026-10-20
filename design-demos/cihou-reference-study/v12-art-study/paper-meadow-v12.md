# 可选原生草坡材质

[paper-meadow-v12.png](../../../afei-destiny-skill/assets/cihou/quiet/immersive/paper-meadow-v12.png) 是供 v12 原生 heightfield 选用的顶视 albedo；不是整世界背景，也不是网页截图。工程师可选用或弃用。

使用 builtin image_gen 生成，实际输入为本目录 concept 与 Nomadic Tribe、Kaizen、Wayfinder 三站真实截图。初稿偏黄，第二次只调整为灰橄榄与浅暖纸色。保留工具生成的原始 PNG，未做像素后期。完整 prompt、真实输入及 SHA 见[来源记录](../../../afei-destiny-skill/assets/cihou/quiet/immersive/paper-meadow-v12-provenance.json)。

- 文件为 1254 × 1254 RGB；SHA-256：`647714980d09821340e25336d4339bb265cb739bf557acbe9e563e70d786b084`。
- 整张建议覆盖约 14–18 m 的地形，先从 16 m 开始。3–5 m 重复会使草叶变成密集草毯。
- 细斜线草带和裸土区比旧纸擦痕清楚，但局部仍较密；建议材质混合权重约 0.5–0.7，配合原生大块地形色层，避免额外加黄。
- 边缘并非逐像素无缝：左右、上下边缘 RGB 平均差约 13–16/255。建议 MirroredRepeatWrapping 或宽幅单块 UV，并实际检查镜像轴；不能把生成提示中的“seamless”当作已验证无缝。
- 图中没有道路、人物、石、花、天空或地平线。坡面、遮挡、人物脚底接触、光照与叙事物件继续由原生场景负责。
- 本任务只验证了原图内容与来源，没有声称完成网页美术验收或独立评分。

