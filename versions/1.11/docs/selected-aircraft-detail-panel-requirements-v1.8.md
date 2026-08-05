# Selected Aircraft Detail Panel Requirements 1.8

## 1. 文档定位

本文档定义地图中选中飞机后，左侧飞机详情面板的信息内容、交互结构、视觉层级和数据接入要求。目标是在信息架构和交互节奏上学习 Flightradar24 网页端 selected aircraft panel 的可观察产品机制，同时生产实现只使用本系统自有公务机运行数据库、授权地图服务和自有视觉资产。

建议归属版本：`1.8`。本文档用于补齐 1.8 的 selected aircraft 详情面板需求，不替代 `docs/selected-aircraft-route-visual-requirements-v1.6.md` 和 `docs/aircraft-track-refresh-continuity-requirements-v1.6.md`。

观察与资料确认日期：2026-08-04。

参考资料：

- Flightradar24 页面实测：`https://www.flightradar24.com/51.47,-0.45/7`
- Flightradar24 selected aircraft 示例实测：`https://www.flightradar24.com/DHK4SM/40ffaa9e`
- Flightradar24 官方支持文档：`https://support.fr24.com/support/solutions/articles/3000115027-why-does-the-aircraft-s-trail-change-colour-`
- Flightradar24 官方博客：`https://www.flightradar24.com/blog/inside-flightradar24/supercharging-flightradar24s-data-display/`
- 当前项目接口：`source/接口文档v1/513008.查询机场列表和在途行程.md`
- 当前项目接口：`source/接口文档v1/513009.查询指定行程的飞行轨迹.md`
- 当前项目接口：`source/接口文档v1/513010.查询指定机场信息.md`
- 当前项目接口：`source/接口文档v1/513011.查询指定注册号的飞机信息.md`

重要边界：

- 不在本系统界面中露出 Flightradar24 品牌、商标、广告位、会员提示或文案。
- 不抓取 Flightradar24 运行数据、接口、代码、账户数据或未授权图片素材。
- 本文中的 FR24 航班号、机场、速度、高度等只作为观察样例，不进入本系统演示数据或生产数据。
- 图表、历史行程和基础信息必须由自有数据库驱动；接口缺字段时显示真实空态或权限态，不生成假数据。
- 飞机注册号展示优先使用接口返回的明文或脱敏展示字段，encrypted tail number 只用于接口传参。

## 2. FR24 选中飞机面板关键学习结论

### 2.1 入口与整体结构

FR24 点击地图上的飞机 icon 后，会立即打开左侧飞机信息面板，并在地图上保留 selected aircraft 状态：飞机 icon 进入高亮色，旁边显示呼号标签，地图展示该航班已飞航迹，底部工具栏提供 `3D view`、`Route`、`Follow`、`Share`、`More` 等动作。

对本系统的转化要求：

- 点击飞机 marker、搜索飞机、从机场面板点击航班行，都应进入统一的 `selectedAircraft` 状态。
- 左侧面板打开后，地图仍可拖拽、缩放和选择其他对象。
- 被选中的飞机不受普通飞机数量裁剪和 viewport 过滤影响，必须保留在地图上。
- selected 航迹、selected 飞机 icon、呼号标签、详情面板和底部操作栏必须同步切换。
- 面板关闭后清除 selected aircraft 状态，但不重置地图中心和 zoom。

### 2.2 首屏信息架构

FR24 selected aircraft 面板首屏以“航班身份 + 飞机照片 + 航线摘要 + 时间进度”为核心。实测面板包含呼号、机型代码、运营方、飞机照片轮播、起降机场代码、城市名、时区、计划/实际/预计时间、飞行进度线和更多信息入口。

对本系统的转化要求：

- 首屏必须先帮助用户判断“这架飞机是谁、从哪里来、去哪里、当前处在航段什么位置”。
- 飞机图片使用自有数据库、授权图源或机型默认图，不调用第三方未授权图片。
- 起降机场必须同时展示三字码、机场名或城市名、时区。
- 时间区必须区分计划、实际、预计，缺失时使用短横线，不互相冒充。
- 飞行进度线应使用已飞距离、剩余距离、起飞后时长、预计剩余时长表达航段进展。

### 2.3 折叠模块结构

FR24 面板在首屏下方使用多组折叠模块承载详细信息，典型模块包括：

- Aircraft information：机型、注册号、注册国、序列号、机龄、飞机类别。
- Recent flights：同一注册号飞机的近期行程列表。
- Live flight data：气压高度、垂直速度、GPS 高度、航向。
- Speed & Altitude graph：速度/高度时间序列图。
- Data source：ADS-B 数据源、ICAO 24-bit address、Squawk、经纬度。
- More 菜单：飞机注册号、航空公司/运营方、起飞机场、目的机场、图片作者、Playback、隐藏其他飞机。

对本系统的转化要求：

- 详情信息采用可折叠模块，默认展开路线摘要和关键实时数据，历史与数据源可按需展开。
- 每个模块必须支持加载态、空态、权限态、错误态。
- 缺失或无权限字段不能显示 FR24 的会员锁样式；本系统统一显示 `-` 或“暂无数据”。
- 模块顺序以运行决策效率为准：航班摘要、飞机基础信息、飞行数据、速度/高度图、历史行程、数据源。

## 3. 产品目标

### 3.1 用户目标

业务用户选中一架公务机后，需要立即判断：

- 当前飞机的注册号、机型、运营方和飞机类别。
- 当前航班的起飞机场、目的机场、当地时区和时间进度。
- 当前速度、高度、航向、位置和轨迹是否持续刷新。
- 过去一段时间这架飞机执行过哪些行程。
- 速度和高度在本次飞行中的变化趋势。
- 是否需要进入 Route 聚焦、Follow 跟随、Share 分享或后续 Playback 回放。

### 3.2 系统目标

- 用自有接口驱动 selected aircraft 面板，不保留本地假航班数据。
- 与 1.6 selected route 和 1.8 selected track continuity 共用同一 selected state。
- 把 `513008` 的实时快照、`513009` 的航迹详情、`513011` 的飞机资料和 `513010` 的机场资料组织成一个稳定的详情视图。
- 为后续新增飞机历史行程接口、回放能力、3D view、更多权限字段预留结构。

## 4. 面板信息架构

### 4.1 总体结构

选中飞机面板由七个区域组成：

| 区域 | 优先级 | 内容 |
| --- | --- | --- |
| Header | P0 | 呼号/注册号、机型代码、运营方、状态、关闭按钮 |
| Media | P1 | 飞机照片或机型默认图、图片来源、轮播点 |
| Route summary | P0 | 起降机场、城市/机场名、时区、计划/实际/预计时间、进度线 |
| Detail accordions | P0 | 飞机基础信息、实时飞行数据、速度/高度图、历史行程、数据源 |
| Fixed action bar | P0 | 3D view、Route、Follow、Share、More |
| More menu | P1 | 关联实体入口、Playback、Hide other aircraft |
| Map linked state | P0 | selected icon、呼号标签、航迹、端点、Route 聚焦 |

### 4.2 桌面与移动布局

- 桌面端左侧面板宽度建议 `360-400px`，当前项目可沿用现有左侧面板宽度。
- 面板高度占满地图视口，内部滚动；底部 action bar 固定。
- 小屏端使用底部抽屉，默认展开到 `70%` 高度，可上拉到全屏。
- Header 和底部 action bar 不被滚动内容遮挡。
- 图表区域必须设置固定高度，避免数据刷新导致布局跳动。
- 长文本使用单行截断加 tooltip 或展开态，不挤压主地图。

### 4.3 面板状态

| 状态 | 触发 | 表现 |
| --- | --- | --- |
| `loading` | 首次点击飞机 | Header 先展示 `513008` 快照字段，详情区显示骨架 |
| `ready` | `513009` 和 `513011` 返回成功 | 展示完整航班、航迹、飞机基础信息 |
| `partial` | 航迹成功但飞机资料失败，或反向 | 成功模块正常展示，失败模块显示重试 |
| `stale` | 刷新失败但已有旧数据 | 保留旧值，并显示最后更新时间 |
| `empty` | 接口确认无相关数据 | 对应模块显示真实空态 |
| `error` | 首次加载失败 | 面板保留 selected 状态，提供重试 |

## 5. 功能分解

### 5.1 选中与加载流程

P0 流程：

1. 用户点击飞机 marker。
2. 前端从 `513008.flyingPlanes[]` 读取 `uniqueKey`、`tailNo`、`tailNoClear`、坐标、航向、`planeSize`。
3. 立即打开左侧面板，展示快照级 Header 和 selected map state。
4. 使用 `uniqueKey` 请求 `513009`，加载航线、航迹、当前速度/高度、起降机场和运营方摘要。
5. 使用 encrypted `tailNo` 请求 `513011`，加载飞机基础资料、机型图片、注册地、序列号、机型性能参数等。
6. 如起降机场详情不足，可按需使用 `513010` 补充机场名称、国家、海拔、天气或时区。
7. selected 飞机保持 `2.5s` 左右刷新节奏；详情面板只更新变化字段，不整体重绘。

P1 流程：

- 点击历史行程行后切换到对应 `uniqueKey`，进入该历史航班的只读航迹或 Playback 模式。
- 支持 URL hash/state 表达 selected aircraft，便于分享和浏览器后退。

### 5.2 Header

P0 字段：

| 字段 | 展示 | 来源 | 说明 |
| --- | --- | --- | --- |
| 主标识 | 呼号或注册号 | `tailNoClear`、`planeInfo.tailNoDisplay`、后续 callsign 字段 | 暂无 callsign 时优先显示明文注册号 |
| 机型代码 | 短 badge | `planeInfo.icaoCode`、`planeInfo.modelSeries`、icon mapping key | 例如 `GLEX`、`GLF6`、`E35L` |
| 运营方 | 副标题 | `serviceProvider.companyNameShort/companyName` | 无运营方时显示 `Private operator` 或 `-` |
| 行程状态 | 小标签 | `flightBaseInfo.flightStateStr`、`summaryInfo.flightStateStr` | 飞行中、已完成、取消等 |
| 关闭 | icon button | 前端状态 | 清除 selected aircraft |

展示规则：

- Header 不显示 FR24 品牌。
- 主标识最多一行，超长截断。
- 机型代码使用深色小 badge，不使用大面积彩色营销标签。
- 行程状态颜色克制，不能抢过地图 selected 颜色。

### 5.3 飞机图片 / Media

P1 字段：

| 字段 | 来源 | 说明 |
| --- | --- | --- |
| 主图片 | `513011.planeInfo.flightRadarImgs[].url`、`slideImgs[].url`、`modelImg` | 必须确认图片授权；缺失时展示机型默认图 |
| 图片类型 | `slideImgs[].type` | 视频先作为封面，不在 1.8 自动播放 |
| 图片来源/版权 | 后端新增 `credit/source/license` | 没有授权信息时不显示第三方作者 |

展示规则：

- 图片比例固定，建议 `16:9` 或接近 FR24 面板的横向照片比例。
- 支持 1-5 张轮播点；只有一张时不显示轮播点。
- 图片加载失败时降级到机型默认图，不影响其他模块。

### 5.4 Route summary

P0 字段：

| 字段 | 展示 | 来源 |
| --- | --- | --- |
| 起飞机场代码 | 大号代码 | `513009.flightBaseInfo.depAirport` |
| 起飞机场 ICAO | 小号代码或详情 | `flightBaseInfo.depIcaoCode` |
| 起飞机场名称 | 城市/机场名 | `flightBaseInfo.depAirportName`、`airportInfo.dep.airportFourName` |
| 起飞时区 | 时区文本 | `flightBaseInfo.depZoneId` 优先，降级 `depTimeZone` |
| 到达机场代码 | 大号代码 | `flightBaseInfo.arrAirport` |
| 到达机场 ICAO | 小号代码或详情 | `flightBaseInfo.arrIcaoCode` |
| 到达机场名称 | 城市/机场名 | `flightBaseInfo.arrAirportName`、`airportInfo.arr.airportFourName` |
| 到达时区 | 时区文本 | `flightBaseInfo.arrZoneId` 优先，降级 `arrTimeZone` |
| 航班状态 | 文案 | `flightBaseInfo.flightStateStr` |

时间区 P0 字段：

| 字段 | 展示规则 | 来源 |
| --- | --- | --- |
| Scheduled departure | 计划起飞 | `flightBaseInfo.depTime2` 或后端明确计划字段 |
| Actual departure | 实际起飞 | `flightBaseInfo.depActualEpochMs`、`depTime1` |
| Scheduled arrival | 计划到达 | `flightBaseInfo.arrTime2` 或后端明确计划字段 |
| Estimated/Actual arrival | 预计/实际到达 | `flightBaseInfo.arrActualEpochMs`、`arrTime1` |
| 跨天 | `+1 day` / `+1天` | `flightBaseInfo.acrossDays` |

进度线 P0 字段：

| 字段 | 来源 | 说明 |
| --- | --- | --- |
| 已飞距离 | `summaryInfo.distance` | 单位米，前端格式化为 km/nm |
| 总距离 | 后端新增或由起降机场坐标估算 | 用于进度百分比 |
| 起飞后时长 | `serverNowEpochMs - depActualEpochMs` | 无实际起飞时间时显示 `-` |
| 剩余时长 | `arrTime - serverNowEpochMs` 或后端 ETA | 无 ETA 时显示 `-` |

展示规则：

- 机场代码是 Route summary 的首要视觉信息。
- 时间标签要明确区分 Scheduled、Actual、Estimated。
- 缺少计划/实际/预计字段时不能互相替代，必须显示空态。
- 点击起降机场代码可切换到 selected airport 面板。

### 5.5 Aircraft information

P0/P1 字段：

| 字段 | 优先级 | 来源 | 说明 |
| --- | --- | --- | --- |
| Aircraft type | P0 | `planeInfo.modelNameEn/modelName` | 英文名优先，中文可作为副信息 |
| Type code | P0 | `planeInfo.icaoCode/modelSeries` | 与 icon mapping 控制台保持一致 |
| Registration | P0 | `tailNoClear`、`planeInfo.tailNoDisplay` | encrypted `tailNo` 不展示 |
| Country of registration | P1 | `planeInfo.registrationPlace` | 当前可用为注册地文本 |
| Serial number / MSN | P1 | `planeInfo.planeMsn` | 缺失显示 `-` |
| Age | P1 | `deliveryDate` 计算 | 只在年份可信时计算 |
| Aircraft category | P0 | `planeInfo.planeSize`、`513008.planeSize` | 公务机尺寸级别 |
| Operator / Trustee | P0 | `serviceProvider`、`planeInfo.trusteeship` | 运营方和托管公司分开展示 |
| Service status | P1 | `planeInfo.serviceStatus` | 已营运/未营运 |

展示规则：

- 基础信息模块默认展开或半展开，保证注册号、机型、运营方可见。
- 机型代码必须与 `aircraft-icon-config.js` 和控制台映射使用同一标准。
- 如果注册号脱敏，面板不得尝试还原。

### 5.6 Live flight data

P0 字段：

| 字段 | 展示 | 来源 | 说明 |
| --- | --- | --- | --- |
| Barometric altitude | 高度 | `summaryInfo.altitude`、最新 `coordinates[].altitude` | 单位按接口确认，前端统一格式化 |
| Ground speed | 地速 | `summaryInfo.speed`、最新 `coordinates[].speed` | 单位按接口确认，前端统一格式化 |
| Track | 航向角 | 最新 `coordinates[].course`、`513008.coordinate.course` | 0-359 度 |
| Latitude | 纬度 | 最新轨迹点或 `513008.coordinate.lat` | 保留 4-5 位小数 |
| Longitude | 经度 | 最新轨迹点或 `513008.coordinate.lng` | 保留 4-5 位小数 |
| Vertical speed | 垂直速度 | 后端新增或前端由相邻高度点估算 | P1，估算时必须标记 |
| GPS altitude | GPS 高度 | 后端新增 | P2 |
| Squawk | 应答机 squawk | 后端新增 | 不能用 `transponderCode` 冒充 |
| ICAO 24-bit address | ICAO 地址 | `planeInfo.transponderCode` 若确认语义，否则后端新增 `icao24` | 需后端确认字段语义 |

展示规则：

- P0 实时字段每次 selected 刷新时局部更新。
- 数值变化不能导致行高和列宽跳动。
- 后端未明确单位前，前端必须在字段配置层统一单位转换，避免米/英尺、km/h/kt 混用。

### 5.7 Speed & Altitude graph

P0 要求：

- 图表放在 `Speed & Altitude graph` 折叠模块内，默认可展开。
- 使用深色图表底色、浅色网格、双序列图例，视觉上与 FR24 的紧凑运行图表接近。
- X 轴使用时间，默认显示 UTC；后续可提供 Local/UTC 切换。
- 高度曲线使用 altitude series，速度曲线使用 speed series。
- 当前点在图表右侧随刷新追加，不能整图闪烁。
- hover 或触摸时显示 tooltip：时间、高度、速度、航向。

数据要求：

| 图表数据 | 来源 | 说明 |
| --- | --- | --- |
| 时间 | `coordinates[].createTime` | epoch ms |
| 高度 | `coordinates[].altitude` | 用于 altitude series |
| 速度 | `coordinates[].speed` | 用于 speed series |
| 当前速度/高度 | `summaryInfo` 或最新坐标点 | 用于图例旁当前值 |
| 数据缺口 | 相邻点时间差 | 超过阈值断线或显示 gap |

视觉标准：

- 图表高度建议 `180-220px`。
- 网格线透明度低，不能压过曲线。
- 高度曲线和速度曲线需要清晰区分；不得使用红绿等强告警色作为常态曲线主色。
- 数据点超过 1000 时做抽稀或分辨率采样，保留起降、峰值和末端关键点。
- 空态显示 `No graph data` / `暂无速度高度数据`，不生成示例曲线。

### 5.8 Recent flights / 历史行程

P1 要求：

- 历史行程模块展示同一注册号飞机的近期飞行记录。
- 默认展示最近 4-6 条，提供 `More flights` 入口进入完整历史列表。
- 行程行包含日期、航班/任务标识、起飞机场、到达机场、行程状态。
- 点击行可展开时间摘要；若有 `uniqueKey`，可进入历史航迹或 Playback。

建议字段：

| 字段 | 来源 | 当前接口状态 |
| --- | --- | --- |
| `tailNo` | `513008` / `513011` | 已有传参基础 |
| `uniqueKey` | 新增历史行程列表接口 | 当前缺失 |
| `flightNo/callsign` | 新增或行程列表 | 当前缺失 |
| `depAirport/arrAirport` | 新增或历史 `513009` 摘要 | 当前缺列表 |
| `depTime/arrTime` | 新增 | 当前缺列表 |
| `flightState` | 新增 | 当前缺列表 |

接口结论：

- 当前四份接口可以展示“当前选中行程”的路线和轨迹。
- 当前四份接口不能完整生成“同一飞机近期行程列表”。
- 1.8 若不新增后端接口，历史行程模块只能显示真实空态或隐藏入口，不能用当前飞行复制多条假记录。
- 建议后端新增 `queryRecentFlightsByTailNo`，输入 encrypted `tailNo` 或注册号，返回最近 N 条公务机行程摘要。

### 5.9 Data source

P1 字段：

| 字段 | 来源 | 说明 |
| --- | --- | --- |
| Source type | 后端新增或固定业务源 | 例如 ADS-B、自有调度、融合数据 |
| ICAO 24-bit address | 后端确认 `transponderCode` 或新增 `icao24` | 不确定时显示 `-` |
| Squawk | 后端新增 | 不用 transponderCode 冒充 |
| Last position time | 最新 `coordinates[].createTime` | 用于判断 stale |
| Latitude / Longitude | 最新坐标 | 与地图 marker 一致 |
| Data quality | 1.8 continuity diagnostics | normal / estimated / stale / hard break |

展示规则：

- 数据源模块默认折叠。
- 对 estimated/gap/stale 状态给出短文案，和地图虚线/淡化状态一致。
- 不显示第三方数据供应商品牌，除非业务已获得授权并明确要求展示。

### 5.10 Fixed action bar

P0/P1 动作：

| 动作 | 优先级 | 行为 |
| --- | --- | --- |
| Route | P0 | 进入 1.6 route focus，fit selected route bounds |
| Follow | P0 | 地图持续跟随 selected aircraft，用户手动拖拽后暂停 |
| Share | P1 | 复制本系统 selected aircraft 链接 |
| More | P1 | 打开更多菜单 |
| 3D view | P2 | 预留，未实现时显示 disabled |

展示规则：

- 底部 action bar 固定在面板底部。
- active 状态使用项目既有黄色强调，不改变飞机图标颜色规范。
- 未实现动作必须禁用或标为即将支持，不触发无效点击。

### 5.11 More menu

P1 内容：

| 项 | 行为 |
| --- | --- |
| Aircraft registration | 点击进入飞机完整详情 |
| Operator | 点击筛选或进入运营方详情 |
| Origin airport | 点击切换 selected airport |
| Destination airport | 点击切换 selected airport |
| Playback | 有历史轨迹时进入回放；无数据时禁用 |
| Hide other aircraft | 临时隐藏非 selected 飞机 |

展示规则：

- More 菜单从底部 action bar 上方弹出，背景轻微压暗。
- 菜单不遮挡底部 action bar。
- 菜单项必须是本系统内部入口，不跳转 FR24。

## 6. 数据接入矩阵

| 模块 | 主要接口 | 已覆盖字段 | 需要补充字段 |
| --- | --- | --- | --- |
| Header | `513008`、`513009`、`513011` | `tailNoClear/tailNoDisplay`、`modelSeries/icaoCode`、运营方、状态 | callsign/flightNo |
| Route summary | `513009` | 起降机场、时区、状态、计划/实际/预计时间、起降坐标 | 总距离、明确 ETA 字段 |
| Aircraft info | `513011` | 注册号、机型、序列号、注册地、托管、出厂年份、性能参数 | 机龄精确日期、图片版权 |
| Live flight data | `513008`、`513009` | 坐标、航向、高度、速度 | 垂直速度、GPS 高度、squawk、icao24 |
| Speed/altitude graph | `513009` | 时间、高度、速度、航向轨迹点 | 单位元数据、数据质量标记 |
| Recent flights | 新增 | 无完整列表 | 最近行程列表接口 |
| Airport drill-in | `513010` | 机场详情、天气、跑道、地面统计 | IANA zone id 若缺失 |
| Data source | `513009`、新增 | 经纬度、更新时间 | 数据源类型、源可信度 |

## 7. 刷新与性能

- selected aircraft 面板刷新节奏与 1.8 selected track continuity 保持一致，建议 `2500ms`。
- `513008` 用于轻量刷新当前位置、航向和 marker；`513009` 用于补齐轨迹点和航班摘要。
- `513011` 飞机资料可缓存，缓存 key 使用 encrypted `tailNo`，TTL 建议 `30-60min`。
- `513010` 机场资料可缓存，缓存 key 使用机场三字码，TTL 建议 `5-30min`。
- 图表数据使用增量追加和抽稀，不因每次刷新重建 DOM。
- selected 飞机详情加载不应阻塞普通飞机 marker 刷新。
- 当接口失败时进入 stale/partial 状态，不清空用户正在查看的面板。

## 8. 视觉规范

- 整体遵循当前项目地图风格和 FR24 selected panel 的信息密度：窄面板、紧凑字段、可折叠模块、固定底部动作。
- Header 使用深色背景，正文使用浅色卡片/分区，折叠模块 active header 可使用蓝色强调。
- 不使用大面积营销卡片，不显示广告、会员引导或第三方品牌露出。
- 地图 selected 飞机 icon、label、route endpoint 和详情面板状态必须一致。
- 速度/高度图使用深色绘图区，避免与浅色正文混在一起。
- 空态、权限态、加载态的高度必须稳定，防止滚动位置跳动。

## 9. 空态、权限态和错误态

| 场景 | 表现 |
| --- | --- |
| 无飞机详情 | 保留 Header 和 Route summary，Aircraft info 显示暂无数据 |
| 无轨迹点 | 地图不画 selected route，图表显示暂无数据 |
| 无历史行程接口 | Recent flights 显示“暂无历史行程数据”，不展示假列表 |
| 图片无授权或加载失败 | 使用机型默认图 |
| 注册号脱敏 | 只展示脱敏值，不提供解密入口 |
| 接口刷新失败 | 保留旧数据，标注最后更新时间和重试 |
| 字段无权限 | 显示 `-` 或权限说明，不使用 FR24 锁图标 |

## 10. 版本范围

### 10.1 1.8 P0

- 选中飞机后打开左侧详情面板。
- 接入 `513009` 显示航线摘要、时间、进度、当前速度/高度和航迹图数据。
- 接入 `513011` 显示飞机基础信息。
- 实现 `Speed & Altitude graph` 基础折线图。
- 底部 `Route` 与既有 1.6 route focus 联动。
- selected 状态下保留飞机 icon、呼号标签、航迹和端点。
- 所有缺失数据使用真实空态。

### 10.2 1.8 P1

- 飞机图片轮播。
- Recent flights 历史行程模块，依赖新增后端接口。
- More 菜单和 Hide other aircraft。
- Share 本系统链接。
- Data source 模块。

### 10.3 1.8 P2 / 后续

- 3D view。
- Playback 历史回放。
- 垂直速度、GPS 高度、Squawk、ICAO 24-bit address。
- 历史行程完整页。
- 本系统运营方详情页和飞机完整档案页。

## 11. 验收标准

P0 验收：

- 点击任意正在飞行的公务机，左侧面板在 `300ms` 内打开并显示快照级 Header。
- `513009` 返回后，面板展示起降机场、时间区、当前速度/高度、航向、坐标和 selected route。
- `513011` 返回后，面板展示注册号、机型、机型代码、注册地、序列号、运营方/托管信息。
- 速度/高度图使用真实 `coordinates` 绘制，刷新时曲线连续追加，不闪烁。
- 关闭面板后，selected icon、selected label、selected route 和底部 action bar 同步清除。
- 缺失历史行程接口时，Recent flights 不显示假数据。
- 界面中无 Flightradar24 品牌、广告、会员登录或未授权图片。

P1 验收：

- `Route`、`Follow`、`Share`、`More` action 状态明确，未实现项不会触发空操作。
- More 菜单能打开和关闭，内部机场/飞机入口可切换 selected 对象。
- 历史行程接口接入后，Recent flights 展示最近 4-6 条并支持进入详情。
- 图片轮播加载失败时可降级，不影响主要运行数据。

性能验收：

- 选中飞机详情加载不使普通地图交互卡顿。
- 图表点数超过 1000 时仍保持流畅滚动和刷新。
- selected 面板刷新只更新变化字段，不整体重建左侧 DOM。
- API 失败后进入 partial/stale 状态，不清空已有面板内容。
