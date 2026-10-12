#include "goldweb_blocklist.h"

#include <algorithm>
#include <cctype>

#include "include/cef_parser.h"

namespace goldweb {
namespace {

// A deliberately small, hand-checked list to start. Every entry is a host that
// shows up on ordinary pages and that almost nobody misses once it is gone. It
// is not EasyList and does not pretend to be: shipping and updating a real list
// is its own milestone. The point here is that the plumbing blocks real
// requests, counts them, and can be switched off.
const char* const kTrackerHosts[] = {
    // Ad exchanges and ad tech.
    "2mdn.net",
    "adnxs.com",
    "adsrvr.org",
    "adsymptotic.com",
    "adcolony.com",
    "adsafeprotected.com",
    "bidswitch.net",
    "casalemedia.com",
    "criteo.com",
    "criteo.net",
    "doubleclick.net",
    "doubleverify.com",
    "exelator.com",
    "googleadservices.com",
    "googlesyndication.com",
    "googletagservices.com",
    "mathtag.com",
    "moatads.com",
    "openx.net",
    "pubmatic.com",
    "rubiconproject.com",
    "sharethrough.com",
    "simpli.fi",
    "smartadserver.com",
    "stackadapt.com",
    "taboola.com",
    "teads.tv",
    "tribalfusion.com",
    "turn.com",
    "zeotap.com",

    // Analytics, attribution and audience measurement.
    "2o7.net",
    "amplitude.com",
    "appsflyer.com",
    "branch.io",
    "chartbeat.com",
    "comscore.com",
    "crazyegg.com",
    "demdex.net",
    "everesttech.net",
    "google-analytics.com",
    "googletagmanager.com",
    "heap.io",
    "hotjar.com",
    "krxd.net",
    "mixpanel.com",
    "moatpixel.com",
    "newrelic.com",
    "nr-data.net",
    "omtrdc.net",
    "parsely.com",
    "quantserve.com",
    "scorecardresearch.com",
    "segment.com",
    "segment.io",
    "tapad.com",

    // Social widgets that are really trackers.
    "connect.facebook.net",
    "platform.twitter.com",
    "ads.linkedin.com",
    "px.ads.linkedin.com",

    // Fingerprinting and session replay.
    "agkn.com",
    "bluekai.com",
    "fullstory.com",
    "iovation.com",
    "mouseflow.com",
    "rlcdn.com",
};

std::string Lower(std::string value) {
  std::transform(value.begin(), value.end(), value.begin(), [](unsigned char c) {
    return static_cast<char>(std::tolower(c));
  });
  return value;
}

bool IsDomainOf(const std::string& host, const std::string& domain) {
  if (host == domain) {
    return true;
  }
  if (host.size() <= domain.size()) {
    return false;
  }
  const std::string::size_type offset = host.size() - domain.size();
  return host.compare(offset, domain.size(), domain) == 0 &&
         host[offset - 1] == '.';
}

}  // namespace

std::string HostFromUrl(const std::string& url) {
  CefURLParts parts;
  if (!CefParseURL(CefString(url), parts)) {
    return std::string();
  }
  return Lower(CefString(&parts.host).ToString());
}

bool IsTrackerHost(const std::string& host) {
  if (host.empty()) {
    return false;
  }
  for (const char* domain : kTrackerHosts) {
    if (IsDomainOf(host, domain)) {
      return true;
    }
  }
  return false;
}

bool SameSite(const std::string& a, const std::string& b) {
  if (a.empty() || b.empty()) {
    return false;
  }
  return IsDomainOf(a, b) || IsDomainOf(b, a);
}

}  // namespace goldweb
