# 在途飞机历史飞行记录时间轴设计规范 1.22

## 1. 文档定位

本文档承接 `docs/aircraft-history-timeline-requirements-v1.21.md`，把「历史行程改为时间轴」从需求推进到设计规范与可操作原型。

建议归属版本：`1.22`。
形成日期：2026-08-17。

本版本只梳理设计规范并给出原型，暂不实施代码。

v1.21 的以下内容全部沿用，本文不重述：信息架构（§5）、分组规则（§6.5）、当前停场摘要（§6.6）、加载策略（§7.1）、筛选规则（§7.2）、点击行程分档（§7.3）、回放动作语义（§7.4）、缓存策略（§9.3）、地图联动（§12）、边界（§2、§14）。

本文只记录三类内容：对 v1.21 的修正、v1.21 未覆盖的新增组件、以及原型实测得到的结论。

## 2. 交互原型

可操作原型：https://claude.ai/code/artifact/e85cf7d2-28fc-44df-87b9-66d849633ee2

原型说明：

- 面板按实际 380px 宽度渲染，深色底图。
- 数据为 365 天合成样本，共 123 条航段，含 1 条在途、1 条计划、4 条延误、1 条取消。
- 时间范围切换、状态筛选、机场过滤、月份跳转、卡片展开、滚动折叠均为真实交互。
- 原型用于验证一年规模下的扫描效率与高度预算，不是视觉稿，也不是实现代码。

## 3. 对 v1.21 的修正

### 3.1 实时色应为薄荷，不是黄色

v1.21 §10.1 写「关键实时色：沿用当前黄色 selected 色」，与同节已经在用的 `var(--graphite-panel)` 等令牌自相矛盾。

当前代码事实：

- `styles.css` 的 `:root` 已定义 `--graphite-mint: #3de0c0`、`--graphite-amber: #f0b849`、`--graphite-coral: #ff6b5a`。
- `styles.css` 全文件 105 处引用 Graphite 令牌。
- `CHANGELOG.md` 1.14 记录：Starts the selected aircraft / airport interaction refresh from the Graphite detail-panel specification。

修正：实时/选中色统一为 `--graphite-mint`。v1.21 §6.3 中「live 黄色细描边 + 小实心点」同步改为薄荷。

### 3.2 已落地状态不应上色

v1.21 §6.3 给 `landed / 已落地` 分配绿色或青色 badge。一年历史中已落地占约 95%，给多数状态上色等于没有重点，与该节自述的「工具型、低噪声」相抵触。

修正后的状态色彩规范：

| 状态 | 令牌 | 视觉 | 占比预期 |
| --- | --- | --- | --- |
| 途中 live | `--graphite-mint` | 薄荷小实心点（2s 呼吸）+ 薄荷文字 + 卡片描边转薄荷 | 0-1 条 |
| 已落地 landed | `--graphite-muted-2` | 灰色小字，无点无 badge | 约 95% |
| 延误 delayed | `--graphite-amber` | 琥珀文字 + 展开区偏差量 | 约 3% |
| 取消 cancelled | `--graphite-coral` | 珊瑚文字 + 航线代码删除线 | 小于 1% |
| 计划 scheduled | `--graphite-muted-2` | 灰色描边 badge | 0-3 条 |
| unknown | 无 | 灰色 `—`，不猜测 | 视数据 |

原则：颜色只花在需要注意的状态上。

### 3.3 时间语义缺口比 v1.21 描述的更靠前

v1.21 §15 把「时间字段语义不完整」列为第二风险，归因于后端缺 `scheduled*EpochMs`。实际缺口在前端适配层。

`data-service.js` 的 `adaptHistoryFlight()` 现状：

```js
const depTimeRef = makeTimeRef(firstValue(item.depActualEpochMs, item.depTime1), {
  timeZone: depZone,
  sourceField: "513013.depTime1",
  semantic: "history_departure"
});
```

计划时间与实际时间被合并进单个 `depTimeRef`，到达侧同理。即便后端补齐 `scheduled*EpochMs`，当前前端结构也接不住。

修正：适配层需先拆为五个独立 TimeRef，各自保留 `sourceField`：

- `times.scheduledDeparture`
- `times.actualDeparture`
- `times.scheduledArrival`
- `times.actualArrival`
- `times.estimatedArrival`

顺序不能反：先拆前端，再谈后端补字段。

### 3.4 Tab 位置表述需按实际结构

v1.21 §13 P0.1 写「行程 Tab 仍独立存在，并位于信息 Tab 右侧」。

当前 `index.html` 的 `.detail-segments` 为四段 segmented control：

```html
<button data-aircraft-segment="overview">概览</button>
<button data-aircraft-segment="track">航迹</button>
<button data-aircraft-segment="airframe">信息</button>
<button data-aircraft-segment="journey">行程</button>
```

「行程」确实在「信息」右侧，表述成立，但应写明它是四段 segmented control 的第四段，而非独立 Tab 栏。

修正：验收标准改述为「行程为 `data-aircraft-segment="journey"` 第四段」。

## 4. 新增组件：年度活动条

v1.21 §5 的五个区域中，Timeline 直接承担全部 365 天，缺少概览层。123 至 500 条航段靠纯滚动无法形成节奏感知。

新增年度活动条，位于 History summary 与 Range controls 之间，优先级 P0。

| 项 | 规范 |
| --- | --- |
| 结构 | 12 根等宽柱，代表最近 12 个自然月，左旧右新 |
| 柱高 | 当月航段数 ÷ 全年单月峰值 × 34px，最小 2px；0 条月份保留底色空槽 |
| 配色 | 范围外 `--graphite-panel-3`；范围内 `rgba(61,224,192,.5)`；当前月 `--graphite-mint` |
| 交互 | 点击滚动到该月分组并短暂高亮；hover 显示 `2026 Mar · 14 段 · 31h20m` |
| 与范围联动 | 切换 7d/30d/90d/365d 时，落入窗口的月份自动染色 |
| 数据来源 | 由已加载的 `TimelineFlightRecord[]` 前端聚合，不新增接口 |
| 降级 | 不足 12 个月历史时按实际月份数渲染；全年 0 条时整条隐藏 |

理由：没有它，「支持 365 天」只是「能滚很久」。有了它，用户第一眼即可判断这架飞机是常年高频还是集中在某几个月，直接回答 v1.21 §4.1 的「某月或某段时间内飞行频率」。

## 5. 时间轴结构规范

### 5.1 层级与轴线

| 项 | 规范 |
| --- | --- |
| 轴线位置 | 卡片左侧 8px 处 1px 竖线，颜色 `rgba(255,255,255,.12)`；卡片左缩进 26px |
| 月份节点 | 7px 实心圆点，`--graphite-muted`；月份标题 sticky 吸附于滚动容器顶部 |
| 日期节点 | 6px 空心圆点，1px 描边；仅当天第一条航段前出现 |
| 今日节点 | 薄荷实心点 + 3px 外发光，日期文字同步薄荷色 |
| 月份标题内容 | `2026 Aug` + 右侧 `18 段 · 42h15m` |
| 排序 | 月份倒序、日期倒序、同日按出发时间倒序 |

### 5.2 航段卡片解剖

| 行 | 内容 | 字体 / 字号 | 说明 |
| --- | --- | --- | --- |
| 1 左 | 状态 | mono 9 / .09em / 大写 | 最宽 76px，超出截断；已落地为灰字无 badge |
| 1 右 | 飞行时长 | mono 10.5 | `2h15m`；优先 `durationMinutes`，回退 `estimateTime` |
| 2 | 航线 `DEP → ARR` | mono 15 / 600 | 主视觉；中间细线带箭头，途中态线条转薄荷 |
| 3 | 起降当地时间 | mono 10 / tabular | 各按本场时区；跨天 `+1d` 贴在到达时间后并染琥珀 |
| 4 | 机场中文名 | sans 9.5 | 次级信息，字号小于机场代码 |
| 展开 | STD/ATD · STA/ATA · UTC · 行程 ID | mono 10 | 偏差量染琥珀；行程 ID 不作主标题 |
| 展开 | 动作区 | mono 9.5 / 大写 | Live / Playback / 航迹 / 详情，按可用性置灰 |

常驻只显示状态、时长、航线、起降当地时间四项，其余折入展开区，避免每张卡片堆四组时间。

## 6. 原型实测结论

以下两条是原型跑出来的结果，不是设计推演。

### 6.1 月份跳转必须重新锚定

初版实现让月份跳转把沿途卡片一并挂载（`STATE.mounted = idx + 40`）。跳到最早月份时 DOM 卡片数从 40 涨到 123，违反 v1.21 §9.2 的 40 条首屏预算。500 条数据下会更严重。

修正：跳转即以该月为新起点重挂 40 张，并在顶部提供「上方还有 N 段 / 回到最新」。

实测：修正后跳转到最早月份挂载 17 张，任意月份跳转后不超过 40 张。

### 6.2 固定区会吃掉时间轴，滚动时必须折叠

新增年度活动条后，固定区（状态卡 + 指标四格 + 活动条 + 控件）在 824px 面板上实测占 476px，时间轴只剩 346px，仅 3 张卡片可见。时间轴成了面板里最小的区域。

固定区构成：

| 区块 | 高度 |
| --- | --- |
| 状态卡 | 约 45px |
| 指标四格 | 约 46px |
| 年度活动条 | 约 78px |
| 范围与筛选 | 约 66px |

修正，优先级由 P1 升为 P0：

- 时间轴向下滚出 48px 即折叠指标四格与年度活动条，只保留状态卡与 segmented。
- 回到顶部自动展开。
- 折叠态提供一枚「概览」chip 手动展开。
- `prefers-reduced-motion` 下取消过渡动画。

实测收益：固定区 476px 降至 328px，时间轴 346px 增至 494px，多出 148px 约合 1.5 张卡片。

移动端：≤767px 底部抽屉形态下，指标四格与年度活动条默认折叠，由「概览」chip 展开。

## 7. 数据接口增补

v1.21 §8.2 的入参与字段清单全部保留。以下为增量。

### 7.1 前端适配层（优先于后端）

| 位置 | 现状 | 需改为 |
| --- | --- | --- |
| `data-service.js` `adaptHistoryFlight()` | `firstValue(depActualEpochMs, depTime1)` 合成单个 TimeRef | 拆为五个独立 TimeRef，见 §3.3 |
| `data-service.js` `getFlightHistory(tailNo)` | `request("513013", { tailNo })` | 签名改为 `getFlightHistory(tailNo, { rangeDays, page, pageSize, status, airportCode })` |
| `app.js` `renderFlightHistoryRows()` | `flights.slice(0, 6)` | 改为 `renderFlightHistoryTimeline()`，分段挂载，移除 6 条硬截断 |
| `app.js` `renderFlightHistoryRows()` | `groundAirportInfo` 拼在列表首位 | 移出列表，由 History summary 区承载（v1.21 §6.6） |

### 7.2 后端字段（在 v1.21 §8.2 之外）

| 字段 | 类型 | 用途 |
| --- | --- | --- |
| `monthlyStats[]` | Array | 可选。按月聚合的 `{ month, count, minutes }`，使年度活动条无需等全量数据即可渲染 |
| `totalCount` | Number | 窗口内总条数，用于 summary 与分页终止判断 |
| `totalMinutes` | Number | 窗口内累计飞行时长 |
| `delayMinutes` | Number | 延误偏差量，用于展开区的 `+25`；前端不自行用 STD/ATD 相减以免时区口径不一 |

关于 `totalCount` / `totalMinutes`：缺这两个字段时，summary 的「一年总行程 / 累计飞行时长」在分页加载过程中会不断变大，用户会看到数字跳动。只能显示为 `168+` 形式或等全量加载完成，两者都不理想。

## 8. 验收标准增补

沿用 v1.21 §13 全部条目，新增以下。

P0：

| 条目 | 判定方式 |
| --- | --- |
| 年度活动条渲染 12 个月并可点击跳转 | 点任一月份柱，时间轴滚动到该月分组并高亮 |
| 已落地状态不使用彩色 badge | 365d 全量下截图，彩色元素仅出现在途中/延误/取消行 |
| DOM 卡片数不随历史深度增长 | 500 条数据下，首屏及跳转到任意月份后 DOM 卡片数 ≤ 40；只有显式点「继续加载」才增长 |
| 适配层输出五个独立时间 TimeRef | 单测：构造同时含 scheduled 与 actual 的记录，断言两者不互相覆盖 |
| 滚动折叠生效 | 时间轴向下滚出 48px 后固定区高度下降，回顶恢复 |

P1：

| 条目 | 判定方式 |
| --- | --- |
| 月份标题显示当月航段数与累计时长 | 与 summary 全年数字口径一致 |
| 范围切换时年度活动条同步染色 | 切 30d 后仅最近 1-2 根柱为薄荷 |
| 筛选结果为空保留时间轴容器 | 空态文案具体，不显示 `N/A` |

## 9. 实施顺序

修订 v1.21 §15 的顺序。

1. 适配层拆时间字段。纯前端改动、无后端依赖，是 v1.21 §15 所列第二风险的根因。
2. `getFlightHistory()` 支持 range / page / filter，输出标准 TimelineFlightRecord。
3. UI 层：`renderFlightHistoryTimeline()` + 年度活动条 + 滚动折叠 + 时间轴 CSS。
4. 联动层：历史航迹模式、Playback 入口、返回实时状态。

与 v1.21 §15 的差异：原顺序把「数据层扩 range/page」放第一。实际应先拆时间字段，先做它可以让后续所有步骤基于正确的时间语义。

## 10. 不在本次范围

沿用 v1.21 §14 全部条目。补充：

- 不实施代码，本版本只交付设计规范与原型。
- 不改变 Graphite 令牌定义，只使用 `styles.css` 中已有的 `--graphite-*`。
