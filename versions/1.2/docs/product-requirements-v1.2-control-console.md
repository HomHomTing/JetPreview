# Aircraft Icon Control Console 1.2 PRD

## 1. 版本目标

V1.2 在 1.1 地图与飞机图标展示能力稳定后，新增一个控制后台，用于管理飞机图标与机型代码的对应关系。后台的核心目标是让运营、产品和数据维护人员可以不修改前端代码，就完成 `aircraftTypeCode -> fr24IconKey` 的配置、预览、校验、发布和回滚。

1.1 地图页面作为展示端保持稳定；1.2 控制后台作为配置端新增。展示端后续从后台发布的映射配置读取图标规则。

## 2. 范围说明

本版本包含：

- 图标库管理：查看系统支持的飞机 icon key、图标预览、状态、分类和资产来源。
- 机型代码映射管理：配置 ICAO aircraft type code 对应的 icon key、sizeClass 和基础机型信息。
- 多状态编辑：支持草稿、待发布、已发布、已归档。
- 预览校验：在不同地图 zoom、默认/hover/selected 状态下预览图标效果。
- 批量操作：支持批量导入、批量编辑、批量分配图标。
- 发布流程：支持发布前 diff、发布说明、版本快照、回滚。
- 审计记录：记录谁在什么时间修改了哪些机型代码和图标映射。
- 只管理配置，不抓取第三方动态数据。

本版本不包含：

- 实时航班数据接入。
- 会员账户登录或第三方账户管理。
- 未授权第三方图标资产上传和再分发。
- 飞机实时轨迹编辑。
- 机场、航线、天气图层后台管理。
- 多租户计费、工单系统、复杂审批流。

## 3. 用户角色

| 角色 | 目标 | 权限 |
| --- | --- | --- |
| 管理员 | 管理图标库、发布配置、回滚版本 | 全部权限 |
| 产品/设计人员 | 检查图标视觉、调整机型与图标关系 | 新建、编辑、预览、提交发布 |
| 数据维护人员 | 批量维护 ICAO 机型代码、制造商、机型名 | 新建、编辑、导入、校验 |
| 运营查看人员 | 查看当前已发布映射，不修改 | 只读 |
| 开发/技术人员 | 对接发布后的配置 API 和展示端消费规则 | 只读、导出 |

## 4. 核心对象

### 4.1 Icon Asset

图标库中的一个可用图标。

| 字段 | 说明 |
| --- | --- |
| `iconKey` | 系统内唯一图标键，例如 `lj45`、`a388`、`b738` |
| `displayName` | 后台显示名称 |
| `category` | 图标类别，例如 Business Jet、Widebody、Narrowbody、Regional、Turboprop、Light、Helicopter |
| `sourceMode` | `custom-equivalent-assets` 或 `licensed-assets` |
| `assetPath` | 图标文件路径或资产引用 |
| `viewBox` | SVG viewBox |
| `defaultFill` | 默认填充颜色 |
| `defaultStroke` | 默认描边颜色 |
| `defaultSizeClass` | 默认尺寸分类 |
| `status` | Active、Draft、Archived |
| `licenseRef` | 授权记录引用；自有图标写 owned-custom |
| `checksum` | 资产校验值 |
| `updatedAt` | 最近更新时间 |
| `updatedBy` | 最近更新人 |

### 4.2 Aircraft Type Mapping

机型代码到图标键的映射。

| 字段 | 说明 |
| --- | --- |
| `aircraftTypeCode` | ICAO aircraft type code，例如 `GLF6`、`A388`、`B738` |
| `manufacturer` | 制造商 |
| `modelNames` | 机型名称列表，可支持别名 |
| `aircraftCategory` | Aircraft category，例如 Business Jet、Commercial Jet、Turboprop、Helicopter |
| `sizeClass` | light、midsize、super-midsize、long-range、ultra-long |
| `fr24IconKey` | 显示端使用的图标键 |
| `colorOverride` | 可选颜色覆盖；默认不启用 |
| `status` | Draft、Active、Archived |
| `effectiveFrom` | 生效时间，可选 |
| `effectiveTo` | 失效时间，可选 |
| `notes` | 维护说明 |
| `updatedAt` | 最近更新时间 |
| `updatedBy` | 最近更新人 |

### 4.3 Publish Snapshot

一次发布后的不可变配置快照。

| 字段 | 说明 |
| --- | --- |
| `snapshotId` | 发布快照 ID |
| `version` | 配置版本，例如 `icon-map-2026.07.31-001` |
| `mappingCount` | 映射数量 |
| `iconCount` | 使用到的图标数量 |
| `diffSummary` | 相比上一版本的变化摘要 |
| `publishedBy` | 发布人 |
| `publishedAt` | 发布时间 |
| `rollbackOf` | 如果是回滚版本，记录来源版本 |

## 5. 控制台信息架构

### 5.1 顶层导航

| 模块 | 功能 |
| --- | --- |
| Dashboard | 当前发布版本、映射数量、异常数量、最近修改 |
| Icon Library | 图标库与图标资产管理 |
| Type Mappings | 机型代码映射主工作台 |
| Preview Lab | 图标在地图/背景/缩放级别下的预览 |
| Publish Center | 发布、diff、回滚、版本快照 |
| Audit Log | 操作审计 |
| Settings | 权限、导入导出格式、校验规则 |

### 5.2 默认首页

后台默认进入 Dashboard，不做营销式首页。首屏应展示：

- 当前已发布配置版本。
- Active 映射数量。
- 未识别机型代码数量。
- 使用中的 icon key 数量。
- 最近 10 条修改记录。
- 待发布草稿数量。
- 快捷入口：新增映射、导入 CSV、进入预览、发布中心。

## 6. 核心功能需求

### 6.1 Icon Library

- 以表格 + 图标预览方式展示所有 icon key。
- 支持按 category、sourceMode、status 搜索和过滤。
- 点击图标进入详情侧栏。
- 详情侧栏展示图标预览、默认颜色、viewBox、资产路径、授权说明、checksum、最近修改。
- Active 图标可以被映射使用；Archived 图标不能被新映射使用，但历史快照仍可读取。
- 未授权图标资产不能发布到 Active。

### 6.2 Type Mappings

- 主界面采用密集表格，支持快速扫描和批量编辑。
- 表格列至少包含：type code、manufacturer、model、category、sizeClass、icon key、icon preview、status、updatedAt、updatedBy。
- 支持搜索 type code、manufacturer、model、icon key。
- 支持按 icon key、category、sizeClass、status 过滤。
- 支持新增单条映射。
- 支持编辑现有映射。
- 支持复制一条映射作为新条目。
- 支持批量选择多条 type code 并分配同一个 icon key。
- 支持批量设置 sizeClass。
- 支持将映射归档。
- 支持查看某个 icon key 当前关联的全部 type code。

### 6.3 新增/编辑映射

表单字段：

- Aircraft type code，必填，自动转大写。
- Manufacturer，必填。
- Model names，至少一个。
- Aircraft category，必填。
- Size class，必填。
- Icon key，必填，从 Active 图标库选择。
- Color override，可选，默认关闭。
- Notes，可选。

交互要求：

- 输入 type code 后实时校验是否重复。
- 选择 icon key 后实时显示图标预览。
- 改变 sizeClass 后预览同步更新尺寸。
- 保存为 Draft，不直接影响地图展示。
- 保存后在列表中标记为 Draft 或 Changed。

### 6.4 图标预览

Preview Lab 需要支持：

- 单个 icon key 预览。
- 单个 aircraft type code 预览。
- 批量 type code 对比预览。
- 默认、hover、selected 三种状态。
- zoom `2`、`3`、`4`、`5`、`6`、`7`、`9`、`12` 预览。
- 浅色陆地、蓝绿色海面、深色遮罩三种背景。
- 显示图标外接尺寸、热区尺寸、label 偏移、阴影比例。
- 支持打开一个小地图预览区域，展示图标、标签和航迹线。

### 6.5 校验规则

保存草稿时校验：

- `aircraftTypeCode` 只能包含大写字母和数字，长度建议 2 到 4 位。
- 同一环境中，一个 Active type code 只能对应一个 icon key。
- `fr24IconKey` 必须存在于 Active 图标库。
- `sizeClass` 必须属于允许枚举。
- Manufacturer 和 modelNames 不能为空。
- 归档 icon key 不能被新映射引用。
- 使用 `licensed-assets` 时必须有 `licenseRef`。

发布前额外校验：

- 不允许存在重复 Active type code。
- 不允许存在引用缺失图标的映射。
- 不允许存在未授权资产进入发布快照。
- 至少需要填写发布说明。
- 发布 diff 必须可查看。

### 6.6 导入与导出

导入格式：

- CSV。
- JSON。

CSV 最小字段：

```text
aircraftTypeCode,manufacturer,modelNames,aircraftCategory,sizeClass,fr24IconKey,notes
```

导入流程：

- 上传文件。
- 字段识别。
- 预校验。
- 显示新增、更新、冲突、无效的数量。
- 用户确认后写入 Draft。
- 不允许导入后直接发布。

导出范围：

- 当前 Published 快照。
- 当前 Draft。
- 选中记录。
- 全量映射。

### 6.7 发布与回滚

发布中心展示：

- 当前 Published 版本。
- Draft 与 Published 的差异。
- 新增、修改、归档的记录数量。
- 受影响的 icon key 列表。
- 发布说明输入框。

发布流程：

1. 用户点击准备发布。
2. 系统运行发布前校验。
3. 展示 diff。
4. 用户填写发布说明。
5. 管理员确认发布。
6. 生成 Publish Snapshot。
7. 展示端读取新版本配置。

回滚流程：

- 列出历史快照。
- 用户选择目标快照。
- 系统展示将要回滚的 diff。
- 管理员确认回滚。
- 生成新的 rollback snapshot，不直接覆盖历史记录。

### 6.8 审计记录

Audit Log 至少记录：

- 新增映射。
- 编辑映射。
- 归档映射。
- 导入文件。
- 发布配置。
- 回滚配置。
- 图标资产状态变更。

记录字段：

- 操作类型。
- 操作人。
- 操作时间。
- 对象类型。
- 对象 ID。
- 变更前。
- 变更后。
- 发布版本，若适用。

## 7. 展示端对接需求

1.2 后展示端不应在 `app.js` 中硬编码全部 type code 映射，应该读取发布后的配置。

推荐配置结构：

```json
{
  "version": "icon-map-2026.07.31-001",
  "publishedAt": "2026-07-31T00:00:00Z",
  "iconAssets": {
    "lj45": {
      "assetPath": "assets/aircraft-icons/custom-equivalent/lj45.svg",
      "defaultFill": "#ffd21c",
      "defaultStroke": "rgba(16,16,16,0.86)"
    }
  },
  "typeMappings": {
    "GLF6": {
      "fr24IconKey": "lj45",
      "sizeClass": "ultra-long",
      "manufacturer": "Gulfstream",
      "modelNames": ["Gulfstream G650ER"]
    }
  }
}
```

展示端消费规则：

- 优先按 `aircraftTypeCode` 查找映射。
- 找不到映射时使用后台配置的 fallback icon key。
- 映射配置加载失败时保留前端内置默认配置。
- 发布版本号需要可在调试信息中查看。

## 8. 权限与安全

- 控制后台必须有登录态，但 1.2 需求阶段先定义权限模型，不实现具体账号系统。
- 只读用户不能保存、导入、发布或回滚。
- 编辑用户可以保存 Draft，但不能发布。
- 管理员可以发布和回滚。
- 上传资产必须校验文件类型和授权字段。
- 不允许上传可执行文件。
- 不允许将第三方未授权图标标记为 Active。
- 所有发布和回滚必须进入审计记录。

## 9. 非功能需求

### 9.1 可用性

- 控制后台应该是安静、密集、可扫描的运营工具，不做营销页。
- 表格支持固定表头、列宽调整、批量选择。
- 关键操作有明确确认，不使用弹窗堆叠。
- 错误提示要指出具体字段和修复建议。

### 9.2 性能

- 支持至少 10,000 条 type code 映射。
- 搜索和过滤响应目标低于 300ms。
- 批量导入 5,000 条记录时预校验目标低于 5s。
- 图标预览应懒加载，避免一次渲染过多 SVG。

### 9.3 可靠性

- 发布配置必须生成不可变快照。
- 展示端读取配置失败时不能阻塞地图。
- 回滚不能删除历史版本。
- Draft 自动保存，防止误关页面丢失编辑。

### 9.4 兼容性

- 桌面优先，支持 Chrome 和 Safari。
- 移动端只要求可查看，不要求完整批量编辑体验。

## 10. 验收标准

1. 后台可以展示所有 icon key，并看到图标预览。
2. 后台可以新增、编辑、归档 type code 到 icon key 的映射。
3. 后台可以批量导入 CSV，并展示新增、更新、冲突和无效记录。
4. 同一个 Active type code 不能重复映射到多个 icon key。
5. 未授权或归档图标不能被发布使用。
6. Preview Lab 可以查看不同 zoom、状态和背景下的图标效果。
7. 发布前必须展示 Draft 与 Published 的 diff。
8. 发布后生成不可变快照。
9. 可以回滚到历史快照，并生成新的 rollback snapshot。
10. 所有新增、编辑、发布、回滚操作都进入审计记录。
11. 展示端可以读取发布后的映射配置。
12. 展示端配置读取失败时仍可使用内置默认映射正常显示地图。

## 11. 1.2 分阶段建议

### 1.2.0 控制台原型

- 本地 JSON 作为配置源。
- 完成 Icon Library、Type Mappings、Preview Lab 的前端原型。
- 支持手工新增/编辑映射。
- 支持本地导入导出 JSON。
- 暂不实现真实登录、服务端发布和审计持久化。

### 1.2.1 后台配置服务

- 增加配置 API。
- 增加发布快照。
- 增加回滚。
- 展示端读取发布配置。

### 1.2.2 权限与审计

- 增加用户权限。
- 增加审计日志。
- 增加 CSV 批量导入和冲突处理。

## 12. 待确认问题

1. 1.2.0 是否先做纯前端本地原型，还是直接接入后端配置服务？
2. 控制后台是否继续放在同一个网站内，还是单独路径，例如 `/admin`？
3. 是否允许在 1.2 中管理图标颜色，还是只管理 type code 与 icon key 的对应关系？
4. 机型代码来源是否以后由自有数据库同步，还是人工维护为主？
5. 发布是否需要双人审批，还是管理员单人确认即可？
