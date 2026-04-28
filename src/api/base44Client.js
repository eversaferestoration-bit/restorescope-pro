import { createClient } from '@base44/sdk';

const BASE_URL =
  import.meta.env.VITE_BASE44_APP_BASE_URL ||
  'https://restore-scope-flow.base44.app';

const APP_ID =
  import.meta.env.VITE_BASE44_APP_ID ||
  'cbef744a8545c389ef439ea6';

export const base44 = createClient({
  appId: APP_ID,
  baseUrl: BASE_URL,
});