import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ialckybbgkleiryfexlp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlhbGNreWJiZ2tsZWlyeWZleGxwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0ODg0MjYsImV4cCI6MjA4MTA2NDQyNn0.FcVSUxjqPId2NBEIjs_lVj9PVWc92eJaO6bnBlT95cc';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    // Get active project
    const { data: project, error } = await supabase
        .from('pm_projects')
        .select('id, name, context_document, project_brief')
        .eq('status', 'active')
        .single();

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log('Project ID:', project.id);
    console.log('Project Name:', project.name);
    console.log('\n=== PROJECT BRIEF ===');
    console.log(JSON.stringify(project.project_brief, null, 2));
    console.log('\n=== CONTEXT DOCUMENT (first 3000 chars) ===');
    console.log(project.context_document?.substring(0, 3000));
}

main();
