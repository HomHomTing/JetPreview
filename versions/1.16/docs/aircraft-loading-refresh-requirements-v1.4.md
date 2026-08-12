# Aircraft Loading and Refresh Requirements 1.4

## 1. 文档定位

本文档用于定义飞机图层在地图不同比例尺下的加载、刷新、密度控制、标签显示和交互规则。目标是在体验上贴近 Flightradar24 的飞机图层机制，同时确保本系统后续只使用自有公务机运行数据库。

观察日期：2026-08-03。
观察范围：Flightradar24 公共地图页面，主要以欧洲/英国高密度空域在 zoom 2-12 下的飞机显示行为作为样本。
重要限制：本文只复用可观察的产品机制和公开 API 思路，不抓取 Flightradar24 私有接口、代码、账户数据或未授权资产。

参考来源：

- Flightradar24 官方博客：`https://www.flightradar24.com/blog/inside-flightradar24/supercharging-flightradar24s-data-display/`
- Flightradar24 API Getting Started：`https://fr24api.flightradar24.com/docs/getting-started`
- Flightradar24 API Python SDK：`https://fr24api.flightradar24.com/docs/sdk/python`
- Flightradar24 API FAQ：`https://fr24api.flightradar24.com/docs/faq`
- Flightradar24 API Credit Overview：`https://fr24api.flightradar24.com/docs/credit-overview`
- Flightradar24 API Flight Summary：`https://fr24api.flightradar24.com/docs/endpoints/flight-summary`
- 当前项目：`docs/product-requirements-v1.3-loading-performance.md`

## 2. FR24 飞机层关键结论

官方公开信息：

- FR24 已将网站飞机图标和航迹迁移到 WebGL 渲染，用于承载数以万计的移动飞机图标。
- FR24 的底图已转向矢量地图，缩放不再是传统离散级别，用户可以连续缩放。
- 飞机 icon 和 flight path 都由 WebGL 绘制。
- 飞机图标尺寸支持用户通过 slider 进行微调。
- 飞机信息面板中的位置、高度、速度、风、温度等实时数据，官方说明从过去约 8 秒更新，缩短到约 2-3 秒。
- FR24 API 支持用 `bounds` 查询 live flight positions，也支持 `limit` 控制返回数量。
- FR24 API 的类别过滤中，`J` 表示 business jets。
- FR24 API FAQ 说明，系统约每 3 秒更新一次每架飞机的位置数据；接口响应时延随返回量增长，少量数据通常小于 1 秒。

页面实测信息：

- FR24 页面飞机层不使用 DOM marker，而是存在 `fr24-webgl-overlay` canvas。
- zoom 2-7 下，飞机图标已经大量展示，并没有使用传统聚合气泡。
- 低 zoom 到中 zoom 基本只显示飞机 icon，不常驻显示呼号标签。
- 飞机 icon 在不同 zoom 下保持相对固定的屏幕像素尺寸，不随地图比例尺无限放大。
- 在高密度区域，FR24 依靠 WebGL、标签隐藏、遮挡优先级和 icon 尺寸控制来保持可读性。
- 高 zoom 进入机场附近时，普通飞行中飞机减少，地面/低空/机场附近飞机更容易被看清；selected 飞机应始终保留。

## 3. 本系统目标

当前产品定位是全球公务机运行数据系统，因此飞机加载规则与 FR24 全品类地图有一个核心差异：

- FR24 默认展示所有类别飞机。
- 本系统默认只展示公务机，即后端查询固定 `business_jet` 或 FR24 类别等价 `J`。

1.4 目标：

- 低 zoom 全球视图仍可展示公务机态势，但不显示呼号标签和普通航迹。
- 中 zoom 区域视图展示更多飞机，保持 icon 锁定坐标。
- 高 zoom 城市/机场视图展示呼号、地面状态和精选航迹。
- 拖拽缩放时不阻塞地图，不连续重建所有飞机 marker。
- 飞机位置高频刷新，但详情和完整轨迹只在点选后加载。
- selected 飞机永远优先保留，不受 zoom、limit、筛选和当前视口边缘裁切影响。

## 4. 缩放展示规范

FR24 官方没有公开精确 zoom 阈值。以下阈值为页面观察 + 本系统公务机规模转化后的实现要求。

### 4.1 Zoom 分级表

| Zoom 范围 | 场景 | 飞机显示 | 标签显示 | 航迹显示 | 单视口上限 |
| --- | --- | --- | --- | --- | --- |
| `<3.5` | 全球/洲际态势 | 显示当前 bbox 内高优先级公务机；不聚合 | 无标签，仅 selected/hover tooltip | 仅 selected 航迹 | 400-800 |
| `3.5-4.49` | 洲际/跨区域 | 显示大部分公务机；低优先级可裁剪 | 无标签 | 仅 selected 航迹 | 800-1200 |
| `4.5-5.49` | 大区域 | 显示当前视口和 buffer 内公务机 | selected/favorite 标签 | selected 航迹 | 1200-1600 |
| `5.5-6.49` | 国家/空域 | 显示全部可见公务机，按优先级限量 | hover/selected/favorite | selected 航迹；普通航迹默认关闭 | 1600-2200 |
| `6.5-7.49` | 城市群/航路密集区 | 显示全部可见公务机，保留机场附近低空飞机 | 少量高优先级标签，必须碰撞检测 | 普通航迹可启用，但最多 80-120 架 | 2200-3000 |
| `7.5-8.49` | 城市/进离场区域 | 飞机、机场和航路共同展示 | selected/favorite/hover；部分高优先级常驻 | 普通航迹可按上限显示 | 3000-3500 |
| `8.5-9.49` | 机场周边/终端区 | 高密度细节视图，保留地面和低空状态 | 呼号标签可显示，但必须碰撞 | selected 完整航迹；普通短航迹 | 3500-4000 |
| `>=9.5` | 机场本场/近地面 | 展示所有当前视口内公务机；可展示地面滑行状态 | selected/favorite/hover/full label | selected 完整航迹，普通航迹可按需 | 4000-5000 |

说明：

- 上限是渲染上限，不是后端返回上限。后端可返回 buffer 区域更多数据，前端再按优先级绘制。
- 对于本系统公务机专用场景，真实全球同时飞行数通常低于 FR24 全品类航班，因此低 zoom 不需要聚合气泡。
- 如果未来可见公务机超过 `5000`，必须进入 WebGL/canvas renderer，不能继续使用普通 DOM/AdvancedMarker 全量渲染。

### 4.2 显示优先级

飞机优先级从高到低：

1. selected 飞机。
2. hover 飞机。
3. favorite / watchlist 飞机。
4. 告警飞机：紧急 squawk、异常下降、失联、偏航等。
5. 当前视口内真实位置飞机。
6. 当前视口 buffer 内即将进入视口的飞机。
7. 低空、起飞、降落、机场附近飞机。
8. 高速巡航飞机。
9. 数据过旧或质量低的飞机。

当超出 `aircraftLimit` 时：

- selected、hover、favorite、告警必须保留。
- 同一机场/航路附近的重叠飞机按 `updatedAt`、数据质量、业务优先级排序。
- 被裁剪的飞机不删除缓存，只是不进入当前绘制集合。

## 5. 刷新机制

### 5.1 实时位置刷新

FR24 官方说明位置数据约每 2-3 秒更新。本系统建议：

| 场景 | 请求周期 | 说明 |
| --- | --- | --- |
| selected 飞机存在 | `2-3s` | 保障详情面板和 selected icon 流畅 |
| 普通桌面前台 | `3-5s` | 接近 FR24 体验，适配自有数据库压力 |
| 低 zoom 全球态势 | `5-8s` | 降低大范围请求压力 |
| 高 zoom 机场周边 | `2-4s` | 地面/低空变化更敏感 |
| 浏览器 tab hidden | `15-30s` 或暂停 | 避免后台消耗 |
| API 失败或网络慢 | 指数退避到 `10-30s` | 保留旧画面，不清空地图 |

### 5.2 地图事件刷新

地图交互期间分两层处理：

- 视觉层：飞机 marker 跟随地图投影移动，不请求新数据。
- 数据层：停止操作后按 bbox 请求当前视口数据。

事件规则：

- `dragstart`：暂停新的 viewport 请求，保留现有飞机。
- `drag`：不重建 marker，不拉取详情，不重新绘制全部航迹。
- `zoom_changed`：立即重算 icon 尺寸、标签显示、航迹开关，不立即请求详情。
- `idle`：停止拖拽/缩放后 `250-500ms` 发起 viewport 请求。
- 快速连续缩放：只执行最后一次请求。
- `resize`：重算 bbox、limit、label collision。

### 5.3 位置平滑

为了接近 FR24 的流畅移动效果：

- 后端每 `2-5s` 返回一次真实位置。
- 前端每帧或每 `250ms` 根据速度、航向、时间差做轻量插值。
- 插值最大允许 `20-30s`，超过后停止外推并标记 stale。
- 数据时间超过 `15s`，icon 透明度降低或显示弱状态。
- 数据时间超过 `60s`，从普通显示层移除，除非是 selected 飞机。

## 6. 数据请求规范

### 6.1 513008 视口参数

本项目当前仅使用已提供的 `513008` 到 `513011` 四个接口。飞机视口加载能力通过升级 `513008` 支持以下可选参数实现，不新增接口 pid。

```javascript
{
  "pid": "513008",
  "accountType": "web_map",
  "authorizedUser": "{...}",
  "north": 52.9,
  "south": 50.1,
  "west": -1.9,
  "east": 1.4,
  "zoom": 7.2,
  "viewportPaddingRatio": 0.25,
  "aircraftLimit": 2200,
  "aircraftCategory": "business_jet",
  "categories": "J",
  "includeAircraft": true,
  "includeAirports": false,
  "includeGround": true,
  "sinceVersion": "vp_20260803_120000_001",
  "selectedUniqueKey": "1099706732310953984"
}
```

返回：

```javascript
{
  "serverNowEpochMs": 1785730400000,
  "viewportVersion": "vp_20260803_120003_002",
  "ttlMs": 3000,
  "bounds": {
    "north": 52.9,
    "south": 50.1,
    "west": -1.9,
    "east": 1.4
  },
  "totalMatched": 318,
  "truncated": false,
  "aircraft": [
    {
      "uniqueKey": "1099706732310953984",
      "tailNo": "encrypted",
      "callsign": "BJT889",
      "aircraftTypeCode": "GL7T",
      "category": "J",
      "coordinate": {
        "lat": 51.472,
        "lng": -0.467,
        "course": 86
      },
      "altitudeFt": 1200,
      "groundSpeedKt": 148,
      "verticalSpeedFpm": -600,
      "status": "Approach",
      "source": "ADS-B",
      "quality": "good",
      "updatedAtEpochMs": 1785730398000,
      "departureAirport": "EGLF",
      "arrivalAirport": "EGLL",
      "displayPriority": 91
    }
  ],
  "removedAircraftUniqueKeys": []
}
```

### 6.2 Count 预检

高密度区域建议提供 count 能力：

- 先按 bbox + category 查询 `totalMatched`。
- 如果 `totalMatched > aircraftLimit`，后端按优先级返回前 `aircraftLimit`。
- 前端显示 `loaded / total` 状态，但地图不展示营销式提示。

### 6.3 增量更新

返回数据应支持 diff：

- 新增飞机：创建 marker。
- 更新飞机：只更新 position、heading、speed、altitude、status。
- 删除飞机：标记离开视口或结束飞行，fade-out 后移除。
- selected 飞机：即使离开当前 bbox，也继续返回一段时间，直到用户取消选择。

## 7. 前端渲染规范

### 7.1 Renderer 策略

| 可见飞机数 | 推荐 renderer |
| --- | --- |
| `<800` | Google AdvancedMarker / DOM marker 可接受 |
| `800-2000` | AdvancedMarker + diff + requestAnimationFrame 批量更新 |
| `2000-5000` | Canvas/WebGL 优先 |
| `>5000` | 必须 WebGL，并进行 LOD 和标签剔除 |

FR24 已使用 WebGL。若本系统后续接入完整全球公务机数据库，应逐步将飞机主图层迁移到 canvas/WebGL，DOM/AdvancedMarker 仅保留 selected、hover 和可交互标签。

### 7.2 Icon 尺寸

飞机 icon 尺寸应以机型图标规范为主，而不是随 zoom 无限放大。

规则：

- 低 zoom：整体缩小约 `0.85-0.95`，保持方向可读。
- 中 zoom：使用标准尺寸。
- 高 zoom：最多放大 `1.05-1.15`，不得随比例尺继续放大。
- selected：在当前尺寸上增加 `2-4px` 或 `1.08-1.12` scale。
- hover：轻微增加亮度或 scale `1.03-1.05`。
- 用户 icon size slider 作为全局倍率，范围建议 `0.75-1.35`。

### 7.3 标签显示

| Zoom 范围 | 标签规则 |
| --- | --- |
| `<5.5` | 不显示常驻标签；只显示 selected/hover tooltip |
| `5.5-7.49` | selected/favorite 可显示呼号，普通飞机无标签 |
| `7.5-8.49` | selected/favorite/告警常驻；普通飞机 hover |
| `8.5-9.49` | 高优先级普通飞机可显示呼号，必须碰撞 |
| `>=9.5` | 呼号/注册号/高度标签可显示，但必须碰撞和限量 |

标签优先级：

1. selected。
2. hover。
3. 告警。
4. favorite。
5. 低空/进近/离场。
6. 其他普通飞机。

标签碰撞规则：

- selected 标签永不被遮挡。
- 标签之间最小间距 `4px`。
- 标签不得遮挡当前 selected aircraft icon。
- 标签数量上限：低 zoom `0-20`，中 zoom `50-120`，高 zoom `200-400`。

## 8. 航迹与详情联动

飞机加载不等于航迹加载。

默认：

- 低 zoom 不显示普通航迹。
- selected 飞机总是显示航迹。
- 普通航迹只在 zoom `>=7` 且当前可见飞机数低于上限时展示。
- 完整轨迹点通过 `513009` 点选后加载。
- 非 selected 飞机仅使用短航迹或最近数个点。

详情懒加载：

- 地图点选飞机后立即打开左侧面板，先显示 viewport payload 中已有字段。
- 并行请求 `513009` 和 `513011`。
- `513009` 更新轨迹、高度/速度曲线、起降信息。
- `513011` 更新机型档案、注册号、运营方等信息。

## 9. 状态与视觉反馈

### 9.1 数据新鲜度

| 数据年龄 | 视觉状态 |
| --- | --- |
| `<=5s` | 正常 |
| `5-15s` | 正常，但不再外推超过安全距离 |
| `15-60s` | 半透明或弱状态 |
| `>60s` | 从普通层移除；selected 可保留并标记 stale |

### 9.2 数据质量

| Source / quality | 展示 |
| --- | --- |
| `ADS-B good` | 正常黄色 icon |
| `MLAT` | 正常 icon，可在详情中标注 |
| `estimated` | icon 透明度降低，航迹估算段虚线 |
| `stale` | 弱状态，停止平滑外推 |
| `ground` | 高 zoom 可显示地面状态，低 zoom 隐藏或降权 |

## 10. 接口与当前项目差距

当前 `513008` 仍更接近全量快照，缺少：

- `north/south/west/east`
- `zoom`
- `aircraftLimit`
- `categories` 或 `aircraftCategory`
- `sinceVersion`
- `selectedUniqueKey`
- `totalMatched`
- `removedAircraftUniqueKeys`
- `updatedAtEpochMs`
- `quality/source`

短期前端可继续使用本地 viewport 筛选，但长期必须由后端支持 bbox 查询，否则全球数据量上来后首包和解析成本会成为瓶颈。

## 11. 性能验收

| 指标 | 目标 |
| --- | --- |
| 首屏可交互 | `<2.5s` |
| viewport idle 后请求 | `250-500ms` |
| 普通实时刷新 | `3-5s` |
| selected 刷新 | `2-3s` |
| 单次 marker diff | `<50ms` |
| 拖拽期间 FPS | `50-60fps` |
| 普通 DOM marker 上限 | `<=800` |
| WebGL/canvas 可见上限 | `5000+` |
| selected 轨迹点上限 | `800` |
| 非 selected 短航迹点 | `40-80` |

## 12. 1.5 实施建议

- 把当前 `aircraftForCurrentView()` 的 limit 表升级为本文档 zoom 表。
- 增加 `aircraftRefreshPolicy()`，根据 zoom、selected、tab visibility 决定刷新频率。
- 增加 `updatedAtEpochMs` 和 stale 状态渲染。
- 增加 selected 飞机跨视口保留逻辑。
- 增加标签碰撞和标签数量上限。
- 将普通飞机 marker diff 从“重新渲染列表”升级为“新增/更新/移除”。
- 当可见飞机超过 `800` 时，启用 canvas/WebGL 方案，只把 selected/hover 保留为 DOM 交互层。
- 后端升级 `513008`，支持 bbox + category J + limit + sinceVersion。

## 13. 验收用例

- zoom 2-3 全球视图显示公务机态势，但无普通呼号标签。
- zoom 5 欧洲视图显示大量公务机 icon，拖拽不卡顿。
- zoom 7 英国视图 selected 飞机显示航迹，普通航迹不超过上限。
- zoom 9 机场周边视图显示呼号标签，标签不重叠 selected 飞机。
- 点选飞机后，飞机即使离开当前 bbox 也保留 selected 显示。
- 拖拽地图时不连续发请求，停止后只发最后一次 viewport 请求。
- API 返回 `removedAircraftUniqueKeys` 后，飞机 fade-out 移除。
- 位置超过 `15s` 未更新时 icon 进入弱状态，超过 `60s` 从普通层移除。
- tab 切到后台后刷新降频或暂停，回到前台立即刷新一次。
