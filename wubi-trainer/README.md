# 五笔打字练习（86 版 · 纯前端）

网页版五笔打字练习器：86 版同源码表、规则编码器、教学递进关卡、精确计分、错题本与 SM-2 复习。
**纯前端**：构建产物是单个 `dist/index.html`，浏览器直接打开（`file://`）即可使用，无需服务器。

## 快速开始

```bash
cd wubi-trainer
pnpm install
pnpm check        # 生成数据 → 逐字验证码表 → 单元测试 → 构建
pnpm test:e2e     # Playwright 端到端（需要 chromium）
pnpm build        # 产出 dist/index.html（单文件，双击即用）
```

日常开发：`pnpm dev`（<http://127.0.0.1:4173>）。

## 版本与数据同源

选定 **86 版**：教学资料最全、码表生态最成熟；本项目不混用 98/新世纪版。
全部练习数据来自同一版本的两条独立数据链，构建时交叉验证：

1. **真值链（码表）**：[Rime `wubi86.dict.yaml`](https://github.com/rime/rime-wubi)
   （极点 86，LGPL-3.0）→ 单字全码、一/二/三级简码、词组码与词频。
2. **规则链（拆字）**：[sdcb/search-wubi](https://github.com/sdcb/search-wubi) 的
   86 版拆字库 + 字根总表 → 字根序列、键名/成字字根/单笔画类型、末笔字型识别码。

原始文件固定在具体 commit，见 `data/source/sources.lock.json`（含 URL、commit、SHA-256）。
字集为《通用规范汉字表》一级字表 3500 字。

## 编码器与验收（0 不一致）

`src/lib/wubi/encoder.ts` 按 86 版规则实现编码器：键名字（连打四键）、成字字根
（报户口 + 首笔 + 次笔 + 末笔）、五种单笔画（键名 ×2 + ll）、合体字拆字
（一/二/三/末）与末笔字型识别码（末笔代号 ×10 + 字型代号 → 25 键），词组按
二/三/四/多字规则取码。

```bash
pnpm verify:codes   # 独立重推 3500 字编码，与 Rime 码表逐字比对
```

- 验收报告：`docs/verification/code-consistency.md`（**3500/3500 一致，0 差异**，
  附 JSON 与来源哈希，可重复复算）；
- 20 个识别码字对拍：`docs/verification/id-code-samples.md`；
- 词组规则：码表 58543 条词组中 13 条为词库手工定制码（多为叠词），已在报告逐条
  列出；练习词库只保留与规则一致的 1010 条词组。

## 关卡（按真实教学递进）

字根记忆 → 键位与指法 → 一级简码（25 字）→ 二级简码 → 单字全码 →
二/三/四/多字词组 → 文章。

- 虚拟键盘高亮下一键，按指法分区着色并提示“用哪根手指”；
- 错键闪红 + 可选提示音；
- 单字面板展示字根（PUA 字形，内置字根字体）、键位与识别码区位；
- 文章模式按最长匹配提示可整打词组，逐字着色显示进度；
- 错题本：每完成一条立即记账，SM-2 间隔重复安排“复习到期”。

## 计分口径（可独立复算）

| 指标 | 定义 |
| --- | --- |
| CPM | 正确上屏字数 / 分钟 |
| KPM | 参与判定的字母键次数 / 分钟 |
| 码长 | 总击键 / 完成字数 |
| 退格率 | 退格 / 总击键 |
| 准确率 | 正确击键 / 总击键 |

全部指标由 `src/lib/trainer/session.ts` 的纯函数从击键流水复算，
`tests/unit/session.spec.ts` 用固定击键序列（含正确/错误/退格）逐一验证。

## 浏览器键盘处理

`src/lib/trainer/useTypingInput.ts`：只用 `keydown` 的 `event.code`（物理键位）判定，
对字母/空格/退格 `preventDefault`，忽略 `isComposing` 与带 Ctrl/Meta/Alt 的按键，
不依赖 IME 的 composition 事件。

## 自证材料（任务 6）

| 要求 | 位置 |
| --- | --- |
| (a) 3500 字码表一致性比对（脚本可复算） | `pnpm verify:codes` → `docs/verification/code-consistency.{md,json}` |
| (b) 端到端：首屏 → 选关卡 → 输入 → 计分 → 错题入本 | `pnpm test:e2e` → `tests/e2e/flow.spec.ts` |
| (c) 20 个识别码字对拍 | `docs/verification/id-code-samples.md` + 单字关卡界面 |
| (d) 零基础完成一级简码关卡 | 第 3 关：下一键高亮 + 指法提示 + 每字提示语；E2E 用例覆盖 |
| 截图 | `docs/verification/screenshots/`（before/after） |

## 许可

代码沿用仓库根目录 MIT；码表/字表/拆字数据的来源与许可见
`THIRD-PARTY-NOTICES.md` 与 `data/source/SOURCES.md`。
