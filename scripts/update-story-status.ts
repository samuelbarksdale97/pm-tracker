import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    'https://ialckybbgkleiryfexlp.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlhbGNreWJiZ2tsZWlyeWZleGxwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0ODg0MjYsImV4cCI6MjA4MTA2NDQyNn0.FcVSUxjqPId2NBEIjs_lVj9PVWc92eJaO6bnBlT95cc'
);

// Usage: npx tsx scripts/update-story-status.ts "search pattern" "In Progress|Done"
async function main() {
    const pattern = process.argv[2];
    const status = process.argv[3] as 'Not Started' | 'In Progress' | 'Done' | 'Blocked';

    if (!pattern || !status) {
        console.log('Usage: npx tsx scripts/update-story-status.ts "search pattern" "status"');
        return;
    }

    const { data, error } = await supabase
        .from('pm_user_stories')
        .update({ status })
        .ilike('narrative', `%${pattern}%`)
        .select('id, narrative, status');

    if (error) {
        console.error('Error:', error);
        return;
    }

    if (!data || data.length === 0) {
        console.log('No matching stories found for pattern:', pattern);
        return;
    }

    console.log(`Updated ${data.length} story(ies) to "${status}":`);
    data.forEach(s => console.log(`  - ${s.narrative.substring(0, 60)}...`));
}

main();
