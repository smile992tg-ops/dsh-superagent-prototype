# 第三方来源与许可

本项目源代码沿用仓库根目录的 MIT 许可；`data/source/` 与 `src/data/` 中的码表/字表数据
是派生数据，遵循其原始来源的许可与署名要求。

## 1. 五笔 86 码表 — rime/rime-wubi（LGPL-3.0）

- 仓库：<https://github.com/rime/rime-wubi>
- 文件：`wubi86.dict.yaml`，固定 commit `152a0d3f3efe40cae216d1e3b338242446848d07`
- 许可：GNU Lesser General Public License v3.0
- 用途：`src/data/chars.json` 与 `src/data/phrases.json` 中的单字全码、一/二/三级简码、
  词组码与权重均派生自该码表；`data/source/wubi86.dict.yaml` 原样保存。
- 再分发这些派生数据时请保留 LGPL-3.0 与署名。

## 2. 《通用规范汉字表》一级字表

- 标准：中华人民共和国教育部、国家语言文字工作委员会 2013-06-05 颁布
- 转录：<https://github.com/shengdoushi/common-standard-chinese-characters-table>
  （commit `d9b599a9c9cc0dd2d58cad829e285bc780cd4451`）
- 用途：`data/source/level-1.txt` 定义 3500 字练习与比对字集。
- 说明：字表本身是国家标准内容；转录仓库未附许可文件。

## 3. 86 版拆字与字根资料

- `data/source/data-wubi-v86.tsv`：来自
  <https://github.com/sdcb/wubi86-viewer>（commit
  `3e527ceea1b52e8f75fd3d520a4007ab7b42391e`），其 `data-src/` 说明拆字资料来自
  <https://github.com/sdcb/search-wubi>，原始字根资料标注为 86wb.ysepan.com。
- `data/source/roots-table.tsv`：来自 <https://github.com/sdcb/search-wubi>（commit
  `10c88b4217a9fe81f5b6125bcdebbede7a47b2cc`）。
- 用途：拆字序列、成字字根/键名/单笔画类型、识别码末笔与字型、PUA 字根 → 键位。
- 许可：上述仓库未附明确的数据许可文件；本项目以研究/教学原型方式署名使用。若需商用，
  请先向原始资料发布者确认授权。

## 4. 字根字形字体（黑体字根.ttf）

- 来源：<https://github.com/sdcb/search-wubi>（`docs/static/font/黑体字根.ttf`，
  commit `10c88b4217a9fe81f5b6125bcdebbede7a47b2cc`），原始字形来自 86wb.ysepan.com
- 用途：`src/assets/wubi-roots.ttf` 在浏览器中渲染拆字库使用的 PUA 字根字形
- 许可：与第 3 项相同，原始资料未附明确许可；以研究/教学原型方式署名使用

## 5. 本项目原创内容

- `src/`、`scripts/`、`tests/` 中的代码与测试。
- `scripts/lib/articles.ts` 中的练习文章。
- `src/lib/wubi/roots.ts` 中的字根表文本按 86 版公开教学口诀整理，用于教学展示。
