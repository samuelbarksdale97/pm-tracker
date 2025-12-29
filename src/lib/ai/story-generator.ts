// Story Generator Service
// Generates user stories for a Feature based on its description
// Uses hierarchical context: Project → Epic → Feature

import Anthropic from '@anthropic-ai/sdk';
import { HierarchicalContext, Feature, Epic, Project, CustomPersona, DEFAULT_PERSONAS } from '../supabase';

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY || '',
});

export interface GeneratedStory {
    narrative: string;
    persona: 'member' | 'admin' | 'staff' | 'business' | 'guest';
    priority: 'P0' | 'P1' | 'P2';
    acceptance_criteria: string[];
    rationale: string;
}

export interface StoryGenerationResult {
    stories: GeneratedStory[];
    feature_context: string;
    generation_notes: string[];
    // Diff-based generation info
    existing_coverage?: {
        count: number;
        covered_areas: string[];
    };
    gaps_filled?: string[];
    // Suggestions for unassigned stories
    story_suggestions?: StorySuggestion[];
}

export interface StoryForContext {
    id: string;
    narrative: string;
    persona: string;
    status: string;
}

export interface FeatureContext {
    feature: Feature;
    epic: Epic;
    project: Project;
    // Stories already assigned to this feature
    existingStories?: StoryForContext[];
    // Stories in the epic but not assigned to any feature (potential candidates)
    unassignedEpicStories?: StoryForContext[];
    // Custom personas from project brief (if available)
    customPersonas?: CustomPersona[];
}

export interface StorySuggestion {
    story_id: string;
    narrative: string;
    should_assign: boolean;
    confidence: number;
    reason: string;
}

/**
 * Build the persona section of the prompt based on custom or default personas
 */
function buildPersonaSection(personas: CustomPersona[]): { section: string; ids: string } {
    const personaLines = personas.map(p => `- ${p.id}: ${p.description}`);
    const personaIds = personas.map(p => p.id).join('|');
    return {
        section: `PERSONA TYPES:\n${personaLines.join('\n')}`,
        ids: personaIds,
    };
}

/**
 * Generate the story generation prompt with dynamic personas
 */
function buildStoryGenerationPrompt(personas: CustomPersona[]): string {
    const personaInfo = buildPersonaSection(personas);

    return `You are an expert product manager specializing in user story creation for software projects.

Your task is to generate well-formed user stories for a specific Feature within a larger Epic. Each story should:
1. Follow the format: "As a [persona], I want [action] so that [benefit]"
2. Be specific, testable, and implementable
3. Include clear acceptance criteria
4. Align with the Feature's purpose and the Epic's goals

${personaInfo.section}

PRIORITY LEVELS:
- P0: Critical - Must have for MVP/launch
- P1: High - Important but can be in fast-follow
- P2: Normal - Nice to have, can be deferred

OUTPUT FORMAT:
Return a valid JSON object with this structure:
{
    "stories": [
        {
            "narrative": "As a [persona], I want [action] so that [benefit]",
            "persona": "${personaInfo.ids}",
            "priority": "P0|P1|P2",
            "acceptance_criteria": [
                "Criterion 1",
                "Criterion 2",
                "Criterion 3"
            ],
            "rationale": "Why this story is important for the Feature"
        }
    ],
    "feature_context": "Summary of how these stories fulfill the feature requirements",
    "generation_notes": ["Any assumptions or notes about the generation"],
    "existing_coverage": {
        "count": 0,
        "covered_areas": ["Area 1 covered by existing stories"]
    },
    "gaps_filled": ["Gap 1 that new stories address"]
}

GUIDELINES:
- Generate 3-7 stories depending on Feature complexity
- Start with P0 stories (core functionality), then P1 (enhancements), then P2 (polish)
- Each story should be completable in 1-3 sprints
- Avoid overly broad stories - break them down
- Consider edge cases and error handling scenarios
- Include at least one story per primary persona type relevant to the Feature

IMPORTANT - DIFF-BASED GENERATION:
If existing stories are provided, DO NOT generate duplicates. Instead:
1. Analyze what the existing stories cover
2. Identify gaps - what functionality is missing
3. Generate ONLY stories that fill those gaps
4. Report what's covered and what gaps you're filling`;
}

// Legacy static prompt (used when no custom personas)
const STORY_GENERATION_PROMPT = `You are an expert product manager specializing in user story creation for software projects.

Your task is to generate well-formed user stories for a specific Feature within a larger Epic. Each story should:
1. Follow the format: "As a [persona], I want [action] so that [benefit]"
2. Be specific, testable, and implementable
3. Include clear acceptance criteria
4. Align with the Feature's purpose and the Epic's goals

PERSONA TYPES:
- member: End users/customers who use the main application
- admin: System administrators with elevated privileges
- staff: Internal team members (employees)
- business: Business owners/managers who need reporting/oversight
- guest: Unauthenticated visitors

PRIORITY LEVELS:
- P0: Critical - Must have for MVP/launch
- P1: High - Important but can be in fast-follow
- P2: Normal - Nice to have, can be deferred

OUTPUT FORMAT:
Return a valid JSON object with this structure:
{
    "stories": [
        {
            "narrative": "As a [persona], I want [action] so that [benefit]",
            "persona": "member|admin|staff|business|guest",
            "priority": "P0|P1|P2",
            "acceptance_criteria": [
                "Criterion 1",
                "Criterion 2",
                "Criterion 3"
            ],
            "rationale": "Why this story is important for the Feature"
        }
    ],
    "feature_context": "Summary of how these stories fulfill the feature requirements",
    "generation_notes": ["Any assumptions or notes about the generation"],
    "existing_coverage": {
        "count": 0,
        "covered_areas": ["Area 1 covered by existing stories"]
    },
    "gaps_filled": ["Gap 1 that new stories address"]
}

GUIDELINES:
- Generate 3-7 stories depending on Feature complexity
- Start with P0 stories (core functionality), then P1 (enhancements), then P2 (polish)
- Each story should be completable in 1-3 sprints
- Avoid overly broad stories - break them down
- Consider edge cases and error handling scenarios
- Include at least one story per primary persona type relevant to the Feature

IMPORTANT - DIFF-BASED GENERATION:
If existing stories are provided, DO NOT generate duplicates. Instead:
1. Analyze what the existing stories cover
2. Identify gaps - what functionality is missing
3. Generate ONLY stories that fill those gaps
4. Report what's covered and what gaps you're filling`;

const DIFF_GENERATION_PROMPT = `You are analyzing existing user stories and generating ONLY what's missing.

Your task is to:
1. Analyze the existing stories to understand what's already covered
2. Identify gaps in the current coverage
3. Generate NEW stories that fill those gaps (do NOT duplicate existing functionality)
4. Report both existing coverage and gaps being filled

Return valid JSON with the standard story format plus existing_coverage and gaps_filled fields.`;

/**
 * Build context section for the AI prompt
 */
function buildFeatureContext(context: FeatureContext): string {
    const sections: string[] = [];

    // Project Context
    sections.push(`
# PROJECT CONTEXT
**Project**: ${context.project.name}
${context.project.description ? `**Description**: ${context.project.description}` : ''}
`);

    // Epic Context
    sections.push(`
# EPIC CONTEXT
**Epic**: ${context.epic.name}
${context.epic.description ? `**Description**: ${context.epic.description}` : ''}
${context.epic.user_value ? `**User Value**: ${context.epic.user_value}` : ''}
${context.epic.business_objectives?.length ? `**Business Objectives**:\n${context.epic.business_objectives.map(o => `- ${o}`).join('\n')}` : ''}
${context.epic.technical_context ? `**Technical Context**: ${context.epic.technical_context}` : ''}
`);

    // Feature Context (the main focus)
    sections.push(`
# FEATURE CONTEXT (Generate stories for THIS feature)
**Feature Name**: ${context.feature.name}
**Feature Description**: ${context.feature.description || 'No description provided'}
**Feature Status**: ${context.feature.status}
**Feature Priority**: ${context.feature.priority}
`);

    // Existing Stories (for diff-based generation)
    if (context.existingStories && context.existingStories.length > 0) {
        sections.push(`
# EXISTING STORIES (Already implemented - DO NOT duplicate these)
The following ${context.existingStories.length} stories already exist for this feature.
Analyze what they cover and generate ONLY NEW stories that fill gaps.

${context.existingStories.map(s => `- [${s.id}] "${s.narrative}" (${s.persona}, ${s.status})`).join('\n')}
`);
    }

    // Unassigned Epic Stories (candidates for assignment)
    if (context.unassignedEpicStories && context.unassignedEpicStories.length > 0) {
        sections.push(`
# UNASSIGNED STORIES IN EPIC (Candidates for this Feature)
The following ${context.unassignedEpicStories.length} stories exist in the Epic but are NOT assigned to any Feature.
Analyze each one and determine if it SHOULD be assigned to THIS feature.

${context.unassignedEpicStories.map(s => `- [${s.id}] "${s.narrative}" (${s.persona}, ${s.status})`).join('\n')}

For each unassigned story, include in your response whether it should be assigned to this Feature.
`);
    }

    return sections.join('\n');
}

/**
 * Generate user stories for a Feature
 */
export async function generateStoriesForFeature(
    context: FeatureContext,
    additionalInstructions?: string
): Promise<StoryGenerationResult> {
    const featureContextText = buildFeatureContext(context);
    const hasExistingStories = context.existingStories && context.existingStories.length > 0;

    // Use different prompts based on whether we're doing diff-based generation
    const userMessage = hasExistingStories
        ? `Analyze existing stories and generate ONLY NEW stories that fill gaps.

${featureContextText}

${additionalInstructions ? `## Additional Instructions\n${additionalInstructions}` : ''}

IMPORTANT: There are already ${context.existingStories!.length} stories for this feature.
1. Analyze what functionality they cover
2. Identify gaps that are NOT covered
3. Generate ONLY stories that fill those gaps
4. DO NOT duplicate what's already covered
5. Report existing_coverage and gaps_filled in your response

Return valid JSON.`
        : `Generate user stories for the Feature described below.

${featureContextText}

${additionalInstructions ? `## Additional Instructions\n${additionalInstructions}` : ''}

Generate comprehensive user stories that would fully implement this Feature. Return valid JSON.`;

    // Use custom personas if provided, otherwise use defaults
    const personas = context.customPersonas && context.customPersonas.length > 0
        ? context.customPersonas
        : DEFAULT_PERSONAS;

    // Build the system prompt with dynamic personas
    const basePrompt = buildStoryGenerationPrompt(personas);
    const systemPrompt = hasExistingStories
        ? basePrompt + '\n\n' + DIFF_GENERATION_PROMPT
        : basePrompt;

    try {
        console.log('[Story Generation] Starting generation for feature:', context.feature.name,
            hasExistingStories ? `(diff mode: ${context.existingStories!.length} existing)` : '(full mode)',
            `using ${personas.length} personas`);

        const response = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 8192,
            system: systemPrompt,
            messages: [
                {
                    role: 'user',
                    content: userMessage,
                },
            ],
        });

        // Extract text content
        const textContent = response.content
            .filter((block): block is Anthropic.TextBlock => block.type === 'text')
            .map((block) => block.text)
            .join('\n');

        // Parse JSON from response
        const jsonMatch = textContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            try {
                const parsed = JSON.parse(jsonMatch[0]) as StoryGenerationResult;
                console.log(`[Story Generation] Generated ${parsed.stories.length} stories for feature "${context.feature.name}"`);
                return parsed;
            } catch (parseError) {
                console.error('[Story Generation] JSON parse error:', parseError);
                console.error('[Story Generation] Raw response preview:', textContent.substring(0, 500));
                throw new Error('Failed to parse AI response as JSON');
            }
        }

        console.warn('[Story Generation] No JSON found in response. Response preview:', textContent.substring(0, 500));
        throw new Error('AI response did not contain valid JSON');

    } catch (error) {
        console.error('[Story Generation] API error:', error);
        throw error;
    }
}

/**
 * Estimate generation time
 */
export function estimateStoryGenerationTime(): number {
    return 15; // ~15 seconds for story generation
}
