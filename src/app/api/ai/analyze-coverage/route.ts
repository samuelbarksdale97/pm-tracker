import { NextRequest, NextResponse } from 'next/server';
import { analyzeCoverage } from '@/lib/ai/coverage-analyzer';
import { getEpic, getUserStoriesForEpic } from '@/lib/supabase';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { epicId, generatedFeatures } = body;

        // Validate required fields
        if (!epicId) {
            return NextResponse.json(
                { error: 'Epic ID is required' },
                { status: 400 }
            );
        }

        if (!generatedFeatures || !Array.isArray(generatedFeatures)) {
            return NextResponse.json(
                { error: 'Generated features array is required' },
                { status: 400 }
            );
        }

        // Fetch the epic
        const epic = await getEpic(epicId);
        if (!epic) {
            return NextResponse.json(
                { error: 'Epic not found' },
                { status: 404 }
            );
        }

        // Fetch existing stories for this epic
        const existingStories = await getUserStoriesForEpic(epicId);

        console.log('[API] Analyzing coverage:', {
            epicId,
            epicName: epic.name,
            featureCount: generatedFeatures.length,
            existingStoryCount: existingStories.length,
        });

        // Analyze coverage
        const result = await analyzeCoverage({
            epic,
            generated_features: generatedFeatures,
            existing_stories: existingStories,
        });

        return NextResponse.json({
            success: true,
            data: result,
            metadata: {
                epic_id: epicId,
                epic_name: epic.name,
                features_analyzed: generatedFeatures.length,
                stories_analyzed: existingStories.length,
            },
        });

    } catch (error) {
        console.error('Error in analyze-coverage API:', error);
        return NextResponse.json(
            {
                error: 'Failed to analyze coverage',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}

// GET for endpoint documentation
export async function GET() {
    return NextResponse.json({
        endpoint: '/api/ai/analyze-coverage',
        method: 'POST',
        description: 'Analyze how existing user stories align with generated Features',
        body: {
            epicId: 'The ID of the epic',
            generatedFeatures: [
                {
                    name: 'Feature Name',
                    description: 'Feature description',
                }
            ],
        },
        response: {
            success: true,
            data: {
                summary: {
                    total_features: 6,
                    total_existing_stories: 16,
                    well_covered: 2,
                    partially_covered: 2,
                    not_covered: 2,
                    orphan_stories: 3,
                },
                feature_coverage: '...',
                orphan_stories: '...',
                recommendations: '...',
            },
        },
    });
}
