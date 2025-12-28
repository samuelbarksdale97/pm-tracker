// Story Categorizer Service
// Analyzes a user story and suggests the best Feature to assign it to
// Can also suggest creating a new Feature if none fit well

import Anthropic from '@anthropic-ai/sdk';
import { Feature } from '../supabase';

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY || '',
});

export interface CategorizationResult {
    recommendation: 'existing' | 'new' | 'none';
    // If recommending an existing feature
    suggested_feature_id?: string;
    suggested_feature_name?: string;
    confidence: number; // 0-100
    reasoning: string;
    // If recommending a new feature
    new_feature_suggestion?: {
        name: string;
        description: string;
        priority: 'P0' | 'P1' | 'P2';
    };
    // Alternative matches (for user to choose from)
    alternatives?: Array<{
        feature_id: string;
        feature_name: string;
        match_score: number;
        reason: string;
    }>;
    // Flag to indicate if fallback method was used (AI failed)
    used_fallback?: boolean;
}

export interface CategorizationInput {
    narrative: string;
    persona: string;
    acceptance_criteria?: string[] | null;
    epic_name: string;
    epic_description?: string | null;
    available_features: Feature[];
}

const CATEGORIZATION_PROMPT = `You are an expert product manager analyzing user stories and categorizing them into features.

Your task is to analyze a user story and determine which existing Feature it best belongs to, or if a new Feature should be created.

GUIDELINES:
1. Match stories to features based on functional domain, not just keywords
2. Consider the user persona and what functionality they need
3. If multiple features could fit, choose the most specific one
4. Suggest a new feature only if the story doesn't fit well into ANY existing feature
5. Consider the epic context - features should align with the epic's goals

CONFIDENCE LEVELS:
- 90-100: Perfect match, story clearly belongs to this feature
- 70-89: Good match, story fits well but has some overlap with others
- 50-69: Moderate match, story could fit but isn't ideal
- Below 50: Poor match, consider creating a new feature

OUTPUT FORMAT:
Return a valid JSON object with this structure:
{
    "recommendation": "existing" | "new" | "none",
    "suggested_feature_id": "FEAT-xxx (only if recommending existing)",
    "suggested_feature_name": "Feature Name (only if recommending existing)",
    "confidence": 0-100,
    "reasoning": "Explanation of why this recommendation was made",
    "new_feature_suggestion": {
        "name": "New Feature Name (only if recommendation is 'new')",
        "description": "What this feature enables for users",
        "priority": "P0 | P1 | P2"
    },
    "alternatives": [
        {
            "feature_id": "FEAT-xxx",
            "feature_name": "Alternative Feature",
            "match_score": 0-100,
            "reason": "Why this is an alternative"
        }
    ]
}

If no features exist or the epic context doesn't provide enough info, return:
{
    "recommendation": "none",
    "confidence": 0,
    "reasoning": "No features available to categorize into"
}`;

/**
 * Categorize a user story into the best matching Feature
 */
export async function categorizeStory(input: CategorizationInput): Promise<CategorizationResult> {
    // If no features exist, suggest creating a new one based on the story
    if (input.available_features.length === 0) {
        return {
            recommendation: 'new',
            confidence: 70,
            reasoning: 'No existing features in this epic. Suggesting a new feature based on the story.',
            new_feature_suggestion: suggestNewFeatureFromStory(input),
        };
    }

    const featuresContext = input.available_features.map(f =>
        `- ID: ${f.id}\n  Name: ${f.name}\n  Description: ${f.description || 'No description'}\n  Priority: ${f.priority}`
    ).join('\n\n');

    const userMessage = `Analyze this user story and recommend which Feature it belongs to.

## Epic Context
**Epic Name**: ${input.epic_name}
${input.epic_description ? `**Epic Description**: ${input.epic_description}` : ''}

## Available Features in this Epic
${featuresContext}

## User Story to Categorize
**Narrative**: "${input.narrative}"
**Persona**: ${input.persona}
${input.acceptance_criteria?.length ? `**Acceptance Criteria**:\n${input.acceptance_criteria.map(c => `- ${c}`).join('\n')}` : ''}

Analyze the story and return your recommendation as valid JSON.`;

    try {
        console.log('[Story Categorization] Analyzing story for feature match');

        const response = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 2048,
            system: CATEGORIZATION_PROMPT,
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
                const parsed = JSON.parse(jsonMatch[0]) as CategorizationResult;
                console.log(`[Story Categorization] Recommendation: ${parsed.recommendation}, Confidence: ${parsed.confidence}`);
                return parsed;
            } catch (parseError) {
                console.error('[Story Categorization] JSON parse error:', parseError);
                return fallbackCategorization(input);
            }
        }

        console.warn('[Story Categorization] No JSON found in response');
        return fallbackCategorization(input);

    } catch (error) {
        console.error('[Story Categorization] API error:', error);
        return fallbackCategorization(input);
    }
}

/**
 * Fallback categorization using simple keyword matching
 */
function fallbackCategorization(input: CategorizationInput): CategorizationResult {
    const narrativeLower = input.narrative.toLowerCase();

    // Simple keyword matching as fallback
    let bestMatch: Feature | null = null;
    let bestScore = 0;

    for (const feature of input.available_features) {
        const featureWords = feature.name.toLowerCase().split(/\s+/);
        const descriptionWords = (feature.description || '').toLowerCase().split(/\s+/);
        const allWords = [...featureWords, ...descriptionWords];

        let score = 0;
        for (const word of allWords) {
            if (word.length > 3 && narrativeLower.includes(word)) {
                score += 10;
            }
        }

        if (score > bestScore) {
            bestScore = score;
            bestMatch = feature;
        }
    }

    if (bestMatch && bestScore >= 10) {
        return {
            recommendation: 'existing',
            suggested_feature_id: bestMatch.id,
            suggested_feature_name: bestMatch.name,
            confidence: Math.min(50 + bestScore, 80), // Cap at 80 for keyword matching
            reasoning: 'Matched based on keyword similarity (fallback method)',
            used_fallback: true,
        };
    }

    return {
        recommendation: 'new',
        confidence: 60,
        reasoning: 'No strong match found with existing features',
        new_feature_suggestion: suggestNewFeatureFromStory(input),
        used_fallback: true,
    };
}

/**
 * Suggest a new feature based on the story content
 */
function suggestNewFeatureFromStory(input: CategorizationInput): {
    name: string;
    description: string;
    priority: 'P0' | 'P1' | 'P2';
} {
    // Extract key action from narrative
    const actionMatch = input.narrative.match(/I want to ([^,]+)/i)
        || input.narrative.match(/I want ([^,]+)/i);

    let featureName = 'New Feature';
    if (actionMatch) {
        // Capitalize first letter of each word
        const action = actionMatch[1].trim();
        featureName = action
            .split(' ')
            .slice(0, 4) // Limit to 4 words
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    return {
        name: featureName,
        description: `Feature to support: ${input.narrative.substring(0, 150)}...`,
        priority: 'P1',
    };
}

/**
 * Estimate categorization time
 */
export function estimateCategorizationTime(): number {
    return 5; // ~5 seconds for categorization
}
