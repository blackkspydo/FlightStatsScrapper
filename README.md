# FlightStatsScrapper

A Cloudflare Worker that scrapes flight data from FlightStats.com for Palma de Mallorca Airport (PMI).

## Features

- Fetches both departures and arrivals for PMI airport
- Covers 4 days of flight data (today + next 3 days)
- Handles overnight flights correctly
- Uses KV storage for caching responses (5-minute TTL)
- Concurrent requests for improved performance
- CORS support

## Endpoints

### Departures
```
GET /departures-pmi
```

### Arrivals
```
GET /arrivals-pmi
```

## Response Format

```json
{
  "totalFlights": number,
  "flights": [
    {
      "flightNumber": "string",
      "airline": "string",
      "departure": {
        "airport": "string",
        "city": "string",
        "time": "string", // 24-hour format (HH:mm)
        "date": "string"  // YYYY-MM-DD
      },
      "arrival": {
        "airport": "string",
        "city": "string",
        "time": "string", // 24-hour format (HH:mm)
        "date": "string"  // YYYY-MM-DD
      },
      "operatedBy": "string | null",
      "isCodeshare": boolean
    }
  ]
}
```

## Development

1. Install dependencies:
```bash
npm install
```

2. Run development server:
```bash
npm run dev
```

## Deployment

Deploy to Cloudflare Workers:
```bash
npm run deploy
```

## Technologies

- TypeScript
- Cloudflare Workers
- Cloudflare KV Storage
- Wrangler CLI