# Rig14 最小跨步时序修复

[hero-character-rig-v14.js](../../../afei-destiny-skill/assets/cihou/quiet/immersive/hero-character-rig-v14.js) SHA256：`b4f76ba6d814a2791c6c393fc8b43e0fefc836a2d726bf82524466768b4fa95c`。

这是[低帧take02](SPATIAL_TAKE02.md)暴露cross额外沉髋24.7cm后，和Scene工程师约定的唯一最小候选。未覆盖Rig13、旧PNG或metadata。

- 全局`CihouCharacterRigV14`、version14、`isV13/isV14=true`；原XYZ、真实掌点/包口、布料接口相同。
- 前脚probe `.0→.22` / press `.22→.40`不变；后脚follow/lift从`.67→.88`提前为`.40→.67`，与root transfer同期。
- 后脚落地后`.67→.75`建立负重；contact窗口随落地提前为`.67→.69`。
- rootTravel总量与分段、safeStops`.40/.67/1`保持；`.67`实际鞋底已回到地面，有另一脚持续强支撑。
- Scene14负责真实逐脚world锚与同步follow区间。坡面倾角已由Rig13支持，无新增腿架构。

[实际演员页](actor-spatial-preview-v14.html)点击公开“采样检查”后，从[可见DOM保存的结果](rig14-geometry-results.json)：1001gait、804动作、301XYZ组非有限顶点0；真实UV鞋底误差`2.17e-8`、掌点`6.75e-9`、包口`6.23e-9`；可达目标过伸0。故意的不可达目标仍会明确报告，不把腿悄悄加长。

通过演员页公开“跨路”和进度滑杆实际查看p`.60`，可见后脚已经跟随：[原始浏览器实帧](rig14-cross-transfer.jpg)。该截图因浏览器自动滚到滑杆而裁到头部，保留原图，不作为主图构图证据。

这些仅是角色回归，**未证明Scene14已通过**。下一真实联合take将保存沉髋极值的完整rigState、局部踝目标、actor quaternion，按权威stance负重判断支撑，并把真实alpha轮廓→road mesh误差换为当前相机像素，交由实帧判断。
