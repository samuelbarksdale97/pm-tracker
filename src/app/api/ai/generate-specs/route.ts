import { NextRequest, NextResponse } from 'next/server';
import { generateTaskSpecs, type PlatformId } from '@/lib/ai/task-generator';
import { getHierarchicalContext } from '@/lib/supabase';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        const { userStory, selectedPlatforms, additionalContext } = body;

        // Validate required fields
        if (!userStory || !userStory.narrative) {
            return NextResponse.json(
                { error: 'User story with narrative is required' },
                { status: 400 }
            );
        }

        if (!selectedPlatforms || selectedPlatforms.length === 0) {
            return NextResponse.json(
                { error: 'At least one platform must be selected' },
                { status: 400 }
            );
        }

        // Validate platform IDs
        const validPlatforms = ['A', 'B', 'C', 'D'];
        const invalidPlatforms = selectedPlatforms.filter(
            (p: string) => !validPlatforms.includes(p)
        );
        if (invalidPlatforms.length > 0) {
            return NextResponse.json(
                { error: `Invalid platform IDs: ${invalidPlatforms.join(', ')}` },
                { status: 400 }
            );
        }

        // Fetch hierarchical context if userStory has an ID
        let hierarchicalContext = null;
        if (userStory.id && userStory.id !== 'NEW') {
            try {
                hierarchicalContext = await getHierarchicalContext(userStory.id);
                console.log('[API] Fetched hierarchical context:', {
                    hasContext: !!hierarchicalContext,
                    projectName: hierarchicalContext?.project?.name,
                    epicName: hierarchicalContext?.epic?.name,
                });
            } catch (contextError) {
                // Log but don't fail - context is optional
                console.warn('[API] Failed to fetch hierarchical context:', contextError);
            }
        }

        // Generate specs with hierarchical context
        const result = await generateTaskSpecs(
            {
                id: userStory.id || 'NEW',
                narrative: userStory.narrative,
                persona: userStory.persona || 'member',
                feature_area: userStory.feature_area || 'general',
                acceptance_criteria: userStory.acceptance_criteria || null,
                priority: userStory.priority || 'P1',
            },
            {
                selectedPlatforms: selectedPlatforms as PlatformId[],
                additionalContext,
                hierarchicalContext,
            }
        );

        return NextResponse.json({
            success: true,
            data: result,
            metadata: {
                platforms_generated: selectedPlatforms.length,
                tasks_generated: result.tasks.length,
                has_integration_strategy: !!result.integration_strategy,
                assumptions_count: result.assumptions.length,
                overall_confidence: result.overall_confidence,
            },
        });
    } catch (error) {
        console.error('Error in generate-specs API:', error);
        return NextResponse.json(
            {
                error: 'Failed to generate specs',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}

// Also support GET for testing
export async function GET() {
    return NextResponse.json({
        endpoint: '/api/ai/generate-specs',
        method: 'POST',
        description: 'Generate platform-specific task specs from a user story',
        body: {
            userStory: {
                id: 'US-001 (optional)',
                narrative: 'As a member, I want to...',
                persona: 'member | admin | staff | business | guest',
                feature_area: 'auth | events | reservations | ...',
                acceptance_criteria: ['criterion 1', 'criterion 2'],
                priority: 'P0 | P1 | P2',
            },
            selectedPlatforms: ['A', 'B', 'C', 'D'],
            additionalContext: 'Optional extra context for generation',
        },
        platforms: {
            A: 'Backend',
            B: 'Mobile App',
            C: 'Admin Dashboard',
            D: 'Infrastructure',
        },
    });
}
