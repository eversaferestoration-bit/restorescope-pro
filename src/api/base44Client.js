import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';

const { appId, token, functionsVersion, appBaseUrl } = appParams;

console.log('[base44Client] Initializing SDK | appId:', appId, '| hasToken:', !!token, '| tokenPrefix:', token?.slice(0, 10) || 'none');

//Create a client with authentication required
export const base44 = createClient({
  appId,
  token,
  functionsVersion,
  serverUrl: '',
  requiresAuth: false,
  appBaseUrl
});