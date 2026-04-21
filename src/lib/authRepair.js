/**
 * authRepair.js
 * Utilities for detecting and recovering from broken auth/profile states.
 * Called after a successful login to ensure UserProfile + Company exist.
 */
import { base44 } from '@/api/base44Client';

/**
 * Normalize an email address: trim whitespace and lowercase.
 * @param {string} email
 * @returns {string}
 */
export function normalizeEmail(email = '') {
  return email.trim().toLowerCase();
}

/**
 * Inspect the current user's account state and return a diagnosis.
 * Logs each check to the console for debugging.
 *
 * @param {object} user - user object from base44.auth.me()
 * @returns {Promise<{ hasProfile: boolean, hasCompany: boolean, profile: object|null, company: object|null }>}
 */
export async function diagnoseAccountState(user) {
  const email = normalizeEmail(user?.email || '');
  console.log('[authRepair] Diagnosing account state for:', email);

  let profile = null;
  let company = null;
  let hasProfile = false;
  let hasCompany = false;

  try {
    const profiles = await base44.entities.UserProfile.filter(
      { user_id: user.id, is_deleted: false },
      '-created_date',
      1
    );
    hasProfile = profiles.length > 0;
    profile = profiles[0] || null;
    console.log('[authRepair] UserProfile exists:', hasProfile, profile?.id || '—');
  } catch (e) {
    console.warn('[authRepair] Failed to fetch UserProfile:', e?.message);
  }

  if (hasProfile && profile?.company_id) {
    try {
      const companies = await base44.entities.Company.filter(
        { id: profile.company_id, is_deleted: false },
        '-created_date',
        1
      );
      hasCompany = companies.length > 0;
      company = companies[0] || null;
      console.log('[authRepair] Company exists:', hasCompany, company?.id || '—');
    } catch (e) {
      console.warn('[authRepair] Failed to fetch Company:', e?.message);
    }
  } else if (!hasProfile) {
    // Try finding a company by created_by email as a fallback
    try {
      const companies = await base44.entities.Company.filter(
        { created_by: email, is_deleted: false },
        '-created_date',
        1
      );
      hasCompany = companies.length > 0;
      company = companies[0] || null;
      console.log('[authRepair] Company by email exists:', hasCompany, company?.id || '—');
    } catch (e) {
      console.warn('[authRepair] Failed to fetch Company by email:', e?.message);
    }
  }

  return { hasProfile, hasCompany, profile, company };
}

/**
 * If a UserProfile is missing but a matching Company exists, create a minimal UserProfile
 * so the user can continue without being stuck.
 *
 * @param {object} user - user object from base44.auth.me()
 * @param {object} company - Company record
 * @returns {Promise<object|null>} the created UserProfile or null on failure
 */
export async function repairMissingUserProfile(user, company) {
  console.log('[authRepair] Attempting to repair missing UserProfile for user:', user.id);
  try {
    const profile = await base44.entities.UserProfile.create({
      user_id: user.id,
      company_id: company.id,
      email: normalizeEmail(user.email),
      full_name: user.full_name || '',
      role: 'admin',
      onboarding_status: 'onboarding_completed',
      current_onboarding_step: 6,
      is_deleted: false,
    });
    console.log('[authRepair] UserProfile repaired successfully:', profile.id);
    return profile;
  } catch (e) {
    console.error('[authRepair] Failed to repair UserProfile:', e?.message);
    return null;
  }
}