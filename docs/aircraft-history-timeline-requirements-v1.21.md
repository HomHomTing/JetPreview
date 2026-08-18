# 在途飞机历史飞行记录时间轴需求文档 1.21

## 1. 文档定位

本文档定义选中在途飞机后，“行程”Tab 中历史飞行记录的重新设计方案。目标是学习 Flightradar24 aircraft history / playback 相关页面可观察的信息结构，但在本系统中以更适合公务机运行管理的“时间轴”方式展示一年历史数据。

建议归属版本：`1.21`。
形成日期：2026-08-17。

本版本只梳理需求文档和设计规范，暂不实施代码。

## 2. 参考观察

观察页面：

- Flightradar24 aircraft history 页面：`https://www.flightradar24.com/data/aircraft/d-aixl`
- Flightradar24 aircraft history 页面：`https://www.flightradar24.com/data/aircraft/g-xwba`
- Flightradar24 aircraft history 页面：`https://www.flightradar24.com/data/aircraft/n1ap`
- Flightradar24 subscription 页面：`https://www.flightradar24.com/premium`

可观察结论：

- Aircraft history 页面顶部先展示飞机身份：注册号、机型、运营方/航空公司、ICAO 机型代码、Mode S、序列号、机龄和飞机照片。
- 历史记录主体以行程列表承载，字段包括日期、出发机场、到达机场、航班号、飞行时长、计划起飞时间、实际起飞时间、计划到达时间、状态和操作入口。
- 单条行程按状态提供不同动作：已完成行程可进入回放，正在执行行程可进入 Live，部分行程提供 KML/CSV 导出。
- 状态文案直接表达运行结果，例如已落地、预计起飞、延误、正在执行等。
- 历史数据可见范围受会员等级影响。公开页面和订阅页面均显示：Silver 90 天，Gold 365 天，Business 3 年。
- FR24 使用表格保证信息密度；本项目面向公务机运行管理，需改为更易扫描时间顺序、停场节奏和航段连续性的时间轴。

边界：

- 不在本系统露出 Flightradar24 品牌、商标、会员提示或付费文案。
- 不抓取 FR24 运行数据、接口、图片、代码或账户信息。
- 本系统只使用自有数据库接口，包括 `513008`、`513009`、`513011`、`513013`。
- FR24 的字段结构用于产品学习，本系统视觉需沿用当前地图工具的深色面板规范和自有图标体系。

## 3. 当前状态审计

### 3.1 已具备能力

- 选中飞机后已有独立“行程”Tab，位于“信息”Tab 右侧。
- `data-service.js` 已存在 `adaptFlightHistory(payload)` 和 `adaptHistoryFlight(item)`。
- `app.js` 已存在 `loadAircraftHistory(jet)`，在进入 Journey Tab 时通过 `513013` 加载历史行程。
- 当前 UI 可展示 `groundAirportInfo` 当前停场摘要。
- 当前 UI 可展示最近 6 条历史行程卡片。

### 3.2 当前问题

- 当前展示仍是普通列表，缺少时间轴结构，不能体现一年内飞行节奏。
- 只展示最近 6 条，无法覆盖 365 天历史。
- 没有年/月/日期分组，长列表扫描效率低。
- 行程字段没有完整对齐 FR24 的历史行程信息结构，例如计划/实际时间、飞行时长、状态、动作入口没有形成固定列位。
- 只有 `depTime1 / arrTime1`，没有清晰展示计划、预计、实际时间之间的差异。
- `513013` 文档返回了分页字段，但入参未声明 `page / pageSize / startDate / endDate`，无法稳定按一年窗口加载。
- 点击历史行程后的行为不明确：若只有 `flightId` 而无 `uniqueKey`，无法确定是否能调用 `513009` 展示历史航迹。

## 4. 产品目标

### 4.1 用户目标

用户选中一架在途公务机后，需要在“行程”Tab 中快速判断：

- 过去一年这架飞机执行过哪些飞行任务。
- 最近一次飞行、当前在途飞行、当前停场机场之间的连续关系。
- 每次飞行的起飞机场、到达机场、起飞/到达时间、飞行时长和状态。
- 某月或某段时间内飞行频率、常用机场和异常状态。
- 点击某次历史行程后，能进入该行程详情或历史航迹/回放。

### 4.2 系统目标

- 支持 Gold 级别的一年历史展示能力，即默认可查询最近 365 天。
- 使用时间轴替代表格/普通卡片列表，提升长周期历史扫描效率。
- 与现有 Selected Aircraft Panel、Route、Track、Speed & Altitude Graph 保持交互一致。
- 为后续历史航迹回放、导出、机场运营统计、飞机利用率分析预留字段。

## 5. 信息架构

“行程”Tab 调整为五个区域：

| 区域 | 优先级 | 内容 |
| --- | --- | --- |
| History summary | P0 | 一年总行程数、累计飞行时长、最近飞行、当前停场机场 |
| Range controls | P0 | 7 天 / 30 天 / 90 天 / 365 天、状态筛选、机场搜索 |
| Timeline | P0 | 按月份和日期分组的历史行程时间轴 |
| Flight detail drawer | P1 | 点击历史行程后的右侧或内嵌详情 |
| Action footer | P1 | 加载更多、回到当前、导出入口 |

## 6. 时间轴展示规范

### 6.1 总体结构

时间轴采用“月份分组 + 日期节点 + 航段卡片”结构。

```text
2026 Aug
  17 Mon
    LIVE  PEK -> HND  B-8202  14:20 / --  途中
  15 Sat
    Landed  SHA -> PEK  1h 58m  09:40 / 11:38
    Landed  HKG -> SHA  2h 12m  06:10 / 08:22

2026 Jul
  ...
```

视觉原则：

- 左侧使用一条连续时间轴线，月分组处加粗，日期节点使用圆点。
- 月份标题 sticky，用户滚动一年数据时始终知道当前月份。
- 日期节点只在当天第一条行程前出现，同一天多条行程共享日期。
- 行程卡片右侧对齐状态与动作，保证扫描速度。
- 当前在途行程固定置顶，并在时间轴中同步出现，但不重复计数。

### 6.2 航段卡片内容

单条行程卡片包含以下字段：

| 信息 | 展示位置 | 来源 | 说明 |
| --- | --- | --- | --- |
| 状态 | 左上角 badge | `flightStateStr / flightState` | 途中、已落地、延误、取消、计划 |
| 出发机场 | 主路线左侧 | `depAirport / depAirportFourName / depAirportName` | 优先 IATA；hover 或展开展示完整名 |
| 到达机场 | 主路线右侧 | `arrAirport / arrAirportFourName / arrAirportName` | 同上 |
| 路线方向 | 主视觉 | 前端 | `DEP -> ARR`，中间用细线/箭头 |
| 起飞时间 | 次级信息左侧 | `depActualEpochMs > depTime1` | 按起飞机场时区展示 |
| 到达时间 | 次级信息右侧 | `arrActualEpochMs > arrTime1` | 按到达机场时区展示，跨天显示 `+1d` |
| 计划时间 | 展开区 | 后端新增 `scheduled*EpochMs` | 对齐 FR24 的 STD/STA 信息 |
| 实际时间 | 展开区 | `depActualEpochMs / arrActualEpochMs` | 对齐 FR24 的 ATD/ATA 信息 |
| 飞行时长 | 右侧 metric | `estimateTime` 或实际时间差 | 格式 `2h 15m` |
| 行程 ID | 展开区 | `flightId` | 作为内部关联，不做主标题 |
| 操作 | 右下角 | `uniqueKey / flightId` | 查看航迹、回放、分享、导出 |

### 6.3 状态样式

状态样式保持工具型、低噪声，不使用大面积色块：

| 状态 | 视觉 | 说明 |
| --- | --- | --- |
| `live / 途中` | 黄色细描边 + 小实心点 | 与地图 selected aircraft 呼应 |
| `landed / 已落地` | 绿色或青色小 badge | 表示完成 |
| `scheduled / 计划` | 灰色描边 badge | 表示未来或未开始 |
| `delayed / 延误` | 橙色文本或小 badge | 仅强调时间异常 |
| `cancelled / 取消` | 灰色删除线或 muted badge | 低优先级展示 |
| `unknown` | 灰色 `--` | 不猜测状态 |

### 6.4 时间展示

沿用 `docs/timezone-time-display-requirements-v1.13.md`：

- 起飞时间按起飞机场时区展示。
- 到达时间按到达机场时区展示。
- UTC 时间不在卡片常驻展示，避免冗余；hover 或展开区展示完整 UTC。
- 如果只有无时区字符串，展示 raw 文本并标注 `timezone uncertain`，不得参与耗时计算。
- 跨天用 `+1d` 或 `+2d` 贴在到达日期旁，而不是只贴在时间后。

卡片常驻样式：

```text
PEK 14:20 UTC+8  ->  HND 18:05 UTC+9 +1d
```

展开区样式：

```text
STD 14:00 | ATD 14:20
STA 17:50 | ATA 18:05
UTC 06:20 -> 09:05
```

### 6.5 月份与日期分组

分组规则：

- 排序使用 `depActualEpochMs`，缺失时使用 `depTime1` 可解析结果，再缺失使用接口返回顺序。
- 月份分组按出发机场当地日期生成；无法识别时回退 UTC。
- 同一天多条航班按出发时间倒序。
- 当前在途航班即使出发日期是昨天，也固定出现在顶部 `Current flight` 区，并在对应日期位置保留正常条目。

月份标题包含：

- 月份：`2026 Aug`
- 当月行程数：`18 flights`
- 当月累计飞行时长：`42h 15m`
- 常用机场：可 P1 展示，例如 `PEK · SHA · HKG`

### 6.6 当前停场摘要

`513013.groundAirportInfo` 不再作为普通卡片插入列表，而是放在 History summary 区：

```text
Currently on ground
KHN 南昌昌北 · China
Since -- / Last landed --
```

若当前飞机在途，则显示 `Currently airborne`，并展示当前 `513008/513009` 选中行程摘要。

## 7. 交互规范

### 7.1 默认加载

- 打开 selected aircraft 面板时，不立即加载一年历史，避免点击飞机变慢。
- 用户切换到“行程”Tab 后，立即加载最近 30 天。
- 若用户选择 `365d`，再加载一年数据。
- 如果后端支持分页，按月份或分页增量加载；如果后端一次返回一年数据，前端必须虚拟滚动。

### 7.2 筛选

P0 筛选：

- 时间范围：`7d / 30d / 90d / 365d`
- 状态：`全部 / 途中 / 已完成 / 异常 / 计划`
- 机场：输入 IATA/ICAO/城市名，过滤出发或到达机场

P1 筛选：

- 运营类型：自营 / 托管 / 私人
- 国家/地区
- 仅显示有航迹可回放的行程

筛选规则：

- 筛选不改变地图 selected aircraft。
- 筛选结果为空时保留时间轴容器，显示空态。
- 清空筛选后恢复原滚动位置，除非用户切换了时间范围。

### 7.3 点击行程

点击历史行程卡片后的行为分三档：

| 条件 | 行为 |
| --- | --- |
| 有 `uniqueKey` 且 `513009` 支持历史行程 | 加载历史航迹，地图进入 historical selected route 状态 |
| 只有 `flightId`，后端可映射 | 先调用后端映射接口或扩展 `513013` 返回 `uniqueKey` |
| 无法打开航迹 | 只展开行程详情，不移动地图 |

历史航迹展示要求：

- 不能覆盖当前在途飞机的实时选中态，必须有清晰的 `Historical flight` 模式提示。
- 历史航迹使用当前 1.15 航迹色阶规则，但状态 label 明确标注为历史。
- 退出历史行程后回到当前 selected aircraft。

### 7.4 回放动作

对齐 FR24 的 `Play / Live` 交互语义，但使用本系统命名：

- 当前在途行程：显示 `Live`，点击回到实时地图。
- 已完成行程且有轨迹：显示 `Playback`，进入历史回放。
- 行程无轨迹：动作置灰，tooltip 显示 `No track data`。
- 未来计划行程：显示 `Share` 或 `Details`，不显示回放。

### 7.5 滚动与定位

- 顶部提供 `Today / Current flight` 快捷按钮。
- 月份标题 sticky，不遮挡卡片点击区域。
- 滚动到历史月份时，Range controls 保持固定。
- 从搜索结果或机场详情跳转到某条历史行程时，时间轴自动滚动到该卡片并短暂高亮。

## 8. 数据接口要求

### 8.1 当前接口

当前使用 `513013 查询指定注册号的历史行程`：

| 字段 | 用途 |
| --- | --- |
| `currentPage / hasNextPage` | 分页状态 |
| `data[]` | 历史行程列表 |
| `groundAirportInfo` | 当前停场机场 |
| `flightId` | 行程内部 ID |
| `depAirport / arrAirport` | 起降机场代码 |
| `depAirportName / depAirportFourName / depAirportNameEn` | 出发机场名称 |
| `arrAirportName / arrAirportFourName / arrAirportNameEn` | 到达机场名称 |
| `flightState / flightStateStr / flightStateIcon` | 行程状态 |
| `depTime1 / arrTime1` | 当前阶段时间文本 |
| `depActualEpochMs / arrActualEpochMs` | 实际起降绝对时间 |
| `depTimeZone / arrTimeZone` | UTC offset |
| `depZoneId / arrZoneId` | IANA 时区 |
| `estimateTime` | 预计或实际飞行时长分钟 |
| `acrossDays` | 到达跨天 |

### 8.2 需要后端补充

为稳定支持一年历史和 FR24 式信息完整度，`513013` 需要补充以下入参：

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `page` | Number | N | 默认 1 |
| `pageSize` | Number | N | 建议 50，最大 100 |
| `startDate` | String | N | 查询起始日期，格式 `YYYY-MM-DD` |
| `endDate` | String | N | 查询结束日期，格式 `YYYY-MM-DD` |
| `rangeDays` | Number | N | 7 / 30 / 90 / 365 |
| `status` | String | N | all/live/completed/abnormal/scheduled |
| `airportCode` | String | N | 出发或到达机场过滤 |

`513013.data[]` 需要补充以下字段：

| 字段 | 用途 |
| --- | --- |
| `uniqueKey` | 直接调用 `513009` 查看历史航迹 |
| `callSign` | 航班号/任务号，没有则显示注册号 |
| `scheduledDepartureEpochMs` | STD |
| `actualDepartureEpochMs` | ATD，若与现有 `depActualEpochMs` 重复可二选一 |
| `scheduledArrivalEpochMs` | STA |
| `actualArrivalEpochMs` | ATA，若与现有 `arrActualEpochMs` 重复可二选一 |
| `estimatedArrivalEpochMs` | 预计到达 |
| `durationMinutes` | 实际飞行时长，优先于估算 |
| `trackAvailable` | 是否可查看历史航迹 |
| `playbackAvailable` | 是否可回放 |
| `exportAvailable` | 是否允许导出 |
| `dataCompleteness` | complete / partial / no-track |

### 8.3 前端标准对象

前端适配层输出统一对象：

```js
{
  id: "FL227789",
  uniqueKey: "optional-513009-key",
  callSign: "B-8202",
  status: "completed",
  statusText: "已落地",
  dep: {
    iata: "PEK",
    icao: "ZBAA",
    nameCn: "北京首都",
    nameEn: "Beijing Capital",
    zone: "Asia/Shanghai"
  },
  arr: {
    iata: "HND",
    icao: "RJTT",
    nameCn: "东京羽田",
    nameEn: "Tokyo Haneda",
    zone: "Asia/Tokyo"
  },
  times: {
    scheduledDeparture: TimeRef,
    actualDeparture: TimeRef,
    scheduledArrival: TimeRef,
    actualArrival: TimeRef,
    estimatedArrival: TimeRef
  },
  durationMinutes: 155,
  acrossDays: 1,
  trackAvailable: true,
  playbackAvailable: true,
  dataCompleteness: "complete"
}
```

## 9. 性能与加载策略

### 9.1 一年数据规模

一年历史可能包含：

- 低频公务机：20-80 条。
- 高频公务机：150-400 条。
- 极高频运营机：500+ 条。

前端必须按 `500` 条历史行程设计性能预算。

### 9.2 渲染策略

- 时间轴列表使用虚拟滚动或分段渲染，首屏最多插入 40 条 DOM 卡片。
- 月份分组可以提前渲染，行程卡片按可视范围挂载。
- 不在时间轴卡片中渲染地图、图表或图片。
- 历史行程 hover 不触发地图航迹请求。
- 只有点击卡片或点击 Playback 时才请求历史航迹。

### 9.3 缓存策略

缓存 key：

```text
aircraft-history:{tailNoEncrypted}:{rangeDays}:{filtersHash}
```

缓存规则：

- 7d / 30d：缓存 2 分钟。
- 90d / 365d：缓存 10 分钟。
- 当前在途行程由实时接口刷新，不依赖历史缓存。
- 切换飞机时清理上一架飞机的未完成请求，保留已完成缓存。

## 10. 视觉设计规范

### 10.1 面板风格

沿用当前 selected panel 深色工具面板：

- 背景：`var(--graphite-panel)` 和 `var(--graphite-panel-2)`。
- 边框：`var(--graphite-border)`，透明度低。
- 主文字：`var(--graphite-text)`。
- 辅助文字：`var(--graphite-muted)`。
- 关键实时色：沿用当前黄色 selected 色。
- 卡片圆角不超过 `8px`。

### 10.2 时间轴线

时间轴线建议：

- 位置：卡片左侧 `14-18px`。
- 线宽：`1px`。
- 颜色：`rgba(255,255,255,0.12)`。
- 月份节点：`6px` 实心点。
- 日期节点：`4px` 空心点。
- 当前在途节点：黄色实心点 + 轻微外描边。

### 10.3 航段卡片

卡片布局：

```text
┌──────────────────────────────┐
│ Live        2h 15m       ... │
│ PEK ──────────────── HND     │
│ 14:20 UTC+8     18:05 UTC+9 │
│ 北京首都          东京羽田    │
└──────────────────────────────┘
```

要求：

- 路线代码使用等宽字体，便于扫描。
- 起降机场代码字号大于机场名称。
- 状态 badge 不超过 72px 宽，长文案截断。
- 卡片 hover 只改变边框和轻微背景，不整体发光。
- Active 卡片使用 selected 黄色左边线或上边线，不使用大面积背景。

### 10.4 控件

- 时间范围使用 segmented control，不使用普通文本链接。
- 状态筛选使用下拉或 segmented control，默认 `全部`。
- 机场过滤使用小型搜索输入，placeholder 为 `Airport`。
- 操作按钮使用图标 + tooltip，例如回放、查看航迹、导出。

## 11. 空态、加载态、错误态

| 状态 | 触发 | 展示 |
| --- | --- | --- |
| Loading | 首次进入行程 Tab | 时间轴骨架屏，保留 summary 骨架 |
| Partial | 部分页加载失败 | 已加载月份正常展示，底部显示重试 |
| Empty | 365 天无历史 | 显示空时间轴和当前停场/在途摘要 |
| No permission | 后端返回无权限 | 显示权限空态，不显示 FR24 会员文案 |
| Error | 首屏失败 | 显示错误卡片和重试按钮 |
| No track | 行程存在但无轨迹 | 卡片可展开，Playback 置灰 |

## 12. 与地图联动

### 12.1 默认状态

- 仅浏览时间轴不改变地图。
- Hover 时间轴卡片不高亮地图航迹，避免误触和性能消耗。
- 当前在途行程仍保持 selected aircraft 状态。

### 12.2 查看历史航迹

当用户点击 `View track` 或 `Playback`：

- 地图进入 `historicalFlight` 模式。
- 左侧面板顶部出现历史模式提示和返回实时按钮。
- 地图绘制该历史行程航迹，隐藏无关普通飞机可作为 P1。
- 历史航迹不参与实时刷新。
- 退出后恢复实时 selected aircraft、当前航迹和当前航班详情。

### 12.3 与搜索和机场面板联动

P1：

- 搜索飞机结果可直接打开该飞机历史时间轴。
- 机场详情中的进出港记录点击后，可定位到某架飞机的对应历史行程。
- 时间轴中点击机场代码，可打开机场详情，但不自动改变地图缩放，除非用户点击 `Show airport`。

## 13. 验收标准

P0：

1. 选中飞机后，“行程”Tab 仍独立存在，并位于“信息”Tab 右侧。
2. 切换到“行程”Tab 后，加载 `513013` 历史行程。
3. 支持 `7d / 30d / 90d / 365d` 时间范围切换。
4. `365d` 范围下可以展示一年历史数据，滚动不卡顿。
5. 历史行程按月份、日期、航段卡片组成时间轴。
6. 每条卡片展示出发机场、到达机场、状态、起飞时间、到达时间和飞行时长。
7. 时间按起降机场时区展示，展开区可查看 UTC。
8. `groundAirportInfo` 在顶部 summary 展示，不混入普通历史行程。
9. 点击无轨迹历史行程时只展开详情，不破坏当前 selected aircraft。
10. 首屏加载失败、无历史、无权限都有明确状态。

P1：

1. 有 `uniqueKey` 的历史行程可调用 `513009` 展示历史航迹。
2. 已完成行程支持 Playback 入口。
3. 状态筛选和机场过滤可用。
4. 月份分组展示当月行程数和累计飞行时长。
5. 可从历史行程跳转到机场详情。

## 14. 不在本次范围

- 不实现 FR24 的 KML/CSV 导出。
- 不复刻 FR24 的表格视觉、品牌、广告和会员升级模块。
- 不新增外部数据源。
- 不改变 1.15 航迹绘制规范。
- 不改变 1.16 地图层级规则。
- 不改变飞机 icon 资产和机型映射。

## 15. 实施建议

建议拆分为三步：

1. 数据层：扩展 `data-service.js` 的 `getFlightHistory()` 支持 range/page/filter，并输出标准 TimelineFlightRecord。
2. UI 层：重写 `renderFlightHistoryRows()` 为 `renderFlightHistoryTimeline()`，新增时间轴 CSS。
3. 联动层：补充历史行程点击、历史航迹模式、Playback 入口和返回实时状态。

风险优先级：

- 最高风险是 `513013` 缺少 `page / range / uniqueKey`，会影响一年数据加载和历史航迹查看。
- 第二风险是时间字段语义不完整，可能导致计划、预计、实际时间混用。
- 第三风险是长列表 DOM 性能，需要在 365 天场景下提前做虚拟滚动或分段渲染。
