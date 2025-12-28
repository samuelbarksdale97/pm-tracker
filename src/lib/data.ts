import { Story, Workstream } from './types';

// Workstream definitions
export const workstreams: Workstream[] = [
    { id: 'A', name: 'Backend API', description: 'API endpoints and database layer', color: '#3B82F6' },
    { id: 'B', name: 'Mobile App', description: 'React Native iOS/Android app', color: '#10B981' },
    { id: 'C', name: 'Admin Dashboard', description: 'Staff-facing web tools', color: '#8B5CF6' },
    { id: 'D', name: 'Infrastructure', description: 'DevOps, CI/CD, security', color: '#F59E0B' },
];

// All 58 tasks from scope breakdown
export const stories: Story[] = [
    // Workstream A: Backend API (20 tasks)
    {
        id: 'A1',
        workstream_id: 'A',
        name: 'Design API architecture (REST vs GraphQL, auth strategy)',
        priority: 'P0',
        status: 'Not Started',
        estimate: '2d',
        dependencies: [],
        user_stories: [
            "As a mobile developer, I need a clear API contract to build the app against.",
            "As a security engineer, I need a defined auth strategy using Supabase and JWTs."
        ],
        definition_of_done: [
            "docs/api-architecture.md created",
            "docs/api-conventions.md created (naming, response standards)",
            "Swagger/OpenAPI skeleton file created",
            "Mobile developer sign-off on conventions"
        ],
        backend_specs: `1. Choose API Style: REST vs GraphQL (REST recommended).
2. Define Auth Strategy: Supabase Auth (Phone/OTP) + JWT.
3. Establish Conventions: Base URL /v1, Kebab-case, Standard response wrappers.
4. Define Error Handling: Standard error object structure.`
    },
    {
        id: 'A2',
        workstream_id: 'A',
        name: 'Extend members schema for mobile (preferences, wallet, verification)',
        priority: 'P0',
        status: 'Not Started',
        estimate: '1d',
        dependencies: ['A1'],
        user_stories: [
            "As a member, I want my profile to support a photo and preferences so the app feels personalized.",
            "As a business, I need to track age verification status and membership expiry."
        ],
        definition_of_done: [
            "Migration file created for new columns (phone, profile_photo, dob, etc.)",
            "TypeScript types updated to reflect new schema",
            "Migration successfully applied to dev DB without data loss"
        ],
        backend_specs: `1. Audit existing members table.
2. Add columns: phone, profile_photo_url, date_of_birth, age_verification_status, whos_going_visible, membership_expiry_date, drink_count, lifetime_tips, push_token, preferred_categories.
3. Create indexes for phone, tier, age_status.
4. Add updated_at trigger.`
    },
    {
        id: 'A3',
        workstream_id: 'A',
        name: 'Create events table and schema',
        priority: 'P0',
        status: 'Not Started',
        estimate: '1d',
        dependencies: ['A1'],
        user_stories: [
            "As a member, I want to see a list of upcoming events with details.",
            "As an admin, I want to control event visibility and capacity."
        ],
        definition_of_done: [
            "Migration file created for events table",
            "TypeScript types generated",
            "Can create/read events via Supabase Studio"
        ],
        backend_specs: `1. Create events table: title, slug, description, dates, pricing, capacity, images.
2. support visibility flags: is_published, is_featured, members_only.
3. specific fields: dress_code, age_requirement, lineup, tags.
4. RLS policies for public reading of published events.`
    },
    {
        id: 'A4',
        workstream_id: 'A',
        name: 'Create table_inventory schema (real-time availability)',
        priority: 'P0',
        status: 'Not Started',
        estimate: '1d',
        dependencies: ['A1'],
        user_stories: [
            "As a member, I want to see which tables are available for a specific night.",
            "As the system, I need to prevent double-booking of tables."
        ],
        definition_of_done: [
            "Migration file created for table_inventory and table_availability",
            "Postgres function get_available_tables created",
            "Availability logic verified with test data"
        ],
        backend_specs: `1. Create table_inventory: id, number, section, capacity, min_spend.
2. Create table_availability: link table_id to date, status (available, held, booked).
3. Implement get_available_tables(date) Stored Procedure to join inventory with availability.`
    },
    {
        id: 'A5',
        workstream_id: 'A',
        name: 'Create packages/add-ons schema',
        priority: 'P1',
        status: 'Not Started',
        estimate: '1d',
        dependencies: ['A3', 'A4'],
        user_stories: [
            "As a member, I want to add bottle packages to my reservation."
        ],
        definition_of_done: [
            "Migration file created for packages table",
            "Seed data populated for initial menu items"
        ],
        backend_specs: `1. Create packages table: name, category (bottle, package, mixer), price, image.
2. Support display_order and visibility flags.`
    },
    {
        id: 'A6',
        workstream_id: 'A',
        name: 'Implement member auth endpoints (login, signup, refresh, logout)',
        priority: 'P0',
        status: 'Not Started',
        estimate: '2d',
        dependencies: ['A2'],
        user_stories: [
            "As a user, I want to log in using my phone number and an OTP."
        ],
        definition_of_done: [
            "Edge functions created for request-otp and verify-otp",
            "Twilio/Supabase Auth configured",
            "Validated token refresh flow"
        ],
        backend_specs: `1. Configure Supabase Auth for Phone provider.
2. Create Edge Function: /auth/request-otp (validates phone, checks member existence).
3. Create Edge Function: /auth/verify-otp (verifies code, returns session + member profile).
4. Implement token refresh logic.`
    },
    {
        id: 'A7',
        workstream_id: 'A',
        name: 'Implement member profile CRUD API',
        priority: 'P0',
        status: 'Not Started',
        estimate: '1d',
        dependencies: ['A6'],
        user_stories: [
            "As a member, I want to update my profile photo and preferences."
        ],
        definition_of_done: [
            "Edge function created for member profile",
            "Storage bucket 'member-photos' created",
            "Can upload photo and update profile fields"
        ],
        backend_specs: `1. GET /members/me: Return full profile + stats (reservations count).
2. PATCH /members/me: Allow updates to specific fields (photo, preferences).
3. POST /members/me/photo: Handle image upload to Supabase Storage and update DB URL.`
    },
    {
        id: 'A8',
        workstream_id: 'A',
        name: 'Implement events list/detail API',
        priority: 'P0',
        status: 'Not Started',
        estimate: '1d',
        dependencies: ['A3'],
        user_stories: [
            "As a member, I want to filter events by date and type."
        ],
        definition_of_done: [
            "Edge function created for fetching events",
            "Filtering and pagination working"
        ],
        backend_specs: `1. GET /events: Support query params (date_from, featured, limit).
2. GET /events/:id: Include RSVP status and RSVP count.
3. Optimize queries with appropriate indexes.`
    },
    {
        id: 'A9',
        workstream_id: 'A',
        name: 'Implement RSVP endpoints (create, cancel, waitlist)',
        priority: 'P0',
        status: 'Not Started',
        estimate: '2d',
        dependencies: ['A3', 'A6'],
        user_stories: [
            "As a member, I want to RSVP to an event.",
            "As a member, I want to see who else is going."
        ],
        definition_of_done: [
            "Migration created for rsvps table",
            "Edge function created for RSVP operations",
            "Waitlist logic functions implemented"
        ],
        backend_specs: `1. Create rsvps table: member_id, event_id, status (confirmed, waitlist), qr_code.
2. POST /events/:id/rsvp: Check capacity, add to waitlist if full, generate QR.
3. DELETE /events/:id/rsvp: Handle cancellation and waitlist promotion.
4. GET /events/:id/whos-going: Return public attendees.`
    },
    {
        id: 'A10',
        workstream_id: 'A',
        name: 'Implement table reservation API (availability, book, cancel)',
        priority: 'P0',
        status: 'Not Started',
        estimate: '2d',
        dependencies: ['A4', 'A6'],
        user_stories: [
            "As a member, I want to check table availability for a specific date.",
            "As a member, I want to request a table reservation."
        ],
        definition_of_done: [
            "Migration created for reservations table",
            "Edge function created for reservation workflow",
            "Table holding logic verified"
        ],
        backend_specs: `1. Create reservations table: member_id, table_id, party_size, status, packages.
2. GET /tables/available: reuse stored procedure.
3. POST /reservations: Validate tier eligibility, hold table in table_availability, create reservation record.`
    },
    {
        id: 'A11',
        workstream_id: 'A',
        name: 'Implement Reservation Approval Workflow',
        priority: 'P1',
        status: 'Not Started',
        estimate: '2d',
        dependencies: ['A10'],
        user_stories: [
            "As an admin, I want to approve or deny reservation requests.",
            "As a member, I want to receive a notification when my reservation is confirmed."
        ],
        definition_of_done: [
            "Migration created for notifications table",
            "Admin API endpoints for approve/deny created",
            "Push notification triggers implemented"
        ],
        backend_specs: `1. Create notifications table.
2. POST /admin/reservations/:id/approve: Update status, hold table, notify user.
3. POST /admin/reservations/:id/deny: Cancel status, release table, notify user.`
    },
    {
        id: 'A12',
        workstream_id: 'A',
        name: 'Implement Waitlist Engine',
        priority: 'P1',
        status: 'Not Started',
        estimate: '2d',
        dependencies: ['A9'],
        user_stories: [
            "As a business, I want empty spots to be automatically filled from the waitlist."
        ],
        definition_of_done: [
            "DB function promote_from_waitlist created",
            "Waitlist position tracking implemented"
        ],
        backend_specs: `1. Add waitlist_position to RSVPs.
2. Implement assign_waitlist_position logic.
3. Implement promote_from_waitlist(event_id) to auto-promote when spots open.`
    },
    {
        id: 'A13',
        workstream_id: 'A',
        name: 'Implement guest invitation system (codes, limits)',
        priority: 'P1',
        status: 'Not Started',
        estimate: '2d',
        dependencies: ['A6'],
        notes: 'Distribution via SMS, email, and in-app',
        user_stories: [
            "As a member, I want to send unique invites to my guests.",
            "As a guest, I want to redeem an code to check in or RSVP."
        ],
        definition_of_done: [
            "Migration created for guest_invites",
            "Invite generation and redemption endpoints created"
        ],
        backend_specs: `1. Create guest_invites table: code, member_id, status.
2. POST /invites: Check limit (max 3), generate unique code.
3. POST /invites/redeem: Validate code, mark used, associate guest.`
    },
    {
        id: 'A14',
        workstream_id: 'A',
        name: 'Integrate payment processor',
        priority: 'P0',
        status: 'Blocked',
        estimate: '3d',
        dependencies: ['A6'],
        notes: 'Blocked: Payment provider not confirmed',
        user_stories: [
            "As a business, I want to securely process payments for reservations."
        ],
        definition_of_done: [
            "Stripe/Payment provider configured in env",
            "Payment Intents API created",
            "Webhook handler for payment success/failure implemented"
        ],
        backend_specs: `1. Setup Stripe/Provider keys.
2. Create Payment Intent endpoint.
3. Implement Webhook Handler to update reservation payment_status.`
    },
    {
        id: 'A15',
        workstream_id: 'A',
        name: 'Implement Mobile Wallet Integration',
        priority: 'P1',
        status: 'Blocked',
        estimate: '2d',
        dependencies: ['A14'],
        notes: 'Blocked: Depends on A14',
        user_stories: [
            "As a user, I want to pay quickly using Apple Pay or Google Pay."
        ],
        definition_of_done: [
            "Stripe Payment Element configured for mobile",
            "Apple Pay merchant validation steps documented"
        ],
        backend_specs: `1. Generate ephemeral keys for mobile SDK.
2. Create payment intent with mobile wallet support.
3. Return config object for mobile client.`
    },
    {
        id: 'A16',
        workstream_id: 'A',
        name: 'Integrate age verification service (3rd party)',
        priority: 'P0',
        status: 'Blocked',
        estimate: '3d',
        dependencies: ['A6'],
        notes: 'Blocked: Provider not selected',
        user_stories: [
            "As a business, I must ensure all members are 21+."
        ],
        definition_of_done: [
            "Integration with Stripe Identity (or similar) complete",
            "Webhook update of age_verification_status implemented"
        ],
        backend_specs: `1. POST /verification/start: specific session creation.
2. Webhook: Listen for verified event.
3. Update member.age_verification_status and dob based on ID scan.`
    },
    {
        id: 'A17',
        workstream_id: 'A',
        name: 'Implement QR code generation for members',
        priority: 'P1',
        status: 'Not Started',
        estimate: '1d',
        dependencies: ['A6'],
        user_stories: [
            "As a member, I want to scan a dynamic QR code to enter the club."
        ],
        definition_of_done: [
            "Time-based OTP QR generation logic implemented",
            "Scanner verification endpoint created"
        ],
        backend_specs: `1. Generate member QR: base64(member_id + timestamp + signature).
2. GET /members/me/qr: Return rotating token.
3. POST /check-in/scan: Verify signature and expiration.`
    },
    {
        id: 'A18',
        workstream_id: 'A',
        name: 'Implement push notification service (FCM/APNS)',
        priority: 'P1',
        status: 'Not Started',
        estimate: '2d',
        dependencies: ['A6'],
        user_stories: [
            "As a member, I want to be notified about reservation updates and events."
        ],
        definition_of_done: [
            "Push token storage implemented",
            "Send function (Expo/OneSignal) created"
        ],
        backend_specs: `1. Store push_token in members table.
2. Implement sendPush(token, payload) utility.
3. Define notification types: reservation_confirmed, event_reminder, etc.`
    },
    {
        id: 'A19',
        workstream_id: 'A',
        name: 'Create Content Management Schema',
        priority: 'P2',
        status: 'Not Started',
        estimate: '2d',
        dependencies: ['A3'],
        notes: 'Includes Explore content and Amenities',
        user_stories: [
            "As an admin, I want to manage content for the Explore page."
        ],
        definition_of_done: [
            "Migrations created for explore_content, amenities, photo_gallery",
            "CRUD endpoints or Supabase Studio workflow established"
        ],
        backend_specs: `1. Create explore_content table: category, title, image, link.
2. Create amenities table: tier, icon, description.
3. Create photo_gallery table: link to events, approved flag.`
    },
    {
        id: 'A20',
        workstream_id: 'A',
        name: 'Implement membership subscription/renewal logic',
        priority: 'P0',
        status: 'Blocked',
        estimate: '2d',
        dependencies: ['A14', 'A6'],
        notes: 'Blocked: Tier definitions TBD',
        user_stories: [
            "As a business, I want members to automatically upgrade tiers based on spend."
        ],
        definition_of_done: [
            "Tier upgrade triggers implemented",
            "Spend calculation logic verified"
        ],
        backend_specs: `1. Define TIER_THRESHOLDS.
2. Create check_tier_upgrade trigger on total_spend changes.
3. Handle renewals/expirations (batch job or lazy check).`
    },
    {
        id: 'A21',
        workstream_id: 'A',
        name: 'Implement Drink Counter & Tip History',
        priority: 'P1',
        status: 'Not Started',
        estimate: '2d',
        dependencies: ['A6'],
        user_stories: [
            "As a business, I want to track lifetime value of members including drinks and tips."
        ],
        definition_of_done: [
            "drink_orders table created",
            "Triggers for aggregating stats to members table implemented"
        ],
        backend_specs: `1. Create drink_orders table.
2. Create update_drink_stats trigger to update members.drink_count and members.lifetime_tips.`
    },
    {
        id: 'A22',
        workstream_id: 'A',
        name: 'Create Drink Tally Endpoint',
        priority: 'P1',
        status: 'Not Started',
        estimate: '1d',
        dependencies: ['A21'],
        user_stories: [
            "As a staff member, I want to quickly log a drink for a member."
        ],
        definition_of_done: [
            "Staff-facing endpoint for logging drinks created",
            "Real-time update of stats verified"
        ],
        backend_specs: `1. POST /staff/drinks: Log drink, associate with current visit if exists.`
    },
    {
        id: 'A23',
        workstream_id: 'A',
        name: 'Add Who\'s Going Privacy Toggle',
        priority: 'P1',
        status: 'Not Started',
        estimate: '0.5d',
        dependencies: ['A2'],
        user_stories: [
            "As a member, I want to control whether others can see I'm attending an event."
        ],
        definition_of_done: [
            "Profile toggle updates DB",
            "Who's Going query respects the flag"
        ],
        backend_specs: `1. Ensure whos_going_visible column exists.
2. Update PATCH /members/me to allow toggling.
3. Update GET /events/:id/whos-going to filter by this flag.`
    },
    {
        id: 'A24',
        workstream_id: 'A',
        name: 'Implement 3-Guest Limit Enforcer',
        priority: 'P0',
        status: 'Not Started',
        estimate: '1d',
        dependencies: ['A13'],
        user_stories: [
            "As a business, I want to limit guest invites to 3 per member."
        ],
        definition_of_done: [
            "DB trigger preventing 4th active invite created",
            "API error handling for limit exceeded verified"
        ],
        backend_specs: `1. Create check_guest_limit trigger function.
2. Apply to BEFORE INSERT on guest_invites.`
    },
    {
        id: 'A25',
        workstream_id: 'A',
        name: 'Implement Member-Only Booking Lock',
        priority: 'P0',
        status: 'Not Started',
        estimate: '1d',
        dependencies: ['A6'],
        user_stories: [
            "As a business, I want to ensure only paid members can book tables."
        ],
        definition_of_done: [
            "Middleware check for tier implemented",
            "Applied to reservation creation endpoint"
        ],
        backend_specs: `1. Create requireMemberTier middleware.
2. Apply to POST /reservations.`
    },

    // Workstream B: Mobile App (21 tasks)
    { id: 'B1', workstream_id: 'B', name: 'Set up React Native project structure', priority: 'P0', status: 'Not Started', estimate: '1d', dependencies: [] },
    { id: 'B2', workstream_id: 'B', name: 'Implement design system (colors, typography, components)', priority: 'P0', status: 'Not Started', estimate: '2d', dependencies: ['B1'] },
    { id: 'B3', workstream_id: 'B', name: 'Build auth flow (login, signup, forgot password)', priority: 'P0', status: 'Not Started', estimate: '2d', dependencies: ['B1', 'A6'] },
    { id: 'B4', workstream_id: 'B', name: 'Build age verification flow', priority: 'P0', status: 'Blocked', estimate: '2d', dependencies: ['B3', 'A16'], notes: 'Blocked: Depends on A16' },
    { id: 'B5', workstream_id: 'B', name: 'Build home screen / explore section', priority: 'P1', status: 'Not Started', estimate: '2d', dependencies: ['B2'] },
    { id: 'B6', workstream_id: 'B', name: 'Build event discovery & detail screens', priority: 'P0', status: 'Not Started', estimate: '2d', dependencies: ['B2', 'A8'] },
    { id: 'B7', workstream_id: 'B', name: 'Build RSVP flow (free + paid)', priority: 'P0', status: 'Not Started', estimate: '2d', dependencies: ['B6', 'A9', 'A14'], notes: 'Includes public Who\'s Going visibility' },
    { id: 'B8', workstream_id: 'B', name: 'Build table reservation flow', priority: 'P0', status: 'Not Started', estimate: '3d', dependencies: ['B2', 'A10'] },
    { id: 'B9', workstream_id: 'B', name: 'Build package/add-on selection', priority: 'P1', status: 'Not Started', estimate: '2d', dependencies: ['B8', 'A11'] },
    { id: 'B10', workstream_id: 'B', name: 'Build user profile screen', priority: 'P0', status: 'Not Started', estimate: '2d', dependencies: ['B2', 'A7'] },
    { id: 'B11', workstream_id: 'B', name: 'Build saved payment methods screen', priority: 'P0', status: 'Blocked', estimate: '2d', dependencies: ['B10', 'A15'], notes: 'Blocked: Depends on A15' },
    { id: 'B12', workstream_id: 'B', name: 'Build booking history screen', priority: 'P1', status: 'Not Started', estimate: '2d', dependencies: ['B2', 'A12'] },
    { id: 'B13', workstream_id: 'B', name: 'Implement push notification handling', priority: 'P1', status: 'Not Started', estimate: '1d', dependencies: ['B1', 'A18'] },
    { id: 'B14', workstream_id: 'B', name: 'Build photo gallery viewer', priority: 'P2', status: 'Not Started', estimate: '2d', dependencies: ['B2', 'A19'], notes: 'Staff-curated galleries' },
    { id: 'B15', workstream_id: 'B', name: 'Build membership tier display & perks', priority: 'P1', status: 'Blocked', estimate: '1d', dependencies: ['B10'], notes: 'Blocked: Tier definitions TBD' },
    { id: 'B16', workstream_id: 'B', name: 'Implement QR code display for entry', priority: 'P1', status: 'Not Started', estimate: '1d', dependencies: ['B10', 'A17'] },
    { id: 'B17', workstream_id: 'B', name: 'Implement Apple Wallet pass integration', priority: 'P2', status: 'Not Started', estimate: '2d', dependencies: ['A17'] },
    { id: 'B18', workstream_id: 'B', name: 'Build guest invitation flow', priority: 'P1', status: 'Not Started', estimate: '2d', dependencies: ['B10', 'A13'], notes: 'SMS, email, and in-app distribution' },
    { id: 'B19', workstream_id: 'B', name: 'Implement in-app checkout flow', priority: 'P0', status: 'Blocked', estimate: '3d', dependencies: ['B7', 'B8', 'A14'], notes: 'Blocked: Depends on A14' },
    { id: 'B20', workstream_id: 'B', name: 'Add to calendar functionality', priority: 'P2', status: 'Not Started', estimate: '1d', dependencies: ['B6'] },
    { id: 'B21', workstream_id: 'B', name: 'Build receipts/confirmation screens', priority: 'P1', status: 'Not Started', estimate: '1d', dependencies: ['B19'] },

    // Workstream C: Admin Dashboard (12 tasks)
    { id: 'C1', workstream_id: 'C', name: 'Create events management CRUD', priority: 'P0', status: 'Not Started', estimate: '2d', dependencies: ['A3'] },
    { id: 'C2', workstream_id: 'C', name: 'Build table/inventory management UI', priority: 'P0', status: 'Not Started', estimate: '2d', dependencies: ['A4'] },
    { id: 'C3', workstream_id: 'C', name: 'Build reservation approval workflow', priority: 'P0', status: 'Not Started', estimate: '2d', dependencies: ['A10'] },
    { id: 'C4', workstream_id: 'C', name: 'Build RSVP/guest list management', priority: 'P0', status: 'Not Started', estimate: '2d', dependencies: ['A9'] },
    { id: 'C5', workstream_id: 'C', name: 'Add age verification override UI', priority: 'P1', status: 'Blocked', estimate: '1d', dependencies: ['A16'], notes: 'Blocked: Depends on A16' },
    { id: 'C6', workstream_id: 'C', name: 'Build push notification composer', priority: 'P1', status: 'Not Started', estimate: '2d', dependencies: ['A18'] },
    { id: 'C7', workstream_id: 'C', name: 'Build transaction history & refund UI', priority: 'P1', status: 'Blocked', estimate: '2d', dependencies: ['A14'], notes: 'Blocked: Depends on A14' },
    { id: 'C8', workstream_id: 'C', name: 'Add analytics: event performance', priority: 'P2', status: 'Not Started', estimate: '2d', dependencies: ['A3'] },
    { id: 'C9', workstream_id: 'C', name: 'Add analytics: revenue by category', priority: 'P2', status: 'Blocked', estimate: '2d', dependencies: ['A14'], notes: 'Blocked: Depends on A14' },
    { id: 'C10', workstream_id: 'C', name: 'Add analytics: demographics & peak times', priority: 'P2', status: 'Not Started', estimate: '2d', dependencies: [] },
    { id: 'C11', workstream_id: 'C', name: 'Build QR code scanner interface (check-in)', priority: 'P1', status: 'Not Started', estimate: '2d', dependencies: ['A17'] },
    { id: 'C12', workstream_id: 'C', name: 'Build real-time entry count display', priority: 'P1', status: 'Not Started', estimate: '1d', dependencies: ['C11'] },

    // Workstream D: Infrastructure (5 tasks)
    { id: 'D1', workstream_id: 'D', name: 'Set up iOS App Store account & provisioning', priority: 'P0', status: 'Not Started', estimate: '1d', dependencies: [] },
    { id: 'D2', workstream_id: 'D', name: 'Set up Google Play developer account', priority: 'P0', status: 'Not Started', estimate: '1d', dependencies: [] },
    { id: 'D3', workstream_id: 'D', name: 'Configure payment processor account (TBD)', priority: 'P0', status: 'Blocked', estimate: '1d', dependencies: [], notes: 'Blocked: Provider not confirmed' },
    { id: 'D4', workstream_id: 'D', name: 'Integrate age verification provider (TBD)', priority: 'P0', status: 'Blocked', estimate: '2d', dependencies: [], notes: 'Blocked: Provider not selected' },
    { id: 'D5', workstream_id: 'D', name: 'Set up push notification certificates (APNS + FCM)', priority: 'P1', status: 'Not Started', estimate: '1d', dependencies: [] },
    { id: 'D6', workstream_id: 'D', name: 'Configure CDN for photo galleries', priority: 'P2', status: 'Not Started', estimate: '1d', dependencies: [] },
    { id: 'D7', workstream_id: 'D', name: 'Set up CI/CD for mobile builds', priority: 'P1', status: 'Not Started', estimate: '2d', dependencies: ['B1'] },
    { id: 'D8', workstream_id: 'D', name: 'Security audit & penetration testing', priority: 'P1', status: 'Not Started', estimate: '3d', dependencies: [], notes: 'Run after major features complete' },
];

// Helper functions
// Helper functions
export function getStoriesByWorkstream(workstreamId: string): Story[] {
    return stories.filter(t => t.workstream_id === workstreamId);
}

export function getStoryById(id: string): Story | undefined {
    return stories.find(t => t.id === id);
}

export function getBlockedStories(): Story[] {
    return stories.filter(t => t.status === 'Blocked');
}

export function getStoryStats() {
    const stats = {
        total: stories.length,
        notStarted: stories.filter(t => t.status === 'Not Started').length,
        inProgress: stories.filter(t => t.status === 'In Progress').length,
        done: stories.filter(t => t.status === 'Done').length,
        blocked: stories.filter(t => t.status === 'Blocked').length,
        p0: stories.filter(t => t.priority === 'P0').length,
        p1: stories.filter(t => t.priority === 'P1').length,
        p2: stories.filter(t => t.priority === 'P2').length,
    };
    return stats;
}
