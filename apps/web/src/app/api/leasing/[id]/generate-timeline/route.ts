// Generate and Store Leasing Timeline API Route

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';
import { projectLeasingPayment } from '@/lib/calculations/leasing-timeline';
import type { LeasingPayment } from '@kit/types';

function transformLeasing(row: any): LeasingPayment {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    amount: parseFloat(row.amount),
    startDate: row.start_date,
    endDate: row.end_date,
    frequency: row.frequency,
    description: row.description,
    lessor: row.lessor,
    isActive: row.is_active,
    offPaymentMonths: row.off_payment_months || [],
    firstPaymentAmount: row.first_payment_amount ? parseFloat(row.first_payment_amount) : undefined,
    totalAmount: row.total_amount ? parseFloat(row.total_amount) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const changedEntryId = searchParams.get('entryId'); // Optional: ID of the entry that was just changed
    const supabase = createServerSupabaseClient();
    
    // Fetch leasing payment first to get the actual start date
    const { data: leasingData, error: leasingError } = await supabase
      .from('leasing_payments')
      .select('*')
      .eq('id', id)
      .single();

    if (leasingError) {
      if (leasingError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Leasing payment not found' }, { status: 404 });
      }
      throw leasingError;
    }

    const leasing = transformLeasing(leasingData);
    
    // Use leasing's startDate as the default startMonth, not current month
    const leasingStartMonth = new Date(leasing.startDate).toISOString().slice(0, 7);
    const startMonth = searchParams.get('startMonth') || leasingStartMonth;
    const endMonth = searchParams.get('endMonth') || (() => {
      if (leasing.endDate) {
        return new Date(leasing.endDate).toISOString().slice(0, 7);
      }
      const date = new Date();
      date.setFullYear(date.getFullYear() + 1);
      return date.toISOString().slice(0, 7);
    })();

    // Fetch ALL existing entries for the entire lease period to properly calculate distribution
    const leaseEndMonth = leasing.endDate ? new Date(leasing.endDate).toISOString().slice(0, 7) : endMonth;
    const { data: allExistingEntries, error: existingError } = await supabase
      .from('leasing_timeline_entries')
      .select('*')
      .eq('leasing_id', id)
      .lte('month', leaseEndMonth)
      .order('month', { ascending: true })
      .order('payment_date', { ascending: true });

    if (existingError) throw existingError;

    // Simple approach: If entryId is provided, find that specific entry
    // Otherwise, if startMonth is provided, find the most recent entry at that month
    let changedEntry: any = null;
    let actualStartMonth = startMonth;
    
    if (changedEntryId) {
      // Find by ID - most reliable
      changedEntry = (allExistingEntries || []).find((e: any) => e.id === parseInt(changedEntryId));
      if (changedEntry) {
        actualStartMonth = changedEntry.month; // Use the entry's actual month
        console.log(`[generate-timeline] Found changed entry by ID ${changedEntryId}: month=${actualStartMonth}, amount=${changedEntry.amount}`);
      }
    }
    
    // If not found by ID, try by startMonth
    if (!changedEntry) {
      const entriesAtStartMonth = (allExistingEntries || []).filter((e: any) => e.month === startMonth);
      if (entriesAtStartMonth.length > 0) {
        // Use the most recently updated entry (highest ID = most recent)
        changedEntry = entriesAtStartMonth.sort((a: any, b: any) => (b.id || 0) - (a.id || 0))[0];
        console.log(`[generate-timeline] Found changed entry by month ${startMonth}: id=${changedEntry.id}, amount=${changedEntry.amount}`);
      }
    }
    
    // Only recalculate if we found a changed entry AND it's not fixed
    if (changedEntry && changedEntry.is_fixed_amount) {
      console.log(`[generate-timeline] Entry ${changedEntry.id} is fixed, skipping recalculation`);
      changedEntry = null; // Don't recalculate if fixed
    }
    
    // If an entry was changed, recalculate all entries AFTER it
    const shouldRecalculate = changedEntry !== null;
    const calculationEndMonth = shouldRecalculate ? leaseEndMonth : endMonth;
    const calculationStartMonth = shouldRecalculate ? actualStartMonth : (startMonth < leasingStartMonth ? leasingStartMonth : startMonth);
    
    // Calculate timeline entries
    const timelineEntries = projectLeasingPayment(leasing, calculationStartMonth, calculationEndMonth);
    
    // Create a map of existing entries in the calculation range for quick lookup
    const existingMap = new Map<string, any>();
    const entriesInRange = (allExistingEntries || []).filter((e: any) => 
      e.month >= startMonth && e.month <= calculationEndMonth
    );
    entriesInRange.forEach((entry: any) => {
      const key = `${entry.month}-${entry.payment_date}`;
      existingMap.set(key, entry);
    });
    
    // Build map of all existing entries for the full lease period
    const allEntriesMap = new Map<string, any>();
    (allExistingEntries || []).forEach((e: any) => {
      const key = `${e.month}-${e.payment_date}`;
      allEntriesMap.set(key, e);
    });
    
    // Simple recalculation: if entry changed, recalculate future entries
    if (changedEntry) {
      const changedAmount = parseFloat(changedEntry.amount);
      const changedMonth = actualStartMonth;
      
      console.log(`[generate-timeline] Recalculating from entry ${changedEntry.id} (month ${changedMonth}, amount ${changedAmount})`);
      
      if (leasing.totalAmount) {
        // With totalAmount: calculate remaining and distribute
        let allocatedSum = 0;
        
        // Sum all entries up to and including changed month
        allExistingEntries.forEach((e: any) => {
          if (e.month < changedMonth) {
            allocatedSum += parseFloat(e.amount); // All entries before
          } else if (e.month === changedMonth && e.id === changedEntry.id) {
            allocatedSum += changedAmount; // Changed entry with new amount
          } else if (e.month === changedMonth) {
            // Other entries in same month (shouldn't happen, but handle it)
            allocatedSum += parseFloat(e.amount);
          }
        });
        
        const remainingAmount = leasing.totalAmount - allocatedSum;
        console.log(`[generate-timeline] Allocated: ${allocatedSum}, Remaining: ${remainingAmount}, Total: ${leasing.totalAmount}`);
        
        // Count adjustable entries after changed month
        let adjustableCount = 0;
        timelineEntries.forEach(entry => {
          if (entry.month > changedMonth) {
            const key = `${entry.month}-${entry.paymentDate.split('T')[0]}`;
            const existing = allEntriesMap.get(key);
            if (!existing || (!existing.is_fixed_amount && !existing.is_paid)) {
              adjustableCount++;
            }
          }
        });
        
        // Distribute remaining evenly
        if (adjustableCount > 0 && remainingAmount > 0) {
          const amountPerEntry = remainingAmount / adjustableCount;
          console.log(`[generate-timeline] Distributing ${remainingAmount} across ${adjustableCount} entries = ${amountPerEntry} each`);
          
          timelineEntries.forEach(entry => {
            if (entry.month > changedMonth) {
              const key = `${entry.month}-${entry.paymentDate.split('T')[0]}`;
              const existing = allEntriesMap.get(key);
              if (!existing || (!existing.is_fixed_amount && !existing.is_paid)) {
                entry.amount = amountPerEntry;
              }
            }
          });
        }
      } else {
        // No totalAmount: project changed amount forward
        console.log(`[generate-timeline] Projecting amount ${changedAmount} forward (no totalAmount)`);
        timelineEntries.forEach(entry => {
          if (entry.month > changedMonth) {
            const key = `${entry.month}-${entry.paymentDate.split('T')[0]}`;
            const existing = allEntriesMap.get(key);
            if (!existing || (!existing.is_fixed_amount && !existing.is_paid)) {
              entry.amount = changedAmount;
            }
          }
        });
      }
    }

    // Prepare entries to insert/update
    const entriesToUpsert: any[] = [];
    let entriesToUpdateCount = 0;

    for (const entry of timelineEntries) {
      const key = `${entry.month}-${entry.paymentDate.split('T')[0]}`;
      const existing = allEntriesMap.get(key); // Use allEntriesMap to check all entries

      if (existing) {
        // Entry exists - preserve fixed amounts and payment data
        let amountToUse = entry.amount; // Use the recalculated amount from timelineEntries
        
        // If entry is fixed, always preserve its amount
        if (existing.is_fixed_amount) {
          amountToUse = existing.amount;
        } 
        // If entry is at startMonth (the changed entry), preserve its updated amount
        else if (entry.month === startMonth && changedEntry) {
          amountToUse = existing.amount; // Use the changed amount from database
        }
        // For entries after startMonth that are not fixed and not paid:
        // Use the recalculated amount from entry.amount (which was updated with adjustedAmount)
        // This ensures that when an entry is changed, all future entries get the recalculated amount
        // amountToUse is already set to entry.amount above, which has the recalculated value
        
        // Log if we're updating an entry after startMonth
        if (entry.month > startMonth && !existing.is_fixed_amount && !existing.is_paid && amountToUse !== parseFloat(existing.amount)) {
          console.log(`[generate-timeline] Will update entry ${existing.id} (month ${entry.month}): ${existing.amount} -> ${amountToUse}`);
          entriesToUpdateCount++;
        }
        
        entriesToUpsert.push({
          id: existing.id,
          leasing_id: entry.leasingId,
          month: entry.month,
          payment_date: entry.paymentDate.split('T')[0],
          amount: amountToUse, // This will be the recalculated amount for future entries
          is_projected: entry.isProjected,
          is_fixed_amount: existing.is_fixed_amount || false,
          // Preserve payment data
          is_paid: existing.is_paid || false,
          paid_date: existing.paid_date || null,
          actual_amount: existing.actual_amount || null,
          notes: existing.notes || null,
        });
      } else {
        // New entry
        entriesToUpsert.push({
          leasing_id: entry.leasingId,
          month: entry.month,
          payment_date: entry.paymentDate.split('T')[0],
          amount: entry.amount,
          is_projected: entry.isProjected,
          is_fixed_amount: false,
          is_paid: false,
          paid_date: null,
          actual_amount: null,
          notes: null,
        });
      }
    }

    // Delete entries that are no longer in the calculated timeline (but preserve fixed ones outside range)
    const calculatedKeys = new Set(timelineEntries.map(e => `${e.month}-${e.paymentDate.split('T')[0]}`));
    const entriesToDelete = (allExistingEntries || []).filter((e: any) => {
      const key = `${e.month}-${e.payment_date}`;
      return e.month >= startMonth && e.month <= calculationEndMonth && 
             !calculatedKeys.has(key) && !e.is_fixed_amount;
    });

    if (entriesToDelete.length > 0) {
      const idsToDelete = entriesToDelete.map((e: any) => e.id);
      await supabase
        .from('leasing_timeline_entries')
        .delete()
        .in('id', idsToDelete);
    }

    // Separate entries with IDs (updates) from entries without IDs (inserts)
    const entriesToUpdate = entriesToUpsert.filter(e => e.id);
    const entriesToInsert = entriesToUpsert.filter(e => !e.id);

    // Update existing entries
    if (entriesToUpdate.length > 0) {
      console.log(`[generate-timeline] Updating ${entriesToUpdate.length} entries in database (${entriesToUpdateCount} after startMonth)`);
      for (const entry of entriesToUpdate) {
        const { id, ...updateData } = entry;
        // Log the update to verify amounts are being updated
        if (entry.month > startMonth && !entry.is_fixed_amount) {
          console.log(`[generate-timeline] UPDATE SQL: entry ${id} (month ${entry.month}) amount: ${updateData.amount}`);
        }
        const { error: updateError } = await supabase
          .from('leasing_timeline_entries')
          .update(updateData)
          .eq('id', id);
        if (updateError) {
          console.error(`[generate-timeline] Error updating entry ${id}:`, updateError);
          throw updateError;
        }
      }
      console.log(`[generate-timeline] Successfully updated ${entriesToUpdate.length} entries`);
    } else {
      console.log(`[generate-timeline] No entries to update`);
    }

    // Insert new entries
    let insertedTimeline: any[] = [];
    if (entriesToInsert.length > 0) {
      const { data: inserted, error: insertError } = await supabase
        .from('leasing_timeline_entries')
        .insert(entriesToInsert)
        .select();
      if (insertError) throw insertError;
      insertedTimeline = inserted || [];
    }

    // Fetch all entries to return
    const { data: allEntries, error: fetchError } = await supabase
      .from('leasing_timeline_entries')
      .select('*')
      .eq('leasing_id', id)
      .gte('month', startMonth)
      .lte('month', endMonth)
      .order('month', { ascending: true })
      .order('payment_date', { ascending: true });

    if (fetchError) throw fetchError;

    return NextResponse.json(allEntries || [], { status: 201 });
  } catch (error: any) {
    console.error('Error generating leasing timeline:', error);
    return NextResponse.json(
      { error: 'Failed to generate leasing timeline', details: error.message },
      { status: 500 }
    );
  }
}

