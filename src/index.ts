import { CONFIG } from './config';
import { fetchAllFlightData } from './service';
import { ApiResponse, ErrorResponse, Env } from './types';
import { createJsonResponse } from './utils';

/**
 * Main worker entry point
 * Handles requests to /departures-pmi and /arrivals-pmi endpoints
 * Uses KV storage for caching responses
 */
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    try {
      const url = new URL(request.url);
      const path = url.pathname;

      // Handle CORS preflight requests
      if (request.method === 'OPTIONS') {
        return new Response(null, {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
          },
        });
      }

      // Only allow GET requests
      if (request.method !== 'GET') {
        return createJsonResponse(
          { error: 'Method not allowed' } as ErrorResponse,
          405
        );
      }

      // Route handling
      if (path === CONFIG.ENDPOINTS.DEPARTURES) {
        const flights = await fetchAllFlightData('departures', env);
        return createJsonResponse({
          totalFlights: flights.length,
          flights
        } as ApiResponse);

      } else if (path === CONFIG.ENDPOINTS.ARRIVALS) {
        const flights = await fetchAllFlightData('arrivals', env);
        return createJsonResponse({
          totalFlights: flights.length,
          flights
        } as ApiResponse);

      } else {
        return createJsonResponse(
          { error: 'Not Found' } as ErrorResponse,
          404
        );
      }

    } catch (error) {
      console.error('Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      return createJsonResponse(
        { error: errorMessage } as ErrorResponse,
        500
      );
    }
  },
};