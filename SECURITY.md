# Security notes

- Never commit `.env.local` or any service-role credential.
- Browser and server runtime use the Supabase anon key plus RLS; no service-role client is included.
- `profiles.role` is initialized to `user`; a database trigger blocks user-side role changes.
- Platform admin assignment is a trusted operator action only.
- `businesses.owner_id` is unique and owner changes are constrained by RLS.
- Anonymous storefront reads use `business_storefronts`, a public-safe view that omits `owner_id` and returns published businesses only.
- Products, settings, and Storage mutations are protected by RLS policies and business ownership helper functions.
- Uploads are limited to JPEG/PNG/WebP, maximum 5 MB, with server-side signature checks.
- User-provided URLs are limited to HTTP(S) before being rendered as outbound links.
- Cart is a WhatsApp pre-order helper, not an order/payment database. Both direct-order and cart handoffs recheck current catalog state before generating the WhatsApp handoff.

## Before public launch

- Configure Supabase SMTP and redirect allowlists.
- Execute all two-user RLS tests in `TESTING.md`.
- Add production-grade application rate limiting for public endpoints and auth-adjacent flows. Supabase Auth has provider-side limits, but this repository does not yet include a distributed app-level rate limiter.
- Review CSP/security headers and configure monitoring/error reporting.
- Review the initial SQL migration and backups before any production application.
