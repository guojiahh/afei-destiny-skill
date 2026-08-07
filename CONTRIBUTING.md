# 参与开发

欢迎改进排盘计算、推理协议、领域规则和咨询表达。这个项目最重要的维护原则是：**计算、解释和评测彼此隔离**。

## 修改前先判断属于哪一层

- 计算事实：修改 `bazi-skill-main/scripts/`，并补充自动测试。
- 推理或表达：修改 `bazi-skill-main/references/`，写清适用条件、反例和冲突口径。
- 技能路由：只有任务识别、文件路由或全局边界变化时才修改 `SKILL.md`。
- Benchmark：只放在 `evaluation/`，不得复制原题、答案、人物标识或历史预测进技能包。

## 本地检查

```powershell
python -m unittest -v .\bazi-skill-main\scripts\test_calculate_bazi.py
python .\bazi-skill-main\scripts\calculate_bazi.py --help
git diff --check
```

涉及评测时，再按 [`evaluation/README.md`](evaluation/README.md) 的流程进行预登记、答案隔离、预测锁定和评分。

## 内容要求

- 对计算口径使用明确术语，不把流派差异写成唯一标准。
- 引用古籍时必须可核验；无法确认原文时改为概述，不制造引文。
- 合成示例必须明确标注，不得伪装成真实用户案例。
- 高风险主题使用条件性、风险管理语言，不诊断、不恐吓、不承诺。
- 不根据已揭晓的 benchmark 答案反向添加只对固定题目有效的规则。

## 提交说明建议

提交或 Pull Request 请说明：

1. 改了哪一层以及为什么。
2. 新增或更新了哪些测试。
3. 是否接触过 benchmark 答案；如有，如何避免泄漏到技能包。
4. 对现有计算口径、输出格式或兼容性是否有影响。
