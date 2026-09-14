# Public Google search

The public `/search` page and `GET /api/search/web?q=...` work without login or a
wallet. The header and sidebar link to Search. The page bypasses wallet providers.
Token search at `/api/search`, trading, and paid research retain their gates.

Set `SERP_API_KEY` in the website server environment (`.env.local` for local Next.js).
Do not use a `NEXT_PUBLIC_` variable. Production also requires the existing Upstash
REST Redis configuration so limits apply across replicas; search returns 503 if
coordination is missing or unavailable. Development can use the in-process limiter.

Public limits are ten requests per client per minute and 100 provider requests
per shared 24-hour window. Client identity uses the existing trusted-proxy header
helper; configure the ingress to overwrite those headers. The global allowance
also bounds requests across client identities. Identical queries are coalesced and
cached in-process for ten minutes. Category changes use the loaded response.

Supported categories: web, shopping, videos (including carousels), images,
immersive products, product details, and top stories (flat and grouped). Google
may omit blocks. Only bounded display fields are returned; provider metadata,
credentials, and unsafe URL schemes are discarded. No full product-detail fetch
is made. Requests time out after 20 seconds and do not automatically retry.

Validation: route and limiter tests, server-rendered anonymous page test, and one
live anonymous route call returning HTTP 200 with seven linked web results.
Hosted deployment and browser interaction require separate verification.
