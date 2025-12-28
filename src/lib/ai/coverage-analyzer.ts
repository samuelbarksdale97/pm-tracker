// Coverage Analyzer Service
// Analyzes how existing user stories align with generated Features
// Identifies gaps, duplicates, and orphan stories

import Anthropic from '@anthropic-ai/sdk';
import { Epic, Feature, UserStory } from '../supabase';

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY || '',
});

export interface StoryMapping {
    story_id: string;
    story_narrative: string;
    suggested_feature_id: string | null;
    suggested_feature_name: string | null;
    coverage_type: 'full' | 'partial' | 'orphan';
    confidence: number;
    notes: string;
}

export interface FeatureCoverage {
    feature_name: string;
    feature_description: string;
    coverage_status: 'well_covered' | 'partially_covered' | 'not_covered';
    existing_stories: Array<{
        story_id: string;
        narrative: string;
        coverage: 'full' | 'partial';
    }>;
    gaps: string[];
}

export interface CoverageAnalysisResult {
    summary: {
        total_features: number;
        total_existing_stories: number;
        well_covered: number;
        partially_covered: number;
        not_covered: number;
        orphan_stories: number;
    };
    feature_coverage: FeatureCoverage[];
    orphan_stories: Array<{
        story_id: string;
        narrative: string;
        suggestion: string;
    }>;
    recommendations: string[];
    used_fallback?: boolean;
}

export interface CoverageAnalysisInput {
    epic: Epic;
    generated_features: Array<{
        name: string;
        description: string;
    }>;
    existing_stories: UserStory[];
}

const COVERAGE_ANALYSIS_PROMPT = `You are an expert product manager analyzing how existing user stories align with a set of generated Features.

Your task is to:
1. Map each existing story to the Feature it best fits (or mark as orphan)
2. Identify which Features are well-covered, partially covered, or not covered
3. Find gaps - what stories would be needed to fully cover each Feature
4. Suggest what to do with orphan stories

COVERAGE DEFINITIONS:
- well_covered: 2+ existing stories cover the core functionality
- partially_covered: 1 story exists but gaps remain
- not_covered: No existing stories address this Feature

OUTPUT FORMAT:
Return a valid JSON object with this structure:
{
    "feature_coverage": [
        {
            "feature_name": "Feature Name",
            "feature_description": "What the feature does",
            "coverage_status": "well_covered | partially_covered | not_covered",
            "existing_stories": [
                {
                    "story_id": "US-xxx",
                    "narrative": "Story text...",
                    "coverage": "full | partial"
                }
            ],
            "gaps": ["Missing capability 1", "Missing capability 2"]
        }
    ],
    "orphan_stories": [
        {
            "story_id": "US-xxx",
            "narrative": "Story that doesn't fit...",
            "suggestion": "Consider creating a new Feature for X, or archive if obsolete"
        }
    ],
    "recommendations": [
        "Overall recommendation 1",
        "Overall recommendation 2"
    ]
}`;

/**
 * Analyze coverage of generated Features by existing stories
 */
export async function analyzeCoverage(input: CoverageAnalysisInput): Promise<CoverageAnalysisResult> {
    // If no existing stories, all features are not covered
    if (input.existing_stories.length === 0) {
        return {
            summary: {
                total_features: input.generated_features.length,
                total_existing_stories: 0,
                well_covered: 0,
                partially_covered: 0,
                not_covered: input.generated_features.length,
                orphan_stories: 0,
            },
            feature_coverage: input.generated_features.map(f => ({
                feature_name: f.name,
                feature_description: f.description,
                coverage_status: 'not_covered' as const,
                existing_stories: [],
                gaps: ['No existing stories - all functionality needs to be implemented'],
            })),
            orphan_stories: [],
            recommendations: ['No existing stories found. Generate new stories for each Feature.'],
        };
    }

    // If no features, all stories are orphans
    if (input.generated_features.length === 0) {
        return {
            summary: {
                total_features: 0,
                total_existing_stories: input.existing_stories.length,
                well_covered: 0,
                partially_covered: 0,
                not_covered: 0,
                orphan_stories: input.existing_stories.length,
            },
            feature_coverage: [],
            orphan_stories: input.existing_stories.map(s => ({
                story_id: s.id,
                narrative: s.narrative,
                suggestion: 'Generate Features first, then re-analyze coverage',
            })),
            recommendations: ['Generate Features from the Epic first, then analyze coverage.'],
        };
    }

    try {
        console.log('[Coverage Analysis] Analyzing', input.existing_stories.length, 'stories against', input.generated_features.length, 'features');

        const contextMessage = buildAnalysisContext(input);

        const response = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 4096,
            system: COVERAGE_ANALYSIS_PROMPT,
            messages: [
                {
                    role: 'user',
                    content: contextMessage,
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
                const parsed = JSON.parse(jsonMatch[0]);
                const result = buildResultFromParsed(parsed, input);
                console.log('[Coverage Analysis] Complete:', result.summary);
                return result;
            } catch (parseError) {
                console.error('[Coverage Analysis] JSON parse error:', parseError);
                return fallbackCoverageAnalysis(input);
            }
        }

        console.warn('[Coverage Analysis] No JSON found in response');
        return fallbackCoverageAnalysis(input);

    } catch (error) {
        console.error('[Coverage Analysis] API error:', error);
        return fallbackCoverageAnalysis(input);
    }
}

/**
 * Build context message for AI analysis
 */
function buildAnalysisContext(input: CoverageAnalysisInput): string {
    let context = `Analyze how these existing user stories align with the generated Features.\n\n`;

    context += `## Epic: ${input.epic.name}\n`;
    if (input.epic.description) {
        context += `${input.epic.description}\n`;
    }
    context += '\n';

    context += `## Generated Features (${input.generated_features.length})\n`;
    input.generated_features.forEach((f, i) => {
        context += `${i + 1}. **${f.name}**: ${f.description}\n`;
    });
    context += '\n';

    context += `## Existing User Stories (${input.existing_stories.length})\n`;
    input.existing_stories.forEach((s) => {
        context += `- [${s.id}] "${s.narrative}" (${s.persona}, ${s.status})\n`;
    });
    context += '\n';

    context += `Analyze coverage and return valid JSON.`;

    return context;
}

/**
 * Build result object from parsed AI response
 */
function buildResultFromParsed(
    parsed: {
        feature_coverage?: FeatureCoverage[];
        orphan_stories?: Array<{ story_id: string; narrative: string; suggestion: string }>;
        recommendations?: string[];
    },
    input: CoverageAnalysisInput
): CoverageAnalysisResult {
    const featureCoverage = parsed.feature_coverage || [];
    const orphanStories = parsed.orphan_stories || [];

    // Calculate summary
    const wellCovered = featureCoverage.filter(f => f.coverage_status === 'well_covered').length;
    const partiallyCovered = featureCoverage.filter(f => f.coverage_status === 'partially_covered').length;
    const notCovered = featureCoverage.filter(f => f.coverage_status === 'not_covered').length;

    return {
        summary: {
            total_features: input.generated_features.length,
            total_existing_stories: input.existing_stories.length,
            well_covered: wellCovered,
            partially_covered: partiallyCovered,
            not_covered: notCovered,
            orphan_stories: orphanStories.length,
        },
        feature_coverage: featureCoverage,
        orphan_stories: orphanStories,
        recommendations: parsed.recommendations || [],
    };
}

/**
 * Fallback coverage analysis using keyword matching
 */
function fallbackCoverageAnalysis(input: CoverageAnalysisInput): CoverageAnalysisResult {
    const featureCoverage: FeatureCoverage[] = [];
    const assignedStoryIds = new Set<string>();

    // Simple keyword matching for each feature
    for (const feature of input.generated_features) {
        const featureWords = feature.name.toLowerCase().split(/\s+/);
        const matchingStories: FeatureCoverage['existing_stories'] = [];

        for (const story of input.existing_stories) {
            if (assignedStoryIds.has(story.id)) continue;

            const narrativeLower = story.narrative.toLowerCase();
            let matchScore = 0;

            for (const word of featureWords) {
                if (word.length > 3 && narrativeLower.includes(word)) {
                    matchScore += 1;
                }
            }

            if (matchScore >= 1) {
                matchingStories.push({
                    story_id: story.id,
                    narrative: story.narrative,
                    coverage: matchScore >= 2 ? 'full' : 'partial',
                });
                assignedStoryIds.add(story.id);
            }
        }

        let coverageStatus: FeatureCoverage['coverage_status'] = 'not_covered';
        if (matchingStories.length >= 2) {
            coverageStatus = 'well_covered';
        } else if (matchingStories.length === 1) {
            coverageStatus = 'partially_covered';
        }

        featureCoverage.push({
            feature_name: feature.name,
            feature_description: feature.description,
            coverage_status: coverageStatus,
            existing_stories: matchingStories,
            gaps: coverageStatus === 'not_covered'
                ? ['No matching stories found']
                : coverageStatus === 'partially_covered'
                    ? ['Additional stories may be needed']
                    : [],
        });
    }

    // Find orphan stories
    const orphanStories = input.existing_stories
        .filter(s => !assignedStoryIds.has(s.id))
        .map(s => ({
            story_id: s.id,
            narrative: s.narrative,
            suggestion: 'Review and assign to a Feature manually',
        }));

    const wellCovered = featureCoverage.filter(f => f.coverage_status === 'well_covered').length;
    const partiallyCovered = featureCoverage.filter(f => f.coverage_status === 'partially_covered').length;
    const notCovered = featureCoverage.filter(f => f.coverage_status === 'not_covered').length;

    return {
        summary: {
            total_features: input.generated_features.length,
            total_existing_stories: input.existing_stories.length,
            well_covered: wellCovered,
            partially_covered: partiallyCovered,
            not_covered: notCovered,
            orphan_stories: orphanStories.length,
        },
        feature_coverage: featureCoverage,
        orphan_stories: orphanStories,
        recommendations: [
            'Coverage analyzed using keyword matching (fallback method).',
            'Review the mappings and adjust as needed.',
        ],
        used_fallback: true,
    };
}
