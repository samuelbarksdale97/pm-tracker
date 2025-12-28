import { NextRequest, NextResponse } from 'next/server';
import {
    reviewArtifact,
    quickReview,
    innovationReview,
    ReviewContext,
    ReviewArtifact,
} from '@/lib/ai/reviewer-improver';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { artifact, context, mode } = body as {
            artifact: ReviewArtifact;
            context?: Partial<ReviewContext>;
            mode?: 'full' | 'quick' | 'innovation';
        };

        // Validate required fields
        if (!artifact) {
            return NextResponse.json(
                { error: 'Artifact is required' },
                { status: 400 }
            );
        }

        if (!artifact.type || !artifact.name || !artifact.content) {
            return NextResponse.json(
                { error: 'Artifact must have type, name, and content' },
                { status: 400 }
            );
        }

        console.log('[API] Review request:', {
            artifactType: artifact.type,
            artifactName: artifact.name,
            contentLength: artifact.content.length,
            mode: mode || 'full',
        });

        let result;

        switch (mode) {
            case 'quick':
                result = await quickReview(artifact);
                break;

            case 'innovation':
                result = await innovationReview(artifact, context?.additional_context);
                break;

            case 'full':
            default:
                const fullContext: ReviewContext = {
                    artifact,
                    review_focus: context?.review_focus,
                    project_phase: context?.project_phase,
                    priorities: context?.priorities,
                    additional_context: context?.additional_context,
                };
                result = await reviewArtifact(fullContext);
                break;
        }

        return NextResponse.json({
            success: true,
            data: result,
            metadata: {
                artifact_type: artifact.type,
                artifact_name: artifact.name,
                mode: mode || 'full',
                review_id: 'review_metadata' in result ? (result as { review_metadata?: { review_id?: string } }).review_metadata?.review_id : undefined,
            },
        });

    } catch (error) {
        console.error('Error in review API:', error);
        return NextResponse.json(
            {
                error: 'Failed to review artifact',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}

// GET for endpoint documentation
export async function GET() {
    return NextResponse.json({
        endpoint: '/api/ai/review',
        method: 'POST',
        description: 'Review artifacts for issues, gaps, and improvement opportunities',
        body: {
            artifact: {
                type: 'code | architecture | api_design | ui_component | directive | decision | workflow | documentation | system_design | ai_service',
                name: 'Name of the artifact',
                content: 'The actual content to review',
                purpose: 'Optional: What this artifact is for',
                constraints: ['Optional: Constraints to consider'],
                related_artifacts: ['Optional: Related items'],
                version: 'Optional: Version identifier',
            },
            context: {
                review_focus: ['correctness', 'completeness', 'efficiency', 'maintainability', 'usability', 'innovation', 'security', 'scalability'],
                project_phase: 'exploration | design | implementation | refinement | optimization',
                priorities: {
                    speed_vs_quality: 'speed | balanced | quality',
                    innovation_vs_stability: 'innovative | balanced | stable',
                    scope: 'minimal | standard | comprehensive',
                },
                additional_context: 'Optional: Extra context for the review',
            },
            mode: 'full | quick | innovation',
        },
        modes: {
            full: 'Complete review with all sections (default)',
            quick: 'Fast review focusing only on critical/major issues',
            innovation: 'Deep exploration of improvement and innovation opportunities',
        },
        response: {
            success: true,
            data: {
                summary: {
                    overall_quality: 'number (1-100)',
                    readiness_level: 'not_ready | needs_work | acceptable | good | excellent',
                    key_strengths: ['Strength 1', 'Strength 2'],
                    primary_concerns: ['Concern 1', 'Concern 2'],
                },
                issues: ['Array of issues with severity, category, fix suggestions'],
                gaps: ['Array of gaps with severity and suggested approaches'],
                improvement_directions: ['Multiple paths forward with trade-off analysis'],
                innovations: ['Novel ideas and opportunities discovered'],
                learnings: ['Meta-insights that apply beyond this artifact'],
                recommended_next_steps: ['Prioritized actions'],
            },
        },
    });
}
