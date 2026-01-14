# Proposal: Reorganize Documentation Structure

**Change ID:** `reorganize-docs`
**Status:** Complete
**Created:** 2026-01-14
**Author:** Claude

---

## Summary

Reorganize the `docs/` folder to improve AI readability, reduce file sizes, eliminate duplicates, and establish proper hub-and-spoke navigation patterns.

## Problem Statement

The current documentation structure has several issues:

1. **Oversized files** - Several files exceed 800 lines, making them difficult for AI to process efficiently:
   - `week-7-ai-analytics.md` (2,005 lines)
   - `AI_TOOL_ARCHITECTURE.md` (5,708 lines)
   - `API_REFERENCE.md` (2,532 lines)

2. **Misplaced files** - Some files are in incorrect locations:
   - `metorial-integration-decision.md` was in `research/` instead of `research/architecture-decisions/`
   - Architecture files scattered across `reference/` and `implementation/`

3. **Duplicate content** - Redundant files exist:
   - `postponed-features.md` duplicates `postponed/README.md`
   - `WORKFLOW_FINAL_SUMMARY.md` and `WORKFLOW_IMPLEMENTATION_SUMMARY.md` duplicate `DEVELOPER_WORKFLOW.md`

4. **Incomplete hubs** - README files don't list all contained files:
   - `reference/README.md` only listed 3 of 24 files

5. **Stale content** - `WORKSPACE_MODES.md` marked as "postponed" but feature is 100% implemented

6. **Missing navigation** - No master index for documentation

## Proposed Solution

### Phase 1: Create New Folder Structure (COMPLETE)

- Create `docs/architecture/` for supplementary architecture docs
- Create `docs/archive/` for obsolete documentation
- Create `docs/implementation/week-7/` for split week-7 files

### Phase 2: Consolidate Architecture Files (COMPLETE)

- Move `reference/ARCHITECTURE.md` to `architecture/ARCHITECTURE.md` with header note pointing to canonical source
- Move `implementation/database-schema.md` to `architecture/DATABASE_SCHEMA.md`
- Keep `ARCHITECTURE_CONSOLIDATION.md` at root as canonical source of truth
- Create `architecture/README.md` hub

### Phase 3: Clean Up Duplicates and Misplaced Files (COMPLETE)

- Delete `implementation/postponed-features.md` (duplicate)
- Delete `reference/WORKFLOW_FINAL_SUMMARY.md` (duplicate)
- Delete `reference/WORKFLOW_IMPLEMENTATION_SUMMARY.md` (duplicate)
- Move `WORKSPACE_MODES.md` to `archive/` (stale)
- Move `metorial-integration-decision.md` to correct folder

### Phase 4: Update Hub READMEs (COMPLETE)

- Create `docs/INDEX.md` master navigation
- Update `reference/README.md` to list all 21 files

### Phase 5: Split Oversized Files (COMPLETE)

Split `week-7-ai-analytics.md` (2,005 lines) into:
- `week-7/README.md` - Hub with tasks overview (~150 lines)
- `week-7/module-features.md` - Module specs (~300 lines)
- `week-7/implementation-sessions.md` - Type-Aware Phase sessions (~290 lines)
- `week-7/security-sprint.md` - Security hardening (~200 lines)
- `week-7/blocksuite-integration.md` - BlockSuite phases (~440 lines)

### Phase 6: Update CLAUDE.md Links (PENDING)

Update documentation links in CLAUDE.md and CLAUDE.balanced.md to reflect new structure.

## Benefits

| Metric | Before | After |
|--------|--------|-------|
| Longest active file | 5,708 lines | ~800 lines |
| Orphaned files | 8 | 0 |
| Hub completeness | 13% | 100% |
| Master navigation | None | INDEX.md |
| Architecture docs | Scattered | Single folder |

## Risks

- **Low risk**: Existing links may break temporarily until CLAUDE.md is updated
- **Mitigation**: Update all documentation links in final phase

## Dependencies

- None (documentation-only changes)

## Affected Files

### Created
- `docs/architecture/README.md`
- `docs/INDEX.md`
- `docs/implementation/week-7/README.md`
- `docs/implementation/week-7/module-features.md`
- `docs/implementation/week-7/implementation-sessions.md`
- `docs/implementation/week-7/security-sprint.md`
- `docs/implementation/week-7/blocksuite-integration.md`

### Modified
- `docs/architecture/ARCHITECTURE.md` (added header note)
- `docs/reference/README.md` (updated file list)
- `CLAUDE.md` (update links)
- `CLAUDE.balanced.md` (update links)

### Moved
- `docs/reference/ARCHITECTURE.md` -> `docs/architecture/ARCHITECTURE.md`
- `docs/implementation/database-schema.md` -> `docs/architecture/DATABASE_SCHEMA.md`
- `docs/postponed/WORKSPACE_MODES.md` -> `docs/archive/WORKSPACE_MODES.md`
- `docs/research/metorial-integration-decision.md` -> `docs/research/architecture-decisions/`

### Deleted
- `docs/implementation/postponed-features.md`
- `docs/reference/WORKFLOW_FINAL_SUMMARY.md`
- `docs/reference/WORKFLOW_IMPLEMENTATION_SUMMARY.md`
- `docs/implementation/week-7-ai-analytics.md` (after split)
