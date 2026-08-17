# Selected Aircraft Route Visual Requirements 1.6

> **1.7 灰色边框试验（2026-08-03）：** selected 航线的底层 `halo` 暂时关闭，Google Maps 与 Leaflet 都只绘制彩色航线主体。真实轨迹的高度/速度颜色、黑色估算虚线、端点和 Route 聚焦行为保持不变。实现通过 `routeStyle.haloEnabled = false` 控制，可直接回退。

## 1. 文档定位

本文档定义飞机被选中后，地图中航迹、航线聚焦、端点、选中飞机、标签、图例和详情面板之间的视觉与交互规范。目标是在体验上贴近 Flightradar24 当前网页端的 selected aircraft route 表现，同时确保本系统后续只使用自有公务机运行数据库。

观察日期：2026-08-03。
观察范围：Flightradar24 公共地图页面，选中英国/法国上空航班后，观察默认 selected 状态与详情面板底部 `Route` 模式。
重要限制：本文只复用可观察的产品机制、视觉层级和公开说明，不抓取 Flightradar24 私有接口、代码、账户数据或未授权资产。

参考来源：

- Flightradar24 官方支持文档：`https://support.fr24.com/support/solutions/articles/3000115027-why-does-the-aircraft-s-trail-change-colour-`
- Flightradar24 官方博客：`https://www.flightradar24.com/blog/inside-flightradar24/supercharging-flightradar24s-data-display/`
- Flightradar24 页面实测：`https://www.flightradar24.com/51.47,-0.45/7`
- 当前项目：`docs/route-drawing-requirements-v1.2.md`
- 当前项目：`docs/aircraft-loading-refresh-requirements-v1.4.md`
- 当前项目：`docs/aircraft-track-refresh-continuity-requirements-v1.6.md`

## 2. FR24 关键结论

官方公开信息：

- 点击飞机 icon 后，地图会显示该飞机 flight path。
- 航迹颜色表达飞机在该路径点的高度，而不是 selected 状态本身。
- 低空为白色/黄色；高度增加后进入绿色、浅蓝、深蓝、紫色、红色。
- 黑色虚线表示飞机在覆盖区外，当前位置由系统估算。
- FR24 网站已使用 WebGL 渲染飞机 icon 和 flight path，以支持更高粒度的轨迹点展示。
- FR24 当前实时数据刷新约为 `2-3s`，selected 飞机详情面板和地图位置应跟随更新。

页面实测信息：

- 默认点击飞机后，左侧详情面板打开，selected 飞机留在地图上方层级。
- selected 飞机 icon 进入红/粉红强调状态，旁边显示白底黑字呼号标签。
- selected 航迹为一条连续的高度色阶曲线，线段颜色随历史高度变化；并没有把整条线统一改为红色。
- 普通地图状态下，其他飞机仍可显示；selected 航迹在普通飞机之上。
- 点击左侧详情面板底部 `Route` 后，地图自动缩放/平移到完整航段视野。
- `Route` 聚焦模式下，非相关飞机基本隐藏或显著降噪，仅保留 selected 飞机、航迹、起降端点和必要地图标注。
- 航迹从起飞机场延伸到当前飞机位置；未观察到未来计划航线被作为同样色阶线绘制到目的地。
- 起飞机场和目的地附近显示黄色 pin/端点标记，用于表达 route endpoint。
- hover selected 航迹线时，实测未出现常驻航迹段 tooltip；速度/高度细节主要通过左侧详情面板和图表入口承载。

## 3. 产品目标

1.6 目标：

- 选中飞机后立即显示 selected 航迹。
- selected 航迹默认按高度分段上色，不整条改红。
- `Route` 模式提供航段聚焦视图，自动 fit bounds 并降低无关飞机/机场干扰。
- selected 航迹、selected 飞机 icon、白底呼号标签、左侧详情面板同步变化。
- 起降端点必须可视，并与 selected 航迹形成完整航段结构。
- 黑色虚线只用于估算路径或信号缺口，不用于真实历史航迹。
- 轨迹刷新随 selected 飞机的 `2-3s` 数据节奏增量更新。

## 4. Selected 状态结构

### 4.1 默认选中状态

用户点击飞机 icon 后：

- 打开左侧飞机详情面板。
- selected 飞机 icon 进入红/粉红强调状态。
- selected 飞机呼号显示为白色圆角标签，黑色文本。
- 地图显示该飞机历史航迹，航迹从历史点延伸到当前飞机位置。
- 普通飞机可以保留显示，但 selected 航迹必须在普通飞机和普通机场之上。
- selected 飞机即使离开当前 viewport，也应按 1.5 规则保留一段时间。

### 4.2 Route 聚焦状态

用户点击详情面板底部 `Route`：

- `Route` 控件进入黄色 active 状态。
- 地图自动 fit selected route bounds。
- 视野内必须同时包含起点、当前飞机、目的地端点；若航段过长，可优先包含实际已飞路径与当前飞机，再以端点 pin 提示目的地。
- 无关飞机默认隐藏或降到极低优先级。
- 无关机场默认隐藏，仅保留 selected 航段端点、当前飞机附近关键机场和地图底图标注。
- 航迹线维持高度色阶，不因进入 Route 模式改为单色。
- Route 模式再次关闭后，回到普通 selected 地图状态。

## 5. 航迹语义

### 5.1 实际已飞航迹

实际已飞航迹是 selected 状态的主视觉：

- 数据来源：自有数据库中的历史轨迹点。
- 范围：从起飞后第一个有效点，到当前最新定位点。
- 颜色：高度色阶。
- 线型：实线。
- 层级：高于普通航迹和普通 marker，低于 selected 飞机 icon/label。
- 方向表达：不额外绘制箭头，当前飞机 icon 的航向表达方向。

### 5.2 估算航路

估算航路只用于信号缺失、覆盖区外或推算位置：

- 颜色：黑色或极深灰。
- 线型：点状或短虚线。
- 不参与高度色阶。
- 层级低于实际已飞航迹，但仍属于 selected route layer。
- tooltip/详情中必须标记 `Estimated` 或 `Coverage gap`。

### 5.3 未来计划航线

FR24 实测 selected route 中未将未来计划航线绘制为同等高度色阶线。因此本系统要求：

- 已飞历史航迹仍是 selected route 主视觉。
- 1.8 起，若当前航线目的地机场坐标已知，绘制飞机当前实时位置到目的地机场的独立 planned route。
- 若目的地未知、目的地机场坐标缺失或当前实时位置无效，不绘制该 planned route。
- planned route 必须使用浅灰/浅黄长虚线，不能使用高度色阶，避免用户误认为已飞轨迹。
- planned route 不写入历史航迹点，不参与高度/速度图表。

## 6. 高度色阶

selected 航迹默认使用高度色阶。每两个相邻轨迹点生成一个 segment，线段颜色取该段起点/终点高度的平均值或加权插值。

| 高度范围 | 英尺范围 | 视觉颜色 | 建议色值 |
| --- | --- | --- | --- |
| 地面/极低空 | `<300ft` | 白色 | `#ffffff` |
| 低空 | `300-1,000ft` | 白到亮黄 | `#ffffff -> #fff200` |
| 爬升初段 | `1,000-13,100ft` | 黄到黄绿 | `#fff200 -> #b9e63a` |
| 中低空 | `13,100-19,700ft` | 绿到浅蓝 | `#67d965 -> #25c9c7` |
| 中高空 | `19,700-36,100ft` | 浅蓝到深蓝 | `#21b7ef -> #2d46d0` |
| 高空 | `36,100-41,000ft` | 深蓝到紫色 | `#3f31bf -> #8b2ab0` |
| 超高空 | `41,000-42,600ft` | 紫红到红 | `#b62b82 -> #e53644` |
| 极高空 | `>42,600ft` | 红色 | `#ff3a2f` |

要求：

- 色阶必须连续插值，禁止离散突变。
- selected 状态不覆盖高度颜色。
- 起飞/进近低空段在 Route 模式下应清晰显示为白/黄。
- 巡航段应显示蓝/紫/红等高空颜色。
- 高度缺失时该段使用中性灰 `#9aa0a6` 或继承上一有效高度；连续缺失超过 3 个点必须转为中性灰。

## 7. 线型标准

### 7.1 selected 实际航迹

| 参数 | 普通 selected | Route 聚焦 |
| --- | --- | --- |
| Core width | `2.8-3.2px` | `3.2-3.6px` |
| Halo width | `5-6px` | `6-7px` |
| Core opacity | `0.9-0.98` | `0.95-1.0` |
| Halo opacity | `0.25-0.38` | `0.3-0.42` |
| Line cap | `round` | `round` |
| Line join | `round` | `round` |
| Dash | 无 | 无 |

Halo 建议使用深色半透明描边：

```css
rgba(8, 12, 16, 0.32)
```

Halo 只用于增强地图对比度，不表达 selected 颜色语义。

### 7.2 estimated 估算段

| 参数 | 标准 |
| --- | --- |
| Color | `#111111` 或 `#1a1a1a` |
| Width | `2-2.4px` |
| Opacity | `0.58-0.72` |
| Dash | `2px 8px` 或点状 repeat |
| Halo | 无或极弱 |

### 7.3 planned route

| 参数 | 标准 |
| --- | --- |
| Color | `rgba(255, 230, 120, 0.55)` 或 `rgba(230, 230, 230, 0.5)` |
| Width | `2px` |
| Dash | `8px 10px` |
| Opacity | `0.45-0.6` |
| 默认状态 | 目的地已知时显示 |

1.8 当前实现：

- 目的地机场坐标已知时，从 selected 飞机当前实时位置连接到目的地机场。
- 目的地未知时完全不绘制 planned route。
- 该线不参与高度/速度色阶，不写入 `selectedTrackStore.mergedPoints`。

## 8. 端点视觉

selected route 需要明确表达航段端点。

起飞机场：

- 使用黄色 pin 或黄色 airport marker。
- 尺寸约 `24-30px`。
- 层级高于航迹线，低于 selected 飞机 label。
- 可显示机场代码 tooltip 或 hover label。

目的地机场：

- 与起飞机场使用同类黄色 pin。
- 如果当前视图无法同时容纳目的地，可在 Route 模式 fit bounds 时优先纳入。
- 不把目的地与未来航线误连成高度色阶。

当前飞机：

- 使用 selected aircraft icon。
- 图标色彩为红/粉红强调。
- 图标 z-index 必须高于航迹、端点 pin、普通飞机。
- 呼号标签为白底黑字，位于飞机 icon 附近，不遮挡当前航迹主方向。

## 9. 图层顺序

从底到顶：

1. Google Maps / fallback basemap。
2. 地图灰度/对比遮罩。
3. 普通机场 layer。
4. 普通飞机 layer。
5. 普通短航迹 layer。
6. selected route halo。
7. selected actual route colored segments。
8. selected estimated dotted segments。
9. selected route endpoint pins。
10. selected aircraft icon。
11. selected aircraft callsign label。
12. 左侧详情面板、底部工具、右侧面板等 UI。

要求：

- selected 航迹不得被普通飞机遮挡。
- selected 呼号标签不得被普通飞机 label 遮挡。
- selected route endpoint pin 不得遮挡 selected aircraft icon。
- 右侧业务面板、左侧详情面板永远在地图图层之上。

## 10. 缩放与视野

### 10.1 普通 selected 状态

| Zoom 范围 | selected 航迹 |
| --- | --- |
| `<3.5` | 只显示 selected 航迹；点数简化但保持大弧线形状 |
| `3.5-5.49` | 显示 selected 主航迹；线宽保持屏幕像素稳定 |
| `5.5-8.49` | 显示完整 selected 航迹；地面细节可按性能简化 |
| `>=8.5` | 显示地面/进近/转弯细节，保留更多轨迹点 |

### 10.2 Route 聚焦状态

Route 聚焦时：

- 地图自动 fit route bounds。
- 左侧详情面板宽度需要参与 padding 计算，避免航迹被面板遮挡。
- 如果有右侧信息面板打开，也参与 padding。
- 自动缩放不低于 `2.2`，不高于 `9.5`，除非航段极短。
- fit bounds 后，线宽仍保持屏幕像素稳定，不随 zoom 无限制变粗。

建议 padding：

```javascript
{
  left: 410,
  right: 48,
  top: 74,
  bottom: 78
}
```

## 11. 数据模型

selected route 数据由 `513009 查询指定行程的飞行轨迹` 或后续升级接口提供。

```javascript
{
  "uniqueKey": "1099706732310953984",
  "selectedRouteVersion": "route_20260803_001",
  "serverNowEpochMs": 1785730400000,
  "departureAirport": {
    "icao": "LFML",
    "iata": "MRS",
    "lat": 43.4393,
    "lng": 5.2214
  },
  "arrivalAirport": {
    "icao": "EGCC",
    "iata": "MAN",
    "lat": 53.3537,
    "lng": -2.275
  },
  "currentPosition": {
    "lat": 51.6491,
    "lng": 0.0869,
    "course": 316
  },
  "points": [
    {
      "lat": 43.4393,
      "lng": 5.2214,
      "timestamp": 1785726000000,
      "altitudeFt": 300,
      "groundSpeedKt": 150,
      "heading": 312,
      "source": "ADS-B",
      "quality": "good",
      "isEstimated": false
    }
  ],
  "estimatedSegments": [
    {
      "fromIndex": 48,
      "toIndex": 49,
      "reason": "coverage_gap"
    }
  ]
}
```

字段要求：

- `points` 必须按时间升序。
- `altitudeFt` 是 selected 航迹颜色的主字段。
- `isEstimated` 或 `quality === "estimated"` 用于生成黑色虚线。
- 相邻点时间差超过 `180s`，默认切换为 estimated/interrupted gap 虚线。
- 相邻点速度异常时，不绘制为高度色实线，需要标记 weak/estimated/interrupted gap 并使用虚线连接。
- 端点机场坐标缺失时，可使用机场库坐标补齐。

## 12. 渲染策略

### 12.1 Google Maps 当前阶段

短期可以继续使用 `google.maps.Polyline` 分段实现：

- 每两个相邻点生成一个 colored segment。
- selected halo 用底层粗 polyline。
- colored segment 在 halo 上方。
- estimated segment 使用 Google Maps `icons.repeat` 或 dash 模拟。
- route endpoint 使用当前 airport pin 组件的 selected-route variant。

### 12.2 Canvas/WebGL 目标阶段

FR24 已使用 WebGL 绘制 flight paths。若本系统 selected route 点数和并发量上升，应迁移：

- selected route 和普通 route 进入 WebGL/canvas layer。
- selected aircraft、hover label、详情面板继续保留 DOM/AdvancedMarker。
- 支持高频 append segment，不每次重建完整 polyline。
- 支持 point-level granularity，尤其是地面滑行、转弯和进近阶段。

## 13. 交互规范

### 13.1 点击飞机

- 立即进入 selected 状态。
- 打开左侧详情面板。
- 请求或读取 selected route 数据。
- 先使用已有短轨迹显示，再用 `513009` 返回完整轨迹替换。
- 若轨迹加载失败，保留 selected 飞机和当前短轨迹，不清空地图。

### 13.2 点击 Route

- 切换到 route focus。
- `Route` 按钮黄色 active。
- 地图 fit bounds。
- 隐藏或弱化非相关飞机。
- 显示起点/终点 pin。
- 保留 selected 飞机实时移动。

### 13.3 关闭 Route

- 保持飞机 selected。
- 地图回到用户当前缩放/位置，不强制 reset。
- 恢复普通飞机/机场图层。
- selected 航迹仍显示，除非用户关闭 trails。

### 13.4 Hover 航迹

FR24 页面实测中，selected 航迹 hover 未出现常驻 tooltip。因此 1.6 基线：

- 不默认显示大型 tooltip。
- 不在航迹线上常驻显示采样点圆点。
- 可在后续分析模式中启用轻量 tooltip，内容包括时间、高度、速度、坐标、source。
- tooltip 不得遮挡 selected 飞机 icon 或呼号标签。

## 14. 详情面板联动

左侧详情面板必须与地图 selected route 同步：

- 顶部显示航班/呼号/机型/运营方。
- 中部 route card 显示起降机场。
- 进度条表达已飞距离/剩余距离。
- `Speed & Altitude graph` 作为航迹数据入口。
- 当前高度、地速、航向、经纬度每 `2-3s` 更新。
- Route active 状态应在底部工具栏中明确显示。

后续增强：

- 图表 hover 某个时间点时，地图航迹高亮对应 segment。
- 地图 hover segment 时，图表同步定位。
- 但默认 selected route 视觉不依赖 tooltip。

## 15. 与当前项目差距

当前 1.5 已具备：

- selected 飞机保留。
- 高度/速度色阶基础。
- selected 航迹 halo。
- 估算段虚线基础。
- 轨迹点采样上限。

仍需补齐：

- Route focus 模式。
- 起点/终点 route endpoint pin。
- clicked selected 状态与 Route active 状态分离。
- 无关飞机/机场在 Route focus 中隐藏或降噪。
- 未来 planned route 仅在目的地机场坐标已知时绘制；目的地未知时不绘制。
- selected route fit bounds padding。
- selected route incremental append，而不是全量重绘。
- 航迹 hover 从基线中关闭，作为分析模式预留。

## 16. 验收标准

1. 点击飞机后，selected 航迹立即显示，且颜色按高度变化。
2. selected 航迹不得整条变为红色。
3. 高空巡航段显示蓝/紫/红，低空起降段显示白/黄。
4. 覆盖缺口或估算段显示黑色/深灰虚线。
5. selected 飞机 icon 为红/粉红强调，并显示白底黑字呼号标签。
6. selected 航迹层级高于普通飞机和普通机场。
7. 点击 Route 后地图自动 fit 起点、当前飞机、目的地端点。
8. Route focus 中无关飞机和机场显著降噪。
9. 起点/终点显示黄色 pin，pin 不遮挡 selected 飞机。
10. 关闭 Route 后仍保持飞机 selected，但恢复普通地图图层。
11. selected route 每 `2-3s` 随飞机位置更新，不出现明显跳变。
12. 1000 个 selected route 点以内渲染不卡顿。
13. zoom 变化时 selected route 线宽保持屏幕像素稳定。
14. 关闭 trails 后 selected route 隐藏，但 selected 飞机和详情面板保留。
15. 手机端 route focus 不被左侧详情面板遮挡，自动 padding 生效。

## 17. 1.6 实施建议

- 新增 `state.routeFocusAircraftId`。
- 新增 `setRouteFocus(enabled)`。
- 新增 `selectedRouteEndpointMarkers`。
- 将 `setTrack(id, points, selected)` 升级为 `setSelectedRoute(id, routePayload, options)`。
- Google Maps 下继续用分段 polyline，先满足视觉和交互。
- 为 WebGL/canvas 留出 `RouteRenderer` 接口。
- 将 hover tooltip 移到后续分析模式，不作为 1.6 默认行为。
