/**
 * authRepair.js
 * Utilities for detecting and recovering from broken auth/profile states.
 * Called post-login by ProtectedRoute to auto-repair missing UserProfile records.
 */
import { base44 } from '@/api/base44Client';

/**
 * Normalize an email address: trim whitespace and convert to lowercase.
 * @param {string} email
 * @returns {string}
 */
export function normalizeEmail(email = '') {
  return email.trim().toLowerCase();
}

/**
 * If a UserProfile is missing but a matching Company exists (by created_by email),
 * auto-create a minimal UserProfile so the user can proceed without being stuck.
 *
 * @param {object} user   - user object from base44.auth.me()
 * @param {object} company - Company record found by email lookup
 * @returns {Promise<object|null>} the created UserProfile or null on failure
 */
export async function repairMissingUserProfile(user, company) {
  const email = normalizeEmail(user?.email || '');
  console.log('[authRepair] Repairing missing UserProfile for:', email, '| company:', company?.id);
  try {
    const profile = await base44.entities.UserProfile.create({
      user_id: user.id,
      company_id: company.id,
      email,
      full_name: user.full_name || '',
      role: 'admin',
      onboarding_status: 'onboarding_completed',
      current_onboarding_step: 6,
      is_deleted: false,
    });
    console.log('[authRepair] UserProfile repaired successfully:', profile.id);
    return profile;
  } catch (e) {
    console.error('[authRepair] Failed to repair UserProfile:', e?.message || 'unknown error');
    return null;
  }
}