# Documentation Index

> **Purpose**: Master navigation for all project documentation
> **Last Updated**: 2025-01-14
> **Project**: Product Lifecycle Management Platform

[← Back to Root](../README.md)

---

## Quick Start

| I want to... | Go to |
| ------------ | ----- |
| Understand the architecture | [ARCHITECTURE_CONSOLIDATION.md](ARCHITECTURE_CONSOLIDATION.md) |
| See current progress | [planning/PROGRESS.md](planning/PROGRESS.md) |
| Start implementing | [implementation/README.md](implementation/README.md) |
| Look up an API | [reference/API_REFERENCE.md](reference/API_REFERENCE.md) |
| Find code patterns | [reference/CODE_PATTERNS.md](reference/CODE_PATTERNS.md) |

---

## 📂 AI-Friendly Split Versions

Large documents have been split into smaller files (<800 lines) for better AI context handling:

| Original | Split Location | Parts |
| -------- | -------------- | ----- |
| API_REFERENCE.md | [reference/api-reference/](reference/api-reference/README.md) | 5 endpoint files |
| CHANGELOG.md | [reference/changelog/](reference/changelog/README.md) | 3 time periods |
| CODE_PATTERNS.md | [reference/code-patterns/](reference/code-patterns/README.md) | 2 parts |
| SHADCN_REGISTRY_COMPONENT_GUIDE.md | [reference/shadcn/](reference/shadcn/README.md) | 2 parts |
| PROGRESS.md | [planning/progress/](planning/progress/README.md) | 2 parts |
| MASTER_IMPLEMENTATION_ROADMAP.md | [planning/roadmap/](planning/roadmap/README.md) | 2 parts |
| database-schema.md | [architecture/schema/](architecture/schema/README.md) | 2 parts |
| ARCHITECTURE.md | [architecture/diagrams/](architecture/diagrams/README.md) | 2 parts |
| work-board-3.0.md | [implementation/work-board/](implementation/work-board/README.md) | 2 parts |
| AI_TOOL_ARCHITECTURE.md | [implementation/week-7/advanced-ai-system/](implementation/week-7/advanced-ai-system/README.md) | 6 phase files |

> **Tip**: Use split versions when working with AI assistants for better context handling.

---

## Documentation Structure

```text
docs/
├── ARCHITECTURE_CONSOLIDATION.md  ← Canonical source of truth
├── INDEX.md                       ← You are here
│
├── architecture/                  Technical diagrams & schemas
├── implementation/                Week-by-week build guide
├── reference/                     API, patterns, technical specs
├── planning/                      Progress, roadmap, next steps
├── postponed/                     Deferred features
├── research/                      ADRs, UX research
├── processes/                     Workflows, checklists
├── testing/                       QA, security
└── archive/                       Obsolete/stale docs
```

---

## Primary Documents

| Document | Purpose |
| -------- | ------- |
| [ARCHITECTURE_CONSOLIDATION.md](ARCHITECTURE_CONSOLIDATION.md) | Core architecture decisions (canonical) |
| [planning/PROGRESS.md](planning/PROGRESS.md) | Weekly implementation status |
| [implementation/README.md](implementation/README.md) | Week-by-week build guide |
| [reference/API_REFERENCE.md](reference/API_REFERENCE.md) | 20+ API endpoint specs |

---

## By Folder

### [architecture/](architecture/README.md) - Technical Architecture

Supplementary architecture docs with detailed diagrams.

| Document | Purpose |
| -------- | ------- |
| [ARCHITECTURE.md](architecture/ARCHITECTURE.md) | System diagrams, data flows |
| [database-schema.md](architecture/database-schema.md) | PostgreSQL schema, RLS |

### [implementation/](implementation/README.md) - Build Guide

Week-by-week implementation with code patterns.

| Document | Purpose |
| -------- | ------- |
| [week-1-2-foundation.md](implementation/week-1-2-foundation.md) | Auth, teams, RLS |
| [week-3-mind-mapping.md](implementation/week-3-mind-mapping.md) | ReactFlow canvas |
| [week-4-dependencies.md](implementation/week-4-dependencies.md) | Feature CRUD |
| [week-5-review-system.md](implementation/week-5-review-system.md) | Feedback system |
| [week-6-timeline-execution.md](implementation/week-6-timeline-execution.md) | Gantt, Work Items |
| [week-7/](implementation/week-7/README.md) | AI chat, analytics (split into 5 files) |
| [week-8-billing-testing.md](implementation/week-8-billing-testing.md) | Stripe, E2E tests |

### [reference/](reference/README.md) - Technical References

API specs, code patterns, developer guides.

| Document | Purpose |
| -------- | ------- |
| [API_REFERENCE.md](reference/API_REFERENCE.md) | All API endpoints |
| [CODE_PATTERNS.md](reference/CODE_PATTERNS.md) | TypeScript, Supabase patterns |
| [DEVELOPER_WORKFLOW.md](reference/DEVELOPER_WORKFLOW.md) | Git workflow guide |
| [CHANGELOG.md](reference/CHANGELOG.md) | Migration history |

### [planning/](planning/README.md) - Project Management

Progress tracking, roadmap, priorities.

| Document | Purpose |
| -------- | ------- |
| [PROGRESS.md](planning/PROGRESS.md) | Weekly status tracker |
| [NEXT_STEPS.md](planning/NEXT_STEPS.md) | Immediate priorities |
| [MASTER_IMPLEMENTATION_ROADMAP.md](planning/MASTER_IMPLEMENTATION_ROADMAP.md) | Full roadmap |

### [postponed/](postponed/README.md) - Deferred Features

Features strategically postponed due to dependencies.

| Document | Purpose |
| -------- | ------- |
| [MIND_MAP_ENHANCEMENTS.md](postponed/MIND_MAP_ENHANCEMENTS.md) | 23 mind map features |
| [CROSS_TEAM_CONFIGURATION.md](postponed/CROSS_TEAM_CONFIGURATION.md) | Multi-department views |
| [PRODUCT_STRATEGY_FOUNDATION.md](postponed/PRODUCT_STRATEGY_FOUNDATION.md) | Strategy layer |

### [research/](research/README.md) - Architecture Decisions

ADRs and UX research findings.

| Subfolder | Purpose |
| --------- | ------- |
| [architecture-decisions/](research/architecture-decisions/) | Technical ADRs |
| [core-research/](research/core-research/) | Main research findings |
| [supporting-research/](research/supporting-research/) | Additional research |

### [processes/](processes/README.md) - Workflows

Development workflows and checklists.

| Document | Purpose |
| -------- | ------- |
| [MAKER_WORKFLOW.md](processes/MAKER_WORKFLOW.md) | 7-step dev workflow |
| [DOCUMENTATION_AUDIT_CHECKLIST.md](processes/DOCUMENTATION_AUDIT_CHECKLIST.md) | Doc sync checklist |

### [testing/](testing/README.md) - Quality Assurance

Testing guides and security audits.

| Document | Purpose |
| -------- | ------- |
| [E2E_TEST_GUIDE.md](testing/E2E_TEST_GUIDE.md) | Playwright testing |
| [SECURITY_AUDIT_REPORT.md](testing/SECURITY_AUDIT_REPORT.md) | Security findings |

### [archive/](archive/) - Obsolete Documentation

Stale or superseded documentation kept for reference.

| Document | Reason Archived |
| -------- | --------------- |
| [WORKSPACE_MODES.md](archive/WORKSPACE_MODES.md) | Feature already implemented (2025-12-02) |

---

## External Links

- [Next.js Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [shadcn/ui Docs](https://ui.shadcn.com)
- [ReactFlow Docs](https://reactflow.dev)
- [Playwright Docs](https://playwright.dev)

---

[← Back to Root](../README.md)
