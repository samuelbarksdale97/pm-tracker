import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ialckybbgkleiryfexlp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlhbGNreWJiZ2tsZWlyeWZleGxwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0ODg0MjYsImV4cCI6MjA4MTA2NDQyNn0.FcVSUxjqPId2NBEIjs_lVj9PVWc92eJaO6bnBlT95cc';

const supabase = createClient(supabaseUrl, supabaseKey);

// Milestone definitions based on gap analysis
// Organized by theme and priority to create a logical roadmap
const milestoneDefinitions = [
    {
        name: 'M1: Core Completion',
        description: 'Complete remaining P0/P1 stories for core hierarchy and execution features',
        targetDate: 14, // days from now
        storyPatterns: [
            'search across all epics', // Global search - P2 but high value
            'move features between epics', // Partial - needs completion
            'bulk select and perform actions', // Partial - needs completion
        ],
        color: '#3B82F6', // Blue
    },
    {
        name: 'M2: AI Enhancement',
        description: 'Enhance AI capabilities with custom personas and metrics',
        targetDate: 28,
        storyPatterns: [
            'custom persona types',
            'metrics on AI generation',
        ],
        color: '#8B5CF6', // Purple
    },
    {
        name: 'M3: Dashboard & Export',
        description: 'Add export functionality and dashboard customization',
        targetDate: 42,
        storyPatterns: [
            'export dashboard data',
            'export project reports',
            'configure dashboard widgets',
            'capacity warnings',
            'customize Kanban column',
        ],
        color: '#10B981', // Green
    },
    {
        name: 'M4: Real-time Collaboration',
        description: 'Implement presence indicators, notifications, and activity feeds',
        targetDate: 56,
        storyPatterns: [
            'see when other team members are actively viewing',
            'real-time notifications when critical',
            'live updates when other team members',
            'Kanban board updates to be reflected immediately',
            'executive dashboard to show live',
            'broadcast announcements',
            'live activity feeds',
        ],
        color: '#F59E0B', // Amber
    },
    {
        name: 'M5: Data Management',
        description: 'Import/export, backup, and archive capabilities',
        targetDate: 70,
        storyPatterns: [
            'import project data from external',
            'backup and restore',
            'validate data integrity',
            'bulk update story statuses',
            'archive completed projects',
        ],
        color: '#EF4444', // Red
    },
];

async function main() {
    const projectId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
    const epicId = 'EPIC-PMTRACKER-1766946622516';

    console.log('========================================');
    console.log('Creating PM Tracker Development Milestones');
    console.log('========================================\n');

    // Get all user stories for the PM Tracker epic
    const { data: stories, error: storiesError } = await supabase
        .from('pm_user_stories')
        .select('id, narrative, status, priority, feature_area')
        .eq('epic_id', epicId);

    if (storiesError) {
        console.error('Error fetching stories:', storiesError);
        return;
    }

    console.log(`Found ${stories?.length || 0} user stories for PM Tracker epic\n`);

    // Get current max sort_order
    const { data: existingMilestones } = await supabase
        .from('pm_milestones')
        .select('sort_order')
        .eq('project_id', projectId)
        .order('sort_order', { ascending: false })
        .limit(1);

    let sortOrder = existingMilestones && existingMilestones.length > 0
        ? existingMilestones[0].sort_order + 1
        : 1;

    const createdMilestones: Array<{ id: string; name: string; storyIds: string[] }> = [];

    for (const milestone of milestoneDefinitions) {
        // Calculate target date
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + milestone.targetDate);
        const targetDateStr = targetDate.toISOString().split('T')[0];

        // Generate milestone ID
        const milestoneId = `MS-PMTRACKER-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

        // Find matching stories (only Not Started or In Progress)
        const matchingStories = (stories || []).filter(story => {
            if (story.status === 'Done') return false;
            return milestone.storyPatterns.some(pattern =>
                story.narrative.toLowerCase().includes(pattern.toLowerCase())
            );
        });

        // Create the milestone
        const { error: createError } = await supabase
            .from('pm_milestones')
            .insert({
                id: milestoneId,
                project_id: projectId,
                name: milestone.name,
                description: milestone.description,
                target_date: targetDateStr,
                start_date: new Date().toISOString().split('T')[0],
                status: 'upcoming',
                phase: 1,
                color: milestone.color,
                sort_order: sortOrder++,
            });

        if (createError) {
            console.error(`Error creating milestone ${milestone.name}:`, createError);
            continue;
        }

        console.log(`✓ Created: ${milestone.name}`);
        console.log(`  Target: ${targetDateStr}`);
        console.log(`  Matching stories: ${matchingStories.length}`);

        // Assign stories to milestone
        for (const story of matchingStories) {
            const { error: assignError } = await supabase
                .from('pm_user_stories')
                .update({ milestone_id: milestoneId })
                .eq('id', story.id);

            if (assignError) {
                console.error(`  Error assigning story ${story.id}:`, assignError);
            } else {
                console.log(`    → ${story.narrative.substring(0, 50)}...`);
            }
        }

        createdMilestones.push({
            id: milestoneId,
            name: milestone.name,
            storyIds: matchingStories.map(s => s.id),
        });

        console.log('');

        // Small delay
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('========================================');
    console.log('Milestone Creation Complete');
    console.log('========================================\n');

    console.log('Summary:');
    createdMilestones.forEach(m => {
        console.log(`  ${m.name}: ${m.storyIds.length} stories assigned`);
    });

    // Count unassigned stories
    const { data: unassigned } = await supabase
        .from('pm_user_stories')
        .select('id')
        .eq('epic_id', epicId)
        .is('milestone_id', null)
        .neq('status', 'Done');

    console.log(`\nUnassigned stories (Done or no milestone): ${unassigned?.length || 0}`);
}

main();
