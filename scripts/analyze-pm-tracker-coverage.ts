import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ialckybbgkleiryfexlp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlhbGNreWJiZ2tsZWlyeWZleGxwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0ODg0MjYsImV4cCI6MjA4MTA2NDQyNn0.FcVSUxjqPId2NBEIjs_lVj9PVWc92eJaO6bnBlT95cc';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const epicId = 'EPIC-PMTRACKER-1766946622516';

    console.log('========================================');
    console.log('PM Tracker Coverage Analysis');
    console.log('========================================\n');

    // Get all features for this epic
    const { data: features, error: featError } = await supabase
        .from('pm_features')
        .select('id, name, priority, description')
        .eq('epic_id', epicId)
        .order('display_order');

    if (featError) {
        console.error('Error fetching features:', featError);
        return;
    }

    console.log(`Found ${features?.length || 0} features:\n`);

    // Get all stories for each feature
    for (const feature of features || []) {
        const { data: stories } = await supabase
            .from('pm_user_stories')
            .select('id, narrative, persona, priority, acceptance_criteria')
            .eq('feature_id', feature.id)
            .order('sort_order');

        console.log(`\n## ${feature.name} (${feature.priority})`);
        console.log(`   ${feature.description}`);
        console.log(`   Stories: ${stories?.length || 0}`);

        if (stories && stories.length > 0) {
            stories.forEach((story, i) => {
                console.log(`   ${i + 1}. [${story.persona}] ${story.narrative.substring(0, 100)}...`);
            });
        }
    }

    // Summary statistics
    const { count: totalStories } = await supabase
        .from('pm_user_stories')
        .select('*', { count: 'exact', head: true })
        .eq('epic_id', epicId);

    console.log('\n========================================');
    console.log('Summary');
    console.log('========================================');
    console.log(`Features: ${features?.length || 0}`);
    console.log(`User Stories: ${totalStories || 0}`);

    // Export to JSON for detailed analysis
    const fullData = {
        epic_id: epicId,
        features: await Promise.all(
            (features || []).map(async (f) => {
                const { data: stories } = await supabase
                    .from('pm_user_stories')
                    .select('*')
                    .eq('feature_id', f.id);
                return {
                    ...f,
                    stories: stories || [],
                };
            })
        ),
    };

    // Write to file for reference
    const fs = await import('fs');
    fs.writeFileSync(
        '/Users/unique_vzn/dev/park_crm/.tmp/pm-tracker-generated-artifacts.json',
        JSON.stringify(fullData, null, 2)
    );
    console.log('\nFull data exported to: .tmp/pm-tracker-generated-artifacts.json');
}

main();
