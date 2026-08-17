# iPad 与桌面端地图加载及信息面板性能优化需求文档 1.19

## 1. 文档定位

本文档用于定义 iPad 浏览器与桌面浏览器中地图加载、地图交互、选中详情面板滚动和响应式布局的优化方案。

建议归属版本：`1.19`。

形成日期：2026-08-12。

本文档只沉淀需求和实施方案，不直接修改运行版本。

## 2. 当前问题

当前版本在桌面端可用，但在 iPad 浏览器中存在明显体验问题：

- 左侧选中信息面板滑动效率差，滚动存在卡顿、回弹、误触地图、滚动链路不清晰的问题。
- 右侧地图视图在 iPad 上渲染效率不高，机场、飞机、航迹、标签同时刷新时容易出现拖拽和缩放卡顿。
- 当前响应式断点主要为 `980px / 767px / 640px`，缺少 iPad 竖屏和横屏的独立策略。
- iPad 竖屏宽度常见为 `768 / 810 / 820 / 834px`，目前不会进入手机底部抽屉规则，仍使用近似桌面的左侧浮层，遮挡地图且滚动体验不佳。
- iPad 横屏常见宽度接近桌面，容易启用较重的桌面布局和地图渲染策略。
- 桌面端与 Pad 端没有区分 `pointer: fine` 与 `pointer: coarse`，hover、浮窗、滚动和点击命中策略混在一起。

## 3. 优化目标

### 3.1 用户体验目标

- iPad 上打开地图后，首屏地图应快速可见，飞机 icon 优先可交互。
- 左侧/底部信息面板在 iPad 上滚动顺滑，手指滑动只滚动面板，不误触地图。
- 地图拖拽、双指缩放、点选飞机时不因详情面板存在而明显变慢。
- iPad 竖屏和横屏都能清楚看到地图主体，不被固定宽度面板过度遮挡。
- 桌面端保留当前信息密度和工作台式布局，不被 Pad 优化降级。

### 3.2 工程目标

- 使用设备能力和输入方式判断布局，而不是只依赖屏幕宽度。
- 将面板滚动、地图手势、marker 渲染、数据刷新拆成可控链路。
- 地图交互过程中降低非关键渲染，地图 idle 后再补齐完整细节。
- 保留 1.16 地图层级规则、1.18 机场密度规则和现有 selected aircraft 逻辑。

## 4. 设备分层

### 4.1 设备 Profile

前端应在运行时得到 `layoutProfile`：

| Profile | 判断条件 | 典型设备 | 布局语义 |
| --- | --- | --- | --- |
| `desktop` | `min-width >= 1200px` 且 `pointer: fine` | 桌面浏览器、大屏笔记本 | 完整桌面工作台 |
| `desktop-compact` | `981-1199px` 且 `pointer: fine` | 小屏笔记本、窄窗口 | 紧凑桌面 |
| `tablet-landscape` | `pointer: coarse` 且横屏，宽度 `900-1199px` | iPad 横屏 | 左侧轻量面板 + 地图优先 |
| `tablet-portrait` | `pointer: coarse` 且宽度 `768-980px` | iPad 竖屏 | 底部抽屉 + 地图优先 |
| `mobile` | `width <= 767px` | 手机 | 当前底部抽屉策略升级 |

判断优先级：

1. `pointer: coarse` / `hover: none`
2. 屏幕方向
3. CSS viewport 宽度
4. 设备像素比只作为辅助，不作为主判断

### 4.2 iPad 兼容边界

iPad Safari 需要兼容：

- `100vh` 在地址栏收起/展开时高度不稳定，应优先使用 `100dvh`。
- 底部安全区使用 `env(safe-area-inset-bottom)`。
- 滚动容器使用 `-webkit-overflow-scrolling: touch`。
- 避免多层嵌套滚动导致惯性滚动失效。
- 避免在手势滚动期间同步触发大量 DOM 更新。

## 5. 响应式布局方案

### 5.1 桌面端 `desktop`

适用：宽屏电脑、鼠标/触控板。

布局规则：

- 详情面板保持左侧窄面板，宽度 `380-420px`。
- 右侧运行 rail 可继续显示。
- 搜索、工具栏、图例维持当前桌面布局。
- hover popup、机场 hover、图表 hover 保留。
- 地图 marker 使用完整桌面密度预算。

目标：

- 保持工作台信息密度。
- 不因为 iPad 优化牺牲桌面端效率和可读性。

### 5.2 紧凑桌面 `desktop-compact`

适用：小屏笔记本或桌面窄窗口。

布局规则：

- 隐藏右侧 rail。
- 左侧详情面板宽度控制为 `360px` 或 `min(380px, 42vw)`。
- 地图控件向右下角收拢，避免与面板重叠。
- 搜索框宽度不超过剩余地图宽度。

目标：

- 仍保持左侧面板，不改成底部抽屉。
- 鼠标 hover 行为保留。

### 5.3 iPad 横屏 `tablet-landscape`

适用：iPad 横屏浏览器。

布局规则：

- 隐藏右侧 rail。
- 详情面板仍位于左侧，但改为轻量面板：
  - 宽度：`340-360px`
  - 最大宽度：`42vw`
  - 顶部/底部留白：`12px + safe area`
  - 面板内只允许一个主滚动容器
- 地图可视区应保留至少 `60%` 宽度给地图主体。
- `panSelectedTarget` 需要按 tablet 面板宽度重新计算目标偏移，避免 selected aircraft 被面板挡住。
- 底部工具栏改为更紧凑的 tablet 样式，避免遮挡地图。

交互规则：

- 禁用普通 hover popup 的自动展开，改为 tap 触发。
- 飞机点选保持即时响应。
- 面板内部垂直滑动不得触发地图拖拽。
- 地图区域双指缩放不得被面板捕获。

### 5.4 iPad 竖屏 `tablet-portrait`

适用：iPad 竖屏浏览器。

布局规则：

- 详情面板改为底部抽屉，而不是左侧浮层。
- 抽屉提供三个高度：
  - `peek`: `96-120px`，仅显示核心身份信息和关闭按钮
  - `mid`: `48-56dvh`，默认打开高度
  - `full`: `82-88dvh`，查看长列表和图表
- 地图顶部和中部保持可见，避免打开详情后看不到飞机位置。
- 底部工具栏与抽屉互斥：抽屉打开时工具栏收缩或上移。
- route legend 在抽屉打开时默认隐藏，避免层级拥挤。

交互规则：

- 抽屉顶部提供明确拖拽把手。
- 抽屉只在把手区域响应高度拖拽，内容区域只负责纵向滚动。
- 内容滚动到底部/顶部时不把滚动链传递给地图。
- 点击地图空白处可收起抽屉到 `peek` 或关闭详情，具体行为需保持和桌面清除选择逻辑一致。

### 5.5 手机 `mobile`

手机继续沿用底部抽屉方向，但可以复用 iPad 竖屏的抽屉状态模型。

区别：

- 默认高度可更低。
- 图表、列表、机场动态模块需要更严格懒加载。
- 不作为本次 iPad 优化的主要验收设备，但不能回退当前手机可用性。

## 6. 信息面板滚动优化

### 6.1 滚动容器

详情面板必须形成清晰的滚动结构：

```text
leftDetailPanel / bottomSheet
  detail-view
    detail-hero        固定或非滚动
    detail-segments    sticky
    detail-scroll-body 唯一主滚动容器
```

要求：

- `.detail-scroll-body` 是唯一纵向滚动容器。
- 列表组件内部默认不再创建新的滚动条。
- 长列表使用“折叠 + 展开更多”或虚拟列表，避免嵌套滚动。
- 面板容器本身保持 `overflow: hidden`。

### 6.2 iPad 滚动 CSS 规则

iPad / coarse pointer 下建议启用：

```css
.detail-scroll-body {
  overflow-y: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
  touch-action: pan-y;
}

.map {
  touch-action: pan-x pan-y pinch-zoom;
}
```

说明：

- 面板内容区只处理纵向滚动。
- 地图只在地图区域处理拖拽和缩放。
- 不在滚动事件中同步做大量 DOM 读写。

### 6.3 面板内容懒加载

切换详情 tab 时：

- 只渲染当前 tab 的重内容。
- 航迹图表只在进入“航迹”tab 后绘制。
- 近期行程、机场关联列表超过 `20` 条时采用分页或虚拟列表。
- 图片区域在 iPad 上延迟加载，不阻塞面板打开。
- 图表 hover 在触控设备上改为 tap 最近点，不实时跟随手指。

### 6.4 降低面板视觉成本

iPad profile 下应减少重绘成本：

- 关闭或弱化 scanline 动画。
- 减少大面积 box-shadow、filter、blur。
- 避免面板整体使用复杂 backdrop blur。
- tab 切换动画控制在 `80-120ms`，或在性能模式下取消。
- 长列表 item 不使用复杂阴影。

## 7. 地图加载与渲染优化

### 7.1 分阶段加载

iPad 上地图加载顺序：

1. 底图容器和基础控件
2. 当前视口飞机 marker
3. selected aircraft / selected airport
4. 当前视口机场 marker
5. 航迹线和 route endpoint
6. 标签、hover popup、图表数据

原则：

- 飞机 icon 优先于机场 icon。
- selected 对象优先于普通对象。
- 地图可交互优先于列表和图表完整加载。

### 7.2 地图交互阶段降载

地图拖拽、双指缩放、滚轮缩放期间进入 `mapInteractionPhase = "active"`。

active 阶段：

- 不做完整 `renderViewport()`。
- 不刷新机场标签。
- 不展开机场 hover popup。
- 不重算低优先级机场列表。
- 可临时隐藏普通机场标签。
- 航迹线不重新分段，只跟随地图原生投影移动。

idle 阶段：

- 使用 debounce 后执行完整 `renderViewport()`。
- 重新请求接口数据。
- 补齐机场和标签。
- 更新 rail 和诊断状态。

### 7.3 渲染节流

当前地图 `onVisualChange` 会在 zoom/pan 期间触发渲染，需要为 iPad 增加节流策略：

- 使用 `requestAnimationFrame` 合并同一帧内的多次更新。
- iPad active 阶段最多 `6-10fps` 更新轻量视觉状态。
- idle 后执行一次完整渲染。
- 数据请求只在 idle 后触发，不在每次视觉变化时触发。

### 7.4 Marker 分层预算

iPad profile 下应使用独立 marker 预算：

| 元素 | active 阶段 | idle 阶段 |
| --- | ---: | ---: |
| selected aircraft | 必显 | 必显 |
| 最近选中飞机 | 必显 | 必显 |
| 普通飞机 | 当前已渲染 marker 保持；新 marker 分批加入 | 按当前业务规则补齐 |
| 普通机场 | 暂停新增低优先级机场 | 按 1.18 密度规则补齐 |
| 机场标签 | 隐藏或冻结 | 重新碰撞计算 |
| 航迹 hover 命中层 | 暂停重算 | selected 时恢复 |

### 7.5 分批更新

marker 更新需要避免单帧大量 DOM 创建：

- Aircraft marker 每批建议 `200-300`。
- Airport marker 每批建议 `100-200`。
- 每批之间使用 `requestAnimationFrame` 或 `requestIdleCallback`。
- selected marker 单独优先更新，不等待批处理队列。
- 若用户再次拖动地图，应取消未完成的低优先级批处理。

### 7.6 iPad 机场密度

iPad 必须复用 1.18 的机场密度规则，并额外增加触控设备保护：

- `effectiveScaleKm > 50` 时严格按机场密度预算渲染。
- `effectiveScaleKm <= 50` 时允许全机场 pin，但仍然分批渲染。
- active 阶段不新增 `displayLevel 4-5` 机场。
- idle 阶段再补齐 `displayLevel 4-5`。

### 7.7 飞机 icon 与阴影性能

iPad 上保留飞机 icon 的清晰度，但降低非必要视觉成本：

- selected aircraft 保持完整阴影和红色选中态。
- 普通飞机保留主体描边和轻阴影。
- active 阶段可临时降低普通飞机 drop-shadow 强度。
- 不牺牲飞机 icon 的机型映射准确性。
- 不隐藏 selected aircraft、最近选中飞机和正在交互的飞机。

## 8. 触控交互规则

### 8.1 Hover 替代

`pointer: coarse` 设备不应依赖 hover。

规则：

- 飞机：tap 选中。
- 机场：tap 第一次显示轻量信息或选中机场，具体与当前机场选中规则保持一致。
- 机场 hover popup 在 iPad 上不因手指滑过触发。
- 图表 hover 改为 tap 或拖动吸附点。

### 8.2 命中区域

iPad 上触控命中需要兼顾准确和可点：

- 飞机 icon 命中区域不应扩大到遮挡附近飞机。
- selected aircraft 可有略大命中区。
- 机场 pin 命中区保持 `32-44px`，但不得高于飞机层级。
- 标签不捕获 pointer，避免点标签误选不到飞机。

### 8.3 手势冲突

- 面板内容区：只响应纵向滚动。
- 面板拖拽把手：只响应抽屉高度拖拽。
- 地图区域：响应拖拽和缩放。
- 面板滚动过程中不触发地图 click 清除选择。

## 9. 数据刷新策略

### 9.1 iPad 刷新频率

iPad active 阶段：

- 暂停普通机场刷新。
- 普通飞机刷新可延后到 idle。
- selected aircraft 仍按 selected 频率刷新。

iPad idle 阶段：

- 恢复当前视口飞机刷新。
- 恢复机场刷新。
- 执行缺失详情懒加载。

### 9.2 请求参数建议

接口请求可增加前端上下文：

| 参数 | 含义 |
| --- | --- |
| `clientProfile` | `desktop / tablet-landscape / tablet-portrait / mobile` |
| `interactionPhase` | `active / idle` |
| `effectiveScaleKm` | 当前有效比例尺 |
| `maxAircraft` | 当前设备建议飞机上限 |
| `maxAirports` | 当前设备建议机场上限 |
| `protectedAircraftKeys` | selected / recently selected |
| `protectedAirportCodes` | selected / route endpoint |

说明：

- 这些参数用于服务端优化返回量，不改变业务数据口径。
- 前端仍需保留兜底过滤，防止接口异常返回过量。

## 10. 桌面兼容原则

桌面端不能因为 iPad 优化被降级：

- `pointer: fine` 桌面保留 hover。
- 宽屏桌面保留右侧 rail。
- 桌面保留完整阴影、图表 hover、机场 hover popup。
- 桌面 marker 预算不因 tablet 配置降低。
- 桌面左侧面板继续使用固定左侧布局，不默认切到底部抽屉。

实现上应使用：

```text
layoutProfile + pointer capability + viewport width
```

而不是只使用：

```text
max-width media query
```

## 11. 配置建议

建议新增配置：

```js
responsivePerformance: {
  tabletBreakpointMin: 768,
  tabletBreakpointMax: 1199,
  tabletPanelLandscapeWidth: 360,
  tabletPanelPortraitMidHeight: 0.54,
  tabletPanelPortraitFullHeight: 0.86,
  disableHoverOnCoarsePointer: true,
  mapInteractionRenderFps: 8,
  markerBatchSize: {
    aircraft: 250,
    airport: 150
  },
  tabletEffects: {
    scanline: false,
    heavyShadow: false,
    hoverPopup: false
  }
}
```

## 12. 验收标准

### 12.1 iPad 竖屏

- 打开 selected aircraft 后，详情以底部抽屉显示，不使用固定左侧大面板。
- 默认抽屉高度不超过 `56dvh`。
- 地图中 selected aircraft 仍可见。
- 面板内容上下滑动顺畅，不拖动地图。
- 地图区域双指缩放正常。
- 机场 hover popup 不因手指滑过误触发。

### 12.2 iPad 横屏

- 右侧 rail 默认隐藏。
- 左侧详情面板宽度不超过 `360px` 或 `42vw`。
- 地图主体宽度不低于视口 `60%`。
- 面板滚动不影响地图拖动。
- 地图拖动和缩放过程中不出现明显 marker 卡顿。

### 12.3 桌面端

- 宽屏桌面仍显示左侧详情面板和右侧 rail。
- hover popup、图表 hover、机场 hover 保持可用。
- selected aircraft 层级和 icon 显示不变。
- 桌面端不进入 tablet 性能降级模式。

### 12.4 性能

- iPad 地图首次可交互时间明显优先于完整数据加载。
- 地图 active 阶段不发生大批量 DOM marker 创建。
- idle 后普通飞机、机场、标签逐步补齐。
- 左侧/底部面板滚动过程中不触发完整地图重渲染。
- selected aircraft、selected airport、route endpoint airport 不被降载逻辑隐藏。

## 13. 实施拆分建议

### P0

- 增加 `layoutProfile` 判断。
- 增加 iPad 竖屏底部抽屉布局。
- 增加 iPad 横屏轻量左侧面板布局。
- 面板滚动容器统一为 `.detail-scroll-body`。
- iPad 下禁用 hover popup 自动展开。
- 地图 active 阶段暂停完整 `renderViewport()`。
- 地图 idle 后恢复完整渲染和数据刷新。

### P1

- marker 分批更新。
- iPad 下图表懒加载和 tap 吸附。
- 接入 1.18 机场密度规则。
- 增加性能诊断状态：当前 profile、interactionPhase、marker 数量、渲染耗时。

### P2

- 详情面板抽屉 snap 动画完善。
- 根据 iPad 型号或性能自动调整 marker batch。
- 对机场和飞机 marker 进行更深层的 DOM 轻量化。
- 评估 Canvas/WebGL overlay 承载低优先级 marker，但 selected marker 继续使用 DOM/AdvancedMarker 保持交互质量。

## 14. 非目标

- 不修改飞机 icon 的机型映射关系。
- 不修改 selected aircraft 面板字段口径。
- 不改变机场层级业务定义。
- 不引入第三方动态数据。
- 不为了 iPad 性能隐藏 selected aircraft 或 selected airport。
- 不取消桌面端现有 hover 与高信息密度能力。
