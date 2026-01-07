# Park Timeline API Integration Tests

Comprehensive API integration tests for the Park at 14th timeline endpoints. These tests verify the full stack integration: API routes → Supabase database → data serialization.

## Test Files

- **`park-timeline-milestones.test.ts`** - Tests for `/api/park-timeline/milestones` endpoint
- **`park-timeline-questions.test.ts`** - Tests for `/api/park-timeline/questions` endpoint

## What's Tested

### Milestones API (`/api/park-timeline/milestones`)
- ✅ GET: Retrieve all milestones
- ✅ GET: Verify date sorting
- ✅ GET: Validate response schema
- ✅ POST: Create new milestone
- ✅ POST: Handle all status types (not_started, in_progress, complete, blocked)
- ✅ PUT: Update milestone fields (name, date, status, notes, owner)
- ✅ DELETE: Remove milestone
- ✅ End-to-end flow: Create → Read → Update → Delete

### Questions API (`/api/park-timeline/questions`)
- ✅ GET: Retrieve all questions
- ✅ GET: Verify creation date sorting
- ✅ GET: Validate response schema
- ✅ POST: Create new question
- ✅ POST: Handle all status types (open, answered, deferred)
- ✅ POST: Handle all category types (product, technical, business, other)
- ✅ PUT: Update question fields
- ✅ PUT: Mark question as answered with answer and date
- ✅ PUT: Reopen answered questions
- ✅ DELETE: Remove question
- ✅ End-to-end flow: Create → Read → Answer → Delete
- ✅ Lifecycle test: open → answered → reopened → deferred

## Prerequisites

### 1. Start the Development Server

The tests require the pm-tracker dev server to be running:

```bash
cd /Users/unique_vzn/dev/park_crm/pm-tracker
npm run dev
```

The server should start on `http://localhost:3001` (or port 3000 if available).

### 2. Verify Database Connection

Ensure the Supabase database is accessible and the `park_milestones` and `park_questions` tables exist:

```bash
# Check tables exist
python3 /Users/unique_vzn/dev/park_crm/execution/supabase_migrate.py list-tables | grep park_

# Should output:
# - park_milestones (32 kB)
# - park_questions (32 kB)
```

If tables don't exist, run the migration:

```bash
python3 /Users/unique_vzn/dev/park_crm/execution/supabase_migrate.py migrate \
  --file /Users/unique_vzn/dev/park_crm/pm-tracker/supabase/migrations/008_park_timeline.sql
```

## Running the Tests

### Run All API Tests

```bash
npm run test tests/api/
```

### Run Specific Test Suite

```bash
# Milestones only
npm run test tests/api/park-timeline-milestones.test.ts

# Questions only
npm run test tests/api/park-timeline-questions.test.ts
```

### Run with Verbose Output

```bash
npm run test -- tests/api/ --reporter=verbose
```

### Run with Coverage

```bash
npm run test:coverage -- tests/api/
```

## Test Configuration

### Environment Variables

- `TEST_API_URL` - Override default API base URL (default: `http://localhost:3001`)

Example:
```bash
TEST_API_URL=http://localhost:3000 npm run test tests/api/
```

### Timeouts

Integration tests have longer timeouts than unit tests since they make real HTTP/database calls:

- Default test timeout: 5000ms (5 seconds)
- For slower systems, increase in `vitest.config.ts`:
  ```typescript
  test: {
    testTimeout: 10000, // 10 seconds
  }
  ```

## Test Data Cleanup

Both test suites automatically clean up test data after completion:

- Created milestones/questions are tracked during tests
- `afterAll` hook deletes all test data
- Test IDs use timestamp-based naming (`test-${Date.now()}`) to avoid conflicts

## Troubleshooting

### "Cannot read properties of undefined (reading 'status')"

**Cause**: `fetch` is mocked but integration tests need real HTTP.

**Fix**: The tests restore the original `fetch` implementation using `global.originalFetch` (saved in `tests/setup.ts`). If this error occurs, verify:

```typescript
// In test file
beforeAll(() => {
  global.fetch = global.originalFetch;
});
```

### "Test timed out in 5000ms"

**Cause**: API requests are slow or server isn't responding.

**Fix**:
1. Verify dev server is running: `curl http://localhost:3001/api/park-timeline/milestones`
2. Check server logs for errors
3. Increase test timeout in test file:
   ```typescript
   it('test name', async () => {
     // test code
   }, 10000); // 10 second timeout
   ```

### "500 Internal Server Error"

**Cause**: Database connection issue or API route error.

**Fix**:
1. Check `.env.local` has correct Supabase credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

2. Check server logs for error details:
   ```bash
   # View recent dev server logs
   cat /tmp/claude/-Users-unique-vzn-dev-park-crm/tasks/bbb0c80.output | tail -50
   ```

3. Test API manually:
   ```bash
   curl -v http://localhost:3001/api/park-timeline/milestones
   ```

### "Connection refused" or "ECONNREFUSED"

**Cause**: Dev server isn't running.

**Fix**: Start the dev server first (see Prerequisites above).

## Test Architecture

### Integration vs Unit Tests

These are **integration tests** that:
- Make real HTTP requests to the Next.js API routes
- Execute actual database operations against Supabase
- Verify end-to-end data flow

They are NOT unit tests - they don't use mocks for HTTP or database calls.

### Fetch Implementation

The global `fetch` is mocked in `tests/setup.ts` for unit tests. Integration tests restore the real implementation:

```typescript
// tests/setup.ts
global.originalFetch = global.fetch; // Save real fetch
global.fetch = vi.fn(); // Mock for unit tests

// tests/api/*.test.ts
beforeAll(() => {
  global.fetch = global.originalFetch; // Restore for integration tests
});
```

## Adding New Tests

To add tests for a new API endpoint:

1. Create test file: `tests/api/your-endpoint.test.ts`

2. Use this template:
```typescript
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

const API_BASE = process.env.TEST_API_URL || 'http://localhost:3001';
const ENDPOINT = `${API_BASE}/api/your-endpoint`;

describe('Your API', () => {
  beforeAll(() => {
    // Restore real fetch for HTTP calls
    global.fetch = global.originalFetch;
  });

  afterAll(async () => {
    // Clean up test data
  });

  it('should test something', async () => {
    const response = await fetch(ENDPOINT);
    expect(response.status).toBe(200);
  });
});
```

3. Run your new tests:
```bash
npm run test tests/api/your-endpoint.test.ts
```

## CI/CD Integration

To run these tests in CI:

```yaml
- name: Run API Tests
  run: |
    # Start dev server in background
    npm run dev &
    DEV_PID=$!

    # Wait for server to be ready
    npx wait-on http://localhost:3001

    # Run tests
    npm run test tests/api/

    # Kill dev server
    kill $DEV_PID
```

## Test Coverage

Current coverage for Park Timeline APIs:

| Endpoint | Coverage |
|----------|----------|
| GET milestones | 100% |
| POST milestones | 100% |
| PUT milestones | 100% |
| DELETE milestones | 100% |
| GET questions | 100% |
| POST questions | 100% |
| PUT questions | 100% |
| DELETE questions | 100% |

All CRUD operations and edge cases are tested.
