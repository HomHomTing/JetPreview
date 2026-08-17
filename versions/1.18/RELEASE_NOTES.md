# 1.18 版本封存说明

封存日期：2026-08-17

## 版本基线

- 首页发布版本号统一为 `Business Jet Radar 1.18`，静态资源缓存串统一为 `1.18-release`。
- 继续使用自有数据库接口展示真实在途飞机、选中航迹、飞机基础信息、机场基础信息、机场停场和机场动态信息。
- 航班号统一从 `callsign` / `callSign` 等接口字段读取；当呼号与注册号一致且没有更优字段时，保留该值作为兜底展示。
- 已接入 1.18 数据字段相关测试，覆盖实时快照、航迹详情、飞机资料、机场资料和近期行程展示。
- 本版本不调整地图中机场、飞机 icon 的加载规则，继续沿用 1.17 确认过的稳定方案。

## 调试台与线上安全

- 本地 `config.js` 可为授权账号开启接口调试台，用于查看点选控件关联接口的原始返回、适配结果和航班号状态。
- `config.example.js` 中 `apiDebugConsole.enabled` 默认为 `false`，`allowPublicHost` 默认为 `false`。
- 运行时增加公开域名保护：仅 `file://`、localhost、127.0.0.1、局域网 IP 和 `.local` 设备名默认允许调试台；公开线上域名不会创建调试台入口。
- 线上静态包显式关闭 `apiDebugConsole`，不展示调试台入口。

## 文档归集

- `docs/data-interface-field-interaction-requirements-v1.17.md`：新接口字段与既有界面字段映射规划。
- `docs/airport-density-scale-layer-requirements-v1.18.md`：机场密度方案历史记录。
- `docs/ipad-desktop-map-loading-panel-performance-requirements-v1.19.md`：iPad 与桌面性能规划。
- `docs/fr24-airport-loading-rules-simplified-v1.20.md`：当前机场加载规则基线。

## 验证要求

- `node --check app.js data-service.js config.example.js tools/ipad-preview-server.mjs`
- 运行 `tests/*.test.cjs` 全量测试。
- 运行 `git diff --check`。
- 运行 `npm run build` 与 `npm test` 验证线上静态预览工程。
- 发布后检查在线页面 iframe 指向 `/map/v1-18.html`，页面标题为 `Business Jet Radar 1.18`，且线上页面不存在接口调试台入口。

## 不包含

- 本地 `config.js` 中的 Google Maps 密钥、私有 API 账户配置和本地调试台授权配置不进入 GitHub 主仓库。
- `source/` 下独立发生的接口文档目录改名不纳入本次 1.18 发布提交。
