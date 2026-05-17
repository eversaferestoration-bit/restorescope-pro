import posthog from 'posthog-js';

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY;
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST;

export function initAnalytics() {
  if (!POSTHOG_KEY || !POSTHOG_HOST) return;

  try {
    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      capture_pageview: true,
      capture_pageleave: true,
      autocapture: false,
      session_recording: {
        maskAllInputs: true,
        maskInputOptions: {
          password: true,
          email: true,
        },
      },
      // Never capture these properties to protect sensitive data
      sanitize_properties: (properties) => {
        const BLOCKED_KEYS = [
          'password', 'ssn', 'credit_card', 'card_number', 'cvv',
          'insurance_policy', 'claim_number', 'private_notes',
          'payment_info', 'bank_account',
        ];
        const sanitized = { ...properties };
        for (const key of Object.keys(sanitized)) {
          if (BLOCKED_KEYS.some((b) => key.toLowerCase().includes(b))) {
            delete sanitized[key];
          }
        }
        return sanitized;
      },
    });
  } catch (err) {
    console.warn('[Analytics] PostHog init failed:', err?.message);
  }
}

export function identifyUser(user, userProfile) {
  if (!POSTHOG_KEY) return;
  if (!user?.id) return;

  try {
    posthog.identify(user.id, {
      email: user.email,
      name: user.full_name,
      role: user.role,
      company_id: userProfile?.company_id,
    });
  } catch (err) {
    console.warn('[Analytics] PostHog identify failed:', err?.message);
  }
}

export function resetAnalyticsUser() {
  if (!POSTHOG_KEY) return;
  try {
    posthog.reset();
  } catch (err) {
    console.warn('[Analytics] PostHog reset failed:', err?.message);
  }
}

export function track(event, properties = {}) {
  if (!POSTHOG_KEY) return;
  try {
    posthog.capture(event, properties);
  } catch (err) {
    console.warn('[Analytics] PostHog capture failed:', err?.message);
  }
}

// Typed event helpers
export const Analytics = {
  userLogin: (props = {}) => track('user_login', props),
  jobCreated: (props = {}) => track('job_created', props),
  estimateGenerated: (props = {}) => track('estimate_generated', props),
  invoiceSent: (props = {}) => track('invoice_sent', props),
  contractSigned: (props = {}) => track('contract_signed', props),
  paymentReceived: (props = {}) => track('payment_received', props),
  photoUploaded: (props = {}) => track('photo_uploaded', props),
  mobileAppError: (props = {}) => track('mobile_app_error', props),
};