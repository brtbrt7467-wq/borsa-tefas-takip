# TEFAS API Client

A TypeScript client library for TEFAS (Turkish Electronic Fund Information System). Works in both browsers and Node.js.

## Features

- Search funds by code or name prefix
- Fetch merged fund data (history + allocation + optional fund details)
- Fuzzy date support (`today`, `yesterday`, `last week`, `last month`)
- Built-in performance metrics calculator
- Pluggable async cache adapters (memory, Cloudflare KV, custom)
- Full TypeScript support

## Install

```bash
npm install @firstthumb/tefas-api
```

## Quick Start

```typescript
import { TefasClient, FundType } from '@firstthumb/tefas-api';

const client = new TefasClient();

// Search (ApiResponse<SearchResult>)
const searchResponse = await client.searchFund('IPB', { limit: 5 });
const matches = searchResponse.results;

// Get merged fund data (ApiResponse<FundResponse>)
const fundResponse = await client.getFund('2024-01-01', '2024-01-31', 'IPB', FundType.YAT);
const funds = fundResponse.results;
```

## Public API

### `searchFund(query, options?)`

```typescript
const response = await client.searchFund('IPB', {
  fundType: FundType.YAT,
  limit: 10
});

for (const result of response.results) {
  console.log(result.fundCode, result.fundName, result.fundType);
}
```

- Returns: `Promise<ApiResponse<SearchResult>>`
- `SearchResult` includes: `fundCode`, `fundName`, `fundType`

### `getFund(startDate, endDate, fundCode?, fundType?, skipFundDetails = false)`

```typescript
// Specific fund, auto-detects fundType when omitted
const r1 = await client.getFund('2024-01-01', '2024-01-31', 'TGE');

// Explicit fund type filter
const r2 = await client.getFund('2024-01-01', '2024-01-31', undefined, FundType.EMK);

// Skip Fundfy detail fetch for faster bulk retrieval
const r3 = await client.getFund('2024-01-01', '2024-12-31', undefined, FundType.YAT, true);
```

- Returns: `Promise<ApiResponse<FundResponse>>`
- `getFund` is the primary public data method.
- If `fundCode` is provided and `fundType` is omitted, the client resolves the type automatically via search.

### Fuzzy Dates

```typescript
const response = await client.getFund('yesterday', 'today');
console.log(response.results.length);
```

Supported examples: `today`, `yesterday`, `last week`, `last month`.

### `setMaxDaysPerRequest(maxDays)`

Control internal chunk size for date-range requests.

```typescript
client.setMaxDaysPerRequest(30); // valid: integer 1..365
```

Validation rules:
- Must be an integer
- Must be between `1` and `365`

Use this when tuning request chunking for long date ranges.

## Response Fields (FundResponse)

`FundResponse` includes merged values from TEFAS history/content and Fundfy details.

Example fields:

```typescript
const record = (await client.getFund('2024-01-01', '2024-01-01', 'TGE')).results[0];

console.log(record.fundCode, record.fundName, record.fundType, record.date);
console.log(record.price, record.volume, record.assets, record.investorCount);
console.log(record.totalValue, record.stocks, record.bonds);

// Fundfy-enriched detail fields
console.log(record.auditFirm, record.founder, record.risk, record.yearlyManagementFee);
console.log(record.fundCategory, record.fundBenchmarks);
```

## Performance Metrics

```typescript
import { PerformanceCalculator, FundType } from '@firstthumb/tefas-api';

const response = await client.getFund('2024-01-01', '2024-12-31', undefined, FundType.YAT, true);
const metrics = PerformanceCalculator.calculateMetrics(response.results, {
  riskFreeRate: 0.10,
  frequency: 'daily',
  method: 'simple'
});
```

## Caching

The client uses async cache operations and supports custom adapters.

### Default Memory Cache

```typescript
const client = new TefasClient({
  cache: {
    enabled: true,
    ttl: 15 * 60 * 1000,
    maxSize: 1000
  }
});

await client.clearCache();
await client.invalidateCache('2024-01-01', '2024-01-31', 'TGE', FundType.EMK);
const stats = await client.getCacheStats();
const removed = await client.pruneCache();
```

### Cloudflare Workers KV

```typescript
import { TefasClient, CloudflareKVCacheAdapter } from '@firstthumb/tefas-api';

const cache = new CloudflareKVCacheAdapter({
  namespace: env.TEFAS_CACHE,
  ttl: 15 * 60 * 1000,
  prefix: 'tefas:'
});

const client = new TefasClient({ cacheAdapter: cache });
const response = await client.getFund('2024-01-01', '2024-01-31');
```

### Custom Cache Adapter

```typescript
import { CacheAdapter } from '@firstthumb/tefas-api';

class RedisCacheAdapter implements CacheAdapter<any> {
  async get(key: string) {
    const value = await redis.get(key);
    return value ? JSON.parse(value) : undefined;
  }

  async set(key: string, value: any, ttl?: number) {
    await redis.setEx(key, Math.floor((ttl ?? 900000) / 1000), JSON.stringify(value));
  }

  async delete(key: string) {
    return (await redis.del(key)) > 0;
  }

  async clear() {
    // implement for your backend
  }

  async has(key: string) {
    return (await redis.exists(key)) === 1;
  }
}
```

## Error Handling

```typescript
import {
  ValidationError,
  TefasApiError,
  NetworkError,
  FundNotFoundError,
  isValidationError,
  isNetworkError,
  isTefasApiError
} from '@firstthumb/tefas-api';

try {
  const response = await client.getFund('2024-01-01', '2024-01-31', 'TGE');
  console.log(response.results.length);
} catch (error) {
  if (isValidationError(error) || error instanceof ValidationError) {
    console.error('Validation error:', error.message);
  } else if (error instanceof FundNotFoundError) {
    console.error('Fund not found:', error.message);
  } else if (isTefasApiError(error) || error instanceof TefasApiError) {
    console.error('TEFAS API error:', error.message);
  } else if (isNetworkError(error) || error instanceof NetworkError) {
    console.error('Network error:', error.message);
  }
}
```

## Requirements

- Node.js 18+
- Modern browser with `fetch` support

## Development

```bash
npm install
npm test
npm run build
```

## License

MIT
