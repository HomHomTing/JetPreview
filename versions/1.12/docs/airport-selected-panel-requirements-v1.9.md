# Airport Selected Panel Requirements 1.9

## 1. 文档定位

本文档用于定义地图中选中机场后，左侧机场运行面板的产品需求。目标是在信息组织和交互节奏上学习 Flightradar24 机场选中面板，但生产实现只使用本系统自有数据库、授权地图服务和自有视觉资产。

建议归属版本：`1.9`。当前项目根目录仍保持 `1.8` 活跃状态，本文档只沉淀下一阶段需求，不修改运行版本。

观察与资料确认日期：2026-08-04。

参考资料：

- Flightradar24 官方博客：`https://www.flightradar24.com/blog/inside-flightradar24/new-flightradar24-features-airport-information-panels-new-weather-layers-and-better-email-alerts/`
- Flightradar24 官方支持文档：`https://support.fr24.com/support/solutions/articles/3000115501-what-are-the-blue-points-on-the-map-`
- Flightradar24 官方博客：`https://www.flightradar24.com/blog/inside-flightradar24/an-overview-of-the-updated-airport-information-panel-on-flightradar24-com/`
- Flightradar24 官方博客：`https://www.flightradar24.com/blog/inside-flightradar24/airport-history-by-date/`
- Flightradar24 官方支持文档：`https://support.fr24.com/support/solutions/articles/3000127964-what-s-airport-view-and-how-to-use-it`

重要边界：

- 不在本系统界面中露出 Flightradar24 品牌、商标或文案。
- 不抓取 Flightradar24 运行数据、接口、代码或未授权素材。
- 不把示例数据用于主地图生产态；接口缺字段时显示真实空态或数据能力提示。
- 航班、飞机、停场列表默认仅展示公务机业务范围，不混入普通民航客班。
- 飞机注册号展示优先使用接口返回的明文注册号， encrypted tail number 只用于接口传参。

## 2. FR24 机场选中面板关键学习结论

### 2.1 入口与选中行为

FR24 的机场入口主要来自地图机场点和搜索机场。点击机场点或搜索结果后，地图会居中到该机场，同时在左侧打开机场信息面板。

对本系统的转化要求：

- 点击机场 marker、搜索机场、点击航线起降机场代码，都应进入同一个 selected airport 状态。
- 机场面板从左侧打开，地图保持可操作。
- 被选中的机场 marker 不受机场层 zoom 阈值和可见性开关影响，必须保留在地图上。
- 重复点击同一机场只刷新或聚焦面板，不重复堆叠面板。

### 2.2 默认信息架构

FR24 新版机场面板点击后默认进入 Arrivals，并提供 Departures、On ground 等切换入口。More 入口会进入完整机场数据页。点击面板内某个航班，可展开查看航班时间、飞机信息、照片和跳转动作；若航班在空中，可从面板直接在地图上跟随该航班。

对本系统的转化要求：

- 机场面板默认 tab 为 `Arrivals`。
- 一级 tab 必须包含 `Arrivals`、`Departures`、`On ground`。
- 机场基础信息、天气、跑道、航站楼/FBO、公告作为面板内固定摘要或二级详情区。
- 航班行点击后展开，提供“选中飞机 / 查看航迹 / 查看飞机基础信息”的能力。
- `More` 不跳转外部网站；应进入本系统机场完整详情页或扩大版机场抽屉。

### 2.3 基础信息呈现

FR24 机场面板顶部展示机场名称、IATA/ICAO、当地时间、UTC 偏移、海拔等基础信息，并在通用信息区补充天气、跑道和机场相关统计。

对本系统的转化要求：

- 面板 header 以机场名称和三字码/四字码为第一优先级。
- 同屏展示城市/国家、当地时间、时区、坐标、海拔、机场等级、机场性质。
- 天气摘要、今日进出港统计和停场总数需要在首屏可见。
- 跑道和航站楼/FBO 信息不应埋得过深，至少提供摘要和展开入口。

### 2.4 进场、离场、停场

FR24 机场数据能力覆盖到达板、离港板、机场地面飞机和历史起降事件。官方资料中也提到订阅用户可查看一定范围的机场历史起降记录。

对本系统的转化要求：

- `Arrivals` 面向飞往该机场的公务机行程。
- `Departures` 面向从该机场起飞或计划起飞的公务机行程。
- `On ground` 面向当前停在该机场或处于地面状态的公务机。
- 历史起降事件作为 P1 能力纳入，不阻塞 P0 机场面板上线。

## 3. 产品目标

### 3.1 用户目标

业务用户点选机场后，需要立即判断：

- 这个机场是谁、在哪里、当前天气和运行状态如何。
- 今天有多少公务机进港、离港、停场。
- 当前有哪些公务机正在飞往该机场。
- 当前有哪些公务机从该机场离开或准备离开。
- 当前有哪些公务机停在该机场，属于什么机型、运营商或品牌。
- 点击具体飞机后，能继续查看飞机基础信息、航线、航迹和注册号明文。

### 3.2 系统目标

- 以真实接口数据驱动机场面板。
- 保持地图与左侧面板的联动，不打断地图浏览。
- 为后续机场运行大屏、机场历史、FBO 停场分析预留数据模型。
- 在接口尚未提供列表级数据时，明确展示真实空态，不生成假列表。

## 4. 面板信息架构

### 4.1 总体结构

机场选中面板由五个区域组成：

| 区域 | 优先级 | 内容 |
| --- | --- | --- |
| Header | P0 | 机场名称、IATA/ICAO、城市/国家、当地时间、天气摘要、关闭按钮 |
| Summary strip | P0 | 今日预计起降、进场、离场、停场、最后更新时间 |
| Tabs | P0 | Arrivals、Departures、On ground |
| Content list | P0 | 当前 tab 的行程/飞机列表、加载态、空态、错误态 |
| Detail sections | P1 | Airport info、Weather、Runways、Terminals/FBO、Notices、More |

### 4.2 桌面与移动布局

- 桌面端左侧面板宽度建议 `380-430px`，保持地图主体可见。
- 小屏端使用底部抽屉，默认展开到 `60-70%` 高度，可继续上拉到全屏。
- Header 和 tab 在面板滚动时保持 sticky。
- 列表内容采用紧凑行高，优先显示关键运行字段，不做营销化卡片堆叠。
- 面板关闭后保留当前地图中心和 zoom，只清除 selected airport 状态。

### 4.3 面板状态

| 状态 | 触发 | 表现 |
| --- | --- | --- |
| `loading` | 首次点选机场或缓存过期 | Header 先显示 marker 基础信息，列表区显示骨架 |
| `ready` | `513010` 和可用列表数据加载成功 | 展示完整摘要与当前 tab |
| `partial` | 基础信息成功，列表级数据缺失 | 展示基础信息和汇总；列表区显示真实空态 |
| `stale` | 刷新失败但已有旧数据 | 保留旧数据并标注最后更新时间 |
| `empty` | 接口确认无该 tab 数据 | 展示空列表，不显示示例项 |
| `error` | 首次加载失败 | 提供重试，不切回示例数据 |

## 5. 功能分解

### 5.1 机场选中与地图联动

P0 要求：

- 点击机场 pin 后设置 `selectedKind = "airport"` 和 `selectedId = airport.id`。
- 地图平滑居中到机场坐标；若当前 zoom 过低，建议提升到可读 zoom，但不能强制跳到极近视角。
- selected 机场 marker 放大并显示完整标签。
- 如果机场层设置为 Off，selected 机场仍显示；普通机场继续隐藏。
- 打开面板后立即发起 `513010` 机场详情请求。
- 请求使用 IATA 三字码 `airportCode`；若只有 ICAO，需要先从机场索引中解析三字码。

P1 要求：

- 搜索机场结果点击后复用同一流程。
- 点击航班详情中的出发/到达机场代码，可切换 selected airport。
- 面板支持浏览器历史状态：后退回到上一个选中对象。

### 5.2 Header 与基础信息

P0 字段：

| 字段 | 展示 | 来源 |
| --- | --- | --- |
| 机场名称 | 主标题 | `513010.airportInfo.airportNameEn / airportName` |
| IATA | 代码 | `airportInfo.airportCode` 或 `513008.airportList.airportCode` |
| ICAO | 代码 | `airportInfo.icaoCode` 或 `513008.airportList.icaoCode` |
| 城市 | 副信息 | `513008.airportList.cityName` |
| 国家 | 副信息 | `airportInfo.countryName` |
| 当地时间 | Header 右侧 | `airportInfo.timeZone`，后续优先 IANA zone id |
| 坐标 | Airport info | `airportInfo.lat/lon` |
| 海拔 | Airport info | `airportInfo.elevation`，单位米 |
| 机场等级 | Airport info | `airportInfo.grade` |
| 机场性质 | Airport info | `airportInfo.type` |
| 高原标识 | Airport info | `airportInfo.plateau` |

展示规则：

- Header 首屏不显示 FR24 标识。
- 机场名称过长时单行截断，hover 或展开区展示完整名称。
- 代码展示顺序为 `IATA / ICAO`，缺失时展示已有代码。
- 当地时间必须按机场时区计算，不使用用户本地时间替代。
- 经纬度保留 4-5 位小数。

### 5.3 运行摘要

P0 字段：

| 指标 | 来源 | 说明 |
| --- | --- | --- |
| 今日预计起降 | `513010.flightsInfo.sortiesEstimate` | 必须确认是否为公务机口径 |
| 计划进场 | `flightsInfo.inboundPlan` | tab badge 可使用 |
| 实际进场 | `flightsInfo.inboundActually` | summary 主值优先 |
| 取消进场 | `flightsInfo.inboundCancel` | 作为小标签 |
| 计划离场 | `flightsInfo.outboundPlan` | tab badge 可使用 |
| 实际离场 | `flightsInfo.outboundActually` | summary 主值优先 |
| 取消离场 | `flightsInfo.outboundCancel` | 作为小标签 |
| 停场总数 | `513010.groundInfo.groundNum` | summary 主值 |

展示规则：

- 如果实际值为 0 但计划值存在，summary 显示计划值并弱化标识。
- 如果接口返回的是全航班口径而非公务机口径，必须要求后台增加口径字段，前端不能自行假设。
- 最后更新时间显示为本地可读时间，同时保留 `serverNowEpochMs` 时优先使用服务端时间。

### 5.4 Arrivals 进场 tab

目标：展示正在飞往、计划飞往或刚刚到达该机场的公务机。

P0 列表字段：

| 字段 | 含义 | 建议来源 |
| --- | --- | --- |
| `uniqueKey` | 行程唯一键 | `513008.flyingPlanes[].uniqueKey` 或机场行程列表 |
| `tailNoClear` | 明文注册号 | `513008.flyingPlanes[].tailNoClear` |
| `tailNo` | 加密注册号 | 仅用于 `513011` 入参，不展示 |
| `aircraftTypeCode` | 机型代码 | 行程列表或 `513011.planeInfo.icaoCode/modelSeries` |
| `planeSize` | 公务机尺寸级别 | `513008.flyingPlanes[].planeSize` |
| `originAirportCode` | 起飞机场 | 行程列表或 `513009.flightBaseInfo.depAirport` |
| `originAirportName` | 起飞机场名 | 行程列表或 `513009.flightBaseInfo.depAirportName` |
| `scheduledArrivalTime` | 计划到达 | 行程列表 |
| `estimatedArrivalTime` | 预计到达 | 行程列表 |
| `actualArrivalTime` | 实际到达 | 行程列表 |
| `flightState` | 行程状态 | 行程列表或 `513009.flightBaseInfo.flightState` |
| `distanceRemaining` | 剩余距离 | P1，需后端或前端按坐标估算 |

P0 交互：

- Arrivals 为机场面板默认 tab。
- 列表默认按预计/实际到达时间升序排序。
- 飞行中 inbound 行优先显示在已到达记录前。
- 取消行程保留但弱化显示，不参与地图跟随。
- 点击行展开，显示出发/到达时间、飞机注册号、机型、运营商摘要。
- 如果行程正在飞行且有坐标，提供选中飞机并在地图上显示航迹。

状态分组：

| 状态 | 规则 |
| --- | --- |
| `in_air` | 正在飞行，目的机场为当前机场 |
| `scheduled` | 计划进场，未起飞或无实时点 |
| `landed` | 已落地，落地时间在当前展示窗口内 |
| `cancelled` | 行程取消 |
| `unknown` | 缺少状态，但到达机场匹配 |

接口缺口：

- 当前 `513008_v2` 文档中的 `flyingPlanes` 只包含位置、注册号、共享状态、公司和 `planeSize`，不包含出发/到达机场、计划/预计/实际时间和状态。
- 当前 `513010` 只有进场汇总数量，没有进场列表。
- 因此 Arrivals 完整列表需要后台补充 `arrivals[]`，或在 `513008.flyingPlanes[]` 中补充 route/time/status 字段。

### 5.5 Departures 离场 tab

目标：展示从该机场出发、计划出发或刚刚起飞的公务机。

P0 列表字段：

| 字段 | 含义 | 建议来源 |
| --- | --- | --- |
| `uniqueKey` | 行程唯一键 | `513008` 或机场行程列表 |
| `tailNoClear` | 明文注册号 | `513008.tailNoClear` |
| `aircraftTypeCode` | 机型代码 | 行程列表或 `513011` |
| `planeSize` | 公务机尺寸级别 | `513008.planeSize` |
| `destinationAirportCode` | 到达机场 | 行程列表或 `513009.flightBaseInfo.arrAirport` |
| `destinationAirportName` | 到达机场名 | 行程列表或 `513009.flightBaseInfo.arrAirportName` |
| `scheduledDepartureTime` | 计划起飞 | 行程列表 |
| `estimatedDepartureTime` | 预计起飞 | 行程列表 |
| `actualDepartureTime` | 实际起飞 | 行程列表 |
| `flightState` | 行程状态 | 行程列表或 `513009.flightBaseInfo.flightState` |

P0 交互：

- 列表默认按计划/预计起飞时间升序排序。
- 当前已起飞且出发机场为当前机场的飞机仍保留在近期离场中。
- 点击飞行中离场行，选中飞机并显示航迹。
- 点击未起飞行，只展开行程/飞机基础信息，不在地图上移动到空中位置。

状态分组：

| 状态 | 规则 |
| --- | --- |
| `scheduled` | 计划离场，未起飞 |
| `taxi` | 地面滑行或即将起飞，后端明确返回时展示 |
| `departed` | 已起飞，出发机场为当前机场 |
| `cancelled` | 行程取消 |
| `unknown` | 缺少状态，但出发机场匹配 |

接口缺口：

- 当前接口未提供机场维度的离场列表。
- 仅通过 `513009` 可获得单个已知 `uniqueKey` 的出发/到达机场和时间，不能支撑机场离场板批量渲染。
- 需要后台提供 `departures[]` 或丰富 `513008.flyingPlanes[]`。

### 5.6 On Ground 停场 tab

目标：展示当前停在该机场的公务机，并支持从机场视角理解停场规模、机型结构和可售/可用线索。

P0 列表字段：

| 字段 | 含义 | 建议来源 |
| --- | --- | --- |
| `tailNoClear` | 明文注册号 | 新增 `513010.groundAircraft[].tailNoClear` |
| `tailNo` | 加密注册号 | 仅用于 `513011` 入参 |
| `aircraftTypeCode` | 机型代码 | `groundAircraft[]` 或 `513011.planeInfo.icaoCode` |
| `modelName` | 机型名称 | `groundAircraft[]` 或 `513011.planeInfo.modelName` |
| `planeSize` | 公务机级别 | `groundAircraft[]` |
| `operatorName` | 托管/运营商 | `groundAircraft[]` 或 `513011.serviceProvider` |
| `brandName` | 品牌 | `513010.groundInfo.groundDetal.brands` 或行级字段 |
| `arrivedAt` | 到达/开始停场时间 | 新增字段 |
| `groundDuration` | 停场时长 | 后端返回或前端按 `arrivedAt` 计算 |
| `fboOrTerminal` | 公务机楼/FBO/航站楼 | `airportTerminals` 或新增行级字段 |
| `nextTrip` | 下一段行程 | P1，需后端提供 |

P0 汇总：

- 总停场数使用 `513010.groundInfo.groundNum`。
- 品牌结构使用 `groundInfo.groundDetal.brands`。
- 如果没有行级停场飞机，On Ground tab 展示品牌汇总和接口缺口空态，不生成单机示例。

P1 交互：

- 支持按机型尺寸、品牌、运营商、FBO 分组。
- 支持搜索明文注册号。
- 点击停场飞机后调用 `513011` 加载飞机详情。
- 如果飞机存在待售行程或停场计划，显示销售/计划摘要。

接口缺口：

- 当前 `513010.groundInfo` 只有停场总数和品牌聚合，没有单架停场飞机列表。
- 当前 `513011.groundPlans` 是单机详情下的停场计划，不适合为了机场面板批量逐机请求。
- 需要后台在 `513010` 增加 `groundAircraft[]`，或新增机场停场列表接口。

### 5.7 Latest Events 最新起降

目标：借鉴 FR24 的机场历史事件能力，展示近期落地和起飞事件，帮助用户判断机场动态。

优先级：P1。

推荐字段：

- 事件类型：`landing / takeoff`。
- 事件时间：计划、实际、服务端时间戳。
- 机场方向：origin/destination。
- 明文注册号、机型代码、机型名称、运营商。
- `uniqueKey`，用于打开行程航迹。

展示规则：

- 默认只展示最近 4 条降落和最近 4 条起飞。
- 提供进入完整历史列表的入口。
- 历史列表按日期切换是 P2 能力。

### 5.8 Weather 天气

P0 字段：

| 字段 | 来源 |
| --- | --- |
| 天气文案 | `513010.weatherInfo.weather` |
| 天气类型/图标 | `weatherType / weatherIcon` |
| 温度 | `tmp / tmpLow / tmpHigh` |
| 风 | `wind` |
| 能见度 | `visib` |
| 空气质量 | `aqi / aqigrad` |
| 天气预警 | `weatherNotices[]` |

P1 字段：

- METAR 原文。
- TAF 原文。
- 气压、露点、湿度、日出日落。
- 风向、风速、阵风的结构化字段。

展示规则：

- Header 展示简短天气摘要。
- Weather 区展示详细天气和预警。
- 天气图标必须使用自有或授权素材；不能热链不稳定第三方图片。

### 5.9 Runways 跑道

P0 字段：

| 字段 | 来源 |
| --- | --- |
| 跑道数量 | `513010.airportInfo.runwayCount` |
| 最大跑道长度 | `airportInfo.runwayLength` |
| 海拔 | `airportInfo.elevation` |
| 机场等级 | `airportInfo.grade` |
| 高原标识 | `airportInfo.plateau` |

P1 字段：

- 跑道编号。
- 长度、宽度、材质。
- 方向/磁航向。
- 是否可用、关闭原因、夜航限制。
- 主流公务机适配能力。

展示规则：

- 当前接口只有跑道数量和最大长度时，先展示摘要。
- 后端提供 `runways[]` 后，再展示逐条跑道列表。

### 5.10 Terminals / FBO 航站楼与公务机楼

P0 字段：

| 字段 | 来源 |
| --- | --- |
| 名称 | `513010.airportTerminals[].terminalName` |
| 地址 | `terminalAddr` |
| 坐标 | `terminalLat / terminalLon` |
| 电话 | `phone` |

P1 要求：

- 区分普通航站楼、公务机楼、FBO、海关/CIQ。
- 点击终端坐标可在地图上高亮位置。
- 停场飞机行级字段可关联到 FBO/terminal。

### 5.11 Notices 公告与运行提醒

P0 字段：

- 天气预警：`513010.weatherNotices[]`。
- 机场公告：`513010.airportNotices[]`。

展示规则：

- 高风险公告在 Header 或 Summary strip 中提示。
- 普通公告放入 Notices 区。
- 公告时间使用机场当地时间或明确标注来源时间。

## 6. 数据模型建议

### 6.1 Selected Airport Panel State

```javascript
{
  airportId: "ZBAA",
  airportCode: "PEK",
  icaoCode: "ZBAA",
  activeTab: "arrivals",
  loadingState: "ready",
  loadedAtEpochMs: 1785859200000,
  sourcePids: ["513008", "513010"],
  airport: {},
  summary: {},
  arrivals: [],
  departures: [],
  groundAircraft: [],
  latestEvents: [],
  weather: {},
  runways: [],
  terminals: [],
  notices: []
}
```

### 6.2 Airport Flight Row

```javascript
{
  uniqueKey: "1099706732310953984",
  direction: "arrival",
  status: "in_air",
  tailNo: "encrypted-value",
  tailNoClear: "B-8303",
  aircraftTypeCode: "GLEX",
  planeSize: "超远程",
  operatorName: "金鹿公务航空",
  originAirportCode: "PEK",
  originIcaoCode: "ZBAA",
  originAirportName: "北京首都",
  destinationAirportCode: "SHA",
  destinationIcaoCode: "ZSSS",
  destinationAirportName: "上海虹桥",
  scheduledTimeEpochMs: 1785861000000,
  estimatedTimeEpochMs: 1785861600000,
  actualTimeEpochMs: null,
  coordinate: {
    lat: 30.2311,
    lng: 120.5565,
    course: 99
  }
}
```

### 6.3 Ground Aircraft Row

```javascript
{
  tailNo: "encrypted-value",
  tailNoClear: "B-8303",
  aircraftTypeCode: "GLEX",
  modelName: "Bombardier Global 6000",
  planeSize: "超远程",
  operatorName: "金鹿公务航空",
  brandName: "庞巴迪",
  fboOrTerminal: "北京首都国际机场公务机楼",
  arrivedAtEpochMs: 1785774600000,
  groundDurationMinutes: 980,
  nextTripUniqueKey: null,
  nextDestinationAirportCode: null
}
```

## 7. 当前接口能力映射

| 接口 | 当前可支撑 | 当前不足 |
| --- | --- | --- |
| `513008 查询机场列表和在途行程_v2` | 机场 marker、机场停场数量、飞行中飞机位置、明文注册号 `tailNoClear` | 飞行中飞机缺少出发/到达机场、计划/预计/实际时间、机场维度状态，无法完整生成 Arrivals/Departures |
| `513010 查询指定机场信息` | 机场基础信息、航站楼、天气、天气预警、进出港汇总、停场总数、品牌聚合、机场公告 | 缺少进场列表、离场列表、停场单机列表、逐条跑道、METAR/TAF |
| `513009 查询指定行程的飞行轨迹` | 已知 `uniqueKey` 后可加载单个行程轨迹、出发/到达机场、状态、时间、飞机摘要 | 不能用于机场面板批量发现行程 |
| `513011 查询指定注册号的飞机信息` | 已知 encrypted `tailNo` 后可加载飞机基础信息、运营商、机型、停场计划 | 不适合在机场面板批量逐机调用；明文展示仍应优先用 `tailNoClear` |

## 8. 后端补字段需求

### 8.1 方案 A：增强 513010

推荐在 `513010` 返回中新增：

```javascript
{
  arrivals: [],
  departures: [],
  groundAircraft: [],
  latestEvents: [],
  runways: [],
  dataScope: {
    aircraftCategory: "business_jet",
    trafficCountScope: "business_jet",
    timezoneSource: "airport"
  },
  serverNowEpochMs: 1785859200000,
  cacheTtlMs: 60000
}
```

优势：

- 点选机场后一次请求即可渲染完整面板。
- 与机场详情天然绑定，缓存策略清晰。
- 最少改动前端请求编排。

### 8.2 方案 B：增强 513008

在 `513008.flyingPlanes[]` 中新增 route/time/status 字段：

```javascript
{
  depAirport: "PEK",
  depIcaoCode: "ZBAA",
  depAirportName: "北京首都",
  arrAirport: "SHA",
  arrIcaoCode: "ZSSS",
  arrAirportName: "上海虹桥",
  depTime1: "2026-08-04 10:30",
  arrTime1: "2026-08-04 12:05",
  depActualEpochMs: 1785858600000,
  arrEstimatedEpochMs: 1785865500000,
  flightState: 30,
  flightStateStr: "飞行中"
}
```

优势：

- 可从全局实时流中推导当前机场的飞行中进出港。
- 飞机列表与地图 marker 更新同步。

不足：

- 只能覆盖飞行中或接口返回的在途行程。
- 仍不能覆盖未起飞计划、已落地历史、完整停场单机列表。

### 8.3 推荐实施路径

- P0：增强 `513010`，让机场面板有完整到离港和停场列表。
- P1：增强 `513008`，让地图实时飞机与机场面板列表共享同一 live snapshot。
- P2：新增机场历史日期查询能力，用于历史起降和更多记录。

## 9. 刷新与缓存

| 数据 | 刷新策略 | 说明 |
| --- | --- | --- |
| 机场基础信息 | 点选加载，缓存 `5-30min` | 名称、坐标、等级等较稳定 |
| 天气 | 点选加载，缓存 `3-5min` | 有预警时可缩短 |
| 运行摘要 | 面板打开时刷新，缓存 `30-60s` | 进出港和停场总数 |
| Arrivals/Departures | 面板打开且 tab 可见时 `5-10s` | 如果数据来自 `513008`，跟随地图刷新 |
| On Ground | 面板打开时 `30-60s` | 停场变化低于飞行位置变化 |
| 轨迹详情 | 点击行后调用 `513009` | 不预加载全部行程 |
| 飞机详情 | 点击飞机后调用 `513011` | 不批量逐机调用 |

前端保护：

- 同一机场同一 tab 的并发请求需要合并。
- 切换机场时，旧机场请求返回不得覆盖新机场面板。
- `513012` 继续保持停止请求状态，不得为机场面板恢复调用。
- API 失败时不降级到示例数据。

## 10. 公务机筛选规则

机场面板必须继承主地图的业务口径：只展示公务机。

判定优先级：

1. 后端明确返回 `aircraftCategory = "business_jet"`。
2. 后端返回 `planeSize`，且值属于公务机尺寸枚举：`超远程 / 大型 / 超中型 / 中型 / 轻型 / 超轻型`。
3. 后端返回机型代码，可通过本地 icon/type mapping 判定为 business jet。
4. 无法判定时，默认不进入 Arrivals/Departures/On Ground 列表；可进入后台诊断日志。

统计口径要求：

- Summary 中的进场、离场、停场数字必须与列表口径一致。
- 如果后台只能返回全航班统计，需返回 `trafficCountScope = "all"`，前端不得把它标成公务机统计。

## 11. 与现有页面的差异

当前 `index.html` 的机场详情面板已具备：

- 机场名称和代码。
- 城市、国家、坐标、海拔、天气、延误。
- 进场/离场/停场/跑道的简要数字。
- 相关飞机列表。
- 点选机场后调用 `513010` 懒加载详情。

需要升级为：

- Header + Summary + Tabs 的完整机场运行面板。
- Arrivals 默认 tab。
- Departures 和 On Ground 的列表级内容。
- Weather / Runways / Terminals / Notices 的可展开详情区。
- 基于 `tailNoClear` 的明文注册号展示。
- 明确的 loading、partial、empty、stale、error 状态。

## 12. 验收标准

P0 验收：

- 点击任意机场 marker 后，地图居中并打开左侧机场面板。
- 面板默认展示 Arrivals tab。
- Header 正确展示机场名称、IATA/ICAO、城市/国家、当地时间、天气摘要。
- Summary 正确展示今日进场、离场、停场汇总。
- 切换 Arrivals / Departures / On Ground 不关闭面板、不重置地图。
- 当接口没有列表级数据时，列表区展示真实空态或数据缺口状态，不展示示例飞机。
- 所有飞机注册号优先展示 `tailNoClear`；encrypted `tailNo` 不出现在 UI。
- 点击有 `uniqueKey` 的行程后，可进入选中飞机和航迹加载流程。
- 点击只有 `tailNo` 的停场飞机后，可调用 `513011` 查看飞机基础信息。
- 关闭机场层后，selected 机场仍可见。
- `513012` 在机场面板流程中保持零请求。

P1 验收：

- 机场面板支持 Weather、Runways、Terminals/FBO、Notices 展开区。
- On Ground 支持按品牌、机型尺寸或 FBO 分组。
- 最新起飞/落地事件展示最近 4 条，并可进入更多。
- 面板刷新失败时保留旧数据并标注 stale 状态。
- 小屏端切换为底部抽屉，核心信息不被遮挡。

P2 验收：

- 支持按日期查看机场历史起降。
- 支持机场完整详情页。
- 支持机场运行大屏模式，面向 Arrivals / Departures board 展示。
- 支持自定义列、刷新时间、机场半径圈和仅显示该机场航班等高级设置。

## 13. 待确认问题

- `513010.flightsInfo` 的进出港统计是否已经是公务机口径。
- 后端更倾向增强 `513010`，还是新增机场行程列表接口。
- Arrivals/Departures 需要覆盖的时间窗口：仅当前/今日，还是过去 24h + 未来 24h。
- On Ground 停场列表是否允许返回全部单机，还是需要分页。
- 停场飞机是否有 FBO、机位、到达时间、下一段计划等字段。
- 机场当地时间是否可返回 IANA 时区，例如 `Asia/Shanghai`，以替代 `UTC+8` 字符串。
- 是否需要显示机场图片；如需要，必须使用自有或授权图片源。
- Airport View 大屏能力是否纳入 1.9，还是作为 2.0 独立版本。
