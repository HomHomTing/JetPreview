# Aircraft Icon Mapping V1.1

当前页面渲染一组多机型图标检验样例。Business Jet 样例统一使用 `lj45` 公务机图标键；新增宽体、窄体、支线、涡桨、小型活塞和直升机样例用于检查不同轮廓与颜色。

| Manufacturer | Model | ICAO type code | Size class | FR24-style icon key |
| --- | --- | --- | --- | --- |
| Gulfstream | Gulfstream G650ER | GLF6 | ultra-long | lj45 |
| Bombardier | Bombardier Global 7500 | GL7T | ultra-long | lj45 |
| Dassault | Dassault Falcon 8X | FA8X | long-range | lj45 |
| Cessna | Cessna Citation Longitude | C700 | midsize | lj45 |
| Gulfstream | Gulfstream G550 | GLF5 | long-range | lj45 |
| Bombardier | Bombardier Global 6000 | GLEX | long-range | lj45 |
| Embraer | Embraer Praetor 600 | E550 | super-midsize | lj45 |
| Pilatus | Pilatus PC-24 | PC24 | light | lj45 |
| Bombardier | Bombardier Challenger 350 | CL35 | super-midsize | lj45 |
| Dassault | Dassault Falcon 7X | FA7X | long-range | lj45 |
| Gulfstream | Gulfstream G500 | GA5C | long-range | lj45 |
| Airbus | Airbus A380-800 | A388 | ultra-long | a388 |
| Boeing | Boeing 747-400 | B744 | ultra-long | b744 |
| Boeing | Boeing 777-300ER | B77W | ultra-long | b77w |
| Boeing | Boeing 737-800 | B738 | long-range | b738 |
| Airbus | Airbus A320neo | A20N | long-range | a320 |
| Embraer | Embraer E190 | E190 | midsize | e190 |
| ATR | ATR 72-600 | AT76 | midsize | at76 |
| Cessna | Cessna 172 | C172 | light | c172 |
| Airbus Helicopters | Airbus H135 | H135 | light | h135 |

渲染规则：

- 数据层维护 `aircraftTypeCode`、`sizeClass`、`fr24IconKey`。
- 地图 marker 优先读取 `fr24IconKey`；未识别时回落到 `lj45`。
- `sizeClass` 只控制屏幕尺寸矩阵，不再决定飞机 SVG 轮廓。
- 后续接入自有数据库时，只需要补充 ICAO type code 到 icon key 的映射，不需要改 marker 组件。
