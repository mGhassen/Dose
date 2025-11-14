/**
 * Status mapping utilities for synchronizing member and account statuses
 * 
 * This module provides functions to map between member status and account status
 * to ensure consistency when creating or updating members with accounts.
 * 
 * Member status values: 'active', 'inactive', 'suspended'
 * Account status values: 'active', 'pending', 'suspended', 'archived'
 * 
 * Mapping rules:
 * - active member -> active account
 * - inactive member -> pending account (inactive members are pending reactivation)
 * - suspended member -> suspended account
 * - pending account -> inactive member
 * - archived account -> inactive member
 */

/**
 * Maps member status to corresponding account status
 * @param memberStatus - The member status value
 * @returns The corresponding account status value
 */
export function mapMemberStatusToAccountStatus(memberStatus: string): string {
  switch (memberStatus) {
    case 'active':
      return 'active';
    case 'inactive':
      return 'pending'; // Inactive members are pending reactivation
    case 'suspended':
      return 'suspended';
    default:
      // Default to pending for unknown statuses
      return 'pending';
  }
}

/**
 * Maps account status to corresponding member status
 * @param accountStatus - The account status value
 * @returns The corresponding member status value
 */
export function mapAccountStatusToMemberStatus(accountStatus: string): string {
  switch (accountStatus) {
    case 'active':
      return 'active';
    case 'pending':
      return 'inactive'; // Pending accounts are inactive members
    case 'suspended':
      return 'suspended';
    case 'archived':
      return 'inactive'; // Archived accounts are inactive members
    default:
      // Default to inactive for unknown statuses
      return 'inactive';
  }
}
