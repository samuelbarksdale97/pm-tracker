import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ialckybbgkleiryfexlp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlhbGNreWJiZ2tsZWlyeWZleGxwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0ODg0MjYsImV4cCI6MjA4MTA2NDQyNn0.FcVSUxjqPId2NBEIjs_lVj9PVWc92eJaO6bnBlT95cc';

const supabase = createClient(supabaseUrl, supabaseKey);

// Feature IDs from the previous step
const featureIds = [
    'FEAT-1766947033121-kcnj7', // Epic-Feature-Story Hierarchy Management
    'FEAT-1766947033265-4hrmm', // AI-Powered Story Generation
    'FEAT-1766947033363-k0qrq', // Goals and Release Timeline
    'FEAT-1766947033465-bwikx', // Milestone Board with Story Assignment
    'FEAT-1766947033601-16hwv', // Kanban Execution Board
    'FEAT-1766947033742-8q0fh', // Executive Dashboard and Analytics
    'FEAT-1766947033852-wzp5n', // Real-time Collaboration System
    'FEAT-1766947033954-3io4x', // Data Management and Import/Export
];

interface GeneratedStory {
    narrative: string;
    persona: 'member' | 'admin' | 'staff' | 'business' | 'guest';
    priority: 'P0' | 'P1' | 'P2';
    acceptance_criteria: string[];
    rationale: string;
}

interface StoryGenerationResult {
    stories: GeneratedStory[];
    feature_context: string;
    generation_notes: string[];
}

async function generateStoriesForFeature(featureId: string): Promise<{
    featureId: string;
    featureName: string;
    result: StoryGenerationResult | null;
    error?: string;
}> {
    const apiUrl = 'http://localhost:3000/api/ai/generate-stories';

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                featureId,
                additionalInstructions: `This is for the PM Tracker internal tool. The personas should be:
- admin: Product managers and project leads using the PM Tracker
- staff: Developers and team members using the tracker
- business: Executives and stakeholders viewing dashboards

Focus on stories that enable a complete project management workflow from planning through monitoring.`,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            return {
                featureId,
                featureName: '',
                result: null,
                error: data.error || 'Unknown error',
            };
        }

        return {
            featureId,
            featureName: data.metadata?.feature_name || '',
            result: data.data,
        };
    } catch (error) {
        return {
            featureId,
            featureName: '',
            result: null,
            error: error instanceof Error ? error.message : 'Network error',
        };
    }
}

async function saveStoriesToDatabase(
    featureId: string,
    epicId: string,
    projectId: string,
    featureName: string,
    stories: GeneratedStory[]
): Promise<number> {
    let savedCount = 0;

    // Get max sort_order for this project
    const { data: existing } = await supabase
        .from('pm_user_stories')
        .select('sort_order')
        .eq('project_id', projectId)
        .order('sort_order', { ascending: false })
        .limit(1);

    let nextOrder = existing && existing.length > 0 ? existing[0].sort_order + 1 : 1;

    for (const story of stories) {
        const storyId = `US-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

        // Derive feature_area from the feature name
        const featureArea = featureName.split(' ').slice(0, 2).join(' ');

        const { error } = await supabase.from('pm_user_stories').insert({
            id: storyId,
            project_id: projectId,
            epic_id: epicId,
            feature_id: featureId,
            narrative: story.narrative,
            persona: story.persona,
            priority: story.priority,
            acceptance_criteria: story.acceptance_criteria,
            feature_area: featureArea,
            status: 'Not Started',
            sort_order: nextOrder++,
        });

        if (error) {
            console.error(`  Error saving story: ${error.message}`);
        } else {
            savedCount++;
        }

        // Small delay to ensure unique IDs
        await new Promise((resolve) => setTimeout(resolve, 30));
    }

    return savedCount;
}

async function main() {
    const projectId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
    const epicId = 'EPIC-PMTRACKER-1766946622516';

    console.log('========================================');
    console.log('Generating User Stories for PM Tracker Features');
    console.log('========================================\n');

    let totalStoriesGenerated = 0;
    let totalStoriesSaved = 0;
    const allResults: Array<{
        featureName: string;
        storiesGenerated: number;
        storiesSaved: number;
    }> = [];

    for (let i = 0; i < featureIds.length; i++) {
        const featureId = featureIds[i];
        console.log(`[${i + 1}/${featureIds.length}] Processing feature: ${featureId}`);

        // Generate stories via API
        const result = await generateStoriesForFeature(featureId);

        if (result.error) {
            console.error(`  ERROR: ${result.error}`);
            allResults.push({
                featureName: featureId,
                storiesGenerated: 0,
                storiesSaved: 0,
            });
            continue;
        }

        if (!result.result) {
            console.error(`  ERROR: No result returned`);
            continue;
        }

        const storiesGenerated = result.result.stories.length;
        console.log(`  ✓ Generated ${storiesGenerated} stories for: ${result.featureName}`);
        totalStoriesGenerated += storiesGenerated;

        // Save stories to database
        const storiesSaved = await saveStoriesToDatabase(
            featureId,
            epicId,
            projectId,
            result.featureName,
            result.result.stories
        );

        console.log(`  ✓ Saved ${storiesSaved} stories to database`);
        totalStoriesSaved += storiesSaved;

        allResults.push({
            featureName: result.featureName,
            storiesGenerated,
            storiesSaved,
        });

        // Brief pause between features to avoid rate limiting
        if (i < featureIds.length - 1) {
            console.log(`  Waiting before next feature...\n`);
            await new Promise((resolve) => setTimeout(resolve, 1000));
        }
    }

    console.log('\n========================================');
    console.log('Story Generation Complete');
    console.log('========================================');
    console.log(`\nTotal stories generated: ${totalStoriesGenerated}`);
    console.log(`Total stories saved: ${totalStoriesSaved}`);
    console.log('\nBreakdown by feature:');
    allResults.forEach((r) => {
        console.log(`  - ${r.featureName}: ${r.storiesGenerated} generated, ${r.storiesSaved} saved`);
    });
}

main();
