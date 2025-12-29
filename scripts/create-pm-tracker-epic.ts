import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ialckybbgkleiryfexlp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlhbGNreWJiZ2tsZWlyeWZleGxwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0ODg0MjYsImV4cCI6MjA4MTA2NDQyNn0.FcVSUxjqPId2NBEIjs_lVj9PVWc92eJaO6bnBlT95cc';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const projectId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

    // Check for existing PM Tracker epic
    const { data: existing } = await supabase
        .from('pm_epics')
        .select('id, name')
        .eq('project_id', projectId)
        .ilike('name', '%PM Tracker%');

    if (existing && existing.length > 0) {
        console.log('PM Tracker Epic already exists:', existing[0]);
        return existing[0];
    }

    // Get max display_order
    const { data: lastEpic } = await supabase
        .from('pm_epics')
        .select('display_order')
        .eq('project_id', projectId)
        .order('display_order', { ascending: false })
        .limit(1);

    const nextOrder = lastEpic && lastEpic.length > 0 ? lastEpic[0].display_order + 1 : 1;

    // Create the PM Tracker Epic
    const epicData = {
        id: `EPIC-PMTRACKER-${Date.now()}`,
        project_id: projectId,
        name: 'PM Tracker Application',
        description: `A comprehensive project management and tracking application built to manage the Park at 14th Membership App development. This internal tool provides:

- **Plan Phase**: Epic/Feature/User Story hierarchy with Miller Columns navigation, AI-powered story generation and categorization
- **Schedule Phase**: Goals/Releases timeline with Now/Next/Later horizons, Milestone board with drag-and-drop story assignment
- **Execute Phase**: Kanban board with status tracking, task detail drawers with implementation specs
- **Monitor Phase**: Executive dashboard with health metrics, team workload visualization, deadline tracking

The PM Tracker itself serves as validation of its own capabilities - it's a dogfooding exercise demonstrating the system can manage real-world software development from planning through execution.`,
        feature_areas: [
            'Planning & Hierarchy',
            'Scheduling & Goals',
            'Execution & Kanban',
            'Monitoring & Analytics',
            'AI Integration',
            'Data Management'
        ],
        business_objectives: [
            'Provide visibility into project progress for stakeholders',
            'Enable AI-assisted story generation to accelerate planning',
            'Track blockers and at-risk items proactively',
            'Maintain a single source of truth for all project artifacts',
            'Demonstrate the system\'s capability through self-management'
        ],
        success_metrics: [
            '100% of user stories tracked through complete lifecycle',
            'Goals/releases have accurate health indicators',
            'Team workload visible and balanced',
            'All blockers surfaced within 24 hours',
            'AI-generated stories match implementation needs >80%'
        ],
        user_value: 'Product managers and developers can plan, schedule, execute, and monitor software projects with AI assistance, reducing manual overhead and improving visibility across the entire development lifecycle.',
        technical_context: `**Stack:**
- Next.js 16 with App Router
- TypeScript with strict mode
- Supabase for database (PostgreSQL), auth, and real-time
- shadcn/ui component library
- Tailwind CSS for styling
- Anthropic Claude API for AI features

**Architecture:**
- Miller Columns for Epic → Feature → User Story navigation
- URL state management for deep linking
- Real-time subscriptions for live updates
- Hierarchical context system for AI prompts

**Key Patterns:**
- Custom hooks for data fetching (useProjectHealth, useUrlState)
- Drawer-based detail views
- Drag-and-drop for reordering and status changes
- Goal health calculation based on linked story completion`,
        dependencies: [],
        priority: 'P0' as const,
        status: 'In Progress' as const,
        display_order: nextOrder,
    };

    const { data, error } = await supabase
        .from('pm_epics')
        .insert(epicData)
        .select()
        .single();

    if (error) {
        console.error('Error creating epic:', error);
        return;
    }

    console.log('Created PM Tracker Epic:');
    console.log(JSON.stringify(data, null, 2));
    return data;
}

main();
