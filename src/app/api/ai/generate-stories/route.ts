import { NextRequest, NextResponse } from 'next/server';
import { generateStoriesForFeature, FeatureContext } from '@/lib/ai/story-generator';
import { getFeature, getEpic, getProject, getUserStoriesForFeature } from '@/lib/supabase';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { featureId, additionalInstructions } = body;

        // Validate required fields
        if (!featureId) {
            return NextResponse.json(
                { error: 'Feature ID is required' },
                { status: 400 }
            );
        }

        // Fetch the feature
        const feature = await getFeature(featureId);
        if (!feature) {
            return NextResponse.json(
                { error: 'Feature not found' },
                { status: 404 }
            );
        }

        // Fetch the epic (parent of feature)
        const epic = await getEpic(feature.epic_id);
        if (!epic) {
            return NextResponse.json(
                { error: 'Epic not found for this feature' },
                { status: 404 }
            );
        }

        // Fetch the project (parent of epic)
        const project = await getProject(epic.project_id);
        if (!project) {
            return NextResponse.json(
                { error: 'Project not found for this epic' },
                { status: 404 }
            );
        }

        // Fetch existing stories for diff-based generation
        const existingStories = await getUserStoriesForFeature(featureId);
        const existingStoriesForContext = existingStories.map(s => ({
            id: s.id,
            narrative: s.narrative,
            persona: s.persona,
            status: s.status,
        }));

        // Build the context
        const context: FeatureContext = {
            feature,
            epic,
            project,
            existingStories: existingStoriesForContext.length > 0 ? existingStoriesForContext : undefined,
        };

        console.log('[API] Generating stories for feature:', {
            featureId,
            featureName: feature.name,
            epicName: epic.name,
            projectName: project.name,
            existingStoryCount: existingStoriesForContext.length,
            mode: existingStoriesForContext.length > 0 ? 'diff' : 'full',
        });

        // Generate stories
        const result = await generateStoriesForFeature(context, additionalInstructions);

        return NextResponse.json({
            success: true,
            data: result,
            metadata: {
                feature_id: featureId,
                feature_name: feature.name,
                epic_name: epic.name,
                project_name: project.name,
                stories_generated: result.stories.length,
                existing_story_count: existingStoriesForContext.length,
                generation_mode: existingStoriesForContext.length > 0 ? 'diff' : 'full',
            },
        });

    } catch (error) {
        console.error('Error in generate-stories API:', error);
        return NextResponse.json(
            {
                error: 'Failed to generate stories',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}

// GET for endpoint documentation
export async function GET() {
    return NextResponse.json({
        endpoint: '/api/ai/generate-stories',
        method: 'POST',
        description: 'Generate user stories for a Feature using AI',
        body: {
            featureId: 'The ID of the feature to generate stories for',
            additionalInstructions: 'Optional: Additional instructions for story generation',
        },
        response: {
            success: true,
            data: {
                stories: [
                    {
                        narrative: 'As a [persona], I want [action] so that [benefit]',
                        persona: 'member | admin | staff | business | guest',
                        priority: 'P0 | P1 | P2',
                        acceptance_criteria: ['criterion 1', 'criterion 2'],
                        rationale: 'Why this story matters',
                    }
                ],
                feature_context: 'Summary of how stories fulfill feature requirements',
                generation_notes: ['Any generation notes'],
            },
            metadata: {
                feature_id: 'string',
                feature_name: 'string',
                stories_generated: 'number',
            },
        },
    });
}
