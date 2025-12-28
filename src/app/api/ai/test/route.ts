import { NextRequest, NextResponse } from 'next/server';
import {
    getSolutionArchitectV2TestSuite,
    runTestSuite,
    formatTestResults,
    TestSuiteResult,
} from '@/lib/ai/testing-agent';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            target = 'solution-architect-v2',
            skip_categories = [],
            format = 'json'
        } = body as {
            target?: string;
            skip_categories?: string[];
            format?: 'json' | 'text';
        };

        console.log('[API] Running test suite:', { target, skip_categories });

        let result: TestSuiteResult;

        switch (target) {
            case 'solution-architect-v2':
                const suite = getSolutionArchitectV2TestSuite();
                result = await runTestSuite(
                    suite,
                    '/api/ai/analyze-solution',
                    {
                        skipCategories: skip_categories,
                        onProgress: (completed, total, testResult) => {
                            console.log(`[Test ${completed}/${total}] ${testResult.test_name}: ${testResult.status}`);
                        }
                    }
                );
                break;

            default:
                return NextResponse.json(
                    { error: `Unknown test target: ${target}` },
                    { status: 400 }
                );
        }

        if (format === 'text') {
            return new NextResponse(formatTestResults(result), {
                headers: { 'Content-Type': 'text/plain' }
            });
        }

        return NextResponse.json({
            success: true,
            data: result,
        });

    } catch (error) {
        console.error('Error running tests:', error);
        return NextResponse.json(
            {
                error: 'Failed to run tests',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}

// GET for documentation
export async function GET() {
    return NextResponse.json({
        endpoint: '/api/ai/test',
        method: 'POST',
        description: 'Run comprehensive test suites on AI services',
        body: {
            target: 'solution-architect-v2 (default)',
            skip_categories: ['Optional array of categories to skip: functional, edge_case, performance, consistency, integration'],
            format: 'json (default) | text',
        },
        available_targets: [
            'solution-architect-v2',
        ],
        response: {
            success: true,
            data: {
                suite_id: 'string',
                summary: {
                    total: 'number',
                    passed: 'number',
                    failed: 'number',
                    pass_rate: 'number (percentage)',
                },
                ready_for_production: 'boolean',
                confidence_score: 'number (0-100)',
                results: ['Individual test results'],
                recommendations: ['Actions to take'],
            },
        },
    });
}
