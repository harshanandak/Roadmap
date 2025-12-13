# ARCHITECTURE CONSOLIDATION - Master Reference

**Created**: 2025-12-11
**Updated**: 2025-12-13 (Migrated to 4-Phase System)
**Purpose**: Single source of truth for platform architecture decisions
**Status**: CANONICAL - All other docs should align with this

---

## 1. CORE ARCHITECTURE PRINCIPLES

### 1.1 Two-Layer System (NOT Three)

```
WORKSPACE (Aggregation View)
├── mode: development | launch | growth | maintenance
├── Shows: Phase DISTRIBUTION across all work items
│   Example: "10 in design, 15 in build, 8 in refine..."
│
└── WORK ITEMS (Each has own phase)
    ├── phase: design | build | refine | launch
    │         ↑ THIS IS THE STATUS - No separate status field!
    │
    └── TIMELINE ITEMS (MVP/SHORT/LONG breakdowns)
        └── status: not_started | in_progress | blocked | completed | on_hold | cancelled
                    ↑ Separate status for task-level execution tracking
```

### 1.2 Critical Clarifications

| Concept | Correct Understanding | Common Misconception |
|---------|----------------------|---------------------|
| **Phase vs Status** | Phase IS the status for work items | They are separate fields |
| **Workspace Stage** | Shows AGGREGATION (distribution) | Has single stage value |
| **Timeline Status** | Separate field for execution tasks | Same as work item phase |
| **Design Thinking** | Methodology/framework for HOW to work | Lifecycle stages |

---

## 2. PHASE SYSTEM (4-Phase)

### 2.1 Work Item Phases (= Status)

| Phase | Description | Focus Area |
|-------|-------------|------------|
| **design** | Research, ideation, problem definition | Empathy, user needs, scope planning |
| **build** | Active development work | Building, coding, creating |
| **refine** | Testing, validation, iteration | Quality, user testing, feedback |
| **launch** | Shipped, deployed, done | Release, retrospective, metrics |

### 2.2 Phase Mapping (Migration Reference)

| Old (5-Phase) | New (4-Phase) | Rationale |
|--------------|---------------|-----------|
| research, planning | **design** | Combined into single ideation phase |
| execution | **build** | Clearer active development |
| review | **refine** | Better reflects iteration nature |
| complete | **launch** | Action-oriented completion |

### 2.3 Timeline Item Status (Separate)

| Status | Description |
|--------|-------------|
| `not_started` | Task created but not begun |
| `in_progress` | Actively being worked on |
| `blocked` | Cannot proceed due to dependency |
| `completed` | Task finished |
| `on_hold` | Paused intentionally |
| `cancelled` | No longer needed |

### 2.4 Phase Transition Requirements

| From → To | Required Fields | Rationale |
|-----------|-----------------|-----------|
| design → build | `purpose` filled, 1+ timeline items OR scope defined | Ready to build |
| build → refine | `progress_percent` >= 80, `actual_start_date` set | Work substantially done |
| refine → launch | Feedback addressed, quality approved | Ready to ship |

### 2.5 Phase Upgrade Prompting

- **Threshold**: 80% field completion
- **Level**: Work item (NOT workspace)
- **Frequency**: Real-time as fields are filled
- **UI**: Banner in work item detail header

---

## 3. WORKSPACE MODES

### 3.1 Four Lifecycle Modes

| Mode | Description | Default Phase | Type Weight Focus |
|------|-------------|---------------|-------------------|
| **development** | Building from scratch | design | feature (10), concept (9) |
| **launch** | Racing to release | build | bug (10), feature (8) |
| **growth** | Iterating on feedback | refine | enhancement (9), feature (7) |
| **maintenance** | Stability focus | build | bug (10), enhancement (5) |

### 3.2 Workspace Does NOT Have Stage

- Workspace shows **phase distribution** across work items
- NO single `workspace.stage` or `workspace.launch_stage` field
- Dashboard displays: "Design: 10, Build: 15, Refine: 8..."

---

## 4. DESIGN THINKING METHODOLOGY

### 4.1 What Design Thinking IS

Design Thinking is a **human-centered, iterative methodology** for HOW to implement ideas:
- NOT lifecycle stages
- NOT a replacement for phases
- GUIDES the approach at each phase

### 4.2 Major Frameworks

| Framework | Source | Key Stages |
|-----------|--------|------------|
| **d.school 5 Modes** | Stanford | Empathize → Define → Ideate → Prototype → Test |
| **Double Diamond** | British Design Council | Discover → Define → Develop → Deliver |
| **IDEO HCD** | IDEO | Inspiration → Ideation → Implementation |
| **Enterprise DT** | IBM | The Loop + Hills, Playbacks, Sponsor Users |

### 4.3 Mapping to Platform Phases

| Platform Phase | DT Methods | Guiding Questions |
|----------------|------------|-------------------|
| **Design** | Empathy Maps, Interviews, Personas, HMW Questions | "Who has this problem? What's the MVP?" |
| **Build** | Rapid Prototyping, Storyboards, Sprints | "How do we build it?" |
| **Refine** | Usability Testing, Playbacks, Iteration | "Does it solve the problem?" |
| **Launch** | Release Planning, Retrospectives | "What did we learn?" |

### 4.4 AI Integration

- AI ACTIVELY suggests Design Thinking methods
- Shows guiding questions as tooltips/hints
- References case studies for inspiration
- Knows other frameworks (Agile, Lean Startup, JTBD)

---

## 5. STRATEGY SYSTEM

### 5.1 Four-Tier Hierarchy (Phase-Agnostic)

```
ORGANIZATION STRATEGY (Pillars - Team-wide)
    └── TEAM STRATEGY (Objectives - Department)
         └── WORK ITEM STRATEGY (Alignment - Feature)
              └── PROCESS STRATEGY (Methodology - Execution)
```

### 5.2 Strategy Levels

| Level | Name | Fields | Display |
|-------|------|--------|---------|
| **Pillar** | Organization-wide theme | user_stories, case_studies, examples | Full tree view |
| **Objective** | Team/department goal | metrics, owners | Nested under pillar |
| **Key Result** | Measurable outcome | target, actual | Progress indicators |
| **Initiative** | Specific action | timeline, assignees | Task-like cards |

### 5.3 Different Displays by Context

**Organization Level**:
- Full strategy tree
- High-level metrics
- User stories, case studies
- Team-wide alignment

**Work Item Level**:
- Derived/aligned strategies only
- Alignment strength (weak/medium/strong)
- Specific requirements for this item
- Actionable view

### 5.4 New Database Fields (Pillar Level)

```sql
user_stories TEXT[]     -- User story examples
user_examples TEXT[]    -- Real user examples
case_studies TEXT[]     -- Reference case studies
```

---

## 6. PERIODIC ANALYSIS

### 6.1 Workspace Analysis

- **Frequency**: Every 2-3 days OR change-based
- **Purpose**: Detect phase mismatches, suggest upgrades
- **Trigger**: User button OR AI suggestion

### 6.2 Analysis Output

```typescript
interface WorkspaceAnalysis {
  phaseDistribution: Record<Phase, { count: number, percentage: number }>
  mismatchedItems: { workItemId, currentPhase, suggestedPhase, reason }[]
  upgradeOpportunities: { workItemId, canUpgradeTo, readinessPercent }[]
  healthScore: number  // 0-100
}
```

---

## 7. TAB & FIELD CONFIGURATION

### 7.1 Eight Tabs (Phase-Aware)

| Tab | design | build | refine | launch |
|-----|:------:|:-----:|:------:|:------:|
| Summary | ✓ | ✓ | ✓ | ✓ |
| Inspiration | ✓ | - | - | - |
| Resources | ✓ | ✓ | ✓ | ✓ |
| Scope | ✓ | ✓ | ✓ | ✓ |
| Tasks | - | ✓ | ✓ | ✓ |
| Feedback | - | ✓ | ✓ | ✓ |
| Metrics | - | ✓ | ✓ | ✓ |
| AI Copilot | ✓ | ✓ | ✓ | ✓ |

### 7.2 Three Field Groups (Progressive Disclosure)

**Group 1: Basic** (Always visible)
- name, purpose, type, tags

**Group 2: Planning** (Design+, some fields LOCKED from Build+)
- target_release, acceptance_criteria, business_value, customer_impact
- strategic_alignment, estimated_hours, priority, stakeholders

**Group 3: Execution** (Build+)
- actual_start_date, actual_end_date, actual_hours
- progress_percent, blockers

---

## 8. KNOWN ISSUES (Session 1 Complete)

| Issue | Status | Resolution |
|-------|--------|------------|
| Phase calculation overlap | ✅ FIXED | workspace-phases.tsx updated |
| No phase transition validation | ✅ FIXED | isValidPhaseTransition() added |
| No phase transition timestamps | ✅ FIXED | phase_transitions JSONB added |
| progress_percent no 0-100 validation | ✅ FIXED | Validation in API routes |
| 5-phase to 4-phase migration | ✅ DONE | Database migration applied |

---

## 9. TERMINOLOGY GLOSSARY

| Term | Definition | NOT This |
|------|------------|----------|
| **Workspace** | A product/project container | Organization |
| **Work Item** | Feature, bug, enhancement, concept | Task |
| **Timeline Item** | MVP/SHORT/LONG breakdown task | Work Item |
| **Phase** | Work item lifecycle stage (= status): design, build, refine, launch | Separate from status |
| **Mode** | Workspace lifecycle context | Stage |
| **Stage** | (Deprecated) Use "Phase" for work items | - |

---

## 10. IMPLEMENTATION SESSIONS

### Session 1: Fix Phase Bugs ✅ COMPLETE (2025-12-13)
- ✅ Fixed calculation logic overlap
- ✅ Migrated from 5-phase to 4-phase system
- ✅ Added transition validation (isValidPhaseTransition)
- ✅ Added phase_transitions JSONB column
- ✅ Applied database migration

### Session 2: Phase Upgrade Prompts ⏳ PENDING
- Create readiness calculator
- Build upgrade prompt UI
- Add guiding questions

### Session 3: Workspace Analysis ⏳ PENDING
- Create analyzer service
- Build health card
- Add API endpoint

### Session 4: Design Thinking Integration ⏳ PENDING
- Add methodology guidance
- Include other frameworks
- AI active integration

### Session 5: Strategy Customization ⏳ PENDING
- Add new fields
- Org-level display component
- Work-item-level display component

### Session 6: Polish ⏳ PENDING
- Feedback conversion
- Workspace card update
- E2E testing

---

**This document is the CANONICAL source. All other docs should reference or align with this.**
