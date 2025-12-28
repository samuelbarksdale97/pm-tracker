// Reviewer & Improver Service
// Analyzes artifacts (code, designs, decisions, systems) for gaps and improvement opportunities
// Provides directional suggestions and learns from iterations

import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY || '',
});

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type ArtifactType =
    | 'code'
    | 'architecture'
    | 'api_design'
    | 'ui_component'
    | 'directive'
    | 'decision'
    | 'workflow'
    | 'documentation'
    | 'system_design'
    | 'ai_service';

export interface ReviewArtifact {
    type: ArtifactType;
    name: string;
    content: string;
    // Optional context
    purpose?: string;
    constraints?: string[];
    related_artifacts?: string[];
    version?: string;
    // Previous review context (for iterative improvement)
    previous_review_id?: string;
    changes_since_last_review?: string;
}

export interface ReviewContext {
    artifact: ReviewArtifact;
    // What lens to review through
    review_focus?: Array<'correctness' | 'completeness' | 'efficiency' | 'maintainability' | 'usability' | 'innovation' | 'security' | 'scalability'>;
    // Current project phase
    project_phase?: 'exploration' | 'design' | 'implementation' | 'refinement' | 'optimization';
    // User's priorities
    priorities?: {
        speed_vs_quality: 'speed' | 'balanced' | 'quality';
        innovation_vs_stability: 'innovative' | 'balanced' | 'stable';
        scope: 'minimal' | 'standard' | 'comprehensive';
    };
    // Additional context
    additional_context?: string;
}

export interface Issue {
    id: string;
    severity: 'critical' | 'major' | 'minor' | 'suggestion';
    category: string;
    title: string;
    description: string;
    location?: string; // Line number, section, or component
    impact: string;
    // How to fix
    fix_suggestion?: string;
    fix_effort: 'trivial' | 'small' | 'medium' | 'large';
}

export interface Gap {
    id: string;
    area: string;
    description: string;
    severity: 'blocking' | 'significant' | 'moderate' | 'minor';
    what_missing: string;
    why_matters: string;
    suggested_approach?: string;
}

export interface ImprovementDirection {
    id: string;
    direction_name: string;
    description: string;
    // What this direction optimizes for
    optimizes_for: string[];
    // What you trade off
    trade_offs: string[];
    // Concrete steps if chosen
    implementation_steps: string[];
    // Estimated impact
    impact: {
        effort: 'low' | 'medium' | 'high';
        value: 'low' | 'medium' | 'high';
        risk: 'low' | 'medium' | 'high';
    };
    // When this direction makes sense
    best_when: string;
    // When to avoid
    avoid_when: string;
}

export interface Innovation {
    id: string;
    title: string;
    description: string;
    category: 'feature' | 'optimization' | 'pattern' | 'integration' | 'paradigm_shift';
    inspiration: string; // What sparked this idea
    potential_impact: string;
    exploration_steps: string[];
    prerequisites?: string[];
    // Risk assessment
    novelty_level: 'incremental' | 'notable' | 'significant' | 'breakthrough';
}

export interface LearningInsight {
    id: string;
    insight: string;
    applies_to: string[];
    source: string; // What triggered this learning
    action_implications: string[];
    // Should this be added to a directive?
    directive_update_suggested?: {
        directive_path: string;
        suggested_addition: string;
    };
}

export interface ReviewResult {
    // Core review findings
    summary: {
        overall_quality: number; // 1-100
        readiness_level: 'not_ready' | 'needs_work' | 'acceptable' | 'good' | 'excellent';
        key_strengths: string[];
        primary_concerns: string[];
    };

    // Issues found
    issues: Issue[];

    // Gaps identified
    gaps: Gap[];

    // Improvement directions (choose your path)
    improvement_directions: ImprovementDirection[];

    // Innovative ideas discovered
    innovations: Innovation[];

    // Meta-learning from this review
    learnings: LearningInsight[];

    // Action recommendations
    recommended_next_steps: Array<{
        priority: number;
        action: string;
        rationale: string;
        blocks?: string[]; // What this unblocks
    }>;

    // For iterative improvement tracking
    review_metadata: {
        review_id: string;
        artifact_version: string;
        timestamp: string;
        review_depth: 'quick' | 'standard' | 'deep';
        focus_areas: string[];
    };
}

// ============================================================================
// PROMPTS
// ============================================================================

const REVIEWER_IMPROVER_SYSTEM_PROMPT = `You are an expert Reviewer & Improver - a meta-cognitive agent that analyzes artifacts, identifies issues and gaps, and suggests improvement directions.

## YOUR CAPABILITIES

1. **Critical Analysis**
   - Identify bugs, logic errors, edge cases
   - Spot architectural anti-patterns
   - Detect security vulnerabilities
   - Find performance bottlenecks
   - Recognize incomplete implementations

2. **Gap Detection**
   - Missing functionality
   - Unhandled scenarios
   - Incomplete error handling
   - Missing documentation
   - Untested paths

3. **Improvement Direction Generation**
   - Multiple valid paths forward
   - Trade-off analysis for each direction
   - Concrete implementation steps
   - Effort/value/risk assessment

4. **Innovation Discovery**
   - Patterns that could be extracted
   - Novel approaches worth exploring
   - Integration opportunities
   - Paradigm shifts worth considering

5. **Meta-Learning**
   - Insights that apply beyond this artifact
   - Patterns worth remembering
   - Directive updates to capture learnings

## REVIEW PRINCIPLES

1. **Be Constructive, Not Just Critical**
   - Every issue should have a suggested fix
   - Frame problems as opportunities
   - Acknowledge strengths alongside weaknesses

2. **Provide Actionable Feedback**
   - Specific locations, not vague concerns
   - Concrete steps, not abstract advice
   - Prioritized by impact and effort

3. **Think in Directions, Not Solutions**
   - Offer multiple improvement paths
   - Let the user choose based on their priorities
   - Each direction should be self-consistent

4. **Surface Innovation Opportunities**
   - Don't just fix - improve
   - Look for patterns worth extracting
   - Consider what's possible, not just what's needed

5. **Learn and Remember**
   - Extract insights that apply beyond this review
   - Suggest directive updates when patterns emerge
   - Build institutional knowledge

## SEVERITY DEFINITIONS

**Issues:**
- critical: Blocks functionality, security vulnerability, data loss risk
- major: Significant bug or design flaw, but workaround exists
- minor: Small bug or inconsistency, low impact
- suggestion: Enhancement opportunity, not a problem

**Gaps:**
- blocking: Cannot proceed without addressing
- significant: Major functionality missing
- moderate: Notable omission but workable
- minor: Polish item, nice to have

## OUTPUT FORMAT

Return valid JSON matching the ReviewResult interface. Be thorough but practical.`;

const USER_PROMPT_TEMPLATE = `Review the following artifact and provide comprehensive analysis with improvement directions.

## ARTIFACT

**Type:** {artifact_type}
**Name:** {artifact_name}
**Purpose:** {artifact_purpose}

### Content
\`\`\`
{artifact_content}
\`\`\`

{constraints_section}

{related_artifacts_section}

{previous_review_section}

## REVIEW PARAMETERS

**Focus Areas:** {review_focus}
**Project Phase:** {project_phase}
**Priorities:**
- Speed vs Quality: {speed_vs_quality}
- Innovation vs Stability: {innovation_vs_stability}
- Scope: {scope}

{additional_context_section}

## INSTRUCTIONS

1. Analyze the artifact thoroughly
2. Identify all issues (categorized by severity)
3. Detect gaps in completeness
4. Generate 2-4 distinct improvement directions
5. Surface any innovative opportunities
6. Extract learnings that apply beyond this artifact
7. Provide prioritized next steps

Return your analysis as valid JSON matching the ReviewResult schema.`;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function generateReviewId(): string {
    return `REV-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
}

function buildUserPrompt(context: ReviewContext): string {
    const { artifact } = context;

    let prompt = USER_PROMPT_TEMPLATE
        .replace('{artifact_type}', artifact.type)
        .replace('{artifact_name}', artifact.name)
        .replace('{artifact_purpose}', artifact.purpose || 'Not specified')
        .replace('{artifact_content}', artifact.content)
        .replace('{review_focus}', (context.review_focus || ['completeness', 'correctness', 'maintainability']).join(', '))
        .replace('{project_phase}', context.project_phase || 'implementation')
        .replace('{speed_vs_quality}', context.priorities?.speed_vs_quality || 'balanced')
        .replace('{innovation_vs_stability}', context.priorities?.innovation_vs_stability || 'balanced')
        .replace('{scope}', context.priorities?.scope || 'standard');

    // Constraints section
    if (artifact.constraints?.length) {
        prompt = prompt.replace('{constraints_section}',
            `### Constraints\n${artifact.constraints.map(c => `- ${c}`).join('\n')}`);
    } else {
        prompt = prompt.replace('{constraints_section}', '');
    }

    // Related artifacts section
    if (artifact.related_artifacts?.length) {
        prompt = prompt.replace('{related_artifacts_section}',
            `### Related Artifacts\n${artifact.related_artifacts.map(r => `- ${r}`).join('\n')}`);
    } else {
        prompt = prompt.replace('{related_artifacts_section}', '');
    }

    // Previous review section
    if (artifact.previous_review_id && artifact.changes_since_last_review) {
        prompt = prompt.replace('{previous_review_section}',
            `### Iteration Context\n**Previous Review:** ${artifact.previous_review_id}\n**Changes Since:** ${artifact.changes_since_last_review}`);
    } else {
        prompt = prompt.replace('{previous_review_section}', '');
    }

    // Additional context
    if (context.additional_context) {
        prompt = prompt.replace('{additional_context_section}',
            `## Additional Context\n${context.additional_context}`);
    } else {
        prompt = prompt.replace('{additional_context_section}', '');
    }

    return prompt;
}

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Perform a comprehensive review of an artifact
 */
export async function reviewArtifact(context: ReviewContext): Promise<ReviewResult> {
    const reviewId = generateReviewId();

    console.log('[Reviewer] Starting review:', context.artifact.name);
    console.log('[Reviewer] Type:', context.artifact.type);
    console.log('[Reviewer] Focus:', context.review_focus?.join(', ') || 'default');

    try {
        const userPrompt = buildUserPrompt(context);

        const response = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 8192,
            system: REVIEWER_IMPROVER_SYSTEM_PROMPT,
            messages: [
                {
                    role: 'user',
                    content: userPrompt,
                },
            ],
        });

        // Extract text content
        const textContent = response.content
            .filter((block): block is Anthropic.TextBlock => block.type === 'text')
            .map((block) => block.text)
            .join('\n');

        // Parse JSON from response
        const jsonMatch = textContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            try {
                const parsed = JSON.parse(jsonMatch[0]) as ReviewResult;

                // Ensure metadata is set
                parsed.review_metadata = {
                    review_id: reviewId,
                    artifact_version: context.artifact.version || '1.0',
                    timestamp: new Date().toISOString(),
                    review_depth: context.priorities?.scope === 'comprehensive' ? 'deep' :
                                  context.priorities?.scope === 'minimal' ? 'quick' : 'standard',
                    focus_areas: context.review_focus || [],
                };

                console.log('[Reviewer] Complete. Quality:', parsed.summary.overall_quality);
                console.log('[Reviewer] Issues:', parsed.issues.length);
                console.log('[Reviewer] Gaps:', parsed.gaps.length);
                console.log('[Reviewer] Directions:', parsed.improvement_directions.length);

                return parsed;
            } catch (parseError) {
                console.error('[Reviewer] JSON parse error:', parseError);
                throw new Error('Failed to parse review response');
            }
        }

        throw new Error('Review response did not contain valid JSON');

    } catch (error) {
        console.error('[Reviewer] Error:', error);
        return fallbackReview(context, reviewId);
    }
}

/**
 * Quick review focusing only on critical issues
 */
export async function quickReview(
    artifact: ReviewArtifact
): Promise<Pick<ReviewResult, 'summary' | 'issues' | 'recommended_next_steps'>> {
    const context: ReviewContext = {
        artifact,
        review_focus: ['correctness', 'completeness'],
        priorities: {
            speed_vs_quality: 'speed',
            innovation_vs_stability: 'stable',
            scope: 'minimal',
        },
    };

    const result = await reviewArtifact(context);

    return {
        summary: result.summary,
        issues: result.issues.filter(i => i.severity === 'critical' || i.severity === 'major'),
        recommended_next_steps: result.recommended_next_steps.slice(0, 3),
    };
}

/**
 * Deep innovation-focused review
 */
export async function innovationReview(
    artifact: ReviewArtifact,
    explorationContext?: string
): Promise<Pick<ReviewResult, 'summary' | 'innovations' | 'improvement_directions' | 'learnings'>> {
    const context: ReviewContext = {
        artifact,
        review_focus: ['innovation', 'efficiency', 'scalability'],
        project_phase: 'exploration',
        priorities: {
            speed_vs_quality: 'quality',
            innovation_vs_stability: 'innovative',
            scope: 'comprehensive',
        },
        additional_context: explorationContext,
    };

    const result = await reviewArtifact(context);

    return {
        summary: result.summary,
        innovations: result.innovations,
        improvement_directions: result.improvement_directions,
        learnings: result.learnings,
    };
}

/**
 * Compare two versions of an artifact
 */
export async function compareVersions(
    before: ReviewArtifact,
    after: ReviewArtifact,
    changeDescription: string
): Promise<{
    improvement_assessment: string;
    remaining_issues: Issue[];
    new_issues: Issue[];
    directions_still_applicable: ImprovementDirection[];
    learnings: LearningInsight[];
}> {
    // Set up iteration context
    after.previous_review_id = before.version || 'v1';
    after.changes_since_last_review = changeDescription;

    const context: ReviewContext = {
        artifact: after,
        review_focus: ['correctness', 'completeness', 'maintainability'],
        additional_context: `## Previous Version\n\`\`\`\n${before.content}\n\`\`\`\n\n## What Changed\n${changeDescription}`,
    };

    const result = await reviewArtifact(context);

    return {
        improvement_assessment: result.summary.key_strengths.join('; '),
        remaining_issues: result.issues,
        new_issues: result.issues.filter(i => i.category.includes('regression') || i.category.includes('new')),
        directions_still_applicable: result.improvement_directions,
        learnings: result.learnings,
    };
}

// ============================================================================
// FALLBACK
// ============================================================================

function fallbackReview(context: ReviewContext, reviewId: string): ReviewResult {
    console.warn('[Reviewer] Using fallback review');

    return {
        summary: {
            overall_quality: 50,
            readiness_level: 'needs_work',
            key_strengths: ['Unable to perform AI analysis'],
            primary_concerns: ['Review service unavailable - manual review recommended'],
        },
        issues: [{
            id: 'ISSUE-FALLBACK-1',
            severity: 'suggestion',
            category: 'review',
            title: 'AI Review Unavailable',
            description: 'The AI review service was unavailable. Please review manually or retry later.',
            impact: 'No automated issues detected',
            fix_effort: 'trivial',
        }],
        gaps: [],
        improvement_directions: [{
            id: 'DIR-FALLBACK-1',
            direction_name: 'Manual Review',
            description: 'Conduct a manual review of this artifact',
            optimizes_for: ['thoroughness'],
            trade_offs: ['time'],
            implementation_steps: ['Review code/design manually', 'Document findings', 'Prioritize fixes'],
            impact: { effort: 'medium', value: 'high', risk: 'low' },
            best_when: 'AI service unavailable',
            avoid_when: 'Time is extremely limited',
        }],
        innovations: [],
        learnings: [],
        recommended_next_steps: [{
            priority: 1,
            action: 'Retry AI review or conduct manual review',
            rationale: 'Ensure artifact quality before proceeding',
        }],
        review_metadata: {
            review_id: reviewId,
            artifact_version: context.artifact.version || '1.0',
            timestamp: new Date().toISOString(),
            review_depth: 'quick',
            focus_areas: ['fallback'],
        },
    };
}

// ============================================================================
// UTILITY EXPORTS
// ============================================================================

/**
 * Estimate review time based on artifact size and scope
 */
export function estimateReviewTime(contentLength: number, scope: 'minimal' | 'standard' | 'comprehensive'): number {
    const baseTime = Math.ceil(contentLength / 1000) * 2; // 2 seconds per 1000 chars
    const multiplier = scope === 'comprehensive' ? 2 : scope === 'minimal' ? 0.5 : 1;
    return Math.max(10, Math.min(60, baseTime * multiplier));
}

/**
 * Create artifact from file content
 */
export function createArtifactFromFile(
    type: ArtifactType,
    name: string,
    content: string,
    purpose?: string
): ReviewArtifact {
    return {
        type,
        name,
        content,
        purpose,
        version: new Date().toISOString().split('T')[0],
    };
}

/**
 * Create artifact from code
 */
export function createCodeArtifact(
    name: string,
    code: string,
    language: string,
    purpose?: string
): ReviewArtifact {
    return {
        type: 'code',
        name,
        content: `Language: ${language}\n\n${code}`,
        purpose,
        version: new Date().toISOString().split('T')[0],
    };
}
