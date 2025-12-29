import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    'https://ialckybbgkleiryfexlp.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlhbGNreWJiZ2tsZWlyeWZleGxwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0ODg0MjYsImV4cCI6MjA4MTA2NDQyNn0.FcVSUxjqPId2NBEIjs_lVj9PVWc92eJaO6bnBlT95cc'
);

async function main() {
    // Update all PM Tracker milestones to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const { data, error } = await supabase
        .from('pm_milestones')
        .update({ target_date: tomorrowStr, status: 'in_progress' })
        .ilike('name', 'M%:%')
        .select('name, target_date');

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log('Updated milestones to target:', tomorrowStr);
    data?.forEach(m => console.log(`  - ${m.name}: ${m.target_date}`));
}

main();
