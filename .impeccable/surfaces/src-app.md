---
version: 1
slug: "src-app"
primary_target: "src/app"
related_targets: []
---

# Surface: app shell + auth & multi-tenancy screens

Mode: Operate. Audience: freelancers and small agencies (2-20) doing daily client/invoice/team work on laptops.
Screens: sign up, sign in, accept invitation, create company, company switcher + dashboard shell, company settings, team members, invite member.
Constraints: standard web controls and navigation; every role limit visible and explained; international English.

## Direction contract

THESIS: The workspace reads like a station departure board: one dark board carries who you are and where you are, and every status that changes (role, invitation, active company) is a split-flap tile that flips when it changes. Refuses the grey-card SaaS default where status is a pastel pill nobody notices.

OWN-WORLD: Board black #111315 rail and auth panel; flap tiles #1D2024 with warm off-white #F2EFE6 condensed caps and a hairline split; signal yellow #F5C518 for primary actions and the live tile; cool light ground #F4F5F3, white work surfaces, ink #15171A. Barlow for UI, Barlow Condensed caps for tiles and table headers, tabular figures everywhere. Flat colour, no gradients, one elevation (overlays only).

STORY: The visitor knows instantly which company they are in and with what role, sees what changed, and can act (invite, switch, edit) without guessing what they are allowed to do.

FIRST VIEWPORT: Left dark rail: company name in flap tiles at the top, role tile under it, navigation below, user at the bottom. Right: page title, primary yellow action top-right, then the working table or form. On auth screens the board is a left panel with the BUSINESSFLOW tile row; the form sits on the light side.

FORM: Grounded candidate 7 (split-flap departure board). seed:cbafc22b889a9e7c. Raises: rank by weight, case and reversal on a tight scale (from the timetable slide rack); destructive actions outlined and isolated by space (from the graphite console); flat unmodulated colour (from the zoo guide map); one elevation rank, overlays only (from the acetate tab board); whole-cell repacking for member and company grids (from the event catalog); scale contrast reserved for the one page title (from the type specimen).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

Signature interaction: a 180ms rotateX flip on any tile whose value changes (company switch, invitation accepted, role changed); reduced motion swaps instantly.
