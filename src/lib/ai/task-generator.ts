// Task Generator Service
// Orchestrates parallel AI calls for multi-platform spec generation
// Supports hierarchical context injection: Project → Epic → User Story

import Anthropic from '@anthropic-ai/sdk';
import {
    PlatformId,
    PLATFORM_CONFIG,
    PLATFORM_PROMPTS,
    INTEGRATION_STRATEGY_PROMPT,
    GeneratedTask,
    GeneratedSpecs,
    IntegrationStrategy,
    PlatformDefinitionOfDone,
    Assumption,
} from './platform-prompts';
import { HierarchicalContext, ProjectBrief } from '../supabase';

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY || '',
});

export interface UserStoryInput {
    id: string;
    narrative: string;
    persona: string;
    feature_area: string;
    acceptance_criteria: string[] | null;
    priority: string;
}

export interface GenerationOptions {
    selectedPlatforms: PlatformId[];
    additionalContext?: string;
    /** Hierarchical context for better AI understanding */
    hierarchicalContext?: HierarchicalContext | null;
}

/**
 * Format project brief into readable context
 */
function formatProjectBrief(brief: ProjectBrief | null): string {
    if (!brief) return '';

    const sections: string[] = [];

    if (brief.vision) {
        sections.push(`**Vision**: ${brief.vision}`);
    }

    if (brief.target_users?.length) {
        sections.push(`**Target Users**: ${brief.target_users.join(', ')}`);
    }

    if (brief.key_features?.length) {
        sections.push(`**Key Features**:\n${brief.key_features.map(f => `- ${f}`).join('\n')}`);
    }

    if (brief.tech_stack) {
        const stack = Object.entries(brief.tech_stack)
            .filter(([, v]) => v)
            .map(([k, v]) => `- ${k}: ${v}`)
            .join('\n');
        if (stack) {
            sections.push(`**Tech Stack**:\n${stack}`);
        }
    }

    if (brief.business_goals?.length) {
        sections.push(`**Business Goals**:\n${brief.business_goals.map(g => `- ${g}`).join('\n')}`);
    }

    if (brief.constraints?.length) {
        sections.push(`**Constraints**:\n${brief.constraints.map(c => `- ${c}`).join('\n')}`);
    }

    return sections.join('\n\n');
}

/**
 * Build hierarchical context section for AI prompts
 */
function buildHierarchicalContextSection(context: HierarchicalContext | null | undefined): string {
    if (!context) return '';

    const sections: string[] = [];

    // Project Context (highest level)
    sections.push(`
# PROJECT CONTEXT
**Project**: ${context.project.name}
`);

    // Add project brief if available
    const briefFormatted = formatProjectBrief(context.project.project_brief);
    if (briefFormatted) {
        sections.push(briefFormatted);
    }

    // Add context document (PRD) if available
    if (context.project.context_document) {
        sections.push(`
## Project Documentation
${context.project.context_document}
`);
    }

    // Epic Context (if assigned)
    if (context.epic) {
        sections.push(`
# EPIC CONTEXT
**Epic**: ${context.epic.name}
${context.epic.description ? `**Description**: ${context.epic.description}` : ''}
${context.epic.user_value ? `**User Value**: ${context.epic.user_value}` : ''}
${context.epic.business_objectives?.length ? `**Business Objectives**:\n${context.epic.business_objectives.map(o => `- ${o}`).join('\n')}` : ''}
${context.epic.technical_context ? `**Technical Context**: ${context.epic.technical_context}` : ''}
`);
    }

    return sections.join('\n');
}

/**
 * Parse task response from AI, handling platform ID normalization
 */
function parseTaskResponse(
    textContent: string,
    platform: PlatformId
): { tasks: GeneratedTask[]; assumptions: Assumption[] } {
    // Parse JSON from response
    const jsonMatch = textContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
        try {
            const parsed = JSON.parse(jsonMatch[0]);
            const taskCount = parsed.tasks?.length || 0;
            console.log(`[AI Generation] Platform ${platform}: Generated ${taskCount} tasks`);

            if (taskCount === 0) {
                console.warn(`[AI Generation] No tasks returned for platform ${platform}. Response preview:`, textContent.substring(0, 500));
            }

            // Normalize platform IDs (AI sometimes uses emoji instead of letter)
            const normalizedTasks = (parsed.tasks || []).map((task: GeneratedTask) => ({
                ...task,
                platform: platform,  // Force correct platform ID
            }));

            return {
                tasks: normalizedTasks,
                assumptions: parsed.assumptions || [],
            };
        } catch (parseError) {
            console.error(`[AI Generation] JSON parse error for platform ${platform}:`, parseError);
            console.error('[AI Generation] Raw response preview:', textContent.substring(0, 500));
            return { tasks: [], assumptions: [] };
        }
    }

    console.warn(`[AI Generation] No JSON found in response for platform ${platform}. Response preview:`, textContent.substring(0, 500));
    return { tasks: [], assumptions: [] };
}

/**
 * Generate specs for a single platform
 */
async function generatePlatformSpec(
    userStory: UserStoryInput,
    platform: PlatformId,
    additionalContext?: string,
    hierarchicalContext?: HierarchicalContext | null
): Promise<{ tasks: GeneratedTask[]; assumptions: Assumption[] }> {
    const platformConfig = PLATFORM_CONFIG[platform];
    const prompt = PLATFORM_PROMPTS[platform];

    // Build hierarchical context section (Project → Epic → User Story)
    const hierarchicalSection = buildHierarchicalContextSection(hierarchicalContext);

    const userStoryContext = `
${hierarchicalSection}

# USER STORY
**ID**: ${userStory.id}
**Narrative**: "${userStory.narrative}"
**Persona**: ${userStory.persona}
**Feature Area**: ${userStory.feature_area}
**Priority**: ${userStory.priority}
${userStory.acceptance_criteria?.length ? `**Acceptance Criteria**:\n${userStory.acceptance_criteria.map((c, i) => `${i + 1}. ${c}`).join('\n')}` : ''}
${additionalContext ? `\n**Additional Context**:\n${additionalContext}` : ''}
`;

    try {
        const response = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 16384,  // Increased from 8192 to handle detailed responses
            system: prompt,
            messages: [
                {
                    role: 'user',
                    content: `Generate detailed implementation specs for the ${platformConfig.name} platform.

Platform ID to use in JSON output: "${platform}" (use exactly this letter, not the emoji)

IMPORTANT: Break down the work into MULTIPLE discrete tasks (typically 2-5 tasks). Each task should be:
- A logical, atomic unit of work
- Completable in 2-8 hours
- Independently testable

CRITICAL: Keep code_snippets brief (pseudocode or key lines only). Prioritize task structure over lengthy code examples.

Do NOT consolidate everything into a single task. Create separate tasks for different concerns (e.g., database setup, API endpoints, UI components, tests).

${userStoryContext}`,
                },
            ],
        });

        // Check if response was truncated
        if (response.stop_reason === 'max_tokens') {
            console.warn(`[AI Generation] Response truncated for platform ${platform}. Output tokens: ${response.usage.output_tokens}`);
            // Attempt a retry with stricter instructions
            const retryResponse = await anthropic.messages.create({
                model: 'claude-sonnet-4-20250514',
                max_tokens: 16384,
                system: prompt,
                messages: [
                    {
                        role: 'user',
                        content: `Generate implementation specs for the ${platformConfig.name} platform.

Platform ID: "${platform}"

STRICT CONSTRAINTS - FOLLOW EXACTLY:
- Generate 3-4 tasks maximum
- Each task: name, objective, 3-5 implementation steps, 3-5 definition_of_done items
- NO code_snippets field (skip entirely to save tokens)
- Keep all text concise

${userStoryContext}`,
                    },
                ],
            });

            if (retryResponse.stop_reason === 'max_tokens') {
                console.error(`[AI Generation] Retry also truncated for platform ${platform}`);
                return { tasks: [], assumptions: [] };
            }

            // Use retry response
            const retryTextContent = retryResponse.content
                .filter((block): block is Anthropic.TextBlock => block.type === 'text')
                .map((block) => block.text)
                .join('\n');

            return parseTaskResponse(retryTextContent, platform);
        }

        // Extract text content
        const textContent = response.content
            .filter((block): block is Anthropic.TextBlock => block.type === 'text')
            .map((block) => block.text)
            .join('\n');

        return parseTaskResponse(textContent, platform);
    } catch (error) {
        console.error(`[AI Generation] API error for platform ${platform}:`, error);
        return { tasks: [], assumptions: [] };
    }
}

/**
 * Generate integration strategy when multiple platforms are selected
 */
async function generateIntegrationStrategy(
    userStory: UserStoryInput,
    platformSpecs: { platform: PlatformId; tasks: GeneratedTask[] }[]
): Promise<IntegrationStrategy | null> {
    if (platformSpecs.length < 2) return null;

    const platformSummary = platformSpecs.map(({ platform, tasks }) => {
        const config = PLATFORM_CONFIG[platform];
        return `
## ${config.icon} ${config.name} (${platform})
Tasks:
${tasks.map(t => `- ${t.name}: ${t.objective}`).join('\n')}
Outputs:
${tasks.flatMap(t => t.outputs).map(o => `- ${o}`).join('\n')}
`;
    }).join('\n');

    try {
        const response = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 4096,
            system: INTEGRATION_STRATEGY_PROMPT,
            messages: [
                {
                    role: 'user',
                    content: `Generate integration strategy for this multi-platform implementation.

## User Story
"${userStory.narrative}"

## Platform Specs
${platformSummary}

Provide the integration strategy as valid JSON.`,
                },
            ],
        });

        const textContent = response.content
            .filter((block): block is Anthropic.TextBlock => block.type === 'text')
            .map((block) => block.text)
            .join('\n');

        const jsonMatch = textContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]) as IntegrationStrategy;
        }

        return null;
    } catch (error) {
        console.error('Error generating integration strategy:', error);
        return null;
    }
}

/**
 * Merge platform-specific DoDs into unified structure
 */
function mergeDefinitionsOfDone(
    platformSpecs: { platform: PlatformId; tasks: GeneratedTask[] }[],
    integrationStrategy: IntegrationStrategy | null
): GeneratedSpecs['definition_of_done'] {
    const platformDod: PlatformDefinitionOfDone[] = platformSpecs.map(({ platform, tasks }) => {
        const config = PLATFORM_CONFIG[platform];
        const allDodItems = tasks.flatMap(t => t.definition_of_done);
        // Deduplicate
        const uniqueDod = [...new Set(allDodItems)];

        return {
            platform,
            platform_name: config.name,
            checklist: uniqueDod,
        };
    });

    // Create integration DoD if multiple platforms
    let integrationDod: { description: string; checklist: string[] } | undefined;
    if (integrationStrategy && platformSpecs.length > 1) {
        const platformNames = platformSpecs.map(p => PLATFORM_CONFIG[p.platform].name);
        integrationDod = {
            description: `Cross-platform verification (${platformNames.join(' ↔ ')})`,
            checklist: [
                ...integrationStrategy.integration_tests.map(t => `E2E: ${t.name}`),
                'All API contracts match between platforms',
                'Shared TypeScript types compile without errors',
                'No runtime type mismatches in integration',
            ],
        };
    }

    return {
        platform_dod: platformDod,
        integration_dod: integrationDod,
    };
}

/**
 * Main entry point: Generate specs for selected platforms in parallel
 */
export async function generateTaskSpecs(
    userStory: UserStoryInput,
    options: GenerationOptions
): Promise<GeneratedSpecs> {
    const { selectedPlatforms, additionalContext, hierarchicalContext } = options;

    if (selectedPlatforms.length === 0) {
        return {
            tasks: [],
            definition_of_done: { platform_dod: [] },
            assumptions: [],
            overall_confidence: 0,
        };
    }

    // Log context injection for debugging
    if (hierarchicalContext) {
        console.log('[AI Generation] Injecting hierarchical context:', {
            project: hierarchicalContext.project.name,
            hasProjectBrief: !!hierarchicalContext.project.project_brief,
            hasContextDocument: !!hierarchicalContext.project.context_document,
            epic: hierarchicalContext.epic?.name || 'None',
        });
    } else {
        console.log('[AI Generation] No hierarchical context provided - generating without project/epic context');
    }

    // Generate specs for each platform in parallel
    const specPromises = selectedPlatforms.map(async (platform) => {
        const result = await generatePlatformSpec(userStory, platform, additionalContext, hierarchicalContext);
        return { platform, ...result };
    });

    const platformResults = await Promise.all(specPromises);

    // Collect all tasks and assumptions
    const allTasks = platformResults.flatMap(r => r.tasks);
    const allAssumptions = platformResults.flatMap(r => r.assumptions);

    // Generate integration strategy if multiple platforms
    let integrationStrategy: IntegrationStrategy | null = null;
    if (selectedPlatforms.length > 1) {
        integrationStrategy = await generateIntegrationStrategy(userStory, platformResults);
    }

    // Merge definitions of done
    const definitionOfDone = mergeDefinitionsOfDone(platformResults, integrationStrategy);

    // Calculate overall confidence based on task-level confidence
    const confidenceScores = allTasks.map(t =>
        t.confidence === 'HIGH' ? 90 : t.confidence === 'MEDIUM' ? 70 : 50
    );
    const overallConfidence = confidenceScores.length > 0
        ? Math.round(confidenceScores.reduce((a, b) => a + b, 0) / confidenceScores.length)
        : 0;

    return {
        tasks: allTasks,
        integration_strategy: integrationStrategy || undefined,
        definition_of_done: definitionOfDone,
        assumptions: allAssumptions,
        overall_confidence: overallConfidence,
    };
}

/**
 * Estimate generation time based on platforms selected
 */
export function estimateGenerationTime(platforms: PlatformId[]): number {
    // Each platform takes ~10-15 seconds
    // Parallel execution, but integration adds time
    const baseTime = 15; // seconds
    const integrationTime = platforms.length > 1 ? 10 : 0;
    return baseTime + integrationTime;
}

/**
 * Get display info for platforms
 */
export function getPlatformInfo(platformId: PlatformId) {
    return PLATFORM_CONFIG[platformId];
}

export { PLATFORM_CONFIG, type PlatformId };
