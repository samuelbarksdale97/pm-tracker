// Zod schemas for validating AI outputs
// These ensure the AI returns structurally correct responses

import { z } from 'zod';

// =============================================================================
// Story Generation Schemas
// =============================================================================

export const PersonaSchema = z.enum(['member', 'admin', 'staff', 'business', 'guest']);

export const PrioritySchema = z.enum(['P0', 'P1', 'P2']);

export const GeneratedStorySchema = z.object({
    narrative: z.string()
        .min(20, 'Narrative must be at least 20 characters')
        .max(500, 'Narrative must be under 500 characters')
        .refine(
            (val) => val.toLowerCase().includes('as a') && val.toLowerCase().includes('i want'),
            'Narrative must follow "As a [persona], I want..." format'
        ),
    persona: PersonaSchema,
    priority: PrioritySchema,
    acceptance_criteria: z.array(z.string().min(5)).min(1, 'Must have at least one acceptance criterion'),
    rationale: z.string().min(10, 'Rationale must explain why this story is important'),
});

export const StoryGenerationResultSchema = z.object({
    stories: z.array(GeneratedStorySchema)
        .min(3, 'Must generate at least 3 stories')
        .max(7, 'Should not generate more than 7 stories'),
    feature_context: z.string().min(10, 'Must provide feature context summary'),
    generation_notes: z.array(z.string()).optional(),
});

// =============================================================================
// Story Categorization Schemas
// =============================================================================

export const RecommendationSchema = z.enum(['existing', 'new', 'none']);

export const NewFeatureSuggestionSchema = z.object({
    name: z.string().min(3).max(50),
    description: z.string().min(10).max(300),
    priority: PrioritySchema,
});

export const AlternativeMatchSchema = z.object({
    feature_id: z.string(),
    feature_name: z.string(),
    match_score: z.number().min(0).max(100),
    reason: z.string().min(5),
});

export const CategorizationResultSchema = z.object({
    recommendation: RecommendationSchema,
    suggested_feature_id: z.string().optional(),
    suggested_feature_name: z.string().optional(),
    confidence: z.number().min(0).max(100),
    reasoning: z.string().min(10, 'Must provide reasoning for recommendation'),
    new_feature_suggestion: NewFeatureSuggestionSchema.optional(),
    alternatives: z.array(AlternativeMatchSchema).optional(),
}).refine(
    (data) => {
        // If recommendation is 'existing', must have suggested_feature_id
        if (data.recommendation === 'existing') {
            return !!data.suggested_feature_id && !!data.suggested_feature_name;
        }
        return true;
    },
    { message: 'Existing recommendation must include suggested_feature_id and suggested_feature_name' }
).refine(
    (data) => {
        // If recommendation is 'new', should have new_feature_suggestion
        if (data.recommendation === 'new') {
            return !!data.new_feature_suggestion;
        }
        return true;
    },
    { message: 'New recommendation should include new_feature_suggestion' }
);

// =============================================================================
// Type exports
// =============================================================================

export type GeneratedStory = z.infer<typeof GeneratedStorySchema>;
export type StoryGenerationResult = z.infer<typeof StoryGenerationResultSchema>;
export type CategorizationResult = z.infer<typeof CategorizationResultSchema>;

// =============================================================================
// Validation helpers
// =============================================================================

export function validateGenerationResult(data: unknown): {
    success: boolean;
    data?: StoryGenerationResult;
    errors?: z.ZodError;
} {
    const result = StoryGenerationResultSchema.safeParse(data);
    if (result.success) {
        return { success: true, data: result.data };
    }
    return { success: false, errors: result.error };
}

export function validateCategorizationResult(data: unknown): {
    success: boolean;
    data?: CategorizationResult;
    errors?: z.ZodError;
} {
    const result = CategorizationResultSchema.safeParse(data);
    if (result.success) {
        return { success: true, data: result.data };
    }
    return { success: false, errors: result.error };
}
