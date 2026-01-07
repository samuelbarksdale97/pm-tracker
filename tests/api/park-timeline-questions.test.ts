/**
 * API Integration Tests - Park Timeline Questions
 *
 * Tests the /api/park-timeline/questions endpoint with real database operations.
 * These are integration tests that verify the full API flow:
 * - API route handler
 * - Database operations (Supabase)
 * - Data serialization
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';

// Test configuration
const API_BASE = process.env.TEST_API_URL || 'http://localhost:3001';
const QUESTIONS_ENDPOINT = `${API_BASE}/api/park-timeline/questions`;

// Type definitions
interface OpenQuestion {
  id: string;
  question: string;
  context?: string;
  status: 'open' | 'answered' | 'deferred';
  answer?: string;
  answered_date?: string;
  category: 'product' | 'technical' | 'business' | 'other';
}

// Test data
const testQuestionData = {
  question: 'What is the test question?',
  context: 'This is test context for the question',
  status: 'open' as const,
  category: 'technical' as const,
};

// Track created questions for cleanup
const createdQuestionIds: string[] = [];

describe('Park Timeline Questions API', () => {
  // Restore real fetch before tests
  beforeAll(() => {
    // Restore original fetch (saved in setup.ts before mocking)
    // @ts-ignore
    global.fetch = global.originalFetch;
  });

  // Cleanup after all tests
  afterAll(async () => {
    // Delete all test questions
    for (const id of createdQuestionIds) {
      try {
        await fetch(`${QUESTIONS_ENDPOINT}?id=${id}`, {
          method: 'DELETE',
        });
      } catch (error) {
        console.error(`Failed to cleanup question ${id}:`, error);
      }
    }
  });

  describe('GET /api/park-timeline/questions', () => {
    it('should return 200 and an array of questions', async () => {
      const response = await fetch(QUESTIONS_ENDPOINT);

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('questions');
      expect(Array.isArray(data.questions)).toBe(true);
    });

    it('should return questions with correct schema', async () => {
      const response = await fetch(QUESTIONS_ENDPOINT);
      const data = await response.json();

      if (data.questions.length > 0) {
        const question = data.questions[0];
        expect(question).toHaveProperty('id');
        expect(question).toHaveProperty('question');
        expect(question).toHaveProperty('status');
        expect(question).toHaveProperty('category');
        expect(['open', 'answered', 'deferred']).toContain(question.status);
        expect(['product', 'technical', 'business', 'other']).toContain(question.category);
      }
    });

    it('should return questions sorted by creation date', async () => {
      const response = await fetch(QUESTIONS_ENDPOINT);
      const data = await response.json();

      if (data.questions.length > 1) {
        // Questions should be ordered by created_at ascending
        const firstQuestion = data.questions[0];
        const lastQuestion = data.questions[data.questions.length - 1];

        // Both should have created_at or we can't verify order
        if (firstQuestion.created_at && lastQuestion.created_at) {
          const firstDate = new Date(firstQuestion.created_at).getTime();
          const lastDate = new Date(lastQuestion.created_at).getTime();
          expect(firstDate).toBeLessThanOrEqual(lastDate);
        }
      }
    });
  });

  describe('POST /api/park-timeline/questions', () => {
    it('should create a new question and return 200', async () => {
      const response = await fetch(QUESTIONS_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: `test-q-${Date.now()}`,
          ...testQuestionData,
        }),
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('question');
      expect(data.question.question).toBe(testQuestionData.question);
      expect(data.question.context).toBe(testQuestionData.context);
      expect(data.question.status).toBe(testQuestionData.status);
      expect(data.question.category).toBe(testQuestionData.category);

      // Track for cleanup
      createdQuestionIds.push(data.question.id);
    });

    it('should create a question without context', async () => {
      const questionWithoutContext = {
        id: `test-q-no-context-${Date.now()}`,
        question: 'Question without context?',
        status: 'open' as const,
        category: 'product' as const,
      };

      const response = await fetch(QUESTIONS_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(questionWithoutContext),
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.question.question).toBe(questionWithoutContext.question);
      expect(data.question.context).toBeUndefined();

      createdQuestionIds.push(data.question.id);
    });

    it('should handle all status types correctly', async () => {
      const statuses: OpenQuestion['status'][] = ['open', 'answered', 'deferred'];

      for (const status of statuses) {
        const question = {
          id: `test-q-status-${status}-${Date.now()}`,
          question: `Test question with status ${status}?`,
          status,
          category: 'technical' as const,
        };

        const response = await fetch(QUESTIONS_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(question),
        });

        expect(response.status).toBe(200);

        const data = await response.json();
        expect(data.question.status).toBe(status);

        createdQuestionIds.push(data.question.id);
      }
    });

    it('should handle all category types correctly', async () => {
      const categories: OpenQuestion['category'][] = ['product', 'technical', 'business', 'other'];

      for (const category of categories) {
        const question = {
          id: `test-q-cat-${category}-${Date.now()}`,
          question: `Test question in ${category} category?`,
          status: 'open' as const,
          category,
        };

        const response = await fetch(QUESTIONS_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(question),
        });

        expect(response.status).toBe(200);

        const data = await response.json();
        expect(data.question.category).toBe(category);

        createdQuestionIds.push(data.question.id);
      }
    });

    it('should create an answered question with answer and date', async () => {
      const answeredQuestion = {
        id: `test-q-answered-${Date.now()}`,
        question: 'What is the answer?',
        status: 'answered' as const,
        answer: 'This is the answer',
        answered_date: '2026-01-07',
        category: 'business' as const,
      };

      const response = await fetch(QUESTIONS_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(answeredQuestion),
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.question.status).toBe('answered');
      expect(data.question.answer).toBe(answeredQuestion.answer);
      expect(data.question.answered_date).toBe(answeredQuestion.answered_date);

      createdQuestionIds.push(data.question.id);
    });
  });

  describe('PUT /api/park-timeline/questions', () => {
    let testQuestionId: string;

    beforeEach(async () => {
      // Create a test question
      const response = await fetch(QUESTIONS_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: `test-q-update-${Date.now()}`,
          ...testQuestionData,
        }),
      });

      const data = await response.json();
      testQuestionId = data.question.id;
      createdQuestionIds.push(testQuestionId);
    });

    it('should update question text', async () => {
      const updatedQuestion = 'What is the updated question?';

      const response = await fetch(QUESTIONS_ENDPOINT, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: testQuestionId,
          question: updatedQuestion,
        }),
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.question.question).toBe(updatedQuestion);
      expect(data.question.id).toBe(testQuestionId);
    });

    it('should update question status', async () => {
      const response = await fetch(QUESTIONS_ENDPOINT, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: testQuestionId,
          status: 'deferred',
        }),
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.question.status).toBe('deferred');
    });

    it('should update question category', async () => {
      const response = await fetch(QUESTIONS_ENDPOINT, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: testQuestionId,
          category: 'product',
        }),
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.question.category).toBe('product');
    });

    it('should mark question as answered with answer and date', async () => {
      const answer = 'This is the answer to the question';
      const answeredDate = '2026-01-07';

      const response = await fetch(QUESTIONS_ENDPOINT, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: testQuestionId,
          status: 'answered',
          answer,
          answered_date: answeredDate,
        }),
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.question.status).toBe('answered');
      expect(data.question.answer).toBe(answer);
      expect(data.question.answered_date).toBe(answeredDate);
    });

    it('should update multiple fields at once', async () => {
      const updates = {
        question: 'Multi-Update Test Question?',
        context: 'Updated context',
        category: 'business' as const,
      };

      const response = await fetch(QUESTIONS_ENDPOINT, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: testQuestionId,
          ...updates,
        }),
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.question.question).toBe(updates.question);
      expect(data.question.context).toBe(updates.context);
      expect(data.question.category).toBe(updates.category);
    });

    it('should reopen an answered question', async () => {
      // First, mark it as answered
      await fetch(QUESTIONS_ENDPOINT, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: testQuestionId,
          status: 'answered',
          answer: 'Initial answer',
          answered_date: '2026-01-01',
        }),
      });

      // Then reopen it
      const response = await fetch(QUESTIONS_ENDPOINT, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: testQuestionId,
          status: 'open',
          answer: undefined,
          answered_date: undefined,
        }),
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.question.status).toBe('open');
    });
  });

  describe('DELETE /api/park-timeline/questions', () => {
    it('should delete a question and return 200', async () => {
      // Create a question to delete
      const createResponse = await fetch(QUESTIONS_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: `test-q-delete-${Date.now()}`,
          ...testQuestionData,
        }),
      });

      const createData = await createResponse.json();
      const questionId = createData.question.id;

      // Delete the question
      const deleteResponse = await fetch(`${QUESTIONS_ENDPOINT}?id=${questionId}`, {
        method: 'DELETE',
      });

      expect(deleteResponse.status).toBe(200);

      const deleteData = await deleteResponse.json();
      expect(deleteData.success).toBe(true);

      // Verify it's actually deleted by trying to get all questions
      const getResponse = await fetch(QUESTIONS_ENDPOINT);
      const getData = await getResponse.json();
      const deletedQuestion = getData.questions.find((q: OpenQuestion) => q.id === questionId);
      expect(deletedQuestion).toBeUndefined();
    });

    it('should return 400 if id is missing', async () => {
      const response = await fetch(QUESTIONS_ENDPOINT, {
        method: 'DELETE',
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data).toHaveProperty('error');
      expect(data.error).toContain('id');
    });
  });

  describe('End-to-End Flow', () => {
    it('should create, read, update (answer), and delete a question', async () => {
      const questionId = `test-q-e2e-${Date.now()}`;

      // 1. CREATE
      const createResponse = await fetch(QUESTIONS_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: questionId,
          question: 'E2E Test Question?',
          context: 'Testing full flow',
          status: 'open',
          category: 'technical',
        }),
      });

      expect(createResponse.status).toBe(200);
      const createData = await createResponse.json();
      expect(createData.question.id).toBe(questionId);

      // 2. READ
      const readResponse = await fetch(QUESTIONS_ENDPOINT);
      expect(readResponse.status).toBe(200);
      const readData = await readResponse.json();
      const foundQuestion = readData.questions.find((q: OpenQuestion) => q.id === questionId);
      expect(foundQuestion).toBeDefined();
      expect(foundQuestion.question).toBe('E2E Test Question?');
      expect(foundQuestion.status).toBe('open');

      // 3. UPDATE (Answer the question)
      const updateResponse = await fetch(QUESTIONS_ENDPOINT, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: questionId,
          status: 'answered',
          answer: 'Yes, the E2E test works!',
          answered_date: '2026-01-07',
        }),
      });

      expect(updateResponse.status).toBe(200);
      const updateData = await updateResponse.json();
      expect(updateData.question.status).toBe('answered');
      expect(updateData.question.answer).toBe('Yes, the E2E test works!');
      expect(updateData.question.answered_date).toBe('2026-01-07');

      // 4. DELETE
      const deleteResponse = await fetch(`${QUESTIONS_ENDPOINT}?id=${questionId}`, {
        method: 'DELETE',
      });

      expect(deleteResponse.status).toBe(200);

      // 5. VERIFY DELETION
      const verifyResponse = await fetch(QUESTIONS_ENDPOINT);
      const verifyData = await verifyResponse.json();
      const deletedQuestion = verifyData.questions.find((q: OpenQuestion) => q.id === questionId);
      expect(deletedQuestion).toBeUndefined();
    });

    it('should handle question lifecycle: open -> answered -> reopened -> deferred', async () => {
      const questionId = `test-q-lifecycle-${Date.now()}`;

      // CREATE as open
      await fetch(QUESTIONS_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: questionId,
          question: 'Lifecycle test question?',
          status: 'open',
          category: 'product',
        }),
      });

      createdQuestionIds.push(questionId);

      // 1. Answer it
      let response = await fetch(QUESTIONS_ENDPOINT, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: questionId,
          status: 'answered',
          answer: 'First answer',
          answered_date: '2026-01-05',
        }),
      });

      let data = await response.json();
      expect(data.question.status).toBe('answered');

      // 2. Reopen it
      response = await fetch(QUESTIONS_ENDPOINT, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: questionId,
          status: 'open',
        }),
      });

      data = await response.json();
      expect(data.question.status).toBe('open');

      // 3. Defer it
      response = await fetch(QUESTIONS_ENDPOINT, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: questionId,
          status: 'deferred',
        }),
      });

      data = await response.json();
      expect(data.question.status).toBe('deferred');
    });
  });
});
