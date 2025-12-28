// Feature Generator Service
// Analyzes an Epic's feature_areas and generates Feature entities with descriptions

import Anthropic from '@anthropic-ai/sdk';
import { Epic } from '../supabase';

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY || '',
});

export interface GeneratedFeature {
    name: string;
    description: string;
    priority: 'P0' | 'P1' | 'P2';
    rationale: string;
}

export interface FeatureGenerationResult {
    features: GeneratedFeature[];
    reasoning: string;
    used_fallback?: boolean;
}

const FEATURE_GENERATION_PROMPT = `You are an expert product manager helping to break down an epic into discrete features.

Your task is to analyze the epic's context (name, description, feature areas, business objectives) and generate well-defined Feature entities.

GUIDELINES:
1. Each feature should represent a cohesive, deliverable unit of functionality
2. Feature names should be clear and action-oriented (e.g., "User Registration", "Profile Management", "Table Booking")
3. Descriptions should explain what the feature enables for users (1-2 sentences)
4. Priority should reflect business value and dependencies:
   - P0: Critical, blocking other work or core to the epic
   - P1: Important, high value but not blocking
   - P2: Nice to have, can be deferred
5. If feature_areas are provided, use them as the primary source but enhance with better names/descriptions
6. If no feature_areas exist, derive features from the epic description and business objectives
7. Aim for 3-8 features per epic (not too granular, not too broad)

OUTPUT FORMAT:
Return a valid JSON object with this structure:
{
    "features": [
        {
            "name": "Feature Name",
            "description": "What this feature enables for users",
            "priority": "P0 | P1 | P2",
            "rationale": "Why this feature is needed and how it supports the epic goals"
        }
    ],
    "reasoning": "Overall explanation of how features were derived and organized"
}`;

/**
 * Generate Feature entities from an Epic's context
 */
export async function generateFeaturesFromEpic(epic: Epic): Promise<FeatureGenerationResult> {
    // Build context from epic
    const epicContext = buildEpicContext(epic);

    // If we have very little context, use fallback
    if (!epic.feature_areas?.length && !epic.description && !epic.business_objectives?.length) {
        return fallbackFeatureGeneration(epic);
    }

    try {
        console.log('[Feature Generation] Analyzing epic:', epic.name);

        const response = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 4096,
            system: FEATURE_GENERATION_PROMPT,
            messages: [
                {
                    role: 'user',
                    content: epicContext,
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
                const parsed = JSON.parse(jsonMatch[0]) as FeatureGenerationResult;
                console.log(`[Feature Generation] Generated ${parsed.features.length} features`);
                return parsed;
            } catch (parseError) {
                console.error('[Feature Generation] JSON parse error:', parseError);
                return fallbackFeatureGeneration(epic);
            }
        }

        console.warn('[Feature Generation] No JSON found in response');
        return fallbackFeatureGeneration(epic);

    } catch (error) {
        console.error('[Feature Generation] API error:', error);
        return fallbackFeatureGeneration(epic);
    }
}

/**
 * Build context string from epic for the AI prompt
 */
function buildEpicContext(epic: Epic): string {
    let context = `Analyze this epic and generate Feature entities:\n\n`;

    context += `## Epic: ${epic.name}\n`;

    if (epic.description) {
        context += `\n### Description\n${epic.description}\n`;
    }

    if (epic.feature_areas?.length) {
        context += `\n### Feature Checklist/Areas\n`;
        context += epic.feature_areas.map(f => `- ${f}`).join('\n');
        context += '\n';
    }

    if (epic.business_objectives?.length) {
        context += `\n### Business Objectives\n`;
        context += epic.business_objectives.map(o => `- ${o}`).join('\n');
        context += '\n';
    }

    if (epic.user_value) {
        context += `\n### User Value\n${epic.user_value}\n`;
    }

    if (epic.success_metrics?.length) {
        context += `\n### Success Metrics\n`;
        context += epic.success_metrics.map(m => `- ${m}`).join('\n');
        context += '\n';
    }

    if (epic.technical_context) {
        context += `\n### Technical Context\n${epic.technical_context}\n`;
    }

    context += `\nGenerate well-defined Feature entities based on this context. Return valid JSON.`;

    return context;
}

/**
 * Fallback feature generation using simple parsing of feature_areas
 */
function fallbackFeatureGeneration(epic: Epic): FeatureGenerationResult {
    const features: GeneratedFeature[] = [];

    // If we have feature_areas, convert them to features
    if (epic.feature_areas?.length) {
        epic.feature_areas.forEach((area, index) => {
            // Clean up the feature area name
            const name = area.trim();

            // Assign priority based on position (first items are usually more important)
            let priority: 'P0' | 'P1' | 'P2' = 'P1';
            if (index === 0) priority = 'P0';
            else if (index >= epic.feature_areas.length - 2) priority = 'P2';

            features.push({
                name,
                description: `Feature for ${name.toLowerCase()} functionality`,
                priority,
                rationale: 'Derived from epic feature checklist',
            });
        });
    } else if (epic.name) {
        // Create a single feature from the epic name
        features.push({
            name: epic.name,
            description: epic.description || `Core functionality for ${epic.name}`,
            priority: 'P1',
            rationale: 'Created from epic name as no feature areas were specified',
        });
    }

    return {
        features,
        reasoning: 'Features generated using fallback method (AI was unavailable). Review and adjust as needed.',
        used_fallback: true,
    };
}

/**
 * Estimate feature generation time
 */
export function estimateFeatureGenerationTime(epic: Epic): number {
    const areaCount = epic.feature_areas?.length || 0;
    // Base time + time per feature area
    return 3 + Math.min(areaCount * 0.5, 5);
}
