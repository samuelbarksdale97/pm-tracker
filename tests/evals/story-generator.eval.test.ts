// Story Generator Eval Tests
// Tests AI story generation quality and structure

import { describe, it, expect, beforeAll, vi } from 'vitest';
import { z } from 'zod';
import {
    TEST_PROJECT,
    TEST_EPICS,
    TEST_FEATURES,
    STORY_GENERATION_EXPECTATIONS,
} from './fixtures';
import {
    GeneratedStorySchema,
    StoryGenerationResultSchema,
    validateGenerationResult,
} from './schemas';

// =============================================================================
// Test Configuration
// =============================================================================

const RUN_LIVE_TESTS = process.env.RUN_AI_EVALS === 'true';
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

// Timeout for AI API calls (30 seconds)
const AI_TIMEOUT = 30000;

// =============================================================================
// Mock Responses (for fast local testing)
// =============================================================================

const MOCK_GENERATION_RESPONSE = {
    success: true,
    data: {
        stories: [
            {
                narrative: 'As a guest, I want to create an account with my email address so that I can become a park member.',
                persona: 'guest' as const,
                priority: 'P0' as const,
                acceptance_criteria: [
                    'User can enter email and password',
                    'Password must be at least 8 characters',
                    'Email verification is sent after signup',
                ],
                rationale: 'Core signup flow is essential for user onboarding',
            },
            {
                narrative: 'As a guest, I want to receive an email verification link so that I can confirm my account.',
                persona: 'guest' as const,
                priority: 'P0' as const,
                acceptance_criteria: [
                    'Verification email is sent within 60 seconds',
                    'Link expires after 24 hours',
                    'User can request a new verification email',
                ],
                rationale: 'Email verification ensures valid contact information',
            },
            {
                narrative: 'As a member, I want to reset my password if I forget it so that I can regain access to my account.',
                persona: 'member' as const,
                priority: 'P1' as const,
                acceptance_criteria: [
                    'Password reset link is sent to registered email',
                    'New password must meet security requirements',
                    'Old password is invalidated immediately',
                ],
                rationale: 'Password recovery is essential for account security',
            },
            {
                narrative: 'As an admin, I want to view registration metrics so that I can track signup trends.',
                persona: 'admin' as const,
                priority: 'P2' as const,
                acceptance_criteria: [
                    'Dashboard shows daily/weekly/monthly signups',
                    'Can filter by membership tier',
                    'Export data to CSV',
                ],
                rationale: 'Analytics help optimize the registration funnel',
            },
        ],
        feature_context: 'These stories cover the core account registration flow including signup, verification, and recovery.',
        generation_notes: [
            'Focused on guest-to-member conversion',
            'Included admin analytics for business visibility',
        ],
    },
};

// =============================================================================
// Schema Validation Tests (Unit tests - always run)
// =============================================================================

describe('Story Generation Schema Validation', () => {
    describe('GeneratedStorySchema', () => {
        it('should accept valid story with correct format', () => {
            const validStory = {
                narrative: 'As a member, I want to update my profile photo so that other members can recognize me.',
                persona: 'member',
                priority: 'P1',
                acceptance_criteria: ['Photo must be JPEG or PNG', 'Max file size 5MB'],
                rationale: 'Profile photos help build community among members',
            };

            const result = GeneratedStorySchema.safeParse(validStory);
            expect(result.success).toBe(true);
        });

        it('should reject narrative without "As a" format', () => {
            const invalidStory = {
                narrative: 'The user should be able to update their profile.',
                persona: 'member',
                priority: 'P1',
                acceptance_criteria: ['Photo must be JPEG or PNG'],
                rationale: 'Profiles need photos',
            };

            const result = GeneratedStorySchema.safeParse(invalidStory);
            expect(result.success).toBe(false);
        });

        it('should reject narrative without "I want" clause', () => {
            const invalidStory = {
                narrative: 'As a member, updating the profile is important.',
                persona: 'member',
                priority: 'P1',
                acceptance_criteria: ['Has acceptance criteria'],
                rationale: 'Has rationale',
            };

            const result = GeneratedStorySchema.safeParse(invalidStory);
            expect(result.success).toBe(false);
        });

        it('should reject invalid persona', () => {
            const invalidStory = {
                narrative: 'As a member, I want to do something so that I benefit.',
                persona: 'visitor', // Invalid
                priority: 'P1',
                acceptance_criteria: ['Criterion 1'],
                rationale: 'Reason here',
            };

            const result = GeneratedStorySchema.safeParse(invalidStory);
            expect(result.success).toBe(false);
        });

        it('should reject invalid priority', () => {
            const invalidStory = {
                narrative: 'As a member, I want to do something so that I benefit.',
                persona: 'member',
                priority: 'HIGH', // Invalid - should be P0/P1/P2
                acceptance_criteria: ['Criterion 1'],
                rationale: 'Reason here',
            };

            const result = GeneratedStorySchema.safeParse(invalidStory);
            expect(result.success).toBe(false);
        });

        it('should reject empty acceptance criteria', () => {
            const invalidStory = {
                narrative: 'As a member, I want to do something so that I benefit.',
                persona: 'member',
                priority: 'P1',
                acceptance_criteria: [], // Empty
                rationale: 'Reason here',
            };

            const result = GeneratedStorySchema.safeParse(invalidStory);
            expect(result.success).toBe(false);
        });
    });

    describe('StoryGenerationResultSchema', () => {
        it('should accept valid generation result', () => {
            const result = StoryGenerationResultSchema.safeParse(MOCK_GENERATION_RESPONSE.data);
            expect(result.success).toBe(true);
        });

        it('should reject result with fewer than 3 stories', () => {
            const tooFewStories = {
                stories: [MOCK_GENERATION_RESPONSE.data.stories[0]],
                feature_context: 'Context here',
            };

            const result = StoryGenerationResultSchema.safeParse(tooFewStories);
            expect(result.success).toBe(false);
        });

        it('should reject result with more than 7 stories', () => {
            const tooManyStories = {
                stories: Array(8).fill(MOCK_GENERATION_RESPONSE.data.stories[0]),
                feature_context: 'Context here',
            };

            const result = StoryGenerationResultSchema.safeParse(tooManyStories);
            expect(result.success).toBe(false);
        });
    });
});

// =============================================================================
// Quality Heuristics (Content quality beyond structure)
// =============================================================================

describe('Story Generation Quality Heuristics', () => {
    it('should generate unique narratives (no duplicates)', () => {
        const stories = MOCK_GENERATION_RESPONSE.data.stories;
        const narratives = stories.map((s) => s.narrative.toLowerCase());
        const uniqueNarratives = new Set(narratives);

        expect(uniqueNarratives.size).toBe(narratives.length);
    });

    it('should have diverse personas', () => {
        const stories = MOCK_GENERATION_RESPONSE.data.stories;
        const personas = new Set(stories.map((s) => s.persona));

        // Should have at least 2 different personas
        expect(personas.size).toBeGreaterThanOrEqual(2);
    });

    it('should have diverse priorities', () => {
        const stories = MOCK_GENERATION_RESPONSE.data.stories;
        const priorities = new Set(stories.map((s) => s.priority));

        // Should have at least 2 different priorities
        expect(priorities.size).toBeGreaterThanOrEqual(2);
    });

    it('should have meaningful acceptance criteria', () => {
        const stories = MOCK_GENERATION_RESPONSE.data.stories;

        for (const story of stories) {
            // Each criterion should be at least 10 characters
            for (const criterion of story.acceptance_criteria) {
                expect(criterion.length).toBeGreaterThanOrEqual(10);
            }

            // Should have at least 1 criterion
            expect(story.acceptance_criteria.length).toBeGreaterThanOrEqual(1);
        }
    });

    it('should have actionable rationale', () => {
        const stories = MOCK_GENERATION_RESPONSE.data.stories;

        for (const story of stories) {
            // Rationale should explain "why" - look for common explanation patterns
            const hasExplanation =
                story.rationale.toLowerCase().includes('because') ||
                story.rationale.toLowerCase().includes('essential') ||
                story.rationale.toLowerCase().includes('important') ||
                story.rationale.toLowerCase().includes('help') ||
                story.rationale.toLowerCase().includes('ensure') ||
                story.rationale.length > 20; // Or just be substantial

            expect(hasExplanation).toBe(true);
        }
    });
});

// =============================================================================
// Live API Tests (only run when RUN_AI_EVALS=true)
// =============================================================================

describe.skipIf(!RUN_LIVE_TESTS)('Story Generation Live API Tests', () => {
    it(
        'should generate valid stories for Account Registration feature',
        async () => {
            const feature = TEST_FEATURES.membership.find((f) => f.id === 'FEAT-001');
            expect(feature).toBeDefined();

            const response = await fetch(`${API_BASE_URL}/api/ai/generate-stories`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ featureId: feature!.id }),
            });

            expect(response.ok).toBe(true);

            const data = await response.json();
            expect(data.success).toBe(true);

            // Validate against schema
            const validation = validateGenerationResult(data.data);
            expect(validation.success).toBe(true);

            if (!validation.success) {
                console.error('Validation errors:', validation.errors?.format());
            }

            // Check expectations
            const expectation = STORY_GENERATION_EXPECTATIONS.find(
                (e) => e.featureId === feature!.id
            );
            if (expectation) {
                expect(data.data.stories.length).toBeGreaterThanOrEqual(expectation.minStories);
                expect(data.data.stories.length).toBeLessThanOrEqual(expectation.maxStories);

                const personas = new Set(data.data.stories.map((s: { persona: string }) => s.persona));
                for (const expectedPersona of expectation.expectedPersonas) {
                    expect(personas.has(expectedPersona)).toBe(true);
                }
            }
        },
        AI_TIMEOUT
    );

    it(
        'should generate valid stories for Table Booking feature',
        async () => {
            const feature = TEST_FEATURES.reservations.find((f) => f.id === 'FEAT-010');
            expect(feature).toBeDefined();

            const response = await fetch(`${API_BASE_URL}/api/ai/generate-stories`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ featureId: feature!.id }),
            });

            expect(response.ok).toBe(true);

            const data = await response.json();
            expect(data.success).toBe(true);

            // Validate structure
            const validation = validateGenerationResult(data.data);
            expect(validation.success).toBe(true);

            // Stories should be relevant to reservations/booking
            const narratives = data.data.stories.map((s: { narrative: string }) =>
                s.narrative.toLowerCase()
            );
            const hasReservationKeywords = narratives.some(
                (n: string) =>
                    n.includes('reserve') ||
                    n.includes('book') ||
                    n.includes('table') ||
                    n.includes('availability')
            );
            expect(hasReservationKeywords).toBe(true);
        },
        AI_TIMEOUT
    );
});

// =============================================================================
// Report Generation Helper
// =============================================================================

export function generateStoryEvalReport(results: Array<{
    featureId: string;
    success: boolean;
    storyCount?: number;
    personas?: string[];
    priorities?: string[];
    errors?: string[];
}>): string {
    const lines: string[] = [
        '# Story Generation Eval Report',
        `Generated: ${new Date().toISOString()}`,
        '',
        '## Summary',
        `Total Features Tested: ${results.length}`,
        `Passed: ${results.filter((r) => r.success).length}`,
        `Failed: ${results.filter((r) => !r.success).length}`,
        '',
        '## Details',
    ];

    for (const result of results) {
        lines.push(`### Feature: ${result.featureId}`);
        lines.push(`- Status: ${result.success ? 'PASS' : 'FAIL'}`);
        if (result.storyCount !== undefined) {
            lines.push(`- Stories Generated: ${result.storyCount}`);
        }
        if (result.personas) {
            lines.push(`- Personas: ${result.personas.join(', ')}`);
        }
        if (result.priorities) {
            lines.push(`- Priorities: ${result.priorities.join(', ')}`);
        }
        if (result.errors) {
            lines.push(`- Errors: ${result.errors.join('; ')}`);
        }
        lines.push('');
    }

    return lines.join('\n');
}
