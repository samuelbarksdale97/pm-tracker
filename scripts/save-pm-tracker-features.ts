import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ialckybbgkleiryfexlp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlhbGNreWJiZ2tsZWlyeWZleGxwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0ODg0MjYsImV4cCI6MjA4MTA2NDQyNn0.FcVSUxjqPId2NBEIjs_lVj9PVWc92eJaO6bnBlT95cc';

const supabase = createClient(supabaseUrl, supabaseKey);

// The AI-generated features from the feature-generator API
const generatedFeatures = [
    {
        name: 'Epic-Feature-Story Hierarchy Management',
        description: 'Enables product managers to create and organize work items in a three-level hierarchy (Epic → Feature → User Story) using an intuitive Miller Columns interface for seamless navigation and context preservation.',
        priority: 'P0' as const,
        rationale: 'Core to the planning phase and foundational for all other features. The Miller Columns navigation pattern is explicitly mentioned in the technical context as a key architectural decision.'
    },
    {
        name: 'AI-Powered Story Generation',
        description: 'Allows users to automatically generate user stories from feature context using Claude AI, including categorization, acceptance criteria, and implementation suggestions.',
        priority: 'P1' as const,
        rationale: 'Directly supports the business objective of accelerating planning through AI assistance. Success metric targets >80% match rate for AI-generated stories.'
    },
    {
        name: 'Goals and Release Timeline',
        description: 'Provides a visual timeline for managing releases and goals organized by Now/Next/Later time horizons, with target dates and automatic health indicator calculations.',
        priority: 'P0' as const,
        rationale: 'Critical for the Schedule phase. Enables stakeholders to understand release planning and track progress toward milestones.'
    },
    {
        name: 'Milestone Board with Story Assignment',
        description: 'Offers a drag-and-drop board interface for assigning user stories to milestones, enabling sprint/milestone planning with visual feedback on capacity and progress.',
        priority: 'P1' as const,
        rationale: 'Bridges the Schedule and Execute phases. Supports the goal of tracking 100% of user stories through their complete lifecycle.'
    },
    {
        name: 'Kanban Execution Board',
        description: 'Delivers a status-based Kanban board for tracking work items through customizable workflow stages (Backlog, In Progress, Review, Done) with task detail drawers.',
        priority: 'P0' as const,
        rationale: 'Essential for the Execute phase. Enables teams to visualize work in progress and manage daily execution.'
    },
    {
        name: 'Executive Dashboard and Analytics',
        description: 'Presents a high-level dashboard with project health metrics, team workload visualization, deadline tracking, and at-risk item surfacing for stakeholder visibility.',
        priority: 'P1' as const,
        rationale: 'Addresses the Monitor phase and the business objective of providing visibility into project progress. Supports the 24-hour blocker surfacing metric.'
    },
    {
        name: 'Real-time Collaboration System',
        description: 'Enables multiple team members to work simultaneously with live updates through Supabase real-time subscriptions, ensuring everyone sees the latest project state.',
        priority: 'P1' as const,
        rationale: 'Technical context explicitly mentions real-time subscriptions as a key architectural pattern. Essential for maintaining a single source of truth.'
    },
    {
        name: 'Data Management and Import/Export',
        description: 'Provides capabilities to import existing project data, export reports, and manage data integrity across the hierarchical structure.',
        priority: 'P2' as const,
        rationale: 'Supporting feature that enhances usability but is not critical for core functionality. Helps with initial adoption and data portability.'
    }
];

async function main() {
    const projectId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
    const epicId = 'EPIC-PMTRACKER-1766946622516';

    console.log('Saving AI-generated features to database...\n');

    // Get current max display_order for this epic
    const { data: existing } = await supabase
        .from('pm_features')
        .select('display_order')
        .eq('epic_id', epicId)
        .order('display_order', { ascending: false })
        .limit(1);

    let displayOrder = existing && existing.length > 0 ? existing[0].display_order + 1 : 1;

    const savedFeatures = [];

    for (const feature of generatedFeatures) {
        const featureId = `FEAT-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

        const { data, error } = await supabase
            .from('pm_features')
            .insert({
                id: featureId,
                project_id: projectId,
                epic_id: epicId,
                name: feature.name,
                description: feature.description,
                priority: feature.priority,
                status: 'Not Started',
                display_order: displayOrder++,
            })
            .select()
            .single();

        if (error) {
            console.error(`Error creating feature "${feature.name}":`, error);
            continue;
        }

        console.log(`✓ Created: ${feature.name} (${feature.priority}) - ID: ${data.id}`);
        savedFeatures.push(data);

        // Small delay to ensure unique timestamps
        await new Promise(resolve => setTimeout(resolve, 50));
    }

    console.log(`\n========================================`);
    console.log(`Successfully saved ${savedFeatures.length} features to Epic: PM Tracker Application`);
    console.log(`========================================\n`);

    // Output summary for next step
    console.log('Feature IDs for User Story generation:');
    savedFeatures.forEach(f => {
        console.log(`  - ${f.id}: ${f.name}`);
    });

    return savedFeatures;
}

main();
