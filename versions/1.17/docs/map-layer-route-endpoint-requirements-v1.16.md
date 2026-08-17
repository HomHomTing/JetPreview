# 地图元素层级与航段端点机场复用规范 1.16

## 1. 版本目标

1.16 版本聚焦地图视窗内飞机、机场、浮窗、选中态和航段端点之间的层级冲突治理。目标是在不修改航线绘制逻辑的前提下，让 selected aircraft、普通 aircraft、airport marker、airport hover popup 与 selected route endpoint 之间形成稳定、可解释、可测试的显示顺序。

本版本同时调整 selected aircraft 起止机场表达方式：当飞机被选中且起飞机场/目的地机场已知时，不再额外绘制独立 route endpoint pin，而是复用地图中原始机场 icon，并将对应机场 icon 置为航段端点选中状态。

## 2. 范围

包含：

- 地图内 marker / popup 的 z-index 层级标准。
- selected aircraft 起止机场的原始机场 icon 复用。
- 起止机场在机场图层关闭、缩放隐藏、Route 聚焦模式下的保留显示。
- 起止机场 hover popup 抑制，避免与 selected aircraft 详情和其他机场 hover popup 冲突。
- Google Maps AdvancedMarker 与 HTML fallback 的一致状态类和层级。

不包含：

- 不修改航线、航迹、虚线、颜色分段、速度/高度图表逻辑。
- 不新增外部接口，不新增 `513012` 请求。
- 不改变飞机 icon 资产、机型映射和 selected aircraft 图标形状规则。

## 3. 地图层级标准

地图元素从低到高按以下语义排序：

| 层级 | z-index | 元素 |
| --- | ---: | --- |
| 普通机场 | 360 起 | 非选中、非 hover、非航段端点机场 icon |
| 普通飞机 | 680 起 | 未选中 aircraft marker |
| 普通机场 hover | 760 | 鼠标悬停但非当前浮窗置顶态的机场 icon |
| 航段端点机场 | 920 | selected aircraft 的起飞机场/目的地机场原始 icon |
| selected airport | 940 | 用户主动选中的机场 icon 和稳定浮窗态 |
| 当前 hover popup | 1040 | 当前鼠标所在机场浮窗，允许高于已有选中机场浮窗 |
| selected aircraft | 1120 | 当前选中的飞机 icon |

原则：

- selected aircraft 始终是地图内最高优先级 marker。
- 航段端点机场高于普通飞机和普通机场，但低于 selected aircraft。
- 当前 hover popup 可高于 selected airport popup，用于解决两个机场浮窗同时存在时的遮挡和闪现。
- 层级治理不改变航迹线本身的绘制顺序、样式和数据处理。

## 4. 航段端点机场复用规则

当 selected aircraft 存在有效起点或终点机场时：

1. 使用 `selectedRouteEndpoints(jet)` 得到航段端点信息。
2. 使用端点 `code` 或 `id` 回查机场库中的原始机场记录。
3. 若匹配成功，将该原始机场 marker 标记为 route endpoint 状态。
4. 不调用 `setRouteEndpoints(selectedRouteEndpoints(jet))` 创建额外 endpoint pin。
5. 若起点/终点机场无法匹配机场库，则不额外绘制 endpoint icon。

## 5. 起止机场显示规则

- Airport 图层为 Off 时，selected aircraft 的起止机场仍需显示。
- Route 聚焦模式下，只保留 selected aircraft 起止机场，不显示普通机场集合。
- 当前缩放比例正常会隐藏小机场时，起止机场需要强制保留，并按至少可读的机场 icon 尺寸显示。
- 起止机场 label 固定展示机场代码，用于替代原独立端点 pin 的 code label。

## 6. 起止机场视觉状态

- 起飞机场使用 route origin 状态，机场 pin 主体使用黄色强调。
- 目的地机场使用 route destination 状态，机场 pin 主体使用橙色强调。
- 两者保留机场 pin 形态、白色描边、地图阴影和代码标签，不使用新的自定义端点图形。
- 代码标签在 hover 状态下仍保持可见，但不展开机场详情浮窗。

## 7. 浮窗交互规则

- selected aircraft 的起止机场不展示 airport hover popup。
- 起止机场仍允许保留基础 marker hover 状态，便于指针反馈和代码标签稳定显示。
- 用户主动选中普通机场时，机场浮窗规则沿用 1.15 的双浮窗位置避让逻辑。
- 当 selected airport 与第二个 hover airport 同时存在时，当前 hover popup 使用更高层级，避免闪现消失。

## 8. 验收标准

- 选中飞机后，地图上不存在 `.route-endpoint-marker` 新增端点 icon。
- 起飞机场/目的地机场对应原始 airport marker 出现 `is-route-endpoint` 状态。
- 起飞机场出现 `is-route-origin`，目的地机场出现 `is-route-destination`。
- 起止机场不出现 airport hover popup。
- Airport 图层关闭时，起止机场仍可见。
- Route 聚焦模式下，普通机场隐藏，仅保留起止机场。
- selected aircraft 图标始终显示在航段端点机场之上。
- 全量前端静态测试通过。
