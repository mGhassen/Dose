// Recalculate Leasing Timeline After Entry Update
// This endpoint only updates affected entries, doesn't regenerate everything

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const entryId = searchParams.get('entryId'); // Required: ID of the entry that was changed
    
    if (!entryId) {
      return NextResponse.json({ error: 'entryId is required' }, { status: 400 });
    }
    
    const supabase = createServerSupabaseClient();
    
    // Fetch leasing to get totalAmount
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

    const totalAmount = leasingData.total_amount ? parseFloat(leasingData.total_amount) : null;
    const leaseEndMonth = leasingData.end_date ? new Date(leasingData.end_date).toISOString().slice(0, 7) : null;
    
    // Fetch the changed entry
    const { data: changedEntry, error: entryError } = await supabase
      .from('leasing_timeline_entries')
      .select('*')
      .eq('id', entryId)
      .eq('leasing_id', id)
      .single();

    if (entryError || !changedEntry) {
      return NextResponse.json({ error: 'Changed entry not found' }, { status: 404 });
    }

    const changedMonth = changedEntry.month;
    const changedAmount = parseFloat(changedEntry.amount);
    
    // Note: If entry is fixed, we still recalculate OTHER entries, just not this one
    // The fixed entry's amount is used in the calculation but won't be changed
    
    // Fetch all existing entries for the lease period FIRST
    const { data: allEntries, error: allEntriesError } = await supabase
      .from('leasing_timeline_entries')
      .select('*')
      .eq('leasing_id', id)
      .order('month', { ascending: true })
      .order('payment_date', { ascending: true });

    if (allEntriesError) throw allEntriesError;
    
    // Fetch actual payments to determine which entries are partially paid
    const { data: actualPayments, error: paymentsError } = await supabase
      .from('actual_payments')
      .select('*')
      .eq('payment_type', 'leasing')
      .eq('reference_id', id);
    
    if (paymentsError) {
      console.warn(`[recalculate-timeline] Could not fetch actual payments:`, paymentsError);
    }
    
    // Create a map of total paid per entry (by month)
    const paidByMonth = new Map<string, number>();
    (actualPayments || []).forEach((payment: any) => {
      const month = payment.month; // YYYY-MM format
      const current = paidByMonth.get(month) || 0;
      paidByMonth.set(month, current + parseFloat(payment.amount || 0));
    });
    
    // Helper function to check if entry is partially paid
    const isPartiallyPaid = (entry: any): boolean => {
      const totalPaid = paidByMonth.get(entry.month) || 0;
      const entryAmount = parseFloat(entry.amount);
      return totalPaid > 0 && totalPaid < entryAmount;
    };
    
    // Helper function to check if entry is fully paid
    const isFullyPaid = (entry: any): boolean => {
      return entry.is_paid || (paidByMonth.get(entry.month) || 0) >= parseFloat(entry.amount);
    };
    
    console.log(`\n========== RECALCULATE TIMELINE DEBUG ==========`);
    console.log(`[recalculate-timeline] Entry ${entryId} changed:`);
    console.log(`  - Month: ${changedMonth}`);
    console.log(`  - New Amount: ${changedAmount}`);
    console.log(`  - Is Fixed: ${changedEntry.is_fixed_amount}`);
    console.log(`  - Is Paid: ${changedEntry.is_paid}`);
    console.log(`  - Total Amount (leasing): ${totalAmount}`);
    console.log(`  - Lease End Month: ${leaseEndMonth || 'N/A'}`);
    console.log(`\n[recalculate-timeline] All entries (${allEntries.length} total):`);
    allEntries.forEach((e: any, idx: number) => {
      const isChanged = e.id === parseInt(entryId);
      const isBefore = e.month < changedMonth;
      const isAfter = e.month > changedMonth;
      const isSameMonth = e.month === changedMonth && !isChanged;
      const totalPaid = paidByMonth.get(e.month) || 0;
      const isPartially = isPartiallyPaid(e);
      const isFully = isFullyPaid(e);
      const isAdjustable = isAfter && !e.is_fixed_amount && !isFully && !isPartially;
      console.log(`  [${idx + 1}] Entry ${e.id}: month=${e.month}, amount=${parseFloat(e.amount)}, fixed=${e.is_fixed_amount}, paid=${e.is_paid}, actualPaid=${totalPaid}, partially=${isPartially}, fully=${isFully} ${isChanged ? '<<< CHANGED' : ''} ${isAdjustable ? '<<< ADJUSTABLE' : ''}`);
    });

    if (totalAmount) {
      // Calculate sum of all "locked" amounts:
      // - All entries before changedMonth
      // - The changed entry's NEW amount
      // - Other entries in the same month as changedMonth
      // - All entries AFTER changedMonth that are fixed or paid (they're locked too)
      let allocatedSum = 0;
      const breakdown: string[] = [];
      
      allEntries.forEach((e: any) => {
        const amount = parseFloat(e.amount);
        if (e.month === changedMonth && e.id === parseInt(entryId)) {
          // The changed entry: use its NEW amount (always locked)
          allocatedSum += changedAmount;
          breakdown.push(`  CHANGED: Entry ${e.id} (${e.month}): ${changedAmount} (NEW AMOUNT)`);
        } else if (e.month === changedMonth) {
          // Other entries in same month: include them (locked)
          allocatedSum += amount;
          breakdown.push(`  SAME MONTH: Entry ${e.id} (${e.month}): ${amount}`);
        } else if (e.is_fixed_amount || isFullyPaid(e) || isPartiallyPaid(e)) {
          // Entries that are fixed, fully paid, or partially paid: include them (they're locked)
          // This applies to entries both BEFORE and AFTER the changed month
          allocatedSum += amount;
          const reasons: string[] = [];
          if (e.is_fixed_amount) reasons.push('FIXED');
          if (isFullyPaid(e)) reasons.push('FULLY_PAID');
          if (isPartiallyPaid(e)) reasons.push('PARTIALLY_PAID');
          const position = e.month < changedMonth ? 'BEFORE' : 'AFTER';
          breakdown.push(`  ${position} (LOCKED): Entry ${e.id} (${e.month}): ${amount} [${reasons.join(', ')}]`);
        }
        // Entries that are NOT fixed, NOT paid, and NOT partially paid are NOT included in allocatedSum
        // They will be in the adjustableEntries list and will be recalculated
      });

      const remainingAmount = totalAmount - allocatedSum;
      console.log(`\n[recalculate-timeline] CALCULATION BREAKDOWN:`);
      breakdown.forEach(line => console.log(line));
      console.log(`\n[recalculate-timeline] SUM OF LOCKED AMOUNTS: ${allocatedSum}`);
      console.log(`[recalculate-timeline] TOTAL AMOUNT: ${totalAmount}`);
      console.log(`[recalculate-timeline] REMAINING TO DISTRIBUTE: ${remainingAmount}`);

      // Find all adjustable entries (not fixed, not fully paid, not partially paid, and not the changed entry)
      // These can be BEFORE or AFTER the changed month - we recalculate ALL of them
      const adjustableEntries = allEntries.filter((e: any) => 
        e.id !== parseInt(entryId) && // Not the changed entry itself
        !e.is_fixed_amount && 
        !isFullyPaid(e) &&
        !isPartiallyPaid(e) &&
        (!leaseEndMonth || e.month <= leaseEndMonth)
      );

      console.log(`\n[recalculate-timeline] ADJUSTABLE ENTRIES (${adjustableEntries.length} found):`);
      adjustableEntries.forEach((e: any, idx: number) => {
        console.log(`  [${idx + 1}] Entry ${e.id}: month=${e.month}, current_amount=${parseFloat(e.amount)}`);
      });

      if (adjustableEntries.length > 0) {
        const amountPerEntry = remainingAmount > 0 ? remainingAmount / adjustableEntries.length : 0;
        console.log(`\n[recalculate-timeline] DISTRIBUTION:`);
        console.log(`  - Remaining Amount: ${remainingAmount}`);
        console.log(`  - Adjustable Entries: ${adjustableEntries.length}`);
        console.log(`  - Amount Per Entry: ${amountPerEntry.toFixed(2)}`);
        console.log(`\n[recalculate-timeline] UPDATING ENTRIES IN DATABASE:`);

        // Update all adjustable entries in the database
        const updatePromises = adjustableEntries.map((entry: any) => {
          console.log(`  → Updating Entry ${entry.id} (${entry.month}): ${parseFloat(entry.amount)} → ${amountPerEntry.toFixed(2)}`);
          return supabase
            .from('leasing_timeline_entries')
            .update({ 
              amount: amountPerEntry,
              updated_at: new Date().toISOString()
            })
            .eq('id', entry.id);
        });

        const updateResults = await Promise.all(updatePromises);
        
        // Check for errors
        const errors = updateResults.filter(r => r.error);
        if (errors.length > 0) {
          console.error(`[recalculate-timeline] ❌ ERRORS updating entries:`, errors);
          throw new Error(`Failed to update ${errors.length} entries`);
        }

        console.log(`[recalculate-timeline] ✅ Successfully updated ${adjustableEntries.length} entries in database`);
        console.log(`========== END RECALCULATE DEBUG ==========\n`);
        return NextResponse.json({ 
          message: `Updated ${adjustableEntries.length} entries`,
          updatedCount: adjustableEntries.length,
          amountPerEntry: amountPerEntry,
          debug: {
            allocatedSum,
            remainingAmount,
            adjustableCount: adjustableEntries.length
          }
        }, { status: 200 });
      } else {
        console.log(`[recalculate-timeline] ⚠️  No adjustable entries found to update`);
        console.log(`[recalculate-timeline] All remaining amount (${remainingAmount}) is already allocated to fixed/paid entries`);
        console.log(`========== END RECALCULATE DEBUG ==========\n`);
        return NextResponse.json({ 
          message: 'No adjustable entries to update (all remaining entries are fixed or paid)',
          updatedCount: 0,
          debug: {
            allocatedSum,
            remainingAmount,
            adjustableCount: 0
          }
        }, { status: 200 });
      }
    } else {
      // No totalAmount - project the changed amount forward
      console.log(`\n[recalculate-timeline] NO TOTAL AMOUNT - Projecting changed amount forward`);
      const futureEntries = allEntries.filter((e: any) => 
        e.month > changedMonth && 
        !e.is_fixed_amount && 
        !isFullyPaid(e) &&
        !isPartiallyPaid(e) &&
        (!leaseEndMonth || e.month <= leaseEndMonth)
      );

      console.log(`[recalculate-timeline] Future entries to update (${futureEntries.length}):`);
      futureEntries.forEach((e: any, idx: number) => {
        console.log(`  [${idx + 1}] Entry ${e.id}: month=${e.month}, current=${parseFloat(e.amount)} → new=${changedAmount}`);
      });

      if (futureEntries.length > 0) {
        console.log(`\n[recalculate-timeline] UPDATING ENTRIES IN DATABASE:`);
        for (const entry of futureEntries) {
          console.log(`  → Updating Entry ${entry.id} (${entry.month}): ${parseFloat(entry.amount)} → ${changedAmount}`);
          const { error: updateError } = await supabase
            .from('leasing_timeline_entries')
            .update({ 
              amount: changedAmount,
              updated_at: new Date().toISOString()
            })
            .eq('id', entry.id);

          if (updateError) {
            console.error(`[recalculate-timeline] ❌ Error updating entry ${entry.id}:`, updateError);
            throw updateError;
          }
        }

        console.log(`[recalculate-timeline] ✅ Successfully updated ${futureEntries.length} entries in database`);
        console.log(`========== END RECALCULATE DEBUG ==========\n`);
        return NextResponse.json({ 
          message: `Updated ${futureEntries.length} entries`,
          updatedCount: futureEntries.length
        }, { status: 200 });
      }
    }

    console.log(`[recalculate-timeline] ⚠️  No entries to update`);
    console.log(`========== END RECALCULATE DEBUG ==========\n`);
    return NextResponse.json({ message: 'No entries to update' }, { status: 200 });
  } catch (error: any) {
    console.error('Error recalculating timeline:', error);
    return NextResponse.json(
      { error: 'Failed to recalculate timeline', details: error.message },
      { status: 500 }
    );
  }
}

