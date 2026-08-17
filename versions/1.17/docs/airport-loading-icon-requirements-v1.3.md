# Airport Loading and Icon Requirements 1.3

## 1. 文档定位

本文档用于定义地图中机场坐标、机场图标、机场标签、机场刷新与点选交互的 1.3 需求。目标是在交互视觉和地图密度控制上贴近 Flightradar24 的机场层体验，同时确保后续数据来自本系统自有数据库。

观察日期：2026-08-03。
观察范围：Flightradar24 公共地图页面，以英国伦敦/英格兰区域在 zoom 3-12 的页面行为为主要样本。
重要限制：本文只复用可观察的交互规范和视觉规则，不抓取 Flightradar24 私有数据、接口、代码或未授权资产。生产实现应使用自有机场数据库、授权地图服务和自有图标素材。

参考来源：

- Flightradar24 官方支持文档：`https://support.fr24.com/support/solutions/articles/3000115501-what-are-the-blue-points-on-the-map-`
- Flightradar24 官方博客：`https://www.flightradar24.com/blog/inside-flightradar24/new-flightradar24-com-label-options/`
- Flightradar24 官方博客：`https://www.flightradar24.com/blog/inside-flightradar24/new-flightradar24-features-airport-information-panels-new-weather-layers-and-better-email-alerts/`
- Flightradar24 官方博客：`https://www.flightradar24.com/blog/inside-flightradar24/supercharging-flightradar24s-data-display/`
- Flightradar24 Terms of Service：`https://www.flightradar24.com/terms-of-service`

## 2. FR24 机场层关键结论

官方说明和页面实测可以归纳为以下规则：

- FR24 的蓝色机场点表示有常规每日定期客运航班、且通常处于 FR24 覆盖区域内的机场。
- FR24 不会在主地图展示所有机场；原因是全球机场数量巨大，全部展示会遮盖地图。
- 机场 marker 的显示可在地图 Settings 中调整，可理解为 `auto / on / off` 类型的可见性控制。
- 点击机场 pin 或搜索机场后，地图会以机场为中心，并打开左侧机场信息面板。
- 机场信息面板首屏默认展示 Arrivals，支持切换 Departures、On ground，并可进入完整机场数据页面。
- 新版机场 pin 支持标签分级：高 zoom 显示机场全名 + IATA + ICAO，中等 zoom 只显示代码，更低 zoom 只显示 pin。
- 鼠标 hover 到机场 pin 时应显示机场名称与代码。
- FR24 当前页面使用 Google Maps 和 WebGL 覆盖层。页面观察中存在 `fr24-webgl-overlay` canvas，说明飞机、航迹和机场覆盖层不依赖普通 DOM marker 堆叠。
- FR24 已转向矢量底图和 WebGL 渲染，官方说明中提到平移缩放更顺滑，传统固定 zoom 级别被弱化。因此本系统阈值应支持小数 zoom，并用渐进过渡避免跳变。

## 3. 本系统机场展示对象

### 3.1 默认机场层

默认机场层需要贴近 FR24 的地图洁净度，首屏不展示全球所有机场。

默认纳入：

- 定期客运机场。
- 主要公务机运行机场。
- 主要国际枢纽。
- 有实时运行动态、地面飞机、机场天气、跑道和航班板数据的机场。

默认不纳入低 zoom 展示：

- 小型私人机场。
- 直升机场。
- 纯训练机场。
- 未校验坐标或缺少基础信息的机场。

这些机场可以在高 zoom 或后续专业筛选模式中显示，但不能污染默认全球视图。

### 3.2 机场等级

建议为机场增加 `displayLevel`，用于控制 zoom 下的显示密度。

| 等级 | 名称 | 示例判断 | 默认用途 |
| --- | --- | --- | --- |
| `1` | Global hub | 国际枢纽、超高流量、重点公务机枢纽 | 低 zoom 可显示 |
| `2` | Major airport | 大型国际/区域机场、重点商务机场 | 中低 zoom 可显示 |
| `3` | Regional airport | 区域机场、常规商务航点 | 中 zoom 可显示 |
| `4` | Local business airport | 小型商务机场、支线机场 | 中高 zoom 可显示 |
| `5` | Private / heliport / special | 私人机场、直升机场、专用机场 | 高 zoom 或筛选后显示 |

`displayLevel` 应由多个字段综合计算，不应只按跑道长度或航班数：

- 定期航班量。
- 公务机起降量。
- 机场是否有 FBO。
- 跑道长度和公务机适配能力。
- 是否为首都、金融中心、旅游目的地机场。
- 用户收藏、当前搜索、当前点选优先级。

## 4. 缩放加载规范

FR24 官方没有公开精确 zoom 阈值。以下阈值为页面观察 + 官方分级逻辑转化后的实现要求，用于本系统落地。

### 4.1 Zoom 分级表

| Zoom 范围 | 机场显示 | 标签显示 | 单视口上限 | 刷新策略 |
| --- | --- | --- | --- | --- |
| `<3.5` | 默认隐藏普通机场；只保留 selected、favorite、搜索结果 | 无标签 | 50 | 不主动加载机场，仅保留状态对象 |
| `3.5-5.49` | 仅 `displayLevel <= 1` | pin only | 120 | idle 后请求 bbox，低频刷新 |
| `5.5-6.49` | `displayLevel <= 2` | pin only | 350 | idle 后请求 bbox，优先缓存 |
| `6.5-6.99` | `displayLevel <= 3` | pin only | 650 | idle 后请求 bbox，差量更新 |
| `7.0-8.49` | 显示当前视口内所有可用机场，包含 `displayLevel 5` 小机场 | pin only | 不做前端截断，请求上限默认 50000 | 约 50km 比例尺起进入全机场 pin 模式 |
| `8.5-9.49` | 显示当前视口内所有可用机场 | pin only；selected/hover 可显示 tooltip | 不做前端截断，请求上限默认 50000 | 进入城市群视图，pin 必须保留，标签启用碰撞剔除 |
| `9.5-10.49` | 显示当前视口内所有可用机场 | 主要机场显示 IATA/ICAO 代码 | 不做前端截断，请求上限默认 50000 | 标签单独碰撞计算 |
| `10.5-11.49` | 显示所有视口内可用机场 | 主要机场显示代码；hover/selected 显示完整名称 | 2200 | 细节层加载，详情仍懒加载 |
| `>=11.5` | 显示所有视口内机场和专业机场 | 高等级机场可显示完整名称 + IATA + ICAO；低等级显示代码或 pin | 3000 | 可加载机场边界/跑道概览 |

### 4.1.1 50km 比例尺补充规则

FR24 在远距离缩放下会控制机场密度，避免全球视图被机场点覆盖；但进入约 50km 比例尺时，用户已经处于区域/城市群观察场景，应能看到当前视口内全部机场 pin。本项目将 Google zoom `7.0` 作为 50km 触发阈值：

- `zoom < 7.0`：继续按 `displayLevel` 和数量上限做密度控制。
- `zoom >= 7.0`：`displayLevelMax = 5`，当前视口内所有机场均可进入渲染队列。
- `zoom >= 7.0`：机场 pin 不再被 Google Advanced Marker 的碰撞优先级隐藏；仅机场标签继续做碰撞剔除。
- `zoom >= 7.0`：小型机场图标必须有可见尺寸，不能用 `0 x 0` 尺寸实现隐藏。

### 4.2 连续缩放与滞后

为了贴近 FR24 新版平滑缩放体验：

- 不使用纯整数 zoom 作为唯一开关。
- 使用小数 zoom 阈值。
- 每个阈值增加 `0.15` 的滞后区间，避免滚轮缩放时机场闪烁。
- 新进入层级的机场使用 `120-180ms` opacity fade-in。
- 退出层级的机场使用 `80-120ms` fade-out 后移除。
- marker 尺寸不随每一次滚轮事件连续放大，除非用户开启 icon size slider；默认以机场等级决定尺寸。

### 4.3 页面实测记录

以英国区域为样本，页面观察结果如下：

| 样本 zoom | Google scale | 观察到的机场层行为 |
| --- | --- | --- |
| `3` | 约 1000 km | 大范围全球/洲际视野，机场层应极度收敛或隐藏 |
| `4` | 约 500 km | 仍属于大范围视图，仅适合显示全球级枢纽 |
| `5` | 约 200 km | 可开始显示主要国家级/区域枢纽，但应保持低密度 |
| `6` | 约 100 km | 已可见大量蓝色机场 pin，无文本标签 |
| `7` | 约 50 km | 机场 pin 密度明显增加，仍以 pin only 为主 |
| `8` | 约 20 km | 城市群/区域视图，机场 pin 保持固定像素尺寸 |
| `9` | 约 10 km | 城市周边视图，机场 pin 继续显示，标签受设置与碰撞影响 |
| `10` | 约 5 km | 主机场 pin 更明显，小机场仍保持较小尺寸 |
| `11` | 约 2 km | 机场周边视图，主机场 pin 约 26-34px 级别 |
| `12` | 约 1 km | 机场本场细节，pin 不再随底图无限放大 |

低 zoom 的精确截图在部分采样中受广告和页面渲染影响未稳定保存，因此 `<6` 阈值按官方“只显示必要机场以保持地图干净”的原则制定。

## 5. 机场刷新规范

### 5.1 地图事件触发

机场数据不需要像飞机一样高频刷新。机场基础坐标相对静态，动态机场信息应懒加载。

触发规则：

- `map.dragstart`：暂停机场请求，仅移动现有 marker。
- `map.drag`：不重建机场 marker，不发请求。
- `map.zoom_changed`：只更新可见层级和 label 状态，不立即请求详情。
- `map.idle`：停止拖拽/缩放后 `300-500ms` 发起视口机场请求。
- `map.resize`：按新 bbox 和 zoom 重新筛选缓存数据。
- `selectedAirport`：不受 zoom 隐藏规则影响，只要坐标在视口内必须显示。

### 5.2 缓存与请求

机场层需要拆成三类数据：

| 数据类型 | 内容 | TTL | 加载方式 |
| --- | --- | --- | --- |
| Static airport index | 坐标、名称、IATA、ICAO、等级、类型 | 24h-7d | 首次或后台缓存 |
| Viewport airport markers | 当前 bbox 内可展示机场简表 | 5-30min | idle 后按 bbox 请求 |
| Airport live summary | 天气、地面飞机数、今日到离港、延误指数 | 60-300s | 点选或高 zoom 后加载 |

请求 bbox 必须加缓冲区：

- 默认 bbox buffer 为当前视口宽高的 `25%`。
- 快速拖拽时 buffer 可临时增加到 `50%`。
- 如果新视口仍在缓存 buffer 内，不发起新请求，只重算可见机场。

### 5.3 增量更新

机场 marker 更新必须使用 diff：

- 新增：创建 marker，并 fade-in。
- 更新：只更新变化字段，如等级、label、动态状态。
- 移除：fade-out 后销毁。
- 保留：坐标、尺寸、z-index 不重建。

禁止在每次拖拽、缩放或刷新时清空全部机场 marker 再重建。

## 6. 机场 icon 绘制规范

### 6.1 基础造型

机场 icon 采用 FR24 观察到的蓝色 pin 方案，但实现应使用自有 SVG/canvas 绘制：

- 外形：地图针形，圆润上半部 + 下方尖角。
- 填充：中等蓝灰色，建议 `#5e86ad` 到 `#6f98bf`。
- 外描边：白色，`1-1.5px`。
- 内部符号：白色塔台/机场控制塔图形。
- 阴影：深色柔和投影，`0 1px 2px rgba(0,0,0,0.35)`。
- 锚点：底部尖角中心对齐机场经纬度。
- 不使用 FR24 商标、logo 或未授权原始图标资源。

### 6.2 尺寸等级

页面截图像素测量显示，机场 pin 不是所有机场完全同尺寸。建议按机场等级分三档。

| 尺寸档 | 适用机场 | 视觉尺寸 | 点击热区 | 锚点 |
| --- | --- | --- | --- | --- |
| `major` | `displayLevel 1-2`、selected、favorite | `28 x 36px` | `40 x 44px` | `(14, 35)` |
| `medium` | `displayLevel 3-4` | `22 x 28px` | `36 x 40px` | `(11, 27)` |
| `small` | `displayLevel 5` 或低优先级机场 | `16 x 21px` | `32 x 34px` | `(8, 20)` |

实测参考：

- zoom 6-9 观察到大量小型机场 pin，蓝色填充区域多落在 `10-16px` 宽、`12-21px` 高。
- zoom 10-12 观察到主机场 pin 约 `26-27px` 宽、`34px` 高。
- 图标视觉尺寸应主要由机场等级决定，而不是随 zoom 无限放大。
- 低 zoom 下通过隐藏低等级机场降低密度，而不是把所有 icon 缩小到不可点。

### 6.3 Zoom 尺寸微调

为了在 FR24 风格和可读性之间平衡：

| Zoom 范围 | major | medium | small |
| --- | --- | --- | --- |
| `<5.5` | `22 x 28px` | 不显示 | 不显示 |
| `5.5-7.49` | `24 x 31px` | `18 x 23px` | 不显示 |
| `7.5-9.49` | `26 x 34px` | `20 x 26px` | `15 x 20px` |
| `>=9.5` | `28 x 36px` | `22 x 28px` | `16 x 21px` |

微调规则：

- 尺寸变化必须加 `scale` 过渡，不改变 marker 锚点。
- selected 机场在当前档位基础上放大 `1.08-1.12` 倍。
- hover 机场可以放大 `1.04` 倍，动画 `80-120ms`。
- 在移动端默认降低一级尺寸，但点击热区不得小于 `36 x 36px`。

## 7. 标签规范

### 7.1 标签层级

标签遵循 FR24 官方说明的三段式：

- 高 zoom：完整机场名称 + IATA + ICAO。
- 中 zoom：仅显示 IATA/ICAO 代码。
- 低 zoom：仅显示机场 pin。
- hover：无论当前 zoom 标签是否常驻，都显示名称 + IATA/ICAO tooltip。

本系统建议实现：

| Zoom 范围 | 默认标签 | Hover 标签 | Selected 标签 |
| --- | --- | --- | --- |
| `<8.5` | 无 | 名称 + IATA/ICAO | IATA/ICAO |
| `8.5-9.49` | 无或仅 major 代码 | 名称 + IATA/ICAO | 名称 + IATA/ICAO |
| `9.5-10.49` | major 显示 IATA，medium 可显示 ICAO | 名称 + IATA/ICAO | 完整标签 |
| `10.5-11.49` | major 完整，medium 代码 | 完整标签 | 完整标签 |
| `>=11.5` | major/medium 完整，small 代码 | 完整标签 | 完整标签 |

### 7.2 标签视觉

- 字体：系统无衬线，`11-12px`。
- 字重：`600`。
- 字色：白色或近白。
- 背景：半透明深灰 `rgba(27, 31, 36, 0.78)`。
- 圆角：`4px`。
- 高度：`20-24px`。
- 内边距：水平 `6-8px`。
- 标签与 pin 间距：`4px`。
- 标签不应覆盖飞机 icon；飞机 icon 层级优先。

### 7.3 碰撞规则

标签必须独立碰撞检测：

- selected 标签最高优先级，永不被普通标签遮挡。
- hover 标签临时最高优先级。
- favorite 机场优先级高于普通机场。
- `displayLevel` 越低优先级越低。
- 同级按 `trafficScore` 排序。
- 标签之间最小间距 `4px`。
- pin 与 pin 之间允许轻微密集，但点击热区不能完全重叠；重叠时保留高优先级机场。

## 8. 图层层级

地图从下到上：

1. Google Maps/vector basemap。
2. 地图灰度/暗色遮罩层。
3. 机场覆盖层。
4. 航迹与天气等半透明分析层。
5. 飞机 icon 层。
6. selected 飞机/selected 机场层。
7. hover tooltip 和左侧详情面板。

机场 icon 必须在地图拖拽、缩放、resize 时与经纬度锁定，不允许屏幕坐标漂移。

## 9. 机场交互规范

### 9.1 Hover

- hover 延迟：`100-150ms`。
- tooltip 展示：机场名称、IATA、ICAO。
- icon 轻微放大或提升亮度。
- hover 不触发详情接口。

### 9.2 Click

点击机场 marker 后：

- 机场进入 selected 状态。
- 地图平滑居中到机场坐标。
- 左侧打开机场信息面板。
- 当前 selected 机场不受 zoom 阈值隐藏影响。
- 机场详情接口懒加载，不在首屏批量加载。

面板默认结构：

- Header：机场名称、IATA、ICAO、所在城市/国家、当地时间、UTC 偏移。
- Tabs：Arrivals、Departures、On ground、Weather、Runways。
- Arrivals/Departures：航班号/呼号、机型、始发/到达、计划时间、预计时间、状态。
- On ground：当前地面飞机、停场时长、机型、注册号或加密标识。
- Weather：METAR、能见度、温度、风向风速、气压、露点。
- Runways：跑道号、长度、方向、材质、是否适配主流公务机。

### 9.3 Search

搜索机场后与点击 pin 一致：

- 机场进入 selected 状态。
- 地图居中。
- 面板打开。
- 若当前 zoom 过低，仍显示 selected pin 和 selected label。

## 10. 数据接口需求

### 10.1 视口机场接口

本项目当前仅使用已提供的 `513008` 到 `513011` 四个接口。机场视口加载能力通过升级 `513008` 支持以下可选参数实现：

```javascript
{
  "pid": "513008",
  "north": 52.9,
  "south": 50.1,
  "west": -1.9,
  "east": 1.4,
  "zoom": 8.3,
  "airportLayerMode": "auto",
  "maxAirports": 50000,
  "displayLevelMax": 5,
  "includeLabels": true,
  "selectedAirportCode": "LHR",
  "businessJetOnly": false
}
```

当 `zoom >= 7.0`，机场视口请求必须使用：

- `displayLevelMax: 5`
- `maxAirports: 50000` 或服务端允许的等价高上限
- `airportScope: "viewport"`
- 若飞机请求为了全缩放飞机图标使用全球范围，仍需额外传入 `airportNorth`、`airportSouth`、`airportWest`、`airportEast` 表示机场独立视口范围。

返回：

```javascript
{
  "serverNowEpochMs": 1785727800000,
  "cacheTtlMs": 300000,
  "bounds": {
    "north": 52.9,
    "south": 50.1,
    "west": -1.9,
    "east": 1.4
  },
  "airports": [
    {
      "airportId": "EGLL",
      "iata": "LHR",
      "icao": "EGLL",
      "name": "London Heathrow Airport",
      "city": "London",
      "country": "United Kingdom",
      "lat": 51.4700,
      "lng": -0.4543,
      "displayLevel": 1,
      "trafficScore": 98,
      "businessJetScore": 82,
      "airportType": "commercial",
      "hasScheduledPassenger": true,
      "hasFbo": true,
      "markerSize": "major",
      "labelMode": "code"
    }
  ],
  "removedAirportIds": []
}
```

### 10.2 机场详情接口

继续使用或升级 `513010 查询指定机场信息`。

详情接口必须点选后调用，禁止首屏批量调用所有机场详情。

必要字段：

- 基础信息：名称、IATA、ICAO、坐标、城市、国家、时区、海拔。
- 天气：METAR、TAF、温度、露点、风、能见度、气压。
- 跑道：跑道编号、长度、宽度、材质、方向。
- 运行动态：到港、离港、地面飞机。
- 公务机增强字段：FBO、适配机型、机库/停机位能力、海关/CIQ、噪音限制、夜航限制。

## 11. 性能验收

| 指标 | 目标 |
| --- | --- |
| 首屏机场 marker 渲染 | 低于 `300ms`，不阻塞地图交互 |
| 地图 idle 后机场请求发起 | `300-500ms` debounce |
| 单次 marker diff 更新时间 | `<=50ms` |
| 单视口机场 marker 数 | 按 zoom 上限控制，不超过 `3000` |
| 标签碰撞计算 | `<=16ms`，可分帧 |
| 机场详情首包 | 点击后 `<=800ms` 有骨架屏或缓存结果 |
| 拖拽期间 FPS | 桌面端目标 `50-60fps` |

## 12. 实现建议

- Google Maps 模式优先使用 `AdvancedMarkerElement` 或 WebGL overlay；大量机场时使用 canvas/WebGL 批绘制。
- 本地 fallback 地图使用同一套 spatial index 和 collision engine，避免双实现规则不一致。
- 使用 R-tree、RBush、H3、geohash 或 quadkey 建立空间索引。
- airport marker 和 aircraft marker 使用不同 renderer 队列，飞机刷新频率高，机场刷新频率低。
- 机场标签使用独立 label pass，不能跟 pin 生命周期强绑定。
- selected/favorite/search result 机场建立保留集合，不被普通密度控制剔除。
- 所有 pin 图标应支持 2x/3x 高分屏渲染，避免 WebGL/canvas 下发虚。

## 13. 1.3 待办清单

- 新增机场图标自有 SVG/canvas 资产，按 `major / medium / small` 三档尺寸输出。
- 为机场数据增加 `displayLevel`、`trafficScore`、`businessJetScore`、`markerSize`。
- 在地图刷新逻辑中按 zoom + bbox + displayLevel 筛选机场。
- 增加机场 marker diff 更新，避免全量重建。
- 增加机场 label collision engine。
- 增加机场 Settings：`Auto / On / Off`，默认 `Auto`。
- 增加 selected/favorite/search result 保留逻辑。
- 更新 `513010` 机场详情面板字段，使 Arrivals、Departures、On ground、Weather、Runways 完整可用。

## 14. 验收用例

- zoom 4 的全球/洲际视图只展示极少量核心机场，不出现密集蓝点。
- zoom 6 的英国/欧洲区域视图展示主要机场 pin，不显示常驻完整标签。
- zoom 8 的英国区域视图展示更多机场 pin，拖拽时 pin 与地图坐标锁定。
- zoom 10 的伦敦区域视图展示 Heathrow 等主要机场更大的 pin。
- zoom 12 的机场周边视图中机场 pin 仍保持固定像素尺寸，不随底图无限放大。
- hover 任意机场 pin 后显示名称、IATA、ICAO。
- 点击机场 pin 后左侧机场详情面板打开，地图居中，selected pin 保留。
- Settings 关闭机场层后，普通机场 marker 隐藏，但 selected/search result 可以保留或提示用户已关闭机场层。
- 快速拖拽地图时不连续发机场请求，停止后只发最后一次 bbox 请求。
- 切换 zoom 阈值附近不闪烁，marker 使用淡入淡出。
