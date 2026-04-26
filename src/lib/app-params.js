const isBrowser = typeof window !== 'undefined';

function toSnakeCase(value) {
  return value.replace(/([A-Z])/g, '_$1').toLowerCase();
}

function getStorage() {
  if (!isBrowser) return null;
  return window.localStorage;
}

function getUrlParams() {
  if (!isBrowser) return new URLSearchParams();
  return new URLSearchParams(window.location.search);
}

function removeParamFromUrl(paramName) {
  if (!isBrowser) return;

  const params = getUrlParams();
  params.delete(paramName);

  const query = params.toString();
  const nextUrl = `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`;
  window.history.replaceState({}, document.title, nextUrl);
}

function getAppParamValue(paramName, { defaultValue = undefined, removeFromUrl = false } = {}) {
  const storage = getStorage();
  const storageKey = `base44_${toSnakeCase(paramName)}`;
  const params = getUrlParams();
  const valueFromUrl = params.get(paramName);

  if (valueFromUrl) {
    storage?.setItem(storageKey, valueFromUrl);
    if (removeFromUrl) removeParamFromUrl(paramName);
    return valueFromUrl;
  }

  if (removeFromUrl) removeParamFromUrl(paramName);

  const storedValue = storage?.getItem(storageKey);
  if (storedValue) return storedValue;

  if (defaultValue) {
    storage?.setItem(storageKey, defaultValue);
    return defaultValue;
  }

  return null;
}

function clearAccessTokenIfRequested() {
  if (getAppParamValue('clear_access_token') !== 'true') return;

  const storage = getStorage();
  storage?.removeItem('base44_access_token');
  storage?.removeItem('access_token');
  storage?.removeItem('token');
}

function getAppParams() {
  clearAccessTokenIfRequested();

  return {
    appId: getAppParamValue('app_id', { defaultValue: import.meta.env.VITE_BASE44_APP_ID }),
    token: getAppParamValue('access_token', { removeFromUrl: true }),
    fromUrl: getAppParamValue('from_url', {
      defaultValue: isBrowser ? window.location.href : '',
    }),
    functionsVersion: getAppParamValue('functions_version', {
      defaultValue: import.meta.env.VITE_BASE44_FUNCTIONS_VERSION,
    }),
    appBaseUrl: getAppParamValue('app_base_url', {
      defaultValue: import.meta.env.VITE_BASE44_APP_BASE_URL,
    }),
  };
}

export const appParams = getAppParams();
