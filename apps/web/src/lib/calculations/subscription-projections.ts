// Subscription Projection Calculation Service
// Projects all subscriptions for timeline and budgeting based on recurrence patterns

import type { 
  Subscription, 
  SubscriptionProjection
} from '@kit/types';
import { ExpenseRecurrence, ExpenseCategory } from '@kit/types';

/**
 * Project a single subscription across a date range based on its recurrence pattern
 */
export function projectSubscription(
  subscription: Subscription,
  startMonth: string, // YYYY-MM
  endMonth: string // YYYY-MM
): SubscriptionProjection[] {
  const projections: SubscriptionProjection[] = [];
  const start = new Date(startMonth + '-01');
  const end = new Date(endMonth + '-01');
  end.setMonth(end.getMonth() + 1); // Set to first day of next month for comparison
  end.setDate(0); // Then go back to last day of target month
  
  const subscriptionStart = new Date(subscription.startDate);
  const subscriptionEnd = subscription.endDate ? new Date(subscription.endDate) : null;

  // Only project active subscriptions
  if (!subscription.isActive) {
    return projections;
  }

  // Handle recurring subscriptions
  let currentDate = new Date(Math.max(start.getTime(), subscriptionStart.getTime()));
  const finalDate = subscriptionEnd 
    ? new Date(Math.min(end.getTime(), subscriptionEnd.getTime())) 
    : end;

  while (currentDate <= finalDate) {
    const month = currentDate.toISOString().slice(0, 7); // YYYY-MM

    let shouldInclude = false;
    const amount = subscription.amount;

    switch (subscription.recurrence) {
      case ExpenseRecurrence.MONTHLY:
        // Include every month
        shouldInclude = true;
        break;

      case ExpenseRecurrence.QUARTERLY:
        // Include every 3 months (Jan, Apr, Jul, Oct)
        const monthNum = currentDate.getMonth();
        const startMonthNum = subscriptionStart.getMonth();
        shouldInclude = (monthNum - startMonthNum) % 3 === 0 && 
                       monthNum >= startMonthNum;
        break;

      case ExpenseRecurrence.YEARLY:
        // Include same month every year
        shouldInclude = currentDate.getMonth() === subscriptionStart.getMonth();
        break;

      case ExpenseRecurrence.CUSTOM:
        // For custom, treat as monthly for now
        // TODO: Add custom recurrence logic if needed
        shouldInclude = true;
        break;

      case ExpenseRecurrence.ONE_TIME:
        // Subscriptions should not be one-time, but handle it just in case
        const subscriptionMonth = subscriptionStart.toISOString().slice(0, 7);
        if (subscriptionMonth >= startMonth && subscriptionMonth <= endMonth) {
          if (subscriptionStart >= start && subscriptionStart <= end) {
            shouldInclude = true;
          }
        }
        break;
    }

    if (shouldInclude) {
      projections.push({
        month,
        subscriptionId: subscription.id,
        subscriptionName: subscription.name,
        category: subscription.category,
        amount,
        isProjected: currentDate > new Date(), // Projected if in the future
      });
    }

    // Move to next month
    currentDate = new Date(currentDate);
    currentDate.setMonth(currentDate.getMonth() + 1);
  }

  return projections;
}

/**
 * Project all subscriptions for a given year
 */
export function projectSubscriptionsForYear(
  subscriptions: Subscription[],
  year: string // YYYY
): SubscriptionProjection[] {
  const startMonth = `${year}-01`;
  const endMonth = `${year}-12`;
  const allProjections: SubscriptionProjection[] = [];

  for (const subscription of subscriptions) {
    const projections = projectSubscription(subscription, startMonth, endMonth);
    allProjections.push(...projections);
  }

  return allProjections.sort((a, b) => a.month.localeCompare(b.month));
}

