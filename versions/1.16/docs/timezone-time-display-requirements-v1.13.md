# 时间与时区显示需求文档 1.13

## 1. 文档定位

本文档定义 1.13 版本需要修复的时间与时区展示规则。目标是在用户设备处于任意时区时，地图首页、飞机详情、机场详情、搜索结果和管理后台都展示正确、可解释、不可被设备本地时区误导的时间信息。

梳理日期：2026-08-06。

适用范围：

- 首页地图实时刷新时间与数据状态。
- 选中飞机详情面板中的起飞、到达、当前位置、航迹点、速度高度图时间。
- 选中机场详情面板中的机场当地时间、天气时间、公告时间、运行摘要更新时间。
- 搜索结果展开区的飞机更新时间。
- icon 配置后台中的发布时间、审计时间和导出时间。

不在本次范围：

- 不改变接口鉴权、飞机筛选、地图图标映射和航迹绘制策略。
- 不自行推断缺失的真实计划/预计/实际时间。
- 不用用户设备本地时区替代机场当地时间。

## 2. 当前实现审计

### 2.1 当前可用接口时间字段

| 接口 | 字段 | 当前语义 | 风险 |
| --- | --- | --- | --- |
| `513008.flyingPlanes[]` | `updatedAtEpochMs / updatedAt / timestamp / createTime` | 飞机快照更新时间 | 若是字符串且不带时区，当前会被 `Date.parse()` 按设备时区解析 |
| `513008.flyingPlanes[]` | `positionTimestamp` | 飞机当前位置时间 | 同上 |
| `513009.flightBaseInfo` | `depZoneId / arrZoneId` | 起飞/到达机场 IANA 时区 | 当前只用于展示时区文本，没有用于格式化时间 |
| `513009.flightBaseInfo` | `depTimeZone / arrTimeZone` | 起飞/到达机场 UTC offset 文本 | 当前只展示原文，没有统一解析 |
| `513009.flightBaseInfo` | `depTime1 / depTime2 / arrTime1 / arrTime2` | 机场当地计划/预计/实际字符串 | 当前 `displayTime()` 只截取 `HH:mm`，丢失日期和时区 |
| `513009.flightBaseInfo` | `serverNowEpochMs` | 服务端权威当前时间，epoch ms | 当前可用，应成为耗时计算优先源 |
| `513009.flightBaseInfo` | `currentTimeGmt8` | 兼容字段，固定 Asia/Shanghai 字符串 | 当前可能被设备本地时区解析，跨时区会错 |
| `513009.flightBaseInfo` | `depActualEpochMs / arrActualEpochMs` | 实际起飞/到达绝对时间 | 当前可正确计算，但展示仍走设备本地时区 |
| `513009.coordinates[]` | `createTime / timestamp / time` | 航迹点时间 | epoch ms 可用；字符串无时区时有风险 |
| `513010.airportInfo` | `timeZone` | 机场 UTC offset 文本，如 `UTC+8` | 当前机场当地时间在无 IANA zone 时只显示 `UTC+8`，没有显示当前时间 |
| `513010.weatherInfo` | `reportTime / date` | 天气报告时间 | 当前未统一进入时间模型 |
| `513010.weatherNotices[] / airportNotices[]` | `sendDate` | 公告发送时间 | 当前未统一进入时间模型 |
| `513011.tripsForSale[]` | `startDate / endDate / createTime` | 历史或待售行程日期 | 当前面板未系统化展示时区 |

### 2.2 当前代码风险点

| 位置 | 当前规则 | 需要修改 |
| --- | --- | --- |
| `data-service.js -> normalizeEpochMs()` | 数字按秒/毫秒归一，字符串直接 `Date.parse()` | 字符串必须携带来源时区后解析；无时区字符串不得静默当作设备本地时间 |
| `data-service.js -> displayTime()` | 对字符串按空格切分，只保留 `HH:mm` | 保留日期、机场时区、跨天信息，输出结构化时间对象 |
| `data-service.js -> adaptFlightTrack()` | `depTime1/2`、`arrTime1/2` 只进入展示文本 | 应同时保留 raw、zone、epochMs、field semantic |
| `app.js -> parsePanelEpoch()` | 字符串直接 `Date.parse()` | 改为只接受 epoch 或带明确时区的 ISO；机场当地字符串需传入 zone |
| `app.js -> formatPanelTime()` | 使用 `new Date(epoch).toLocaleTimeString()`，默认设备本地时区 | 必须显式传入 `timeZone` 或使用 UTC；禁止隐式设备本地时区 |
| `app.js -> updateDataSourceLabels()` | 加载时间使用设备本地时区 | 标注为 `Local` 或改为 UTC/server time |
| `app.js -> renderAircraftDetailPanel()` | 起降时间没有按 `depZoneId/arrZoneId` 格式化 | 起飞时间按起飞机场时区，到达时间按到达机场时区 |
| `app.js -> formatAirportLocalTime()` | 有 IANA zone 时正确；只有 `UTC+8` 时只显示 offset 文本 | 需要支持 UTC offset 当前时间计算，并展示 offset |
| `app.js -> renderSpeedAltitudeChart()` | X 轴来自 epoch，但展示函数仍可能走设备本地 | 图表默认 UTC，或跟随用户显式选择，不能默认设备时区 |
| `admin.js -> formatDate()` | 后台发布时间使用设备本地时区 | 后台可继续用设备本地，但 UI 必须标注 `Local`；导出 JSON 保留 ISO UTC |

## 3. 统一时间原则

### 3.1 内部存储原则

所有可以定位到绝对时刻的时间，前端内部统一存储为 `epochMs`。`epochMs` 语义固定为 UTC 绝对时间，不受设备时区影响。

所有接口返回的原始字符串必须保留 `raw` 字段，用于排查接口问题和兼容展示。

### 3.2 展示原则

| 时间类型 | 默认展示时区 | 展示说明 |
| --- | --- | --- |
| 起飞机场事件时间 | 起飞机场 IANA zone，缺失时使用起飞机场 UTC offset | 计划起飞、实际起飞、推出、滑行等 |
| 到达机场事件时间 | 到达机场 IANA zone，缺失时使用到达机场 UTC offset | 计划到达、预计到达、实际到达 |
| 机场 Header 当地时间 | 当前选中机场 IANA zone，缺失时使用 UTC offset | 必须显示当前时钟，不显示裸 `UTC+8` 作为时间 |
| 航迹点时间 | UTC | 用于图表、轨迹诊断、数据源模块 |
| 飞机当前位置时间 | UTC | 数据源模块默认 UTC，后续可加 Local/UTC 切换 |
| 数据刷新时间 | UTC 或明确标注 `Local` | 默认建议 UTC，减少全球协同时误读 |
| 搜索结果更新时间 | UTC 或相对时间 | 建议显示 `Updated 12:31 UTC` 或 `3 min ago` |
| 后台审计/发布 | Local + ISO export | 页面标注 Local，导出保留 ISO UTC |

### 3.3 禁止规则

- 禁止无参数调用 `toLocaleTimeString()` 或 `toLocaleString()` 展示业务时间。
- 禁止对无时区的 `YYYY-MM-DD HH:mm:ss` 直接 `Date.parse()`。
- 禁止把 `currentTimeGmt8` 当作用户本地时间解析。
- 禁止只展示 `UTC+8` 作为“当地时间”。
- 禁止用计划时间冒充实际时间，或用实际时间覆盖计划字段。

## 4. 标准时间对象

前端适配层需要输出统一时间对象：

```js
{
  raw: "2026-08-06 15:30:00",
  epochMs: 1786001400000,
  displayZone: "Asia/Shanghai",
  offsetMinutes: 480,
  sourceField: "flightBaseInfo.depTime1",
  semantic: "actual_departure",
  confidence: "exact" // exact | local-string | offset-string | raw-only | missing
}
```

字段规则：

- `epochMs`：只有数字 epoch、带时区 ISO、或后端明确给出的 epoch 字段可生成。
- `displayZone`：优先 IANA zone，如 `Asia/Shanghai`；否则使用 UTC offset。
- `offsetMinutes`：从 `UTC+8`、`UTC-5:30` 等字符串解析。
- `semantic`：不得只叫 `time1/time2`，必须映射为业务含义。
- `confidence=raw-only` 时，只能展示原始文本加时区，不参与耗时计算。

## 5. 飞机详情面板需求

### 5.1 Route summary 时间

P0：

- `Scheduled departure` 使用 `depTime2 / scheduledDepartureTime / depPlanTime`，按起飞机场时区展示。
- `Actual departure` 使用 `depActualEpochMs` 优先；缺失时可展示 `depTime1` raw local string，但不得参与 elapsed 计算。
- `Scheduled arrival` 使用 `arrTime2 / scheduledArrivalTime / arrPlanTime`，按到达机场时区展示。
- `Estimated arrival` 使用 `arrActualEpochMs` 或后端新增 `arrEstimatedEpochMs` 优先；缺失时可展示 `arrTime1` raw local string。
- 到达跨天用 `acrossDays` 展示为 `+1d`，并保留日期；不再只在纯时间后追加 `+1`。
- 时间旁需要显示短时区标识，如 `15:30 CST` 或 `15:30 UTC+8`。中国境内机场也不能省略时区。

P0 展示样例：

| 字段 | 示例 |
| --- | --- |
| Scheduled departure | `08-06 14:20 UTC+8` |
| Actual departure | `08-06 14:37 UTC+8` |
| Scheduled arrival | `08-06 17:10 UTC+8` |
| Estimated arrival | `08-06 17:28 UTC+8` |

### 5.2 飞行耗时和剩余时间

P0：

- `elapsed` 只可由 `serverNowEpochMs - depActualEpochMs` 计算。
- `remaining` 只可由明确 epoch 的 `arrEstimatedEpochMs / arrActualEpochMs / arrTime1EpochMs - serverNowEpochMs` 计算。
- 如果只拿到无时区字符串，显示时间文本，但 `elapsed/remaining` 显示 `N/A`。
- `serverNowEpochMs` 缺失时可用客户端 `Date.now()`，但数据源模块标注 `client clock`。
- `currentTimeGmt8` 仅作为兼容展示字段，不作为跨时区耗时计算源。

### 5.3 数据源时间和航迹时间

P0：

- `Last position time` 固定显示 UTC：`2026-08-06 07:31 UTC`。
- `Last point` 固定显示 UTC。
- Speed & Altitude graph 的 X 轴固定 UTC，tooltip 显示 UTC。
- 航迹合并、断点判断、速度异常判断只使用 `epochMs`。

P1：

- 增加全局时间显示偏好：`UTC / Airport local / Device local`。
- 默认仍为 UTC，用户显式切换后才展示 Device local。

## 6. 机场详情面板需求

### 6.1 机场 Header 当地时间

P0：

- 优先使用 `airportInfo.zoneId`，接口暂未提供时继续读取 `airport.zoneId`。
- 若只有 `airportInfo.timeZone = UTC+8`，前端必须解析 offset 并显示当前时间。
- `Local time` 展示格式：`15:42 UTC+8` 或 `15:42 Asia/Shanghai`。
- `Time zone` 展示原始时区：优先 IANA，辅以 offset。

P0 后端字段建议：

```js
airportInfo: {
  timeZone: "UTC+8",
  zoneId: "Asia/Shanghai",
  serverNowEpochMs: 1786002000000
}
```

### 6.2 天气和公告时间

P1：

- `weatherInfo.reportTime` 按机场当地时间展示。
- `weatherNotices[].sendDate` 和 `airportNotices[].sendDate` 按机场当地时间展示。
- 若无法确定机场时区，展示 raw 文本并标注 `timezone unknown`。

## 7. 搜索与列表时间需求

P1：

- 搜索展开区 `Updated` 不再使用设备本地时间。
- 默认展示相对时间：`Updated 3 min ago`。
- hover/title 或详情中展示 UTC 绝对时间。
- 机场行程列表未来补齐后，Arrivals 按到达机场当地时间排序，Departures 按起飞机场当地时间排序；排序使用 epoch，显示使用机场时区。

## 8. 管理后台时间需求

P2：

- 页面展示发布时间、审计时间时保留当前设备本地时间，但字段旁标注 `Local`。
- 导出 JSON 中保留 `publishedAt/exportedAt` 的 ISO UTC 字符串。
- CSV 导出增加一列 `timeZone` 或文档说明时间为 ISO UTC。

## 9. 后端字段补充需求

P0 必须补充：

| 接口 | 字段 | 用途 |
| --- | --- | --- |
| `513009.flightBaseInfo` | `depTime1EpochMs / depTime2EpochMs` | 起飞实际/预计/计划绝对时间 |
| `513009.flightBaseInfo` | `arrTime1EpochMs / arrTime2EpochMs` | 到达实际/预计/计划绝对时间 |
| `513009.flightBaseInfo` | `depZoneId / arrZoneId` | 起降机场 IANA 时区，已在新文档出现，需要稳定返回 |
| `513009.flightBaseInfo` | `arrEstimatedEpochMs` | 飞行中预计到达时间，避免把 `arrActualEpochMs` 和预计时间混用 |
| `513010.airportInfo` | `zoneId` | 机场当地时间和天气公告时间 |
| `513010.airportInfo` | `serverNowEpochMs` | 机场当地时间以服务端时间为基准，避免客户端时钟偏差 |

P1 建议补充：

- `513008.flyingPlanes[].positionTimestampEpochMs`。
- `513008.flyingPlanes[].updatedAtEpochMs`。
- 机场 Arrivals/Departures 列表中的 `scheduledTimeEpochMs / estimatedTimeEpochMs / actualTimeEpochMs / airportZoneId`。

## 10. 前端改造任务

P0：

1. 新增统一时间工具，替换 `parsePanelEpoch()` 和 `formatPanelTime()` 的隐式本地时区逻辑。
2. `data-service.js` 输出结构化 `TimeRef`，不再用 `displayTime()` 丢弃日期和时区。
3. 飞机详情起飞/到达时间分别按 `depZoneId`、`arrZoneId` 展示。
4. 机场当地时间支持 IANA zone 和 `UTC±HH:mm` offset。
5. 航迹点、图表、数据源时间固定 UTC。
6. 添加测试覆盖 `TZ=UTC`、`TZ=Asia/Shanghai`、`TZ=America/New_York` 三种设备时区。

P1：

1. 搜索结果更新时间改为相对时间 + UTC tooltip。
2. 天气和公告时间接入机场当地时区。
3. 增加用户时间显示偏好，但默认 UTC。

P2：

1. 管理后台时间文案标注 Local。
2. 导出 CSV 标明 ISO UTC。

## 11. 验收用例

### 11.1 设备时区差异

同一份接口数据在以下设备时区打开：

- `Asia/Shanghai`
- `UTC`
- `America/New_York`

验收标准：

- 起飞/到达机场时间文本完全一致。
- 机场 Header 当地时间只随真实当前时间流逝，不随设备时区跳变。
- 数据源时间固定 UTC，三端一致。
- elapsed/remaining 数值一致。

### 11.2 机场时区差异

示例航线：`ZBAA Asia/Shanghai -> EGLL Europe/London`。

验收标准：

- 起飞时间按 `Asia/Shanghai` 显示。
- 到达时间按 `Europe/London` 显示。
- 到达跨天用日期和 `+1d` 明确表达。
- 图表和最后位置时间仍为 UTC。

### 11.3 无 IANA zone，仅 UTC offset

接口只返回 `timeZone: "UTC+8"`。

验收标准：

- 机场当地时间显示为当前 `UTC+8` 时间，而不是裸 `UTC+8`。
- 时间文本标注 `UTC+8`。
- 不参与 DST 相关推断。

### 11.4 无时区字符串

接口返回 `depTime1: "2026-08-06 15:30"`，但没有 `depZoneId/depTimeZone/epochMs`。

验收标准：

- 展示 raw 文本并标注 `timezone unknown`。
- 不用于 elapsed/remaining 计算。
- 控制台输出一次可诊断 warning，不阻塞页面。

## 12. 开放问题

- `depTime1/arrTime1` 当前“计划 -> 预计 -> 实际”的变化顺序是否能稳定映射为当前状态下的实际语义。
- `arrActualEpochMs` 在飞行中是否可能承载预计到达时间；若可能，应拆分为 `arrEstimatedEpochMs` 和 `arrActualEpochMs`。
- `513010.airportInfo.timeZone` 是否可稳定补充 IANA `zoneId`。
- 机场天气和公告时间是否总是机场当地时间，还是服务端统一 Asia/Shanghai 时间。
- 管理后台是否需要提供 UTC/Local 切换，还是仅标注 Local 即可。
