// Solution Architect Service
// Combines principal architecture thinking with HCI/UX design expertise
// to evaluate and recommend optimal solutions for complex decisions

import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY || '',
});

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface SolutionOption {
    id: string;
    name: string;
    description: string;
    // Optional structured details
    pros?: string[];
    cons?: string[];
    implementation_notes?: string;
}

export interface DecisionContext {
    // What decision needs to be made
    decision_summary: string;
    // The options being evaluated
    options: SolutionOption[];
    // Domain context
    domain: {
        type: 'product_management' | 'software_architecture' | 'ux_design' | 'data_modeling' | 'workflow_design' | 'general';
        description?: string;
    };
    // User/stakeholder context
    user_context?: {
        personas?: string[];
        skill_level?: 'novice' | 'intermediate' | 'expert' | 'mixed';
        primary_goals?: string[];
        pain_points?: string[];
    };
    // Technical context
    technical_context?: {
        existing_system?: string;
        constraints?: string[];
        scale?: 'small' | 'medium' | 'large' | 'enterprise';
        performance_requirements?: string;
    };
    // Business context
    business_context?: {
        urgency?: 'low' | 'medium' | 'high' | 'critical';
        budget_constraint?: 'tight' | 'moderate' | 'flexible';
        long_term_vision?: string;
    };
    // Additional context or constraints
    additional_context?: string;
}

export interface ArchitecturalAssessment {
    scalability: {
        score: number; // 1-10
        rationale: string;
        concerns?: string[];
    };
    maintainability: {
        score: number;
        rationale: string;
        concerns?: string[];
    };
    extensibility: {
        score: number;
        rationale: string;
        concerns?: string[];
    };
    robustness: {
        score: number;
        rationale: string;
        concerns?: string[];
    };
    complexity: {
        score: number; // Lower is better
        rationale: string;
    };
}

export interface HCIAssessment {
    learnability: {
        score: number; // 1-10
        rationale: string;
        improvements?: string[];
    };
    efficiency: {
        score: number;
        rationale: string;
        improvements?: string[];
    };
    error_prevention: {
        score: number;
        rationale: string;
        improvements?: string[];
    };
    cognitive_load: {
        score: number; // Lower is better
        rationale: string;
    };
    delight_factor: {
        score: number;
        rationale: string;
    };
    accessibility: {
        score: number;
        rationale: string;
        considerations?: string[];
    };
}

export interface SolutionEvaluation {
    option_id: string;
    option_name: string;
    // Assessments
    architectural: ArchitecturalAssessment;
    hci: HCIAssessment;
    // Composite scores
    overall_score: number; // 1-100
    fit_for_purpose: number; // 1-10 - how well it solves the specific problem
    // Qualitative analysis
    strengths: string[];
    weaknesses: string[];
    risks: Array<{
        description: string;
        severity: 'low' | 'medium' | 'high';
        mitigation?: string;
    }>;
    // Implementation guidance
    implementation_approach?: string;
    estimated_effort?: 'trivial' | 'small' | 'medium' | 'large' | 'significant';
}

export interface ArchitectureRecommendation {
    // Primary recommendation
    recommended_option_id: string;
    recommended_option_name: string;
    confidence: number; // 0-100
    // Why this option
    recommendation_rationale: string;
    // Key decision factors
    key_factors: Array<{
        factor: string;
        weight: 'critical' | 'important' | 'nice_to_have';
        how_option_addresses: string;
    }>;
    // When to consider alternatives
    alternative_scenarios?: Array<{
        if_condition: string;
        then_consider: string;
        because: string;
    }>;
    // Implementation guidance
    next_steps: string[];
    success_criteria: string[];
    // Warnings or caveats
    caveats?: string[];
}

export interface SolutionArchitectResult {
    // The recommendation
    recommendation: ArchitectureRecommendation;
    // Detailed evaluation of each option
    evaluations: SolutionEvaluation[];
    // Comparative analysis
    comparative_analysis: {
        summary: string;
        trade_off_matrix: Array<{
            dimension: string;
            winner: string;
            margin: 'slight' | 'moderate' | 'significant';
            explanation: string;
        }>;
    };
    // Design principles applied
    principles_applied: Array<{
        principle: string;
        category: 'architecture' | 'hci' | 'ux' | 'engineering';
        how_applied: string;
    }>;
    // Meta information
    analysis_metadata: {
        complexity_of_decision: 'straightforward' | 'moderate' | 'complex' | 'highly_complex';
        confidence_factors: string[];
        areas_of_uncertainty: string[];
    };
}

// ============================================================================
// PROMPTS
// ============================================================================

const SOLUTION_ARCHITECT_SYSTEM_PROMPT = `You are a Principal Solution Architect with deep expertise in:

1. **SOFTWARE ARCHITECTURE**
   - System design patterns (microservices, event-driven, CQRS, etc.)
   - Scalability principles (horizontal/vertical scaling, caching, load balancing)
   - Robustness patterns (circuit breakers, graceful degradation, retry logic)
   - Code maintainability (SOLID principles, clean architecture, DDD)
   - Technical debt management and system evolution

2. **HUMAN-COMPUTER INTERACTION (HCI)**
   - Cognitive psychology principles (mental models, chunking, recognition vs recall)
   - Fitts's Law, Hick's Law, Miller's Law
   - Information architecture and progressive disclosure
   - Error prevention and recovery (Norman's error taxonomy)
   - Feedback loops and system status visibility

3. **USER EXPERIENCE DESIGN**
   - User-centered design methodology
   - Interaction design patterns
   - Accessibility (WCAG guidelines)
   - Emotional design and delight factors
   - Information hierarchy and visual communication

4. **ENGINEERING EXCELLENCE**
   - Right-sizing solutions (avoiding over/under-engineering)
   - Build vs buy decisions
   - API design and contract-first development
   - Testing strategies and quality assurance
   - DevOps and operational considerations

YOUR EVALUATION APPROACH:

When evaluating solutions, you balance multiple perspectives:
- **Pragmatism over Perfection**: The best solution solves the problem at hand, not a theoretical ideal
- **User Empathy**: Technical elegance means nothing if users can't accomplish their goals
- **Future-Proofing vs YAGNI**: Plan for likely evolution, but don't build for hypotheticals
- **Complexity Budget**: Every feature has a complexity cost; spend wisely
- **Failure Modes**: Consider not just happy paths but degraded states and edge cases

SCORING GUIDELINES:

Use these benchmarks for 1-10 scores:
- 1-2: Fundamentally flawed, avoid
- 3-4: Significant issues, use only if no alternatives
- 5-6: Adequate, works but has notable limitations
- 7-8: Good, solid solution with minor trade-offs
- 9-10: Excellent, exemplary approach for this context

OUTPUT FORMAT:

Return a valid JSON object matching the SolutionArchitectResult interface. Be thorough but practical.
Focus on actionable insights rather than generic advice.`;

const USER_PROMPT_TEMPLATE = `Analyze the following decision and provide a comprehensive recommendation.

## DECISION CONTEXT

**Summary**: {decision_summary}

## OPTIONS TO EVALUATE

{options_formatted}

## DOMAIN CONTEXT
Type: {domain_type}
{domain_description}

## USER/STAKEHOLDER CONTEXT
{user_context}

## TECHNICAL CONTEXT
{technical_context}

## BUSINESS CONTEXT
{business_context}

## ADDITIONAL CONTEXT
{additional_context}

---

Please analyze each option thoroughly, considering both architectural/engineering factors and human-computer interaction/UX factors. Provide:

1. **Detailed evaluation** of each option with scores and rationale
2. **Clear recommendation** with confidence level
3. **Comparative analysis** showing trade-offs
4. **Design principles** that informed your analysis
5. **Next steps** if the recommendation is adopted

Return your analysis as valid JSON matching the SolutionArchitectResult schema.`;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatOptions(options: SolutionOption[]): string {
    return options.map((opt, idx) => {
        let formatted = `### Option ${idx + 1}: ${opt.name} (ID: ${opt.id})\n${opt.description}`;
        if (opt.pros?.length) {
            formatted += `\n**Pros:** ${opt.pros.join(', ')}`;
        }
        if (opt.cons?.length) {
            formatted += `\n**Cons:** ${opt.cons.join(', ')}`;
        }
        if (opt.implementation_notes) {
            formatted += `\n**Implementation Notes:** ${opt.implementation_notes}`;
        }
        return formatted;
    }).join('\n\n');
}

function formatUserContext(context?: DecisionContext['user_context']): string {
    if (!context) return 'Not specified';

    const parts: string[] = [];
    if (context.personas?.length) {
        parts.push(`Personas: ${context.personas.join(', ')}`);
    }
    if (context.skill_level) {
        parts.push(`Skill Level: ${context.skill_level}`);
    }
    if (context.primary_goals?.length) {
        parts.push(`Primary Goals: ${context.primary_goals.join(', ')}`);
    }
    if (context.pain_points?.length) {
        parts.push(`Pain Points: ${context.pain_points.join(', ')}`);
    }
    return parts.length > 0 ? parts.join('\n') : 'Not specified';
}

function formatTechnicalContext(context?: DecisionContext['technical_context']): string {
    if (!context) return 'Not specified';

    const parts: string[] = [];
    if (context.existing_system) {
        parts.push(`Existing System: ${context.existing_system}`);
    }
    if (context.constraints?.length) {
        parts.push(`Constraints: ${context.constraints.join(', ')}`);
    }
    if (context.scale) {
        parts.push(`Scale: ${context.scale}`);
    }
    if (context.performance_requirements) {
        parts.push(`Performance Requirements: ${context.performance_requirements}`);
    }
    return parts.length > 0 ? parts.join('\n') : 'Not specified';
}

function formatBusinessContext(context?: DecisionContext['business_context']): string {
    if (!context) return 'Not specified';

    const parts: string[] = [];
    if (context.urgency) {
        parts.push(`Urgency: ${context.urgency}`);
    }
    if (context.budget_constraint) {
        parts.push(`Budget Constraint: ${context.budget_constraint}`);
    }
    if (context.long_term_vision) {
        parts.push(`Long-term Vision: ${context.long_term_vision}`);
    }
    return parts.length > 0 ? parts.join('\n') : 'Not specified';
}

function buildUserPrompt(context: DecisionContext): string {
    return USER_PROMPT_TEMPLATE
        .replace('{decision_summary}', context.decision_summary)
        .replace('{options_formatted}', formatOptions(context.options))
        .replace('{domain_type}', context.domain.type)
        .replace('{domain_description}', context.domain.description || 'Not specified')
        .replace('{user_context}', formatUserContext(context.user_context))
        .replace('{technical_context}', formatTechnicalContext(context.technical_context))
        .replace('{business_context}', formatBusinessContext(context.business_context))
        .replace('{additional_context}', context.additional_context || 'None');
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Analyze a decision with multiple options and provide architectural + HCI recommendations
 */
export async function analyzeSolution(
    context: DecisionContext
): Promise<SolutionArchitectResult> {
    // Validate input
    if (!context.options || context.options.length < 2) {
        throw new Error('At least 2 options are required for comparison');
    }

    console.log('[Solution Architect] Analyzing decision:', context.decision_summary);
    console.log('[Solution Architect] Options:', context.options.map(o => o.name).join(', '));

    try {
        const userPrompt = buildUserPrompt(context);

        const response = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 8192,
            system: SOLUTION_ARCHITECT_SYSTEM_PROMPT,
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
                const parsed = JSON.parse(jsonMatch[0]) as SolutionArchitectResult;
                console.log('[Solution Architect] Analysis complete. Recommended:',
                    parsed.recommendation.recommended_option_name,
                    `(${parsed.recommendation.confidence}% confidence)`);
                return parsed;
            } catch (parseError) {
                console.error('[Solution Architect] JSON parse error:', parseError);
                throw new Error('Failed to parse AI response as JSON');
            }
        }

        console.warn('[Solution Architect] No JSON found in response');
        throw new Error('AI response did not contain valid JSON');

    } catch (error) {
        console.error('[Solution Architect] API error:', error);
        // Return a fallback analysis for resilience
        return fallbackAnalysis(context);
    }
}

/**
 * Quick evaluation for simpler decisions (faster, less detailed)
 */
export async function quickEvaluate(
    decision: string,
    options: Array<{ name: string; description: string }>
): Promise<{
    recommended: string;
    rationale: string;
    confidence: number;
}> {
    const context: DecisionContext = {
        decision_summary: decision,
        options: options.map((o, i) => ({
            id: `option_${i + 1}`,
            name: o.name,
            description: o.description,
        })),
        domain: { type: 'general' },
    };

    const result = await analyzeSolution(context);

    return {
        recommended: result.recommendation.recommended_option_name,
        rationale: result.recommendation.recommendation_rationale,
        confidence: result.recommendation.confidence,
    };
}

// ============================================================================
// FALLBACK ANALYSIS
// ============================================================================

function fallbackAnalysis(context: DecisionContext): SolutionArchitectResult {
    console.warn('[Solution Architect] Using fallback analysis');

    // Simple heuristic-based fallback
    const evaluations: SolutionEvaluation[] = context.options.map(option => ({
        option_id: option.id,
        option_name: option.name,
        architectural: {
            scalability: { score: 5, rationale: 'Unable to assess - AI unavailable' },
            maintainability: { score: 5, rationale: 'Unable to assess - AI unavailable' },
            extensibility: { score: 5, rationale: 'Unable to assess - AI unavailable' },
            robustness: { score: 5, rationale: 'Unable to assess - AI unavailable' },
            complexity: { score: 5, rationale: 'Unable to assess - AI unavailable' },
        },
        hci: {
            learnability: { score: 5, rationale: 'Unable to assess - AI unavailable' },
            efficiency: { score: 5, rationale: 'Unable to assess - AI unavailable' },
            error_prevention: { score: 5, rationale: 'Unable to assess - AI unavailable' },
            cognitive_load: { score: 5, rationale: 'Unable to assess - AI unavailable' },
            delight_factor: { score: 5, rationale: 'Unable to assess - AI unavailable' },
            accessibility: { score: 5, rationale: 'Unable to assess - AI unavailable' },
        },
        overall_score: 50,
        fit_for_purpose: 5,
        strengths: option.pros || ['Unable to determine - manual review recommended'],
        weaknesses: option.cons || ['Unable to determine - manual review recommended'],
        risks: [{ description: 'AI analysis unavailable', severity: 'medium' as const }],
    }));

    // Pick first option as default recommendation in fallback
    const firstOption = context.options[0];

    return {
        recommendation: {
            recommended_option_id: firstOption.id,
            recommended_option_name: firstOption.name,
            confidence: 30, // Low confidence for fallback
            recommendation_rationale: 'AI analysis unavailable. This is a placeholder recommendation - please review options manually.',
            key_factors: [],
            next_steps: ['Review each option manually', 'Consult with team members', 'Consider a proof-of-concept for top candidates'],
            success_criteria: ['Option addresses core requirements', 'Team consensus achieved'],
            caveats: ['This recommendation was generated without AI analysis due to service unavailability'],
        },
        evaluations,
        comparative_analysis: {
            summary: 'AI analysis unavailable - manual comparison recommended',
            trade_off_matrix: [],
        },
        principles_applied: [],
        analysis_metadata: {
            complexity_of_decision: 'moderate',
            confidence_factors: ['Fallback mode - limited analysis'],
            areas_of_uncertainty: ['All assessments are placeholders'],
        },
    };
}

// ============================================================================
// UTILITY EXPORTS
// ============================================================================

/**
 * Estimate analysis time based on number of options
 */
export function estimateAnalysisTime(optionCount: number): number {
    // Base time + additional time per option
    return 10 + (optionCount * 3); // seconds
}

/**
 * Create a standard decision context for UI triage decisions
 */
export function createUITriageContext(
    decision: string,
    options: SolutionOption[],
    userGoals: string[],
    constraints?: string[]
): DecisionContext {
    return {
        decision_summary: decision,
        options,
        domain: {
            type: 'ux_design',
            description: 'User interface design decision for a project management tool',
        },
        user_context: {
            personas: ['Product Manager', 'Engineering Lead', 'Project Coordinator'],
            skill_level: 'intermediate',
            primary_goals: userGoals,
        },
        technical_context: {
            existing_system: 'Next.js + React + Supabase application',
            constraints: constraints || [],
            scale: 'medium',
        },
        business_context: {
            urgency: 'medium',
        },
    };
}
