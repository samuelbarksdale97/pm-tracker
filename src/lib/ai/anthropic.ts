import Anthropic from '@anthropic-ai/sdk';

// Initialize Anthropic client
const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY || '',
});

export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

export interface ProjectContext {
    projectName: string;
    projectDescription: string;
    milestones: Array<{ id: string; name: string; status: string; targetDate: string; userStoryCount: number }>;
    userStories: Array<{ id: string; narrative: string; persona: string; status: string; milestoneId: string | null }>;
    tasks: Array<{ id: string; name: string; status: string; priority: string; workstreamId: string; userStoryId: string | null }>;
    teamMembers: Array<{ id: string; name: string; role: string }>;
    stats: {
        totalUserStories: number;
        completedUserStories: number;
        totalTasks: number;
        completedTasks: number;
        blockedTasks: number;
    };
}

export interface SuggestedAction {
    type: 'create_user_story' | 'create_task' | 'update_status' | 'update_priority' | 'add_note';
    preview: Record<string, unknown>;
    confirmationRequired: boolean;
}

export interface ChatResponse {
    response: string;
    suggestedActions?: SuggestedAction[];
    referencedItems?: string[];
}

export async function chat(
    messages: ChatMessage[],
    projectContext: ProjectContext,
    systemPrompt: string
): Promise<ChatResponse> {
    const contextBlock = buildContextBlock(projectContext);

    const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: `${systemPrompt}\n\n## Current Project State\n${contextBlock}`,
        messages: messages.map(m => ({
            role: m.role,
            content: m.content,
        })),
    });

    // Extract text content
    const textContent = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map((block) => block.text)
        .join('\n');

    // Parse for suggested actions (if any JSON blocks are present)
    const { cleanResponse, suggestedActions, referencedItems } = parseResponse(textContent);

    return {
        response: cleanResponse,
        suggestedActions,
        referencedItems,
    };
}

function buildContextBlock(ctx: ProjectContext): string {
    return `
**Project**: ${ctx.projectName}
${ctx.projectDescription ? `Description: ${ctx.projectDescription}` : ''}

**Overall Progress**:
- User Stories: ${ctx.stats.completedUserStories}/${ctx.stats.totalUserStories} complete
- Tasks: ${ctx.stats.completedTasks}/${ctx.stats.totalTasks} complete
- Blocked: ${ctx.stats.blockedTasks} tasks

**Milestones** (${ctx.milestones.length}):
${ctx.milestones.map(m => `- ${m.id}: ${m.name} (${m.status}) - ${m.targetDate} - ${m.userStoryCount} stories`).join('\n')}

**User Stories** (${ctx.userStories.length}):
${ctx.userStories.map(us => `- ${us.id}: "${us.narrative}" [${us.persona}] - ${us.status}${us.milestoneId ? ` (${us.milestoneId})` : ''}`).join('\n')}

**Tasks by Workstream**:
${['A', 'B', 'C', 'D'].map(ws => {
        const wsTasks = ctx.tasks.filter(t => t.workstreamId === ws);
        if (wsTasks.length === 0) return '';
        return `\n[Workstream ${ws}]\n${wsTasks.map(t => `- ${t.id}: ${t.name} [${t.priority}] - ${t.status}${t.userStoryId ? ` → ${t.userStoryId}` : ''}`).join('\n')}`;
    }).filter(Boolean).join('\n')}

**Team Members**:
${ctx.teamMembers.map(tm => `- ${tm.name} (${tm.role})`).join('\n')}
`.trim();
}

function parseResponse(text: string): {
    cleanResponse: string;
    suggestedActions?: SuggestedAction[];
    referencedItems?: string[];
} {
    // Look for JSON action blocks
    const actionMatch = text.match(/```json:action\n([\s\S]*?)\n```/);
    let suggestedActions: SuggestedAction[] | undefined;

    if (actionMatch) {
        try {
            const parsed = JSON.parse(actionMatch[1]);
            suggestedActions = Array.isArray(parsed) ? parsed : [parsed];
        } catch {
            // Ignore parse errors
        }
    }

    // Extract referenced item IDs (US-###, A##, M#, etc.)
    const itemRefs = text.match(/\b(US-\d+|[A-D]\d+|M\d+)\b/g);
    const referencedItems = itemRefs ? [...new Set(itemRefs)] : undefined;

    // Clean response by removing action blocks
    const cleanResponse = text.replace(/```json:action\n[\s\S]*?\n```/g, '').trim();

    return { cleanResponse, suggestedActions, referencedItems };
}

export { anthropic };
