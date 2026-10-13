# 发布产物

此目录存放由 `afei-destiny-skill/` 生成的安装压缩包。`*.zip` 被 Git 忽略，因为它们是可重新生成的二进制产物，不是源文件。

新包采用 `afei-destiny-skill-YYYY-MM-DD.zip` 命名；同日重建应增加版本后缀，保留已有包。解压到同名 Skill 目录后，使用 `$afei-destiny-skill` 调用。旧名称的发布包是历史快照，不会随源码改名而自动更新。

发布前应重新打包当前 Skill，并确认压缩包根目录直接包含 `SKILL.md`、`references/`、`scripts/` 和 `agents/`。不要把 `evaluation/`、`.benchmark-cache/`、`docs/` 或比赛答案打进安装包。
