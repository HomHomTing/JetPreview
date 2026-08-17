# 1.17 版本封存说明

封存日期：2026-08-17

## 版本基线

- 首页与控制台继续使用自有数据库和统一 ICAO Code 图标映射。
- 机场加载逻辑以 FR24 页面实际比例尺表现为校准基准，不再使用旧版固定 zoom 数量表。
- `effectiveScaleKm` 统一表示地图上 100 个 CSS 像素对应的实际距离。
- Auto 模式远景隐藏普通机场，中景显示 L1，近景显示 L1-L4；On 模式远景最多显示 L1。
- 机场请求限制在当前扩展视口，前端不再按固定数量截断，并使用 15 分钟、最多 12000 条记录的视口缓存。
- 机场标签按比例尺切换 pin、代码和完整信息，仍执行标签碰撞处理。
- 选中飞机的已知出发/到达机场复用原机场 marker，并呈现路线选中状态，不触发机场信息浮窗。
- 机场图层关闭、比例尺过滤或视口刷新时，选中机场、hover 机场和路线端点机场仍被保护。
- 飞机 marker 的固定图层继续高于普通机场和路线端点机场。

## 文档归集

- `docs/data-interface-field-interaction-requirements-v1.17.md`：数据字段与现有交互接入规划。
- `docs/airport-density-scale-layer-requirements-v1.18.md`：机场密度早期方案，仅作为历史记录。
- `docs/ipad-desktop-map-loading-panel-performance-requirements-v1.19.md`：电脑与 iPad 性能规划。
- `docs/fr24-airport-loading-rules-simplified-v1.20.md`：1.17 实际采用的机场加载规则。

## 验证要求

- `node --check app.js data-service.js config.example.js`
- 运行 `tests/*.test.cjs` 全量测试。
- 运行 `git diff --check`。
- Cloudflare 发布后检查在线页面标题、1.17 资源版本和核心脚本响应。

## 不包含

- 本地 `config.js` 中的 Google Maps 密钥与私有 API 账户配置不进入 GitHub 和版本快照。
- `source/` 下独立发生的接口文档目录改名不属于本次 1.17 发布提交。
