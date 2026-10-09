/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// Gold-Web branding-specific default preferences.
//
// Privacy defaults live in browser/app/profile/firefox.js (patched separately)
// so they can be audited in one place. This file only holds branding/update
// metadata.

pref("startup.homepage_override_url", "");
pref("startup.homepage_welcome_url", "");
pref("startup.homepage_welcome_url.additional", "");

// Update cadence. TODO(M5): point these at the Gold-Web update service once
// there is one. Until then we leave update infrastructure as-is rather than
// shipping updates that go nowhere.
pref("app.update.interval", 86400);
pref("app.update.promptWaitTime", 86400);
pref("app.update.url.manual", "");
pref("app.update.url.details", "");
pref("app.update.checkInstallTime.days", 2);
pref("app.update.badgeWaitTime", 0);

pref("devtools.selfxss.count", 5);
