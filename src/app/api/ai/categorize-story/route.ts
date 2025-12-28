import { NextRequest, NextResponse } from 'next/server';
import { categorizeStory, CategorizationInput } from '@/lib/ai/story-categorizer';
import { getEpic, getFeatures } from '@/lib/supabase';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { epicId, narrative, persona, acceptance_criteria } = body;

        // Validate required fields
        if (!epicId) {
            return NextResponse.json(
                { error: 'Epic ID is required' },
                { status: 400 }
            );
        }

        if (!narrative) {
            return NextResponse.json(
                { error: 'Story narrative is required' },
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

        // Fetch available features for this epic
        const features = await getFeatures(epicId);

        console.log('[API] Categorizing story for epic:', {
            epicId,
            epicName: epic.name,
            featureCount: features.length,
            narrativePreview: narrative.substring(0, 50) + '...',
        });

        // Build categorization input
        const input: CategorizationInput = {
            narrative,
            persona: persona || 'member',
            acceptance_criteria: acceptance_criteria || null,
            epic_name: epic.name,
            epic_description: epic.description,
            available_features: features,
        };

        // Categorize the story
        const result = await categorizeStory(input);

        return NextResponse.json({
            success: true,
            data: result,
            metadata: {
                epic_id: epicId,
                epic_name: epic.name,
                features_analyzed: features.length,
            },
        });

    } catch (error) {
        console.error('Error in categorize-story API:', error);
        return NextResponse.json(
            {
                error: 'Failed to categorize story',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}

// GET for endpoint documentation
export async function GET() {
    return NextResponse.json({
        endpoint: '/api/ai/categorize-story',
        method: 'POST',
        description: 'Analyze a user story and suggest which Feature it belongs to',
        body: {
            epicId: 'The ID of the epic containing the features',
            narrative: 'The user story narrative text',
            persona: 'Optional: member | admin | staff | business | guest',
            acceptance_criteria: 'Optional: Array of acceptance criteria strings',
        },
        response: {
            success: true,
            data: {
                recommendation: 'existing | new | none',
                suggested_feature_id: 'FEAT-xxx (if existing)',
                suggested_feature_name: 'Feature Name (if existing)',
                confidence: '0-100',
                reasoning: 'Explanation of the recommendation',
                new_feature_suggestion: {
                    name: 'New Feature Name (if recommendation is new)',
                    description: 'Feature description',
                    priority: 'P0 | P1 | P2',
                },
                alternatives: 'Array of alternative feature matches',
            },
        },
    });
}
