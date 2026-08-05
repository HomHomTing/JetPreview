# 搜索栏交互需求文档 1.9

> **调研状态（2026-08-04）：** 已完成 Flightradar24 网页端搜索栏实测。本文档记录可观察到的搜索入口、结果分组、shortcut 面板、结果展开、地图联动和异常状态，并转译为本系统的公务机运行数据搜索需求。实现不得调用或复用第三方私有搜索接口，所有结果必须来自本系统自有/授权数据库与已配置的 `513008-513011` 接口扩展。

> **1.10 实施状态（2026-08-04）：** 主版本已按本文 P0 落地本地前端搜索索引：结果分组、无结果 shortcuts、`DEP-ARR` 航线解析、Flight by route 二级面板、Operator / Airports by country / Nearby 面板、结果点击先展开、`Show on map` 后才联动地图、机场 Arrivals/Departures/On ground 动作、方向键与 Enter/Escape 快捷键。1.10 不新增第三方或未授权搜索请求，仍复用已加载的私有数据库/缓存数据。

## 1. 背景

当前系统顶部已有搜索框，但能力较轻：

- 只在本地 `businessJets` 和 `airports` 中做字符串包含匹配。
- 结果未分组，只返回 aircraft / airport 两类。
- 点击结果会直接选择实体并清空搜索，不支持实体展开动作。
- 不支持 route、operator、nearby、country airport、recent/scheduled trip 等搜索场景。
- 不支持 keyboard active item、recent searches、loading、网络失败、地理位置授权等状态。

本次需求用于定义 1.9 版本搜索栏交互标准，使搜索成为地图主入口之一，而不只是简单过滤框。

## 2. 参考来源

- FR24 网页端实测：`https://www.flightradar24.com/`，观察时间 `2026-08-04`。
- FR24 搜索指南入口：`https://www.flightradar24.com/blog/new-flightradar24-search`。该链接由 FR24 搜索结果面板底部直接提供。
- 本项目现有搜索实现：`app.js` 中 `searchItems()` / `renderSearch()`。
- 本项目机场 selected panel 需求：`docs/airport-selected-panel-requirements-v1.9.md`。
- 本项目飞机 selected panel 需求：`docs/selected-aircraft-detail-panel-requirements-v1.8.md`。

## 3. FR24 可观察搜索模型

### 3.1 顶部搜索入口

FR24 搜索栏位于地图顶部，默认是单行输入框。实测 placeholder/label 为：

```text
Flight number, airport, route or reg.
```

交互特征：

- 输入时自动打开结果面板。
- 面板覆盖在地图之上，不改变地图当前 selected 状态。
- 输入为空时结果面板关闭。
- `Escape` 会清空输入并关闭结果面板，但不关闭已打开的机场/飞机详情面板。
- 输入焦点停留在搜索框时，`Enter` 不会强制选择第一条结果；核心交互仍是点击结果或点击结果展开后的动作按钮。

### 3.2 自由文本结果分组

FR24 的结果不是单一列表，而是按实体类型分组。

实测分组包括：

| 分组 | 场景 | 行内信息 |
| --- | --- | --- |
| Airports | 输入 `JFK`、机场名、IATA/ICAO | 机场全名、IATA / ICAO |
| Airlines | 输入 `American`、`AA101` 等 | logo、航空公司名、IATA / ICAO |
| Live flights | 输入航班号、呼号、注册号、nearby | logo、航班号、机型、注册号、起降城市、起降机场、距离 |
| Recent or scheduled flights | 输入航班号或 route | 航班号 / 呼号，通常显示前 10 条和总数 |
| Aircraft | 输入注册号、局部注册号 | logo、注册号、机型 |

计数展示：

- 单组结果会显示类似 `1 of 1`。
- 长列表会显示类似 `10 of 24`。
- airline live flights 会显示类似 `777 flights found`。

### 3.3 无结果与 Shortcuts

输入无法匹配时，FR24 显示：

- `No matches found...`
- `Shortcuts to find`
- `Flight by route`
- `LIVE flight by airline`
- `Airports by country`
- `Nearby`
- 底部搜索指南博客链接。

该设计把无结果状态转化为可操作入口，避免用户卡在空状态。

### 3.4 Flight by Route

点击 `Flight by route` 后，FR24 打开二级面板：

- 标题：`Flight by route`
- 说明：按 airport name、IATA 或 ICAO 搜索。
- 字段：`From` / `To`
- 输入不足时 `Search` disabled。
- 面板提示可用 `LHR-JFK` 这种格式直接在主搜索栏做 route search。

实测主搜索栏输入 `LHR-JFK`：

- `Airports` 分组先列出两端机场。
- `Recent or scheduled flights` 分组列出该航线航班。

### 3.5 LIVE Flight By Airline

点击 `LIVE flight by airline` 后，FR24 打开航空公司索引面板：

- 顶部搜索框：`Airline name or ICAO code`。
- 列表按字母分组。
- 输入 `AAL` 会实时过滤航空公司。
- 点击 `American Airlines AA / AAL` 后进入 `American Airlines flights`。
- 结果区域显示 `Live flights`，并展示 total count。

本系统没有民航 airline 主业务，需转译为公务机 `Operator / Fleet / Owner` 搜索。

### 3.6 Airports By Country

点击 `Airports by country` 后，FR24 打开国家索引面板：

- 顶部搜索框：`Country name`。
- 国家按字母分组。
- 输入 `United States` 会过滤国家列表。
- 点击国家后应进入该国家机场列表。

本系统应支持国家 / 地区 / 城市下的商务机场、FBO 机场和公务机常用机场搜索。

### 3.7 Nearby

点击 `Nearby` 后，FR24 会直接展示附近结果：

- 如果未授权浏览器定位，会提示距离基于当前 IP 地址估算，精确距离需要允许 location access。
- 结果分组包含 `Airports` 和 `Live flights`。
- 机场结果显示距离，如 `17 km away`。
- live flight 结果在主标题中也包含距离。
- 长列表提供 `Show all`。

本系统应优先使用浏览器定位授权；未授权时使用地图中心点或后端 IP 粗定位，并明确标注为 estimated distance。

### 3.8 搜索结果点击与展开

FR24 搜索结果点击后通常先展开实体卡，而不是立即跳走。

机场结果展开后出现动作：

- `Show on map`
- `Arrival board`
- `Departure board`
- `Aircraft on ground`
- `Find arriving flight`
- `Find departing flight`
- `More`

点击 `Show on map` 后：

- URL 更新为 `/airport/{iata}`。
- 地图居中到机场。
- 左侧打开机场面板。
- 面板含 `General`、`Departures`、`Arrivals`、`On ground`、`More`。

航班结果展开后出现信息与动作：

- 航班时间：scheduled / actual / estimated。
- 状态。
- Airline / Flight / Equipment / Call sign / Aircraft。
- 动作：`Show on map`、`Aircraft info`、`Flight info`、`Download CSV/KML`、`Playback`、`Share`。

本系统应保持同一交互节奏：结果行点击先展开详情摘要，明确动作后再改变地图 selected 状态。

## 4. 本系统搜索目标

1. 搜索栏成为全局对象入口，覆盖飞机、行程、机场、航线、运营方、附近对象。
2. 结果分组、结果展开、地图 selected 状态和左侧详情面板联动一致。
3. 所有 aircraft 搜索结果只返回业务规则允许的 business jet。
4. 支持实时数据与历史/计划数据混合搜索，但明确区分 live / scheduled / historical。
5. 无结果时提供 shortcut，不让用户进入死胡同。
6. 搜索结果应可用键盘完成基本导航，并保留鼠标点击的主路径。

## 5. 信息架构

### 5.1 搜索栏

位置：

- 桌面端：顶部居中，地图层之上，右侧 rail 打开时按现有规则避让。
- 移动端：顶部安全区内全宽，输入框下方结果面板不遮挡系统顶部栏。

输入框文案：

```text
Search flight, airport, route or reg.
```

注意：

- 不出现 `Flightradar24` 品牌文字。
- 搜索图标使用现有 `icon-search`。
- 输入框高度、圆角、阴影继续沿用当前 FR24-style toolbar 视觉。

### 5.2 结果面板

结果面板应为深色浮层，位于搜索框正下方。

基础结构：

```text
Search panel
  Group heading
  Group count
  Result row
    Primary line
    Secondary metadata
    Optional badge / distance / status
  Inline expanded actions
  Footer help / shortcuts
```

分组顺序 P0：

1. Live aircraft
2. Trips
3. Airports
4. Routes
5. Operators
6. Aircraft profiles
7. Shortcuts

FR24 的 `Airlines` 在本系统中对应 `Operators`。

### 5.3 结果行样式

P0 行信息：

| 类型 | Primary | Secondary | Badge |
| --- | --- | --- | --- |
| Live aircraft | callsign / trip no. | type code、registration、route | LIVE / stale / distance |
| Trip | trip no. / callsign | dep-arr、scheduled/actual time | Scheduled / Historical |
| Airport | airport name | IATA / ICAO、city、country | Airport / distance |
| Route | DEP-ARR | dep airport name、arr airport name | Route |
| Operator | operator name | fleet count、ICAO/IATA if available | Operator |
| Aircraft profile | registration | model、operator | Aircraft |

P1：

- 高亮命中的字符片段。
- 显示小型 aircraft icon / airport pin / operator logo。
- 最近搜索历史。

## 6. 搜索场景需求

### 6.1 输入为空

P0：

- 默认不展示结果面板。
- 如果用户刚清空输入，关闭搜索结果但保留当前 selected aircraft / selected airport。

P1：

- 聚焦空输入时显示 recent searches 和 shortcuts。

### 6.2 搜索 live aircraft

支持输入：

- callsign
- registration 明文
- encrypted registration 对应的 `tailNoClear`
- aircraft type code
- model
- operator
- dep / arr airport code

返回：

- 仅 business jet。
- 优先 live/in-flight。
- 过期或 stale 数据可显示，但必须带状态。

点击结果：

1. 结果行展开摘要卡。
2. 摘要卡显示当前 altitude、speed、route、registration、type、last update。
3. 点击 `Show on map` 后执行 `selectAircraft()`、地图居中、打开飞机详情面板。

### 6.3 搜索 aircraft profile

当注册号没有 live flight 但存在飞机档案：

- 显示在 `Aircraft profiles` 分组。
- 可进入飞机档案面板或历史行程列表。
- 不强行在地图上展示不存在的 live marker。

### 6.4 搜索 flight / trip

支持输入：

- trip no.
- flight no.
- callsign
- route + date

结果分组：

- `Live aircraft`：正在执行的行程。
- `Trips`：scheduled / historical 行程。

点击 trip：

- 若 live：可 `Show on map`，进入 selected aircraft。
- 若 scheduled：打开 trip detail，不选中地图飞机。
- 若 historical：打开历史轨迹 / 回放入口，不影响 live map。

### 6.5 搜索机场

支持输入：

- IATA
- ICAO
- airport name
- city
- country
- FBO / business terminal name P1

点击机场结果：

1. 先展开动作区。
2. P0 动作：
   - `Show on map`
   - `Arrivals`
   - `Departures`
   - `On ground`
   - `Find arriving aircraft`
   - `Find departing aircraft`
   - `More`
3. `Show on map` 执行 `selectAirport()`、地图居中、打开机场详情面板。

与 `docs/airport-selected-panel-requirements-v1.9.md` 保持一致。

### 6.6 搜索 route

支持主搜索栏直接格式：

```text
DEP-ARR
```

例：

```text
LHR-JFK
```

解析要求：

- `DEP` / `ARR` 支持 IATA 或 ICAO。
- 支持大小写不敏感。
- 支持用户输入空格时给出 correction shortcut，例如 `JFK LHR` 时提示使用 `JFK-LHR`。

结果：

- `Airports`：两端机场。
- `Routes`：route object。
- `Trips`：当前 live / scheduled / recent trips。

Route 结果点击：

- 展开 route card。
- 动作：
  - `Show active flights`
  - `Fit route`
  - `Departures from DEP`
  - `Arrivals to ARR`

### 6.7 Flight By Route shortcut

无结果或用户点击 shortcut 后打开二级面板：

字段：

- `From`
- `To`

要求：

- 两个字段均使用 airport autocomplete。
- 未选择有效机场前 `Search` disabled。
- 搜索后返回 route + trips。
- 顶部提示用户可下次直接输入 `DEP-ARR`。

### 6.8 Operator / Fleet shortcut

对应 FR24 `LIVE flight by airline`。

字段：

- `Operator name or code`

面板：

- 默认按字母/数字分组。
- 输入时实时过滤。
- 点击 operator 后进入 `Operator aircraft` 列表。

结果：

- live aircraft count。
- fleet aircraft count。
- 可按 live / on ground / scheduled 过滤 P1。

### 6.9 Airports By Country shortcut

字段：

- `Country name`

面板：

- 国家/地区按字母分组。
- 输入时实时过滤。
- 点击国家后展示该国家的机场列表。

机场列表排序：

1. major business airport
2. business aviation/FBO airport
3. traffic volume
4. city/name alphabetical

### 6.10 Nearby shortcut

触发：

- 用户点击 `Nearby`。
- 或输入 `nearby` / `near me` P1。

定位优先级：

1. 浏览器 location permission。
2. 用户账号配置的 home base。
3. 当前地图中心。
4. 后端 IP 粗定位。

结果：

- `Nearby airports`
- `Nearby live aircraft`
- `Nearby operators/FBO` P1

距离说明：

- 精确定位：显示 `12 km away`。
- IP / 地图中心估算：显示 `estimated distance`。
- 定位不可用：提示用户允许定位或使用当前地图中心。

### 6.11 无结果

P0：

- 显示 `No matches found`。
- 显示可操作 shortcuts：
  - Flight by route
  - Live aircraft by operator
  - Airports by country
  - Nearby
- 显示建议：
  - 检查拼写；
  - 尝试 IATA/ICAO；
  - route 使用 `DEP-ARR`；
  - registration 可输入完整或局部。

### 6.12 网络错误 / 接口失败

P0：

- 保留用户输入。
- 显示 `Search temporarily unavailable`。
- 可继续展示本地缓存结果，但必须标注 cached。
- 不自动清空结果面板。

## 7. 键盘与焦点

P0：

- `/` 或 `Cmd+K` / `Ctrl+K` 聚焦搜索框。
- `Escape`：
  - 如果结果面板打开，先关闭结果面板并清空输入；
  - 不关闭已有 selected aircraft / airport panel；
  - 再按一次可交给页面其他全局逻辑处理。
- `ArrowDown` / `ArrowUp`：在结果行和 shortcut 中移动 active item。
- `Enter`：
  - 如果有 active item，展开或执行该项默认动作；
  - 如果没有 active item，不强制选择第一条，避免误操作。
- `Tab`：进入结果行、动作按钮、shortcut。

P1：

- `Cmd+Backspace` / `Ctrl+Backspace` 清空输入。
- `Alt+Enter` 直接执行第一条 `Show on map`。

## 8. 地图与 selected 状态联动

规则：

- 输入搜索不得改变地图 selected 状态。
- 点击结果行只展开摘要，不改变地图 selected 状态。
- 点击 `Show on map` 后才改变 selected 状态。
- `Show on map` 对 aircraft 调用 `selectAircraft()`。
- `Show on map` 对 airport 调用 `selectAirport()`。
- 选择 airport 后保留 selected airport pin，即使机场 layer auto 当前 zoom 不显示普通机场。
- 选择 aircraft 后关闭或降噪搜索面板，地图跟随当前 selected aircraft 规则。

URL：

- airport：`/airport/{iataOrIcao}` 或本系统等价 hash state。
- aircraft/trip：`/flight/{tripId}` 或本系统等价 hash state。
- route：`/route/{dep}-{arr}` P1。

## 9. 数据需求

### 9.1 前端 Search Index

P0 建立 `searchIndex`：

```javascript
{
  aircraftLive: [],
  aircraftProfiles: [],
  trips: [],
  airports: [],
  routes: [],
  operators: [],
  countries: [],
  updatedAtEpochMs: 0
}
```

来源：

- `513008`：live aircraft、airport list。
- `513009`：selected trip detail；后续可扩展 trip search。
- `513010`：airport detail。
- `513011`：aircraft profile。
- 后续新增 search aggregation endpoint P1。

### 9.2 建议后端聚合接口 P1

建议新增统一搜索接口，避免前端全量拉取大索引：

```javascript
GET /search
{
  "query": "N932AM",
  "types": ["aircraft", "trip", "airport", "route", "operator"],
  "businessJetOnly": true,
  "bbox": {},
  "mapCenter": { "lat": 1.35, "lng": 103.99 },
  "limitPerGroup": 10
}
```

返回：

```javascript
{
  "query": "N932AM",
  "groups": [
    {
      "type": "liveAircraft",
      "label": "Live aircraft",
      "total": 1,
      "items": []
    }
  ],
  "shortcuts": [],
  "searchVersion": "20260804-001"
}
```

## 10. 排序与召回

P0 排序：

1. 精确代码匹配：registration、callsign、IATA、ICAO。
2. 前缀匹配。
3. 词组包含匹配。
4. 模糊匹配 P1。
5. 当前 live / visible viewport 优先。
6. selected / recently viewed 优先 P1。
7. stale / historical 降级。

同组限制：

- 默认展示前 10 条。
- 组头显示 `visible of total`。
- `Show all` 展开完整列表 P1。

## 11. 性能

P0：

- 输入 debounce：`150-250ms`。
- 本地索引搜索应在 `50ms` 内完成。
- 远程搜索 loading 超过 `300ms` 显示轻量 loading。
- 结果面板 DOM 节点不超过 `120`。
- 长列表使用虚拟滚动 P1。

P1：

- 搜索索引分片缓存。
- `IndexedDB` 保存 airport/operator/country 静态索引。
- live aircraft 使用当前 `513008` 刷新节奏，不因搜索额外高频请求。

## 12. 视觉规范

P0：

- 搜索输入框继续使用浅色背景、地图浮层阴影、6px 以内圆角。
- 结果面板使用深灰/黑背景，白色主文字，灰色 secondary。
- section heading 使用小号 uppercase 或半粗体。
- active / hover 行使用半透明白色底。
- 状态 badge：
  - LIVE：绿色或蓝绿色；
  - Scheduled：灰色；
  - Stale：琥珀色；
  - Historical：灰色 outline。

不得：

- 出现第三方品牌文字。
- 使用第三方 logo 资源。
- 将 airline 模式直接用于公务机主业务而不做 operator/fleet 转译。

## 13. 当前实现差距

当前 `app.js`：

- `searchItems()` 只返回 aircraft 和 airport。
- 没有 grouping。
- 没有 shortcut。
- 没有 result expansion。
- 没有 keyboard active item。
- 没有 route parser。
- 没有 nearby。
- 没有 operator / trip / aircraft profile 搜索。
- 点击结果会立即 `selectAircraft()` / `selectAirport()` 并清空搜索。

## 14. P0 实施清单

1. 新增 `searchState`：query、groups、activeIndex、expandedItem、loading、error。
2. 新增 `buildSearchIndex()`，合并 `513008` aircraft / airport。
3. 重写 `searchItems()` 为 `searchGroups()`。
4. 结果按 group 渲染，展示 count。
5. 支持 airport / aircraft / trip / route / operator 基础结果结构。
6. 支持 `DEP-ARR` route parser。
7. 支持 no-match shortcuts。
8. 支持 airport 和 aircraft 结果展开动作。
9. `Show on map` 才改变 selected 状态。
10. 实现 Escape、ArrowUp/Down、Enter、Tab。
11. Nearby 使用地图中心作为 P0 fallback。
12. 更新 CSS：group heading、result row、expanded actions、shortcut buttons、loading/error/empty。

## 15. 验收标准

1. 输入 `JFK` 类机场代码，出现 Airports 分组，行内显示机场名、IATA、ICAO。
2. 输入公务机注册号，若 live，出现 Live aircraft；若无 live 但有档案，出现 Aircraft profiles。
3. 输入 `ZBAA-VHHH` 类 route，出现两端机场和对应 Trips / Routes。
4. 输入无结果文本，出现 no match 和四个 shortcuts。
5. 点击 Flight by route 后出现 From / To 二级面板，Search disabled 直到两个机场有效。
6. 点击 Operator shortcut 后出现 operator/fleet 索引和实时过滤。
7. 点击 Airports by country 后出现国家索引，选择国家后展示机场列表。
8. 点击 Nearby 后展示附近机场和附近 live aircraft，并标注距离来源。
9. 点击结果行只展开摘要，不改变地图 selected 状态。
10. 点击 Show on map 后地图居中并打开对应 selected panel。
11. Escape 清空搜索并关闭结果面板，但不关闭已有 selected panel。
12. 搜索只返回 business jet 允许范围内的 aircraft。
13. 远程搜索失败时保留输入并显示错误，不清空当前 selected state。
