// API client for Park at 14th Timeline
// Replaces localStorage with database persistence

export interface Milestone {
  id: string;
  name: string;
  date: string; // YYYY-MM-DD
  status: 'not_started' | 'in_progress' | 'complete' | 'blocked';
  owner: string;
  notes?: string;
}

export interface OpenQuestion {
  id: string;
  question: string;
  context?: string;
  status: 'open' | 'answered' | 'deferred';
  answer?: string;
  answered_date?: string; // YYYY-MM-DD
  category: 'product' | 'technical' | 'business' | 'other';
}

// Milestones API
export const milestonesApi = {
  async getAll(): Promise<Milestone[]> {
    const res = await fetch('/api/park-timeline/milestones', {
      cache: 'no-store',
    });
    if (!res.ok) throw new Error('Failed to fetch milestones');
    const data = await res.json();
    return data.milestones || [];
  },

  async create(milestone: Omit<Milestone, 'id'>): Promise<Milestone> {
    const id = Date.now().toString();
    const res = await fetch('/api/park-timeline/milestones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...milestone }),
    });
    if (!res.ok) throw new Error('Failed to create milestone');
    const data = await res.json();
    return data.milestone;
  },

  async update(id: string, updates: Partial<Milestone>): Promise<Milestone> {
    const res = await fetch('/api/park-timeline/milestones', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...updates }),
    });
    if (!res.ok) throw new Error('Failed to update milestone');
    const data = await res.json();
    return data.milestone;
  },

  async delete(id: string): Promise<void> {
    const res = await fetch(`/api/park-timeline/milestones?id=${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete milestone');
  },
};

// Questions API
export const questionsApi = {
  async getAll(): Promise<OpenQuestion[]> {
    const res = await fetch('/api/park-timeline/questions', {
      cache: 'no-store',
    });
    if (!res.ok) throw new Error('Failed to fetch questions');
    const data = await res.json();
    return data.questions || [];
  },

  async create(question: Omit<OpenQuestion, 'id'>): Promise<OpenQuestion> {
    const id = 'q' + Date.now().toString();
    const res = await fetch('/api/park-timeline/questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...question }),
    });
    if (!res.ok) throw new Error('Failed to create question');
    const data = await res.json();
    return data.question;
  },

  async update(id: string, updates: Partial<OpenQuestion>): Promise<OpenQuestion> {
    const res = await fetch('/api/park-timeline/questions', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...updates }),
    });
    if (!res.ok) throw new Error('Failed to update question');
    const data = await res.json();
    return data.question;
  },

  async delete(id: string): Promise<void> {
    const res = await fetch(`/api/park-timeline/questions?id=${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete question');
  },
};
