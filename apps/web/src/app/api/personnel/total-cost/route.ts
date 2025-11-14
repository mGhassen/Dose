// Personnel Total Cost API Route
// Returns total personnel cost for a specific month

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';
import type { Personnel } from '@kit/types';

function transformPersonnel(row: any): Personnel {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    position: row.position,
    type: row.type,
    baseSalary: parseFloat(row.base_salary),
    employerCharges: parseFloat(row.employer_charges),
    employerChargesType: row.employer_charges_type,
    startDate: row.start_date,
    endDate: row.end_date,
    isActive: row.is_active,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');

    if (!month) {
      return NextResponse.json(
        { error: 'month parameter is required (YYYY-MM)' },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();
    
    // Fetch all active personnel
    const { data, error } = await supabase
      .from('personnel')
      .select('*')
      .eq('is_active', true);

    if (error) throw error;

    const personnel: Personnel[] = (data || []).map(transformPersonnel);

    // Calculate total cost for the month
    const monthDate = new Date(month + '-01');
    let totalCost = 0;
    let headcount = 0;

    for (const person of personnel) {
      const personStart = new Date(person.startDate);
      const personEnd = person.endDate ? new Date(person.endDate) : null;

      // Check if person was active in this month
      const isActiveInMonth = 
        personStart <= monthDate &&
        (!personEnd || personEnd >= monthDate);

      if (isActiveInMonth) {
        const charges = person.employerChargesType === 'percentage'
          ? person.baseSalary * (person.employerCharges / 100)
          : person.employerCharges;
        totalCost += person.baseSalary + charges;
        headcount += 1;
      }
    }

    return NextResponse.json({
      totalCost: Math.round(totalCost * 100) / 100,
      headcount,
    });
  } catch (error: any) {
    console.error('Error calculating personnel total cost:', error);
    return NextResponse.json(
      { error: 'Failed to calculate personnel total cost', details: error.message },
      { status: 500 }
    );
  }
}

