# 此后 · V8 保存基线与完整报告交接

更新：2026-10-18。用户从历史对照页指定 **V8** 为保存版本，并要求提交 Git、查看完整 HTML。当前渲染器默认已切换为 `painted-v8`。这是用户选择的版本基线；没有产生新的独立设计评分，也不能把它写成达到某个评分要求。

## 当前产品与唯一入口

- 最终交付是一份同会话的完整个人 HTML。两份 Markdown 是内容底稿和页尾下载；真实报告、个人模型、截图和会话状态都只保存在被 Git 忽略的 `consultation_state/<session>/`。
- 首屏为居中绘本画面，不显示品牌、报告标识、日期和个人大标题。保留必要的按住提示、阅读入口与播放控制。
- 主图固定为 V8：深蓝纸路、原创红裙纸偶、拾花、揭环、投种、离环与回望。采用 WebGL 中的二维原画、关节纸偶与 2.5D 运镜，不是原生三维地形，也不把画稿称为数学莫比乌斯曲面。
- 正文保持九章顺序、主问题优先、其他领域随后、依据原地展开。个体事实、解释、反例、行动条件与未来窗口由本会话模型填写，不能写进共享美术或场景代码。
- 环是可修正的困局隐喻，不能证明每个问题都由个人心理循环造成。外部限制、未知或暂缓均可如实表达；离环不是现实成功承诺。

| 要做什么 | 权威入口 |
|---|---|
| 产品与后续范围 | [产品方案](CIHOU_PRODUCT_PLAN.md) |
| 继续单一咨询 | [Skill](../afei-destiny-skill/SKILL.md)、[会话协议](../afei-destiny-skill/references/consultation-harness.md) |
| 生成完整个人报告 | [HTML 报告协议](../afei-destiny-skill/references/html-report.md) |
| 填写固定九章内容 | [生成器](../afei-destiny-skill/scripts/generate_html_report.py)、[模型模板](../afei-destiny-skill/assets/cihou/mobius-model-template.json) |
| 修改正式页面与版本选择 | [渲染器](../afei-destiny-skill/scripts/render_quiet_report.py)、[HTML](../afei-destiny-skill/assets/cihou/quiet/report.html)、[控制器](../afei-destiny-skill/assets/cihou/quiet/report.js) |
| 复核 V8 素材、版本与哈希 | [V8 说明](../afei-destiny-skill/assets/cihou/quiet/immersive/README.md)、[冻结清单](../afei-destiny-skill/assets/cihou/quiet/immersive/v8-bundle.json) |
| 单独体验同版主图 | [V8 原型](../afei-destiny-skill/assets/cihou/quiet/immersive/prototype-v8.html) |
| 底稿结构 | [用户八节模板](../afei-destiny-skill/assets/cihou/user-report-template.md)、[技术十一节模板](../afei-destiny-skill/assets/cihou/technical-report-template.md) |
| 更早的完整匿名样机 | [演示索引](../design-demos/README.md) |

## V8 的确定性运行链

渲染器 `HERO_BUNDLE` 集中选择 `CihouHeroSceneV8`、`CihouCharacterRigV8`、人物图集 V5 与世界原画 V3。场景版本、人物图集和原画有各自编号，不能因为使用图集 V5 就把整版称为 V5。所有运行 PNG、JSON、Three.js、MIT 全文、关节与场景代码都内联到最终 HTML，来源清单逐项记录 SHA-256；不依赖远程素材或元数据。

保留原 V8 的 **10.5 秒揭示、9.5 秒离环**。按住路面、触摸、空格或回车控制拉远；松开保留进度。揭环并短暂停顿后可主动再往前一步，结束后阅读或重看。暂停、重看、键盘、离屏／后台停止、减少动态与无脚本阅读由正式控制器维护。WebGL 无法使用时显示静态说明，正文和来源仍可阅读。

人物与纸路均为本轮原创生成美术，参考了三个原站的画面语言，没有从原站提取角色或物件；不能沿用旧 `girl-walk` 图集的 CC0 署名。素材来源和限制见 V8 目录中的生成记录。Three.js 单独使用 MIT 授权。

## 每份咨询的完成链路

1. 先 `discover`，只对用户选中的单一会话执行 `status`、`audit`、`resume`。不读取其他会话补内容。
2. 按各自来源计划，完成并登记用户八节、技术十一节底稿；技术来源防火墙保持。
3. 完整阅读本次双底稿，使用 `--init-model` 初始化 `cihou-mobius-v1` 草稿。填入三态个人含义与九章内容，保留事实、假设、条件、反例、未核验未来及反馈撤回。
4. 生成预览，核对 V8 实际运镜、桌面与窄屏、暂停与重看、键盘、正文及来源展开。不能只打开匿名原型就认为完整模板通过。
5. 更新已有登记先按产物 ID 精确 `supersede`，使用新版本文件名。`--register` 后 `--check`，再 Harness `audit`。不覆盖历史有效文件，不为美术切换重写咨询事实。
6. 最终回复突出完整 HTML 一个入口并打开。只有双底稿、来源绑定模型与 HTML 均有效登记，默认 HTML 会话才算 `complete`。

新会话统一 `report_template=cihou-mobius-v1`。旧会话无模板字段时保持原契约；需要升级时用新模型显式选择模板。框架固定复用，每次填的是当前会话内容，不能直接把匿名样机改名为个人报告。

## 历史与评审边界

旧海图、stage1、quiet 石墨纸路、人物比例预览、V1–V14 和全部本地研究记录保留。V9–V14 是后续工程探索，本次选择 V8 不会删除或反向覆盖这些原件。历史比较页放在选定会话内，包含早期个人页面，因此不能加入 Git 或安装包。

V8 的第 07 轮独立评论员亲自完成当前原型及 Wayfinder、Kaizen、Nomadic Tribe 的主流程，评分为 **4.5/10**；V10 的第 08 轮评分为 **5.8/10**。这些评分没有因用户选定 V8 而改变。V11–V14 尚无新的独立评分；V13 查出低帧跨步沉髋和穿坡，V14 的后续专项在用户要求历史对照时中断，不能宣称全部通过。

如以后继续设计评审，每轮仍需全新上下文、同一提示词、当前版本截图与交互过程；评论员亲自体验三个原站完整流程。既有研究截图、工程测试和用户选定均不能代替独立审美判断。原站抓取代码、第三方截图和大批可重建 QA 页面保留在本地研发资料，本次运行基线提交不将其作为可分发资产。

## 验证与后续范围

从仓库根运行：

```sh
source .venv/bin/activate
python tools/check_workspace.py --skill
```

回归测试只用合成材料。当前交付记录以会话活动产物和实际 QA 为准；桌面／手机视口测试不等于实体手机接收与打开验证。`127.0.0.1` 只是本机预览，最终入口链接实际 HTML 文件。

私有在线托管、账号、云端存储、跨设备同步、在线咨询和回访服务尚未实现。Git 提交只保存本地可重建源码、共享美术与模板，不代表推送、发布或上线。
