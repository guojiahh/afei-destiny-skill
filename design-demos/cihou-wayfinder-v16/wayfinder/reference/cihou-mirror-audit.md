# 此后 V16 原版镜像核验

核验日期：2026-10-19。本文件核验复制后的镜像基线；后续报告适配层、内联打包与浏览器运行
应另作验证。机器可读结果见 [cihou-mirror-audit.json](cihou-mirror-audit.json)。

## 与公开版本的一致性

来源：[Wayfinder](https://wayfinder.nfb.ca/) 当前页面引用的
[src.effdb523.js](https://wayfinder.nfb.ca/src.effdb523.js)。本轮直接下载的公开脚本
SHA-256 为 `b6fbdca8d55595f538e4f06f498e01b464f7098794678650c93adca3b2c17b85`。
镜像 `runtime/wayfinder.js` 为 1,767,992 bytes，SHA-256 为
`7c2652c135afd6a294b0429f56668d199854cba326c518bd314c101ef75f130b`。

两者均有相同的 807 个 Parcel 模块 ID。将镜像的 439 个资源路径 resolver、
query 默认配置、诗作数量、locale 覆盖、两个统计地址替换依次逆向恢复后，
结果与公开脚本逐字符相同，唯一省去的是尾部 sourceMappingURL 注释。
因此地面着色器、相机、人物、植物、程序环境和后处理确实来自同一公开运行时，
并非仅凭截图判断相似。

[asset-manifest.json](asset-manifest.json) 的 444 项本地资产逐项复核大小和 SHA-256：
49,137,963 bytes，零缺失、零不符。公开脚本引用的 439 个独立资源路径全部覆盖；
另外 5 项为本地 CSS 引用的 WOFF 字体。本轮独立下载的 floor、overlay、path、
三个 LUT、一个植物 atlas 与三个 sheet 共 10 个样本，也与镜像逐字节一致。

本核验没有重新下载或重审全部 source map。`recovered-source/` 的恢复过程见
[原镜像验证记录](verification.md)；本次运行时来源证明直接基于公开 bundle 与可逆补丁，
不依赖该历史记录的完整性。

## 本地运行依赖

镜像原壳需要按顺序载入配置、template 适配器、runtime，再调用 connect；全部脚本、
三张运行时 CSS、模板 CSS 与 444 项资产均为本地文件，无需 CDN 或远程 NFB 导航。
两个 GLTF 的 URI 均为内嵌 data，四个 GLB 无外部 URI，没有遗漏的模型 bin 文件。
不应凭扩展名随意删除未在森林首屏出现的资源：其他环境、结尾、语言和音频格式有延迟加载。

内联报告可用 MIME 正确的 Blob URL 替代 asset resolver 返回的文件路径；模型内嵌数据
无需再次修补相对路径。reference、source map 和 Python 开发服务器不属于浏览器运行依赖。
原镜像壳中的 customize 页面入口不属于此后报告功能；复制时未包含该页面，新壳应移除入口。

## 统计和外部地址

原 Facebook loader 已从镜像 HTML 移除；NFB 远程导航默认关闭，原 DoubleClick pixel 与
NFB header script 地址分别替换为 `data:,`、`data:text/javascript,`。
参考源码仍保留原地址作为研究材料，不能把搜索命中研究文件误判为运行请求。

镜像的 `XMOu.sendAnalytics` 仍保留“宿主存在 google_analytics 才调用”的条件 hook。
独立原壳没有注入该全局，但嵌入其他宿主时应在 init 前显式将 sendAnalytics、
sendTrackingPixel、startButtonTracking 置空，并保持 nfbHeader=false。
这些函数均为可写导出；另外 revealHeader、hideHeader 和全局 revealHeader
也可置空，避免等待没有载入的 NFB header。

外部作品介绍、作者与 credits 超链接仍可能由用户点击离开页面；它们与自动遥测不同。
要承诺最终 HTML 完全无后台外网请求，仍应以最终构建的实际浏览器网络记录为准。

## 已执行与限制

- 444 项资产 hash、439 项路径覆盖、807 模块 ID 与可逆补丁比对全部通过。
- 原镜像 runtime 与 template adapter 的 `node --check` 通过。
- 本次为静态来源与依赖核验，未重新游玩全部环境或记录最终报告网络行为。
- 原作及素材保留原权利归属；此后适配层不构成对原作商业授权的声明。
