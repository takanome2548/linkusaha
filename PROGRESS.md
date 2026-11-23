# LinkUsaha development progress

**Current baseline:** Initial MVP source implementation (v0.1.0)  
**Master specification:** LinkUsaha v3.0, sections 1–27  
**Repository state:** Created from scratch in the ChatGPT workspace

## Implemented in source

- [x] Next.js App Router + JavaScript project configuration
- [x] Chakra UI v3 provider and shared action button
- [x] Supabase browser/server clients and session middleware
- [x] Register, login, logout, email confirmation callback, password reset, email/name updates
- [x] One-business-per-user data model and unique constraints
- [x] Business onboarding and settings (slug, category, WhatsApp, description, address, maps, social, hours, extra contact, theme, logo, cover)
- [x] Product create/read/update/delete, image upload, price/availability/active/order fields
- [x] Default storefront with five theme presets and conditional sections
- [x] Direct WhatsApp ordering and optional multi-product cart
- [x] Server-side cart availability/price re-check endpoint
- [x] Draft/published/unpublished visibility model
- [x] Platform admin business list and publication status management
- [x] Database migration, RLS policies, public-safe storefront view, Storage policies
- [x] SEO metadata, canonical URL, sitemap, robots
- [x] README, testing plan, deployment checklist, security notes

## Verified in this workspace

- [x] `npm test`: 8/8 helper unit tests pass
- [x] JavaScript/JSX syntax transpilation using the installed TypeScript parser: pass
- [x] `package.json` JSON parse: pass

## Not verified yet

- [ ] `npm install` / dependency resolution (registry network timed out in this workspace)
- [ ] ESLint
- [ ] Next.js production build
- [ ] Supabase migration execution
- [ ] Supabase Auth email flows
- [ ] RLS cross-account integration tests
- [ ] Storage upload policy tests
- [ ] Browser E2E and responsive visual checks
- [ ] Vercel deployment preview

## External prerequisites

A Supabase project URL and anon key are required to run the integrated app. Email confirmation/reset tests require valid Supabase Auth URL configuration and an email provider. No production deployment or database migration has been performed.

## Next development actions

1. Install dependencies in a network-enabled local environment.
2. Resolve any ESLint/build errors from the actual installed package versions.
3. Apply the migration to a NEW Supabase development project.
4. Run the two-user RLS and Storage test plan in `TESTING.md`.
5. Perform browser-based mobile/tablet/desktop tests.
6. Address any integration issues before calling the MVP ready for user trials.
