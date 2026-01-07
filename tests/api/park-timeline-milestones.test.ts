/**
 * API Integration Tests - Park Timeline Milestones
 *
 * Tests the /api/park-timeline/milestones endpoint with real database operations.
 * These are integration tests that verify the full API flow:
 * - API route handler
 * - Database operations (Supabase)
 * - Data serialization
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';

// Test configuration
const API_BASE = process.env.TEST_API_URL || 'http://localhost:3001';
const MILESTONES_ENDPOINT = `${API_BASE}/api/park-timeline/milestones`;

// Type definitions
interface Milestone {
  id: string;
  name: string;
  date: string;
  status: 'not_started' | 'in_progress' | 'complete' | 'blocked';
  owner: string;
  notes?: string;
}

// Test data
const testMilestoneData = {
  name: 'Test Milestone',
  date: '2026-02-01',
  status: 'not_started' as const,
  owner: 'Test Owner',
  notes: 'This is a test milestone',
};

// Track created milestones for cleanup
const createdMilestoneIds: string[] = [];

describe('Park Timeline Milestones API', () => {
  // Restore real fetch before tests
  beforeAll(() => {
    // Restore original fetch (saved in setup.ts before mocking)
    // @ts-ignore
    global.fetch = global.originalFetch;
  });

  // Cleanup after all tests
  afterAll(async () => {
    // Delete all test milestones
    for (const id of createdMilestoneIds) {
      try {
        await fetch(`${MILESTONES_ENDPOINT}?id=${id}`, {
          method: 'DELETE',
        });
      } catch (error) {
        console.error(`Failed to cleanup milestone ${id}:`, error);
      }
    }
  });

  describe('GET /api/park-timeline/milestones', () => {
    it('should return 200 and an array of milestones', async () => {
      const response = await fetch(MILESTONES_ENDPOINT);

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('milestones');
      expect(Array.isArray(data.milestones)).toBe(true);
    });

    it('should return milestones sorted by date', async () => {
      const response = await fetch(MILESTONES_ENDPOINT);
      const data = await response.json();

      if (data.milestones.length > 1) {
        const dates = data.milestones.map((m: Milestone) => new Date(m.date).getTime());
        const sortedDates = [...dates].sort((a, b) => a - b);
        expect(dates).toEqual(sortedDates);
      }
    });

    it('should return milestones with correct schema', async () => {
      const response = await fetch(MILESTONES_ENDPOINT);
      const data = await response.json();

      if (data.milestones.length > 0) {
        const milestone = data.milestones[0];
        expect(milestone).toHaveProperty('id');
        expect(milestone).toHaveProperty('name');
        expect(milestone).toHaveProperty('date');
        expect(milestone).toHaveProperty('status');
        expect(milestone).toHaveProperty('owner');
        expect(['not_started', 'in_progress', 'complete', 'blocked']).toContain(milestone.status);
      }
    });
  });

  describe('POST /api/park-timeline/milestones', () => {
    it('should create a new milestone and return 200', async () => {
      const response = await fetch(MILESTONES_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: `test-${Date.now()}`,
          ...testMilestoneData,
        }),
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('milestone');
      expect(data.milestone.name).toBe(testMilestoneData.name);
      expect(data.milestone.date).toBe(testMilestoneData.date);
      expect(data.milestone.status).toBe(testMilestoneData.status);
      expect(data.milestone.owner).toBe(testMilestoneData.owner);
      expect(data.milestone.notes).toBe(testMilestoneData.notes);

      // Track for cleanup
      createdMilestoneIds.push(data.milestone.id);
    });

    it('should create a milestone without notes', async () => {
      const milestoneWithoutNotes = {
        id: `test-no-notes-${Date.now()}`,
        name: 'Milestone Without Notes',
        date: '2026-03-01',
        status: 'in_progress' as const,
        owner: 'Test Owner',
      };

      const response = await fetch(MILESTONES_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(milestoneWithoutNotes),
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.milestone.name).toBe(milestoneWithoutNotes.name);
      expect(data.milestone.notes).toBeUndefined();

      createdMilestoneIds.push(data.milestone.id);
    });

    it('should handle all status types correctly', async () => {
      const statuses: Milestone['status'][] = ['not_started', 'in_progress', 'complete', 'blocked'];

      for (const status of statuses) {
        const milestone = {
          id: `test-status-${status}-${Date.now()}`,
          name: `Test ${status}`,
          date: '2026-04-01',
          status,
          owner: 'Test Owner',
        };

        const response = await fetch(MILESTONES_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(milestone),
        });

        expect(response.status).toBe(200);

        const data = await response.json();
        expect(data.milestone.status).toBe(status);

        createdMilestoneIds.push(data.milestone.id);
      }
    });
  });

  describe('PUT /api/park-timeline/milestones', () => {
    let testMilestoneId: string;

    beforeEach(async () => {
      // Create a test milestone
      const response = await fetch(MILESTONES_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: `test-update-${Date.now()}`,
          ...testMilestoneData,
        }),
      });

      const data = await response.json();
      testMilestoneId = data.milestone.id;
      createdMilestoneIds.push(testMilestoneId);
    });

    it('should update milestone name', async () => {
      const updatedName = 'Updated Milestone Name';

      const response = await fetch(MILESTONES_ENDPOINT, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: testMilestoneId,
          name: updatedName,
        }),
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.milestone.name).toBe(updatedName);
      expect(data.milestone.id).toBe(testMilestoneId);
    });

    it('should update milestone status', async () => {
      const response = await fetch(MILESTONES_ENDPOINT, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: testMilestoneId,
          status: 'complete',
        }),
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.milestone.status).toBe('complete');
    });

    it('should update milestone date', async () => {
      const newDate = '2026-05-15';

      const response = await fetch(MILESTONES_ENDPOINT, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: testMilestoneId,
          date: newDate,
        }),
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.milestone.date).toBe(newDate);
    });

    it('should update multiple fields at once', async () => {
      const updates = {
        name: 'Multi-Update Test',
        status: 'in_progress' as const,
        notes: 'Updated notes',
      };

      const response = await fetch(MILESTONES_ENDPOINT, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: testMilestoneId,
          ...updates,
        }),
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.milestone.name).toBe(updates.name);
      expect(data.milestone.status).toBe(updates.status);
      expect(data.milestone.notes).toBe(updates.notes);
    });
  });

  describe('DELETE /api/park-timeline/milestones', () => {
    it('should delete a milestone and return 200', async () => {
      // Create a milestone to delete
      const createResponse = await fetch(MILESTONES_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: `test-delete-${Date.now()}`,
          ...testMilestoneData,
        }),
      });

      const createData = await createResponse.json();
      const milestoneId = createData.milestone.id;

      // Delete the milestone
      const deleteResponse = await fetch(`${MILESTONES_ENDPOINT}?id=${milestoneId}`, {
        method: 'DELETE',
      });

      expect(deleteResponse.status).toBe(200);

      const deleteData = await deleteResponse.json();
      expect(deleteData.success).toBe(true);

      // Verify it's actually deleted by trying to get all milestones
      const getResponse = await fetch(MILESTONES_ENDPOINT);
      const getData = await getResponse.json();
      const deletedMilestone = getData.milestones.find((m: Milestone) => m.id === milestoneId);
      expect(deletedMilestone).toBeUndefined();
    });

    it('should return 400 if id is missing', async () => {
      const response = await fetch(MILESTONES_ENDPOINT, {
        method: 'DELETE',
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data).toHaveProperty('error');
      expect(data.error).toContain('id');
    });
  });

  describe('End-to-End Flow', () => {
    it('should create, read, update, and delete a milestone', async () => {
      const milestoneId = `test-e2e-${Date.now()}`;

      // 1. CREATE
      const createResponse = await fetch(MILESTONES_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: milestoneId,
          name: 'E2E Test Milestone',
          date: '2026-06-01',
          status: 'not_started',
          owner: 'E2E Test',
        }),
      });

      expect(createResponse.status).toBe(200);
      const createData = await createResponse.json();
      expect(createData.milestone.id).toBe(milestoneId);

      // 2. READ
      const readResponse = await fetch(MILESTONES_ENDPOINT);
      expect(readResponse.status).toBe(200);
      const readData = await readResponse.json();
      const foundMilestone = readData.milestones.find((m: Milestone) => m.id === milestoneId);
      expect(foundMilestone).toBeDefined();
      expect(foundMilestone.name).toBe('E2E Test Milestone');

      // 3. UPDATE
      const updateResponse = await fetch(MILESTONES_ENDPOINT, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: milestoneId,
          status: 'complete',
          notes: 'E2E test completed',
        }),
      });

      expect(updateResponse.status).toBe(200);
      const updateData = await updateResponse.json();
      expect(updateData.milestone.status).toBe('complete');
      expect(updateData.milestone.notes).toBe('E2E test completed');

      // 4. DELETE
      const deleteResponse = await fetch(`${MILESTONES_ENDPOINT}?id=${milestoneId}`, {
        method: 'DELETE',
      });

      expect(deleteResponse.status).toBe(200);

      // 5. VERIFY DELETION
      const verifyResponse = await fetch(MILESTONES_ENDPOINT);
      const verifyData = await verifyResponse.json();
      const deletedMilestone = verifyData.milestones.find((m: Milestone) => m.id === milestoneId);
      expect(deletedMilestone).toBeUndefined();
    });
  });
});
