// Personnel Projections API Route
// Calculates monthly personnel costs and projections

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';
import type { Personnel, PersonnelProjection } from '@kit/types';

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
    const startMonth = searchParams.get('start');
    const endMonth = searchParams.get('end');

    if (!startMonth || !endMonth) {
      return NextResponse.json(
        { error: 'start and end month parameters are required (YYYY-MM)' },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();
    
    // Fetch all active personnel
    const { data, error } = await supabase
      .from('personnel')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const personnel: Personnel[] = (data || []).map(transformPersonnel);

    // Generate monthly projections
    const projections: Record<string, PersonnelProjection> = {};
    const start = new Date(startMonth + '-01');
    const end = new Date(endMonth + '-01');
    end.setMonth(end.getMonth() + 1);
    end.setDate(0);

    // Initialize all months
    let current = new Date(start);
    while (current <= end) {
      const month = current.toISOString().slice(0, 7);
      projections[month] = {
        month,
        totalSalary: 0,
        totalCharges: 0,
        totalCost: 0,
        headcount: 0,
      };
      current.setMonth(current.getMonth() + 1);
    }

    // Calculate costs for each personnel member
    for (const person of personnel) {
      const personStart = new Date(person.startDate);
      const personEnd = person.endDate ? new Date(person.endDate) : null;

      let current = new Date(Math.max(start.getTime(), personStart.getTime()));
      const finalDate = personEnd ? new Date(Math.min(end.getTime(), personEnd.getTime())) : end;

      while (current <= finalDate) {
        const month = current.toISOString().slice(0, 7);
        
        if (projections[month]) {
          const charges = person.employerChargesType === 'percentage'
            ? person.baseSalary * (person.employerCharges / 100)
            : person.employerCharges;
          const totalCost = person.baseSalary + charges;

          projections[month].totalSalary += person.baseSalary;
          projections[month].totalCharges += charges;
          projections[month].totalCost += totalCost;
          projections[month].headcount += 1;
        }

        current.setMonth(current.getMonth() + 1);
      }
    }

    // Convert to array and sort
    const result: PersonnelProjection[] = Object.values(projections)
      .sort((a, b) => a.month.localeCompare(b.month));

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error calculating personnel projections:', error);
    return NextResponse.json(
      { error: 'Failed to calculate personnel projections', details: error.message },
      { status: 500 }
    );
  }
}

