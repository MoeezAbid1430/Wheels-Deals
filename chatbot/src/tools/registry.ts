import { appConfig } from '../config.js';
import { BackendApiClient } from '../adapters/backendApi.js';
import type { ToolExecutionContext } from '../types.js';

type ToolDefinition = {
  type: 'function';
  name: string;
  description: string;
  parameters: Record<string, unknown>;
};

type ToolHandler = (args: Record<string, unknown>, context: ToolExecutionContext) => Promise<unknown>;

const backendApi = new BackendApiClient();

const allTools: Array<{ definition: ToolDefinition; handler: ToolHandler }> = [
  {
    definition: {
      type: 'function',
      name: 'search_listings',
      description: 'Search fixed-price marketplace listings or listing candidates for a user query, city, make, model, or budget.',
      parameters: {
        type: 'object',
        properties: {
          q: { type: 'string', description: 'User search phrase or car request.' },
          city: { type: 'string' },
          make: { type: 'string' },
          model: { type: 'string' },
          type: { type: 'string', enum: ['marketplace', 'auction', 'all'] },
          minPrice: { type: 'number' },
          maxPrice: { type: 'number' },
          minYear: { type: 'number' },
          maxYear: { type: 'number' },
          bodyStyle: { type: 'string' },
        },
        additionalProperties: false,
      },
    },
    handler: (args, context) => backendApi.searchListings(args as any, context),
  },
  {
    definition: {
      type: 'function',
      name: 'get_listing_details',
      description: 'Fetch detailed information for a single listing so the assistant can explain price, condition, seller trust, or fitment relevance.',
      parameters: {
        type: 'object',
        properties: {
          listingId: { type: 'string' },
        },
        required: ['listingId'],
        additionalProperties: false,
      },
    },
    handler: (args, context) => backendApi.getListingDetails(String(args.listingId), context),
  },
  {
    definition: {
      type: 'function',
      name: 'get_live_auction_status',
      description: 'Fetch live auction status, timing, and current auction state for a specific auction.',
      parameters: {
        type: 'object',
        properties: {
          auctionId: { type: 'string' },
        },
        required: ['auctionId'],
        additionalProperties: false,
      },
    },
    handler: (args, context) => backendApi.getAuctionStatus(String(args.auctionId), context),
  },
  {
    definition: {
      type: 'function',
      name: 'get_user_garage',
      description: 'Fetch the signed-in user garage state to personalize vehicle, accessory, and ownership guidance.',
      parameters: {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
    },
    handler: (_args, context) => backendApi.getGarage(context),
  },
  {
    definition: {
      type: 'function',
      name: 'find_services_nearby',
      description: 'Search repair shops and nearby automotive services such as workshops, inspection centers, car washes, and tyre shops.',
      parameters: {
        type: 'object',
        properties: {
          city: { type: 'string' },
          category: { type: 'string' },
          q: { type: 'string' },
          verifiedOnly: { type: 'boolean' },
        },
        additionalProperties: false,
      },
    },
    handler: (args, context) => backendApi.findServices(args as any, context),
  },
  {
    definition: {
      type: 'function',
      name: 'compare_vehicles',
      description: 'Fetch and compare two listings when the user asks for a direct vehicle comparison.',
      parameters: {
        type: 'object',
        properties: {
          listingIds: {
            type: 'array',
            items: { type: 'string' },
            minItems: 2,
            maxItems: 2,
          },
        },
        required: ['listingIds'],
        additionalProperties: false,
      },
    },
    handler: (args, context) => backendApi.compareVehicles((args.listingIds as string[]) || [], context),
  },
  {
    definition: {
      type: 'function',
      name: 'get_auction_rules',
      description: 'Fetch auction rules and deposit policies so the assistant can explain process, reserve, anti-sniping, and payment expectations.',
      parameters: {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
    },
    handler: (_args, context) => backendApi.getAuctionRules(context),
  },
  {
    definition: {
      type: 'function',
      name: 'get_recommendations',
      description: 'Fetch personalized or surface-level recommendations for home, browsing, or follow-up discovery.',
      parameters: {
        type: 'object',
        properties: {
          city: { type: 'string' },
          limit: { type: 'number' },
          q: { type: 'string' },
        },
        additionalProperties: false,
      },
    },
    handler: (args, context) => backendApi.getRecommendations(args as any, context),
  },
  {
    definition: {
      type: 'function',
      name: 'predict_vehicle_price',
      description: 'Predict fair Pakistan-market vehicle price using reusable local comparable-sales weights and app listing data.',
      parameters: {
        type: 'object',
        properties: {
          listingId: { type: 'string', description: 'Existing listing id, when available.' },
          make: { type: 'string' },
          model: { type: 'string' },
          variant: { type: 'string' },
          city: { type: 'string' },
          year: { type: 'number' },
          mileageKm: { type: 'number' },
          engineCapacityCc: { type: 'number' },
          transmission: { type: 'string' },
          powertrain: { type: 'string' },
          bodyStyle: { type: 'string' },
          inspectionScore: { type: 'number' },
          trustScore: { type: 'number' },
          askingPrice: { type: 'number' },
        },
        additionalProperties: false,
      },
    },
    handler: (args, context) => backendApi.predictVehiclePrice(args, context),
  },
];

export class ToolRegistry {
  readonly definitions: ToolDefinition[];
  private readonly handlers: Map<string, ToolHandler>;

  constructor() {
    const enabled = new Set(appConfig.allowedToolNames);
    const activeTools = allTools.filter((tool) => enabled.has(tool.definition.name));
    this.definitions = activeTools.map((tool) => tool.definition);
    this.handlers = new Map(activeTools.map((tool) => [tool.definition.name, tool.handler]));
  }

  async invoke(name: string, args: Record<string, unknown>, context: ToolExecutionContext) {
    const handler = this.handlers.get(name);
    if (!handler) {
      return {
        ok: false,
        error: `Tool "${name}" is not enabled.`,
      };
    }

    return handler(args, context);
  }
}
