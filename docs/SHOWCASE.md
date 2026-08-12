# 三分钟演示指南

这份文档用于向第一次接触项目的人快速说明：它解决什么问题、为什么可信度边界更清楚、现场应该展示哪些内容。

## 一句话介绍

> Bazi Skill 把“排盘计算”和“命理解释”拆成两层：Python 负责可测试的四柱与岁运事实，Codex 按问题加载传统规则，并用证据、反证和置信度组织回答。

## 推荐演示流程

### 1. 先展示输入（约 20 秒）

```text
请用 $bazi 分析：公历 1990-05-15 14:30，女性。
我只问 2026–2027 年是否适合换工作。
请先说明排盘口径，再给最强证据、最强反证和现实建议。
```

说明重点：用户问的是聚焦问题，技能不会用一份大而全的模板淹没它。

### 2. 展示确定性计算（约 40 秒）

```powershell
python .\bazi-skill-main\scripts\calculate_bazi.py `
  --date 1990-05-15 --time 14:30 --gender female `
  --target-year 2026 --compact
```

可指出三个字段：

- `conventions`：采用什么换年、换月和换日口径。
- `four_pillars`：四柱及其十神、藏干等事实。
- `target_year`：目标流年、当步大运和与原局的关系。

示例四柱为 `庚午 辛巳 庚辰 癸未`。现场不必逐行讲完整 JSON。

### 3. 展示回答结构（约 60 秒）

让观众关注回答有没有明确分开：

1. 排盘事实：计算器直接得到、可以复核的内容。
2. 结构判断：使用了哪些传统规则，证据强弱如何。
3. 岁运触发：为什么关注某个时间窗口，而不是只报一个年份。
4. 反证与变量：什么信息可能让判断改变。
5. 现实建议：不以命理替代现金流、合同、健康等现实信息。

### 4. 展示工程验证（约 40 秒）

```powershell
python -m unittest -v .\bazi-skill-main\scripts\test_calculate_bazi.py
python -m unittest -v .\bazi-skill-main\scripts\test_blind_opening.py
python -m unittest -v .\bazi-skill-main\scripts\test_consultation_harness.py
python .\bazi-skill-main\scripts\doctor.py
```

说明：四组检查分别验证计算稳定性、盲测候选门禁、完整会话状态与环境可运行性；它们都不是证明八字具有科学预测力。当前选择题方法与限制见[评测与迭代方法报告](EVALUATION_AND_ITERATION_METHOD.md)，上一代实验见[归档报告](../evaluation/archive/mingli-baziqa/final_report.md)。

## 可切换的演示问题

### 时辰不确定

```text
请用 $bazi 分析我的职业方向。出生时间只知道是下午，先比较可能时辰的共同结论，
不要假装存在唯一命盘。
```

展示点：缺少信息时主动降低结论粒度。

### 真太阳时边界

```text
请用 $bazi 比较民用时和真太阳时两种排盘口径；如果时柱发生变化，
分别说明哪些结论稳定、哪些结论需要保留。
```

展示点：边界问题不是悄悄选一个口径，而是显式比较。

### 传统命理选择题

```text
请用 $bazi 解这道题。先核对题干事实并检查最强反例，最后只按题目要求输出选项。
```

展示点：内部推理可以完整，提交格式保持严格。

## 对外介绍时不要过度承诺

- 可以说“排盘计算可测试、过程可追溯”。
- 可以说“回答会标记口径、证据和不确定性”。
- 不要说“评测高分证明命理有效”。
- 不要把 BaziQA 的 `92.98%` 当作技能净增益；该实验中专家审查层的净增益为 `0`。
- 不要用单个合成示例暗示系统已经预测了真实经历。

## GitHub 社交预览图

仓库已经准备好 [`assets/showcase/social-preview.png`](../assets/showcase/social-preview.png)，尺寸为 `1280 × 640`。它只介绍整个 Skill，不包含个人案例或微信二维码。

上传步骤：

1. 打开 GitHub 仓库主页，进入 **Settings**。
2. 在 **General** 页面找到 **Social preview**。
3. 点击 **Edit** / **Upload an image**，选择 `assets/showcase/social-preview.png`。
4. 保存后回到仓库主页，等待 GitHub 更新分享卡片缓存。

预览图中的账号固定为 `github.com/guojiahh`。

## 演示前检查

- [ ] 新环境中能识别 `$bazi`。
- [ ] `SKILL.md` 位于安装目录第一层。
- [ ] Python 能运行，9 项排盘、6 项盲测和 14 项会话 Harness 测试通过；`doctor.py` 全绿。
- [ ] 演示出生信息是虚构信息或已获本人同意。
- [ ] 不在屏幕上展示评测答案缓存或个人敏感信息。
