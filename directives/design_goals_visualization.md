# Directive: Design Goals/Releases Visualization

## Objective
Research and design a visual storytelling system for Goals/Releases that replaces the current Schedule tab's milestone complexity with something simpler and more compelling.

## Context
- Current Schedule tab has 3 views (Timeline, Board, Roadmap) - overly complex
- Milestones operate at the User Story level, creating cognitive overhead
- We want Goals/Releases to operate at the Feature/Epic level instead
- Need visual storytelling that communicates progress, timeline, and priorities at a glance

## Research Questions

### 1. What visualization patterns work best for goal tracking?
- Roadmap timelines (horizontal)
- Progress rings/radials
- Kanban-style goal boards
- Burndown/burnup charts
- Milestone markers on timelines
- Swimlane diagrams
- Tree/hierarchy views

### 2. What makes visualization "tell a story"?
- Clear narrative arc (where we started, where we are, where we're going)
- Visual hierarchy that guides the eye
- Color coding that conveys meaning (status, priority, risk)
- Animation/transitions that show change over time
- Contextual information on hover/click
- Celebratory moments (completed goals)

### 3. What data do we have to visualize?
- Epics (high-level themes)
- Features (deliverable units within epics)
- User Stories (work items within features)
- Status (Not Started, In Progress, Testing, Done, Blocked)
- Priority (P0, P1, P2)
- Team assignments
- Dates (target dates, potentially start dates)

### 4. What's the ideal information hierarchy?
- Goals/Releases → Features → (User Stories aggregated as progress %)
- NOT: Goals → Individual User Stories (too granular)

## Design Principles
1. **Simplicity over completeness** - One great view beats three mediocre ones
2. **Aggregate, don't itemize** - Show Feature completion %, not individual stories
3. **Time as context, not constraint** - Show when things are targeted, but focus on progress
4. **Celebrate wins** - Visual feedback when goals/features complete
5. **Scannable** - Executive should understand status in 5 seconds

## Output Expected
1. Recommended visualization approach (with rationale)
2. Data model changes needed (Goal entity, Feature.target_date, etc.)
3. Component architecture sketch
4. Key interactions (create goal, assign features, view progress)
5. Visual design inspiration/references

## Tools Available
- WebSearch for visualization best practices
- WebFetch for specific design system references
- File reading for understanding current codebase

## Success Criteria
- Single, compelling visualization that replaces 3 current views
- Clear connection to Epic/Feature hierarchy from Plan tab
- Progress visible at multiple levels (Goal → Feature → aggregate stories)
- Timeline/roadmap element for "when" context
- Feels modern, clean, and motivating
