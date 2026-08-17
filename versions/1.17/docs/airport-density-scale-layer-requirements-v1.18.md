# 机场密度与比例尺展示层级需求文档 1.18

## 1. 文档定位

本文档用于重新设计地图中机场 icon 在不同地图比例尺下的显示密度、显示层级和标签规则，解决当前欧洲、华东、湾区等机场密集区域中机场 pin 数量过多、遮挡飞机、降低地图可读性的问题。

建议归属版本：`1.18`。

形成日期：2026-08-12。

本文档只沉淀需求和验收规则，不直接修改运行版本。

## 2. 背景问题

当前版本已经实现了机场 icon 分层、50km 比例尺下机场可见、飞机层级高于机场、selected aircraft 起止机场复用原机场 icon 等能力。但在较大范围地图视野中，机场展示密度仍然过高：

- 在欧洲大陆级视野中，`displayLevel 4-5` 小型机场过早进入地图。
- 机场 pin 数量明显超过飞机 icon，视觉主次被颠倒。
- 多个机场 pin 与飞机 icon、城市地名、国家边界叠在一起，降低业务用户定位飞机的效率。
- 当前 `airportShowAllZoom = 7` 容易被误解为“Google zoom 到 7 后无条件显示全部机场”，实际应按地图比例尺和当前视窗密度综合判断。

本次需求的核心修正：

- 保留“50km 比例尺及更近视图下，当前视口所有机场 pin 可显示”的既有要求。
- 在 50km 之前，严格按机场层级和密度预算控制机场数量。
- 不再只用 Google zoom 作为机场全量展示的唯一开关。
- 机场图层必须服务于公务机运行态地图，飞机 icon 始终是第一视觉优先级。

## 3. 兼容既有需求

### 3.1 必须保留的既有规则

- 飞机 icon 层级始终高于普通机场 icon。
- selected aircraft 始终是地图 marker 最高层级。
- selected airport 即使被普通机场层级规则过滤，也必须保留显示。
- 机场图层为 Off 时，普通机场隐藏；selected airport 仍保留。
- selected aircraft 的起飞机场、目的地机场沿用 1.16 的“复用原机场 icon”方案，不再绘制独立 endpoint pin。
- 起止机场属于航段语义对象，不计入普通机场密度预算。
- 约 50km 比例尺及更近视图下，当前视口内所有机场 pin 必须可进入渲染队列。
- 标签仍需独立做碰撞剔除；“机场 pin 可见”不等于“机场文字标签全部可见”。

### 3.2 需要修正的既有表达

旧表达中“Google zoom 7 约等于 50km 比例尺”只能作为粗略经验，不应作为唯一规则。

新的规则应改为：

- 以有效地图比例尺为主。
- 以 Google zoom 为 fallback。
- 以机场层级和单视口密度预算为约束。
- 当有效比例尺达到 `50km` 或更近时，才进入全机场 pin 模式。

## 4. 机场层级定义

机场展示层级继续使用 `displayLevel`，数值越小优先级越高。

| displayLevel | 层级名称 | 典型机场 | 远距离显示策略 |
| --- | --- | --- | --- |
| `1` | 全球/国家核心机场 | 首都机场、全球级公务机枢纽、超高流量机场 | 洲际/国家级视野可显示 |
| `2` | 大型国际/核心商务机场 | 重要国际机场、核心商务航点、主要备降机场 | 国家/区域级视野可显示 |
| `3` | 区域主机场 | 省级/区域机场、城市群主机场 | 区域级视野可显示 |
| `4` | 常规商务/支线机场 | 中小型商务机场、常规公务机航点 | 接近城市群视野后显示 |
| `5` | 小型/通航/低频机场 | 小型机场、通航机场、低流量机场 | 50km 及更近视图显示 |

### 4.1 层级计算优先级

机场层级应优先由后端返回，不建议前端长期推断。

字段优先级：

1. `displayLevel`
2. `level`
3. `trafficScore`
4. `businessJetScore`
5. `groundNum / ground`
6. `arrival / departure / movements`
7. 跑道数量、跑道长度、机场性质
8. 前端 fallback 推断

### 4.2 公务机业务加权

本系统不是通用民航地图，机场层级需要对公务机运行场景加权：

- 公务机停场数量高的机场应上调层级。
- FBO / business aviation terminal 信息明确的机场应上调层级。
- 低客运量但公务机活跃的机场不应被普通民航流量低估。
- 纯低频通航机场即使数量多，也不得在大比例尺外提前铺满地图。

## 5. 有效比例尺定义

### 5.1 不再只用 zoom

机场密度控制不应只依赖 Google zoom，因为同一 zoom 在不同纬度、不同屏幕宽度和不同地图容器尺寸下，用户看到的真实范围不同。

前端应计算 `effectiveScaleKm`，用于判断当前视图属于哪个机场密度层级。

建议计算方式：

```text
metersPerPixel = 156543.03392 * cos(centerLat) / 2^zoom
scaleBarKm = niceScaleBarDistance(metersPerPixel, targetPx = 100)
effectiveScaleKm = scaleBarKm
```

如果无法取得 Google scale bar 的实际值，可使用以下 fallback：

```text
effectiveScaleKm = metersPerPixel * 100 / 1000
```

### 5.2 50km 判定

进入全机场 pin 模式的条件：

```text
effectiveScaleKm <= 50
```

不要再使用单一条件：

```text
zoom >= 7
```

`zoom >= 7` 只能作为旧版兼容 fallback，当无法计算 `effectiveScaleKm` 时使用。

## 6. 比例尺展示分层

### 6.1 Auto 模式

默认机场图层 `auto` 下，机场显示规则如下：

| 有效比例尺 | 视图语义 | 允许层级 | 目标单视口数量 | 硬上限 | 标签策略 |
| --- | --- | --- | ---: | ---: | --- |
| `> 500km` | 洲际/大洲视图 | `displayLevel <= 1` | 0-20 | 30 | 不显示标签 |
| `200-500km` | 国家/大区域视图 | `displayLevel <= 1` | 20-45 | 60 | 不显示标签 |
| `100-200km` | 国家局部/跨省视图 | `displayLevel <= 2` | 45-90 | 120 | 不显示标签 |
| `50-100km` | 区域/城市群外层 | `displayLevel <= 3`，高分 `4` 可候选 | 90-160 | 220 | pin only |
| `20-50km` | 城市群/机场群视图 | `displayLevel <= 5` | 全部进入队列 | 50000 请求上限 | pin only，selected/hover 可出标签 |
| `10-20km` | 城市周边视图 | `displayLevel <= 5` | 全部进入队列 | 50000 请求上限 | `level <= 2` 可显示代码 |
| `<= 10km` | 机场周边/本场视图 | `displayLevel <= 5` | 全部进入队列 | 50000 请求上限 | 主要机场显示代码，hover/selected 显示完整信息 |

说明：

- `20-50km` 已经进入“50km 及更近”的业务语义，因此当前视口内全部机场 pin 可以显示。
- `50-100km` 不允许无条件显示全部机场，避免截图中欧洲区域机场 pin 过密的问题。
- `displayLevel 5` 小机场不得在 `effectiveScaleKm > 50` 的 Auto 模式下显示。

### 6.2 On 模式

机场图层 `on` 表示用户主动要求增强机场显示，但不等于取消密度控制。

规则：

- 在 `effectiveScaleKm > 50` 时，`on` 模式可比 `auto` 多开放一级层级。
- 在 `effectiveScaleKm > 50` 时，`on` 模式单视口硬上限可提高 `1.5x`。
- 在 `effectiveScaleKm > 50` 时，`on` 模式仍然不得无条件显示 `displayLevel 5`。
- 在 `effectiveScaleKm <= 50` 时，`on` 与 `auto` 都进入全机场 pin 模式。

示例：

| 有效比例尺 | Auto | On |
| --- | --- | --- |
| `100-200km` | `level <= 2` | `level <= 3` |
| `50-100km` | `level <= 3`，高分 `4` 候选 | `level <= 4` |
| `20-50km` | `level <= 5` | `level <= 5` |

### 6.3 Off 模式

机场图层 `off` 的语义保持清晰：

- 普通机场全部隐藏。
- selected airport 保留显示。
- 搜索刚定位到的机场可作为 selected airport 保留显示。
- selected aircraft 的起止机场如果作为航段语义对象显示，应不计入普通机场密度层，视觉上沿用 route endpoint 状态。

## 7. 密度预算与去重规则

### 7.1 单视口预算

在 `effectiveScaleKm > 50` 时必须执行单视口机场预算。

排序优先级：

1. selected airport
2. selected aircraft route endpoint airport
3. hover airport
4. 搜索定位机场
5. `displayLevel` 小者优先
6. `businessJetScore` 高者优先
7. `trafficScore` 高者优先
8. 当前视口中心附近优先

### 7.2 网格密度控制

为避免机场密集地区一片 pin，前端应增加屏幕网格控制。

建议规则：

| 有效比例尺 | 网格尺寸 | 每格普通机场上限 |
| --- | ---: | ---: |
| `> 500km` | `220px` | 1 |
| `200-500km` | `180px` | 1 |
| `100-200km` | `150px` | 1 |
| `50-100km` | `120px` | 2 |
| `<= 50km` | 不启用普通网格截断 | 不限制 |

说明：

- selected airport、route endpoint airport 不受每格上限限制。
- 网格规则只用于 `effectiveScaleKm > 50`。
- 网格命中后，优先保留层级更高、商务分更高、交通分更高的机场。
- 被网格剔除的机场不显示 pin，也不显示 label。

### 7.3 密集区域特殊处理

欧洲、美国东北部、中国长三角/珠三角、日本关东等机场密集区域，需要额外保证：

- 大范围视图中机场 pin 数量不得超过飞机 icon 数量的 `1.2x`，除非飞机数量很少。
- 当机场 pin 数量超过 `160` 且飞机数量超过 `80` 时，继续提高机场筛选严格度。
- 机场 pin 不得遮挡 selected aircraft。
- 机场 pin 不得遮挡飞机注册号标签。

## 8. 标签展示规则

机场 pin 可见不代表标签可见。标签必须比 pin 更克制。

| 有效比例尺 | 标签规则 |
| --- | --- |
| `> 100km` | 普通机场不显示标签 |
| `50-100km` | 普通机场不显示标签；selected/hover 可显示 |
| `20-50km` | 普通机场仍以 pin only 为主；selected/hover 显示完整 hover label |
| `10-20km` | `displayLevel <= 2` 可显示 IATA/ICAO 代码 |
| `<= 10km` | 主要机场可显示代码；完整名称只在 selected/hover/详情态显示 |

标签碰撞优先级：

1. selected airport label
2. selected aircraft route endpoint code label
3. hover airport label
4. `displayLevel 1-2` code label
5. 其他机场不显示标签

## 9. 接口请求规则

机场请求不应在大范围视图下请求过多低层级机场。

请求参数建议：

| 参数 | 说明 |
| --- | --- |
| `effectiveScaleKm` | 当前有效比例尺 |
| `scaleBand` | 比例尺分层，如 `country / region / metro / city` |
| `displayLevelMax` | 当前允许的最大机场层级 |
| `maxAirports` | 当前请求硬上限 |
| `densityMode` | `auto / on / off` |
| `includeAllAirports` | 仅 `effectiveScaleKm <= 50` 为 true |
| `protectedAirportCodes` | selected、route endpoint、搜索定位机场 |

请求策略：

- `effectiveScaleKm > 50`：服务端按 `displayLevelMax` 和 `maxAirports` 过滤。
- `effectiveScaleKm <= 50`：服务端返回当前 bbox 内全部机场，`displayLevelMax = 5`。
- 前端仍需做一次密度防护，防止接口返回异常导致地图爆量。
- selected airport / route endpoint airport 可通过 `protectedAirportCodes` 要求服务端补齐。

## 10. 前端渲染规则

### 10.1 渲染流程

建议流程：

```text
计算 effectiveScaleKm
确定 scaleBand
确定 displayLevelMax 和 maxMarkers
筛选 bbox 内机场
合并 protected airports
按 displayLevel / businessJetScore / trafficScore 排序
effectiveScaleKm > 50 时执行网格密度控制
渲染 pin
独立执行 label collision
```

### 10.2 protected airports

以下机场必须从普通密度控制中提升出来：

- selected airport
- selected aircraft 起飞机场
- selected aircraft 目的地机场
- 搜索结果定位机场
- 当前 hover airport

protected airport 的要求：

- 不计入普通机场单格上限。
- 不计入普通机场密度排序淘汰。
- 仍遵循地图总层级规范。
- 如果 Airport Layer 为 Off，selected airport 必须保留；route endpoint 是否显示由 route endpoint 语义开关决定。

### 10.3 marker 大小

在 `effectiveScaleKm > 50` 时：

- `level 1-2` 使用 major 或 medium 尺寸。
- `level 3` 使用 medium 或 small 尺寸。
- `level 4` 仅作为高分候选，使用 small 尺寸。
- `level 5` 不显示。

在 `effectiveScaleKm <= 50` 时：

- `level 1-2` 使用 major。
- `level 3-4` 使用 medium。
- `level 5` 使用 small。
- small icon 不得为 `0 x 0`。

## 11. 配置建议

建议新增或调整配置：

```js
airportDensity: {
  showAllScaleKm: 50,
  fallbackShowAllZoom: 7,
  modeOnBudgetMultiplier: 1.5,
  bands: [
    { minScaleKm: 500, levelMax: 1, maxMarkers: 30, cellPx: 220 },
    { minScaleKm: 200, levelMax: 1, maxMarkers: 60, cellPx: 180 },
    { minScaleKm: 100, levelMax: 2, maxMarkers: 120, cellPx: 150 },
    { minScaleKm: 50, levelMax: 3, maxMarkers: 220, cellPx: 120 },
    { minScaleKm: 20, levelMax: 5, maxMarkers: 50000, cellPx: 0 },
    { minScaleKm: 10, levelMax: 5, maxMarkers: 50000, cellPx: 0 },
    { minScaleKm: 0, levelMax: 5, maxMarkers: 50000, cellPx: 0 }
  ]
}
```

旧配置兼容：

- `airportShowAllZoom` 保留为 fallback，不再作为主判断。
- `airportLimitByZoom` 可保留，但应逐步迁移到 `airportDensity.bands`。
- `airportLevelByZoom` 可保留，但应逐步迁移到 `airportDensity.bands`。

## 12. 验收标准

### 12.1 密度验收

- 在欧洲大陆级视野中，机场 pin 不再铺满地图，不应出现大面积蓝色机场 pin 压过飞机 icon 的情况。
- 在 `effectiveScaleKm > 100km` 时，`displayLevel 4-5` 不显示。
- 在 `50km < effectiveScaleKm <= 100km` 时，默认只显示 `displayLevel <= 3`，高分 `level 4` 可少量显示。
- 在 `effectiveScaleKm <= 50km` 时，当前视口内所有机场 pin 可显示，包含 `displayLevel 5`。
- 在 `effectiveScaleKm <= 50km` 时，前端不得再用普通数量截断隐藏机场 pin。

### 12.2 层级验收

- 飞机 icon 始终显示在普通机场 icon 上方。
- selected aircraft 始终显示在所有机场、机场 hover、route endpoint airport 之上。
- selected airport 不被密度规则隐藏。
- route endpoint airport 不被普通机场网格规则淘汰。
- Airport Layer Off 时普通机场隐藏。

### 12.3 标签验收

- `effectiveScaleKm > 100km` 时，普通机场无标签。
- `effectiveScaleKm > 50km` 时，机场标签不得形成密集文字块。
- `effectiveScaleKm <= 50km` 时，机场 pin 可全量显示，但标签仍需碰撞剔除。
- hover / selected 的机场信息优先显示，不被普通标签抢占。

### 12.4 性能验收

- 欧洲密集区域拖拽和缩放不卡顿。
- 单次机场 marker 更新在常规桌面环境下应控制在可感知流畅范围内。
- 机场图层不应导致飞机图标刷新延迟。
- 前端保留防爆量保护，即使接口异常返回过多机场，也不会导致页面冻结。

## 13. 实施拆分建议

### P0

- 增加 `effectiveScaleKm` 计算。
- 新增 `airportDensity.bands` 配置。
- 将 `airportShowsAllInCurrentViewport` 从 zoom 判断改为比例尺判断。
- 在 `visibleAirports` 中加入比例尺层级筛选和网格密度控制。
- 保留 selected airport 和 route endpoint airport 的 protected 规则。
- 更新机场请求参数，发送 `effectiveScaleKm / scaleBand / displayLevelMax / maxAirports`。

### P1

- 后台正式返回 `displayLevel / businessJetScore / trafficScore`。
- 支持不同地区的密度策略微调。
- 增加机场图层调试面板，显示当前 scaleBand、levelMax、渲染数量、剔除数量。

### P2

- 基于用户偏好提供机场密度滑杆。
- 针对公务机热点区域维护人工白名单或分层修正表。
- 在机场高密度区域支持聚合态，但聚合态不得替代 50km 及更近视图的真实机场 pin。

## 14. 非目标

- 不修改飞机 icon 映射规则。
- 不修改飞机运行数据接口字段含义。
- 不引入外部机场数据源。
- 不复制或抓取第三方地图产品的运行数据。
- 不把机场聚合点作为默认主方案；本系统仍以真实 airport pin 为主。
