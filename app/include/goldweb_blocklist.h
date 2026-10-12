#ifndef GOLDWEB_BLOCKLIST_H_
#define GOLDWEB_BLOCKLIST_H_

#include <string>

namespace goldweb {

// The host of a URL, lowercased and without a port, or empty if the URL has no
// host (or does not parse).
std::string HostFromUrl(const std::string& url);

// True if |host| is, or is a subdomain of, a known tracker, advertising or
// fingerprinting domain. Matching is by exact host or by a dot-boundary suffix,
// so "ads.example.com" and "example.com" both match "example.com", while
// "notexample.com" does not.
bool IsTrackerHost(const std::string& host);

// True if both hosts share a registrable-ish domain: the same host, or one is a
// subdomain of the other. Used to keep a site's own requests first-party.
bool SameSite(const std::string& a, const std::string& b);

}  // namespace goldweb

#endif  // GOLDWEB_BLOCKLIST_H_
