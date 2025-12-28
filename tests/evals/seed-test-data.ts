#!/usr/bin/env npx tsx
// Seed Test Data for AI Evals
// Creates test features and epics in the database for running live evals

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
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || localEnv.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || localEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase credentials. Check .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function getActiveProject(): Promise<string> {
    const { data, error } = await supabase
        .from('pm_projects')
        .select('id')
        .eq('status', 'active')
        .single();

    if (error || !data) {
        throw new Error('No active project found. Please create a project first.');
    }
    return data.id;
}

async function seedTestData() {
    console.log('Seeding test data for AI evals...');
    console.log();

    // Get active project
    const projectId = await getActiveProject();
    console.log(`Using project: ${projectId}`);

    // Check for existing test epic
    const { data: existingEpic } = await supabase
        .from('pm_epics')
        .select('id')
        .eq('name', 'AI Eval Test Epic')
        .single();

    let epicId: string;

    if (existingEpic) {
        epicId = existingEpic.id;
        console.log(`Found existing test epic: ${epicId}`);
    } else {
        // Create test epic
        const { data: newEpic, error: epicError } = await supabase
            .from('pm_epics')
            .insert({
                id: `EPIC-EVAL-${Date.now()}`,
                project_id: projectId,
                name: 'AI Eval Test Epic',
                description:
                    'Test epic for AI evaluation. Contains test features for story generation and categorization testing.',
                status: 'Not Started',
                priority: 'P1',
                user_value: 'Enables testing of AI story generation and categorization.',
                business_objectives: ['Test AI quality', 'Validate prompt engineering'],
            })
            .select()
            .single();

        if (epicError) {
            console.error('Failed to create test epic:', epicError);
            process.exit(1);
        }

        epicId = newEpic!.id;
        console.log(`Created test epic: ${epicId}`);
    }

    // Check for existing test features
    const { data: existingFeatures } = await supabase
        .from('pm_features')
        .select('id, name')
        .eq('epic_id', epicId);

    if (existingFeatures && existingFeatures.length >= 3) {
        console.log(`Found ${existingFeatures.length} existing test features`);
        console.log('Test data already seeded. To re-seed, delete existing test features first.');
    } else {
        // Create test features
        const ts = Date.now();
        const testFeatures = [
            {
                id: `FEAT-EVAL-REG-${ts}`,
                project_id: projectId,
                epic_id: epicId,
                name: 'Account Registration',
                description:
                    'New user signup flow with email verification and password creation. Enables guests to become members.',
                status: 'Not Started',
                priority: 'P0',
                display_order: 1,
            },
            {
                id: `FEAT-EVAL-PROF-${ts + 1}`,
                project_id: projectId,
                epic_id: epicId,
                name: 'Profile Management',
                description:
                    'Allow members to view and update their personal information, preferences, and family members.',
                status: 'Not Started',
                priority: 'P1',
                display_order: 2,
            },
            {
                id: `FEAT-EVAL-BOOK-${ts + 2}`,
                project_id: projectId,
                epic_id: epicId,
                name: 'Table Booking',
                description:
                    'Search and reserve picnic tables by date, time, and party size. Members can book facilities in advance.',
                status: 'Not Started',
                priority: 'P0',
                display_order: 3,
            },
        ];

        const { error: featureError } = await supabase
            .from('pm_features')
            .insert(testFeatures);

        if (featureError) {
            console.error('Failed to create test features:', featureError);
            process.exit(1);
        }

        console.log(`Created ${testFeatures.length} test features`);
    }

    // List all test features
    const { data: features } = await supabase
        .from('pm_features')
        .select('id, name')
        .eq('epic_id', epicId);

    console.log();
    console.log('Test Features:');
    for (const f of features || []) {
        console.log(`  - ${f.id}: ${f.name}`);
    }

    console.log();
    console.log('Test data seeding complete!');
    console.log();
    console.log('You can now run the live evals with:');
    console.log('  npm run evals');
    console.log();
    console.log(`Epic ID for manual testing: ${epicId}`);
}

async function cleanupTestData() {
    console.log('Cleaning up test data...');

    // Find test epic
    const { data: epic } = await supabase
        .from('pm_epics')
        .select('id')
        .eq('name', 'AI Eval Test Epic')
        .single();

    if (!epic) {
        console.log('No test epic found. Nothing to clean up.');
        return;
    }

    // Delete features first (foreign key constraint)
    const { error: featureError } = await supabase
        .from('pm_features')
        .delete()
        .eq('epic_id', epic.id);

    if (featureError) {
        console.error('Failed to delete test features:', featureError);
    } else {
        console.log('Deleted test features');
    }

    // Delete user stories with this epic
    const { error: storyError } = await supabase
        .from('pm_user_stories')
        .delete()
        .eq('epic_id', epic.id);

    if (storyError) {
        console.error('Failed to delete test stories:', storyError);
    } else {
        console.log('Deleted test user stories');
    }

    // Delete epic
    const { error: epicError } = await supabase
        .from('pm_epics')
        .delete()
        .eq('id', epic.id);

    if (epicError) {
        console.error('Failed to delete test epic:', epicError);
    } else {
        console.log('Deleted test epic');
    }

    console.log('Cleanup complete!');
}

// Parse command line args
const args = process.argv.slice(2);

if (args.includes('--cleanup')) {
    cleanupTestData().catch(console.error);
} else {
    seedTestData().catch(console.error);
}
