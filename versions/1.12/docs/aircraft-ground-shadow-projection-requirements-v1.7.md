# Aircraft Ground Shadow Projection Requirements 1.7

> **1.7.2 决策变更（2026-08-03）：飞机地面投影已取消。** 当前地图只绘制飞机 icon，不创建 Google 投影 Overlay、Leaflet 投影 Pane 或投影 marker，也不再向用户提供投影开关。本文其余投影算法与视觉条款仅作为历史方案保留，不再作为当前验收标准。飞机 icon 的亮黄色机身和深色轮廓继续保留。

## 1. 文档定位

本文档定义 `Global BizJet Ops 1.7` 的飞机阴影绘制策略。1.7 不再在飞机 icon 周身绘制椭圆阴影、外发光或 CSS `drop-shadow`，改为把飞机阴影作为独立的“地面投影”绘制在地图对应位置，以明确区分空中的飞机和地面的阴影。

版本关系：

- 本文覆盖 `docs/fr24-icon-interaction-spec-v1.1.md` 中“局部椭圆阴影 + drop-shadow”“hover 阴影增强”“selected 红色外发光”等飞机 marker 规范。
- 本文不修改机场 pin、航线端点、面板、按钮、文字等其他元素的阴影规范。
- 本文不改变 1.6 已确定的 selected 航迹、高度色阶、Route 聚焦、标签和详情面板规则。

### 1.1 1.7.1 可见性修订（2026-08-03）

根据实际界面验收反馈，初版“仅 `0-500m AGL`、zoom `>=5` 才显示”的规则会导致全球实时地图长期没有任何可见投影。1.7.1 采用双模式，并覆盖本文后续章节中与之冲突的显隐条款：

- `physical`：zoom `>=6.5`、AGL `0-500m`、太阳位置有效时，继续使用真实太阳方向和地图地面落点。
- `visual`：巡航、AGL 缺失、夜间、低 zoom 或真实落点在当前比例尺不可读时，使用固定中性虚拟光源和 `4-8px` 目标分离度换算为地图距离，绘制独立地图坐标投影。
- zoom `>=2` 的空中飞机均可进入投影候选；`onGround`、expired、无效坐标、用户关闭和密度淘汰仍不显示。
- 真实太阳投影在当前比例尺上的最大分离度限制为 `10px`，避免阴影离开机身过远而干扰实时位置判断。
- 投影只跟随已经生成、资源加载成功且图形与地图可视区相交的飞机 icon；缓冲区中未露出的飞机、图片加载失败的飞机和已移除的 marker 不得单独露出投影。
- `visual` 是地图符号的深度提示，不是可测量的真实地面阴影位置；不得用于导航或高度判断。
- 两种模式都使用飞机轮廓、中性黑灰色、独立无交互图层，不恢复 icon 周身椭圆阴影或彩色 glow。
- 飞机主体使用更亮的黄色和更深的轮廓边缘，以提高与地图、投影的层级对比；该轮廓不得实现为 icon 周身阴影。

观察日期：2026-08-03。
参考范围：Flightradar24 官方 Enhanced 3D 阴影说明、FR24 WebGL 地图渲染说明，以及当前项目飞机 marker 实现。
重要限制：FR24 官方公开资料说明了 Enhanced 3D 的飞机阴影机制，但没有公开二维主地图的具体阴影算法。本文只借鉴公开的产品语义和视觉原则，不声称复刻 FR24 私有算法，不复制第三方代码、模型、图标或专有资源。

参考来源：

- [Flightradar24：Introducing Enhanced 3D View](https://www.flightradar24.com/blog/inside-flightradar24/introducing-enhanced-3d-view-on-flightradar24/)
- [Flightradar24：Supercharging Flightradar24's data display](https://www.flightradar24.com/blog/inside-flightradar24/supercharging-flightradar24s-data-display/)
- 当前项目：`docs/fr24-icon-interaction-spec-v1.1.md`
- 当前项目：`docs/aircraft-loading-refresh-requirements-v1.4.md`
- 当前项目：`docs/selected-aircraft-route-visual-requirements-v1.6.md`
- 当前实现：`app.js`、`styles.css`

## 2. 背景与问题

### 2.1 当前实现

当前飞机 marker 同时使用了两类贴身阴影：

1. `aircraftSvg()` 在飞机节点内输出 `.aircraft-map-shadow`，通过椭圆径向渐变和 blur 形成飞机下方的局部暗斑。
2. SVG/PNG 飞机图形使用多层 `drop-shadow`；hover、selected、alert、stale 状态还会改变阴影或增加黄/红色外发光。

这套策略存在以下问题：

- 阴影紧贴 icon 周身，更像发光、描边或悬浮按钮阴影，而不是投射到地面的飞机影子。
- 椭圆暗斑无法表达飞机轮廓、太阳方向、离地高度和地面位置。
- selected/alert 的彩色外发光会污染航迹、标签和状态色的视觉层级。
- 多架飞机密集显示时，多层 blur 与 drop-shadow 会形成脏边，并增加 DOM/CSS 滤镜开销。
- 阴影和飞机共用同一个 marker 层级，无法稳定保证“阴影在所有飞机下方、飞机在所有阴影上方”。

### 2.2 1.7 目标效果

1.7 将飞机 icon 和地面投影拆成两个独立视觉对象：

- 飞机 icon 表示实时空中位置、机型轮廓、航向和业务状态。
- 地面投影表示低空飞机在地面的阴影位置、方向和软硬程度。
- 两者使用不同地图层级、不同交互规则和不同更新条件。
- 飞机 icon 本身只保留轮廓描边，不再使用任何周身阴影或彩色外发光。

## 3. FR24 参考结论与采用边界

### 3.1 官方可确认结论

Flightradar24 官方 Enhanced 3D 说明明确：

- 飞机下降到约 `500 m` 后可以看到飞机阴影。
- 阴影受当时的真实太阳位置和飞机位置影响。
- 飞机继续下降时，阴影会逐渐接近并增强与飞机的空间联系。
- 3D 阴影可以由用户关闭，原因之一是该能力具有额外渲染成本。

FR24 官方另行说明，其网页端已使用 WebGL 批量渲染大量飞机 icon 和航迹，以提升移动、缩放及高密度显示性能。

### 3.2 本项目采用的原则

1.7 借鉴以下原则：

1. 阴影只表达“地面投影”，不承担 selected、hover 或 alert 状态表达。
2. 阴影方向由太阳方位决定，不随飞机航向任意偏移。
3. 地面投影仅在低空、数据可信且有日照时显示。
4. 投影必须作为地图图层渲染，不能继续伪装成 icon 内的局部光效。
5. 高密度场景应优先批量绘制，避免为每架飞机叠加多层 CSS filter。

### 3.3 明确不采用的推测

- 不假设 FR24 二维主地图使用与 3D 完全相同的算法。
- 不把 FR24 截图中的抗锯齿、模型光照或压缩效果反推为固定 CSS 参数。
- 不调用、抓取或依赖 FR24 私有接口、太阳数据、模型或阴影纹理。
- 不在巡航高度绘制象征性远距离黑影；这会造成地面位置误读，也无法保持合理比例。

## 4. 产品目标与非目标

### 4.1 产品目标

- 完全移除飞机 icon 周身的椭圆阴影、暗色 drop-shadow 和彩色 glow。
- 使用飞机俯视轮廓生成独立地面投影。
- 优先使用飞机 AGL、经纬度、时间和太阳位置计算投影方向及地面落点。
- 仅在 `0-500 m AGL` 的低空阶段显示地面投影。
- 投影在 Google Maps 与 fallback 地图中均锁定地图坐标，平移、缩放时不漂移。
- 投影不响应鼠标、不参与碰撞、不改变飞机点击热区。
- selected、hover、alert、stale 状态下仍保持投影为中性黑灰色。
- 保证 1.6 航迹、标签、Route 模式和详情面板行为不回归。

### 4.2 非目标

- 不建设完整的三维飞机、地形和光照系统。
- 不模拟云层遮挡、机身姿态、地形起伏或建筑物受影。
- 不承诺阴影轮廓具有真实机身米制尺寸。
- 不将阴影落点作为导航、空管或安全决策数据。
- 不改造机场、端点、面板、按钮或文字阴影。
- 不增加新的远程接口请求。

## 5. 核心术语

| 术语 | 定义 |
| --- | --- |
| Aircraft icon | 地图上代表飞机当前位置和航向的交互 marker |
| Ground projection | 独立绘制在地图地面层的飞机阴影轮廓 |
| Edge keyline | 用于保证 icon 在浅色/深色底图上可读的细描边，不属于阴影 |
| AGL | 飞机相对地面的高度 Above Ground Level |
| MSL | 飞机相对平均海平面的高度 Mean Sea Level |
| Sun azimuth | 太阳方位角，按正北 `0°`、顺时针增加 |
| Sun elevation | 太阳高度角，地平线为 `0°` |
| Shadow bearing | 地面阴影延伸方向，等于太阳方位角反向 `180°` |
| Projection anchor | 根据飞机位置、阴影方向和距离算出的阴影地图坐标 |

命名约束：代码、文档和埋点统一使用 `groundProjection` 或 `aircraftGroundShadow`；不要继续用含义模糊的 `mapShadow` 表示飞机阴影。

## 6. 总体视觉结构

### 6.1 图层顺序

从底到顶：

1. 地图底图与底图遮罩。
2. 天气、云图、雷达等覆盖层。
3. `aircraft-ground-projection-layer`。
4. 普通航迹。
5. selected 航迹 halo/core。
6. 机场 marker 与 route endpoint。
7. 普通飞机 marker。
8. selected/alert 飞机 marker。
9. 飞机/机场标签。
10. 详情面板和其他 UI。

硬性要求：任何飞机 icon、航迹和 route endpoint 都必须显示在飞机地面投影之上，不能因为单个 marker 的 z-index 形成“某架飞机或 selected 航迹被另一架飞机的影子盖住”的情况。

### 6.2 飞机 icon

- 保持俯视飞机轮廓、现有尺寸矩阵和航向旋转。
- 默认色、selected 色、alert 色和 stale 色继续由飞机主体表达。
- SVG 使用 `1-1.25px` 深色 `stroke` 作为 edge keyline。
- PNG/WebP 必须提供带独立深色轮廓的自有资源，或使用 mask/outline 生成边缘；不能使用 `drop-shadow` 模拟描边。
- CSS `filter` 中禁止包含飞机 marker 的 `drop-shadow()`、彩色 glow 或 blur。
- hover 不增强阴影；可通过亮度、尺寸 `1.02-1.04` 或标签显隐表达。
- selected 不增加红色外发光；继续使用主体颜色、浅色描边、尺寸和 z-index 表达。

### 6.3 地面投影

- 使用与飞机 icon 同类的俯视轮廓，不使用椭圆或圆形暗斑。
- 保留飞机航向，使阴影中的机头、机翼方向与飞机 icon 一致。
- 投影延伸方向只由太阳方位决定，与飞机航向无关。
- 颜色固定为中性黑灰，不染成黄、红、粉、蓝等业务状态色。
- 轮廓可做轻微透视压缩和模糊，但不能形成环形光晕。
- 投影中心位于计算得到的地面坐标，不与飞机 icon 共用同一屏幕锚点。
- 投影必须完整设置 `pointer-events: none` 和 `aria-hidden: true`。

## 7. 显示条件

### 7.1 必须同时满足

地面投影仅在以下条件全部成立时显示：

- 飞机存在有效经纬度和时间戳。
- `onGround !== true`，或飞机仍具有大于最小阈值的可信 AGL。
- 可以得到可信的 `altitudeAglM`，且 `0 < altitudeAglM <= 500`。
- 太阳高度角 `sunElevationDeg >= 5°`。
- 当前 zoom 与渲染密度允许显示投影。
- 数据没有进入 expired/removed 状态。

### 7.2 不显示场景

- AGL 高于 `500 m`。
- 只有 MSL 且无法获得可靠地面/机场标高。
- 夜间、太阳位于地平线下或太阳高度角低于 `5°`。
- 定位、高度或时间数据无效。
- 全球低 zoom、高密度保护触发或用户关闭投影。
- 飞机已过期并开始退场。

### 7.3 地面状态

- `onGround === true` 时不绘制分离的地面投影，避免把地面滑行飞机绘制成两个目标。
- 若产品后续需要地面接触阴影，应另定义 `contactShadow`，其最大偏移不超过 `1px`；不属于本次 1.7 范围。

## 8. 高度数据规则

### 8.1 AGL 优先级

按以下顺序确定 `altitudeAglM`：

1. 数据源直接提供的可信 `altitudeAglFt/M`。
2. 雷达高度或 radio altitude。
3. `baroAltitudeM - terrainElevationM`。
4. 位于终端机场范围内时，`baroAltitudeM - airportElevationM`。

禁止直接把 MSL 当成 AGL。若只能获得 MSL 且无法得到可信地面标高，则不显示投影，不回退到 icon 周身装饰阴影。

### 8.2 高度有效性

- AGL 小于 `-15 m` 或大于 `20,000 m` 视为异常值。
- 计算后 AGL 在 `-15-0 m` 范围内可钳制为 `0 m`。
- 单次高度跳变超过 `120 m/3s` 且垂直速度不支持该变化时，不立即更新投影。
- AGL 使用 `600-1,000ms` 低通插值，避免投影落点来回跳动。
- 高度数据进入 stale 状态后，投影继续跟随现有退场策略淡出，不重新推算高度。

## 9. 太阳位置与地面落点

### 9.1 太阳位置

客户端根据以下数据计算太阳位置：

- 飞机最新 `latitude`、`longitude`。
- 对应定位点的 UTC `timestamp`，不能直接使用渲染帧本地时间。

允许采用公开、可审计的太阳位置算法在客户端计算；1.7 不为此新增网络请求。计算模块必须输出：

```js
{
  azimuthDeg,
  elevationDeg,
  calculatedAt,
  source: "client-solar-position"
}
```

### 9.2 阴影方向

```text
shadowBearingDeg = normalize360(sunAzimuthDeg + 180)
```

要求：

- 地图朝北时，阴影方向必须与地理方位一致。
- 地图 bearing 改变时，不重新定义光源；投影仍锁定地理坐标，由地图引擎完成屏幕旋转。
- 飞机改变 heading 时只旋转投影轮廓，不改变太阳决定的落点方向。

### 9.3 阴影距离

理论水平距离：

```text
rawDistanceM = altitudeAglM / tan(sunElevationRad)
```

产品限制：

```text
shadowDistanceM = clamp(rawDistanceM, 0, 1500)
```

- `sunElevationDeg < 5°` 时直接隐藏，不使用极长阴影。
- 距离达到 `1500 m` 上限时，投影透明度额外降低 `25%`，表示结果已进入视觉钳制区。
- 该距离只用于视觉地面投影，界面不得显示为测量数据。

### 9.4 地图坐标

以飞机经纬度为起点，沿 `shadowBearingDeg` 前进 `shadowDistanceM`，得到 `projectionLat/Lng`。

```js
{
  aircraftLat,
  aircraftLng,
  projectionLat,
  projectionLng,
  shadowBearingDeg,
  shadowDistanceM,
  clamped
}
```

禁止只通过 `transform: translate(px)` 偏移飞机节点来模拟地面落点。纯像素偏移在地图缩放后会改变地理距离，不符合“投射在地图上”的要求。

## 10. 视觉 Token

### 10.1 地面投影 Token

| Token | 默认值 | 说明 |
| --- | --- | --- |
| `projectionColor` | `#071018` | 中性近黑色，不承载状态 |
| `projectionOpacityNear` | `0.30` | 低 AGL、靠近飞机时 |
| `projectionOpacityFar` | `0.12` | 接近 500m AGL 或距离钳制时 |
| `projectionScaleXNear` | `0.92` | 近地面轮廓横向比例 |
| `projectionScaleXFar` | `0.78` | 距离增加时轻微压缩 |
| `projectionScaleYNear` | `0.76` | 近地面纵向透视压缩 |
| `projectionScaleYFar` | `0.62` | 远端进一步压缩 |
| `projectionBlurNear` | `0.6px` | 低空较清晰 |
| `projectionBlurFar` | `2.4px` | 高度增加后更柔和 |
| `projectionSizeRatio` | `0.82` | 相对当前飞机 icon 的屏幕尺寸 |
| `projectionTransition` | `180-260ms linear` | 参数插值，不包括数据刷新周期 |

所有数值均为 1.7 的首轮校准值，应通过实机截图和性能测试调整，但不得突破本规范中的语义与层级边界。

### 10.2 高度插值

```text
heightRatio = clamp(altitudeAglM / 500, 0, 1)
opacity     = lerp(0.30, 0.12, heightRatio)
blurPx      = lerp(0.6, 2.4, heightRatio)
scaleX      = lerp(0.92, 0.78, heightRatio)
scaleY      = lerp(0.76, 0.62, heightRatio)
```

解释：高度增加时，阴影离飞机更远、更软、更淡；飞机下降时，阴影逐渐接近、更清晰，但不会出现彩色 glow。

## 11. Zoom 与密度规则

| 地图 zoom | 投影规则 |
| --- | --- |
| `< 5.0` | 默认隐藏全部地面投影 |
| `5.0-6.4` | 仅显示 selected/alert 且 AGL 有效的低空飞机投影 |
| `6.5-8.4` | 显示优先级较高、处于终端区的低空飞机投影 |
| `>= 8.5` | 显示所有满足条件的低空飞机投影 |

密度保护：

- viewport 内候选投影超过 `250` 个时，只显示 selected、alert 和距离视图中心较近的前 `250` 个。
- 候选投影超过 `120` 个时，禁止使用每节点实时多级 blur；使用离散的 `near/mid/far` 三档预模糊轮廓或 Canvas/WebGL 批量绘制。
- 被密度策略隐藏时只隐藏投影，不隐藏飞机 icon。
- Route 聚焦状态沿用同一规则；selected 飞机投影始终具有最高保留优先级。

## 12. 交互与状态矩阵

| 状态 | 飞机 icon | 地面投影 |
| --- | --- | --- |
| Default | 黄色主体 + 深色 edge keyline | 中性黑灰，按太阳/AGL 计算 |
| Hover | 轻微提亮/放大，标签显示 | 不提亮、不放大、不改变透明度 |
| Selected | 红/粉主体 + 浅色 keyline，提高 z-index | 保持中性黑灰，只提高保留优先级 |
| Alert | alert 主体色或其他非阴影反馈 | 保持中性黑灰，不出现红色 glow |
| Aging | icon/label 按 1.5 降低透明度 | 同步降低至正常值的 `80%` |
| Stale | icon 灰化/降低透明度 | 同步降低至正常值的 `55%` |
| Expired | 按 1.5 淡出 | 同步淡出并移除 |
| On ground | 地面飞机 marker | 不显示分离投影 |
| Altitude unknown | 正常飞机 marker | 不显示，不使用装饰性 fallback |
| Night | 正常飞机 marker | 不显示 |

### 12.1 点击与辅助功能

- 地面投影不能注册 click、hover、focus、tooltip 或 context menu。
- 用户点击投影位置时，按地图原行为处理；投影不扩大飞机点击热区。
- 屏幕阅读器只读飞机 icon/label，不朗读阴影。
- 阴影不是高度的唯一表达；高度仍由详情面板、标签或航迹色阶提供。

### 12.2 用户设置

地图设置新增：

```text
飞机地面投影 [开/关]
```

- 默认开启。
- 用户设置持久化到现有地图偏好存储。
- 关闭后立即移除 projection layer 的绘制内容，不影响飞机 marker。
- 系统处于低性能降级模式时可以自动关闭，并在设置中显示降级原因。

## 13. 动画与刷新

- 飞机位置与地面投影使用同一定位点和同一插值进度。
- 每次 `2-3s` 数据刷新后，飞机和投影同时更新目标坐标。
- 投影不得比飞机晚一帧创建或明显拖尾。
- 太阳位置不需要逐帧重算；同一飞机每 `30s` 或经纬度移动超过 `5km` 时重算即可。
- AGL、太阳角度、地面落点变化应进行数值插值，禁止重新插入 DOM 节点造成闪烁。
- 地图 pan/zoom/rotate 时，投影由地图投影系统同步变换，不能通过独立定时器追赶。
- `prefers-reduced-motion: reduce` 下取消额外缓动，但仍保持坐标同步。

## 14. 数据模型

建议扩展飞机渲染模型：

```js
{
  altitudeMslFt,
  altitudeAglFt,
  radioAltitudeFt,
  terrainElevationFt,
  airportElevationFt,
  altitudeSource,
  altitudeQuality,
  onGround,
  positionTimestamp,
  heading,
  groundProjection: {
    visible,
    projectionLat,
    projectionLng,
    shadowBearingDeg,
    shadowDistanceM,
    sunAzimuthDeg,
    sunElevationDeg,
    opacity,
    blurPx,
    scaleX,
    scaleY,
    clamped,
    hiddenReason
  }
}
```

`hiddenReason` 建议枚举：

```text
disabled
on-ground
altitude-unavailable
above-threshold
night
low-sun
low-zoom
density-limit
stale
invalid-position
```

要求：

- 渲染层只消费整理后的 `groundProjection`，不要在 CSS 或 marker 模板里重复推导业务规则。
- 不得为了投影功能调用 `513012` 或任何新的第三方飞机接口。
- 地形/机场标高应来自项目既有数据或未来自有数据库；无数据时宁可隐藏投影。

## 15. 技术实现建议

### 15.1 推荐架构

将投影计算和绘制拆分：

```text
Aircraft data
  -> AGL resolver
  -> Solar position calculator
  -> Ground destination calculator
  -> Projection render model
  -> Dedicated projection layer
```

模块职责：

- `AGL resolver`：确定 AGL 来源、质量与可用性。
- `Solar position calculator`：根据经纬度和 UTC 时间计算太阳方位/高度。
- `Ground destination calculator`：计算阴影地面坐标并执行距离钳制。
- `Projection render model`：生成显隐、透明度、模糊、缩放和状态值。
- `Dedicated projection layer`：只负责批量绘制，不承载交互。

### 15.2 Google Maps

优先方案：

- 使用单独的 `OverlayView` Canvas/WebGL 图层或等价自定义 overlay 绘制所有投影。
- 每个投影使用 `projectionLat/Lng` 转为像素位置。
- 所有投影统一在飞机 marker 层下方渲染。
- 只更新发生变化的实例数据，避免全量 DOM 重建。

可接受的首期过渡方案：

- 为投影创建独立 marker，使用独立、统一且低于所有飞机的 z-index。
- 投影 marker 的地图坐标必须是 `projectionLat/Lng`，不能与飞机坐标相同后再 CSS 偏移。
- 投影 content 必须无事件、无 label、无碰撞占位。

不推荐：继续把投影作为 `.aircraft-marker-shell` 的子元素。该方案无法跨 marker 稳定控制所有阴影和所有飞机的层级关系。

### 15.3 Fallback 地图

- 新增独立 `#aircraftGroundProjectionLayer`。
- 该层位于天气覆盖层之上、所有航迹及 marker 之下。
- 使用 fallback map 的 `project([lat, lng])` 计算投影位置。
- resize、pan、zoom 时与现有飞机层使用同一渲染周期。

### 15.4 轮廓资产

- 地面投影优先复用项目自有 SVG path 或 mask，不复制 FR24 资产。
- 同一 `aircraftIconKey` 对应同一轮廓族。
- 可提供 `near/mid/far` 三档预模糊纹理，减少实时 filter 成本。
- 阴影轮廓不需要机身涂装、舷窗、标志或内部细节。

## 16. 当前代码迁移范围

### 16.1 `styles.css`

需要移除或改造：

- `.aircraft-map-shadow` 椭圆径向渐变。
- 飞机 SVG/PNG 的所有 `drop-shadow()`。
- hover 的阴影增强。
- selected 的红/粉色 glow 和 enlarged shadow。
- alert/stale 中依赖 drop-shadow 的状态表达。

需要保留：

- SVG `stroke`/PNG keyline。
- 飞机主体颜色、尺寸、旋转和过渡。
- 机场 `.airport-map-shadow`、route endpoint 阴影及非飞机 UI 阴影。

### 16.2 `app.js`

需要移除或替换：

- `aircraftMarkerMetrics()` 中 `shadowSize`、`shadowHeight`。
- `aircraftMarkerCssVars()` 与 `applyAircraftMarkerStyle()` 中 `--aircraft-shadow-*`、`--aircraft-glow`、`--aircraft-hover-glow`。
- `aircraftSvg()` 内嵌的 `.aircraft-map-shadow`。

需要新增：

- AGL 解析与质量判断。
- 太阳位置、阴影方位、阴影距离和目标经纬度计算。
- 独立 projection render model。
- Google Maps/fallback 独立投影图层。
- 投影开关和降级状态。

## 17. 性能要求

- 投影功能不得增加任何远程请求。
- 1000 架飞机的普通地图刷新不能为每架飞机执行同步 DOM layout read。
- 太阳位置计算需要缓存，不能每动画帧执行。
- 同屏 `250` 个投影时，桌面中档设备地图拖动目标 `>= 45fps`；P95 单帧 JS + render 提交目标 `< 20ms`。
- 移动端同屏 `120` 个投影时，目标 `>= 30fps`。
- projection layer 的内存占用随可见候选数线性增长，飞机离开缓存后必须释放实例。
- 低性能设备、WebGL 不可用或 `saveData` 开启时，可自动进入三档纹理/Canvas/隐藏投影的降级路径。
- 性能降级只能移除投影，不能导致飞机 marker、航迹或标签消失。

## 18. 验收标准

### 18.1 视觉验收

- [ ] 默认、hover、selected、alert、stale 状态的飞机 icon 周身均不存在椭圆阴影。
- [ ] 飞机 SVG/PNG 不再出现黄、红、粉色外发光。
- [ ] 飞机 icon 仍通过 edge keyline 在浅色陆地、海面和深色底图上清晰可读。
- [ ] 地面投影使用可辨识的飞机俯视轮廓，不是椭圆暗斑。
- [ ] 投影始终为中性黑灰色，不随 selected/alert 改色。
- [ ] 低空飞机下降时，投影逐渐接近、变清晰；爬升时相反。
- [ ] 多架飞机重叠时，所有投影都位于所有飞机主体下方。

### 18.2 物理语义验收

- [ ] `AGL > 500m` 时不显示投影。
- [ ] `sunElevation < 5°` 或夜间不显示投影。
- [ ] 阴影方位与太阳方位相反，误差不超过 `±2°`。
- [ ] 投影地图坐标由 bearing + distance 计算，不是固定像素偏移。
- [ ] heading 改变时轮廓同步旋转，但地面落点方向仍由太阳决定。
- [ ] 只有 MSL、无法获得地面标高时不显示投影。
- [ ] `onGround === true` 时不显示分离投影。

### 18.3 地图行为验收

- [ ] 连续 pan、zoom、resize 时，投影与地图坐标锁定，无漂移和追赶。
- [ ] 地图 bearing 改变时，投影地理位置正确。
- [ ] 点击投影不会选中飞机，也不会触发 tooltip。
- [ ] selected 航迹、高度色阶、Route fit bounds 和端点层级不回归。
- [ ] Google Maps 与 fallback 地图遵守相同显隐规则。
- [ ] 关闭“飞机地面投影”后立即清空投影，不影响飞机 icon。

### 18.4 数据与性能验收

- [ ] 投影功能不产生新的网络请求，不请求 `513012`。
- [ ] 高度异常或缺失不会回退成 icon 周身阴影。
- [ ] `2-3s` 数据刷新时，飞机与投影同步更新，无明显晚一帧或闪烁。
- [ ] 同屏 250 个投影满足桌面性能目标。
- [ ] 密度降级时只减少投影，不丢失飞机、航迹和标签。

## 19. 测试矩阵

### 19.1 高度

至少测试：

```text
onGround, 10m, 50m, 100m, 250m, 499m, 500m, 501m, unknown AGL
```

### 19.2 太阳高度

至少测试：

```text
-5°, 0°, 4.9°, 5°, 10°, 30°, 60°, 85°
```

### 19.3 方位与航向

- 太阳方位：`0° / 90° / 180° / 270°`。
- 飞机 heading：`0° / 45° / 90° / 180° / 270° / 359°`。
- 验证太阳方位与 heading 相互独立。

### 19.4 地图与状态

- Zoom：`4.9 / 5.0 / 6.5 / 8.5 / 10.5`。
- 地图 bearing：`0° / 45° / 180°`。
- 状态：default / hover / selected / alert / aging / stale / expired。
- 地图：Google Maps / fallback。
- 设备：桌面宽屏 / 13 寸笔记本 / iPhone 尺寸 / Android 中档设备。

### 19.5 回归

- 1.5 数据停止请求及缓存保留规则。
- 1.6 selected 航迹、高度色阶、Route 聚焦、端点和图例。
- 飞机标签碰撞与 selected 标签常显。
- 机场 marker 与机场阴影。
- 地图主题和浅/深色底图对比。

## 20. 实施顺序

### Phase 1：去除 icon 周身阴影

- 删除飞机椭圆阴影和所有飞机 drop-shadow/glow。
- 补齐 SVG/PNG edge keyline。
- 完成 default/hover/selected/alert/stale 状态回归。

### Phase 2：建立投影模型

- 接入 AGL resolver。
- 实现太阳位置、阴影方位、距离及地面坐标计算。
- 输出统一 `groundProjection` render model 和 hidden reason。

### Phase 3：独立地图图层

- Google Maps 建立 projection overlay。
- Fallback 建立 projection layer。
- 接入缩放、密度、设置、刷新和退场策略。

### Phase 4：校准与验收

- 在机场进近、起飞、低空盘旋场景完成截图对比。
- 完成夜间、低太阳角、AGL 缺失和密度降级测试。
- 完成 250 个投影的性能验收。
- 确认 1.5/1.6 功能无回归后发布 1.7。

## 21. 1.7 最终决策摘要

1. 飞机 icon 不再绘制任何周身阴影、椭圆暗斑或彩色 glow，只保留轮廓描边。
2. 飞机阴影变为独立、无交互、地图坐标锁定的地面投影层。
3. 投影方向使用真实太阳方位，落点使用 AGL 和太阳高度角计算。
4. 仅在 `0-500m AGL`、白天且数据可信时显示；巡航、夜间和高度未知时隐藏。
5. 投影不表达 selected、hover、alert 等业务状态，始终使用中性黑灰。
6. Google Maps 与 fallback 均不得使用 icon 内 CSS 像素偏移冒充地图投影。
7. 1.7 不增加网络请求，不请求 `513012`，优先使用独立 Canvas/WebGL/overlay 批量渲染。
