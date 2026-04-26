import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';

const { appId, token, functionsVersion, appBaseUrl } = appParams;

if (!appId) {
  console.warn('[base44Client] Missing VITE_BASE44_APP_ID. Add it to .env.');
}

if (!appBaseUrl) {
  console.warn('[base44Client] Missing VITE_BASE44_APP_BASE_URL. Add it to .env.');
}

export const base44 = createClient({
  appId,
  token,
  functionsVersion,
  appBaseUrl,
  requiresAuth: false,
});
