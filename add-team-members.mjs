import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function addTeamMembers() {
  const members = [
    { name: 'Sam', email: 'sam@example.com', role: 'lead', is_active: true },
    { name: 'Terell', email: 'terell@example.com', role: 'developer', is_active: true },
    { name: 'Clyde', email: 'clyde@example.com', role: 'developer', is_active: true },
  ];

  for (const member of members) {
    // Check if member already exists
    const { data: existing } = await supabase
      .from('pm_team_members')
      .select('id')
      .eq('name', member.name)
      .single();

    if (existing) {
      console.log(`${member.name} already exists with id: ${existing.id}`);
      continue;
    }

    const { data, error } = await supabase
      .from('pm_team_members')
      .insert(member)
      .select()
      .single();

    if (error) {
      console.error(`Error adding ${member.name}:`, error.message);
    } else {
      console.log(`Added ${member.name}:`, data.id);
    }
  }
  
  // List all team members
  const { data: allMembers } = await supabase.from('pm_team_members').select('*').eq('is_active', true);
  console.log('\nAll team members:', allMembers?.map(m => m.name).join(', '));
}

addTeamMembers().catch(console.error);
