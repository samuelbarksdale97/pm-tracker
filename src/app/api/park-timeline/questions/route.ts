import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET all questions
export async function GET() {
  const { data, error } = await supabase
    .from('park_questions')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching park questions:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ questions: data || [] });
}

// POST new question
export async function POST(request: Request) {
  const body = await request.json();

  const { data, error} = await supabase
    .from('park_questions')
    .insert([body])
    .select()
    .single();

  if (error) {
    console.error('Error creating park question:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ question: data });
}

// PUT update question
export async function PUT(request: Request) {
  const body = await request.json();
  const { id, ...updates } = body;

  const { data, error } = await supabase
    .from('park_questions')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating park question:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ question: data });
}

// DELETE question
export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 });
  }

  const { error } = await supabase
    .from('park_questions')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting park question:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
