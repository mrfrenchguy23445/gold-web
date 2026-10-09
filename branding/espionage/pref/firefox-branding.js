/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// Espionage branding-specific default preferences.
//
// Privacy-affecting defaults live in browser/app/profile/firefox.js (patched
// separately) so that they are auditable in one place. This file holds only
// branding/update metadata.

pref("startup.homepage_override_url", "");
pref("startup.homepage_welcome_url", "");
pref("startup.homepage_welcome_url.additional", "");

// Update check cadence. TODO(M5): point app.update.url at the Espionage update
// service once one exists; until then leave update infrastructure as-is so we
// never ship unsigned/undirected updates.
pref("app.update.interval", 86400);
pref("app.update.promptWaitTime", 86400);
pref("app.update.url.manual", "");
pref("app.update.url.details", "");
pref("app.update.checkInstallTime.days", 2);
pref("app.update.badgeWaitTime", 0);

pref("devtools.selfxss.count", 5);
