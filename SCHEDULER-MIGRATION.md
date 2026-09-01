# Booking Link Migration

This website no longer links to Noterro. Booking links now point to:

`https://atm-practice-manager.onrender.com/schedule`

Where the page identifies a specific service, the URL includes a `?service=` parameter so that service is preselected.

**Deployment order:** deploy and configure the Practice Manager scheduler (including persistent database storage and real practitioner availability) before publishing this website repository. See `DEPLOYMENT-SCHEDULER.md` in the Practice Manager repository.

## Practitioner space booking

Public navigation, standard footers, the homepage practitioner CTA, and the Our Space page link to `https://atm-practice-manager.onrender.com/request-space`. Client appointment buttons remain on `/schedule`.

## Mobile appointment locations

The ATM scheduler now offers an ATM Wellness Center / In-home location choice for Personal Training, Adaptive Training Consultation, FST Stretch Therapy, and Thai Massage. In-home bookings require a GTA service address and display the travel-fee notice before confirmation. Hot Stone Massage and Sauna Blanket Therapy remain center-only.

The Adaptive Training card on `services.html` reuses the same existing `adaptive.jpg` asset used as the hero image on `adaptive-training.html`.
