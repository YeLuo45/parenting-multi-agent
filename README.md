# Parenting Multi-Agent

AI-powered parenting assistant covering birth to college. Each role in the parenting system is an independent agent (pediatrician, psychologist, educator, nutritionist, sleep coach, family mediator, finance planner, legal advisor, parent support). An orchestrator routes parent questions to the right agent(s), and a layered memory (L0-L4) keeps a persistent profile of each child.

Built on top of [pi-mono](https://github.com/YeLuo45/pi-mono) agent framework (forked from upstream `parenting-multi-agent` branch, originally by `badlogicgames/pi-mono`).

## Why

Most new parents suffer from the same pains:
- 24/7 on-call, no time to read books or research
- Conflicting advice from every source (grandparents, internet, doctors, friends)
- Generic advice that doesn't match *their* child
- Stage-specific needs (newborn / toddler / school-age / teen / college-bound are completely different problems)
- Multiple domains to think about at once: health, education, psychology, sleep, nutrition, family dynamics, finance, law

No single human has all the answers. **parenting-multi-agent** puts a panel of specialized AI agents in the parent's pocket, coordinated by a smart orchestrator that knows your child's stage and history.

## Architecture

```
parenting-multi-agent/
├── packages/
│   ├── agent/             ← forked from @earendil-works/pi-agent-core (basic Agent runtime)
│   ├── ai/                ← forked from @earendil-works/pi-ai (unified LLM API: cloud + local)
│   ├── orchestrator/      ← OrchestratorCore: chatdev Puppeteer + nanobot MessageBus
│   ├── agents/
│   │   ├── pediatrician/  ← PediatricianAgent: health, vaccines, illness triage
│   │   ├── psychologist/  ← PsychologistAgent: emotions, behavior, milestones
│   │   └── educator/      ← EducatorAgent: schooling, interests, ability tracking
│   ├── memory/            ← MemoryLayer: L0-L4 hierarchical + SQLite (PowerSync-ready)
│   └── cli/               ← parenting CLI: `parenting ask "..."`
└── apps/
    └── web/               ← Vite + React Dashboard, deployed to GitHub Pages
```

### Multi-agent coordination

```
            ┌────────────┐
            │   Parent   │
            └─────┬──────┘
                  │ question
                  ▼
       ┌────────────────────┐
       │   OrchestratorCore │
       │  (Puppeteer +      │
       │   MessageBus)      │
       └────────┬───────────┘
                │ routes by age + topic
                ▼
   ┌─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┐
   │Ped. │Psych│Edu. │Nutr.│Slp. │Med. │Fin. │Leg. │... 9 agents
   └──┬──┴──┬──┴──┬──┴─────┴─────┴─────┴─────┴────┘
      │     │     │   (each runs on its own LLM call,
      │     │     │    subscribes to MessageBus)
      └─────┴─────┘
                │ coordinated reply
                ▼
       ┌────────────────────┐
       │    MemoryLayer     │  (records the Q&A, child state, stage)
       │   L0-L4 + SQLite   │
       └────────────────────┘
```

### L0-L4 layered memory (generic-agent pattern)

- **L0 rules**: safety guardrails (e.g. "always escalate red-flag symptoms to emergency care")
- **L1 index**: child profile metadata (name, age, stage, key facts)
- **L2 global**: long-term child history (vaccines, milestones, family events)
- **L3 episodic**: per-incident episodes (each Q&A, each doctor visit)
- **L4 working**: current session context (recent messages, active topic)

### LLM providers

Cloud + local dual mode, both via `pi-ai`:
- Cloud: Anthropic Claude, OpenAI GPT, Google Gemini
- Local: Ollama, vLLM (any OpenAI-compatible endpoint)

### Storage

Local-first SQLite via `better-sqlite3`. Optional cloud sync via PowerSync-style delta protocol (planned, see roadmap).

## Roadmap

| Phase | Scope | Engines | Status |
|-------|-------|---------|--------|
| 0 | Fork + skeleton (this commit) | — | ✅ |
| 1 | MVP pipeline: Orchestrator + 3 core agents + Memory | 5 | 🟡 5/5 |
| 2 | 8 agents + dual entry (CLI + Web) | +10 = 15 | 🔲 |
| 3 | 5-direction × 6 engines (standard 6-design distribution) | +15 = 30 | 🔲 |
| 4 | All 9 agents + RAG knowledge base | +30 = 60 | 🔲 |
| 5 | PowerSync + multi-device + self-evolution | +30 = 90 | 🔲 |

## Quick Start

```bash
# Install
npm install --ignore-scripts

# Build framework packages
npm run build:core
npm run build:agents

# Run the CLI
npm run start:cli -- ask "我家宝宝3个月，最近总是夜醒哭闹怎么办"

# Run the Web dashboard
npm run dev:web   # http://localhost:5173

# Run all tests
npm test
```

## Development

```bash
# Run a specific package's tests
cd packages/memory && npx vitest --run

# Type check everything
npm run check

# Format + lint
npx biome check --write .
```

## License

MIT (inherits from pi-mono fork)
