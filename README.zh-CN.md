# Parenting Multi-Agent（AI 育儿多智能体）

这是一个覆盖从出生到青年阶段的 AI 育儿助手。项目采用 TypeScript + npm workspaces 单仓架构，包含协调器、分层记忆、CLI、Web 控制台，以及 18 个育儿专家 Agent。

- 在线演示：https://yeluo45.github.io/parenting-multi-agent/
- English README：[README.md](./README.md)
- 质量门禁：测试通过率 100%，全量源码覆盖率不低于 95%

## 项目能做什么

家长只需要提出一个问题，`OrchestratorCore` 会根据孩子年龄、发展阶段、问题主题、危险信号和近期上下文，自动路由到合适的专家 Agent。

当前专家 Agent 包括：

- 儿科医生：疾病分诊、疫苗、用药剂量建议
- 心理师：情绪、行为、压力、依恋
- 教育顾问：学习、学校、兴趣、能力追踪
- 营养师：辅食、过敏、食谱、挑食
- 睡眠教练：作息、夜醒、睡眠倒退
- 家庭调解员：家庭冲突与沟通
- 财务顾问：育儿预算、教育储蓄
- 父母支持：照护者压力与 burnout
- 成长追踪：身高、体重、百分位、里程碑
- 习惯教练：日程、屏幕时间、睡前流程、习惯循环
- 知识 RAG：循证育儿 FAQ 和参考资料
- 安全守护：风险预防、急救、紧急升级
- 社交顾问：分享、友谊、玩伴、同伴压力
- 入学准备：幼小衔接和小学适应
- 升学规划：申请、长期规划、准备度
- 职业规划：青少年/青年职业探索
- 法律顾问：监护、同意、年龄相关法律问题
- 手足关系：手足冲突、公平感、家庭角色平衡

## 架构

```text
parenting-multi-agent/
├── packages/
│   ├── orchestrator/          # OrchestratorCore + MessageBus + 路由类型
│   ├── memory/                # L0-L4 记忆 + SQLite + 同步 delta log
│   ├── cli/                   # parenting CLI 命令和 REPL 辅助能力
│   └── agents/                # 18 个专家 Agent workspace
│       ├── pediatrician/
│       ├── psychologist/
│       ├── educator/
│       ├── nutritionist/
│       ├── sleep-coach/
│       ├── family-mediator/
│       ├── finance/
│       ├── parent-support/
│       ├── growth-tracker/
│       ├── habit-builder/
│       ├── knowledge-rag/
│       ├── safety-guard/
│       ├── social/
│       ├── school-readiness/
│       ├── college-prep/
│       ├── career/
│       ├── legal/
│       └── sibling/
└── apps/
    └── web/                   # Vite + React 控制台，支持主题和国际化
```

## 协调流程

```text
家长问题
   │
   ▼
OrchestratorCore ── 按年龄/阶段/主题/危险信号路由 ──► 专家 Agent
   │                                                   儿科 / 心理 / 教育 / 营养 / 睡眠
   │                                                   家庭 / 财务 / 支持
   │                                                   成长 / 习惯 / RAG / 安全
   │                                                   社交 / 入学 / 升学
   │                                                   职业 / 法律 / 手足
   ▼
MemoryLayer L0-L4 保存孩子档案、会话、事件、事实、反馈和同步增量
```

## 质量门禁

本项目当前验收标准：

- 测试通过率：100%
- 全 workspace 源码覆盖率：不低于 95%
- 专家 Agent workspace：通常保持行/语句/函数/分支 100%
- Web workspace：整体源码覆盖率不低于 95%，React/UI 分支例外以 coverage 输出为准

最新已验证命令：

```bash
NODE_ENV=development npm run test:coverage
```

本地实际验收结果：

- 总测试数：1278 passed
- 全 workspace 通过率：100%
- 最低整体 workspace 覆盖率：`@parenting/web` 分支覆盖率 95.22%，行覆盖率 99.35%，语句覆盖率 99.35%，函数覆盖率 98.39%

## 已验证命令清单

以下命令均已在 `/home/hermes/projects/parenting-multi-agent` 实际执行并通过。

```bash
# 安装依赖；WSL 下显式包含 devDependencies，避免 NODE_ENV=production 陷阱
NODE_ENV=development npm install --no-audit --no-fund --include=dev

# 构建核心运行包
npm run build:agents

# 构建 Web 控制台
npm run build:web

# 运行全量测试和覆盖率门禁
NODE_ENV=development npm run test:coverage

# 验证 README 命令、Web 构建产物、覆盖率和组合发布门禁
npm run verify:readme
npm run build:web
npm run smoke:web
npm run release:gate

# 只运行 Web 覆盖率
NODE_ENV=development npm test -w @parenting/web -- --coverage

# 只运行某个专家 Agent 覆盖率
NODE_ENV=development npm test -w @parenting/agent-legal -- --coverage

# 启动 Web 开发服务器
npm run dev:web
# 然后访问 http://localhost:5173/parenting-multi-agent/

# 启动 TUI 模式
npm run dev:tui

# 启动 CLI 模式
npm run dev:cli

# CLI 紧急分诊烟测
PARENTING_DATA_DIR="$(mktemp -d)" npx tsx packages/cli/src/index.ts ask "我家宝宝3个月发烧38.5度怎么办"

# CLI 孩子档案烟测
TMP=$(mktemp -d)
PARENTING_DATA_DIR="$TMP" npx tsx packages/cli/src/index.ts add-child alice 爱丽丝 2024-06-19
PARENTING_DATA_DIR="$TMP" npx tsx packages/cli/src/index.ts list
```

注意事项：

- `npm run dev:web` 会启动长期运行的 Vite server。自动化验收时不要前台直接跑，应使用后台进程并单独检查 readiness。
- `npm run build:web` 不应再输出 `better-sqlite3` / `browser-external:fs` / `browser-external:util` warning。浏览器端通过 Vite alias 使用 web-safe memory shim + `WebMemoryLayer`，不会加载 native SQLite 代码。
- WSL 环境下安装和测试建议显式使用 `NODE_ENV=development`，避免 devDependencies 被跳过。

## Web 控制台

Web 应用包含：

- Vite + React + TypeScript
- 四套主题：light、dark、sepia、nord
- 两种语言：`zh-CN`、`en`
- `WebMemoryLayer`：浏览器安全的纯内存记忆实现，兼容 orchestrator 的记忆接口
- 记忆面板辅助能力：孩子档案校验、同步健康、CRUD 管理、反馈分析
- 无人值守迭代面板：显示 7 个方向的路线图，包括 Web convergence、记忆时间线、LLM fallback、验收证据、离线同步队列、场景包和发布门禁
- Parenting Closed Loop：在首页记忆面板中把“提问 → 路由 → 回答 → 演练 → 记录 → 同步”串成 6 步闭环，并提供可点击的下一步行动按钮
- Web Interaction Workbench：在首页记忆面板中聚合 7 个交互方向（场景化问诊向导、Agent 协作可视化、行动计划卡片、孩子成长时间线、高风险安全模式、家庭协作视图、复盘与个性化调优），统一在主设置区可见
  - 场景化问诊向导支持 4 步可点击推进（child / scenario / urgency / goal）
  - Agent 协作 DAG 内联 SVG 可视化，包含主 Agent、咨询 Agent 与安全兜底节点
  - 行动计划卡片支持勾选与备注，自动计算完成率并回写到 memory
- Workbench 跨会话持久化（`LocalStorageWorkbenchStorage` / `InMemoryWorkbenchStorage`）：保存 guidedIntake + actionBoard 状态
- 行动板完成率反哺 Agent 权重（`buildAgentWeightHints`）：完成度 + 备注情感信号 → Agent 路由提升
- Agent DAG 节点可点击（`selectAgent` action）：选中后展示该 Agent 最近回复 + 权重 hint
- Workbench UI Panel（`apps/web/src/workbench-panel.tsx`）：在 MemoryPanel 末尾独立挂载，渲染 7 方向、问诊 4 步、DAG 按钮网格、行动板勾选/备注、agent shortcut hint
- Vite 手动分包：React vendor 与 parenting runtime 分离，避免循环 chunk

构建命令：

```bash
npm run build:web
```

开发服务器：

```bash
npm run dev:web
# 打开 http://localhost:5173/parenting-multi-agent/
```

## TUI 模式

TUI 模式是终端优先的交互 shell，复用 CLI 的 Agent 注册和记忆栈。

```bash
npm run dev:tui
```

## CLI 示例

```bash
# 一次性提问
PARENTING_DATA_DIR="$(mktemp -d)" npx tsx packages/cli/src/index.ts ask "孩子挑食怎么办"

# 创建并查看孩子档案
TMP=$(mktemp -d)
PARENTING_DATA_DIR="$TMP" npx tsx packages/cli/src/index.ts add-child alice 爱丽丝 2024-06-19
PARENTING_DATA_DIR="$TMP" npx tsx packages/cli/src/index.ts list
```

## CI & e2e

两条 GitHub Actions workflow：

- `.github/workflows/ci.yml` — PR / push 到 `main` / `feature/**` 时触发。`test-coverage` job 跑 `npm run test:coverage` 加 `build:agents` 和 `build:web`，是机器验收的硬门槛。
- `.github/workflows/deploy-web.yml` — push 到 `main` 时自动部署 web 控制台到 GitHub Pages。

Playwright e2e specs 在 `apps/web/e2e/`，跑在 production 构建的 `vite preview` 上。本地跑：

```bash
cd apps/web
npx playwright install chromium
npx playwright test --project=chromium
```

注意事项：

- web-safe memory shim 修复后，Playwright 本地 Chromium 预期应通过。
- 如果 app root 缺失，先检查浏览器 console 是否有 `browser-external:fs`、`browser-external:util` 或 `better-sqlite3` 错误；这些说明 native 依赖泄漏进浏览器 bundle。

## 开发约定

- 每个专家 Agent 都是 `packages/agents/<name>` 下的独立 npm workspace。
- 新增 Agent 时必须同步 orchestrator topic detection、CLI 注册、Web orchestrator 注册，以及相关测试里的 Agent 数量断言。
- README 命令属于验收范围：脚本、构建步骤或验证方式变化时，必须同步更新 README 和 README.zh-CN.md。
- Web 端不要直接使用 SQLite 版 `MemoryLayer`；浏览器代码应使用 `WebMemoryLayer`。

## 许可证

MIT。
