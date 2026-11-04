# 数据来源与固定版本

本目录保存构建与复算所需的原始数据。所有来源都固定在具体 commit，`sources.lock.json`
记录了 URL、commit 与 SHA-256；`scripts/build-data.ts` 和 `scripts/verify-codes.ts`
只读取本目录，不会在运行时访问网络。

| 文件 | 用途 | 固定来源 | 许可 |
| --- | --- | --- | --- |
| `wubi86.dict.yaml` | 86 版单字全码、一/二/三级简码、词组码 | [rime/rime-wubi](https://github.com/rime/rime-wubi) @ `152a0d3f3efe40cae216d1e3b338242446848d07` | LGPL-3.0 |
| `level-1.txt` | 《通用规范汉字表》一级字表 3500 字 | [shengdoushi/common-standard-chinese-characters-table](https://github.com/shengdoushi/common-standard-chinese-characters-table) @ `d9b599a9c9cc0dd2d58cad829e285bc780cd4451` | 国家标准字表；转录仓库未附许可 |
| `data-wubi-v86.tsv` | 86 版拆字：字根序列、成字字根/键名/单笔画类型、识别码说明 | [sdcb/wubi86-viewer](https://github.com/sdcb/wubi86-viewer) @ `3e527ceea1b52e8f75fd3d520a4007ab7b42391e`（`data-src/data-wubi-v86.tsv`） | 数据来自 [sdcb/search-wubi](https://github.com/sdcb/search-wubi)，原始字根拆解资料标注为 86wb.ysepan.com；仓库未附明确数据许可 |
| `roots-table.tsv` | 25 键字根表：PUA 字根字形 → 键位，用于独立推导字根键位 | [sdcb/search-wubi](https://github.com/sdcb/search-wubi) @ `10c88b4217a9fe81f5b6125bcdebbede7a47b2cc`（`docs/wiki/data/roots-table.tsv`） | 同上 |

## 为什么选 86 版

86 版是五笔字型最早普及、教学资料与码表最一致的版本；本项目的码表、简码、词组与拆字资料
都围绕 86 版。98 版和新世纪版的字根、识别码与简码规则不同，本项目不混用。

## 码表真值来源

`wubi86.dict.yaml` 是 Rime 的 86 版码表（其来源为极点五笔码表与 ibus-table），不是网上
二手“速成口诀/百科教程”。字根表与拆字资料来自独立的拆字/字根资料；编码器用拆字资料
按规则生成编码，再与 Rime 码表逐字比对。两条数据链在构建时交叉验证，见
`docs/verification/code-consistency.md`。

## 复算

```bash
cd wubi-trainer
pnpm install
pnpm data        # 从本目录原始数据生成 src/data/*
pnpm verify:codes # 逐字比对 3500 字，输出报告
```

如果要从网络重新抓取，请使用 `scripts/fetch-sources.sh`（可选；正常复算不需要）。
