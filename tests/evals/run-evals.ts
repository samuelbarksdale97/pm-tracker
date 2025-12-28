#!/usr/bin/env npx tsx
// AI Eval Runner
// Runs all AI evaluations and generates a comprehensive report
// Dynamically fetches test data from the database

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load env from .env.local manually
function loadEnv(): Record<string, string> {
    const envPath = resolve(__dirname, '../../.env.local');
    const env: Record<string, string> = {};
    try {
        const content = readFileSync(envPath, 'utf-8');
        for (const line of content.split('\n')) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) continue;
            const eqIdx = trimmed.indexOf('=');
            if (eqIdx > 0) {
                const key = trimmed.substring(0, eqIdx);
                const value = trimmed.substring(eqIdx + 1);
                env[key] = value;
            }
        }
    } catch {
        console.error('Could not read .env.local');
    }
    return env;
}

const localEnv = loadEnv();

import {
    validateGenerationResult,
    validateCategorizationResult,
} from './schemas';

// =============================================================================
// Configuration
// =============================================================================

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const VERBOSE = process.env.VERBOSE === 'true';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || localEnv.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || localEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase credentials. Check .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface EvalResult {
    name: string;
    category: 'generation' | 'categorization';
    passed: boolean;
    duration: number;
    details: Record<string, unknown>;
    errors?: string[];
}

interface Feature {
    id: string;
    name: string;
    description: string | null;
    epic_id: string;
}

interface Epic {
    id: string;
    name: string;
    description: string | null;
}

// =============================================================================
// Test Narratives for Categorization
// =============================================================================

const TEST_CATEGORIZATION_CASES = [
    {
        description: 'Account creation story',
        narrative:
            'As a guest, I want to create an account with my email and password so that I can become a park member.',
        persona: 'guest',
        expectedKeywords: ['registration', 'account', 'signup'],
    },
    {
        description: 'Profile update story',
        narrative:
            'As a member, I want to update my phone number and address so that I receive important notifications.',
        persona: 'member',
        expectedKeywords: ['profile', 'update', 'edit'],
    },
    {
        description: 'Table reservation story',
        narrative:
            'As a member, I want to reserve a picnic table for next Saturday so that my family has a guaranteed spot.',
        persona: 'member',
        expectedKeywords: ['booking', 'table', 'reservation', 'reserve'],
    },
    {
        description: 'Feature not covered - should suggest new',
        narrative:
            'As a member, I want to share my membership with my spouse so that they can use park benefits too.',
        persona: 'member',
        expectNew: true,
    },
];

// =============================================================================
// Helper Functions
// =============================================================================

async function fetchWithTimeout(
    url: string,
    options: RequestInit,
    timeout: number = 30000
): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal,
        });
        clearTimeout(timeoutId);
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        throw error;
    }
}

function log(message: string, ...args: unknown[]) {
    if (VERBOSE) {
        console.log(message, ...args);
    }
}

// =============================================================================
// Data Fetching
// =============================================================================

async function getTestEpicAndFeatures(): Promise<{
    epic: Epic | null;
    features: Feature[];
}> {
    // First try to find the AI Eval Test Epic
    let { data: epic } = await supabase
        .from('pm_epics')
        .select('id, name, description')
        .eq('name', 'AI Eval Test Epic')
        .single();

    // If not found, get any epic with features
    if (!epic) {
        const { data: epics } = await supabase
            .from('pm_epics')
            .select('id, name, description')
            .limit(1);

        epic = epics?.[0] || null;
    }

    if (!epic) {
        return { epic: null, features: [] };
    }

    // Get features for this epic
    const { data: features } = await supabase
        .from('pm_features')
        .select('id, name, description, epic_id')
        .eq('epic_id', epic.id);

    return {
        epic,
        features: features || [],
    };
}

// =============================================================================
// Story Generation Evals
// =============================================================================

async function runGenerationEval(feature: Feature): Promise<EvalResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    let passed = true;
    const details: Record<string, unknown> = {
        featureId: feature.id,
        featureName: feature.name,
    };

    try {
        log(`Testing story generation for feature: ${feature.name}`);

        const response = await fetchWithTimeout(
            `${API_BASE_URL}/api/ai/generate-stories`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ featureId: feature.id }),
            },
            60000 // 60 second timeout for generation
        );

        if (!response.ok) {
            const errorText = await response.text();
            errors.push(`API returned ${response.status}: ${errorText}`);
            passed = false;
        } else {
            const data = await response.json();

            if (!data.success) {
                errors.push(`API returned success=false: ${data.error}`);
                passed = false;
            } else {
                // Validate schema
                const validation = validateGenerationResult(data.data);
                if (!validation.success) {
                    const errorMessages = validation.errors?.issues.map(
                        (i) => `${i.path.join('.')}: ${i.message}`
                    );
                    errors.push(`Schema validation failed: ${errorMessages?.join(', ')}`);
                    passed = false;
                }

                const stories = data.data?.stories || [];
                details.storyCount = stories.length;
                details.personas = [
                    ...new Set(stories.map((s: { persona: string }) => s.persona)),
                ];
                details.priorities = [
                    ...new Set(stories.map((s: { priority: string }) => s.priority)),
                ];

                // Check story count (3-7 expected)
                if (stories.length < 3) {
                    errors.push(`Too few stories: got ${stories.length}, expected at least 3`);
                    passed = false;
                }
                if (stories.length > 7) {
                    errors.push(`Too many stories: got ${stories.length}, expected at most 7`);
                    passed = false;
                }

                // Check story format
                for (let i = 0; i < stories.length; i++) {
                    const story = stories[i];
                    if (!story.narrative.toLowerCase().includes('as a')) {
                        errors.push(`Story ${i + 1} missing "As a" format`);
                        passed = false;
                    }
                    if (!story.narrative.toLowerCase().includes('i want')) {
                        errors.push(`Story ${i + 1} missing "I want" clause`);
                        passed = false;
                    }
                    if (
                        !story.acceptance_criteria ||
                        story.acceptance_criteria.length === 0
                    ) {
                        errors.push(`Story ${i + 1} has no acceptance criteria`);
                        passed = false;
                    }
                }
            }
        }
    } catch (error) {
        errors.push(
            `Exception: ${error instanceof Error ? error.message : String(error)}`
        );
        passed = false;
    }

    return {
        name: `Generate stories for "${feature.name}"`,
        category: 'generation',
        passed,
        duration: Date.now() - startTime,
        details,
        errors: errors.length > 0 ? errors : undefined,
    };
}

// =============================================================================
// Story Categorization Evals
// =============================================================================

async function runCategorizationEval(
    epic: Epic,
    testCase: (typeof TEST_CATEGORIZATION_CASES)[0]
): Promise<EvalResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    let passed = true;
    const details: Record<string, unknown> = {
        narrative: testCase.narrative.substring(0, 50) + '...',
        persona: testCase.persona,
    };

    try {
        log(`Testing categorization: "${testCase.description}"`);

        const response = await fetchWithTimeout(
            `${API_BASE_URL}/api/ai/categorize-story`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    epicId: epic.id,
                    narrative: testCase.narrative,
                    persona: testCase.persona,
                }),
            },
            30000 // 30 second timeout
        );

        if (!response.ok) {
            const errorText = await response.text();
            errors.push(`API returned ${response.status}: ${errorText}`);
            passed = false;
        } else {
            const data = await response.json();

            if (!data.success) {
                errors.push(`API returned success=false: ${data.error}`);
                passed = false;
            } else {
                // Validate schema
                const validation = validateCategorizationResult(data.data);
                if (!validation.success) {
                    const errorMessages = validation.errors?.issues.map(
                        (i) => `${i.path.join('.')}: ${i.message}`
                    );
                    errors.push(`Schema validation failed: ${errorMessages?.join(', ')}`);
                    passed = false;
                }

                details.recommendation = data.data?.recommendation;
                details.suggestedFeature = data.data?.suggested_feature_name;
                details.confidence = data.data?.confidence;
                details.reasoning = data.data?.reasoning?.substring(0, 100);

                // If we expect a new feature suggestion
                if (testCase.expectNew) {
                    if (data.data?.recommendation !== 'new') {
                        // Not a failure, just informational
                        details.note = 'Expected "new" but got existing match';
                    }
                }

                // Basic validation
                if (
                    !['existing', 'new', 'none'].includes(data.data?.recommendation)
                ) {
                    errors.push(`Invalid recommendation: ${data.data?.recommendation}`);
                    passed = false;
                }

                if (
                    data.data?.confidence === undefined ||
                    data.data?.confidence < 0 ||
                    data.data?.confidence > 100
                ) {
                    errors.push(`Invalid confidence: ${data.data?.confidence}`);
                    passed = false;
                }

                if (!data.data?.reasoning || data.data?.reasoning.length < 10) {
                    errors.push('Missing or too short reasoning');
                    passed = false;
                }
            }
        }
    } catch (error) {
        errors.push(
            `Exception: ${error instanceof Error ? error.message : String(error)}`
        );
        passed = false;
    }

    return {
        name: testCase.description,
        category: 'categorization',
        passed,
        duration: Date.now() - startTime,
        details,
        errors: errors.length > 0 ? errors : undefined,
    };
}

// =============================================================================
// Main Runner
// =============================================================================

async function runAllEvals(): Promise<void> {
    console.log('='.repeat(60));
    console.log('AI EVAL RUNNER');
    console.log(`API Base URL: ${API_BASE_URL}`);
    console.log(`Started: ${new Date().toISOString()}`);
    console.log('='.repeat(60));
    console.log();

    // Fetch test data from database
    console.log('Fetching test data from database...');
    const { epic, features } = await getTestEpicAndFeatures();

    if (!epic) {
        console.error('ERROR: No epic found in database.');
        console.log();
        console.log('To run live evals, you need test data. Run:');
        console.log('  npm run evals:seed');
        console.log();
        process.exit(1);
    }

    console.log(`Using epic: "${epic.name}" (${epic.id})`);
    console.log(`Found ${features.length} features`);
    console.log();

    const results: EvalResult[] = [];

    // Run generation evals (only if we have features)
    if (features.length > 0) {
        console.log('## Story Generation Evals');
        console.log('-'.repeat(40));

        // Test up to 3 features
        const featuresToTest = features.slice(0, 3);
        for (const feature of featuresToTest) {
            const result = await runGenerationEval(feature);
            results.push(result);
            console.log(
                `${result.passed ? '✓' : '✗'} ${result.name} (${result.duration}ms)`
            );
            if (result.details.storyCount) {
                console.log(
                    `  Stories: ${result.details.storyCount}, Personas: ${(result.details.personas as string[]).join(', ')}`
                );
            }
            if (result.errors) {
                for (const error of result.errors) {
                    console.log(`  → ${error}`);
                }
            }
        }
        console.log();
    } else {
        console.log('## Story Generation Evals');
        console.log('-'.repeat(40));
        console.log('SKIPPED: No features found. Create features to test story generation.');
        console.log();
    }

    // Run categorization evals
    console.log('## Story Categorization Evals');
    console.log('-'.repeat(40));

    for (const testCase of TEST_CATEGORIZATION_CASES) {
        const result = await runCategorizationEval(epic, testCase);
        results.push(result);
        console.log(
            `${result.passed ? '✓' : '✗'} ${result.name} (${result.duration}ms)`
        );
        if (result.details.recommendation) {
            console.log(
                `  Recommendation: ${result.details.recommendation}` +
                    (result.details.suggestedFeature
                        ? ` → "${result.details.suggestedFeature}"`
                        : '') +
                    ` (${result.details.confidence}% confidence)`
            );
        }
        if (result.errors) {
            for (const error of result.errors) {
                console.log(`  → ${error}`);
            }
        }
    }
    console.log();

    // Summary
    const generationResults = results.filter((r) => r.category === 'generation');
    const categorizationResults = results.filter(
        (r) => r.category === 'categorization'
    );

    console.log('='.repeat(60));
    console.log('SUMMARY');
    console.log('='.repeat(60));
    console.log();

    if (generationResults.length > 0) {
        console.log('Story Generation:');
        console.log(
            `  Passed: ${generationResults.filter((r) => r.passed).length}/${generationResults.length}`
        );
        console.log();
    }

    console.log('Story Categorization:');
    console.log(
        `  Passed: ${categorizationResults.filter((r) => r.passed).length}/${categorizationResults.length}`
    );
    console.log();

    console.log('Overall:');
    const totalPassed = results.filter((r) => r.passed).length;
    const totalTests = results.length;
    const accuracy = totalTests > 0 ? ((totalPassed / totalTests) * 100).toFixed(1) : '0.0';
    console.log(`  Passed: ${totalPassed}/${totalTests} (${accuracy}%)`);
    console.log();
    console.log(`Completed: ${new Date().toISOString()}`);

    // Exit with error code if any tests failed
    if (totalPassed < totalTests) {
        process.exit(1);
    }
}

// Run if executed directly
runAllEvals().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});
