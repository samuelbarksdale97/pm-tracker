/**
 * Story Consolidator - Hybrid + Q Approach
 *
 * Detects potential duplicate or overlapping user stories using semantic similarity.
 * Provides merge suggestions and consolidation options.
 *
 * The "hybrid + Q" approach:
 * - Hybrid: Combines keyword matching with semantic similarity
 * - Q: Uses question-based prompting to detect functional overlap
 */

import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY || '',
});

export interface StoryForComparison {
    id: string;
    narrative: string;
    persona: string;
    feature_area?: string;
    feature_id?: string | null;
    acceptance_criteria?: string[];
}

export interface SimilarityMatch {
    story_id: string;
    narrative: string;
    similarity_score: number; // 0-100
    overlap_type: 'exact_duplicate' | 'functional_overlap' | 'partial_overlap' | 'related';
    overlapping_aspects: string[];
    merge_recommendation: 'merge' | 'keep_separate' | 'review';
    merge_rationale: string;
}

export interface ConsolidationResult {
    generated_story: {
        narrative: string;
        persona: string;
    };
    similar_existing_stories: SimilarityMatch[];
    has_potential_duplicates: boolean;
    recommendation: 'proceed' | 'review_matches' | 'skip_duplicate';
    consolidated_narrative?: string; // If merge is recommended
}

export interface BulkConsolidationResult {
    stories_to_create: Array<{
        narrative: string;
        persona: string;
        priority: string;
        acceptance_criteria: string[];
        rationale: string;
        consolidation_info?: {
            merged_with?: string[];
            action: 'create_new' | 'merge_with_existing' | 'skip';
        };
    }>;
    stories_to_merge: Array<{
        generated_narrative: string;
        existing_story_id: string;
        existing_narrative: string;
        merged_narrative: string;
        reason: string;
    }>;
    stories_to_skip: Array<{
        narrative: string;
        duplicate_of: string;
        reason: string;
    }>;
    summary: {
        total_generated: number;
        new_stories: number;
        merges_suggested: number;
        duplicates_found: number;
    };
}

const CONSOLIDATION_PROMPT = `You are an expert at analyzing user stories for functional overlap and duplication.

Your task is to compare newly generated user stories against existing stories in a feature and:
1. Identify exact duplicates (same functionality, different wording)
2. Find functional overlaps (stories that could be combined)
3. Detect partial overlaps (some shared aspects)
4. Note related but distinct stories

For each generated story, you must determine:
- Does an existing story already cover this functionality?
- Could this be merged with an existing story without losing value?
- Is this truly a new piece of functionality?

OVERLAP TYPES:
- exact_duplicate: Same functionality described differently (e.g., "view reservations" vs "see my reservations")
- functional_overlap: Significant shared functionality that should be merged (e.g., "cancel reservation" could include "get confirmation of cancellation")
- partial_overlap: Some shared aspects but distinct enough to keep separate
- related: Thematically related but clearly different functionality

MERGE RECOMMENDATIONS:
- merge: Stories should be combined into one
- keep_separate: Stories are distinct enough to remain separate
- review: Human should decide (borderline cases)

OUTPUT FORMAT: Return valid JSON matching the BulkConsolidationResult interface.`;

/**
 * Detect similar stories using semantic comparison
 */
export async function detectSimilarStories(
    generatedStory: { narrative: string; persona: string },
    existingStories: StoryForComparison[],
    threshold: number = 60 // Similarity score threshold
): Promise<SimilarityMatch[]> {
    if (existingStories.length === 0) {
        return [];
    }

    // First pass: Quick keyword-based filtering
    const potentialMatches = existingStories.filter(existing => {
        const generatedWords = new Set(
            generatedStory.narrative.toLowerCase()
                .replace(/[^a-z0-9\s]/g, '')
                .split(/\s+/)
                .filter(w => w.length > 3)
        );
        const existingWords = new Set(
            existing.narrative.toLowerCase()
                .replace(/[^a-z0-9\s]/g, '')
                .split(/\s+/)
                .filter(w => w.length > 3)
        );

        // Count common words
        let common = 0;
        generatedWords.forEach(word => {
            if (existingWords.has(word)) common++;
        });

        // If at least 2 meaningful words match, do deeper analysis
        return common >= 2 || existing.persona === generatedStory.persona;
    });

    if (potentialMatches.length === 0) {
        return [];
    }

    // Second pass: AI-powered semantic analysis
    try {
        const response = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 2048,
            system: `You analyze user stories for semantic similarity and functional overlap.
Return a JSON array of matches with similarity_score (0-100), overlap_type, overlapping_aspects, merge_recommendation, and merge_rationale.
Only include stories with similarity_score >= ${threshold}.`,
            messages: [{
                role: 'user',
                content: `Compare this generated story to existing stories and find matches.

GENERATED STORY:
"${generatedStory.narrative}" (persona: ${generatedStory.persona})

EXISTING STORIES:
${potentialMatches.map(s => `- [${s.id}] "${s.narrative}" (persona: ${s.persona})`).join('\n')}

Return JSON array of SimilarityMatch objects for stories with similarity >= ${threshold}.`
            }]
        });

        const textContent = response.content
            .filter((block): block is Anthropic.TextBlock => block.type === 'text')
            .map(block => block.text)
            .join('\n');

        const jsonMatch = textContent.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
            const matches = JSON.parse(jsonMatch[0]) as SimilarityMatch[];
            return matches.filter(m => m.similarity_score >= threshold);
        }

        return [];
    } catch (error) {
        console.error('[Story Consolidator] Error detecting similar stories:', error);
        return [];
    }
}

/**
 * Bulk consolidation: Process multiple generated stories at once
 */
export async function bulkConsolidateStories(
    generatedStories: Array<{
        narrative: string;
        persona: string;
        priority: string;
        acceptance_criteria: string[];
        rationale: string;
    }>,
    existingStories: StoryForComparison[],
    featureContext: { name: string; description?: string }
): Promise<BulkConsolidationResult> {
    if (existingStories.length === 0) {
        // No existing stories, all generated stories are new
        return {
            stories_to_create: generatedStories.map(s => ({
                ...s,
                consolidation_info: { action: 'create_new' as const }
            })),
            stories_to_merge: [],
            stories_to_skip: [],
            summary: {
                total_generated: generatedStories.length,
                new_stories: generatedStories.length,
                merges_suggested: 0,
                duplicates_found: 0
            }
        };
    }

    try {
        const response = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 4096,
            system: CONSOLIDATION_PROMPT,
            messages: [{
                role: 'user',
                content: `Analyze these newly generated stories against existing stories for consolidation.

FEATURE CONTEXT:
Name: ${featureContext.name}
Description: ${featureContext.description || 'Not provided'}

NEWLY GENERATED STORIES:
${generatedStories.map((s, i) => `[G${i + 1}] "${s.narrative}" (${s.persona}, ${s.priority})`).join('\n')}

EXISTING STORIES IN THIS FEATURE:
${existingStories.map(s => `[${s.id}] "${s.narrative}" (${s.persona})`).join('\n')}

For each generated story, determine if it should be:
1. Created as new (no significant overlap)
2. Merged with an existing story (provide merged narrative)
3. Skipped as duplicate

Return valid JSON matching BulkConsolidationResult interface.`
            }]
        });

        const textContent = response.content
            .filter((block): block is Anthropic.TextBlock => block.type === 'text')
            .map(block => block.text)
            .join('\n');

        const jsonMatch = textContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const result = JSON.parse(jsonMatch[0]) as BulkConsolidationResult;
            return result;
        }

        // Fallback if parsing fails
        return {
            stories_to_create: generatedStories.map(s => ({
                ...s,
                consolidation_info: { action: 'create_new' as const }
            })),
            stories_to_merge: [],
            stories_to_skip: [],
            summary: {
                total_generated: generatedStories.length,
                new_stories: generatedStories.length,
                merges_suggested: 0,
                duplicates_found: 0
            }
        };
    } catch (error) {
        console.error('[Story Consolidator] Error in bulk consolidation:', error);
        // On error, proceed with all stories as new
        return {
            stories_to_create: generatedStories.map(s => ({
                ...s,
                consolidation_info: { action: 'create_new' as const }
            })),
            stories_to_merge: [],
            stories_to_skip: [],
            summary: {
                total_generated: generatedStories.length,
                new_stories: generatedStories.length,
                merges_suggested: 0,
                duplicates_found: 0
            }
        };
    }
}

/**
 * Generate a merged narrative from two overlapping stories
 */
export async function generateMergedNarrative(
    story1: { narrative: string; persona: string; acceptance_criteria?: string[] },
    story2: { narrative: string; persona: string; acceptance_criteria?: string[] }
): Promise<{ merged_narrative: string; merged_criteria: string[] }> {
    try {
        const response = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1024,
            messages: [{
                role: 'user',
                content: `Merge these two overlapping user stories into a single comprehensive story.

STORY 1:
"${story1.narrative}" (${story1.persona})
Acceptance Criteria: ${story1.acceptance_criteria?.join('; ') || 'None'}

STORY 2:
"${story2.narrative}" (${story2.persona})
Acceptance Criteria: ${story2.acceptance_criteria?.join('; ') || 'None'}

Return JSON: { "merged_narrative": "...", "merged_criteria": ["..."] }`
            }]
        });

        const textContent = response.content
            .filter((block): block is Anthropic.TextBlock => block.type === 'text')
            .map(block => block.text)
            .join('\n');

        const jsonMatch = textContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }

        // Fallback: Combine narratives simply
        return {
            merged_narrative: `${story1.narrative} Additionally, ${story2.narrative.toLowerCase().replace(/^as a \w+,?\s*/i, '')}`,
            merged_criteria: [
                ...(story1.acceptance_criteria || []),
                ...(story2.acceptance_criteria || [])
            ]
        };
    } catch (error) {
        console.error('[Story Consolidator] Error merging narratives:', error);
        return {
            merged_narrative: story1.narrative,
            merged_criteria: story1.acceptance_criteria || []
        };
    }
}

/**
 * Calculate a simple keyword-based similarity score (for quick filtering)
 */
export function quickSimilarityScore(narrative1: string, narrative2: string): number {
    const words1 = new Set(
        narrative1.toLowerCase()
            .replace(/[^a-z0-9\s]/g, '')
            .split(/\s+/)
            .filter(w => w.length > 3 && !['want', 'that', 'this', 'with', 'from', 'have', 'been', 'being', 'would', 'could', 'should', 'member', 'admin', 'staff', 'user'].includes(w))
    );
    const words2 = new Set(
        narrative2.toLowerCase()
            .replace(/[^a-z0-9\s]/g, '')
            .split(/\s+/)
            .filter(w => w.length > 3 && !['want', 'that', 'this', 'with', 'from', 'have', 'been', 'being', 'would', 'could', 'should', 'member', 'admin', 'staff', 'user'].includes(w))
    );

    let common = 0;
    words1.forEach(word => {
        if (words2.has(word)) common++;
    });

    const total = new Set([...words1, ...words2]).size;
    if (total === 0) return 0;

    return Math.round((common / total) * 100);
}
