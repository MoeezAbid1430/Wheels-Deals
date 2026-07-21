import { appConfig } from '../config.js';
import type { ToolExecutionContext } from '../types.js';

type QueryValue = string | number | boolean | Array<string | number | boolean> | null | undefined;
type QueryParams = Record<string, QueryValue>;

const withQuery = (path: string, query?: QueryParams) => {
  const url = new URL(`${appConfig.backendBaseUrl}${path.startsWith('/') ? path : `/${path}`}`);
  Object.entries(query || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    if (Array.isArray(value)) {
      value.forEach((item) => url.searchParams.append(key, String(item)));
      return;
    }
    url.searchParams.set(key, String(value));
  });
  return url;
};

export class BackendApiClient {
  private async request(path: string, init: RequestInit = {}, authToken?: string, query?: QueryParams) {
    let lastError: unknown;

    for (let attempt = 0; attempt <= appConfig.liveToolRetries; attempt += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), appConfig.liveToolTimeoutMs);

      try {
        const response = await fetch(withQuery(path, query), {
          ...init,
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
            ...(init.headers || {}),
          },
        });

        clearTimeout(timeout);
        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          if (response.status >= 500 && attempt < appConfig.liveToolRetries) continue;
          return {
            ok: false,
            status: response.status,
            error: payload?.error || payload?.message || response.statusText,
            payload,
          };
        }

        return {
          ok: true,
          status: response.status,
          payload,
        };
      } catch (error) {
        clearTimeout(timeout);
        lastError = error;
        if (attempt < appConfig.liveToolRetries) continue;
      }
    }

    return {
      ok: false,
      status: 0,
      error: lastError instanceof Error ? lastError.message : 'Backend request failed.',
    };
  }

  searchListings(query: QueryParams, context: ToolExecutionContext) {
    return this.request('/search/listings', { method: 'GET' }, context.authToken, query);
  }

  getListingDetails(listingId: string, context: ToolExecutionContext) {
    return this.request(`/listings/${listingId}`, { method: 'GET' }, context.authToken);
  }

  getAuctionStatus(auctionId: string, context: ToolExecutionContext) {
    return this.request(`/auctions/${auctionId}/status`, { method: 'GET' }, context.authToken);
  }

  getGarage(context: ToolExecutionContext) {
    return this.request('/garage', { method: 'GET' }, context.authToken);
  }

  findServices(query: QueryParams, context: ToolExecutionContext) {
    return this.request('/repair-shops', { method: 'GET' }, context.authToken, query);
  }

  getAuctionRules(context: ToolExecutionContext) {
    return this.request('/auction-rules', { method: 'GET' }, context.authToken);
  }

  getRecommendations(query: QueryParams, context: ToolExecutionContext) {
    return this.request('/recommendations/home', { method: 'GET' }, context.authToken, query);
  }

  predictVehiclePrice(payload: Record<string, unknown>, context: ToolExecutionContext) {
    return this.request('/ai/price-prediction', {
      method: 'POST',
      body: JSON.stringify(payload),
    }, context.authToken);
  }

  async compareVehicles(listingIds: string[], context: ToolExecutionContext) {
    const [leftId, rightId] = listingIds;
    const [left, right] = await Promise.all([
      this.getListingDetails(leftId, context),
      this.getListingDetails(rightId, context),
    ]);

    return {
      ok: left.ok && right.ok,
      left: left.payload,
      right: right.payload,
      comparedFields: ['price', 'year', 'make', 'model', 'variant', 'city', 'bodyStyle', 'transmission', 'engineCapacityCc'],
    };
  }
}
