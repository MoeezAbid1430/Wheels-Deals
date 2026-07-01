const DEFAULT_TIMEOUT_MS = 30000;
const DEFAULT_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

export class ApiError extends Error {
  constructor(message, { status, payload } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

const buildUrl = (baseUrl, path, query) => {
  const url = new URL(`${baseUrl.replace(/\/$/, '')}${path}`, window.location.origin);

  Object.entries(query || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    if (Array.isArray(value)) {
      value.forEach((item) => url.searchParams.append(key, item));
      return;
    }
    url.searchParams.set(key, value);
  });

  return url.toString();
};

export const createHttpClient = ({ baseUrl = DEFAULT_BASE_URL, getToken, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) => {
  const request = async (method, path, { body, query, headers, signal } = {}) => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

    const token = getToken?.();
    const requestSignal = signal || controller.signal;

    try {
      const response = await fetch(buildUrl(baseUrl, path, query), {
        method,
        signal: requestSignal,
        headers: {
          Accept: 'application/json',
          ...(body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...headers,
        },
        body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
      });

      const contentType = response.headers.get('content-type') || '';
      const payload = contentType.includes('application/json') ? await response.json() : await response.text();

      if (!response.ok) {
        throw new ApiError(payload?.message || response.statusText || 'API request failed', {
          status: response.status,
          payload,
        });
      }

      return payload;
    } finally {
      window.clearTimeout(timeout);
    }
  };

  return {
    get: (path, options) => request('GET', path, options),
    post: (path, body, options) => request('POST', path, { ...options, body }),
    patch: (path, body, options) => request('PATCH', path, { ...options, body }),
    put: (path, body, options) => request('PUT', path, { ...options, body }),
    delete: (path, options) => request('DELETE', path, options),
  };
};

export const httpClient = createHttpClient();
