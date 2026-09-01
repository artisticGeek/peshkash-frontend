# Peshkash Social Preview Requirements

Status: Proposed  
Scope: Peshkash public pages and crawler-facing `/share/...` routes  
Last updated: 2 September 2026

## 1. Purpose

Every public Peshkash link should produce a useful, page-specific preview when shared on WhatsApp, LinkedIn, Facebook, X, Slack, Discord, iMessage, and similar services.

The preview must tell the recipient what the link contains before they open it. A generic Peshkash logo is an acceptable emergency fallback, but it is not an acceptable default for an event, vendor, collection, or product with usable content.

The desired outcome is:

- a ChapterHer event link looks like a ChapterHer event;
- a vendor link looks like that vendor;
- a menu or collection link looks like that collection;
- an item link looks like that item;
- the Peshkash brand remains visible but does not overpower the subject being shared.

## 2. Current implementation and problem

Peshkash already shares crawler-friendly URLs through `API_BASE_URL/share/{previewPath}`. The backend returns server-rendered Open Graph and X metadata before redirecting visitors to the public page. This is the correct architectural surface for social crawlers.

The current gap is in `peshkash_backend/src/controllers/SharePreviewController.ts`: every preview uses the same fixed image:

`/brand/social/peshkash-whatsapp-dp.png`

The Vue `usePageMeta` composable can change metadata in a browser, but most messaging and social crawlers do not execute the client application reliably. The server-rendered `/share/...` response must therefore be the source of truth.

## 3. Goals

1. Return a relevant image, title, description, canonical URL, and content type for every supported public page.
2. Make event previews immediately recognisable to organisers and visitors.
3. Give administrators an explicit preview-image override without requiring a deployment.
4. Provide good automatic previews when no custom image has been uploaded.
5. Keep preview URLs stable, public, fast, cacheable, and safe for crawlers.
6. Allow a changed preview to be deliberately refreshed despite platform caching.
7. Keep the visual system recognisably Peshkash while prioritising the shared subject.

## 4. Non-goals

- Recreating the entire destination page inside the preview image.
- Placing interactive-looking buttons, QR codes, countdowns, or long descriptions inside the image.
- Tracking individual recipients through preview-image requests.
- Generating a different asset for every social network in the first release.
- Using a raw screenshot of the full page as the production preview.

## 5. Supported page types

| Page type | Example route | Preview priority |
| --- | --- | --- |
| Peshkash home | `/` | Peshkash proposition |
| Exhibitions proposition | `/exhibits` | Peshkash for exhibitions |
| Event | `/event/:eventName` | Event identity, date, venue |
| Vendor | `/vendor/:vendorName` | Vendor identity and category |
| Menu or collection | `/event/:eventName/menu/:menuName` | Collection identity and vendor |
| Item or product | `/event/:eventName/menu/:menuName/item/:itemName` | Item identity and vendor |
| Unavailable or invalid entity | `/share/...` fallback | Neutral Peshkash discovery card |

## 6. Universal image specification

### 6.1 Canvas and files

- Master canvas: **1200 × 630 px**.
- Aspect ratio: **1.91:1**.
- Minimum acceptable source: 600 × 315 px. Sources below this size must not be enlarged into a page-specific preview; use the generated fallback instead.
- Preferred output: JPEG for photographic cards and PNG for primarily typographic cards.
- Output colour space: sRGB.
- Target file weight: **350 KB or less**.
- Hard internal limit: **1 MB**.
- No animation in the first release.
- Public HTTPS URL with the correct `Content-Type` header.
- The image URL must not require authentication, cookies, referrer headers, JavaScript, or a signed URL that expires.

### 6.2 Safe area

- Keep essential content inside a centred safe area of **1080 × 510 px**.
- Leave at least **60 px** clear on every outer edge.
- Do not place the title, date, venue, faces, logos, or essential product details against an edge.
- Assume some consumers may crop toward the centre or reduce the image to a small thumbnail.

### 6.3 Legibility

- The subject must remain recognisable at approximately 400 px card width.
- Primary image title: 52–80 px at the 1200 × 630 master size.
- Supporting text: minimum 28 px.
- Limit image copy to one title and one short context line.
- Maximum visible title: 80 characters and four lines.
- Use strong foreground/background contrast. Where text overlays a photograph, add a controlled scrim, gradient, or solid panel.
- Never depend on fine ornament, thin hairlines, or very light serif text for critical information.

### 6.4 Brand treatment

- The shared subject is primary; Peshkash is the presenting layer.
- Use a small Peshkash wordmark or monogram in one consistent corner.
- Keep the Peshkash mark inside the safe area and visually secondary to the event, vendor, collection, or item name.
- Do not add the URL, QR code, “click here,” or a simulated button.
- Preserve supplied organiser/vendor marks without recolouring unless a monochrome version is explicitly provided.

### 6.5 Accessibility

- Every preview image must have meaningful `og:image:alt` and `twitter:image:alt` text.
- Alt text describes the image; it does not repeat the marketing description verbatim.
- Target alt-text length: 40–160 characters; hard maximum: 220 characters.
- Do not place information only in the image when the same fact can be included in the metadata title or description.

## 7. Image composition by page type

### 7.1 Event preview

Required visual content:

- event display name;
- event date;
- city or venue name;
- event or organiser imagery when available;
- a small Peshkash attribution mark.

Preferred composition:

- 55–65% editorial/event imagery;
- 35–45% calm text field;
- title is the largest element;
- date and venue appear as one concise line.

Rules:

- Use the dedicated social-preview image when supplied.
- Otherwise generate the card from `experienceConfig.heroImageUrl` plus event data.
- Do not place a live countdown in the image; cached previews would become false.
- Do not include registration state, “coming up,” or time-sensitive availability unless the image is regenerated and versioned when the state changes.
- Do not infer a start time. Display it only from the saved event record.
- If no suitable event image exists, use an event template with the event name, date, venue, and organiser identity.

ChapterHer example:

- Title: `ChapterHer September Edit`
- Context: `9 September 2026 · Radisson Jalandhar`
- Supporting line: `Festive Edit · 30+ labels`
- Imagery: ChapterHer campaign or approved event visual
- Attribution: small Peshkash mark

### 7.2 Vendor preview

Required visual content:

- vendor display name;
- vendor logo or approved hero image;
- short category or positioning line when available;
- small Peshkash attribution.

Image priority:

1. vendor social-preview override;
2. approved vendor cover/hero image;
3. vendor logo composed into a Peshkash vendor template;
4. neutral vendor fallback.

Do not stretch a small logo across the full canvas. A logo-only source must be placed on a deliberate branded field.

### 7.3 Menu or collection preview

Required visual content:

- menu/collection name;
- vendor display name;
- representative collection image where available;
- small Peshkash attribution.

Use the first explicitly designated collection cover. Do not automatically choose a random item image if the collection has a social-preview override or curated cover.

### 7.4 Item or product preview

Required visual content:

- item name;
- vendor display name;
- primary item image;
- optional category, collection, or short material descriptor;
- small Peshkash attribution.

The item must remain the dominant subject. Avoid placing price in the image because price and availability can change while social previews remain cached. Price may stay in the metadata description if product policy permits and the cache version changes with it.

### 7.5 Exhibitions proposition preview

Required visual content:

- `Peshkash for exhibitions`;
- the proposition `Every stall. Still discoverable.`;
- an editorial exhibition image or the approved proposition artwork;
- Peshkash identity.

This is a Peshkash-owned page, so the brand can be primary here.

### 7.6 Global and unavailable fallback

Use a neutral Peshkash card with:

- Peshkash wordmark;
- `Your shop window, digitally` or the approved current proposition;
- no entity name that could be stale or unavailable.

## 8. Metadata requirements

Every crawler-facing `/share/...` HTML response must include:

```html
<meta name="description" content="...">
<meta property="og:site_name" content="Peshkash">
<meta property="og:type" content="website|article|profile">
<meta property="og:title" content="...">
<meta property="og:description" content="...">
<meta property="og:url" content="https://peshkash.app/...">
<meta property="og:image" content="https://peshkash.app/.../preview-v3.jpg">
<meta property="og:image:secure_url" content="https://peshkash.app/.../preview-v3.jpg">
<meta property="og:image:type" content="image/jpeg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="...">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="...">
<meta name="twitter:description" content="...">
<meta name="twitter:image" content="https://peshkash.app/.../preview-v3.jpg">
<meta name="twitter:image:alt" content="...">
<link rel="canonical" href="https://peshkash.app/...">
```

Copy limits:

- Title target: 35–60 characters; hard maximum: 90.
- Description target: 90–160 characters; hard maximum: 220.
- Avoid hashtags, emoji chains, all-caps copy, phone numbers, and unverified claims.
- Do not append `— Peshkash` twice when the entity name already includes Peshkash.

The Open Graph Protocol requires `og:title`, `og:type`, `og:image`, and `og:url`; it also defines the structured image properties used above. X should receive an explicit `summary_large_image` card declaration.

## 9. Data model requirements

Introduce a reusable social-preview object that can be attached to supported entities or their existing JSON configuration:

```ts
type SocialPreviewConfig = {
  imageUrl?: string;
  imageAlt?: string;
  titleOverride?: string;
  descriptionOverride?: string;
  version?: number;
  generatedImageUrl?: string;
  generatedAt?: string;
  source?: 'custom' | 'generated' | 'hero' | 'fallback';
};
```

Recommended storage:

- Event: `experienceConfig.socialPreview` for the initial release.
- Vendor: add a `social_preview` JSONB field or equivalent typed columns.
- Menu and item: add the same reusable field to their content models.
- Global/exhibits: versioned configuration or static manifest entry.

Admin requirements:

- upload or paste a custom 1200 × 630 preview image;
- show a live preview of the final card;
- show the resolved source: custom, generated, hero, or fallback;
- edit preview title, description, and image alt text;
- regenerate the automatic image;
- reset to automatic;
- publish only after validation passes;
- “Refresh social preview” action that increments `version` and changes the public image URL.

## 10. Image-resolution hierarchy

The backend must resolve one final image through the same deterministic order for HTML metadata and the admin preview:

1. Valid custom `socialPreview.imageUrl`.
2. Valid generated `socialPreview.generatedImageUrl` for the current version.
3. A page-specific generated composition based on the approved hero/cover/primary image.
4. A page-type template containing the entity’s verified text fields.
5. Generic Peshkash fallback.

Raw external image URLs should not be emitted directly when they are expiring, hotlink-protected, incorrectly sized, or outside the application’s trusted image pipeline. Import or proxy the approved asset into Peshkash-managed storage first.

## 11. Backend behaviour

Refactor the share-preview controller around a common resolver:

```ts
resolveSocialPreview({ kind, entity, targetUrl })
// returns title, description, type, imageUrl, imageAlt,
// imageType, imageWidth, imageHeight, and version
```

Requirements:

- `/share/...` returns `200 text/html` without authentication.
- Metadata is present in the initial server response; JavaScript is not required.
- User-supplied title, description, alt text, and URLs are escaped before inclusion in HTML.
- The destination redirect remains usable by humans.
- Missing or malformed entities use the neutral fallback without exposing internal errors.
- Share HTML may use a short cache lifetime; five minutes is acceptable for the first release.
- Generated image assets use versioned filenames and long-lived immutable caching.
- A metadata change must be observable at a new preview URL without replacing a cached file in place.

Recommended image path convention:

`/social-previews/{pageType}/{slug}/v{version}.jpg`

Example:

`/social-previews/event/chapter-her-sept/v3.jpg`

## 12. Frontend behaviour

- Continue sharing `/share/...` URLs through `sharePublicPage`; do not share the SPA URL directly when a rich preview is expected.
- `usePageMeta` should use the same resolved title, description, image, and alt-text conventions for browser state, even though it is not the crawler source of truth.
- The admin dashboard must warn when a custom image is the wrong ratio, too small, too large, unreachable, or has no alt text.
- The public page hero image and the social-preview image remain separate concepts. Reusing the hero is a fallback, not a requirement.
- The share UI should provide a preview before copying or invoking the native share sheet.

## 13. Caching and invalidation

Social platforms cache previews aggressively and do not honour application changes immediately.

Requirements:

- Never overwrite a published image at the same URL when its visual content changes.
- Increment the preview version and emit a new image URL.
- Keep previous versioned files available for at least 30 days so old conversations do not show broken images.
- Update the `/share/...` HTML to reference the new version.
- Provide an admin-visible “last generated” timestamp and active version.
- Document that WhatsApp may continue displaying a preview already cached inside an existing conversation; a new versioned share URL is the reliable refresh mechanism.

## 14. Privacy, security, and content safety

- Do not include phone numbers, email addresses, private venue details, attendee names, or other personal data in an image unless the administrator deliberately approves it for public display.
- Do not render raw HTML supplied by users.
- Accept only `https:` image sources in production.
- Validate MIME type from the fetched file, not only from its extension.
- Set upload limits and reject decompression bombs or malformed images.
- Strip unnecessary image metadata before publishing.
- Do not expose private or draft entities through share-preview endpoints unless an explicit preview token authorises access.
- A draft preview token must be unguessable, revocable, and excluded from the canonical URL.

## 15. Performance and reliability

- Share HTML p95 response time: under 500 ms when entity data is cached; under 1.5 s without cache.
- Preview image p95 response time: under 1 s from the public CDN.
- Preview generation should be asynchronous when rendering takes more than 500 ms.
- Publishing an entity must not fail solely because image generation fails; publish with the page-type fallback and surface the generation error to the administrator.
- Log resolver source, generation status, response status, and image version without logging recipient identity.

## 16. Validation and QA

### Automated checks

For every supported page type:

- `/share/...` returns 200 and valid HTML;
- all required OG and X tags exist exactly once;
- canonical and `og:url` use the public destination URL;
- `og:image` and `twitter:image` point to the same resolved version unless a platform-specific asset is intentionally configured;
- image GET returns 200 over HTTPS with the declared MIME type;
- actual dimensions equal declared dimensions;
- image is 1200 × 630 and within the file-weight limit;
- title, description, and alt text respect length limits;
- special characters are HTML-escaped;
- missing entity data produces the generic fallback;
- custom image, generated image, hero fallback, and global fallback each have coverage.

### Manual checks

Test representative links on:

- WhatsApp on iOS and Android;
- LinkedIn Post Inspector;
- Facebook Sharing Debugger;
- X post composer with a large-image card;
- Slack or Discord;
- iMessage where available.

Verify:

- the image appears without authentication;
- the subject is recognisable at thumbnail size;
- text is not cropped;
- the title and description do not repeat awkwardly;
- tapping the preview opens the correct public page;
- an updated version produces the new image in a fresh share.

## 17. Acceptance criteria

The feature is complete when:

1. A ChapterHer event share uses a ChapterHer-specific image rather than the generic Peshkash display picture.
2. The card shows the saved, verified event date and venue and does not show a stale countdown.
3. Event, vendor, menu, and item pages each resolve a distinct relevant image when content exists.
4. Every share response contains the complete metadata block in Section 8.
5. Administrators can upload, preview, replace, regenerate, and invalidate a social preview without a deployment.
6. A missing or broken custom image falls back safely without breaking the shared link.
7. Automated tests cover the resolver hierarchy and server-rendered metadata.
8. Manual verification succeeds on WhatsApp and at least two additional preview consumers.

## 18. Recommended rollout

### Phase 1 — Page-specific overrides

- Add `SocialPreviewConfig` to event experience configuration.
- Update `SharePreviewController` to emit the configured image and full structured image metadata.
- Add the admin upload/URL, alt text, preview, validation, and version fields.
- Create dedicated static cards for `/`, `/exhibits`, and the generic fallback.

### Phase 2 — Reusable resolver

- Extract the common resolver.
- Add vendor, menu/collection, and item support.
- Add image ingestion into Peshkash-managed storage.
- Add automated metadata and image tests.

### Phase 3 — Automatic generation

- Add page-type rendering templates.
- Generate previews from verified entity data and approved imagery.
- Add background generation, retries, error reporting, and regeneration controls.
- Add preview-source and version visibility in the admin dashboard.

## 19. Design review checklist

- [ ] The subject is identifiable before the Peshkash brand.
- [ ] The image is 1200 × 630 and within the safe area.
- [ ] The title is readable at WhatsApp thumbnail size.
- [ ] The image contains no stale countdown, price, or availability claim.
- [ ] Date, time, and venue come from verified saved data.
- [ ] Peshkash attribution is visible but secondary.
- [ ] Custom organiser/vendor branding has not been distorted.
- [ ] Alt text describes the image.
- [ ] The preview has been checked with real metadata, not only as a standalone image.

## 20. References

- [The Open Graph Protocol](https://ogp.me/)
- [X developer documentation — cards and image ratios](https://docs.x.com/x-ads-api/creatives)
- Existing implementation: `peshkash_backend/src/controllers/SharePreviewController.ts`
- Existing sharing utility: `peshkash-frontend/src/utils/socialShare.ts`
- Existing client metadata utility: `peshkash-frontend/src/composables/usePageMeta.ts`

