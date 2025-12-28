const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    'https://ialckybbgkleiryfexlp.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlhbGNreWJiZ2tsZWlyeWZleGxwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0ODg0MjYsImV4cCI6MjA4MTA2NDQyNn0.FcVSUxjqPId2NBEIjs_lVj9PVWc92eJaO6bnBlT95cc'
);

async function run() {
    // Check if they already exist
    const { data: existing } = await supabase
        .from('pm_team_members')
        .select('name')
        .in('name', ['Sam', 'Terell', 'Clyde']);

    const existingNames = existing?.map(m => m.name) || [];
    const toInsert = [
        { name: 'Sam', email: 'sam@example.com', role: 'lead', is_active: true },
        { name: 'Terell', email: 'terell@example.com', role: 'developer', is_active: true },
        { name: 'Clyde', email: 'clyde@example.com', role: 'developer', is_active: true }
    ].filter(m => !existingNames.includes(m.name));

    if (toInsert.length === 0) {
        console.log('ℹ️ All team members already exist');
    } else {
        const { error } = await supabase.from('pm_team_members').insert(toInsert);
        if (error) {
            console.error('Insert error:', error);
        } else {
            console.log('✅ Added:', toInsert.map(m => m.name).join(', '));
        }
    }

    // Show all active members
    const { data: members } = await supabase
        .from('pm_team_members')
        .select('id, name, email, role')
        .eq('is_active', true)
        .order('name');

    console.log('\n📋 Active Team Members:');
    console.table(members);
}

run();
