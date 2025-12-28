import { NextRequest, NextResponse } from 'next/server';
import { analyzeSolution, DecisionContext } from '@/lib/ai/solution-architect';
import { analyzeWithEnhancements, DecisionContext as EnhancedContext } from '@/lib/ai/solution-architect-v2';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { context, version, force_deep } = body as {
            context: DecisionContext | EnhancedContext;
            version?: 'v1' | 'v2';
            force_deep?: boolean;
        };

        // Validate required fields
        if (!context) {
            return NextResponse.json(
                { error: 'Decision context is required' },
                { status: 400 }
            );
        }

        if (!context.decision_summary) {
            return NextResponse.json(
                { error: 'Decision summary is required' },
                { status: 400 }
            );
        }

        if (!context.options || !Array.isArray(context.options) || context.options.length < 2) {
            return NextResponse.json(
                { error: 'At least 2 options are required for comparison' },
                { status: 400 }
            );
        }

        // Validate each option has required fields
        for (const option of context.options) {
            if (!option.id || !option.name || !option.description) {
                return NextResponse.json(
                    { error: 'Each option must have id, name, and description' },
                    { status: 400 }
                );
            }
        }

        console.log('[API] Analyzing solution:', {
            decision: context.decision_summary.substring(0, 100) + '...',
            optionCount: context.options.length,
            domain: context.domain?.type || 'general',
            version: version || 'v2',
        });

        // Use v2 (enhanced) by default
        if (version === 'v1') {
            // Legacy v1 analysis
            const result = await analyzeSolution(context);

            return NextResponse.json({
                success: true,
                data: result,
                metadata: {
                    version: 'v1',
                    mode: 'full',
                    options_evaluated: context.options.length,
                    recommended: result.recommendation.recommended_option_name,
                    confidence: result.recommendation.confidence,
                },
            });
        }

        // Enhanced v2 analysis with all three features
        const result = await analyzeWithEnhancements(context as EnhancedContext, {
            force_deep_analysis: force_deep,
        });

        return NextResponse.json({
            success: true,
            data: result,
            metadata: {
                version: 'v2',
                analysis_depth: result.analysis_depth,
                options_evaluated: context.options.length,
                recommended: result.recommendation.recommended_option_name,
                confidence: result.recommendation.confidence,
                fingerprint: result.fingerprint.fingerprint_hash,
                similar_decisions_found: result.similar_decisions.length,
                evaluation_dimensions: result.evaluation_framework.dimensions.length,
                total_time_ms: result.analysis_metadata.total_time_ms,
            },
        });

    } catch (error) {
        console.error('Error in analyze-solution API:', error);
        return NextResponse.json(
            {
                error: 'Failed to analyze solution',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}

// GET for endpoint documentation
export async function GET() {
    return NextResponse.json({
        endpoint: '/api/ai/analyze-solution',
        method: 'POST',
        description: 'Analyze solution options using Principal Architecture + HCI expertise',
        body: {
            context: {
                decision_summary: 'Brief description of the decision to be made',
                options: [
                    {
                        id: 'option_1',
                        name: 'Option Name',
                        description: 'What this option entails',
                        pros: ['Optional list of pros'],
                        cons: ['Optional list of cons'],
                    }
                ],
                domain: {
                    type: 'product_management | software_architecture | ux_design | data_modeling | workflow_design | general',
                    description: 'Optional domain-specific context',
                },
                user_context: {
                    personas: ['User types affected'],
                    skill_level: 'novice | intermediate | expert | mixed',
                    primary_goals: ['What users want to accomplish'],
                    pain_points: ['Current frustrations'],
                },
                technical_context: {
                    existing_system: 'Description of current tech stack',
                    constraints: ['Technical limitations'],
                    scale: 'small | medium | large | enterprise',
                },
                business_context: {
                    urgency: 'low | medium | high | critical',
                    budget_constraint: 'tight | moderate | flexible',
                    long_term_vision: 'Where this fits in the bigger picture',
                },
                additional_context: 'Any other relevant information',
            },
            quick: 'Optional boolean - use quick mode for simpler decisions',
        },
        response: {
            success: true,
            data: {
                recommendation: {
                    recommended_option_id: 'string',
                    recommended_option_name: 'string',
                    confidence: 'number (0-100)',
                    recommendation_rationale: 'Why this option was selected',
                    key_factors: ['Factors that drove the decision'],
                    next_steps: ['What to do next'],
                },
                evaluations: ['Detailed evaluation of each option'],
                comparative_analysis: {
                    summary: 'Overall comparison',
                    trade_off_matrix: ['Dimension-by-dimension comparison'],
                },
                principles_applied: ['Design principles that informed analysis'],
            },
        },
        examples: {
            simple_request: {
                context: {
                    decision_summary: 'How should we triage unassigned stories to features?',
                    options: [
                        { id: 'matrix', name: 'Coverage Matrix', description: 'Visual matrix showing all stories vs features' },
                        { id: 'queue', name: 'Triage Queue', description: 'Card-by-card sequential review' },
                    ],
                    domain: { type: 'ux_design' },
                },
            },
        },
    });
}
