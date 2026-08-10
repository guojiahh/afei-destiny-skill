# 发布产物

此目录存放由 `bazi-skill-main/` 生成的安装压缩包。`*.zip` 被 Git 忽略，因为它们是可重新生成的二进制产物，不是源文件。

发布前应重新打包当前 Skill，并确认压缩包根目录直接包含 `SKILL.md`、`references/`、`scripts/` 和 `agents/`。不要把 `evaluation/`、`.benchmark-cache/`、`docs/` 或比赛答案打进安装包。
