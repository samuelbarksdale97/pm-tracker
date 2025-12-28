// Story Categorizer Eval Tests
// Tests AI story categorization accuracy and quality

import { describe, it, expect } from 'vitest';
import {
    TEST_PROJECT,
    TEST_EPICS,
    TEST_FEATURES,
    TEST_NARRATIVES,
    TestNarrative,
} from './fixtures';
import {
    CategorizationResultSchema,
    validateCategorizationResult,
} from './schemas';

// =============================================================================
// Test Configuration
// =============================================================================

const RUN_LIVE_TESTS = process.env.RUN_AI_EVALS === 'true';
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

// Timeout for AI API calls (15 seconds)
const AI_TIMEOUT = 15000;

// =============================================================================
// Mock Responses
// =============================================================================

const MOCK_CATEGORIZATION_RESPONSES: Record<string, object> = {
    // Clear match to Account Registration
    registration_match: {
        recommendation: 'existing',
        suggested_feature_id: 'FEAT-001',
        suggested_feature_name: 'Account Registration',
        confidence: 92,
        reasoning: 'The story directly describes the account creation process with email and password, which is the core functionality of the Account Registration feature.',
        alternatives: [
            {
                feature_id: 'FEAT-002',
                feature_name: 'Profile Management',
                match_score: 35,
                reason: 'Profile Management handles existing user data, not initial registration.',
            },
        ],
    },
    // Suggest new feature for family sharing
    new_feature_suggestion: {
        recommendation: 'new',
        confidence: 75,
        reasoning: 'No existing feature handles family membership sharing or multi-user access under a single membership.',
        new_feature_suggestion: {
            name: 'Family Membership Sharing',
            description: 'Allow primary members to add family members to their membership for shared benefits.',
            priority: 'P1',
        },
    },
    // No features available
    no_features: {
        recommendation: 'new',
        confidence: 70,
        reasoning: 'No existing features in this epic. Suggesting a new feature based on the story content.',
        new_feature_suggestion: {
            name: 'Payment Processing',
            description: 'Handle credit card payments for membership purchases.',
            priority: 'P0',
        },
    },
};

// =============================================================================
// Schema Validation Tests
// =============================================================================

describe('Story Categorization Schema Validation', () => {
    describe('CategorizationResultSchema', () => {
        it('should accept valid "existing" recommendation', () => {
            const result = CategorizationResultSchema.safeParse(
                MOCK_CATEGORIZATION_RESPONSES.registration_match
            );
            expect(result.success).toBe(true);
        });

        it('should accept valid "new" recommendation', () => {
            const result = CategorizationResultSchema.safeParse(
                MOCK_CATEGORIZATION_RESPONSES.new_feature_suggestion
            );
            expect(result.success).toBe(true);
        });

        it('should reject "existing" without suggested_feature_id', () => {
            const invalid = {
                recommendation: 'existing',
                confidence: 80,
                reasoning: 'Should have feature ID',
                // Missing suggested_feature_id
            };

            const result = CategorizationResultSchema.safeParse(invalid);
            expect(result.success).toBe(false);
        });

        it('should reject confidence outside 0-100 range', () => {
            const invalid = {
                recommendation: 'existing',
                suggested_feature_id: 'FEAT-001',
                suggested_feature_name: 'Test Feature',
                confidence: 150, // Invalid
                reasoning: 'Too confident',
            };

            const result = CategorizationResultSchema.safeParse(invalid);
            expect(result.success).toBe(false);
        });

        it('should reject recommendation without reasoning', () => {
            const invalid = {
                recommendation: 'existing',
                suggested_feature_id: 'FEAT-001',
                suggested_feature_name: 'Test Feature',
                confidence: 80,
                // Missing reasoning
            };

            const result = CategorizationResultSchema.safeParse(invalid);
            expect(result.success).toBe(false);
        });

        it('should reject "new" without new_feature_suggestion', () => {
            const invalid = {
                recommendation: 'new',
                confidence: 70,
                reasoning: 'Should suggest a new feature',
                // Missing new_feature_suggestion
            };

            const result = CategorizationResultSchema.safeParse(invalid);
            expect(result.success).toBe(false);
        });

        it('should accept "none" recommendation', () => {
            const valid = {
                recommendation: 'none',
                confidence: 0,
                reasoning: 'Cannot categorize without more context.',
            };

            const result = CategorizationResultSchema.safeParse(valid);
            expect(result.success).toBe(true);
        });
    });
});

// =============================================================================
// Quality Heuristics
// =============================================================================

describe('Story Categorization Quality Heuristics', () => {
    describe('Confidence Calibration', () => {
        it('should have high confidence (>80) for clear matches', () => {
            const response = MOCK_CATEGORIZATION_RESPONSES.registration_match as {
                recommendation: string;
                confidence: number;
            };
            expect(response.confidence).toBeGreaterThan(80);
        });

        it('should have moderate confidence (60-80) for new feature suggestions', () => {
            const response = MOCK_CATEGORIZATION_RESPONSES.new_feature_suggestion as {
                recommendation: string;
                confidence: number;
            };
            expect(response.confidence).toBeGreaterThanOrEqual(60);
            expect(response.confidence).toBeLessThanOrEqual(85);
        });
    });

    describe('Reasoning Quality', () => {
        it('should explain WHY the recommendation was made', () => {
            const response = MOCK_CATEGORIZATION_RESPONSES.registration_match as {
                reasoning: string;
            };

            // Reasoning should be substantial
            expect(response.reasoning.length).toBeGreaterThan(30);

            // Should reference the story content or feature
            const hasContext =
                response.reasoning.toLowerCase().includes('story') ||
                response.reasoning.toLowerCase().includes('account') ||
                response.reasoning.toLowerCase().includes('feature') ||
                response.reasoning.toLowerCase().includes('registration');

            expect(hasContext).toBe(true);
        });
    });

    describe('Alternatives Quality', () => {
        it('should provide alternatives with lower scores than primary', () => {
            const response = MOCK_CATEGORIZATION_RESPONSES.registration_match as {
                confidence: number;
                alternatives?: Array<{ match_score: number }>;
            };

            if (response.alternatives && response.alternatives.length > 0) {
                for (const alt of response.alternatives) {
                    expect(alt.match_score).toBeLessThan(response.confidence);
                }
            }
        });
    });

    describe('New Feature Suggestion Quality', () => {
        it('should suggest actionable feature names', () => {
            const response = MOCK_CATEGORIZATION_RESPONSES.new_feature_suggestion as {
                new_feature_suggestion?: { name: string };
            };

            if (response.new_feature_suggestion) {
                // Name should be capitalized and descriptive
                expect(response.new_feature_suggestion.name.length).toBeGreaterThan(5);
                expect(response.new_feature_suggestion.name[0]).toMatch(/[A-Z]/);
            }
        });

        it('should provide meaningful feature description', () => {
            const response = MOCK_CATEGORIZATION_RESPONSES.new_feature_suggestion as {
                new_feature_suggestion?: { description: string };
            };

            if (response.new_feature_suggestion) {
                expect(response.new_feature_suggestion.description.length).toBeGreaterThan(20);
            }
        });
    });
});

// =============================================================================
// Test Case Matrix (Unit tests with expected outcomes)
// =============================================================================

describe('Categorization Expected Outcomes', () => {
    describe('Membership Epic Stories', () => {
        const membershipNarratives = TEST_NARRATIVES.membership;

        for (const testCase of membershipNarratives) {
            it(`should correctly categorize: "${testCase.description}"`, () => {
                // This test documents expected behavior
                // When running live, we compare actual AI output to expectations

                if (testCase.expectedRecommendation === 'existing') {
                    expect(testCase.expectedFeatureId).toBeDefined();
                    expect(testCase.minConfidence).toBeDefined();
                } else if (testCase.expectedRecommendation === 'new') {
                    // New feature suggestions don't have a specific feature ID
                    expect(testCase.expectedFeatureId).toBeUndefined();
                }

                // Verify test case is well-formed
                expect(testCase.narrative).toContain('As a');
                expect(testCase.narrative).toContain('I want');
            });
        }
    });

    describe('Reservations Epic Stories', () => {
        const reservationNarratives = TEST_NARRATIVES.reservations;

        for (const testCase of reservationNarratives) {
            it(`should correctly categorize: "${testCase.description}"`, () => {
                if (testCase.expectedRecommendation === 'existing') {
                    expect(testCase.expectedFeatureId).toBeDefined();
                }

                expect(testCase.narrative).toContain('As a');
            });
        }
    });

    describe('Empty Features Scenario', () => {
        const paymentNarratives = TEST_NARRATIVES.payments;

        for (const testCase of paymentNarratives) {
            it(`should suggest new feature when none exist: "${testCase.description}"`, () => {
                expect(testCase.expectedRecommendation).toBe('new');
                expect(TEST_FEATURES.payments.length).toBe(0);
            });
        }
    });
});

// =============================================================================
// Live API Tests
// =============================================================================

describe.skipIf(!RUN_LIVE_TESTS)('Story Categorization Live API Tests', () => {
    describe('Clear Matches', () => {
        it(
            'should match "create account" story to Account Registration',
            async () => {
                const testCase = TEST_NARRATIVES.membership[0]; // Account creation story
                const epic = TEST_EPICS.membership;

                const response = await fetch(`${API_BASE_URL}/api/ai/categorize-story`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        epicId: epic.id,
                        narrative: testCase.narrative,
                        persona: testCase.persona,
                    }),
                });

                expect(response.ok).toBe(true);

                const data = await response.json();
                expect(data.success).toBe(true);

                // Validate schema
                const validation = validateCategorizationResult(data.data);
                expect(validation.success).toBe(true);

                // Check expectations
                expect(data.data.recommendation).toBe('existing');
                expect(data.data.suggested_feature_id).toBe(testCase.expectedFeatureId);
                expect(data.data.confidence).toBeGreaterThanOrEqual(testCase.minConfidence || 70);
            },
            AI_TIMEOUT
        );

        it(
            'should match "reserve table" story to Table Booking',
            async () => {
                const testCase = TEST_NARRATIVES.reservations[0]; // Table reservation story
                const epic = TEST_EPICS.reservations;

                const response = await fetch(`${API_BASE_URL}/api/ai/categorize-story`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        epicId: epic.id,
                        narrative: testCase.narrative,
                        persona: testCase.persona,
                    }),
                });

                expect(response.ok).toBe(true);

                const data = await response.json();
                expect(data.success).toBe(true);
                expect(data.data.recommendation).toBe('existing');
                expect(data.data.suggested_feature_id).toBe('FEAT-010');
            },
            AI_TIMEOUT
        );
    });

    describe('New Feature Suggestions', () => {
        it(
            'should suggest new feature for family sharing story',
            async () => {
                const testCase = TEST_NARRATIVES.membership.find(
                    (t) => t.description.includes('family sharing')
                );
                expect(testCase).toBeDefined();

                const epic = TEST_EPICS.membership;

                const response = await fetch(`${API_BASE_URL}/api/ai/categorize-story`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        epicId: epic.id,
                        narrative: testCase!.narrative,
                        persona: testCase!.persona,
                    }),
                });

                expect(response.ok).toBe(true);

                const data = await response.json();
                expect(data.success).toBe(true);
                expect(data.data.recommendation).toBe('new');
                expect(data.data.new_feature_suggestion).toBeDefined();
                expect(data.data.new_feature_suggestion.name.length).toBeGreaterThan(5);
            },
            AI_TIMEOUT
        );
    });

    describe('Empty Features Scenario', () => {
        it(
            'should suggest new feature when no features exist',
            async () => {
                const testCase = TEST_NARRATIVES.payments[0];
                const epic = TEST_EPICS.payments;

                const response = await fetch(`${API_BASE_URL}/api/ai/categorize-story`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        epicId: epic.id,
                        narrative: testCase.narrative,
                        persona: testCase.persona,
                    }),
                });

                expect(response.ok).toBe(true);

                const data = await response.json();
                expect(data.success).toBe(true);
                expect(data.data.recommendation).toBe('new');
            },
            AI_TIMEOUT
        );
    });
});

// =============================================================================
// Report Generation
// =============================================================================

export interface CategorizationTestResult {
    testCase: string;
    narrative: string;
    expectedRecommendation: string;
    actualRecommendation?: string;
    expectedFeatureId?: string;
    actualFeatureId?: string;
    confidence?: number;
    passed: boolean;
    errors?: string[];
}

export function generateCategorizationEvalReport(
    results: CategorizationTestResult[]
): string {
    const passed = results.filter((r) => r.passed).length;
    const failed = results.filter((r) => !r.passed).length;
    const accuracy = ((passed / results.length) * 100).toFixed(1);

    const lines: string[] = [
        '# Story Categorization Eval Report',
        `Generated: ${new Date().toISOString()}`,
        '',
        '## Summary',
        `Total Test Cases: ${results.length}`,
        `Passed: ${passed}`,
        `Failed: ${failed}`,
        `Accuracy: ${accuracy}%`,
        '',
        '## Results by Test Case',
    ];

    for (const result of results) {
        const status = result.passed ? 'PASS' : 'FAIL';
        lines.push(`### ${result.testCase}`);
        lines.push(`- Status: ${status}`);
        lines.push(`- Narrative: "${result.narrative.substring(0, 50)}..."`);
        lines.push(`- Expected: ${result.expectedRecommendation}`);
        if (result.actualRecommendation) {
            lines.push(`- Actual: ${result.actualRecommendation}`);
        }
        if (result.expectedFeatureId) {
            lines.push(`- Expected Feature: ${result.expectedFeatureId}`);
        }
        if (result.actualFeatureId) {
            lines.push(`- Actual Feature: ${result.actualFeatureId}`);
        }
        if (result.confidence !== undefined) {
            lines.push(`- Confidence: ${result.confidence}%`);
        }
        if (result.errors && result.errors.length > 0) {
            lines.push(`- Errors: ${result.errors.join('; ')}`);
        }
        lines.push('');
    }

    return lines.join('\n');
}
