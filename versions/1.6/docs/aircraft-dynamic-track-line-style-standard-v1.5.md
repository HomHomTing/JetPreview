# 飞机动态航迹线型标准 1.5

## 1. 文档定位

本文档定义 `Global BizJet Ops 1.5` 中飞机动态航迹的线型、粗细、缩放、层级、数据质量表达和渲染验收标准，适用于 Google Maps 主渲染器与 Leaflet fallback。

适用对象：

- 实际已飞航迹（actual trail）；
- 普通飞机短航迹（regular short trail）；
- 选中飞机航迹（selected trail）；
- Route 聚焦航迹（route focus trail）；
- 估算/信号缺口段（estimated segment）；
- 计划航路（planned route，预留）；
- 地面滑行航迹（ground trail）。

本文档中的 `必须`、`不得` 为 1.5 验收要求，`建议` 为推荐实现。

## 2. 研究结论与标准边界

### 2.1 已确认的公开规则

1. OGC Moving Features 将轨迹定义为随时间变化的移动对象路径；时间序列与坐标序列需要一一对应，并可声明插值方式。因此，动态航迹不能只是一条无时间语义的静态折线。
2. Flightradar24 官方说明确认：航迹颜色表达各位置的飞行高度；黑色点线表示飞机位于覆盖范围外、位置为估算值。
3. Google Maps 的 `Polyline.strokeWeight` 和 Leaflet 的 `Path.weight` 都以屏幕像素为单位。线宽应保持屏幕可读性，不按地图地理比例成倍放大。
4. Google Maps 可通过在线上重复 SVG symbol 生成点线/虚线；当 `repeat` 明确使用 `px` 时，间距按屏幕像素计算。
5. Mapbox Style Specification 支持 `line-width`、`line-dasharray`、`line-cap`、`line-join` 和 zoom 表达式；zoom 插值适合让线宽在比例尺变化时平滑过渡。
6. W3C WCAG 2.2 对理解内容所必需的图形建议至少达到 `3:1` 非文本对比度；细线经过抗锯齿后会比名义颜色更淡，不能只依赖色相区别状态。

### 2.2 不存在公开统一像素表

没有发现 ICAO、FAA、OGC、Google Maps 或 Flightradar24 对民用动态飞行地图发布一套统一的“zoom 对应航迹像素粗细”强制标准。本文第 5 节的宽度表是结合以下条件形成的项目工程标准：

- 本项目 zoom 范围为 `2-12`；
- Google Maps 和 Leaflet 均使用屏幕像素线宽；
- 低 zoom 优先态势感知，高 zoom 优先进近、盘旋和地面细节；
- selected 航迹需要稳定突出，但不能遮挡机场、航路和飞机图标；
- 当前实现基线为普通 `2.2px`、selected `3.3px`、selected halo `6px`、Route 聚焦 `3.6px + 7px halo`。

因此，本标准是产品视觉与工程实现规范，不应标注为 ICAO 或 FAA 法定制图标准。

## 3. 术语与语义

| 类型 | 数据语义 | 主线型 | 颜色语义 | 默认可见性 |
| --- | --- | --- | --- | --- |
| `actualTrail` | 真实接收并通过质量校验的历史位置 | 实线 | 按高度连续分段 | selected 始终；普通按 zoom/数量 |
| `regularTrail` | 未选中飞机的最近短航迹 | 实线 | 按高度分段，低透明度 | zoom `>=7` 且未超过数量上限 |
| `selectedTrail` | 当前选中飞机的实际航迹 | 实线 + 深色 halo | 按高度分段 | 始终显示，除非用户关闭 Trails |
| `routeFocusTrail` | Route 聚焦状态下的 selected 航迹 | 加粗实线 + 加粗 halo | 按高度分段 | Route 聚焦时显示 |
| `estimatedSegment` | 覆盖缺口、插值或推算位置 | 深灰点线/短虚线 | 不使用高度色阶 | 仅有估算数据时显示 |
| `plannedRoute` | 尚未实际飞过的计划路径 | 浅色长虚线 | 单一计划色 | 1.5 默认关闭 |
| `groundTrail` | 低于 `300ft` 的实际地面/极低空路径 | 实线 | 白色/浅灰 | zoom `>=9.5` 显示完整细节 |
| `invalidGap` | 坐标跳变或不可置信数据 | 不连线 | 无 | 始终断开 |

关键约束：

- 实际、估算、计划三种语义不得使用同一种线型。
- selected 状态不得把整条航迹改成单一红色；selected 由宽度、halo、层级和飞机图标表达。
- 高度色阶只用于实际已飞航迹，不用于估算段和计划航路。
- `stale` 是数据新鲜度状态，不等于 `estimated`；stale 航迹降低透明度，不能自动改成虚线。

## 4. 地图比例尺定义

### 4.1 以 zoom 为实现控制量

Web Mercator 中，同一 zoom 的地面分辨率会随纬度和设备像素密度变化，不能把 zoom 当成全球固定纸面比例尺。工程实现必须使用地图 `zoom` 作为控制量，比例尺只用于帮助理解视野范围。

在标准 `256px` tile、`96dpi`、纬度 `φ` 下，可使用近似式：

```text
resolution(m/px) = 156543.03392 × cos(φ) / 2^zoom
scale denominator ≈ 591657528 × cos(φ) / 2^zoom
```

下表比例尺为赤道附近近似值；纬度 `30°` 时分母约乘 `0.866`，纬度越高差异越大。

### 4.2 zoom 与场景分级

| Zoom | 赤道近似比例尺 | 典型场景 | 航迹信息目标 |
| --- | --- | --- | --- |
| `2.0-3.49` | 约 `1:148M - 1:53M` | 全球/洲际 | 只保留 selected 大形状，不展示普通航迹噪声 |
| `3.5-5.49` | 约 `1:52M - 1:13M` | 洲际/大区域 | selected 主路径清楚，隐藏微小转弯与地面点 |
| `5.5-6.99` | 约 `1:13M - 1:4.7M` | 国家/区域空域 | selected 路径完整，普通航迹仍默认关闭 |
| `7.0-8.49` | 约 `1:4.6M - 1:1.64M` | 城市群/航路 | 开始显示受控数量的普通短航迹 |
| `8.5-9.49` | 约 `1:1.63M - 1:0.82M` | 终端区/机场周边 | 保留进离场、等待盘旋和转弯细节 |
| `9.5-12.0` | 约 `1:0.82M - 1:0.14M` | 本场/近地面 | 展示地面滑行、低速转弯与密集采样细节 |

## 5. 不同比例尺下的线宽标准

### 5.1 核心宽度表

所有数值均为 CSS 屏幕像素，不乘 device pixel ratio。渲染器负责映射到物理像素。

| Zoom | 普通实际航迹 | selected core | selected halo | Route focus core | Route focus halo | 估算段 | 计划航路 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `2.0` | 隐藏 | `2.4px` | `4.8px` | `2.7px` | `5.4px` | `1.8px` | 隐藏 |
| `3.5` | 隐藏 | `2.6px` | `5.0px` | `2.9px` | `5.7px` | `1.8px` | 隐藏 |
| `5.5` | 隐藏 | `2.8px` | `5.3px` | `3.1px` | `6.0px` | `2.0px` | `1.8px` |
| `7.0` | `1.8px` | `3.0px` | `5.6px` | `3.3px` | `6.3px` | `2.0px` | `1.8px` |
| `8.5` | `2.0px` | `3.2px` | `6.0px` | `3.5px` | `6.7px` | `2.2px` | `2.0px` |
| `9.5` | `2.2px` | `3.4px` | `6.4px` | `3.7px` | `7.1px` | `2.2px` | `2.0px` |
| `12.0` | `2.4px` | `3.6px` | `7.0px` | `3.9px` | `7.8px` | `2.4px` | `2.2px` |

补充规则：

- 普通航迹在 zoom `<7` 必须隐藏，不能仅依靠缩细解决拥挤。
- selected 航迹在所有 zoom 必须可见。
- 地面实际航迹在 zoom `>=9.5` 使用普通实际航迹宽度；selected 地面段使用 selected 宽度，不另行变粗。
- 触屏设备不增加可见 core 宽度；若航迹可交互，应增加一条透明的 `12-16px` hit area，而不是把视觉线加粗。
- halo 总宽度包含 core。`6.0px halo + 3.2px core` 表示两侧各露出约 `1.4px` 深色 casing。

### 5.2 连续插值

不同 zoom stop 之间必须线性插值，禁止在 `zoom_changed` 时产生明显跳宽。

```javascript
function interpolateTrackWidth(zoom, stops) {
  const z = Math.max(stops[0][0], Math.min(stops.at(-1)[0], zoom));
  for (let i = 0; i < stops.length - 1; i += 1) {
    const [z0, width0] = stops[i];
    const [z1, width1] = stops[i + 1];
    if (z >= z0 && z <= z1) {
      const ratio = (z - z0) / (z1 - z0);
      return width0 + (width1 - width0) * ratio;
    }
  }
  return stops.at(-1)[1];
}
```

推荐 selected core stops：

```javascript
[
  [2.0, 2.4],
  [3.5, 2.6],
  [5.5, 2.8],
  [7.0, 3.0],
  [8.5, 3.2],
  [9.5, 3.4],
  [12.0, 3.6]
]
```

### 5.3 为什么不按地理比例同比加粗

从 zoom `2` 到 `12`，每像素代表的地面距离缩小约 `1024` 倍；若线宽也按地理比例同比增长，高 zoom 航迹会遮挡跑道、滑行道和飞机。标准仅把 selected core 从 `2.4px` 平滑增加到 `3.6px`，用于补偿低 zoom 的整体轮廓阅读与高 zoom 的局部细节阅读，而不是模拟真实航迹走廊宽度。

## 6. 线帽、连接和虚线

### 6.1 实际航迹

| 属性 | 标准 |
| --- | --- |
| `lineCap` | `round` |
| `lineJoin` | `round` |
| Dash | 无 |
| 普通 opacity | `0.62-0.72`，基线 `0.68` |
| selected opacity | `0.92-1.0`，基线 `0.96` |
| Route focus opacity | `1.0` |
| Halo color | `#101010` 或 `rgba(8, 12, 16, 0.32-0.42)` |

圆角连接能减少逐点分段上色时的尖角、缝隙和折线锯齿。相邻实际段颜色变化时，坐标端点必须完全一致，避免露出底图裂缝。

### 6.2 估算段

估算段使用深灰点线或短虚线，不使用高度色阶：

| 属性 | Leaflet | Google Maps |
| --- | --- | --- |
| Color | `#151515` | symbol `strokeColor: #151515` |
| Opacity | `0.58-0.72` | `0.58-0.72` |
| Width | 见第 5 节 | symbol `scale` 随宽度调整 |
| Pattern | `dashArray: "2 8"` | 基线 stroke 透明，symbol `repeat: "12px"` |
| Cap | `round` | 短竖线 symbol 形成点线 |
| Halo | 无 | 无 |

点/划与间隔必须使用屏幕像素，保证缩放后节奏稳定。不得使用米作为 repeat 单位。

### 6.3 计划航路

- Color：`rgba(255, 230, 120, 0.55)` 或 `rgba(230, 230, 230, 0.52)`；
- Dash：`8px 10px`；
- Cap/Join：`round`；
- 层级：低于 estimated 与 actual；
- 只有取得明确飞行计划路径数据后才能显示；不得用起降机场直线冒充计划路径。

## 7. 颜色、对比度与 selected 表达

### 7.1 实际航迹颜色

实际航迹沿用项目高度色阶：地面白色、低空黄/绿、中空青/蓝、高空蓝/紫/红。每两个相邻有效点生成一个 segment，颜色取两点平均高度后连续插值。

### 7.2 对比度

- selected 航迹必须通过深色 halo 保证在浅色地图、云层、道路和水域上的轮廓可见。
- 对理解航迹必需的 core 或 core + halo 组合，应尽量达到相对邻近底图 `3:1` 的有效对比度。
- 白色地面段必须保留深色 halo；黄色低空段在浅色底图上不得取消 halo。
- 不得只用红/绿颜色区别实际与估算、普通与 selected；线型、宽度和层级必须同时提供状态线索。

### 7.3 selected 状态

selected 由以下组合表达：

1. core 比普通航迹宽；
2. 增加深色 halo；
3. z-index 高于普通航迹和普通 marker；
4. selected 飞机图标与呼号标签同步突出；
5. 高度色阶保持不变。

## 8. 图层顺序

从底到顶：

1. 底图与地图样式；
2. 计划航路；
3. 普通短航迹；
4. 普通飞机与普通机场；
5. selected halo；
6. selected actual segments；
7. selected estimated segments；
8. route endpoint pins；
9. selected aircraft icon；
10. selected callsign label；
11. 页面 UI。

实际渲染要求：

- 普通 marker 不得遮挡 selected 航迹；
- estimated segment 位于 halo 之上，但不得覆盖 actual core 的连续部分；
- segment 更新后需要重新执行 selected `bringToFront` 或维护稳定 z-index；
- 航迹应设为 `clickable/interactive: false`；分析模式需要交互时使用独立透明 hit layer。

## 9. 数据质量与断线规则

### 9.1 连接为 actual 的条件

相邻点只有同时满足以下条件才能连接成实际实线：

- 坐标有效且按时间升序；
- 两点均不是 `isEstimated`；
- `quality` 不为 `invalid`；
- 推算地速未超过项目阈值，公务机基线为 `850kt`；
- 时间差未超过 `180s`，或数据源明确说明该区间仍为连续实测。

### 9.2 缺口处理

| 状况 | 线型处理 |
| --- | --- |
| 覆盖缺口且有可信估算 | 深灰点线连接 |
| 时间差 `>180s` 且无估算依据 | 断开，不连线 |
| 推算速度 `>850kt` | 断开并记录异常 |
| 连续 1-3 点缺高度 | 可继承前一有效高度，标记数据质量 |
| 连续缺高度超过 3 点 | 实线保持，但改中性灰 `#9aa0a6` |
| stale 但位置仍可信 | 保持原线型，整体 opacity 乘 `0.72` |
| invalid 坐标跳变 | 断开，不得用虚线掩盖错误 |

## 10. 点数与几何简化

线宽变化不能替代数据简化。不同 zoom 使用不同的可见点密度，但必须保留起点、终点、当前飞机位置、估算段边界和明显转弯。

| Zoom | selected 建议最大可见点 | 普通短航迹最大点 | 重点保留 |
| --- | ---: | ---: | --- |
| `2.0-3.49` | `160` | `0` | 洲际大弧线、起终点 |
| `3.5-5.49` | `260` | `0` | 主要航向变化 |
| `5.5-6.99` | `420` | `0` | 爬升/下降与等待区 |
| `7.0-8.49` | `650` | `40` | 航路转弯与进离场 |
| `8.5-9.49` | `850` | `60` | 盘旋、进近、复飞 |
| `9.5-12.0` | `1000` | `80` | 地面滑行与细小转弯 |

简化规则：

- 优先使用屏幕空间误差做 Douglas-Peucker 简化；
- zoom 越低允许的屏幕误差越大，但建议不超过 `1.5px`；
- 不得跨 actual/estimated 边界简化；
- 不得把跨越国际日期变更线的航迹画成横穿全球的直线；
- 长距离点到点连接建议采用 geodesic，细密实测点可按原始坐标序列绘制。

## 11. 动态刷新行为

- selected 航迹按项目 `2.5s` 刷新节奏增量追加，不能每次闪烁式整层重建。
- 飞机图标可以在相邻实时点间插值；历史 actual trail 只连接已经确认的实测点，不把前端动画插值写回历史数据。
- 新点到达后，上一段由临时显示变为已确认 actual 段；数据源标记 estimated 时才使用点线。
- zoom 变化只更新宽度、可见点集和普通航迹开关，不触发详情接口请求。
- 地图拖动过程中保持现有几何；在 idle 后再裁剪和简化，避免拖动时抖动。
- 同一航迹 segment 应使用稳定 id，更新坐标与 style，避免 DOM/overlay 数量持续增长。

## 12. 渲染器映射

### 12.1 Google Maps

- actual core：分段 `google.maps.Polyline`，设置 `strokeWeight`、`strokeOpacity`、`strokeColor`；
- selected halo：在 core 下方绘制连续深色 polyline；
- estimated：将 polyline 本体 `strokeOpacity` 设为 `0`，通过 `icons[].icon` + `repeat: "12px"` 生成点线；
- 长距离稀疏路径设置 `geodesic: true`；
- 用 `zIndex` 保持计划、普通、halo、actual、estimated 的固定层级。

### 12.2 Leaflet

- actual core：分段 `L.polyline`；
- selected halo：底层连续 `L.polyline`；
- estimated：`dashArray: "2 8"`；
- 统一设置 `lineCap: "round"`、`lineJoin: "round"`；
- `smoothFactor` 只作为渲染简化补充，不能替代业务层保留语义边界的点抽样。

### 12.3 推荐样式 API

```javascript
trackStyleForZoom({
  zoom,
  selected,
  routeFocused,
  estimated,
  planned,
  stale
});
```

返回值至少包括：

```javascript
{
  coreWidth,
  haloWidth,
  coreOpacity,
  haloOpacity,
  dashArray,
  dashRepeat,
  lineCap: "round",
  lineJoin: "round",
  zIndex
}
```

## 13. 1.5 实施状态

当前代码已完成：

- actual 高度分段颜色；
- estimated 深色点线；
- selected halo；
- 普通、selected、Route focus、halo 和 estimated 的 zoom 连续线宽插值；
- Google Maps 与 Leaflet 双渲染器；
- `180s` 缺口、缺高度、invalid 和异常速度判断；
- stale 透明度降级且不改变线型；
- 跨日期变更线分段和 Google geodesic；
- 保留语义边界的 zoom 点数抽样；
- 稳定 segment id 与 diff 更新；
- 普通航迹 zoom `<7` 双重隐藏保护。

后续预留：

1. 分析模式启用航迹 hover 时增加透明 hit layer；
2. 有可信飞行计划路径数据后启用 planned route；
3. 并发航迹规模显著增长后迁移到 Canvas/WebGL；
4. 自动化视觉基线覆盖更多底图主题和移动端尺寸。

## 14. 验收标准

### 14.1 视觉验收

1. zoom `2` 时只显示 selected 航迹，core 约 `2.4px`，不出现普通航迹。
2. zoom `7` 时普通短航迹约 `1.8px`，selected 约 `3.0px + 5.6px halo`。
3. zoom `9.5` 时 selected 约 `3.4px + 6.4px halo`，进近与盘旋细节清晰。
4. zoom `12` 时 selected core 不超过 `3.6px`（Route focus 不超过 `3.9px`），不得遮住滑行道主体。
5. fractional zoom 连续滚动时线宽平滑变化，无跳变、闪烁或断层。
6. 实际段为高度色实线；估算段为深灰点线；计划段为浅色长虚线。
7. selected 后高度颜色不改变，只增加宽度、halo 和层级。
8. 白色/黄色低空段在浅色底图上仍能借助 halo 辨认。

### 14.2 数据与行为验收

1. `>180s` 且无可信估算的缺口断开，不自动直连。
2. estimated 数据只能生成点线，不能进入高度实线。
3. stale 数据降低透明度但保持原线型。
4. 跨日期变更线航迹不横穿整个世界地图。
5. selected 刷新只增量更新变化 segment，overlay 数量不随刷新无限增长。
6. zoom 改变不触发航迹详情接口，只重算样式和可见点。
7. Google Maps 与 Leaflet 在同一 zoom 的可见线宽误差不超过 `0.3px`，虚线节奏视觉一致。

## 15. 参考资料

- [Flightradar24：Why does the aircraft’s trail change colour?](https://support.fr24.com/support/solutions/articles/3000115027-why-does-the-aircraft-s-trail-change-colour-)
- [OGC API - Moving Features - Part 1: Core](https://docs.ogc.org/is/22-003r3/22-003r3.html)
- [OGC Moving Features Access](https://docs.ogc.org/is/16-120r3/16-120r3.html)
- [Google Maps JavaScript API：Shapes and lines](https://developers.google.com/maps/documentation/javascript/shapes)
- [Google Maps JavaScript API：Symbols](https://developers.google.com/maps/documentation/javascript/symbols)
- [Google Maps JavaScript API：PolylineOptions](https://developers.google.com/maps/documentation/javascript/reference/polygon#PolylineOptions)
- [Leaflet Reference：Polyline / Path](https://leafletjs.com/reference.html#polyline)
- [Mapbox Style Specification：Line layer](https://docs.mapbox.com/style-spec/reference/layers/#line)
- [Mapbox：Styling layers with zoom expressions](https://docs.mapbox.com/mapbox-gl-js/guides/styles/style-layers/)
- [W3C WCAG 2.2：Understanding Non-text Contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast)
