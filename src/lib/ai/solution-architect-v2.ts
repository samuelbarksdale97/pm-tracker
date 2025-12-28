// Solution Architect v2
// Enhanced with:
// 1. Confidence-Based Progressive Disclosure
// 2. Decision Fingerprinting with Similarity Matching
// 3. Contextual Evaluation Frameworks
//
// Combines principal architecture thinking with HCI/UX design expertise
// to evaluate and recommend optimal solutions for complex decisions

import Anthropic from '@anthropic-ai/sdk';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY || '',
});

// Decision history storage path
const DECISIONS_DIR = process.env.DECISIONS_DIR || path.join(process.cwd(), '..', 'decisions');

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface SolutionOption {
    id: string;
    name: string;
    description: string;
    pros?: string[];
    cons?: string[];
    implementation_notes?: string;
}

export interface DecisionContext {
    decision_summary: string;
    options: SolutionOption[];
    domain: {
        type: 'product_management' | 'software_architecture' | 'ux_design' | 'data_modeling' | 'workflow_design' | 'general';
        description?: string;
    };
    user_context?: {
        personas?: string[];
        skill_level?: 'novice' | 'intermediate' | 'expert' | 'mixed';
        primary_goals?: string[];
        pain_points?: string[];
    };
    technical_context?: {
        existing_system?: string;
        constraints?: string[];
        scale?: 'small' | 'medium' | 'large' | 'enterprise';
        performance_requirements?: string;
    };
    business_context?: {
        urgency?: 'low' | 'medium' | 'high' | 'critical';
        budget_constraint?: 'tight' | 'moderate' | 'flexible';
        long_term_vision?: string;
    };
    additional_context?: string;
}

// ============================================================================
// DECISION FINGERPRINTING
// ============================================================================

export interface DecisionFingerprint {
    // Core characteristics
    domain: string;
    scale: string;
    stakeholder_count: number;
    constraint_count: number;
    option_count: number;

    // Semantic markers
    keywords: string[];
    trade_off_types: string[];

    // Computed signature
    fingerprint_hash: string;

    // For storage
    created_at: string;
}

export interface SimilarDecision {
    decision_id: string;
    fingerprint_hash: string;
    decision_summary: string;
    similarity_score: number;
    chosen_option: string;
    outcome?: 'success' | 'partial' | 'failed' | 'pending';
    lessons_learned?: string[];
    timestamp: string;
}

/**
 * Extract keywords from text for fingerprinting
 */
function extractKeywords(text: string): string[] {
    const stopWords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
        'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
        'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought', 'used',
        'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into',
        'through', 'during', 'before', 'after', 'above', 'below', 'between',
        'and', 'but', 'or', 'nor', 'so', 'yet', 'both', 'either', 'neither',
        'not', 'only', 'own', 'same', 'than', 'too', 'very', 'just', 'how', 'what', 'which', 'who', 'this', 'that', 'these', 'those', 'we', 'they', 'i', 'you', 'it']);

    const words = text.toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 3 && !stopWords.has(w));

    // Count frequency
    const freq: Record<string, number> = {};
    words.forEach(w => { freq[w] = (freq[w] || 0) + 1; });

    // Return top 10 by frequency
    return Object.entries(freq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([word]) => word);
}

/**
 * Identify trade-off types from context
 */
function identifyTradeOffTypes(context: DecisionContext): string[] {
    const types: string[] = [];
    const text = JSON.stringify(context).toLowerCase();

    const tradeOffPatterns = [
        { pattern: /speed|fast|quick|time/i, type: 'speed_vs_quality' },
        { pattern: /scale|growth|expand/i, type: 'scalability' },
        { pattern: /simple|complex|easy/i, type: 'simplicity_vs_power' },
        { pattern: /cost|budget|expensive/i, type: 'cost_vs_capability' },
        { pattern: /user|ux|experience|usab/i, type: 'usability' },
        { pattern: /maintain|evolve|future/i, type: 'maintainability' },
        { pattern: /secur|safe|protect/i, type: 'security' },
        { pattern: /perform|latency|throughput/i, type: 'performance' },
        { pattern: /flexib|adapt|config/i, type: 'flexibility' },
        { pattern: /integrat|compat|connect/i, type: 'integration' },
    ];

    tradeOffPatterns.forEach(({ pattern, type }) => {
        if (pattern.test(text)) {
            types.push(type);
        }
    });

    return types.length > 0 ? types : ['general'];
}

/**
 * Generate a decision fingerprint
 */
export function generateFingerprint(context: DecisionContext): DecisionFingerprint {
    const stakeholderCount = context.user_context?.personas?.length || 0;
    const constraintCount = context.technical_context?.constraints?.length || 0;
    const domainType = context.domain?.type || 'general';
    const domainDescription = context.domain?.description || '';

    const keywords = extractKeywords(
        `${context.decision_summary} ${domainDescription} ${context.additional_context || ''}`
    );

    const tradeOffTypes = identifyTradeOffTypes(context);

    // Create hash from stable characteristics
    const hashInput = [
        domainType,
        context.technical_context?.scale || 'medium',
        stakeholderCount,
        constraintCount,
        context.options.length,
        keywords.slice(0, 5).sort().join(','),
        tradeOffTypes.sort().join(','),
    ].join('|');

    const fingerprint_hash = crypto.createHash('md5').update(hashInput).digest('hex').substring(0, 12);

    return {
        domain: domainType,
        scale: context.technical_context?.scale || 'medium',
        stakeholder_count: stakeholderCount,
        constraint_count: constraintCount,
        option_count: context.options.length,
        keywords,
        trade_off_types: tradeOffTypes,
        fingerprint_hash,
        created_at: new Date().toISOString(),
    };
}

/**
 * Calculate similarity between two fingerprints (0-100)
 */
function calculateSimilarity(fp1: DecisionFingerprint, fp2: DecisionFingerprint): number {
    let score = 0;
    let maxScore = 0;

    // Domain match (weight: 25)
    maxScore += 25;
    if (fp1.domain === fp2.domain) score += 25;

    // Scale match (weight: 15)
    maxScore += 15;
    if (fp1.scale === fp2.scale) score += 15;
    else if (Math.abs(['small', 'medium', 'large', 'enterprise'].indexOf(fp1.scale) -
                      ['small', 'medium', 'large', 'enterprise'].indexOf(fp2.scale)) === 1) score += 8;

    // Option count similarity (weight: 10)
    maxScore += 10;
    const optionDiff = Math.abs(fp1.option_count - fp2.option_count);
    if (optionDiff === 0) score += 10;
    else if (optionDiff <= 2) score += 5;

    // Keyword overlap (weight: 30)
    maxScore += 30;
    const keywordOverlap = fp1.keywords.filter(k => fp2.keywords.includes(k)).length;
    const keywordScore = (keywordOverlap / Math.max(fp1.keywords.length, fp2.keywords.length, 1)) * 30;
    score += keywordScore;

    // Trade-off type overlap (weight: 20)
    maxScore += 20;
    const tradeOffOverlap = fp1.trade_off_types.filter(t => fp2.trade_off_types.includes(t)).length;
    const tradeOffScore = (tradeOffOverlap / Math.max(fp1.trade_off_types.length, fp2.trade_off_types.length, 1)) * 20;
    score += tradeOffScore;

    return Math.round((score / maxScore) * 100);
}

/**
 * Find similar past decisions
 */
export function findSimilarDecisions(fingerprint: DecisionFingerprint, limit: number = 5): SimilarDecision[] {
    try {
        if (!fs.existsSync(DECISIONS_DIR)) {
            return [];
        }

        const files = fs.readdirSync(DECISIONS_DIR).filter(f => f.endsWith('.json'));
        const similarDecisions: SimilarDecision[] = [];

        for (const file of files) {
            try {
                const content = fs.readFileSync(path.join(DECISIONS_DIR, file), 'utf-8');
                const decision = JSON.parse(content);

                if (decision.fingerprint) {
                    const similarity = calculateSimilarity(fingerprint, decision.fingerprint);

                    if (similarity >= 50) { // Only include if 50%+ similar
                        similarDecisions.push({
                            decision_id: file.replace('.json', ''),
                            fingerprint_hash: decision.fingerprint.fingerprint_hash,
                            decision_summary: decision.context?.decision_summary || 'Unknown',
                            similarity_score: similarity,
                            chosen_option: decision.chosen_option || decision.result?.data?.recommendation?.recommended_option_name || 'Unknown',
                            outcome: decision.outcome,
                            lessons_learned: decision.lessons_learned,
                            timestamp: decision.timestamp,
                        });
                    }
                }
            } catch {
                // Skip malformed files
            }
        }

        return similarDecisions
            .sort((a, b) => b.similarity_score - a.similarity_score)
            .slice(0, limit);
    } catch {
        return [];
    }
}

// ============================================================================
// CONTEXTUAL EVALUATION FRAMEWORK
// ============================================================================

export interface EvaluationDimension {
    id: string;
    name: string;
    description: string;
    weight: number; // 1-10
    measurement_criteria: string;
    why_relevant: string;
}

export interface ContextualFramework {
    dimensions: EvaluationDimension[];
    framework_rationale: string;
    context_hash: string;
    generated_at: string;
}

const FRAMEWORK_GENERATION_PROMPT = `You are an expert at designing evaluation frameworks for decisions.

Given a decision context, generate 4-6 SPECIFIC evaluation dimensions that are most relevant to THIS decision.

IMPORTANT:
- Do NOT use generic dimensions like "scalability" or "maintainability" unless they are specifically relevant
- Each dimension should directly relate to the decision at hand
- Dimensions should help differentiate between the options
- Think about what the stakeholders actually care about

OUTPUT FORMAT:
Return valid JSON with this structure:
{
    "dimensions": [
        {
            "id": "dimension_id",
            "name": "Specific Dimension Name",
            "description": "What this measures",
            "weight": 8,
            "measurement_criteria": "How to score options on this (1-10)",
            "why_relevant": "Why this matters for this specific decision"
        }
    ],
    "framework_rationale": "Why these dimensions were chosen for this decision"
}`;

/**
 * Generate a contextual evaluation framework
 */
async function generateContextualFramework(context: DecisionContext): Promise<ContextualFramework> {
    const domainType = context.domain?.type || 'general';
    const domainDescription = context.domain?.description || '';

    const contextSummary = `
Decision: ${context.decision_summary}

Domain: ${domainType}
${domainDescription}

Options:
${context.options.map(o => `- ${o.name}: ${o.description || 'No description'}`).join('\n')}

Stakeholders: ${context.user_context?.personas?.join(', ') || 'Not specified'}
Goals: ${context.user_context?.primary_goals?.join(', ') || 'Not specified'}
Pain Points: ${context.user_context?.pain_points?.join(', ') || 'Not specified'}
Constraints: ${context.technical_context?.constraints?.join(', ') || 'Not specified'}
Scale: ${context.technical_context?.scale || 'Not specified'}
Urgency: ${context.business_context?.urgency || 'Not specified'}
`;

    try {
        const response = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 2048,
            system: FRAMEWORK_GENERATION_PROMPT,
            messages: [
                {
                    role: 'user',
                    content: `Generate a contextual evaluation framework for this decision:\n\n${contextSummary}`,
                },
            ],
        });

        const textContent = response.content
            .filter((block): block is Anthropic.TextBlock => block.type === 'text')
            .map((block) => block.text)
            .join('\n');

        const jsonMatch = textContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return {
                dimensions: parsed.dimensions || [],
                framework_rationale: parsed.framework_rationale || '',
                context_hash: crypto.createHash('md5').update(contextSummary).digest('hex').substring(0, 8),
                generated_at: new Date().toISOString(),
            };
        }
    } catch (error) {
        console.error('[Framework Generation] Error:', error);
    }

    // Fallback to default framework
    return getDefaultFramework(context);
}

/**
 * Default framework when generation fails
 */
function getDefaultFramework(context: DecisionContext): ContextualFramework {
    const dimensions: EvaluationDimension[] = [];

    // Add domain-specific dimensions
    if (context.domain.type === 'ux_design') {
        dimensions.push(
            { id: 'user_efficiency', name: 'User Task Efficiency', description: 'How quickly can users complete their goals', weight: 9, measurement_criteria: 'Time and clicks to complete primary task', why_relevant: 'UX decisions directly impact user productivity' },
            { id: 'cognitive_load', name: 'Cognitive Load', description: 'Mental effort required', weight: 8, measurement_criteria: 'Complexity of mental model required', why_relevant: 'Lower cognitive load improves adoption' },
        );
    } else if (context.domain.type === 'software_architecture') {
        dimensions.push(
            { id: 'implementation_effort', name: 'Implementation Effort', description: 'Development time and complexity', weight: 8, measurement_criteria: 'Estimated development time and risk', why_relevant: 'Architecture choices affect delivery timeline' },
            { id: 'system_evolution', name: 'System Evolution', description: 'How well it supports future changes', weight: 7, measurement_criteria: 'Flexibility to accommodate likely changes', why_relevant: 'Systems need to evolve over time' },
        );
    }

    // Add constraint-based dimensions
    if (context.technical_context?.constraints?.length) {
        dimensions.push({
            id: 'constraint_satisfaction',
            name: 'Constraint Satisfaction',
            description: 'How well the option satisfies stated constraints',
            weight: 9,
            measurement_criteria: 'Number and severity of constraint violations',
            why_relevant: 'Constraints are non-negotiable requirements',
        });
    }

    // Add stakeholder-based dimensions
    if (context.user_context?.primary_goals?.length) {
        dimensions.push({
            id: 'goal_alignment',
            name: 'Goal Alignment',
            description: 'How well the option supports user goals',
            weight: 8,
            measurement_criteria: 'Direct support for stated goals',
            why_relevant: 'Solutions must serve user needs',
        });
    }

    // Ensure at least 4 dimensions
    if (dimensions.length < 4) {
        dimensions.push(
            { id: 'fit_for_purpose', name: 'Fit for Purpose', description: 'How directly it solves the problem', weight: 9, measurement_criteria: 'Alignment with stated requirements', why_relevant: 'Core requirement of any solution' },
            { id: 'risk_level', name: 'Risk Level', description: 'Potential for failure or issues', weight: 7, measurement_criteria: 'Likelihood and impact of problems', why_relevant: 'Risk affects success probability' },
        );
    }

    return {
        dimensions: dimensions.slice(0, 6),
        framework_rationale: 'Generated based on domain and context signals (fallback mode)',
        context_hash: 'default',
        generated_at: new Date().toISOString(),
    };
}

// ============================================================================
// PROGRESSIVE DISCLOSURE
// ============================================================================

export interface QuickScanResult {
    dominant_option?: {
        id: string;
        name: string;
        confidence: number;
        margin_over_second: number;
        quick_rationale: string;
    };
    needs_deep_analysis: boolean;
    analysis_depth_recommended: 'quick' | 'standard' | 'deep';
    quick_signals: string[];
    estimated_complexity: 'straightforward' | 'moderate' | 'complex';
}

const QUICK_SCAN_PROMPT = `You are doing a QUICK initial assessment of a decision. Your goal is to determine if there's an obvious winner or if deep analysis is needed.

TASK: Quickly assess the options and determine:
1. Is there a clearly dominant option? (>85% confidence, >20 point margin)
2. What depth of analysis is needed?

OUTPUT FORMAT (JSON):
{
    "dominant_option": {
        "id": "option_id or null if no clear winner",
        "name": "option name",
        "confidence": 92,
        "margin_over_second": 25,
        "quick_rationale": "One sentence why this is clearly better"
    },
    "needs_deep_analysis": false,
    "analysis_depth_recommended": "quick|standard|deep",
    "quick_signals": ["Signal 1 that informed this assessment", "Signal 2"],
    "estimated_complexity": "straightforward|moderate|complex"
}

Be decisive. If it's obvious, say so. If it's not, recommend deeper analysis.`;

/**
 * Perform quick initial scan to determine analysis depth
 */
async function quickScan(context: DecisionContext): Promise<QuickScanResult> {
    console.log('[Solution Architect] Quick scan starting...');

    const quickContext = `
Decision: ${context.decision_summary}
Domain: ${context.domain?.type || 'general'}
Options:
${context.options.map(o => `- ${o.name}: ${o.description || 'No description'}${o.pros ? ` [Pros: ${o.pros.join(', ')}]` : ''}${o.cons ? ` [Cons: ${o.cons.join(', ')}]` : ''}`).join('\n')}
Scale: ${context.technical_context?.scale || 'medium'}
Urgency: ${context.business_context?.urgency || 'medium'}
`;

    try {
        const response = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1024,
            system: QUICK_SCAN_PROMPT,
            messages: [
                { role: 'user', content: quickContext },
            ],
        });

        const textContent = response.content
            .filter((block): block is Anthropic.TextBlock => block.type === 'text')
            .map((block) => block.text)
            .join('\n');

        const jsonMatch = textContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const result = JSON.parse(jsonMatch[0]) as QuickScanResult;
            console.log('[Solution Architect] Quick scan complete:',
                result.needs_deep_analysis ? 'Deep analysis needed' : `Clear winner: ${result.dominant_option?.name}`);
            return result;
        }
    } catch (error) {
        console.error('[Solution Architect] Quick scan error:', error);
    }

    // Fallback: recommend standard analysis
    return {
        needs_deep_analysis: true,
        analysis_depth_recommended: 'standard',
        quick_signals: ['Quick scan failed - recommending standard analysis'],
        estimated_complexity: 'moderate',
    };
}

// ============================================================================
// ENHANCED RESULT TYPES
// ============================================================================

export interface EnhancedSolutionResult {
    // Progressive disclosure metadata
    analysis_depth: 'quick' | 'standard' | 'deep';
    quick_scan_result?: QuickScanResult;

    // Fingerprinting
    fingerprint: DecisionFingerprint;
    similar_decisions: SimilarDecision[];

    // Contextual framework used
    evaluation_framework: ContextualFramework;

    // Core recommendation
    recommendation: {
        recommended_option_id: string;
        recommended_option_name: string;
        confidence: number;
        recommendation_rationale: string;
        key_factors: Array<{
            factor: string;
            weight: 'critical' | 'important' | 'nice_to_have';
            how_option_addresses: string;
        }>;
        next_steps: string[];
        caveats?: string[];
    };

    // Contextual evaluations (using generated framework)
    contextual_evaluations: Array<{
        option_id: string;
        option_name: string;
        dimension_scores: Array<{
            dimension_id: string;
            dimension_name: string;
            score: number;
            rationale: string;
        }>;
        overall_score: number;
        strengths: string[];
        weaknesses: string[];
    }>;

    // Insights from similar decisions
    historical_insights?: {
        pattern_observed: string;
        success_factors: string[];
        warnings: string[];
    };

    // Meta
    analysis_metadata: {
        total_time_ms: number;
        phases_completed: string[];
        model_used: string;
    };
}

// ============================================================================
// MAIN ENHANCED ANALYSIS FUNCTION
// ============================================================================

const DEEP_ANALYSIS_PROMPT = `You are a Principal Solution Architect analyzing a decision using a CONTEXTUAL evaluation framework.

IMPORTANT: Use ONLY the provided evaluation dimensions. Do NOT add generic dimensions.

For each option, score it on EACH provided dimension (1-10) with specific rationale.

OUTPUT FORMAT (JSON):
{
    "recommendation": {
        "recommended_option_id": "id",
        "recommended_option_name": "name",
        "confidence": 85,
        "recommendation_rationale": "Clear explanation",
        "key_factors": [
            {"factor": "Specific factor", "weight": "critical|important|nice_to_have", "how_option_addresses": "How"}
        ],
        "next_steps": ["Step 1", "Step 2"],
        "caveats": ["Any warnings"]
    },
    "contextual_evaluations": [
        {
            "option_id": "id",
            "option_name": "name",
            "dimension_scores": [
                {"dimension_id": "dim_id", "dimension_name": "Dimension Name", "score": 8, "rationale": "Why this score"}
            ],
            "overall_score": 75,
            "strengths": ["Strength 1"],
            "weaknesses": ["Weakness 1"]
        }
    ]
}`;

/**
 * Enhanced solution analysis with all three features
 */
export async function analyzeWithEnhancements(
    context: DecisionContext,
    options?: {
        skip_fingerprinting?: boolean;
        skip_similar_search?: boolean;
        force_deep_analysis?: boolean;
    }
): Promise<EnhancedSolutionResult> {
    const startTime = Date.now();
    const phases: string[] = [];

    console.log('[Solution Architect v2] Starting enhanced analysis');
    console.log('[Solution Architect v2] Decision:', context.decision_summary);

    // Phase 1: Generate fingerprint
    const fingerprint = generateFingerprint(context);
    phases.push('fingerprinting');
    console.log('[Solution Architect v2] Fingerprint:', fingerprint.fingerprint_hash);

    // Phase 2: Find similar decisions
    let similarDecisions: SimilarDecision[] = [];
    if (!options?.skip_similar_search) {
        similarDecisions = findSimilarDecisions(fingerprint);
        phases.push('similarity_search');
        console.log('[Solution Architect v2] Similar decisions found:', similarDecisions.length);
    }

    // Phase 3: Quick scan for progressive disclosure
    let quickScanResult: QuickScanResult | undefined;
    let analysisDepth: 'quick' | 'standard' | 'deep' = 'standard';

    if (!options?.force_deep_analysis) {
        quickScanResult = await quickScan(context);
        phases.push('quick_scan');

        if (!quickScanResult.needs_deep_analysis && quickScanResult.dominant_option) {
            analysisDepth = 'quick';
            console.log('[Solution Architect v2] Quick result - clear winner identified');

            // Return quick result
            const quickFramework = getDefaultFramework(context);

            return {
                analysis_depth: 'quick',
                quick_scan_result: quickScanResult,
                fingerprint,
                similar_decisions: similarDecisions,
                evaluation_framework: quickFramework,
                recommendation: {
                    recommended_option_id: quickScanResult.dominant_option.id,
                    recommended_option_name: quickScanResult.dominant_option.name,
                    confidence: quickScanResult.dominant_option.confidence,
                    recommendation_rationale: quickScanResult.dominant_option.quick_rationale,
                    key_factors: [{
                        factor: 'Clear dominant option',
                        weight: 'critical',
                        how_option_addresses: quickScanResult.dominant_option.quick_rationale,
                    }],
                    next_steps: ['Proceed with implementation', 'No further analysis needed'],
                },
                contextual_evaluations: [],
                analysis_metadata: {
                    total_time_ms: Date.now() - startTime,
                    phases_completed: phases,
                    model_used: 'claude-sonnet-4-20250514',
                },
            };
        }

        analysisDepth = quickScanResult.analysis_depth_recommended;
    } else {
        analysisDepth = 'deep';
    }

    // Phase 4: Generate contextual evaluation framework
    console.log('[Solution Architect v2] Generating contextual framework...');
    const evaluationFramework = await generateContextualFramework(context);
    phases.push('framework_generation');
    console.log('[Solution Architect v2] Framework dimensions:', evaluationFramework.dimensions.length);

    // Phase 5: Deep analysis with contextual framework
    console.log('[Solution Architect v2] Running deep analysis...');

    const analysisContext = `
## DECISION
${context.decision_summary}

## OPTIONS
${context.options.map(o => `
### ${o.name} (ID: ${o.id})
${o.description || 'No description provided'}
${o.pros ? `Pros: ${o.pros.join(', ')}` : ''}
${o.cons ? `Cons: ${o.cons.join(', ')}` : ''}
`).join('\n')}

## EVALUATION FRAMEWORK
Use ONLY these dimensions to evaluate each option:

${evaluationFramework.dimensions.map(d => `
### ${d.name} (ID: ${d.id}, Weight: ${d.weight}/10)
${d.description}
Measurement: ${d.measurement_criteria}
Relevance: ${d.why_relevant}
`).join('\n')}

## CONTEXT
Domain: ${context.domain?.type || 'general'}
Scale: ${context.technical_context?.scale || 'medium'}
Stakeholders: ${context.user_context?.personas?.join(', ') || 'Not specified'}
Goals: ${context.user_context?.primary_goals?.join(', ') || 'Not specified'}
Constraints: ${context.technical_context?.constraints?.join(', ') || 'None specified'}

${similarDecisions.length > 0 ? `
## SIMILAR PAST DECISIONS
${similarDecisions.slice(0, 3).map(sd => `
- "${sd.decision_summary}" (${sd.similarity_score}% similar)
  Chose: ${sd.chosen_option}
  ${sd.outcome ? `Outcome: ${sd.outcome}` : ''}
  ${sd.lessons_learned?.length ? `Lessons: ${sd.lessons_learned.join('; ')}` : ''}
`).join('\n')}
` : ''}

Analyze each option using ONLY the provided evaluation dimensions.
`;

    try {
        const response = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 4096,
            system: DEEP_ANALYSIS_PROMPT,
            messages: [
                { role: 'user', content: analysisContext },
            ],
        });

        const textContent = response.content
            .filter((block): block is Anthropic.TextBlock => block.type === 'text')
            .map((block) => block.text)
            .join('\n');

        const jsonMatch = textContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            phases.push('deep_analysis');

            // Build historical insights if we have similar decisions
            let historicalInsights: EnhancedSolutionResult['historical_insights'];
            if (similarDecisions.length > 0) {
                const successfulSimilar = similarDecisions.filter(sd => sd.outcome === 'success');
                const failedSimilar = similarDecisions.filter(sd => sd.outcome === 'failed');

                historicalInsights = {
                    pattern_observed: `Found ${similarDecisions.length} similar past decisions (${successfulSimilar.length} successful)`,
                    success_factors: successfulSimilar.flatMap(sd => sd.lessons_learned || []).slice(0, 3),
                    warnings: failedSimilar.flatMap(sd => sd.lessons_learned || []).slice(0, 3),
                };
            }

            console.log('[Solution Architect v2] Analysis complete. Recommended:', parsed.recommendation?.recommended_option_name);

            return {
                analysis_depth: analysisDepth,
                quick_scan_result: quickScanResult,
                fingerprint,
                similar_decisions: similarDecisions,
                evaluation_framework: evaluationFramework,
                recommendation: parsed.recommendation,
                contextual_evaluations: parsed.contextual_evaluations || [],
                historical_insights: historicalInsights,
                analysis_metadata: {
                    total_time_ms: Date.now() - startTime,
                    phases_completed: phases,
                    model_used: 'claude-sonnet-4-20250514',
                },
            };
        }
    } catch (error) {
        console.error('[Solution Architect v2] Deep analysis error:', error);
    }

    // Fallback
    return fallbackEnhancedResult(context, fingerprint, evaluationFramework, similarDecisions, startTime, phases);
}

/**
 * Fallback result when analysis fails
 */
function fallbackEnhancedResult(
    context: DecisionContext,
    fingerprint: DecisionFingerprint,
    framework: ContextualFramework,
    similarDecisions: SimilarDecision[],
    startTime: number,
    phases: string[]
): EnhancedSolutionResult {
    const firstOption = context.options[0];

    return {
        analysis_depth: 'standard',
        fingerprint,
        similar_decisions: similarDecisions,
        evaluation_framework: framework,
        recommendation: {
            recommended_option_id: firstOption.id,
            recommended_option_name: firstOption.name,
            confidence: 30,
            recommendation_rationale: 'AI analysis failed. Please review manually.',
            key_factors: [],
            next_steps: ['Review options manually', 'Consult team'],
            caveats: ['This is a fallback recommendation due to analysis failure'],
        },
        contextual_evaluations: [],
        analysis_metadata: {
            total_time_ms: Date.now() - startTime,
            phases_completed: [...phases, 'fallback'],
            model_used: 'fallback',
        },
    };
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
    generateFingerprint as createFingerprint,
    findSimilarDecisions as searchSimilarDecisions,
    generateContextualFramework as createEvaluationFramework,
    quickScan as performQuickScan,
};

/**
 * Estimate analysis time based on complexity
 */
export function estimateEnhancedAnalysisTime(context: DecisionContext): {
    quick_scan: number;
    standard: number;
    deep: number;
} {
    const optionCount = context.options.length;
    const hasConstraints = (context.technical_context?.constraints?.length || 0) > 0;

    return {
        quick_scan: 3, // seconds
        standard: 15 + (optionCount * 2) + (hasConstraints ? 5 : 0),
        deep: 25 + (optionCount * 4) + (hasConstraints ? 10 : 0),
    };
}
