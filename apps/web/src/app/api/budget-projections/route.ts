// Budget Projections API Route
// Handles saving and retrieving monthly budget projections

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projections } = body;

    if (!Array.isArray(projections)) {
      return NextResponse.json(
        { error: 'Projections must be an array' },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();

    // Use upsert to handle both insert and update
    const { data, error } = await supabase
      .from('budget_projections')
      .upsert(projections, {
        onConflict: 'projection_type,reference_id,month',
        ignoreDuplicates: false
      })
      .select();

    if (error) throw error;

    return NextResponse.json({ data, count: data?.length || 0 });
  } catch (error: any) {
    console.error('Error saving budget projections:', error);
    return NextResponse.json(
      { error: 'Failed to save budget projections', details: error.message },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectionType = searchParams.get('type');
    const referenceId = searchParams.get('referenceId');
    const startMonth = searchParams.get('startMonth');
    const endMonth = searchParams.get('endMonth');

    const supabase = createServerSupabaseClient();
    let query = supabase.from('budget_projections').select('*');

    if (projectionType) {
      query = query.eq('projection_type', projectionType);
    }

    if (referenceId) {
      query = query.eq('reference_id', parseInt(referenceId));
    }

    if (startMonth) {
      query = query.gte('month', startMonth);
    }

    if (endMonth) {
      query = query.lte('month', endMonth);
    }

    const { data, error } = await query.order('month', { ascending: true });

    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (error: any) {
    console.error('Error fetching budget projections:', error);
    return NextResponse.json(
      { error: 'Failed to fetch budget projections', details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectionType = searchParams.get('type');
    const referenceId = searchParams.get('referenceId');
    const startMonth = searchParams.get('startMonth');
    const endMonth = searchParams.get('endMonth');

    if (!projectionType) {
      return NextResponse.json(
        { error: 'projection_type is required' },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();
    let query = supabase.from('budget_projections').delete();

    query = query.eq('projection_type', projectionType);

    if (referenceId) {
      query = query.eq('reference_id', parseInt(referenceId));
    }

    if (startMonth) {
      query = query.gte('month', startMonth);
    }

    if (endMonth) {
      query = query.lte('month', endMonth);
    }

    const { error } = await query;

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting budget projections:', error);
    return NextResponse.json(
      { error: 'Failed to delete budget projections', details: error.message },
      { status: 500 }
    );
  }
}

