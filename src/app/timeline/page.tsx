'use client';

import { useState, useEffect } from 'react';
import { format, differenceInDays, isPast, isToday, compareAsc } from 'date-fns';
import { milestonesApi, questionsApi } from '@/lib/park-timeline-api';
import {
  CheckCircle2,
  Circle,
  AlertTriangle,
  Clock,
  Calendar,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  GripVertical,
  Target,
  MessageCircleQuestion,
  Check,
  X,
} from 'lucide-react';

// Types
interface Milestone {
  id: string;
  name: string;
  date: string; // YYYY-MM-DD
  status: 'not_started' | 'in_progress' | 'complete' | 'blocked';
  owner: string;
  notes?: string;
}

interface OpenQuestion {
  id: string;
  question: string;
  context?: string;
  status: 'open' | 'answered' | 'deferred';
  answer?: string;
  answered_date?: string;
  category: 'product' | 'technical' | 'business' | 'other';
}

// Helper to parse date string as local date
function parseDate(dateStr: string): Date {
  return new Date(dateStr + 'T00:00:00');
}

// Helper to sort milestones by date properly
function sortByDate(milestones: Milestone[]): Milestone[] {
  return [...milestones].sort((a, b) => {
    const dateA = parseDate(a.date);
    const dateB = parseDate(b.date);
    return compareAsc(dateA, dateB);
  });
}

// Health calculation
type Health = 'on_track' | 'at_risk' | 'behind' | 'complete';

function calculateHealth(milestone: Milestone): Health {
  if (milestone.status === 'complete') return 'complete';
  if (milestone.status === 'blocked') return 'behind';

  const targetDate = parseDate(milestone.date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const daysUntil = differenceInDays(targetDate, today);

  if (isPast(targetDate) && !isToday(targetDate)) return 'behind';
  if (daysUntil <= 3 && milestone.status === 'not_started') return 'at_risk';
  if (daysUntil <= 7 && milestone.status === 'not_started') return 'at_risk';
  return 'on_track';
}

// Health colors
const healthConfig: Record<Health, { bg: string; text: string; border: string; label: string }> = {
  on_track: { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/30', label: 'On Track' },
  at_risk: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30', label: 'At Risk' },
  behind: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30', label: 'Behind' },
  complete: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30', label: 'Complete' },
};

// Status icons
const statusConfig: Record<Milestone['status'], { icon: typeof Circle; color: string; label: string }> = {
  not_started: { icon: Circle, color: 'text-gray-400', label: 'Not Started' },
  in_progress: { icon: Clock, color: 'text-blue-400', label: 'In Progress' },
  complete: { icon: CheckCircle2, color: 'text-green-400', label: 'Complete' },
  blocked: { icon: AlertTriangle, color: 'text-red-400', label: 'Blocked' },
};

// Question categories config
const categoryConfig: Record<OpenQuestion['category'], { label: string; color: string; bg: string }> = {
  product: { label: 'Product', color: 'text-purple-400', bg: 'bg-purple-500/10' },
  technical: { label: 'Technical', color: 'text-blue-400', bg: 'bg-blue-500/10' },
  business: { label: 'Business', color: 'text-green-400', bg: 'bg-green-500/10' },
  other: { label: 'Other', color: 'text-gray-400', bg: 'bg-gray-500/10' },
};

// Default open questions from meeting notes
// Updated with answers from Dec 29 kickoff meeting with Julian
const defaultQuestions: OpenQuestion[] = [
  {
    id: 'q1',
    question: 'Do we want to allow members to choose the table they book?',
    context: 'Does this differ between Brunch/Dinner/Bottle Service?',
    status: 'answered',
    answer: 'NO - Members cannot choose specific tables. Park staff assigns tables.',
    answered_date: '2024-12-29',
    category: 'product'
  },
  {
    id: 'q2',
    question: 'What are the finalized membership tier names, prices, and perks?',
    context: 'Need tier definitions to build the membership purchase flow and pricing UI.',
    status: 'answered',
    answer: 'V1: ONE TIER ONLY - Basic ($100/month). Perks: 3 complimentary drinks, $35 brunch, no line. Add-ons available (e.g. $25/mo for coffee). Higher tiers will unlock partner restaurants in future.',
    answered_date: '2024-12-29',
    category: 'product'
  },
  {
    id: 'q3',
    question: 'Can members purchase/upgrade to a higher tier mid-cycle?',
    status: 'answered',
    answer: 'Upgrades require CALLING IN (not self-service in app). Concierge handles tier changes.',
    answered_date: '2024-12-29',
    category: 'product'
  },
  {
    id: 'q4',
    question: 'Are guests allowed to download and use the app?',
    context: 'Or is it members-only? Affects onboarding flow design.',
    status: 'answered',
    answer: 'MEMBERS ONLY. Guests cannot use the app. No "Create Account" flow - sign in only. Membership application happens EXTERNALLY (website/form). App may have "Interested in joining?" link to external form.',
    answered_date: '2024-12-29',
    category: 'product'
  },
  {
    id: 'q5',
    question: 'How do guest invite codes work?',
    context: 'QR code vs shareable link vs manual code entry?',
    status: 'answered',
    answer: 'Member enters guest PHONE NUMBER in app → SMS sent automatically → Guest clicks link → fills out their info (name, number, DOB) → confirms attendance. Phone number is primary key for tracking repeat guests.',
    answered_date: '2024-12-29',
    category: 'product'
  },
  {
    id: 'q6',
    question: 'How many guests can a member bring per visit?',
    status: 'answered',
    answer: '3 guests for regular bookings (brunch, dinner, events). 8 guests for BOTTLE SERVICE. More than 3 requires calling concierge.',
    answered_date: '2024-12-29',
    category: 'product'
  },
  {
    id: 'q7',
    question: 'What amenities should be listed in the Membership & Rewards section?',
    context: 'e.g., valet, coat check, reserved parking, complimentary drinks, etc.',
    status: 'answered',
    answer: 'Basic tier: 3 complimentary drinks, $35 brunch, no line/priority entry, work days access (TBD when opening). Higher tiers will add partner restaurant perks.',
    answered_date: '2024-12-29',
    category: 'product'
  },
  {
    id: 'q8',
    question: 'What member profile fields should be editable?',
    context: 'Name, birthday, email, phone, photo?',
    status: 'answered',
    answer: 'PHOTO ONLY is self-editable. Name, birthday, phone, email all require CALLING IN to change (prevents fraud).',
    answered_date: '2024-12-29',
    category: 'product'
  },
  {
    id: 'q9',
    question: 'How does the in-venue Payment Tab work?',
    context: 'Is it scanned at bar? Tracking free drinks or actual purchases? (Phase 2 feature)',
    status: 'answered',
    answer: 'Simplified: Show receipts/history only. Free drinks tracked via membership ID (server enters it). Tips for free drinks are REQUIRED ($3/$5/$7). Dinner/brunch = service charge on bill. Bar/party tip flow still TBD.',
    answered_date: '2024-12-29',
    category: 'product'
  },
  {
    id: 'q10',
    question: 'Apple Developer Account - has Marc purchased it?',
    context: '$99/year required for iOS App Store. Also need Android ($25 one-time).',
    status: 'open',
    category: 'business'
  },
  {
    id: 'q11',
    question: 'OpenTable Integration - how do we handle table reservations?',
    context: 'OpenTable has NO public API. Park does 800-1200 tables/weekend with them. Julian talking to Renee about options.',
    status: 'open',
    category: 'technical'
  },
  {
    id: 'q12',
    question: 'Does bottle service go through OpenTable or is it separate?',
    context: 'Bottle service reservations may already be managed outside OpenTable.',
    status: 'answered',
    answer: 'SEPARATE - Bottle service does NOT go through OpenTable. Park manages it directly. Prepaid through app, up to 8 guests.',
    answered_date: '2024-12-29',
    category: 'product'
  },
  {
    id: 'q13',
    question: 'Real-time table availability - how do we prevent double bookings?',
    context: 'If we manage member reservations separately from OpenTable, we need a strategy.',
    status: 'open',
    category: 'technical'
  },
  {
    id: 'q14',
    question: 'Member check-in method at door?',
    context: 'Originally assumed QR codes.',
    status: 'answered',
    answer: 'NFC TAP (like Soho House), NOT QR codes. Apple Wallet pass with NFC. Member photo shows on staff iPad when tapped. More secure - cannot screenshot/share.',
    answered_date: '2024-12-29',
    category: 'technical'
  },
  {
    id: 'q15',
    question: 'Age verification - what method should we implement?',
    context: 'Compliance requirement for 21+ venue.',
    status: 'answered',
    answer: 'Age verification happens ONCE at membership signup (external form with ID upload). NO in-app verification. Members are already 21+ by virtue of being approved. Guests get ID checked at door.',
    answered_date: '2024-12-29',
    category: 'technical'
  },
  {
    id: 'q16',
    question: 'Who manages the admin portal?',
    context: 'Staff will need to: create/edit events, manage reservations, view member lists.',
    status: 'open',
    category: 'business'
  },
  {
    id: 'q17',
    question: 'Push notification strategy - what triggers notifications?',
    context: 'Potential triggers: new events, reservation reminders, membership renewal.',
    status: 'open',
    category: 'product'
  },
  {
    id: 'q18',
    question: 'Event creation workflow - who creates events and how?',
    context: 'Are events created by Park staff in admin portal?',
    status: 'open',
    category: 'product'
  },
  {
    id: 'q19',
    question: 'What payment platform does Park currently use?',
    context: 'Need to integrate with existing system or decide on Stripe. Affects membership billing and in-venue payments.',
    status: 'open',
    category: 'technical'
  },
  {
    id: 'q20',
    question: 'What is the no-show penalty fee amount?',
    context: 'Members who RSVP but dont show up get charged. After 3-5 no-shows, fee is charged to card. Amount TBD.',
    status: 'open',
    category: 'business'
  },
  {
    id: 'q21',
    question: 'RSVP cancellation and waitlist policy?',
    context: 'Up to 5 cancellations allowed within 48hrs of event. Waitlist auto-promotes when spots open. Need exact rules.',
    status: 'open',
    category: 'product'
  },
  {
    id: 'q22',
    question: 'All events are FREE for members - confirmed?',
    context: 'Julian confirmed no paid events in app. Members always allowed in. Still need RSVP for capacity tracking.',
    status: 'answered',
    answer: 'YES - All events are FREE for members. No ticket purchases. Members just RSVP (for capacity). If RSVP is full, waitlist.',
    answered_date: '2024-12-29',
    category: 'product'
  },
  {
    id: 'q23',
    question: 'Who controls "Who\'s Going" visibility on events?',
    context: 'Originally thought members could toggle their visibility.',
    status: 'answered',
    answer: 'ADMIN controls visibility per event (not member toggle). If admin enables it, members who RSVPd can see other attendees.',
    answered_date: '2024-12-29',
    category: 'product'
  },
];

// Default milestones for Park at 14th
// Timeline: Dec 29, 2025 -> Mar 15, 2026
const defaultMilestones: Milestone[] = [
  {
    id: '1',
    name: 'Design Sign-off',
    date: '2025-12-29',
    status: 'in_progress',
    owner: 'Stakeholders',
    notes: `GOAL: Get stakeholder approval on Lovable prototype and answer open questions.

DELIVERABLES:
• Live demo walkthrough of all key flows
• Design sign-off from Marc and stakeholders
• Answers to blocking product questions (membership tiers, guest policy, table selection)
• Decision on OpenTable integration approach

BLOCKERS TO RESOLVE:
• Membership tier names, prices, and perks
• Guest access policy (app access, invite method, limits)
• OpenTable workaround decision
• Amenities list for membership screen`
  },
  {
    id: '2',
    name: 'Apple Dev Account',
    date: '2026-01-02',
    status: 'not_started',
    owner: 'Marc',
    notes: `GOAL: Purchase Apple Developer Program membership to enable iOS development.

ACTIONS REQUIRED:
• Marc purchases Apple Developer account ($99/year)
• Enroll with company credentials (Park at 14th LLC or similar)
• Accept Apple Developer Program License Agreement
• Set up App Store Connect access

WHY IT MATTERS:
• Required for iOS app distribution
• Needed to create APNs push notification certificates
• Required for Apple Wallet pass signing certificates
• Blocks TestFlight beta testing until complete`
  },
  {
    id: '3',
    name: 'Technical De-Risk',
    date: '2026-01-10',
    status: 'not_started',
    owner: 'NexArk',
    notes: `GOAL: Confirm all third-party integrations work before building features on top of them.

STRIPE PAYMENTS:
• Create Stripe account in test mode
• Configure subscription billing for membership tiers
• Set up webhook endpoints for payment events
• Test payment flow end-to-end

APPLE/GOOGLE WALLET:
• Decide: third-party service (PassKit) vs direct integration
• Set up pass signing certificates (requires Apple Dev Account)
• Create sample membership pass
• Test "Add to Wallet" flow

AGE VERIFICATION:
• Confirm approach (physical at door vs digital)
• If digital: evaluate Stripe Identity or alternatives
• Set up verification flow in test mode

PUSH NOTIFICATIONS:
• Create Firebase project
• Configure FCM for Android
• Set up APNs for iOS (requires Apple Dev Account)
• Test notification delivery`
  },
  {
    id: '4',
    name: 'Auth Complete',
    date: '2026-01-17',
    status: 'not_started',
    owner: 'RDG',
    notes: `GOAL: Users can create accounts, sign in, and manage their profiles.

MOBILE (RDG):
• Email/password sign up and sign in screens
• Apple Sign-In integration
• Google Sign-In integration
• Password reset flow
• Profile creation (name, phone, birthday, photo)
• Profile edit screen
• Session persistence and token refresh

BACKEND (NexArk):
• Supabase Auth configuration
• OAuth provider setup (Apple, Google)
• Profile table and RLS policies
• Email templates (welcome, password reset)
• Auth triggers (create profile on signup)

ACCEPTANCE CRITERIA:
• New user can sign up with email or social auth
• Existing user can sign in and see their profile
• User can reset forgotten password
• Profile persists across app restarts`
  },
  {
    id: '5',
    name: 'Core Features',
    date: '2026-01-31',
    status: 'not_started',
    owner: 'RDG + NexArk',
    notes: `GOAL: All primary user flows functional (even if not polished).

EVENTS & RSVP:
• Event listing screen with upcoming events
• Event detail view with ticket types
• RSVP flow for free events (instant confirmation)
• RSVP flow for paid events (Stripe checkout)
• My RSVPs list with QR codes
• Cancel RSVP functionality

TABLE RESERVATIONS:
• Availability calendar view
• Table type selection (based on OpenTable decision)
• Reservation hold + payment flow
• My Reservations list with QR codes
• Cancel reservation with refund handling

MEMBERSHIP:
• Membership tier comparison screen
• Purchase membership (Stripe subscription)
• Membership status in profile
• Add to Apple/Google Wallet button
• Cancel/manage subscription

PAYMENTS:
• Add payment method (Stripe Elements)
• Saved cards list
• Default payment method selection
• Payment history

QR CODES:
• Generate QR for RSVP check-in
• Generate QR for reservation check-in
• Generate QR for membership verification`
  },
  {
    id: '6',
    name: 'Feature Complete',
    date: '2026-02-15',
    status: 'not_started',
    owner: 'RDG + NexArk',
    notes: `GOAL: All features built, polished, and ready for user testing.

REMAINING FEATURES:
• Push notifications (event reminders, reservation confirmations)
• Guest invite flow (if applicable based on policy decision)
• Home screen with personalized content
• Event history / past attendance
• Payment receipts and history
• Settings and preferences
• Help / FAQ / Contact support

POLISH & QUALITY:
• Loading states and skeleton screens
• Error handling and retry logic
• Offline mode handling
• Animation and transitions
• Accessibility review (VoiceOver, TalkBack)
• Dark mode support (if required)

BACKEND COMPLETION:
• Admin dashboard MVP (events, reservations, members)
• Webhook reliability (idempotency, retries)
• Monitoring and logging
• Rate limiting and abuse prevention

TESTING:
• Unit tests for critical business logic
• Integration tests for API endpoints
• End-to-end test suite for key flows
• Performance testing (load times, API response times)`
  },
  {
    id: '7',
    name: 'UAT Complete',
    date: '2026-03-07',
    status: 'not_started',
    owner: 'Stakeholders',
    notes: `GOAL: Real members test the app and provide feedback before public launch.

BETA TESTING (Feb 15 - Mar 1):
• Deploy to TestFlight (iOS) and Internal Testing (Android)
• Recruit 10-20 beta testers (staff, VIP members)
• Provide feedback mechanism (in-app form, Slack channel)
• Monitor crash reports and analytics
• Daily bug triage and fixes

FEEDBACK INCORPORATION (Mar 1 - Mar 7):
• Prioritize and fix critical bugs
• Address major UX feedback
• Performance optimization
• Final design polish

APP STORE PREPARATION:
• App Store screenshots (all device sizes)
• App Store description and keywords
• Privacy policy URL
• Terms of service URL
• Demo account for Apple reviewer
• Age rating questionnaire
• In-app purchase configuration

SUBMISSION (Target: Mar 1, Buffer until Mar 7):
• Submit to Apple App Store (review: 1-7 days)
• Submit to Google Play Store (review: 3-7 days)
• Address any rejection feedback
• Expedited review request if needed`
  },
  {
    id: '8',
    name: 'Launch',
    date: '2026-03-15',
    status: 'not_started',
    owner: 'All',
    notes: `GOAL: Public release on App Store and Google Play.

PRE-LAUNCH (Mar 10-14):
• Apps approved and ready in stores
• Production environment verified
• Monitoring dashboards set up
• Support team briefed
• Launch communications prepared

LAUNCH DAY (Mar 15):
• Release apps to public
• Announce via email, social media, in-venue signage
• Monitor for issues (crashes, payment failures, bugs)
• On-call team ready for immediate fixes

POST-LAUNCH (Mar 15-22):
• Daily monitoring of reviews and ratings
• Rapid response to critical issues
• Collect user feedback
• Plan v1.1 improvements

SUCCESS METRICS:
• App Store rating ≥ 4.0 stars
• <1% crash rate
• <5% payment failure rate
• X signups in first week (TBD)
• X memberships purchased (TBD)`
  },
];

export default function TimelinePage() {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [questions, setQuestions] = useState<OpenQuestion[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showAddQuestionForm, setShowAddQuestionForm] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [questionFilter, setQuestionFilter] = useState<'all' | 'open' | 'answered'>('all');

  // Load from database on mount
  useEffect(() => {
    async function loadData() {
      try {
        const [milestonesData, questionsData] = await Promise.all([
          milestonesApi.getAll(),
          questionsApi.getAll()
        ]);

        // If no data in DB, seed with defaults
        if (milestonesData.length === 0) {
          for (const milestone of defaultMilestones) {
            await milestonesApi.create(milestone);
          }
          setMilestones(defaultMilestones);
        } else {
          setMilestones(milestonesData);
        }

        if (questionsData.length === 0) {
          for (const question of defaultQuestions) {
            await questionsApi.create(question);
          }
          setQuestions(defaultQuestions);
        } else {
          setQuestions(questionsData);
        }
      } catch (error) {
        console.error('Failed to load timeline data:', error);
        // Fallback to defaults on error
        setMilestones(defaultMilestones);
        setQuestions(defaultQuestions);
      } finally {
        setIsLoaded(true);
      }
    }
    loadData();
  }, []);

  // Update milestone
  const updateMilestone = async (id: string, updates: Partial<Milestone>) => {
    try {
      await milestonesApi.update(id, updates);
      setMilestones(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
    } catch (error) {
      console.error('Failed to update milestone:', error);
    }
  };

  // Delete milestone
  const deleteMilestone = async (id: string) => {
    if (confirm('Delete this milestone?')) {
      try {
        await milestonesApi.delete(id);
        setMilestones(prev => prev.filter(m => m.id !== id));
      } catch (error) {
        console.error('Failed to delete milestone:', error);
      }
    }
  };

  // Add milestone
  const addMilestone = async (milestone: Omit<Milestone, 'id'>) => {
    try {
      const newMilestone = await milestonesApi.create(milestone);
      setMilestones(prev => sortByDate([...prev, newMilestone]));
      setShowAddForm(false);
    } catch (error) {
      console.error('Failed to add milestone:', error);
    }
  };

  // Reset to defaults
  const resetToDefaults = async () => {
    if (confirm('Reset all milestones and questions to defaults? This will overwrite your changes.')) {
      try {
        // Delete all existing milestones and questions
        await Promise.all([
          ...milestones.map(m => milestonesApi.delete(m.id)),
          ...questions.map(q => questionsApi.delete(q.id))
        ]);

        // Re-seed with defaults
        await Promise.all([
          ...defaultMilestones.map(m => milestonesApi.create(m)),
          ...defaultQuestions.map(q => questionsApi.create(q))
        ]);

        setMilestones(defaultMilestones);
        setQuestions(defaultQuestions);
      } catch (error) {
        console.error('Failed to reset to defaults:', error);
      }
    }
  };

  // Question management
  const updateQuestion = async (id: string, updates: Partial<OpenQuestion>) => {
    try {
      await questionsApi.update(id, updates);
      setQuestions(prev => prev.map(q => q.id === id ? { ...q, ...updates } : q));
    } catch (error) {
      console.error('Failed to update question:', error);
    }
  };

  const deleteQuestion = async (id: string) => {
    if (confirm('Delete this question?')) {
      try {
        await questionsApi.delete(id);
        setQuestions(prev => prev.filter(q => q.id !== id));
      } catch (error) {
        console.error('Failed to delete question:', error);
      }
    }
  };

  const addQuestion = async (question: Omit<OpenQuestion, 'id'>) => {
    try {
      const newQuestion = await questionsApi.create(question);
      setQuestions(prev => [...prev, newQuestion]);
      setShowAddQuestionForm(false);
    } catch (error) {
      console.error('Failed to add question:', error);
    }
  };

  const markAnswered = async (id: string, answer: string) => {
    await updateQuestion(id, {
      status: 'answered',
      answer,
      answered_date: format(new Date(), 'yyyy-MM-dd'),
    });
  };

  // Filter questions
  const filteredQuestions = questions.filter(q => {
    if (questionFilter === 'open') return q.status === 'open';
    if (questionFilter === 'answered') return q.status === 'answered';
    return true;
  });

  const openCount = questions.filter(q => q.status === 'open').length;
  const answeredCount = questions.filter(q => q.status === 'answered').length;

  // Calculate overall project health
  const overallHealth = (): Health => {
    const incomplete = milestones.filter(m => m.status !== 'complete');
    if (incomplete.length === 0) return 'complete';

    const healths = incomplete.map(calculateHealth);
    if (healths.some(h => h === 'behind')) return 'behind';
    if (healths.some(h => h === 'at_risk')) return 'at_risk';
    return 'on_track';
  };

  // Progress stats
  const completedCount = milestones.filter(m => m.status === 'complete').length;
  const progressPercent = milestones.length > 0 ? Math.round((completedCount / milestones.length) * 100) : 0;

  // Sort milestones by date (properly using date comparison)
  const sortedMilestones = sortByDate(milestones);

  // Find next upcoming milestone
  const nextMilestone = sortedMilestones.find(m => {
    if (m.status === 'complete') return false;
    const targetDate = parseDate(m.date);
    return !isPast(targetDate) || isToday(targetDate);
  });

  const projectHealth = overallHealth();
  const projectHealthConfig = healthConfig[projectHealth];

  // Don't render until loaded to avoid hydration issues
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gray-950 text-white p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Target className="w-8 h-8 text-amber-400" />
              <div>
                <h1 className="text-2xl font-bold">Park at 14th</h1>
                <p className="text-gray-400">Membership App Timeline</p>
              </div>
            </div>
            <div className={`px-4 py-2 rounded-lg border ${projectHealthConfig.bg} ${projectHealthConfig.border}`}>
              <span className={`font-medium ${projectHealthConfig.text}`}>
                Project: {projectHealthConfig.label}
              </span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mb-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-gray-400">{completedCount} of {milestones.length} milestones complete</span>
              <span className="text-white font-medium">{progressPercent}%</span>
            </div>
            <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Key dates */}
          <div className="flex gap-6 text-sm flex-wrap">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span className="text-gray-400">Testing:</span>
              <span className="text-white font-medium">Feb 15, 2026</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span className="text-gray-400">Launch:</span>
              <span className="text-white font-medium">Mar 15, 2026</span>
            </div>
            {nextMilestone && (
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                <span className="text-gray-400">Next:</span>
                <span className="text-amber-400 font-medium">{nextMilestone.name}</span>
              </div>
            )}
          </div>
        </div>

        {/* Visual Timeline */}
        <div className="mb-8 overflow-x-auto pb-4">
          <div className="relative min-w-[800px]">
            {/* Timeline line */}
            <div className="absolute top-4 left-0 right-0 h-1 bg-gray-800 rounded-full" />

            {/* Milestone dots */}
            <div className="relative flex justify-between">
              {sortedMilestones.map((milestone) => {
                const health = calculateHealth(milestone);

                return (
                  <div key={milestone.id} className="flex flex-col items-center" style={{ flex: 1 }}>
                    <div
                      className={`w-4 h-4 rounded-full border-4 border-gray-950 z-10 cursor-pointer transition-transform hover:scale-125 ${
                        milestone.status === 'complete' ? 'bg-green-500' :
                        health === 'behind' ? 'bg-red-500' :
                        health === 'at_risk' ? 'bg-amber-500' :
                        'bg-gray-600'
                      }`}
                      onClick={() => setExpandedId(expandedId === milestone.id ? null : milestone.id)}
                    />
                    <div className="mt-2 text-center px-1">
                      <div className="text-xs text-gray-500">
                        {format(parseDate(milestone.date), 'MMM d')}
                      </div>
                      <div className="text-xs text-gray-400 max-w-[90px] leading-tight break-words">
                        {milestone.name}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Milestones List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Milestones</h2>
            <div className="flex gap-2">
              <button
                onClick={resetToDefaults}
                className="px-3 py-1.5 text-sm text-gray-400 hover:text-white transition-colors"
              >
                Reset
              </button>
              <button
                onClick={() => setShowAddForm(true)}
                className="px-3 py-1.5 text-sm bg-amber-600 hover:bg-amber-500 rounded-lg flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>
          </div>

          {sortedMilestones.map((milestone) => {
            const health = calculateHealth(milestone);
            const healthCfg = healthConfig[health];
            const statusCfg = statusConfig[milestone.status];
            const StatusIcon = statusCfg.icon;
            const isExpanded = expandedId === milestone.id;
            const isEditing = editingId === milestone.id;

            const targetDate = parseDate(milestone.date);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const daysUntil = differenceInDays(targetDate, today);

            return (
              <div
                key={milestone.id}
                className={`rounded-lg border transition-all ${healthCfg.bg} ${healthCfg.border}`}
              >
                {/* Main row */}
                <div
                  className="flex items-center gap-4 p-4 cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : milestone.id)}
                >
                  <GripVertical className="w-4 h-4 text-gray-600 opacity-0 group-hover:opacity-100" />

                  {/* Status icon */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const statuses: Milestone['status'][] = ['not_started', 'in_progress', 'complete', 'blocked'];
                      const currentIdx = statuses.indexOf(milestone.status);
                      const nextStatus = statuses[(currentIdx + 1) % statuses.length];
                      updateMilestone(milestone.id, { status: nextStatus });
                    }}
                    className="p-1 rounded hover:bg-white/10 transition-colors"
                    title="Click to change status"
                  >
                    <StatusIcon className={`w-5 h-5 ${statusCfg.color}`} />
                  </button>

                  {/* Name and date */}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-white">{milestone.name}</div>
                    <div className="text-sm text-gray-400">
                      {format(targetDate, 'MMM d, yyyy')} • {milestone.owner}
                    </div>
                  </div>

                  {/* Health badge */}
                  <div className={`px-3 py-1 rounded-full text-xs font-medium ${healthCfg.bg} ${healthCfg.text} border ${healthCfg.border}`}>
                    {milestone.status === 'complete' ? 'Done' :
                     daysUntil < 0 ? `${Math.abs(daysUntil)}d overdue` :
                     daysUntil === 0 ? 'Today' :
                     `${daysUntil}d left`}
                  </div>

                  {/* Expand icon */}
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </div>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-gray-800/50">
                    <div className="pt-4 space-y-3">
                      {/* Notes */}
                      {isEditing ? (
                        <div className="space-y-3">
                          <input
                            type="text"
                            value={milestone.name}
                            onChange={(e) => updateMilestone(milestone.id, { name: e.target.value })}
                            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                            placeholder="Milestone name"
                          />
                          <input
                            type="date"
                            value={milestone.date}
                            onChange={(e) => updateMilestone(milestone.id, { date: e.target.value })}
                            className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                          />
                          <input
                            type="text"
                            value={milestone.owner}
                            onChange={(e) => updateMilestone(milestone.id, { owner: e.target.value })}
                            className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                            placeholder="Owner"
                          />
                          <textarea
                            value={milestone.notes || ''}
                            onChange={(e) => updateMilestone(milestone.id, { notes: e.target.value })}
                            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white resize-none"
                            rows={2}
                            placeholder="Notes"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => setEditingId(null)}
                              className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 rounded-lg"
                            >
                              Done
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {milestone.notes && (
                            <p className="text-sm text-gray-400">{milestone.notes}</p>
                          )}

                          {/* Status selector */}
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500">Status:</span>
                            <div className="flex gap-1">
                              {(['not_started', 'in_progress', 'complete', 'blocked'] as const).map((status) => {
                                const cfg = statusConfig[status];
                                const Icon = cfg.icon;
                                return (
                                  <button
                                    key={status}
                                    onClick={() => updateMilestone(milestone.id, { status })}
                                    className={`px-2 py-1 rounded text-xs flex items-center gap-1 transition-colors ${
                                      milestone.status === status
                                        ? 'bg-gray-700 text-white'
                                        : 'text-gray-500 hover:text-gray-300'
                                    }`}
                                  >
                                    <Icon className={`w-3 h-3 ${cfg.color}`} />
                                    {cfg.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex gap-2 pt-2">
                            <button
                              onClick={() => setEditingId(milestone.id)}
                              className="px-3 py-1.5 text-sm text-gray-400 hover:text-white transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => deleteMilestone(milestone.id)}
                              className="px-3 py-1.5 text-sm text-red-400 hover:text-red-300 transition-colors flex items-center gap-1"
                            >
                              <Trash2 className="w-3 h-3" />
                              Delete
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Add Form Modal */}
        {showAddForm && (
          <AddMilestoneForm
            onAdd={addMilestone}
            onClose={() => setShowAddForm(false)}
          />
        )}

        {/* Open Questions Section */}
        <div className="mt-12 space-y-3">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <MessageCircleQuestion className="w-6 h-6 text-purple-400" />
              <div>
                <h2 className="text-lg font-semibold">Open Questions</h2>
                <p className="text-sm text-gray-500">
                  {openCount} open · {answeredCount} answered
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              {/* Filter buttons */}
              <div className="flex gap-1 mr-2">
                {(['all', 'open', 'answered'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setQuestionFilter(filter)}
                    className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                      questionFilter === filter
                        ? 'bg-gray-700 text-white'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {filter.charAt(0).toUpperCase() + filter.slice(1)}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setShowAddQuestionForm(true)}
                className="px-3 py-1.5 text-sm bg-purple-600 hover:bg-purple-500 rounded-lg flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>
          </div>

          {filteredQuestions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No {questionFilter === 'all' ? '' : questionFilter} questions
            </div>
          ) : (
            filteredQuestions.map((question) => (
              <QuestionCard
                key={question.id}
                question={question}
                isExpanded={expandedQuestionId === question.id}
                onToggle={() => setExpandedQuestionId(expandedQuestionId === question.id ? null : question.id)}
                onUpdate={(updates) => updateQuestion(question.id, updates)}
                onDelete={() => deleteQuestion(question.id)}
                onMarkAnswered={(answer) => markAnswered(question.id, answer)}
              />
            ))
          )}
        </div>

        {/* Add Question Form Modal */}
        {showAddQuestionForm && (
          <AddQuestionForm
            onAdd={addQuestion}
            onClose={() => setShowAddQuestionForm(false)}
          />
        )}

        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-gray-800 text-center text-sm text-gray-500">
          Last updated: {format(new Date(), 'MMM d, yyyy h:mm a')}
        </div>
      </div>
    </div>
  );
}

// Add Milestone Form
function AddMilestoneForm({
  onAdd,
  onClose,
}: {
  onAdd: (milestone: Omit<Milestone, 'id'>) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [owner, setOwner] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !date) return;
    onAdd({
      name,
      date,
      owner: owner || 'TBD',
      status: 'not_started',
      notes: notes || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-md shadow-2xl">
        <form onSubmit={handleSubmit}>
          <div className="p-6 border-b border-gray-700">
            <h2 className="text-lg font-semibold text-white">Add Milestone</h2>
          </div>

          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Beta Launch"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Target Date *</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Owner</label>
              <input
                type="text"
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                placeholder="e.g., RDG, NexArk, Stakeholders"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="What needs to be done?"
                rows={2}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 resize-none"
              />
            </div>
          </div>

          <div className="p-6 border-t border-gray-700 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name || !date}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg transition-colors"
            >
              Add Milestone
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Question Card Component
function QuestionCard({
  question,
  isExpanded,
  onToggle,
  onUpdate,
  onDelete,
  onMarkAnswered,
}: {
  question: OpenQuestion;
  isExpanded: boolean;
  onToggle: () => void;
  onUpdate: (updates: Partial<OpenQuestion>) => void;
  onDelete: () => void;
  onMarkAnswered: (answer: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [isAnswering, setIsAnswering] = useState(false);
  const [answerText, setAnswerText] = useState(question.answer || '');
  const category = categoryConfig[question.category];

  const statusColors = {
    open: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30' },
    answered: { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/30' },
    deferred: { bg: 'bg-gray-500/10', text: 'text-gray-400', border: 'border-gray-500/30' },
  };
  const status = statusColors[question.status];

  return (
    <div className={`rounded-lg border transition-all ${status.bg} ${status.border}`}>
      {/* Main row */}
      <div
        className="flex items-start gap-4 p-4 cursor-pointer"
        onClick={onToggle}
      >
        {/* Status indicator */}
        <div className="pt-1">
          {question.status === 'answered' ? (
            <CheckCircle2 className="w-5 h-5 text-green-400" />
          ) : (
            <Circle className="w-5 h-5 text-amber-400" />
          )}
        </div>

        {/* Question content */}
        <div className="flex-1 min-w-0">
          <div className="font-medium text-white">{question.question}</div>
          {question.context && (
            <p className="text-sm text-gray-400 mt-1">{question.context}</p>
          )}
          {question.status === 'answered' && question.answer && !isExpanded && (
            <p className="text-sm text-green-400 mt-2 truncate">
              Answer: {question.answer}
            </p>
          )}
        </div>

        {/* Category badge */}
        <span className={`px-2 py-1 rounded text-xs ${category.bg} ${category.color}`}>
          {category.label}
        </span>

        {/* Expand icon */}
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-400" />
        )}
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-gray-800/50">
          <div className="pt-4 space-y-3">
            {question.status === 'answered' && question.answer && (
              <div className="p-3 rounded-lg bg-green-500/5 border border-green-500/20">
                <div className="flex items-center gap-2 text-xs text-green-400 mb-1">
                  <Check className="w-3 h-3" />
                  Answered {question.answered_date && `on ${question.answered_date}`}
                </div>
                <p className="text-sm text-white">{question.answer}</p>
              </div>
            )}

            {isAnswering ? (
              <div className="space-y-3">
                <textarea
                  value={answerText}
                  onChange={(e) => setAnswerText(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white resize-none"
                  rows={3}
                  placeholder="Enter the answer/decision..."
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (answerText.trim()) {
                        onMarkAnswered(answerText.trim());
                        setIsAnswering(false);
                      }
                    }}
                    className="px-3 py-1.5 text-sm bg-green-600 hover:bg-green-500 rounded-lg flex items-center gap-1"
                  >
                    <Check className="w-3 h-3" />
                    Save Answer
                  </button>
                  <button
                    onClick={() => {
                      setIsAnswering(false);
                      setAnswerText(question.answer || '');
                    }}
                    className="px-3 py-1.5 text-sm text-gray-400 hover:text-white"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : isEditing ? (
              <div className="space-y-3">
                <input
                  type="text"
                  value={question.question}
                  onChange={(e) => onUpdate({ question: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                  placeholder="Question"
                />
                <textarea
                  value={question.context || ''}
                  onChange={(e) => onUpdate({ context: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white resize-none"
                  rows={2}
                  placeholder="Context (optional)"
                />
                <select
                  value={question.category}
                  onChange={(e) => onUpdate({ category: e.target.value as OpenQuestion['category'] })}
                  className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                >
                  <option value="product">Product</option>
                  <option value="technical">Technical</option>
                  <option value="business">Business</option>
                  <option value="other">Other</option>
                </select>
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 rounded-lg"
                >
                  Done
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {question.status === 'open' && (
                  <button
                    onClick={() => setIsAnswering(true)}
                    className="px-3 py-1.5 text-sm bg-green-600 hover:bg-green-500 rounded-lg flex items-center gap-1"
                  >
                    <Check className="w-3 h-3" />
                    Answer This
                  </button>
                )}
                {question.status === 'answered' && (
                  <button
                    onClick={() => {
                      setAnswerText(question.answer || '');
                      setIsAnswering(true);
                    }}
                    className="px-3 py-1.5 text-sm text-gray-400 hover:text-white"
                  >
                    Edit Answer
                  </button>
                )}
                {question.status === 'open' && (
                  <button
                    onClick={() => onUpdate({ status: 'deferred' })}
                    className="px-3 py-1.5 text-sm text-gray-400 hover:text-white"
                  >
                    Defer
                  </button>
                )}
                {question.status === 'answered' && (
                  <button
                    onClick={() => onUpdate({ status: 'open', answer: undefined, answered_date: undefined })}
                    className="px-3 py-1.5 text-sm text-amber-400 hover:text-amber-300"
                  >
                    Reopen
                  </button>
                )}
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-3 py-1.5 text-sm text-gray-400 hover:text-white"
                >
                  Edit
                </button>
                <button
                  onClick={onDelete}
                  className="px-3 py-1.5 text-sm text-red-400 hover:text-red-300 flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Add Question Form
function AddQuestionForm({
  onAdd,
  onClose,
}: {
  onAdd: (question: Omit<OpenQuestion, 'id'>) => void;
  onClose: () => void;
}) {
  const [questionText, setQuestionText] = useState('');
  const [context, setContext] = useState('');
  const [category, setCategory] = useState<OpenQuestion['category']>('product');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionText) return;
    onAdd({
      question: questionText,
      context: context || undefined,
      status: 'open',
      category,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-md shadow-2xl">
        <form onSubmit={handleSubmit}>
          <div className="p-6 border-b border-gray-700">
            <h2 className="text-lg font-semibold text-white">Add Question</h2>
          </div>

          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Question *</label>
              <input
                type="text"
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                placeholder="What needs to be decided?"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Context</label>
              <textarea
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder="Additional context or options to consider..."
                rows={2}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as OpenQuestion['category'])}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
              >
                <option value="product">Product</option>
                <option value="technical">Technical</option>
                <option value="business">Business</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div className="p-6 border-t border-gray-700 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!questionText}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg transition-colors"
            >
              Add Question
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
