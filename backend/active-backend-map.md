ACTIVE ROUTES
- /api/admin -> backend/features/admin/index.js
  controller(s): backend/features/admin/admin.controller.js
  service(s): backend/services/index.js (paymentService, requestService, revenueService, livePlaylistService), backend/services/adminStatsService.js

- /api/requests -> backend/features/requests/index.js
  controller(s): backend/features/requests/requests.controller.js
  service(s): backend/services/lastfmGenreService.js, backend/services/emailService.js, backend/services/stackService.js, backend/features/payments/stripe/stripe.service.js, backend/services/couponService.js

- /api/payments -> backend/features/payments/index.js
  controller(s): backend/features/payments/payment.controller.js
  service(s): none (controller talks directly to Stripe/models)

- /api/stripe -> backend/features/payments/stripe/index.js
  controller(s): backend/features/payments/stripe/stripe.controller.js
  service(s): backend/services/couponService.js, backend/services/stackService.js, backend/features/payments/stripe/stripe.service.js, backend/features/payments/stripe/stripe.verification.js

- /api/venue -> backend/features/venues/index.js
  controller(s): backend/features/venues/venue.controller.js
  service(s): none from backend/services/* (controller calls backend/worker/workerManager.js directly)

- /api/dj -> backend/features/dj/index.js
  controller(s): backend/features/dj/dj.controller.js
  service(s): backend/services/emailService.js, backend/services/stackService.js, backend/features/payments/stripe/stripe.service.js

- /api/coupons -> backend/features/coupons/index.js
  controller(s): backend/features/coupons/coupons.controller.js
  service(s): backend/services/couponService.js

LEGACY / UNUSED / DUPLICATE
- backend/features/admin/routes.js — legacy duplicate router file (not mounted by server.js)
- backend/features/requests/routes.js — old duplicate requests router (not mounted by server.js)
- backend/features/payments/routes.js — old duplicate payments router (not mounted by server.js)
- backend/features/payments/stripe/routes.js — old duplicate stripe router (not mounted by server.js)
- backend/api/dj/routes.js — legacy DJ API router replaced by backend/features/dj/index.js