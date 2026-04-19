# createRequest breakdown

This document explains:
1. what `createRequest` currently does
2. what should stay in the controller
3. what should move into services

Source file: `backend/features/requests/requests.controller.js`.

## What createRequest currently does

`createRequest` currently does all of the following in one function:
- reads and validates request input fields
- finds or creates the user
- loads venue settings (DJ mode / live playlist mode)
- decides initial request status/routing
- calculates dynamic price
- validates and applies coupon codes
- creates the request database record and verifies save
- redeems coupon usage after request creation
- creates Stripe checkout sessions (DJ and live playlist paths)
- runs genre filtering logic (bypass, essential-song auto-pass, song DB match, Last.fm fallback)
- sends genre rejection emails
- pushes live-playlist requests into the LIFO stack
- returns multiple response shapes depending on branch/path

## Keep in controller

Keep only HTTP/web concerns in `createRequest`:
- parse `req.body`
- call orchestrator/service methods in order
- map domain results to HTTP status codes and JSON responses
- central error handling (`try/catch` at route boundary)

The controller should become a thin coordinator, not a business logic container.

## Move to request service

Move request-lifecycle/domain logic into a request service:
- input normalization helpers for song/artist/user names
- venue routing decision (`pending_dj_approval` vs `queued`) based on DJ/live flags
- request payload assembly (`requestData`)
- request create + persistence verification
- coupon redemption after request creation
- branch outcome model (DJ pending vs live queue vs rejected)

Suggested service ownership:
- `createRequestDraft(...)`
- `determineInitialStatus(...)`
- `createRequestRecord(...)`
- `finalizeCouponRedemption(...)`

## Move to payment service

Move Stripe and payment-preauth responsibilities to payment service:
- checkout session creation for DJ path
- checkout session creation for live path
- request payment metadata update (`checkoutSessionId`, `paymentStatus`)
- standardized payment setup result and fallback behavior

Suggested service ownership:
- `prepareDjCheckout(request, venueId)`
- `prepareLiveCheckout(request, venueId)`
- `attachCheckoutToRequest(requestId, checkoutData)`

## Move to genre service

Move all genre policy/decision logic to genre service:
- bypass mode handling
- essential song auto-approval check
- song DB lookup and genre comparison
- Last.fm fallback lookup and interpretation
- normalized genre decision output (allow/reject + reason + tags + metadata)

Suggested service ownership:
- `evaluateGenrePolicy({ request, venue, songName, artistName })`
- returns one domain result object used by controller/request service

## Move to notification service

Move email side effects into notification service:
- send genre rejection email
- any future user-facing request lifecycle emails
- retry/log strategy for notification failures without breaking core flow

Suggested service ownership:
- `notifyGenreRejected({ request, venue, reason, tags })`

## Move to queue/playback dispatch

Move stack/queue dispatch and playback-trigger prep into queue/playback dispatch service:
- live-playlist stack payload preparation
- push to stack (`pushToStack`)
- read stack size (`getStackSize`)
- map queue failure to domain error type

Suggested service ownership:
- `enqueueLiveRequest({ request, checkoutSessionId })`
- returns queue position/size and dispatch status

This keeps playback/queue mechanics out of the HTTP controller.