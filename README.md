# Parenting Multi-Agent

AI-powered parenting assistant covering birth to young adulthood. The project is an npm-workspaces TypeScript monorepo with a coordinator/orchestrator, a layered memory engine, CLI tooling, a Vite + React web dashboard, and 18 specialist parenting agents.

- Live demo: https://yeluo45.github.io/parenting-multi-agent/
- Chinese README: [README.zh-CN.md](./README.zh-CN.md)
- Quality gate: 100% test pass rate and at least 95% source coverage per workspace

## What It Does

Parents ask one question and the orchestrator routes it to the right experts based on age, stage, topic, red flags, and recent context.

Specialist agents currently include:

- Pediatrician: illness triage, vaccines, medication dosage guidance
- Psychologist: emotions, behavior, stress, attachment
- Educator: learning, schooling, interests, ability tracking
- Nutritionist: feeding, allergy, meal planning, picky eating
- Sleep coach: sleep schedules, night waking, regressions
- Family mediator: family conflict and communication
- Finance: childcare budgets and education savings
- Parent support: caregiver stress and burnout
- Growth tracker: height, weight, percentiles, milestones
- Habit builder: routines, screen time, bedtime, habit loops
- Knowledge RAG: evidence-based parenting FAQ and references
- Safety guard: hazard prevention, first aid, emergency escalation
- Social: sharing, friendship, playdates, peer pressure
- School readiness: kindergarten and primary-school transition
- College prep: applications, planning, readiness
- Career: teen/young-adult career planning
- Legal: custody, consent, guardianship, age-related legal concerns
- Sibling: sibling rivalry, fairness, family role balance

## Architecture

```text
parenting-multi-agent/
├── packages/
│   ├── orchestrator/          # OrchestratorCore + MessageBus + routing types
│   ├── memory/                # L0-L4 memory + SQLite + sync delta log
│   ├── cli/                   # parenting CLI commands and REPL helpers
│   └── agents/                # 18 specialist agent workspaces
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
    └── web/                   # Vite + React dashboard with theme and i18n
```

## Coordination Flow

```text
Parent question
      │
      ▼
OrchestratorCore ── age/stage/topic/red-flag routing ──► Specialist agents
      │                                                   Ped / Psy / Edu / Nutr / Sleep
      │                                                   Family / Finance / Support
      │                                                   Growth / Habit / RAG / Safety
      │                                                   Social / School / College
      │                                                   Career / Legal / Sibling
      ▼
MemoryLayer L0-L4 stores profiles, sessions, episodes, facts, feedback, and sync deltas
```

## Quality Gate

The project target is:

- Test pass rate: 100%
- Full workspace source coverage: at least 95%
- Agent workspaces: generally 100% lines/statements/functions/branches
- Web workspace: at least 95% overall source coverage, with React/UI branch exceptions documented by coverage output

Latest verified command:

```bash
NODE_ENV=development npm run test:coverage
```

Verified result in this workspace:

- Total tests: 1274 passed
- Full workspace pass rate: 100%
- Lowest overall workspace coverage: `@parenting/web` branch coverage 95.19%, lines 98.79%, statements 98.79%, functions 97.94%

## Verified Commands

All commands below were executed successfully in `/home/hermes/projects/parenting-multi-agent`.

```bash
# Install dependencies, including dev dependencies in WSL environments
NODE_ENV=development npm install --no-audit --no-fund --include=dev

# Build core runtime packages
npm run build:agents

# Build the web dashboard
npm run build:web

# Run the full test and coverage gate
NODE_ENV=development npm run test:coverage

# Run web-only coverage
NODE_ENV=development npm test -w @parenting/web -- --coverage

# Run one specialist agent's coverage
NODE_ENV=development npm test -w @parenting/agent-legal -- --coverage

# Start the web dashboard dev server
npm run dev:web
# Then open http://localhost:5173/parenting-multi-agent/

# Start the TUI mode
npm run dev:tui

# Start the CLI mode
npm run dev:cli

# CLI emergency triage smoke test
PARENTING_DATA_DIR="$(mktemp -d)" npx tsx packages/cli/src/index.ts ask "我家宝宝3个月发烧38.5度怎么办"

# CLI child profile smoke test
TMP=$(mktemp -d)
PARENTING_DATA_DIR="$TMP" npx tsx packages/cli/src/index.ts add-child alice 爱丽丝 2024-06-19
PARENTING_DATA_DIR="$TMP" npx tsx packages/cli/src/index.ts list
```

Notes:

- `npm run dev:web` starts a long-lived Vite server. Run it as a background process in automation, then verify readiness separately.
- `npm run build:web` must not print `better-sqlite3` / `browser-external:fs` / `browser-external:util` warnings. The browser runtime uses a Vite alias to a web-safe memory shim plus `WebMemoryLayer`, so native SQLite code is never loaded in client code.
- Use `NODE_ENV=development` for installs/tests in WSL so dev dependencies are not skipped.

## Web Dashboard

The web app uses:

- Vite + React + TypeScript
- Four themes: light, dark, sepia, nord
- Two locales: `zh-CN` and `en`
- `WebMemoryLayer`, a browser-safe in-memory implementation of the orchestrator memory interface
- Memory dashboard helpers for profile validation, sync health, CRUD management, and feedback analytics
- Vite manual chunking keeps React vendor code separate from the parenting runtime bundle without circular chunks

Build output is generated by:

```bash
npm run build:web
```

Development server:

```bash
npm run dev:web
# open http://localhost:5173/parenting-multi-agent/
```

## TUI Mode

The TUI mode is a terminal-first interactive shell using the same agent registration and memory stack as the CLI.

```bash
npm run dev:tui
```

## CLI Examples

```bash
# Ask a one-off parenting question
PARENTING_DATA_DIR="$(mktemp -d)" npx tsx packages/cli/src/index.ts ask "孩子挑食怎么办"

# Create and list child profiles
TMP=$(mktemp -d)
PARENTING_DATA_DIR="$TMP" npx tsx packages/cli/src/index.ts add-child alice 爱丽丝 2024-06-19
PARENTING_DATA_DIR="$TMP" npx tsx packages/cli/src/index.ts list
```

## CI & e2e

Two GitHub Actions workflows:

- `.github/workflows/ci.yml` — runs on PR and push to `main` / `feature/**`. Job `test-coverage` runs `npm run test:coverage` plus `build:agents` and `build:web`. This is the authoritative quality gate.
- `.github/workflows/deploy-web.yml` — auto-deploys the built web dashboard to GitHub Pages on push to `main`.

Playwright e2e specs live under `apps/web/e2e/` and run against `vite preview` of the production build. Locally:

```bash
cd apps/web
npx playwright install chromium
npx playwright test --project=chromium
```

Notes:

- Playwright is expected to pass locally with Chromium after the web-safe memory shim fix.
- If the app root is missing, first check browser console for `browser-external:fs`, `browser-external:util`, or `better-sqlite3` errors; those indicate a native dependency leaked into the browser bundle.

## Development Notes

- Each specialist agent is an independent npm workspace under `packages/agents/<name>`.
- New agents must be registered in orchestrator topic detection, CLI creation, and web orchestrator setup.
- README commands are part of acceptance: update this file whenever scripts, build steps, or verification commands change.
- Avoid direct browser use of SQLite-backed `MemoryLayer`; web code should use `WebMemoryLayer`.

## License

MIT.
