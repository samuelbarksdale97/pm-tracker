// AI Eval Test Fixtures
// Realistic sample data for testing story generation and categorization

import { Feature, Epic, Project } from '@/lib/supabase';

// =============================================================================
// Projects
// =============================================================================

export const TEST_PROJECT: Project = {
    id: 'PRJ-TEST-001',
    name: 'Park Membership App',
    description: 'A comprehensive membership management application for park visitors, enabling online membership purchases, renewals, and member-exclusive benefits.',
    status: 'active',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
};

// =============================================================================
// Epics
// =============================================================================

export const TEST_EPICS: Record<string, Epic> = {
    membership: {
        id: 'EPIC-001',
        project_id: TEST_PROJECT.id,
        name: 'Member Registration & Onboarding',
        description: 'Enable new visitors to register as members, complete their profile, and start using member benefits immediately.',
        status: 'In Progress',
        priority: 'P0',
        user_value: 'Members can quickly join and access all park benefits without visiting in person.',
        business_objectives: [
            'Increase online membership signups by 50%',
            'Reduce in-person registration time by 80%',
            'Improve member data accuracy',
        ],
        success_metrics: [
            'Signup completion rate > 80%',
            'Time to first benefit usage < 5 minutes',
        ],
        technical_context: 'React frontend with Supabase auth and PostgreSQL backend.',
        dependencies: null,
        feature_areas: ['registration', 'profile', 'verification'],
        display_order: 1,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
    },
    reservations: {
        id: 'EPIC-002',
        project_id: TEST_PROJECT.id,
        name: 'Table & Facility Reservations',
        description: 'Allow members to reserve tables, picnic areas, and other park facilities online.',
        status: 'Not Started',
        priority: 'P1',
        user_value: 'Members can guarantee their spot at popular facilities without arriving early.',
        business_objectives: [
            'Reduce no-shows with confirmation system',
            'Enable dynamic pricing for peak times',
            'Better facility utilization tracking',
        ],
        success_metrics: [
            'No-show rate < 10%',
            'Booking completion rate > 90%',
        ],
        technical_context: 'Calendar UI with real-time availability checking.',
        dependencies: ['EPIC-001'],
        feature_areas: ['booking', 'calendar', 'notifications'],
        display_order: 2,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
    },
    payments: {
        id: 'EPIC-003',
        project_id: TEST_PROJECT.id,
        name: 'Payments & Billing',
        description: 'Handle all payment processing including membership fees, facility rentals, and add-on purchases.',
        status: 'Not Started',
        priority: 'P0',
        user_value: 'Members can pay securely online and manage their payment methods.',
        business_objectives: [
            'Process 95% of payments online',
            'Reduce payment failures with retry logic',
            'Support multiple payment methods',
        ],
        success_metrics: [
            'Payment success rate > 98%',
            'Average checkout time < 2 minutes',
        ],
        technical_context: 'Stripe integration with webhook handling.',
        dependencies: ['EPIC-001'],
        feature_areas: [],
        display_order: 3,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
    },
};

// =============================================================================
// Features (for testing categorization)
// =============================================================================

export const TEST_FEATURES: Record<string, Feature[]> = {
    membership: [
        {
            id: 'FEAT-001',
            project_id: TEST_PROJECT.id,
            epic_id: 'EPIC-001',
            goal_id: null,
            milestone_id: null,
            name: 'Account Registration',
            description: 'New user signup flow with email verification and password creation.',
            status: 'In Progress',
            priority: 'P0',
            display_order: 1,
            created_at: '2025-01-01T00:00:00Z',
            updated_at: '2025-01-01T00:00:00Z',
        },
        {
            id: 'FEAT-002',
            project_id: TEST_PROJECT.id,
            epic_id: 'EPIC-001',
            goal_id: null,
            milestone_id: null,
            name: 'Profile Management',
            description: 'Allow members to view and update their personal information, preferences, and family members.',
            status: 'Not Started',
            priority: 'P1',
            display_order: 2,
            created_at: '2025-01-01T00:00:00Z',
            updated_at: '2025-01-01T00:00:00Z',
        },
        {
            id: 'FEAT-003',
            project_id: TEST_PROJECT.id,
            epic_id: 'EPIC-001',
            goal_id: null,
            milestone_id: null,
            name: 'Membership Tier Selection',
            description: 'Present membership options (Basic, Premium, Family) and allow tier selection during signup.',
            status: 'Not Started',
            priority: 'P0',
            display_order: 3,
            created_at: '2025-01-01T00:00:00Z',
            updated_at: '2025-01-01T00:00:00Z',
        },
        {
            id: 'FEAT-004',
            project_id: TEST_PROJECT.id,
            epic_id: 'EPIC-001',
            goal_id: null,
            milestone_id: null,
            name: 'ID Verification',
            description: 'Verify member identity through document upload or in-person check.',
            status: 'Not Started',
            priority: 'P2',
            display_order: 4,
            created_at: '2025-01-01T00:00:00Z',
            updated_at: '2025-01-01T00:00:00Z',
        },
    ],
    reservations: [
        {
            id: 'FEAT-010',
            project_id: TEST_PROJECT.id,
            epic_id: 'EPIC-002',
            goal_id: null,
            milestone_id: null,
            name: 'Table Booking',
            description: 'Search and reserve picnic tables by date, time, and party size.',
            status: 'Not Started',
            priority: 'P0',
            display_order: 1,
            created_at: '2025-01-01T00:00:00Z',
            updated_at: '2025-01-01T00:00:00Z',
        },
        {
            id: 'FEAT-011',
            project_id: TEST_PROJECT.id,
            epic_id: 'EPIC-002',
            goal_id: null,
            milestone_id: null,
            name: 'Availability Calendar',
            description: 'Display facility availability in a visual calendar format with real-time updates.',
            status: 'Not Started',
            priority: 'P1',
            display_order: 2,
            created_at: '2025-01-01T00:00:00Z',
            updated_at: '2025-01-01T00:00:00Z',
        },
        {
            id: 'FEAT-012',
            project_id: TEST_PROJECT.id,
            epic_id: 'EPIC-002',
            goal_id: null,
            milestone_id: null,
            name: 'Reservation Reminders',
            description: 'Send email and push notifications before reserved time slots.',
            status: 'Not Started',
            priority: 'P2',
            display_order: 3,
            created_at: '2025-01-01T00:00:00Z',
            updated_at: '2025-01-01T00:00:00Z',
        },
    ],
    payments: [], // Empty to test "no features" scenario
};

// =============================================================================
// Test Narratives (for categorization testing)
// =============================================================================

export interface TestNarrative {
    narrative: string;
    persona: 'member' | 'admin' | 'staff' | 'business' | 'guest';
    expectedFeatureId?: string; // Which feature it should match
    expectedRecommendation?: 'existing' | 'new' | 'none';
    minConfidence?: number; // Minimum expected confidence for existing matches
    description: string; // What this test case is testing
}

export const TEST_NARRATIVES: Record<string, TestNarrative[]> = {
    membership: [
        {
            narrative: 'As a guest, I want to create an account with my email and password so that I can become a park member.',
            persona: 'guest',
            expectedFeatureId: 'FEAT-001', // Account Registration
            expectedRecommendation: 'existing',
            minConfidence: 80,
            description: 'Clear match to Account Registration feature',
        },
        {
            narrative: 'As a member, I want to update my phone number and address so that I receive important notifications.',
            persona: 'member',
            expectedFeatureId: 'FEAT-002', // Profile Management
            expectedRecommendation: 'existing',
            minConfidence: 75,
            description: 'Clear match to Profile Management feature',
        },
        {
            narrative: 'As a member, I want to see the differences between Basic, Premium, and Family memberships so that I can choose the right one.',
            persona: 'member',
            expectedFeatureId: 'FEAT-003', // Membership Tier Selection
            expectedRecommendation: 'existing',
            minConfidence: 70,
            description: 'Match to Membership Tier Selection',
        },
        {
            narrative: 'As a member, I want to upload my drivers license to verify my identity so that I can access age-restricted areas.',
            persona: 'member',
            expectedFeatureId: 'FEAT-004', // ID Verification
            expectedRecommendation: 'existing',
            minConfidence: 70,
            description: 'Match to ID Verification feature',
        },
        {
            narrative: 'As a member, I want to share my membership with my spouse so that they can use park benefits too.',
            persona: 'member',
            expectedRecommendation: 'new', // No existing feature for family sharing
            description: 'Should suggest new feature for family sharing',
        },
        {
            narrative: 'As an admin, I want to reset a member password so that locked-out members can regain access.',
            persona: 'admin',
            expectedRecommendation: 'new', // Admin feature not covered
            description: 'Admin functionality should suggest new feature',
        },
    ],
    reservations: [
        {
            narrative: 'As a member, I want to reserve a picnic table for next Saturday so that my family has a guaranteed spot.',
            persona: 'member',
            expectedFeatureId: 'FEAT-010', // Table Booking
            expectedRecommendation: 'existing',
            minConfidence: 85,
            description: 'Direct match to Table Booking',
        },
        {
            narrative: 'As a member, I want to see which tables are available on a specific date so that I can plan my visit.',
            persona: 'member',
            expectedFeatureId: 'FEAT-011', // Availability Calendar
            expectedRecommendation: 'existing',
            minConfidence: 75,
            description: 'Match to Availability Calendar',
        },
        {
            narrative: 'As a member, I want to receive a text message 24 hours before my reservation so that I dont forget.',
            persona: 'member',
            expectedFeatureId: 'FEAT-012', // Reservation Reminders
            expectedRecommendation: 'existing',
            minConfidence: 80,
            description: 'Match to Reservation Reminders',
        },
        {
            narrative: 'As a member, I want to cancel my reservation and get a refund so that I am not charged for trips I cannot make.',
            persona: 'member',
            expectedRecommendation: 'new', // Cancellation not covered
            description: 'Cancellation should suggest new feature',
        },
    ],
    payments: [
        {
            narrative: 'As a member, I want to pay for my membership with a credit card so that I can complete the signup process.',
            persona: 'member',
            expectedRecommendation: 'new', // No features exist
            description: 'No features - should suggest new payment feature',
        },
    ],
};

// =============================================================================
// Expected Story Generation Patterns
// =============================================================================

export interface StoryGenerationExpectation {
    featureId: string;
    minStories: number;
    maxStories: number;
    expectedPersonas: string[]; // At least one story should have these personas
    expectedPriorities: string[]; // Should include mix of priorities
    description: string;
}

export const STORY_GENERATION_EXPECTATIONS: StoryGenerationExpectation[] = [
    {
        featureId: 'FEAT-001', // Account Registration
        minStories: 3,
        maxStories: 7,
        expectedPersonas: ['guest', 'member'],
        expectedPriorities: ['P0', 'P1'],
        description: 'Account Registration should generate signup-focused stories',
    },
    {
        featureId: 'FEAT-010', // Table Booking
        minStories: 3,
        maxStories: 7,
        expectedPersonas: ['member'],
        expectedPriorities: ['P0', 'P1'],
        description: 'Table Booking should generate reservation-focused stories',
    },
    {
        featureId: 'FEAT-002', // Profile Management
        minStories: 3,
        maxStories: 7,
        expectedPersonas: ['member', 'admin'],
        expectedPriorities: ['P1', 'P2'],
        description: 'Profile Management should generate profile editing stories',
    },
];
