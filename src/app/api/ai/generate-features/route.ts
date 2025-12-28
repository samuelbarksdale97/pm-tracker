import { NextRequest, NextResponse } from 'next/server';
import { generateFeaturesFromEpic } from '@/lib/ai/feature-generator';
import { getEpic } from '@/lib/supabase';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { epicId } = body;

        // Validate required fields
        if (!epicId) {
            return NextResponse.json(
                { error: 'Epic ID is required' },
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

        console.log('[API] Generating features for epic:', {
            epicId,
            epicName: epic.name,
            featureAreasCount: epic.feature_areas?.length || 0,
        });

        // Generate features
        const result = await generateFeaturesFromEpic(epic);

        return NextResponse.json({
            success: true,
            data: result,
            metadata: {
                epic_id: epicId,
                epic_name: epic.name,
                feature_areas_analyzed: epic.feature_areas?.length || 0,
            },
        });

    } catch (error) {
        console.error('Error in generate-features API:', error);
        return NextResponse.json(
            {
                error: 'Failed to generate features',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}

// GET for endpoint documentation
export async function GET() {
    return NextResponse.json({
        endpoint: '/api/ai/generate-features',
        method: 'POST',
        description: 'Analyze an epic and generate Feature entities from its context',
        body: {
            epicId: 'The ID of the epic to analyze',
        },
        response: {
            success: true,
            data: {
                features: [
                    {
                        name: 'Feature Name',
                        description: 'What this feature enables',
                        priority: 'P0 | P1 | P2',
                        rationale: 'Why this feature exists',
                    }
                ],
                reasoning: 'How features were derived',
                used_fallback: 'true if AI was unavailable',
            },
        },
    });
}
