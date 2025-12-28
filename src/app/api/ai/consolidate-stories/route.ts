import { NextRequest, NextResponse } from 'next/server';
import { bulkConsolidateStories, BulkConsolidationResult } from '@/lib/ai/story-consolidator';
import { getUserStoriesForFeature, getFeatureById } from '@/lib/supabase';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            featureId,
            generatedStories
        } = body as {
            featureId: string;
            generatedStories: Array<{
                narrative: string;
                persona: string;
                priority: string;
                acceptance_criteria: string[];
                rationale: string;
            }>;
        };

        if (!featureId) {
            return NextResponse.json(
                { success: false, error: 'featureId is required' },
                { status: 400 }
            );
        }

        if (!generatedStories || !Array.isArray(generatedStories) || generatedStories.length === 0) {
            return NextResponse.json(
                { success: false, error: 'generatedStories array is required' },
                { status: 400 }
            );
        }

        // Get feature context
        const feature = await getFeatureById(featureId);
        if (!feature) {
            return NextResponse.json(
                { success: false, error: 'Feature not found' },
                { status: 404 }
            );
        }

        // Get existing stories in this feature
        const existingStories = await getUserStoriesForFeature(featureId);

        // Run consolidation analysis
        const result = await bulkConsolidateStories(
            generatedStories,
            existingStories.map(s => ({
                id: s.id,
                narrative: s.narrative,
                persona: s.persona,
                feature_area: s.feature_area,
                feature_id: s.feature_id,
                acceptance_criteria: s.acceptance_criteria || undefined
            })),
            {
                name: feature.name,
                description: feature.description || undefined
            }
        );

        return NextResponse.json({
            success: true,
            data: result,
            metadata: {
                feature_id: featureId,
                feature_name: feature.name,
                existing_story_count: existingStories.length,
                generated_story_count: generatedStories.length
            }
        });
    } catch (error) {
        console.error('[API] Error consolidating stories:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to consolidate stories'
            },
            { status: 500 }
        );
    }
}

export async function GET() {
    return NextResponse.json({
        endpoint: '/api/ai/consolidate-stories',
        method: 'POST',
        description: 'Analyzes generated stories against existing ones for duplicates and overlap',
        body: {
            featureId: 'string - ID of the feature',
            generatedStories: 'array - Stories from AI generation to analyze'
        },
        response: {
            stories_to_create: 'New stories to create',
            stories_to_merge: 'Stories that should be merged with existing ones',
            stories_to_skip: 'Duplicate stories to skip',
            summary: 'Consolidation statistics'
        }
    });
}
