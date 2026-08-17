# 数据接口字段交互接入需求 1.17

## 1. 文档定位

本文档用于梳理新版数据接口字段中，哪些信息可以加入当前产品已有交互，并定义合理的展示逻辑。

本文不新增独立产品形态，不重做当前页面结构；所有字段优先落入现有交互入口：

- 地图飞机 icon、注册号标签、机场浮窗。
- 选中飞机左侧面板：概览、航迹、信息、行程。
- 选中机场左侧面板：动态、机场、天气、FBO。
- 搜索结果、机场/飞机列表、More 菜单。

接口来源：

- `513008 查询机场列表和在途行程`
- `513009 查询指定行程的飞行轨迹`
- `513010 查询指定机场信息`
- `513011 查询指定注册号的飞机信息`
- `513013 查询指定注册号的历史行程`
- `513014 查询指定机场的停场飞机`
- `513015 查询指定机场的机场动态`

## 2. 设计原则

1. 当前版本只加入能服务“运行动态判断”的字段，不把飞机销售、包机营销、长篇介绍类字段塞进首屏。
2. 地图层保持轻量，只显示识别和定位必要信息；详细字段进入左侧面板。
3. 飞机交互以“当前行程”为主，飞机档案为辅；机场交互以“运行动态”为主，机场资料为辅。
4. 时间字段优先使用 epoch 毫秒，其次使用 IANA 时区字段，最后才降级 UTC 偏移文本。
5. 明文注册号优先展示，encrypted tailNo 只用于接口传参，不出现在界面中。
6. 缺失字段展示真实空态，不生成示例数据，不用其他字段冒充。
7. 列表字段不足时可以先显示聚合摘要；不能为了补列表而批量高频请求单机详情。

## 3. 当前界面承载能力

### 3.1 地图层

当前地图已有能力：

- 飞机 icon。
- 在途飞机注册号标签。
- selected 飞机航迹。
- 机场 icon。
- 机场 hover 浮窗。
- selected 机场固定浮窗。

适合加入：

- 飞机明文注册号。
- 飞机当前位置、航向、实时高度、实时地速。
- 机场中英文名、IATA / ICAO、停场数量、机场等级。

不适合加入：

- 飞机详细参数、内饰图片、包机售卖信息。
- 机场长公告、报批政策正文、统计图表。

### 3.2 选中飞机面板

当前飞机面板已有 tab：

- 概览：呼号、注册号、机型、运营商、起降机场、时间、进度、实时数据、图片。
- 航迹：速度与高度图、实时高度、实时地速、起飞时刻、当前时刻。
- 信息：飞机基础字段。
- 行程：近期航班列表。

适合加入新版接口的大部分飞机和行程字段。

### 3.3 选中机场面板

当前机场面板已有 tab：

- 动态：架次、进港、离港、地面、相关列表、当地时间。
- 机场：城市、国家、代码、坐标、海拔、等级、类型、跑道。
- 天气：天气、温度、风、能见度、AQI、报文时间。
- FBO：航站楼 / FBO。

适合加入新版接口中的机场动态、停场飞机、停场机型、天气、公告和报批政策摘要。

## 4. P0 需求：应优先加入当前交互

### 4.1 地图飞机标签与识别

目标：地图上任何在途飞机都能被快速识别。

字段来源：

| 信息 | 来源 | 展示位置 |
| --- | --- | --- |
| 明文注册号 | `513008.flyingPlanes[].tailNoClear` | 飞机标签、搜索结果、左侧面板 Header |
| 脱敏注册号 | `513009.planeInfo.tailNoDisplay`、`513011.planeInfo.tailNoDisplay` | 明文缺失时兜底 |
| 加密注册号 | `tailNo` | 只用于 `513011 / 513013` 入参，不展示 |
| 航向 | `coordinate.course`、`coordinates[].course` | 飞机 icon 旋转 |
| 飞机尺寸 | `planeSize` | 图标尺寸等级辅助，不决定 icon 形状 |
| ICAO 机型代码 | `planeInfo.icaoCode`、实时记录 `icaoCode` | icon 映射主键、详情字段 |

展示逻辑：

- 飞机标签始终优先展示注册号：`tailNoClear > tailNoDisplay > registration > N/A`。
- 呼号不替代注册号标签；呼号只进入左侧面板 Header 和搜索字段。
- `tailNo` 不进入任何 DOM 文案、tooltip、复制入口。
- 如果 `icaoCode` 缺失，图标形状使用当前兜底规则，并把该飞机加入未映射诊断。

### 4.2 选中飞机概览：行程身份与实时动态

目标：用户点选飞机后，首屏回答“这架飞机是谁、从哪来、去哪、现在状态怎样”。

字段来源：

| 信息 | 来源 | 展示位置 |
| --- | --- | --- |
| 呼号 | `513009.flightBaseInfo.callSign`、实时记录 `callsign` | Header 呼号 |
| 注册号 | `tailNoClear / tailNoDisplay` | Header 注册号 |
| 状态 | `flightBaseInfo.flightStateStr`、`summaryInfo.flightStateStr` | 状态 badge，统一映射为“途中”等业务状态 |
| 机型中文名 | `planeInfo.modelName` | Header 机型 |
| 机型英文名 | `planeInfo.modelNameEn` | 信息 tab 或图片 alt |
| ICAO 机型代码 | `planeInfo.icaoCode` | Header 机型代码、信息 tab |
| 运营商 | `serviceProvider.companyNameShort / companyName` | Header 运营商 |
| 托管公司 | `planeInfo.trusteeship` | 信息 tab |

展示逻辑：

- Header 分为三层：状态、身份、机型/运营商。
- 呼号与注册号并列展示，不互相覆盖。
- 机型展示规则：`中文机型名 + ICAO 代码`，英文机型名进入信息 tab。
- 运营商优先使用 `serviceProvider`，没有时再显示 `trusteeship`。
- `flightState = 30` 或状态文案为飞行中时，界面统一展示“途中”。

### 4.3 选中飞机概览：起降机场与时间

目标：让用户清楚理解当前行程的起止机场和时区。

字段来源：

| 信息 | 来源 | 展示位置 |
| --- | --- | --- |
| 出发 IATA | `flightBaseInfo.depAirport`、`airportInfo.dep.airportCode` | 出发机场卡片 |
| 出发 ICAO | `flightBaseInfo.depIcaoCode`、`airportInfo.dep.icaoCode` | 出发机场卡片 |
| 出发中文名 | `airportInfo.dep.airportName / airportFourName` | 出发机场卡片 |
| 出发英文名 | `airportInfo.dep.airportNameEn` | 出发机场卡片 |
| 到达 IATA | `flightBaseInfo.arrAirport`、`airportInfo.arr.airportCode` | 到达机场卡片 |
| 到达 ICAO | `flightBaseInfo.arrIcaoCode`、`airportInfo.arr.icaoCode` | 到达机场卡片 |
| 到达中文名 | `airportInfo.arr.airportName / airportFourName` | 到达机场卡片 |
| 到达英文名 | `airportInfo.arr.airportNameEn` | 到达机场卡片 |
| 出发时区 | `depZoneId > depTimeZone` | UTC 标签 |
| 到达时区 | `arrZoneId > arrTimeZone` | UTC 标签 |

展示逻辑：

- 机场代码展示为 `IATA / ICAO` 的视觉关系，但卡片内仍保持三字码和四字码层级。
- 四字码权重高于三字码，三字码缩小展示。
- 中文机场名最多一行，英文机场名最多两行；hover 使用 toast 展示完整名。
- 目的地未知时，到达卡片只展示“到达”和垂直居中的 `N/A`，隐藏 IATA、ICAO、UTC 标签。
- 出发机场和到达机场卡片高度自适应，但同一行两卡片视觉高度保持一致。

时间展示：

| 信息 | 来源 | 展示位置 |
| --- | --- | --- |
| 实际起飞 | `depActualEpochMs > depTime1` | 时间高亮卡 |
| 预计到达 | `arrTime1`、必要时 `arrActualEpochMs` | 时间高亮卡 |
| 服务端当前时间 | `serverNowEpochMs > currentTimeGmt8` | 计算基准 |
| 跨天 | `acrossDays` | 到达日期后缀 |

展示逻辑：

- 时间高亮卡只显示“实际起飞”和“预计到达”。
- 时间字号大于日期和 UTC 标签。
- 时区只显示 `UTC+8` 这类格式，不展示具体时区名称。
- 起止机场有时区差时，在行程动态分组内显示 `UTC+8 → UTC+9 · +1h`。

### 4.4 选中飞机概览：行程进度

目标：行程动态模块表达真实进展，不被接口缺字段影响。

字段来源：

| 信息 | 优先来源 | 兜底计算 |
| --- | --- | --- |
| 已飞行距离 | `summaryInfo.distance` | 按 `coordinates[]` 累加大圆距离 |
| 预计总时长 | `arrTime1 - depActualEpochMs` | `estimateTime` 或历史均速估算 |
| 已飞行时长 | `serverNowEpochMs - depActualEpochMs` | 航迹首点到当前点 |
| 待飞行时长 | `arrTime1 - serverNowEpochMs` | 预计总时长 - 已飞行时长 |
| 进度条位置 | 已飞 / 总时长或已飞 / 总距离 | 目的地未知时固定 100% |

展示逻辑：

- 进度条放在已飞行距离上方。
- 进度条不展示百分比数字。
- 已飞行、待飞行、进度条放在同一视觉分组。
- 预计总时长放在同组内，目的地未知时隐藏。
- 目的地未知时进度条飞机 marker 移至最右侧。

### 4.5 选中飞机航迹：速度与高度

目标：航迹 tab 只承载分析型信息，避免重复概览字段。

字段来源：

| 信息 | 来源 | 展示位置 |
| --- | --- | --- |
| 航迹点时间 | `coordinates[].createTime` | 图表横轴 |
| 航迹点高度 | `coordinates[].altitude` | ALT 曲线 |
| 航迹点速度 | `coordinates[].speed` | G/S 曲线 |
| 当前高度 | `summaryInfo.altitude` 或最后有效航迹点 | 图表读数 |
| 当前地速 | `summaryInfo.speed` 或最后有效航迹点 | 图表读数 |
| 最大高度 | `summaryInfo.maxAltitude` | 可进入信息增强项 |
| 最大地速 | `summaryInfo.maxSpeed` | 可进入信息增强项 |

展示逻辑：

- 横轴起点固定为实际起飞时刻，末端为当前服务端时间。
- 航迹点缺高度或速度时，图表保留断点或用前后点短范围补齐，并在 hover 中标识估算。
- 鼠标 hover 图表时显示当地时间、UTC 时间、高度、地速。
- 航迹地图线不再显示 hover 浮窗；详细数据只在左侧图表承载。

### 4.6 选中飞机信息 tab

目标：用新版 `513011` 补齐飞机基础档案，但保持运行工具风格。

建议加入字段：

| 信息 | 来源 | 展示分组 |
| --- | --- | --- |
| 注册号 | `tailNoDisplay / tailNoClear` | 基础 |
| 注册地 | `registrationPlace` | 基础 |
| 序列号 | `planeMsn` | 基础 |
| 应答机码 | `transponderCode` | 基础 |
| ICAO 机型代码 | `icaoCode` | 基础 |
| 厂商/系列代码 | `modelSeries` | 基础 |
| 机型中文名 | `modelName` | 基础 |
| 机型英文名 | `modelNameEn` | 基础 |
| 类别 | `planeSize` | 基础 |
| 出厂年份 | `deliveryDate` | 基础 |
| 翻新年份 | `renovationDate` | 基础 |
| 运营状态 | `serviceStatus` | 运营 |
| 共享状态 | `shareState` | 运营 |
| 自营标识 | `ownPlane` | 运营 |
| 认证状态 | `certState` | 运营 |
| 运营商 | `serviceProvider.companyNameShort / companyName` | 运营 |
| 托管公司 | `trusteeship` | 运营 |

展示逻辑：

- 信息 tab 分为“基础信息”和“运营信息”两块。
- 性能类字段只展示强相关内容：最大航程、最大航速、实用升限、起飞距离、最大起飞重量。
- 客舱、内饰、销售文案类字段暂不进入 P0；后续可以做“飞机档案详情页”。
- `serviceStatus / shareState / ownPlane / certState` 必须映射为中文文案，不展示原始数字。

### 4.7 选中飞机行程 tab

目标：用新增 `513013` 替代当前从详情原始字段猜测近期航班。

字段来源：

| 信息 | 来源 |
| --- | --- |
| 历史行程列表 | `513013.data[]` |
| 当前停场机场 | `513013.groundAirportInfo` |
| 分页 | `currentPage / hasNextPage` |

列表字段：

| 信息 | 来源 | 展示 |
| --- | --- | --- |
| 行程 ID | `flightId` | 内部关联，不作为主标题 |
| 出发机场 | `depAirport / depAirportFourName / depAirportName` | 左侧代码 + 名称 |
| 到达机场 | `arrAirport / arrAirportFourName / arrAirportName` | 右侧代码 + 名称 |
| 行程状态 | `flightStateStr` | 状态标签 |
| 起飞时间 | `depActualEpochMs > depTime1` | 出发侧 |
| 到达时间 | `arrActualEpochMs > arrTime1` | 到达侧 |
| 预计时长 | `estimateTime` | 行程摘要 |
| 时区 | `depZoneId / arrZoneId` | 时间格式化 |

展示逻辑：

- 行程 tab 默认展示最近 6 条，底部提供“加载更多”。
- 正在执行或最近完成的行程置顶。
- 点击有可用 `uniqueKey` 的行程时，进入该行程航迹；当前文档只有 `flightId`，需确认是否可作为 `513009.uniqueKey`。
- 如果无法打开历史航迹，只展开行程摘要，不移动地图。
- `groundAirportInfo` 在列表上方作为“当前停场”小摘要。

### 4.8 选中机场动态 tab

目标：把机场动态从“当前视口飞机过滤”升级为接口驱动。

字段来源：

| 信息 | 来源 | 展示位置 |
| --- | --- | --- |
| 今日预计起降 | `513015.flightsInfo.sortiesEstimate` 或 `513010.flightsInfo.sortiesEstimate` | Summary strip |
| 实际进港 | `inboundActually` | 进港按钮主值 |
| 计划进港 | `inboundPlan` | 进港按钮副状态 |
| 取消进港 | `inboundCancel` | 进港列表标签 |
| 实际离港 | `outboundActually` | 离港按钮主值 |
| 计划离港 | `outboundPlan` | 离港按钮副状态 |
| 取消离港 | `outboundCancel` | 离港列表标签 |
| 停场总数 | `513014.groundInfo.groundNum` 或 `513010.groundInfo.groundNum` | 地面按钮主值 |

展示逻辑：

- 机场点选后并行请求 `513010` 和 `513015`；切换到地面 tab 或动态 tab 打开时请求 `513014`。
- Summary strip 优先使用 `513015`，缺失时降级 `513010`。
- 当前 `513015` 只有统计没有进出港明细，进港/离港列表仍可先用实时在途飞机按机场过滤，列表上标注为“当前在途匹配”。
- 停场 tab 优先使用 `513014.groundPlanes[]`，不再只展示空态。

### 4.9 选中机场地面 tab

目标：让机场面板能真实展示停在该机场的公务机。

字段来源：`513014.groundInfo.groundPlanes[]`

列表字段：

| 信息 | 来源 | 展示 |
| --- | --- | --- |
| 注册号 | `tailNoDisplay` | 主标题 |
| 品牌 | `brandName` | 副标题 |
| 机型 | `modelName` | 副标题 |
| 机型图 | `modelImg` | 缩略图，缺失隐藏 |
| 状态 | `flightState` | 仅在途飞机显示“途中” |
| 停场时间 | `groundTimeStr` 或 `groundTime` | 右侧信息 |
| 运营商 | `serviceProvider` | 副信息 |
| 托管公司 | `trusteeship` | 副信息 |
| 运营状态 | `serviceStatus` | 标签 |
| 公司 logo | `companyLogo` | 小图标，缺失隐藏 |

展示逻辑：

- 地面 tab 默认按停场时间倒序或接口返回顺序展示。
- 点击停场飞机时使用 encrypted `tailNo` 调用 `513011`，进入飞机信息面板；如果该飞机不在空中，不绘制航迹。
- 机场动态 tab 下方可增加“停场机型结构”摘要，使用 `groundModels[]`。
- 停场飞机数量较多时分页或虚拟列表，不一次展开全部长卡片。

### 4.10 选中机场信息与天气

字段来源：

| 信息 | 来源 | 展示位置 |
| --- | --- | --- |
| 机场名称 | `airportInfo.airportName / airportNameEn` | Header、机场 tab |
| IATA / ICAO | `airportCode / icaoCode` | Header、机场 tab、浮窗 |
| 机场等级 | `grade` | 机场 tab |
| 机场类型 | `type` | 机场 tab |
| 高原类型 | `plateau` | 机场 tab |
| 开放外机 | `openState` | 机场 tab |
| 海拔 | `elevation` | 机场 tab |
| 跑道数 | `runwayCount` | 机场 tab |
| 最大跑道长度 | `runwayLength` | 机场 tab |
| 报批政策 | `approvalRules[]` | 机场 tab P1 |
| 天气 | `airportWeather / weatherInfo` | 天气 tab |
| 天气预警 | `weatherNotices` | 天气 tab P1 |
| 机场公告 | `airportNotices` | 机场 tab P1 |

展示逻辑：

- `513015.airportWeather` 与 `513010.weatherInfo` 统一适配为 `weatherInfo`。
- 机场 tab 基础字段保持两列网格；长字段如报批政策、公告放在折叠列表。
- 天气 tab 首屏展示天气、温度、风、能见度、AQI、报文时间；预警作为醒目但克制的列表项。
- `approvalRules.contentHtml` 需要白名单清洗后展示，不能直接插入未过滤 HTML。

## 5. P1 需求：可以加入但不阻塞当前迭代

### 5.1 机场统计图表

字段来源：`513015.dailyStatistics / totalStatistics / popularModels / originAndDest`

建议展示：

- 机场动态 tab 下新增“运行趋势”折叠区。
- 最近 15 天进港/离港柱状图。
- 今日、近 7 天、近 30 天公务机进出港总量切换。
- 热门机型排行。
- 热门始发地 / 目的地排行。

展示逻辑：

- 默认折叠，避免挤压进港/离港/停场主列表。
- 图表只在接口有数据时显示；无数据不出现空图表。
- 机场面板宽度有限，图表需要横向紧凑，避免复杂大屏化设计。

### 5.2 飞机媒体与客舱资料

字段来源：`513011.slideImgs / flightRadarImgs / cabinetLayout / materialImgs / cabinetLayoutImg`

建议展示：

- 当前概览图片优先使用可授权主图。
- 信息 tab 可加入“媒体”折叠区，展示 1 张主图和图片数量。
- 客舱布局、内饰图、推荐文案暂不进入地图运行面板，后续适合独立飞机档案页。

展示逻辑：

- 未确认授权来源的图片不展示为第三方图片来源。
- 视频 `slideImgs.type = 14` 只展示封面，不自动播放。

### 5.3 待售行程与停场计划

字段来源：`513011.tripsForSale / groundPlans`

建议展示：

- 不进入地图首屏。
- 可以在飞机信息 tab 底部增加“运营线索”折叠区。
- 只展示计数和最近一条摘要。

展示逻辑：

- 与实时运行数据视觉区分，不使用高亮促销样式。
- 如果用户当前任务是运行监控，默认折叠。

## 6. 数据请求与缓存策略

### 6.1 点选飞机

请求顺序：

1. 用 `513008` 快照立即打开面板。
2. 并行请求 `513009(uniqueKey)` 和 `513011(tailNo)`。
3. 如果用户打开“行程” tab，再请求 `513013(tailNo)`。

缓存：

- `513009`：selected 飞机短缓存，实时刷新时保留最新轨迹。
- `513011`：飞机档案中缓存，建议 5 分钟以上。
- `513013`：历史行程缓存 1-5 分钟，手动刷新可绕过缓存。

### 6.2 点选机场

请求顺序：

1. 用 `513008.airportList` 快照立即打开面板。
2. 并行请求 `513010(airportCode)` 和 `513015(airportCode)`。
3. 当用户进入地面 tab，或动态 tab 需要地面列表时，请求 `513014(airportCode)`。

缓存：

- `513010`：机场基础信息缓存 5 分钟。
- `513015`：机场动态缓存 1 分钟。
- `513014`：停场飞机缓存 1 分钟。

## 7. 空态、权限态与异常态

### 7.1 通用规则

- 字段缺失：显示 `—` 或隐藏该字段行。
- 目的地未知：只显示 `N/A`，隐藏 IATA、ICAO、UTC 标签。
- 图片缺失：显示默认占位，不显示破图。
- 列表为空：显示真实空态文案，不填充示例数据。
- 接口失败：保留已有旧数据并提示可刷新，首次失败展示模块级错误。

### 7.2 权限与脱敏

- `tailNoClear` 存在时展示明文。
- 只有 `tailNoDisplay` 时展示脱敏值。
- 只有 encrypted `tailNo` 时界面显示 `N/A` 或“未授权展示”，但仍可用于后续接口。
- `permissionInfo.globalViewer` 影响地图范围能力，但不改变已授权字段展示规则。
- `permissionInfo.editable` 后续可控制备注入口；当前不新增备注功能。

## 8. 字段不建议当前加入的位置

以下字段暂不进入当前地图运行主流程：

| 字段 | 原因 | 后续承载 |
| --- | --- | --- |
| `modelIntroText` | 长文案，影响运行效率 | 飞机档案详情页 |
| `jetPilot` | 营销文案 | 飞机档案详情页 |
| `spatialExperienceAdvantage` | 客舱体验，不是运行监控信息 | 飞机档案详情页 |
| `rangeAdvantage` | 长文本，可浓缩为最大航程字段 | 飞机档案详情页 |
| `cabinetLayout.cabinets.facilities` | 信息复杂，面板空间不足 | 独立档案页 |
| `tripsForSale.price/originalPrice` | 销售属性，不属于实时运行 | 运营线索折叠区 |
| `jumpToBigScreen` | 当前无大屏页面 | 后续机场大屏入口 |

## 9. 验收标准

1. 地图在途飞机标签始终优先展示注册号明文。
2. 选中飞机面板 Header 能区分呼号、注册号、机型、运营商。
3. 飞机概览中起降机场展示三字码、四字码、中英文名和 UTC 偏移。
4. 目的地未知时，不出现多余 `—`、IATA、ICAO 或 UTC 标签。
5. 行程动态使用服务端时间和机场时区计算，不受用户设备时区影响。
6. 航迹 tab 的速度/高度图使用真实航迹点，不用示例数据补线。
7. 信息 tab 能展示 `513011` 的核心飞机档案字段。
8. 行程 tab 使用 `513013`，无数据时显示真实空态。
9. 机场动态 summary 优先使用 `513015`，缺失时降级 `513010`。
10. 机场地面 tab 使用 `513014.groundPlanes[]` 展示停场飞机。
11. 机场 hover 与 selected 浮窗继续使用标准格式：中文名、英文名、`IATA / ICAO`。
12. 所有新增字段缺失时不会导致布局跳动、破图、NaN、undefined 或 encrypted tailNo 露出。
