# Map Data Loading Performance Requirements 1.3

## 1. 文档定位

本文档用于 1.3 版本的地图数据加载机制优化。目标是解决“飞机和机场数量过多导致页面加载慢、拖动卡顿、刷新成本高”的问题，并参考 Flightradar24 的公开 API 与商业数据服务设计思路，形成适合本系统自有数据库的加载方案。

本文只定义需求和技术方向，不要求使用或抓取 Flightradar24 的页面私有数据。本系统后续运行动态数据仍然来自自有数据库。

## 2. 背景问题

当前 513008 接口设计为一次返回全球机场和在途飞机：

- `airportList`：全球所有机场，约 10000 条。
- `flyingPlanes`：全球正在飞行的公务机，约 200 到 2000 条。

这种设计适合“全局数据快照”，但不适合直接驱动交互地图首屏。地图页面的真实瓶颈不是单条数据复杂，而是：

- 首屏一次解析大量机场和飞机。
- 低 zoom 下没有必要渲染全部机场。
- 地图拖动/缩放后仍然遍历全量飞机。
- 飞机 icon、label、航迹线都在主线程更新。
- 机场详情、飞机详情、轨迹详情应该点选后加载，但基础列表已经过重。

## 3. FR24 加载机制启发

公开资料显示，FR24 的可商业化 API 与数据服务有几个关键策略：

- 实时位置数据支持按地理边界 `bounds` 查询，而不是必须返回全世界数据。
- 查询支持 `limit`，用于控制返回结果数量和成本。
- 查询支持按 aircraft type、airport、route、callsign、registration、altitude range、category 等过滤。
- 商业 live feed 可以按 fleet、airport、route 或 geographic region 配置。
- 位置更新频率可以达到数秒级，但这不代表每次都要重建所有地图元素。

归纳到地图产品层，FR24 风格的核心不是“把所有数据都加载到前端”，而是：

- 视口优先：只加载当前地图范围和少量缓冲区。
- 分级显示：低 zoom 显示重要机场/主要飞机，高 zoom 才显示更多细节。
- 懒加载详情：点击飞机后才加载轨迹、详情、飞机档案。
- 增量刷新：只更新变化的飞机位置，不整批重建 DOM/Marker。
- 限量保护：每个视口有最大飞机数、机场数和轨迹点数。

## 4. 当前接口差距

### 4.1 513008 的问题

现有 `513008` 没有这些输入参数：

- 当前视口边界：`north/south/west/east`
- 当前 zoom
- 最大返回数量：`aircraftLimit`、`airportLimit`
- 机场等级过滤：`airportLevel`
- 是否只要飞机或只要机场
- 上次刷新版本：`since` 或 `serverVersion`
- 当前选中的飞机：用于保证 selected 飞机不被裁掉

因此 513008 只能作为全局快照接口，不能作为高性能地图实时刷新接口。

### 4.2 513009/513010/513011 的方向是正确的

以下接口适合继续保持“点选后加载”：

- `513009`：点击飞机后加载指定行程轨迹。
- `513010`：点击机场后加载指定机场信息。
- `513011`：点击飞机后加载飞机基础信息。

这三个接口不应该在首屏批量调用。

## 5. 1.3 优化目标

### 5.1 用户体验目标

- 首屏地图快速可交互，不因全球 10000 个机场阻塞。
- 拖动和缩放地图时不卡顿，数据在地图稳定后刷新。
- 低 zoom 只显示必要飞机和高等级机场。
- 高 zoom 逐步显示更多机场和细节。
- 点击飞机后再加载轨迹和飞机基础档案。
- 点击机场后再加载机场基础信息。
- 接口慢或失败时保持已有视图，不清空地图。

### 5.2 性能目标

建议验收指标：

| 指标 | 目标 |
| --- | --- |
| 首屏可交互时间 | 桌面端小于 2.5 秒 |
| 地图拖动后数据刷新 | 停止拖动后 300 到 600 ms 内发起请求 |
| 普通视口飞机渲染上限 | 默认 300 到 800 架 |
| 普通视口机场渲染上限 | 低 zoom 300 到 700 个，高 zoom 最高 2000 个 |
| 飞机位置刷新周期 | 5 到 10 秒 |
| 机场列表刷新周期 | 30 到 120 秒 |
| selected 飞机轨迹点 | 最多渲染 800 个有效分段 |
| 主线程长任务 | 单次渲染避免超过 50 ms |

## 6. 推荐接口方案

### 6.1 513008 视口参数

本项目当前仅使用已提供的 `513008` 到 `513011` 四个接口。视口加载能力通过升级 `513008` 增加可选参数实现，不新增 `pid`。

请求参数：

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `pid` | String | Y | 固定 `513008` |
| `accountType` | String | Y | `web_map` |
| `authorizedUser` | String | Y | 用户标识 |
| `north` | Number | Y | 当前视口北边界 |
| `south` | Number | Y | 当前视口南边界 |
| `west` | Number | Y | 当前视口西边界 |
| `east` | Number | Y | 当前视口东边界 |
| `zoom` | Number | Y | 当前地图缩放级别 |
| `aircraftLimit` | Number | N | 默认 800 |
| `airportLimit` | Number | N | 默认按 zoom 决定 |
| `airportLevelMax` | Number | N | 低 zoom 只返回 1 到 2 级机场 |
| `aircraftCategory` | String | N | 固定 `business_jet` |
| `includeAirports` | Boolean | N | 是否返回机场 |
| `includeAircraft` | Boolean | N | 是否返回飞机 |
| `sinceVersion` | String | N | 增量刷新版本 |
| `selectedUniqueKey` | String | N | 当前选中飞机，必须保留返回 |

返回数据：

```javascript
{
  "serverNowEpochMs": 1785724773169,
  "viewportVersion": "vp_20260803_103000_001",
  "ttlMs": 5000,
  "bounds": {
    "north": 45.0,
    "south": 15.0,
    "west": 100.0,
    "east": 130.0
  },
  "aircraft": [
    {
      "uniqueKey": "1099706732310953984",
      "tailNo": "encrypted",
      "coordinate": { "lng": 120.5565, "lat": 30.2311, "course": 99 },
      "planeSize": "超远程",
      "shareState": 1,
      "international": 1,
      "companyId": 23,
      "updatedAtEpochMs": 1785724770000
    }
  ],
  "airports": [
    {
      "airportCode": "PEK",
      "icaoCode": "ZBAA",
      "cityName": "北京",
      "airportName": "北京首都国际机场",
      "airportNameEn": "Beijing Capital",
      "lat": 40.07889701,
      "lon": 116.596282,
      "groundNum": 38,
      "level": 1
    }
  ],
  "removedAircraftUniqueKeys": [],
  "removedAirportCodes": []
}
```

### 6.2 如果暂时不能改后端

短期可以保留现有 513008，但前端必须增加本地空间索引：

- 首次加载全量机场后放入内存索引。
- 地图只渲染当前视口内、当前 zoom 允许级别内的机场。
- 飞机只渲染当前视口和缓冲区内的飞机。
- 解析和索引构建尽量放入 Web Worker。
- 地图拖动时只做轻量筛选，不重建全部 marker。

这个方案能缓解页面卡顿，但不能解决首包过大和首次解析成本。长期仍建议后端支持视口查询。

## 7. 前端加载规则

### 7.1 地图视口请求

- 地图首次 ready 后请求当前视口数据。
- 用户拖动/缩放过程中不请求。
- 地图停止移动后 debounce 300 到 600 ms 再请求。
- 新请求发出时，中止上一个未完成的同类请求。
- 请求失败时保留旧数据，并在右侧面板显示 stale 状态。
- 视口外飞机和机场不立即销毁，可短暂保留到下一轮渲染，避免闪烁。

### 7.2 飞机显示规则

| Zoom | 飞机显示 |
| --- | --- |
| 2-3 | 只显示视口内飞机，隐藏大部分 label，限制 300 到 500 架 |
| 4-5 | 显示视口内飞机，label 只对 selected/hover 显示 |
| 6-8 | 显示更多飞机，label 可按密度显示 |
| 9-12 | 显示机场附近细节、滑行/低空状态，仍需限制总量 |

要求：

- 飞机 marker 必须复用 DOM/AdvancedMarker，不允许每次刷新整批重建。
- 位置更新只改坐标、角度、必要文本。
- selected 飞机必须置顶，并且即使移出当前视口缓冲区也保留一段时间。
- 飞机轨迹默认只显示 selected；普通飞机轨迹低 zoom 不显示。

### 7.3 机场显示规则

机场必须按照 `level` 分级显示：

| Zoom | 机场规则 |
| --- | --- |
| 2-3 | 只显示 level 1-2，最多 500 到 700 个 |
| 4-5 | 显示 level 1-3，最多 1000 到 1200 个 |
| 6-8 | 显示 level 1-4，最多 1800 到 2200 个 |
| 9-12 | 显示 level 1-5，但只限当前视口，必要时聚合 |

机场详情只在点击时调用 `513010`。

### 7.4 详情懒加载

点击飞机：

- 立即打开左侧面板，先显示 513008 中已有字段。
- 并行调用 `513009` 和 `513011`。
- `513009` 返回后更新航线、轨迹、高度、速度、起降机场。
- `513011` 返回后更新飞机基础档案、机型代码、运营商和图片。

点击机场：

- 立即打开机场详情面板。
- 调用 `513010`。
- 返回后更新天气、跑道、停场、起降统计。

## 8. 缓存策略

### 8.1 视口缓存

- 缓存 key：`zoomBand + tileId/boundsHash + filterHash`
- 飞机缓存 TTL：5 到 10 秒。
- 机场缓存 TTL：5 到 30 分钟。
- 详情缓存 TTL：5 到 10 分钟。

### 8.2 增量刷新

如果后端支持：

- 前端传 `sinceVersion`。
- 后端只返回新增/变化/删除的飞机和机场。
- 前端按 `uniqueKey` 合并飞机，按 `icaoCode/airportCode` 合并机场。

## 9. 渲染优化要求

- 使用 marker pool 复用飞机元素。
- 地图刷新时不要清空整个图层再重建。
- label 默认按密度隐藏，hover/selected 再显示。
- 航迹线只对 selected 飞机完整绘制。
- 普通航迹只显示最近短时间窗口，并按 zoom 降采样。
- 大量数据筛选、排序、聚合可放入 Web Worker。
- 图片 icon 不要重复解码，可预加载常用 icon。
- 视口外元素应隐藏或回收，不参与布局和绘制。

## 10. 后台与数据要求

后台需要提供或维护：

- 机场 `level` 的准确性。
- 飞机 `planeSize` 到前端 `sizeClass` 的稳定映射。
- 飞机 `uniqueKey` 的持续稳定性。
- 服务器权威时间 `serverNowEpochMs`。
- 数据更新时间 `updatedAtEpochMs`。
- 删除/结束飞行的标识，避免前端保留已结束飞机。

## 11. 验收场景

### 场景 1：全球低 zoom

- 打开地图默认全球视角。
- 页面应快速可操作。
- 只显示高等级机场和有限数量飞机。
- 不出现 10000 个机场同时渲染。

### 场景 2：拖动到中国区域

- 停止拖动后自动请求中国区域视口数据。
- 旧视图不闪白。
- 新飞机和机场平滑替换。

### 场景 3：点击飞机

- 面板立即打开。
- 轨迹和飞机档案异步补齐。
- selected 飞机始终置顶。
- 普通飞机不批量加载轨迹。

### 场景 4：机场密集区域

- 低 zoom 不显示所有小机场。
- 放大后逐级显示更多机场。
- 机场详情仅点击时加载。

## 12. 分阶段实施建议

### P0：前端止血

- 只渲染当前视口内飞机。
- 机场按 zoom 和 level 限量。
- 飞机 label 按 zoom/密度隐藏。
- 普通航迹低 zoom 隐藏。
- 更新 marker 时复用 DOM。

### P1：513008 视口参数

- 升级 `513008`，不新增接口 pid。
- 支持 bounds、zoom、limit、airportLevel、businessJet filter。
- 支持 selected 飞机保留。

### P2：增量刷新

- 增加 `sinceVersion`。
- 返回变化和删除列表。
- 前端按 key 合并数据。

### P3：实时流

- 对飞机位置使用 WebSocket/SSE。
- 机场和基础信息仍走 HTTP 缓存。
- 服务端按视口订阅推送。

## 13. 风险与约束

- 如果后端只提供全量 513008，首包性能仍然受限。
- 如果机场 `level` 不准确，低 zoom 机场显示效果会混乱。
- 如果 `uniqueKey` 不稳定，前端无法稳定复用 marker。
- 如果刷新频率过高，会造成主线程持续重绘。
- 如果每架飞机都加载轨迹，页面一定会卡顿，必须限制为 selected/on-demand。

## 14. 结论

1.3 的性能优化核心应从“全量数据展示”转为“视口驱动展示”。当前 513009、513010、513011 的详情懒加载方向正确；主要问题集中在 513008 的全量返回和前端渲染策略。

最推荐路径：

1. 短期先做前端视口筛选、分级渲染、marker 复用。
2. 中期新增视口接口，彻底减少首包和刷新数据量。
3. 长期增加增量刷新或实时流，实现接近 FR24 的地图体验。

## 15. 参考资料

- Flightradar24 API Documentation: https://support.fr24.com/support/solutions/articles/3000128166-flightradar24-api-documentation
- Flightradar24 API Credit Overview: https://fr24api.flightradar24.com/docs/credit-overview
- Flightradar24 Commercial Data Services: https://data.flightradar24.com/commercial-services/data-services
- Official Flightradar24 API MCP README: https://github.com/Flightradar24/fr24api-mcp
- 当前项目接口文档：`source/接口文档v1/513008.查询机场列表和在途行程.md`
- 当前项目接口文档：`source/接口文档v1/513009.查询指定行程的飞行轨迹.md`
