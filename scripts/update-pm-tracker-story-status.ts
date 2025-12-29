import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ialckybbgkleiryfexlp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlhbGNreWJiZ2tsZWlyeWZleGxwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0ODg0MjYsImV4cCI6MjA4MTA2NDQyNn0.FcVSUxjqPId2NBEIjs_lVj9PVWc92eJaO6bnBlT95cc';

const supabase = createClient(supabaseUrl, supabaseKey);

// Status mapping based on gap analysis
// 'Done' = Fully implemented
// 'In Progress' = Partial implementation
// 'Not Started' = Missing/Gap

interface StoryStatusUpdate {
    pattern: string; // Substring to match in narrative
    status: 'Done' | 'In Progress' | 'Not Started';
    reason: string;
}

// Feature 1: Epic-Feature-Story Hierarchy Management
const hierarchyStories: StoryStatusUpdate[] = [
    { pattern: 'create a new epic with a descriptive name', status: 'Done', reason: 'Epic CRUD implemented in miller-layout.tsx' },
    { pattern: 'create features within an epic', status: 'Done', reason: 'Feature creation in feature-nav-column.tsx' },
    { pattern: 'navigate through the Epic-Feature-Story hierarchy using Miller Columns', status: 'Done', reason: 'Full 4-column Miller layout with URL state' },
    { pattern: 'view user stories within a selected feature', status: 'Done', reason: 'Story display in user-story-column.tsx' },
    { pattern: 'edit epic, feature, and story details in-place', status: 'Done', reason: 'Edit dialogs for all entity types' },
    { pattern: 'see progress indicators for epics and features', status: 'Done', reason: 'Progress bars in feature cards' },
    { pattern: 'move features between epics', status: 'In Progress', reason: 'Reordering works, cross-epic move not implemented' },
    { pattern: 'bulk select and perform actions', status: 'In Progress', reason: 'Bulk assign exists, no bulk delete/status change' },
    { pattern: 'search across all epics, features, and stories', status: 'Not Started', reason: 'No global search functionality' },
];

// Feature 2: AI-Powered Story Generation
const aiStories: StoryStatusUpdate[] = [
    { pattern: 'generate user stories from a feature description', status: 'Done', reason: 'story-generator.ts + API endpoint' },
    { pattern: 'avoid generating duplicate stories', status: 'Done', reason: 'Diff-based generation with existing story analysis' },
    { pattern: 'automatically prioritized', status: 'Done', reason: 'Priority assignment in generation prompt' },
    { pattern: 'view AI generation context and rationale', status: 'Done', reason: 'feature_context and generation_notes in response' },
    { pattern: 'regenerate stories with modified prompts', status: 'Done', reason: 'additionalInstructions parameter supported' },
    { pattern: 'specify custom persona types', status: 'Not Started', reason: 'Fixed personas only' },
    { pattern: 'metrics on AI generation usage', status: 'Not Started', reason: 'No analytics on AI generation' },
];

// Feature 3: Goals and Release Timeline
const goalsStories: StoryStatusUpdate[] = [
    { pattern: 'create release milestones with target dates', status: 'Done', reason: 'Milestone creation with dates' },
    { pattern: 'create goals within releases and assign user stories', status: 'Done', reason: 'Goals with story assignment' },
    { pattern: 'view a visual timeline showing Now/Next/Later', status: 'Done', reason: 'goals-timeline.tsx' },
    { pattern: 'automatic health indicators for goals', status: 'Done', reason: 'calculateGoalHealth() function' },
    { pattern: 'view the goals timeline to see upcoming releases', status: 'Done', reason: 'Read-only view available' },
    { pattern: 'high-level timeline showing release dates', status: 'Done', reason: 'Dashboard shows goal health' },
    { pattern: 'drag and drop releases to adjust target dates', status: 'In Progress', reason: 'Move between horizons exists, date adjustment via dialog' },
    { pattern: 'automated notifications for approaching goal deadlines', status: 'Not Started', reason: 'No notification system' },
];

// Feature 4: Milestone Board with Story Assignment
const milestoneStories: StoryStatusUpdate[] = [
    { pattern: 'view a milestone board with columns', status: 'Done', reason: 'milestone-board.tsx' },
    { pattern: 'drag user stories from the backlog onto milestone columns', status: 'Done', reason: 'Full drag-drop support' },
    { pattern: 'see capacity warnings', status: 'Not Started', reason: 'No WIP limits or capacity tracking' },
    { pattern: 'view the milestone board to see what stories are assigned', status: 'Done', reason: 'milestone-column.tsx' },
    { pattern: 'reorder stories within milestone columns', status: 'Done', reason: 'Drag-and-drop reordering' },
    { pattern: 'create and configure new milestones directly from the board', status: 'Done', reason: 'create-milestone-dialog.tsx' },
    { pattern: 'see milestone progress indicators', status: 'Done', reason: 'Progress bars and status badges' },
    { pattern: 'bulk assign stories to milestones', status: 'Done', reason: 'bulkAssignStories() function' },
    { pattern: 'filter and search stories on the milestone board', status: 'Done', reason: 'milestone-board-filters.tsx' },
];

// Feature 5: Kanban Execution Board
const kanbanStories: StoryStatusUpdate[] = [
    { pattern: 'view all my assigned stories in a Kanban board', status: 'Done', reason: 'kanban-board.tsx with 6 columns' },
    { pattern: 'drag and drop story cards between status columns', status: 'Done', reason: 'Full DnD support' },
    { pattern: 'click on a story card to open a detailed drawer', status: 'Done', reason: 'story-detail-drawer.tsx' },
    { pattern: 'filter the Kanban board by assignee, priority', status: 'Done', reason: 'Workstream filtering in execute tab' },
    { pattern: 'view a read-only Kanban board', status: 'Done', reason: 'Same board works for viewing' },
    { pattern: 'customize Kanban column names', status: 'Not Started', reason: 'Fixed 6 columns, no customization' },
    { pattern: 'visual indicators for blocked or at-risk stories', status: 'Done', reason: 'Red badges, blocked column' },
];

// Feature 6: Executive Dashboard and Analytics
const dashboardStories: StoryStatusUpdate[] = [
    { pattern: 'view a high-level project health dashboard', status: 'Done', reason: 'executive-dashboard.tsx with hero health panel' },
    { pattern: 'see at-risk items and blockers prominently', status: 'Done', reason: 'Attention panel, blocked count' },
    { pattern: 'view team workload distribution', status: 'Done', reason: 'TeamWorkloadPanel component' },
    { pattern: 'track milestone and deadline progress', status: 'Done', reason: 'UpcomingDeadlines component' },
    { pattern: 'see my personal workload and upcoming deadlines', status: 'Done', reason: 'Workload shown per team member' },
    { pattern: 'export dashboard data and generate reports', status: 'Not Started', reason: 'No export functionality' },
    { pattern: 'configure dashboard widgets and alerts', status: 'Not Started', reason: 'Fixed layout, no customization' },
];

// Feature 7: Real-time Collaboration System
const realtimeStories: StoryStatusUpdate[] = [
    { pattern: 'see live updates when other team members modify', status: 'In Progress', reason: 'Supabase subscription on pm_tasks only' },
    { pattern: 'see when other team members are actively viewing', status: 'Not Started', reason: 'No presence indicators' },
    { pattern: 'receive real-time notifications when critical', status: 'Not Started', reason: 'No notification system' },
    { pattern: 'Kanban board updates to be reflected immediately', status: 'In Progress', reason: 'Data refresh, not differential' },
    { pattern: 'executive dashboard to show live project health', status: 'Not Started', reason: 'Dashboard does not auto-refresh' },
    { pattern: 'broadcast announcements or urgent messages', status: 'Not Started', reason: 'No messaging system' },
    { pattern: 'see live activity feeds', status: 'Not Started', reason: 'No activity stream' },
];

// Feature 8: Data Management and Import/Export
const dataStories: StoryStatusUpdate[] = [
    { pattern: 'import project data from external sources', status: 'Not Started', reason: 'No import functionality' },
    { pattern: 'export project reports in multiple formats', status: 'Not Started', reason: 'No export functionality' },
    { pattern: 'backup and restore complete project datasets', status: 'Not Started', reason: 'No backup/restore' },
    { pattern: 'bulk update story statuses and assignments', status: 'In Progress', reason: 'Some bulk operations exist' },
    { pattern: 'export executive dashboard data', status: 'Not Started', reason: 'No export from dashboard' },
    { pattern: 'validate data integrity', status: 'In Progress', reason: 'Database constraints only' },
    { pattern: 'archive completed projects', status: 'Not Started', reason: 'No archive functionality' },
];

// Combine all status mappings
const allStatusMappings = [
    ...hierarchyStories,
    ...aiStories,
    ...goalsStories,
    ...milestoneStories,
    ...kanbanStories,
    ...dashboardStories,
    ...realtimeStories,
    ...dataStories,
];

async function main() {
    const epicId = 'EPIC-PMTRACKER-1766946622516';

    console.log('========================================');
    console.log('Updating PM Tracker Story Statuses');
    console.log('========================================\n');

    // Fetch all stories for this epic
    const { data: stories, error } = await supabase
        .from('pm_user_stories')
        .select('id, narrative, status')
        .eq('epic_id', epicId);

    if (error) {
        console.error('Error fetching stories:', error);
        return;
    }

    console.log(`Found ${stories?.length || 0} stories to update\n`);

    let updatedCount = 0;
    let doneCount = 0;
    let inProgressCount = 0;
    let notStartedCount = 0;

    for (const story of stories || []) {
        // Find matching status mapping
        const mapping = allStatusMappings.find(m =>
            story.narrative.toLowerCase().includes(m.pattern.toLowerCase())
        );

        if (mapping && story.status !== mapping.status) {
            const { error: updateError } = await supabase
                .from('pm_user_stories')
                .update({ status: mapping.status })
                .eq('id', story.id);

            if (updateError) {
                console.error(`  Error updating ${story.id}: ${updateError.message}`);
            } else {
                console.log(`✓ ${mapping.status.padEnd(12)} | ${story.narrative.substring(0, 60)}...`);
                console.log(`  Reason: ${mapping.reason}\n`);
                updatedCount++;
            }
        }

        // Count statuses
        const finalStatus = mapping?.status || story.status;
        if (finalStatus === 'Done') doneCount++;
        else if (finalStatus === 'In Progress') inProgressCount++;
        else notStartedCount++;
    }

    console.log('\n========================================');
    console.log('Update Complete');
    console.log('========================================');
    console.log(`Stories updated: ${updatedCount}`);
    console.log(`\nFinal Status Distribution:`);
    console.log(`  Done:         ${doneCount} stories`);
    console.log(`  In Progress:  ${inProgressCount} stories`);
    console.log(`  Not Started:  ${notStartedCount} stories`);
    console.log(`\nCompletion: ${Math.round((doneCount / (stories?.length || 1)) * 100)}%`);
}

main();
