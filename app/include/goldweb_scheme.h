#ifndef GOLDWEB_SCHEME_H_
#define GOLDWEB_SCHEME_H_

#include <string>

#include "include/cef_scheme.h"

// Serves goldweb:///... from a directory on disk.
//
// The UI is a normal web app (ui/chrome) plus design assets (brand/gold-ui).
// Rather than exposing file:// (which has awkward privileges and no stable
// origin), the shell registers a "goldweb" scheme and maps URL paths onto the
// UI root. goldweb:///ui/chrome/index.html resolves to <root>/ui/chrome/index.html,
// and relative links such as ../../brand/gold-ui/tokens.css just work.
class GoldWebSchemeFactory : public CefSchemeHandlerFactory {
 public:
  explicit GoldWebSchemeFactory(const std::string& root);

  CefRefPtr<CefResourceHandler> Create(CefRefPtr<CefBrowser> browser,
                                       CefRefPtr<CefFrame> frame,
                                       const CefString& scheme_name,
                                       CefRefPtr<CefRequest> request) override;

 private:
  std::string root_;

  IMPLEMENT_REFCOUNTING(GoldWebSchemeFactory);
  GoldWebSchemeFactory(const GoldWebSchemeFactory&) = delete;
  GoldWebSchemeFactory& operator=(const GoldWebSchemeFactory&) = delete;
};

#endif  // GOLDWEB_SCHEME_H_
