/**
 * Testing Agent - AI Service Validator
 *
 * A meta-cognitive agent that thoroughly tests AI services to ensure
 * reliability before production use. Tests functionality, edge cases,
 * performance, and consistency.
 *
 * Part of the DOE (Directive-Orchestration-Execution) framework.
 */

import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

// ============================================================================
// Types
// ============================================================================

export interface TestCase {
    id: string;
    name: string;
    description: string;
    category: 'functional' | 'edge_case' | 'performance' | 'consistency' | 'integration';
    input: Record<string, unknown>;
    expected_behavior: string;
    validation_criteria: string[];
}

export interface TestResult {
    test_id: string;
    test_name: string;
    category: string;
    status: 'passed' | 'failed' | 'warning' | 'skipped';
    duration_ms: number;
    actual_output: Record<string, unknown> | null;
    validation_results: ValidationResult[];
    error?: string;
    notes?: string;
}

export interface ValidationResult {
    criterion: string;
    passed: boolean;
    details: string;
}

export interface TestSuite {
    suite_id: string;
    suite_name: string;
    target_service: string;
    tests: TestCase[];
    created_at: string;
}

export interface TestSuiteResult {
    suite_id: string;
    suite_name: string;
    target_service: string;
    started_at: string;
    completed_at: string;
    total_duration_ms: number;
    summary: {
        total: number;
        passed: number;
        failed: number;
        warnings: number;
        skipped: number;
        pass_rate: number;
    };
    results: TestResult[];
    recommendations: string[];
    ready_for_production: boolean;
    confidence_score: number;
}

// ============================================================================
// Test Case Generation
// ============================================================================

export async function generateTestSuite(
    serviceName: string,
    serviceDescription: string,
    sampleInput: Record<string, unknown>,
    sampleOutput: Record<string, unknown>
): Promise<TestSuite> {
    const systemPrompt = `You are a Quality Assurance Engineer specializing in AI service testing.
Your task is to generate a comprehensive test suite for an AI service.

Generate test cases that cover:
1. FUNCTIONAL tests - verify core functionality works as expected
2. EDGE CASE tests - unusual inputs, boundary conditions, missing fields
3. PERFORMANCE tests - response time expectations, timeout handling
4. CONSISTENCY tests - same input should produce similar outputs
5. INTEGRATION tests - how the service interacts with other components

For each test, provide:
- Clear description of what's being tested
- Specific input data
- Expected behavior description
- Validation criteria (specific checks to perform)

Be thorough but practical. Focus on tests that catch real issues.`;

    const userPrompt = `Generate a test suite for this AI service:

SERVICE: ${serviceName}

DESCRIPTION:
${serviceDescription}

SAMPLE INPUT:
${JSON.stringify(sampleInput, null, 2)}

SAMPLE OUTPUT:
${JSON.stringify(sampleOutput, null, 2)}

Generate 10-15 test cases covering all categories. Return as JSON:
{
    "tests": [
        {
            "id": "test_001",
            "name": "Test name",
            "description": "What this test validates",
            "category": "functional|edge_case|performance|consistency|integration",
            "input": { ... },
            "expected_behavior": "What should happen",
            "validation_criteria": ["Check 1", "Check 2"]
        }
    ]
}`;

    const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        messages: [
            { role: 'user', content: userPrompt }
        ],
        system: systemPrompt,
    });

    const content = response.content[0];
    if (content.type !== 'text') {
        throw new Error('Unexpected response type');
    }

    // Extract JSON from response
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
        throw new Error('Could not parse test suite from response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
        suite_id: `suite_${Date.now().toString(36)}`,
        suite_name: `${serviceName} Test Suite`,
        target_service: serviceName,
        tests: parsed.tests,
        created_at: new Date().toISOString(),
    };
}

// ============================================================================
// Test Execution
// ============================================================================

export async function executeTest(
    test: TestCase,
    serviceEndpoint: string,
    baseUrl: string = 'http://localhost:3000'
): Promise<TestResult> {
    const startTime = Date.now();

    try {
        const response = await fetch(`${baseUrl}${serviceEndpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(test.input),
        });

        const duration = Date.now() - startTime;

        // Check if this is an expected error response (for negative tests)
        const expectedErrorCriteria = test.validation_criteria.some(c =>
            c.toLowerCase().includes('error') ||
            c.toLowerCase().includes('status is 400') ||
            c.toLowerCase().includes('status is 500')
        );

        if (!response.ok) {
            const errorText = await response.text();
            let errorJson: Record<string, unknown> = {};
            try {
                errorJson = JSON.parse(errorText);
            } catch {
                errorJson = { raw_error: errorText };
            }

            // If we expected an error, validate against criteria
            if (expectedErrorCriteria) {
                const validationResults = validateErrorResponse(
                    test.validation_criteria,
                    response.status,
                    errorJson
                );

                const allPassed = validationResults.every(v => v.passed);

                return {
                    test_id: test.id,
                    test_name: test.name,
                    category: test.category,
                    status: allPassed ? 'passed' : 'failed',
                    duration_ms: duration,
                    actual_output: { status: response.status, ...errorJson },
                    validation_results: validationResults,
                };
            }

            // Unexpected error
            return {
                test_id: test.id,
                test_name: test.name,
                category: test.category,
                status: 'failed',
                duration_ms: duration,
                actual_output: null,
                validation_results: [],
                error: `HTTP ${response.status}: ${errorText}`,
            };
        }

        const output = await response.json();

        // Validate the output
        const validationResults = await validateOutput(
            test,
            output,
            duration
        );

        const allPassed = validationResults.every(v => v.passed);
        const anyWarnings = validationResults.some(v =>
            v.details.toLowerCase().includes('warning')
        );

        return {
            test_id: test.id,
            test_name: test.name,
            category: test.category,
            status: allPassed ? (anyWarnings ? 'warning' : 'passed') : 'failed',
            duration_ms: duration,
            actual_output: output,
            validation_results: validationResults,
        };

    } catch (error) {
        return {
            test_id: test.id,
            test_name: test.name,
            category: test.category,
            status: 'failed',
            duration_ms: Date.now() - startTime,
            actual_output: null,
            validation_results: [],
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

async function validateOutput(
    test: TestCase,
    output: Record<string, unknown>,
    durationMs: number
): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];

    // Use AI to validate against criteria
    const systemPrompt = `You are a test validator. Evaluate whether the actual output meets each validation criterion.
Be strict but fair. A criterion passes only if it's clearly met.`;

    const userPrompt = `Validate this test output:

TEST: ${test.name}
EXPECTED BEHAVIOR: ${test.expected_behavior}

ACTUAL OUTPUT:
${JSON.stringify(output, null, 2)}

DURATION: ${durationMs}ms

VALIDATION CRITERIA:
${test.validation_criteria.map((c, i) => `${i + 1}. ${c}`).join('\n')}

For each criterion, respond with JSON:
{
    "validations": [
        {
            "criterion": "The criterion text",
            "passed": true/false,
            "details": "Explanation of why it passed or failed"
        }
    ]
}`;

    try {
        const response = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 2000,
            messages: [{ role: 'user', content: userPrompt }],
            system: systemPrompt,
        });

        const content = response.content[0];
        if (content.type === 'text') {
            const jsonMatch = content.text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                return parsed.validations;
            }
        }
    } catch {
        // Fall back to basic validation
    }

    // Fallback: basic structural validation
    for (const criterion of test.validation_criteria) {
        const passed = basicValidation(criterion, output, durationMs);
        results.push({
            criterion,
            passed,
            details: passed ? 'Basic validation passed' : 'Basic validation failed',
        });
    }

    return results;
}

/**
 * Validate error responses against criteria
 */
function validateErrorResponse(
    criteria: string[],
    statusCode: number,
    errorJson: Record<string, unknown>
): ValidationResult[] {
    const results: ValidationResult[] = [];

    for (const criterion of criteria) {
        const criterionLower = criterion.toLowerCase();
        let passed = false;
        let details = '';

        // Check HTTP status
        if (criterionLower.includes('status is 400')) {
            passed = statusCode === 400;
            details = passed ? `Got expected 400 status` : `Expected 400, got ${statusCode}`;
        } else if (criterionLower.includes('status is 500')) {
            passed = statusCode === 500;
            details = passed ? `Got expected 500 status` : `Expected 500, got ${statusCode}`;
        } else if (criterionLower.includes('http status')) {
            passed = statusCode >= 400;
            details = `Got status ${statusCode}`;
        }
        // Check for error field
        else if (criterionLower.includes('error field') || criterionLower.includes('has error')) {
            passed = 'error' in errorJson;
            details = passed ? `Error field present: ${errorJson.error}` : 'No error field in response';
        }
        // Check error message content
        else if (criterionLower.includes('mentions') || criterionLower.includes('contains')) {
            const words = criterionLower.match(/mentions?\s+(\w+)|contains?\s+['"]?(\w+)['"]?/);
            if (words) {
                const searchTerm = words[1] || words[2];
                const errorStr = JSON.stringify(errorJson).toLowerCase();
                passed = errorStr.includes(searchTerm);
                details = passed ? `Found "${searchTerm}" in error` : `Did not find "${searchTerm}" in error`;
            }
        }
        // Default: error was returned
        else {
            passed = 'error' in errorJson;
            details = passed ? 'Error response received as expected' : 'No error in response';
        }

        results.push({ criterion, passed, details });
    }

    return results;
}

function basicValidation(
    criterion: string,
    output: Record<string, unknown>,
    durationMs: number
): boolean {
    const criterionLower = criterion.toLowerCase();

    // Check for success response
    if (criterionLower.includes('success')) {
        return output.success === true;
    }

    // Check for specific fields
    if (criterionLower.includes('has') || criterionLower.includes('contains')) {
        const fieldMatch = criterion.match(/['"]?(\w+)['"]?/g);
        if (fieldMatch) {
            return fieldMatch.some(field =>
                hasNestedField(output, field.replace(/['"]/g, ''))
            );
        }
    }

    // Check for performance
    if (criterionLower.includes('time') || criterionLower.includes('duration')) {
        const timeMatch = criterion.match(/(\d+)\s*(ms|seconds?|s)/i);
        if (timeMatch) {
            const limit = parseInt(timeMatch[1]) * (timeMatch[2].startsWith('s') ? 1000 : 1);
            return durationMs <= limit;
        }
    }

    // Default to checking response structure
    return output && typeof output === 'object' && Object.keys(output).length > 0;
}

function hasNestedField(obj: unknown, field: string): boolean {
    if (!obj || typeof obj !== 'object') return false;
    if (field in (obj as Record<string, unknown>)) return true;

    for (const value of Object.values(obj as Record<string, unknown>)) {
        if (hasNestedField(value, field)) return true;
    }
    return false;
}

// ============================================================================
// Test Suite Execution
// ============================================================================

export async function runTestSuite(
    suite: TestSuite,
    serviceEndpoint: string,
    options: {
        baseUrl?: string;
        parallelLimit?: number;
        skipCategories?: string[];
        onProgress?: (completed: number, total: number, result: TestResult) => void;
    } = {}
): Promise<TestSuiteResult> {
    const startTime = Date.now();
    const results: TestResult[] = [];
    const {
        baseUrl = 'http://localhost:3000',
        skipCategories = [],
        onProgress
    } = options;

    // Filter tests
    const testsToRun = suite.tests.filter(t =>
        !skipCategories.includes(t.category)
    );

    // Run tests sequentially to avoid overwhelming the service
    for (let i = 0; i < testsToRun.length; i++) {
        const test = testsToRun[i];

        if (skipCategories.includes(test.category)) {
            results.push({
                test_id: test.id,
                test_name: test.name,
                category: test.category,
                status: 'skipped',
                duration_ms: 0,
                actual_output: null,
                validation_results: [],
                notes: 'Category skipped',
            });
            continue;
        }

        const result = await executeTest(test, serviceEndpoint, baseUrl);
        results.push(result);

        if (onProgress) {
            onProgress(i + 1, testsToRun.length, result);
        }

        // Small delay between tests
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    const endTime = Date.now();

    // Calculate summary
    const passed = results.filter(r => r.status === 'passed').length;
    const failed = results.filter(r => r.status === 'failed').length;
    const warnings = results.filter(r => r.status === 'warning').length;
    const skipped = results.filter(r => r.status === 'skipped').length;
    const total = results.length;

    // Generate recommendations
    const recommendations = await generateRecommendations(results, suite);

    // Calculate confidence score
    const passRate = (passed + warnings * 0.5) / (total - skipped);
    const confidenceScore = Math.round(passRate * 100);

    return {
        suite_id: suite.suite_id,
        suite_name: suite.suite_name,
        target_service: suite.target_service,
        started_at: new Date(startTime).toISOString(),
        completed_at: new Date(endTime).toISOString(),
        total_duration_ms: endTime - startTime,
        summary: {
            total,
            passed,
            failed,
            warnings,
            skipped,
            pass_rate: Math.round(passRate * 100),
        },
        results,
        recommendations,
        ready_for_production: failed === 0 && passRate >= 0.9,
        confidence_score: confidenceScore,
    };
}

async function generateRecommendations(
    results: TestResult[],
    suite: TestSuite
): Promise<string[]> {
    const failed = results.filter(r => r.status === 'failed');
    const warnings = results.filter(r => r.status === 'warning');

    if (failed.length === 0 && warnings.length === 0) {
        return ['All tests passed. Service is ready for production use.'];
    }

    const recommendations: string[] = [];

    // Categorize failures
    const failuresByCategory = failed.reduce((acc, r) => {
        acc[r.category] = acc[r.category] || [];
        acc[r.category].push(r);
        return acc;
    }, {} as Record<string, TestResult[]>);

    for (const [category, failures] of Object.entries(failuresByCategory)) {
        if (category === 'functional') {
            recommendations.push(
                `CRITICAL: ${failures.length} functional test(s) failed. Core functionality may be broken.`
            );
        } else if (category === 'edge_case') {
            recommendations.push(
                `${failures.length} edge case(s) failed. Add input validation or error handling.`
            );
        } else if (category === 'performance') {
            recommendations.push(
                `${failures.length} performance test(s) failed. Consider optimization or timeout adjustments.`
            );
        }
    }

    if (warnings.length > 0) {
        recommendations.push(
            `${warnings.length} test(s) passed with warnings. Review before production deployment.`
        );
    }

    return recommendations;
}

// ============================================================================
// Pre-built Test Suites for Common Services
// ============================================================================

export function getSolutionArchitectV2TestSuite(): TestSuite {
    return {
        suite_id: 'suite_solution_architect_v2',
        suite_name: 'Solution Architect V2 Comprehensive Test Suite',
        target_service: 'Solution Architect V2',
        created_at: new Date().toISOString(),
        tests: [
            // Functional Tests
            {
                id: 'func_001',
                name: 'Basic Decision Analysis',
                description: 'Verify core decision analysis with valid input',
                category: 'functional',
                input: {
                    context: {
                        decision_summary: 'Should we use REST or GraphQL for the new API?',
                        options: [
                            { id: 'rest', name: 'REST API', description: 'Traditional RESTful endpoints' },
                            { id: 'graphql', name: 'GraphQL', description: 'Single flexible endpoint with query language' },
                        ],
                        domain: { type: 'software_architecture' },
                    }
                },
                expected_behavior: 'Returns analysis with recommendation, fingerprint, and contextual evaluations',
                validation_criteria: [
                    'Response has success: true',
                    'Has recommendation with recommended_option_id',
                    'Has fingerprint with fingerprint_hash',
                    'Has evaluation_framework with dimensions array',
                    'Has contextual_evaluations for each option',
                    'Confidence score is between 0 and 100',
                ],
            },
            {
                id: 'func_002',
                name: 'Multi-Option Analysis',
                description: 'Verify analysis works with 5 options',
                category: 'functional',
                input: {
                    context: {
                        decision_summary: 'Which database should we use for user data?',
                        options: [
                            { id: 'postgres', name: 'PostgreSQL', description: 'Relational database' },
                            { id: 'mongo', name: 'MongoDB', description: 'Document database' },
                            { id: 'dynamodb', name: 'DynamoDB', description: 'AWS managed NoSQL' },
                            { id: 'firebase', name: 'Firebase', description: 'Google realtime database' },
                            { id: 'supabase', name: 'Supabase', description: 'Open source Firebase alternative' },
                        ],
                        domain: { type: 'data_modeling' },
                    }
                },
                expected_behavior: 'Analyzes all 5 options with contextual framework',
                validation_criteria: [
                    'Response has success: true',
                    'contextual_evaluations has exactly 5 entries',
                    'Each option has dimension_scores',
                    'Has comparative recommendation',
                ],
            },
            {
                id: 'func_003',
                name: 'Quick Scan Detection',
                description: 'Verify quick scan correctly identifies simple decisions',
                category: 'functional',
                input: {
                    context: {
                        decision_summary: 'Should we add a logout button?',
                        options: [
                            { id: 'yes', name: 'Add Logout Button', description: 'Add a logout button to the header' },
                            { id: 'no', name: 'No Logout Button', description: 'Users close the tab to logout' },
                        ],
                        domain: { type: 'ux_design' },
                    }
                },
                expected_behavior: 'Quick scan identifies this as straightforward decision',
                validation_criteria: [
                    'Response has quick_scan_result',
                    'quick_scan_result has analysis_depth_recommended',
                    'Has fingerprint generated',
                ],
            },

            // Progressive Disclosure Tests
            {
                id: 'prog_001',
                name: 'Progressive Disclosure - Complex Decision',
                description: 'Verify deep analysis for complex multi-stakeholder decision',
                category: 'functional',
                input: {
                    context: {
                        decision_summary: 'How should we architect the new payment processing system?',
                        options: [
                            { id: 'stripe', name: 'Stripe Integration', description: 'Direct Stripe API integration' },
                            { id: 'braintree', name: 'Braintree', description: 'PayPal owned payment processor' },
                            { id: 'custom', name: 'Custom Gateway', description: 'Build our own payment abstraction' },
                        ],
                        domain: { type: 'software_architecture' },
                        user_context: {
                            personas: ['Customer', 'Finance Team', 'Developer', 'Compliance Officer'],
                            skill_level: 'mixed',
                        },
                        technical_context: {
                            scale: 'enterprise',
                            constraints: ['PCI compliance required', 'Multi-currency support', 'Sub-second latency'],
                        },
                    }
                },
                expected_behavior: 'Complex decision triggers deep analysis',
                validation_criteria: [
                    'analysis_depth is "deep" or "standard"',
                    'quick_scan_result.needs_deep_analysis is true',
                    'evaluation_framework has at least 4 dimensions',
                ],
            },

            // Fingerprinting Tests
            {
                id: 'fing_001',
                name: 'Fingerprint Generation',
                description: 'Verify fingerprint contains expected fields',
                category: 'functional',
                input: {
                    context: {
                        decision_summary: 'Which frontend framework for the dashboard?',
                        options: [
                            { id: 'react', name: 'React', description: 'Component-based UI library' },
                            { id: 'vue', name: 'Vue', description: 'Progressive framework' },
                        ],
                        domain: { type: 'software_architecture' },
                    }
                },
                expected_behavior: 'Fingerprint has all required fields',
                validation_criteria: [
                    'fingerprint has domain field',
                    'fingerprint has fingerprint_hash (12 character hex)',
                    'fingerprint has keywords array',
                    'fingerprint has trade_off_types array',
                    'fingerprint has created_at timestamp',
                ],
            },
            {
                id: 'fing_002',
                name: 'Fingerprint Consistency',
                description: 'Same decision context should produce same fingerprint hash',
                category: 'consistency',
                input: {
                    context: {
                        decision_summary: 'Static fingerprint test decision',
                        options: [
                            { id: 'a', name: 'Option A', description: 'First option' },
                            { id: 'b', name: 'Option B', description: 'Second option' },
                        ],
                        domain: { type: 'general' },
                    }
                },
                expected_behavior: 'Fingerprint hash is deterministic for same input',
                validation_criteria: [
                    'fingerprint_hash is present',
                    'fingerprint_hash matches pattern [a-f0-9]{12}',
                ],
            },

            // Contextual Framework Tests
            {
                id: 'ctx_001',
                name: 'Domain-Specific Dimensions',
                description: 'UX domain should generate UX-relevant evaluation dimensions',
                category: 'functional',
                input: {
                    context: {
                        decision_summary: 'How should users navigate between sections?',
                        options: [
                            { id: 'tabs', name: 'Tab Navigation', description: 'Horizontal tabs at top' },
                            { id: 'sidebar', name: 'Sidebar', description: 'Vertical navigation menu' },
                        ],
                        domain: { type: 'ux_design' },
                        user_context: {
                            personas: ['Power User', 'Casual User'],
                            primary_goals: ['Quick access to features', 'Discover new functionality'],
                        },
                    }
                },
                expected_behavior: 'Generated dimensions are UX-relevant',
                validation_criteria: [
                    'evaluation_framework.dimensions exists',
                    'At least one dimension relates to usability or user experience',
                    'Dimensions have weight values between 1-10',
                    'framework_rationale explains why these dimensions were chosen',
                ],
            },

            // Edge Cases
            {
                id: 'edge_001',
                name: 'Minimum Options (2)',
                description: 'Should work with exactly 2 options',
                category: 'edge_case',
                input: {
                    context: {
                        decision_summary: 'Binary choice test',
                        options: [
                            { id: 'yes', name: 'Yes', description: 'Affirmative' },
                            { id: 'no', name: 'No', description: 'Negative' },
                        ],
                    }
                },
                expected_behavior: 'Handles minimum option count',
                validation_criteria: [
                    'Response has success: true',
                    'Has recommendation',
                    'contextual_evaluations has 2 entries',
                ],
            },
            {
                id: 'edge_002',
                name: 'Missing Optional Fields',
                description: 'Should work without domain, user_context, etc.',
                category: 'edge_case',
                input: {
                    context: {
                        decision_summary: 'Minimal context decision',
                        options: [
                            { id: 'a', name: 'Option A', description: 'First' },
                            { id: 'b', name: 'Option B', description: 'Second' },
                        ],
                    }
                },
                expected_behavior: 'Defaults are used for missing fields',
                validation_criteria: [
                    'Response has success: true',
                    'fingerprint.domain defaults to "general"',
                    'Analysis still completes',
                ],
            },
            {
                id: 'edge_003',
                name: 'Long Decision Summary',
                description: 'Should handle verbose decision descriptions',
                category: 'edge_case',
                input: {
                    context: {
                        decision_summary: 'This is a very long decision summary that goes into extensive detail about the background, context, stakeholders, constraints, and various considerations that need to be taken into account when making this architectural decision about how to implement the new feature that will affect multiple teams and require significant coordination. '.repeat(5),
                        options: [
                            { id: 'a', name: 'Approach A', description: 'First approach' },
                            { id: 'b', name: 'Approach B', description: 'Second approach' },
                        ],
                    }
                },
                expected_behavior: 'Handles long text input gracefully',
                validation_criteria: [
                    'Response has success: true',
                    'Does not timeout',
                    'Fingerprint keywords extracted correctly',
                ],
            },

            // Validation Error Tests
            {
                id: 'err_001',
                name: 'Missing Context',
                description: 'Should return error when context is missing',
                category: 'edge_case',
                input: {},
                expected_behavior: 'Returns 400 error with message',
                validation_criteria: [
                    'Response has error field',
                    'HTTP status is 400',
                ],
            },
            {
                id: 'err_002',
                name: 'Single Option',
                description: 'Should reject when only 1 option provided',
                category: 'edge_case',
                input: {
                    context: {
                        decision_summary: 'Only one option',
                        options: [
                            { id: 'only', name: 'Only Option', description: 'The sole choice' },
                        ],
                    }
                },
                expected_behavior: 'Returns validation error requiring 2+ options',
                validation_criteria: [
                    'Response has error field',
                    'Error mentions options requirement',
                ],
            },

            // Performance Tests
            {
                id: 'perf_001',
                name: 'Response Time - Simple Decision',
                description: 'Simple 2-option decision should complete in reasonable time',
                category: 'performance',
                input: {
                    context: {
                        decision_summary: 'Quick decision test',
                        options: [
                            { id: 'a', name: 'A', description: 'Option A' },
                            { id: 'b', name: 'B', description: 'Option B' },
                        ],
                    }
                },
                expected_behavior: 'Completes within 120 seconds',
                validation_criteria: [
                    'Response time under 120000ms',
                    'Response has success: true',
                ],
            },
        ],
    };
}

// ============================================================================
// Helper: Format Test Results for Display
// ============================================================================

export function formatTestResults(results: TestSuiteResult): string {
    const lines: string[] = [];

    lines.push('='.repeat(60));
    lines.push('TEST SUITE RESULTS');
    lines.push('='.repeat(60));
    lines.push('');
    lines.push(`Suite: ${results.suite_name}`);
    lines.push(`Service: ${results.target_service}`);
    lines.push(`Duration: ${(results.total_duration_ms / 1000).toFixed(1)}s`);
    lines.push('');
    lines.push('-'.repeat(60));
    lines.push('SUMMARY');
    lines.push('-'.repeat(60));
    lines.push(`Total:    ${results.summary.total}`);
    lines.push(`Passed:   ${results.summary.passed} ✓`);
    lines.push(`Failed:   ${results.summary.failed} ✗`);
    lines.push(`Warnings: ${results.summary.warnings} ⚠`);
    lines.push(`Skipped:  ${results.summary.skipped} ○`);
    lines.push(`Pass Rate: ${results.summary.pass_rate}%`);
    lines.push('');
    lines.push(`PRODUCTION READY: ${results.ready_for_production ? '✓ YES' : '✗ NO'}`);
    lines.push(`CONFIDENCE: ${results.confidence_score}%`);
    lines.push('');

    // Individual results
    lines.push('-'.repeat(60));
    lines.push('TEST RESULTS');
    lines.push('-'.repeat(60));

    for (const result of results.results) {
        const icon = {
            passed: '✓',
            failed: '✗',
            warning: '⚠',
            skipped: '○',
        }[result.status];

        lines.push(`\n${icon} [${result.category.toUpperCase()}] ${result.test_name}`);
        lines.push(`  Status: ${result.status} | Duration: ${result.duration_ms}ms`);

        if (result.error) {
            lines.push(`  Error: ${result.error}`);
        }

        if (result.validation_results.length > 0) {
            for (const v of result.validation_results) {
                const vIcon = v.passed ? '✓' : '✗';
                lines.push(`    ${vIcon} ${v.criterion}`);
                if (!v.passed) {
                    lines.push(`      → ${v.details}`);
                }
            }
        }
    }

    // Recommendations
    if (results.recommendations.length > 0) {
        lines.push('');
        lines.push('-'.repeat(60));
        lines.push('RECOMMENDATIONS');
        lines.push('-'.repeat(60));
        for (const rec of results.recommendations) {
            lines.push(`• ${rec}`);
        }
    }

    lines.push('');
    lines.push('='.repeat(60));

    return lines.join('\n');
}
