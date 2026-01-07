import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET all milestones
export async function GET() {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('park_milestones')
    .select('*')
    .order('date', { ascending: true });

  if (error) {
    console.error('Error fetching park milestones:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ milestones: data || [] });
}

// POST new milestone
export async function POST(request: Request) {
  const supabase = createClient();
  const body = await request.json();

  const { data, error } = await supabase
    .from('park_milestones')
    .insert([body])
    .select()
    .single();

  if (error) {
    console.error('Error creating park milestone:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ milestone: data });
}

// PUT update milestone
export async function PUT(request: Request) {
  const supabase = createClient();
  const body = await request.json();
  const { id, ...updates } = body;

  const { data, error } = await supabase
    .from('park_milestones')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating park milestone:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ milestone: data });
}

// DELETE milestone
export async function DELETE(request: Request) {
  const supabase = createClient();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 });
  }

  const { error } = await supabase
    .from('park_milestones')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting park milestone:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
