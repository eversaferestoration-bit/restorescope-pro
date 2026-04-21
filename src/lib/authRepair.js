/**
 * authRepair.js
 * Utilities for detecting and recovering from broken auth/profile states.
 */
import { base44 } from '@/api/base44Client';

export function normalizeEmail(email = '') {
  return email.trim().toLowerCase();
}

/**
 * Diagnose the account state for an authenticated user.
 * Returns one of:
 *   'ok'                   — fully set up
 *   'no_profile'           — auth user exists but no UserProfile
 *   'no_company'           — UserProfile exists but company missing/deleted
 *   'onboarding_incomplete'— UserProfile exists, company exists, but onboarding not done
 */
export async function diagnoseAccountState(user) {
  const email = normalizeEmail(user?.email || '');

  // 1. Check for UserProfile
  const profiles = await base44.entities.UserProfile.filter(
    { user_id: user.id, is_deleted: false }, '-created_date', 1
  ).catch(() => []);

  if (profiles.length === 0) {
    return { state: 'no_profile', profile: null, company: null };
  }

  const profile = profiles[0];

  // 2. Check onboarding completion
  const INCOMPLETE = [
    'account_created', 'company_started', 'company_completed',
    'role_selected', 'pricing_profile_set',
  ];

  // 3. Check company
  if (!profile.company_id) {
    return { state: 'no_company', profile, company: null };
  }

  const companies = await base44.entities.Company.filter(
    { id: profile.company_id, is_deleted: false }, '-created_date', 1
  ).catch(() => []);

  if (companies.length === 0) {
    return { state: 'no_company', profile, company: null };
  }

  const company = companies[0];

  if (INCOMPLETE.includes(profile.onboarding_status)) {
    return { state: 'onboarding_incomplete', profile, company };
  }

  return { state: 'ok', profile, company };
}

/**
 * Repair a missing UserProfile when a company already exists for this user.
 * Safe — never deletes or overwrites existing data.
 */
export async function repairMissingUserProfile(user, company) {
  const email = normalizeEmail(user?.email || '');
  console.log('[authRepair] Repairing UserProfile for:', email, '| company:', company?.id);
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
    console.log('[authRepair] UserProfile repaired:', profile.id);
    return profile;
  } catch (e) {
    console.error('[authRepair] Failed to repair UserProfile:', e?.message);
    return null;
  }
}

/**
 * Full repair: given a user, attempt to fix any partial state.
 * Returns { fixed: bool, action: string }
 */
export async function repairPartialAccount(user) {
  const email = normalizeEmail(user?.email || '');
  const { state, profile, company } = await diagnoseAccountState(user);

  if (state === 'ok') return { fixed: true, action: 'already_ok' };

  if (state === 'no_profile') {
    // Try to find a company created by this user's email
    const companiesByEmail = await base44.entities.Company.filter(
      { created_by: email, is_deleted: false }, '-created_date', 1
    ).catch(() => []);

    if (companiesByEmail.length > 0) {
      const repaired = await repairMissingUserProfile(user, companiesByEmail[0]);
      return { fixed: !!repaired, action: 'profile_created' };
    }
    // No company — user needs to go through onboarding
    return { fixed: false, action: 'needs_onboarding' };
  }

  if (state === 'no_company') {
    // Profile exists but company is gone — reset onboarding so user rebuilds company
    await base44.entities.UserProfile.update(profile.id, {
      onboarding_status: 'account_created',
      current_onboarding_step: 1,
      company_id: '',
    }).catch(() => {});
    return { fixed: false, action: 'needs_onboarding' };
  }

  if (state === 'onboarding_incomplete') {
    return { fixed: false, action: 'needs_onboarding' };
  }

  return { fixed: false, action: 'unknown' };
}