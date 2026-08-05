# 飞机航迹刷新与连续性需求文档 1.6

## 1. 背景

当前地图在飞机被选中后，可以绘制 `513009` 返回的历史飞行航迹，但飞机后续通过 `513008` 快照产生的新位置没有稳定延续到 selected 航迹中，导致用户看到的航迹停留在第一次加载时的历史点。另有部分航线出现不连续、跨日期变更线异常或缺口被错误直连的问题。

本文档基于现有 1.5/1.6 航迹规范、当前代码实现，以及用户提供的 `mapDrawUtils.js` 绘制逻辑整理，用于定义 1.6 后续优化的航迹刷新机制和连续性规则。FR24 风格只作为交互和视觉参考，本系统的数据来源仍限定为自有/授权接口 `513008-513011`。

参考依据：

- 用户提供文件：`/Users/dinghongmeng/Downloads/mapDrawUtils.js`。
- FR24 官方支持文档：`https://support.fr24.com/support/solutions/articles/3000115027-why-does-the-aircraft-s-trail-change-colour-`。
- FR24 官方博客：`https://www.flightradar24.com/blog/inside-flightradar24/supercharging-flightradar24s-data-display/`。
- 当前项目：`docs/aircraft-dynamic-track-line-style-standard-v1.5.md`。
- 当前项目：`docs/selected-aircraft-route-visual-requirements-v1.6.md`。

## 2. 目标

1. 选中飞机后，历史航迹与新产生的实时航迹连续显示。
2. 新实时位置到达后，地图航迹按 `2-3s` 刷新节奏增量追加，不闪烁、不整层重建。
3. 对覆盖缺口、时间断点、异常速度、跨日期变更线等场景进行语义化分段，避免错误直连。
4. 航迹视觉继续遵守 FR24 风格：实际航迹按高度色阶，估算/覆盖缺口使用深色点线或弱化线，不用 selected 颜色覆盖高度语义。
5. Google Maps 与 Leaflet fallback 在刷新、分段、样式、层级上保持一致。

## 3. 参考逻辑摘要

### 3.1 `mapDrawUtils.js` 的关键规则

用户提供的 `mapDrawUtils.js` 中可抽象出以下绘制经验：

| 规则 | JS 行为 | 本系统转译 |
| --- | --- | --- |
| 状态驱动 | `10/20/30/40/50/60` 使用不同线型 | selected 航迹只把实际已飞路径作为主视觉；计划/未完成路径必须单独降级 |
| 连续轨迹 | 相邻点时间差小于等于 `2min` 归为正常段 | P0 使用 `coverageGapMs = 120000` 判断 actual 连续性 |
| 缺口轨迹 | 相邻正常段之间生成 `lose` 线段 | 缺口只可绘制为 estimated/coverage gap，不可使用高度色实线 |
| 途中状态 | `state=30` 时，已飞段为实线，最后点到目的地为未完成虚线 | FR24 风格下默认不画未来计划航线；如显示，必须是独立 planned layer |
| 机场连接 | 起点到首个轨迹点、末点到终点可绘制弱化虚线 | 仅在 Route focus 或行程分析模式显示，不纳入实际航迹 |
| 日期变更线 | 对跨 `+/-180` 经线数据做切分与插点 | 保留现有 anti-meridian split，禁止横穿全球直线 |

### 3.2 FR24 风格经验

- selected 飞机的 flight path 会跟随实时位置持续更新，而不是只显示第一次加载的历史线。
- 实际航迹颜色表达高度变化；selected 状态通过飞机图标、层级、线宽和可见性增强表达。
- 覆盖范围外、估算或信号缺口不应被渲染为正常高度色实线，应使用深色点线或明显弱化的缺口段。
- 地图缩放、拖拽不触发航迹详情重复请求，只重算可见点、线宽和层级。
- 高频刷新时应复用已有 segment/overlay，避免每次刷新删除并重建整条航迹。

## 4. 当前问题诊断

### 4.1 新产生航迹未显示

当前代码中，`513009` 明细只在飞机详情首次加载时请求。`513008` 后续刷新会更新 selected 飞机的实时坐标，但如果没有把该实时点纳入 selected route buffer，地图仍只渲染第一次 `513009` 返回的历史点。

应避免以下行为：

- 只缓存 `flightDetail.coordinates`，不合并 `513008` 实时点；
- 只更新飞机 icon 坐标，不更新 selected 航迹 segment；
- 每次实时刷新重新调用 `selectAircraft()` 但不改变 track point 序列；
- 使用前端插值/外推位置写入历史航迹，导致航迹出现虚假点。

### 4.2 航线间断不连续

断点可能来自以下原因：

- 相邻点时间间隔超过阈值；
- 坐标字段混用 `lon/lng/longitude` 导致点丢失；
- `513009` 历史点与 `513008` 当前点时间戳不一致或重复；
- 点序列未按时间升序归并；
- 跨日期变更线没有切分，触发异常长线；
- 异常速度点被直接连接；
- 采样时跨越语义边界，把缺口两侧点误连。

## 5. 数据模型要求

### 5.1 统一航迹点

所有来源的航迹点进入渲染前必须归一化为：

```javascript
{
  uniqueKey: "flight unique key",
  source: "513009" | "513008",
  lat: 31.2304,
  lng: 121.4737,
  timestamp: 1785726000000,
  altitudeFt: 36000,
  groundSpeedKt: 442,
  heading: 276,
  quality: "good" | "estimated" | "weak" | "invalid" | "stale",
  isEstimated: false,
  estimatedToNext: false,
  estimatedReason: "",
  provisional: false
}
```

字段规则：

- `timestamp` 必须为 epoch ms，优先使用服务端位置时间。
- `lng` 必须统一到 `[-180, 180]`。
- `altitudeFt`、`groundSpeedKt` 用于颜色分段，缺失时允许有限 carry forward，但不能跨缺口。
- `source=513008` 的实时点可以进入 selected 航迹 buffer；前端动画插值点不得写入 buffer。
- `provisional=true` 表示来自快照的临时实时点，后续如果 `513009` 返回同时间附近的正式点，应以正式点替换。

### 5.2 Selected Track Store

新增独立状态容器，避免把历史详情、实时快照、渲染采样混在一起：

```javascript
selectedTrackStore = {
  uniqueKey,
  historyPoints: [],
  liveTailPoints: [],
  mergedPoints: [],
  lastConfirmedTimestamp: 0,
  lastRealtimeTimestamp: 0,
  routeVersion: "",
  updatedAtEpochMs: 0,
  revision: 0
}
```

要求：

- `historyPoints` 来自 `513009`。
- `liveTailPoints` 来自 `513008`，只保留当前 selected 飞机。
- `mergedPoints` 为排序、去重、连续性标记后的最终渲染输入。
- `revision` 只在实际点集变化时递增，zoom/drag 仅触发样式和采样重算。

## 6. 实时航迹刷新机制

### 6.1 点击飞机

P0：

1. 立即进入 selected 状态，打开左侧详情面板。
2. 先使用飞机对象已有短轨迹或当前实时点绘制临时 selected 航迹。
3. 异步请求 `513009` 获取完整历史航迹。
4. `513009` 返回后，用历史点替换临时历史段，但保留请求期间已经追加的 `513008` live tail。
5. 如果 `513009` 请求失败，不清空当前 selected 航迹，继续用 `513008` 追加短航迹。

### 6.2 `513008` 快照刷新

P0：

1. selected 飞机存在时，快照刷新间隔保持 `2500ms` 左右。
2. 每次 `513008` 返回 selected 飞机新位置后，构造一个 `source=513008` 的实时点。
3. 若新点 `timestamp` 大于 `lastRealtimeTimestamp`，且坐标有效，则进入 `liveTailPoints`。
4. 若新点与最后一个点距离小于 `0.05nm`，可更新最后点的高度、速度、航向和时间，但不新增 segment。
5. 若新点坐标变化达到阈值，追加新 segment，并触发地图 diff update。
6. 不使用 `currentPosition()` 的前端插值/外推结果作为历史航迹点；插值只服务飞机 icon 平滑移动。

P1：

- 当 selected 飞机短暂离开当前 viewport 时，仍保留 `selectedRetentionMs` 内的实时刷新与航迹追加。
- 后端如支持 `sinceVersion` 或 `trackSince`，优先请求增量点，减少 payload。

### 6.3 `513009` 历史刷新与回填

P0：

1. `513009` 首次加载后，按时间戳合并历史点和 live tail。
2. 如果 `513009` 后续返回更新版本，需按 `timestamp + coordinate tolerance` 去重。
3. 对同一时间附近的 provisional 点，使用 `513009` 正式点替换，并保持 segment id 尽量稳定。
4. 不因为 `513009` 缓存未过期而阻止 `513008` 实时点追加。

P1：

- selected 状态持续超过 `detailCacheMs` 后，可后台刷新 `513009`，用于修正快照点的高度、速度、覆盖缺口标记和端点信息。

## 7. 航迹连续性规则

### 7.1 连续实际段

相邻点满足以下全部条件时，绘制为 actual segment：

- 两点坐标合法；
- 时间戳升序；
- `elapsedMs <= 120000`；
- 两点均非 `estimated/invalid/stale`；
- 隐含速度不超过 `maxImpliedSpeedKt`，建议默认 `850kt`；
- 未跨越未处理的日期变更线。

actual segment 使用高度或速度色阶实线。selected 状态不得改变其颜色语义。

### 7.2 覆盖缺口/估算段

以下场景绘制为 estimated/coverage gap：

- 后端显式标记 `isEstimated`、`estimatedToNext` 或 `quality=estimated`；
- `elapsedMs > 120000` 且小于硬断开阈值；
- 覆盖缺失但起终点仍可通过合理速度解释；
- `513009` 历史最后点与 `513008` 当前点之间存在短暂缺口。

视觉要求：

- Google Maps：使用 `icons.repeat` 点线，主线 `strokeOpacity=0`。
- Leaflet：使用 `dashArray`，颜色深灰/黑色。
- 不使用高度色阶。
- 不纳入 selected halo 的连续 actual path。

### 7.3 硬断开

以下场景必须断开，不绘制连接线：

- `elapsedMs <= 0`；
- 坐标非法或缺失；
- 两点距离/时间推导速度超过 `maxImpliedSpeedKt`；
- quality 为 `invalid`；
- 跨日期变更线但无法计算边界切点；
- 采样导致缺口边界丢失。

硬断开时保留两侧独立轨迹段，不以灰线强行连接。

### 7.4 机场连接与未来计划线

默认 selected 航迹只显示已飞路径：

- 起飞机场到首个实测点的连接线默认关闭，可在 Route focus 中以弱化虚线显示。
- 当前点到目的地的未来计划线默认关闭。
- 若业务需要显示未完成航线，必须使用 planned route layer，样式为浅灰/浅黄长虚线，层级低于 actual/estimated。
- planned route 不参与高度/速度色阶。

## 8. 跨日期变更线规则

P0：

1. 相邻点经度差绝对值大于 `180` 时，必须拆分为两段。
2. 在 `+180/-180` 边界按线性比例插入边界点。
3. Google Maps 可对长距离稀疏段启用 `geodesic=true`，但仍不能横穿全球。
4. 缺口段跨日期变更线时，同样需要拆分；不能把最东点和最西点直接连成一条横线。

P1：

- 对跨日期变更线的多段路径保留稳定 segment id，避免刷新时线段闪烁。

## 9. 采样与缩放

P0：

1. 采样不得跨越 actual/estimated/invalid 边界。
2. 必须保留起点、终点、当前飞机位置、覆盖缺口两侧点、日期变更线边界点和明显转弯点。
3. zoom 变化只重算采样和线宽，不重新请求 `513009`。
4. selected 航迹所有 zoom 可见；普通航迹按既有 1.5 规则受 zoom 和数量上限控制。

## 10. 渲染更新要求

### 10.1 Diff 更新

P0：

- segment id 由 `uniqueKey + startTimestamp + endTimestamp + pathIndex` 生成。
- 新点追加时，只创建新增 segment，已有 segment 更新样式即可。
- 删除过期 segment 时必须同步释放 Google Maps/Leaflet overlay。
- overlay 数量不得随刷新无限增长。

### 10.2 层级

从低到高：

1. 底图；
2. 地图阴影/对比遮罩；
3. 普通机场；
4. 普通飞机；
5. 普通短航迹；
6. selected estimated/coverage gap；
7. selected actual segments；
8. route endpoint pins；
9. selected aircraft icon；
10. selected callsign label；
11. 左侧详情面板和控制 UI。

## 11. 详情面板联动

P0：

- 详情面板当前高度、速度、航向、坐标跟随 `513008` 刷新。
- 面板图表入口展示的数据版本与 `selectedTrackStore.revision` 对齐。
- 如果航迹存在缺口，图表与地图都应使用相同的 estimated/coverage gap 语义。

P1：

- 图表 hover 某一点时，地图高亮对应 segment。
- 地图 hover segment 在分析模式中显示轻量 tooltip，默认 FR24 风格下不常驻显示。

## 12. 验收标准

### 12.1 新增航迹

1. 点击飞行中飞机后，`513009` 历史航迹显示。
2. 等待一次或多次 `513008` 刷新后，若飞机位置发生变化，selected 航迹末端出现新增 segment。
3. 新增 segment 颜色按新旧点高度/速度计算，不整条重绘为单色。
4. 飞机 icon 平滑移动，但只有真实快照点进入历史航迹。
5. 关闭再打开 Route focus，不丢失已追加 live tail。

### 12.2 连续性

1. 相邻点间隔小于等于 `120s` 且速度合理时，航迹连续。
2. 相邻点间隔大于 `120s` 的缺口不画成高度色实线。
3. 后端标记 estimated 的段显示深色点线。
4. 异常速度或时间倒序点不会造成横跨地图的直线。
5. 跨日期变更线航迹被拆分到 `+180/-180` 两侧，不横穿全球。
6. zoom 变化、拖拽地图后，航迹不闪烁、不丢失新增段。

### 12.3 性能

1. 单架 selected 航迹 `1000` 点以内，增量刷新耗时目标小于 `16-30ms`。
2. 连续运行 `10min`，航迹 overlay 数量与实际 segment 数接近，不持续增长。
3. `513009` 失败时，页面仍可通过 `513008` 展示短实时航迹。

## 13. 实施建议

P0 实施顺序：

1. 新增 `selectedTrackStore`，把 `513009` 历史点和 `513008` 实时点分层管理。
2. 在 `applyRealtimeSnapshot()` 后，对当前 selected 飞机执行 `appendSelectedRealtimeTrackPoint()`。
3. 将 `aircraftTrackPoints()` 改为读取 `selectedTrackStore.mergedPoints`，普通飞机仍使用短轨迹。
4. 把连续性阈值从当前 `180s` 调整为可配置，FR24-like 默认 `120s`。
5. 将 estimated gap、hard break、anti-meridian split 的判断提前到 segment 构建前。
6. 用稳定 segment id 做 diff update，验证 Google Maps 与 Leaflet 一致。

P1 实施顺序：

1. 支持后台刷新 `513009` 并回填替换 provisional 点。
2. 支持 selected 飞机离开 viewport 后的保留刷新。
3. 增加航迹连续性 debug 面板，显示 gap reason、point count、segment count、revision。
4. 增加自动化用例覆盖新增点追加、缺口点线、硬断开、日期变更线。

## 14. 与现有文档关系

- 视觉线型继续遵守 `docs/aircraft-dynamic-track-line-style-standard-v1.5.md`。
- selected route 交互继续遵守 `docs/selected-aircraft-route-visual-requirements-v1.6.md`。
- 本文档补充的是刷新机制、点序列合并、缺口连续性和实施优先级。
