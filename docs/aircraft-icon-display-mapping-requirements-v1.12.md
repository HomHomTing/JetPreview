# 飞机图标显示与 ICAO Code 映射需求文档 v1.12

## 版本目标

1.12 版本仅聚焦飞机机型字段与地图飞机图标显示之间的关系。

飞机图标渲染的唯一业务判断字段统一定义为 `icaoCode`。该字段对应飞机详情面板中展示的 Aircraft Type Code。地图首页和图标配置后台必须基于这个字段解析飞机图标，不能再使用飞机尺寸文本、分类文本、注册号、选中状态、缓存的 iconKey 或机型展示名称来决定图标形状。

## 当前运行时映射关系

### 静态图标配置

当前 `aircraft-icon-config.js` 提供运行时种子配置：

- `iconAssetSet`：当前启用的 PNG 图标资源集，目前为 `fr24-template-shadow-fr24yellow`。
- `defaultIconKey`：默认兜底图标，目前为 `LJ60`。
- `groups`：每个图标组拥有一个 `iconKey`，并通过空格分隔的 `codes` 维护一组机型代码。
- `typeMappings`：由 `groups` 自动展开生成，每个机型代码对应一条映射记录。
- `typeCodeIconMap`：由映射记录生成的查找表，结构为 `{ [aircraftTypeCode]: iconKey }`。
- `iconImagePaths`：图标资源路径表，结构为 `{ [iconKey]: assetPath }`。
- `iconAssets`：图标库元数据，供后台控制台使用。

当前关键示例：

- `GL7T -> GL7T`
- `GL8T -> GL8T`
- `GA7C -> GA7C`
- 大多数其他公务机 ICAO 机型代码，例如 `GLF6`、`GLEX`、`FA8X`，当前映射到 `LJ60`。

### 接口数据适配

`data-service.js` 负责把接口返回数据适配为地图中的飞机对象。

对于 `513008` 实时飞机数据，当前通过 `firstAircraftTypeCode(...)` 提取机型代码。当前允许读取的字段为：

- `icaoCode`
- `icao_code`

同时会继续搜索以下嵌套对象：

- `planeInfo`
- `aircraftInfo`
- `aircraft`
- `plane`
- `modelInfo`

以下通用分类值会被丢弃，不能作为图标映射依据：

- `BIZ`
- `J`
- `BUSINESS`
- `BUSINESS_JET`
- `BUSINESS-JET`

最终生成的飞机对象会写入：

- `icaoCode = 提取到的机型代码`
- `aircraftTypeCode = 提取到的机型代码 || "BIZ"`
- `fr24IconKey = 根据机型代码解析出的 iconKey`

对于选中飞机详情：

- `513009` 飞行轨迹详情优先读取 `planeInfo.icaoCode`。
- `513011` 飞机基础信息优先读取 `planeInfo.icaoCode`。
- 详情数据会合并回对应飞机对象，并再次走统一图标解析逻辑。

### 首页图标渲染

`app.js` 当前从 `AIRCRAFT_ICON_CONFIG.typeCodeIconMap` 构造 `aircraftIconKeyByTypeCode`。

图标解析流程如下：

1. `explicitAircraftTypeCode(jet)` 从 `jet`、`jet.raw`、`flightDetail`、`planeDetail` 中查找 `icaoCode` 或 `icao_code`。
2. 如果找到非通用代码，则该代码优先级最高。
3. 如果没有找到明确代码，则使用 `jet.aircraftTypeCode`，但前提是它不是通用分类值。
4. `mappedAircraftIconKeyForJet(jet)` 使用该代码查询 `aircraftIconKeyByTypeCode`。
5. `resolvedAircraftIconKey(jet)` 校验 iconKey 是否存在，不存在则兜底为 `LJ60`。
6. `aircraftIconKey(jet)` 始终调用该解析结果。
7. `aircraftIconImagePath(jet)` 使用解析出的 iconKey 选择 PNG 图标资源。

选中与未选中的飞机必须共用同一套 iconKey 解析逻辑。选中状态只能影响视觉状态，例如尺寸、层级、标签、选中配色，不能切换飞机图标形状。

### 详情缓存行为

当实时快照中只有通用机型信息时，地图会针对疑似超远程公务机排队请求 `513011` 飞机基础信息。飞机详情会按照加密注册号和可用明文注册号进行缓存。后续实时刷新遇到同一架飞机时，会重新套用缓存详情，使 `planeInfo.icaoCode` 能持续驱动图标显示。

## 当前控制台映射关系

`admin.js` 当前把后台数据存储在浏览器 localStorage 中：

- 存储键：`aircraft-icon-control-console:v1.7:template-shadow-fr24yellow`
- Schema 版本：`1.7.0`
- 主表：`mappings`
- 映射行主键：`aircraftTypeCode`
- 映射目标：`fr24IconKey`

当前控制台支持：

- 浏览图标库。
- 编辑单条机型代码到图标的映射。
- 批量把选中的机型代码分配到某个图标。
- JSON / CSV 导入导出。
- 本地草稿发布和历史快照回滚。
- 校验重复 Active 机型代码。

当前限制：控制台发布后的映射不会自动成为首页地图的运行时配置。首页地图仍主要读取 `aircraft-icon-config.js` 中的静态映射。

## 1.12 需要解决的问题

1. `aircraftTypeCode` 和 `icaoCode` 在本项目中本质上是同一个业务键，但当前界面和代码命名混用，容易造成理解偏差和错误配置。

2. 当前控制台以 `aircraftTypeCode` 为主键编辑映射，但运行时需求已经明确要求以 `icaoCode` 为准。控制台应把 `icaoCode` 作为主字段，`aircraftTypeCode` 仅保留为兼容别名。

3. 当前映射数据源较分散：

- `aircraft-icon-config.js` 中的 `groups.codes`
- 自动生成的 `typeMappings`
- 自动生成的 `typeCodeIconMap`
- 控制台 localStorage 中的 `mappings`
- 导出的 JSON / CSV 映射

4. 控制台可以发布本地快照，但首页地图无法直接消费这些快照。这样会导致后台看起来可用，但还不是实际运行时权威配置源。

5. 飞机对象上存在 `fr24IconKey` 字段，但实际渲染会重新基于 `icaoCode` 解析 iconKey。这种方式比信任接口或缓存中的旧 iconKey 更安全，但如果没有清晰诊断信息，调试时容易被误导。

6. 当前没有专门的未映射代码报告。如果实时飞机存在有效 `icaoCode`，但没有配置对应图标，系统会兜底到 `LJ60`，但后台不容易发现和补齐这个缺口。

7. 当前后台是以机型代码为中心的编辑方式。用户本次需求是支持设置每一个 icon 对应的 `icaoCode`，因此需要新增以 icon 为中心的配置方式。

## 1.12 产品需求

### 统一映射规则

系统必须把 `icaoCode` 定义为飞机图标形状选择的唯一业务键。

优先级如下：

1. `513011.planeInfo.icaoCode`
2. `513009.planeInfo.icaoCode`
3. `513008` 飞机记录中的 `icaoCode`
4. `513008` 飞机记录中的 `icao_code`
5. 无有效映射时兜底为 `LJ60`，并记录 `fallbackReason = "missing-or-unmapped-icao-code"`

`J`、`BIZ` 等通用分类值不能作为图标映射键。

### 运行时解析器

需要新增或正式固化一个统一解析器：

```js
resolveAircraftIcon(jet) => {
  icaoCode,
  icaoCodeSource,
  iconKey,
  assetPath,
  sizeClass,
  fallbackReason,
  mappingVersion
}
```

地图 marker、选中飞机 marker、飞机投影阴影、选中详情面板中的 Type Code 展示、诊断信息，都必须消费同一份解析结果。

选中和未选中状态不得改变 `iconKey`，只能改变视觉状态。

### 控制台：以 Icon 为中心的映射管理

新增以 icon 为中心的映射管理工作流：

- 每个 icon 卡片或详情页展示当前绑定到该 icon 的全部有效 `icaoCode`。
- 管理员可以单个新增代码、批量粘贴代码、删除代码 chip。
- 一个 `icaoCode` 同一时间只能属于一个 Active icon。
- 把代码从一个 icon 移动到另一个 icon 时，需要展示明确差异：`CODE: oldIcon -> newIcon`。
- 保存前和发布前都必须阻止重复代码。
- 运行时诊断发现的未知或未映射代码，应能快速加入到指定 icon。

现有 Type Code 表格可以保留，但界面文案需要调整：

- `Type Code` 改为 `ICAO Code`
- `Aircraft type code` 改为 `Aircraft Type Code / ICAO Code`
- JSON / CSV 导出以 `icaoCode` 作为主列。
- 导入时继续兼容旧字段 `aircraftTypeCode`。

### 控制台：运行时发布

发布草稿时必须生成首页可消费的运行时映射配置。推荐结构：

```json
{
  "schemaVersion": "1.12.0",
  "mappingVersion": "icon-map-2026.08.06-001",
  "publishedAt": "2026-08-06T00:00:00+08:00",
  "defaultIconKey": "LJ60",
  "icaoCodeIconMap": {
    "GL7T": "GL7T",
    "GL8T": "GL8T",
    "GA7C": "GA7C"
  },
  "iconCodeGroups": [
    {
      "iconKey": "GL7T",
      "icaoCodes": ["GL7T"]
    }
  ]
}
```

首页应优先读取 `icaoCodeIconMap`。如果该字段不存在，可以回退读取旧版 `typeCodeIconMap`。

Icon ICAO 页面需要提供两个明确动作：

- `保存本地方案`：将当前草稿、审计记录和筛选状态保存到本机浏览器存储，不触发地图页生效。
- `发布到地图生效`：校验当前草稿，生成本地发布快照，并写入地图页会读取的运行时配置；地图页刷新后使用最新映射。

当草稿与已发布快照没有差异时，`发布到地图生效` 仍需要允许重新写入运行时配置，避免本地运行时配置缺失或被清空后无法生效。

### 首页：首屏机型代码缓存

由于 `513008` 在途飞机快照可能不包含飞机 `icaoCode`，首页需要维护一个轻量本地缓存：

- 缓存键使用加密注册号、明文注册号等飞机身份字段。
- 缓存值只保存上一次由 `513009` 或 `513011` 确认过的 `icaoCode` 和派生 iconKey。
- 页面刷新后，如果首屏飞机快照暂时缺少 `icaoCode`，解析器可以在接口详情到达前使用该缓存。
- 缓存优先级必须低于接口显式字段，高于 `LJ60` 兜底。
- 选中飞机或后台静默详情预加载成功后，需要立即刷新缓存并重绘地图 marker。
- 静默详情预加载失败只能短时重试，不能永久标记失败，否则会导致未选中状态一直停留在错误 icon。

### 首页：飞机点选与选中视觉

飞机 marker 的点选区域必须尽可能贴合飞机 icon 本体：

- 点击热区跟随当前 zoom 下的飞机 icon 尺寸动态变化。
- 飞机标签、航迹线和投影阴影不参与飞机点选。
- 两架飞机距离较近时，不能因为固定大热区覆盖导致无法切换到目标飞机。
- 选中状态切换后，之前选中的飞机恢复普通状态时，本体不能因为 stale / aging 状态出现透明或虚化；状态差异可以体现在标签或其他辅助信息中。

### 控制台：数据迁移

需要增加从当前 localStorage schema `1.7.0` 到 `1.12.0` 的迁移逻辑：

- `aircraftTypeCode` 迁移为 `icaoCode`。
- `fr24IconKey` 继续作为该行选择的 iconKey。
- 旧发布快照继续可读。
- `GL7T`、`GL8T`、`GA7C` 三个强制种子映射仍需要覆盖过期本地映射。
- 强制种子映射只允许用于旧版本迁移；如果本地状态已经是 `1.12.0`，刷新页面时必须保留管理员保存并发布后的本地方案。

### 诊断信息

新增一套图标映射诊断模型，至少暴露在 debug 数据中，后续可以同步展示在控制台：

- 当前渲染飞机总数。
- 有有效 `icaoCode` 且成功映射的数量。
- 缺少 `icaoCode` 的数量。
- 存在 `icaoCode` 但未配置映射的数量。
- 未映射代码列表，并附带示例注册号或呼号。
- 选中飞机解析链路：
  - 注册号
  - `icaoCode`
  - 来源接口
  - 解析出的 `iconKey`
  - 图标资源路径
  - 兜底原因

## 工程建议

1. 将当前较大的 `aircraft-icon-config.js` 拆分为两个概念层：

- 静态图标资源注册表
- 已发布的 ICAO Code 映射注册表

2. 在代码中保留 `aircraftTypeCode` 作为兼容别名，但新增公开配置和控制台主字段统一使用 `icaoCode`。

3. 让 `aircraftIconKey(jet)` 消费统一解析器的结果，避免多个位置重复拼接局部判断逻辑。

4. 不再把飞机对象上的 `fr24IconKey` 当作语义来源。该字段可以保留为派生展示或调试信息，但渲染来源必须是统一解析器。

5. 增加一个已发布映射的运行时文件或后端接口。基于当前静态网站架构，短期方案建议：

- 控制台发布或导出映射。
- 生成 `aircraft-icon-runtime-config.js`。
- 首页在 `aircraft-icon-config.js` 之后加载该文件。
- 运行时优先把 `icaoCodeIconMap` 合并到旧静态映射上。

6. 增加已知问题飞机的视觉测试样例：

- `9H-VIM`，`icaoCode = GL7T`
- `A7-CHA`，`icaoCode = GA7C`
- 一架 `GL8T` 样例

每个样例都必须验证未选中和选中两种状态。

## 验收标准

1. `GL7T`、`GL8T`、`GA7C` 在未选中状态下展示对应的超远程专属图标。

2. 切换选中其他飞机时，`GA7C` 或 `GL7T` 飞机不能回退为 `LJ60`。

3. 选中飞机不能改变图标形状，只能改变选中视觉状态。

4. 管理员可以打开某个 icon，并直接编辑该 icon 对应的 `icaoCode` chip 列表。

5. 控制台必须阻止重复 Active `icaoCode` 被分配到多个 icon。

6. 控制台导出和发布配置必须以 `icaoCode` 作为主字段。

7. 首页能消费已发布的 `icaoCodeIconMap`，刷新后体现后台配置变化。

8. 有效但未配置的实时 `icaoCode` 应兜底为 `LJ60`，并出现在未映射诊断中。

9. `J`、`BIZ` 等通用分类值永远不能成为图标映射键。

10. 回归检查覆盖以下路径：

- 仅实时快照数据的飞机。
- 选中后加载 `513011` 详情的飞机。
- 实时刷新后的同一架飞机。
- 切换选中飞机后的图标保持。
