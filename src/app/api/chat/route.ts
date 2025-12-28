import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ialckybbgkleiryfexlp.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlhbGNreWJiZ2tsZWlyeWZleGxwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0ODg0MjYsImV4cCI6MjA4MTA2NDQyNn0.FcVSUxjqPId2NBEIjs_lVj9PVWc92eJaO6bnBlT95cc'
);

interface ProjectContext {
    projectName: string;
    totalUserStories: number;
    completedUserStories: number;
    totalTasks: number;
    completedTasks: number;
    blockedTasks: number;
    milestones: Array<{ name: string; status: string; userStoryCount: number }>;
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { message, projectId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' } = body;

        if (!message) {
            return NextResponse.json({ error: 'Message is required' }, { status: 400 });
        }

        // Build project context
        const context = await buildProjectContext(projectId);

        // Check for API key - if missing, use demo mode
        const apiKey = process.env.ANTHROPIC_API_KEY;

        if (!apiKey) {
            // Demo mode - provide helpful responses based on project data
            const demoResponse = generateDemoResponse(message.toLowerCase(), context);
            return NextResponse.json({
                response: demoResponse,
                suggestedActions: [],
                referencedItems: [],
                isDemo: true
            });
        }

        // Real API call with Anthropic
        const Anthropic = (await import('@anthropic-ai/sdk')).default;
        const anthropic = new Anthropic({ apiKey });

        const systemPrompt = buildSystemPrompt(context);

        const response = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 2048,
            system: systemPrompt,
            messages: [{ role: 'user', content: message }]
        });

        const textContent = response.content
            .filter(block => block.type === 'text')
            .map(block => 'text' in block ? block.text : '')
            .join('\n');

        return NextResponse.json({
            response: textContent,
            suggestedActions: [],
            referencedItems: []
        });

    } catch (error) {
        console.error('Chat API error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        // Return helpful error for common issues
        if (errorMessage.includes('API key') || errorMessage.includes('authentication')) {
            return NextResponse.json({
                response: "⚠️ The AI assistant isn't configured yet. Please add ANTHROPIC_API_KEY to your environment variables.",
                isDemo: true
            });
        }

        return NextResponse.json({
            response: `I encountered an issue: ${errorMessage}. Please check the server logs.`,
            error: errorMessage
        });
    }
}

function generateDemoResponse(message: string, ctx: ProjectContext): string {
    // Demo responses based on common queries
    const progress = ctx.totalUserStories > 0
        ? Math.round((ctx.completedUserStories / ctx.totalUserStories) * 100)
        : 0;

    if (message.includes('hello') || message.includes('hi')) {
        return `👋 Hello! I'm the Project Architect assistant for **${ctx.projectName}**.

📊 **Quick Status:**
- User Stories: ${ctx.completedUserStories}/${ctx.totalUserStories} complete (${progress}%)
- Tasks: ${ctx.completedTasks}/${ctx.totalTasks} complete
- Blocked: ${ctx.blockedTasks} tasks

Try asking me:
• "Give me a project overview"
• "What's blocked?"
• "How are we doing on authentication?"

*Note: Full AI features require an Anthropic API key. Currently running in demo mode.*`;
    }

    if (message.includes('overview') || message.includes('status')) {
        const milestoneList = ctx.milestones
            .map(m => `• **${m.name}** (${m.status}) - ${m.userStoryCount} stories`)
            .join('\n');

        return `📋 **${ctx.projectName} Overview**

**Progress:** ${progress}% complete

**User Stories:** ${ctx.completedUserStories} done, ${ctx.totalUserStories - ctx.completedUserStories} remaining
**Tasks:** ${ctx.completedTasks} done, ${ctx.blockedTasks} blocked

**Milestones:**
${milestoneList}

*Running in demo mode. Add ANTHROPIC_API_KEY for full AI capabilities.*`;
    }

    if (message.includes('blocked') || message.includes('blocker')) {
        if (ctx.blockedTasks === 0) {
            return `✅ Great news! There are currently **no blocked tasks** in the project.`;
        }
        return `⚠️ There are **${ctx.blockedTasks} blocked tasks** in the project.

To see the specific blockers, check the Kanban board or table view and filter by "Blocked" status.

*Full blocker details available with Anthropic API key configured.*`;
    }

    if (message.includes('p0') || message.includes('priority')) {
        return `🔴 **Priority Tasks**

To see all P0 (critical) tasks, use the table view and filter by priority.

Current project has ${ctx.totalTasks} total tasks across all priorities.

*Detailed priority breakdown available with Anthropic API key configured.*`;
    }

    // Default response
    return `I understand you're asking about: "${message}"

I'm currently running in **demo mode** without full AI capabilities. 

To enable intelligent responses:
1. Get an API key from [console.anthropic.com](https://console.anthropic.com)
2. Create \`.env.local\` in the pm-tracker directory
3. Add: \`ANTHROPIC_API_KEY=your-key-here\`
4. Restart the dev server

**What I can help with now:**
• "Hello" - Quick project status
• "Project overview" - Milestone summary  
• "What's blocked?" - Blocker count
• "P0 tasks" - Priority info`;
}

function buildSystemPrompt(ctx: ProjectContext): string {
    return `You are the Principal Architect for ${ctx.projectName}, a mobile membership app.

Current Status:
- User Stories: ${ctx.completedUserStories}/${ctx.totalUserStories} complete
- Tasks: ${ctx.completedTasks}/${ctx.totalTasks} complete  
- Blocked: ${ctx.blockedTasks} tasks

Milestones:
${ctx.milestones.map(m => `- ${m.name} (${m.status}): ${m.userStoryCount} stories`).join('\n')}

Be concise and helpful. Reference specific IDs when discussing items.`;
}

async function buildProjectContext(projectId: string): Promise<ProjectContext> {
    const [
        { data: project },
        { data: milestones },
        { data: userStories },
        { data: tasks }
    ] = await Promise.all([
        supabase.from('pm_projects').select('*').eq('id', projectId).single(),
        supabase.from('pm_milestones').select('*').eq('project_id', projectId).order('target_date'),
        supabase.from('pm_user_stories').select('*').eq('project_id', projectId),
        supabase.from('pm_stories').select('*').eq('project_id', projectId)
    ]);

    // Count user stories per milestone
    const userStoryCountByMilestone: Record<string, number> = {};
    userStories?.forEach(us => {
        if (us.milestone_id) {
            userStoryCountByMilestone[us.milestone_id] = (userStoryCountByMilestone[us.milestone_id] || 0) + 1;
        }
    });

    return {
        projectName: project?.name || 'Park at 14th',
        totalUserStories: userStories?.length || 0,
        completedUserStories: userStories?.filter(us => us.status === 'Done').length || 0,
        totalTasks: tasks?.length || 0,
        completedTasks: tasks?.filter(t => t.status === 'Done').length || 0,
        blockedTasks: tasks?.filter(t => t.status === 'Blocked').length || 0,
        milestones: (milestones || []).map(m => ({
            name: m.name,
            status: m.status,
            userStoryCount: userStoryCountByMilestone[m.id] || 0
        }))
    };
}
