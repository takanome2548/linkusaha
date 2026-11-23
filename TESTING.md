# LinkUsaha test plan

## Automated tests currently runnable without external services

Run `npm test`.

- [x] Cart subtotal and total calculation
- [x] Quantity normalization/clamping
- [x] Structured WhatsApp cart message
- [x] Direct WhatsApp product message
- [x] Indonesian WhatsApp number normalization
- [x] Slug generation and reserved slug checks
- [x] HTTP(S) URL validation
- [x] Image MIME/signature validation
- [x] Indonesian Rupiah formatting

## Tests requiring installed dependencies

- [ ] ESLint (`npm run lint`)
- [ ] Next.js production build (`npm run build`)
- [ ] Browser E2E on desktop/mobile

## Tests requiring a configured Supabase project

Use two separate test accounts (User A and User B).

1. Register both accounts and confirm their emails.
2. Create a business as User A. Attempt a second insert for User A: database unique constraint must reject it.
3. Create a business as User B. Try to update/delete User B's business while signed in as User A: RLS must deny it.
4. Try to update `profiles.role` as User A: trigger must reject role escalation.
5. Create products for both businesses. Verify cross-business CRUD is denied.
6. Upload an image into User A's business folder. Verify User B cannot upload, replace, or delete files in that folder.
7. Publish User A's business. Verify anonymous visitor can query `business_storefronts` and active products, but cannot query the private `businesses` table or see `owner_id`.
8. Set status to Draft and then Unpublished. Verify the storefront returns not found in both cases.
9. Toggle cart on and off. Verify the public page changes behavior without changing other businesses' settings.
10. Change a product's availability or price after adding it to a cart. The storefront should block sending and ask the visitor to review the updated cart.
11. Test password recovery and email update with the configured SMTP provider.

## Responsive checks

- [ ] 360px mobile viewport
- [ ] 390px mobile viewport
- [ ] 768px tablet viewport
- [ ] 1280px desktop viewport
- [ ] Keyboard navigation and visible focus
- [ ] Form error/loading/success states

Do not mark any Supabase or browser test as passed until it has been executed against a configured environment.
