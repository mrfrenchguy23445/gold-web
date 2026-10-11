#ifndef GOLDWEB_CONTENT_CLIENT_H_
#define GOLDWEB_CONTENT_CLIENT_H_

#include <string>

#include "include/cef_client.h"
#include "include/views/cef_browser_view_delegate.h"

class GoldWebWindowDelegate;

// Content browser views use the Alloy runtime. A Chrome-runtime window can host
// at most one Chrome-style BrowserView (the chrome) but any number of Alloy
// ones, so the page area is Alloy.
class GoldWebContentBrowserViewDelegate : public CefBrowserViewDelegate {
 public:
  cef_runtime_style_t GetBrowserRuntimeStyle() override {
    return CEF_RUNTIME_STYLE_ALLOY;
  }

 private:
  IMPLEMENT_REFCOUNTING(GoldWebContentBrowserViewDelegate);
};

// The CefClient for a page-content browser: one real website living in one tab.
//
// Content pages deliberately get none of what the chrome has. There is no
// message router here, so a page cannot call the shell, and there is no drag
// handler, so a page cannot turn itself into a window drag strip. This client
// only watches the tab's lifecycle and reports it back to the window that owns
// it; every policy decision lives in the shell.
class GoldWebContentClient : public CefClient,
                             public CefLifeSpanHandler,
                             public CefLoadHandler,
                             public CefDisplayHandler {
 public:
  GoldWebContentClient(GoldWebWindowDelegate* host, std::string tab_id);

  GoldWebContentClient(const GoldWebContentClient&) = delete;
  GoldWebContentClient& operator=(const GoldWebContentClient&) = delete;

  CefRefPtr<CefLifeSpanHandler> GetLifeSpanHandler() override { return this; }
  CefRefPtr<CefLoadHandler> GetLoadHandler() override { return this; }
  CefRefPtr<CefDisplayHandler> GetDisplayHandler() override { return this; }

  CefRefPtr<CefBrowser> browser() const { return browser_; }

  // CefLifeSpanHandler
  void OnAfterCreated(CefRefPtr<CefBrowser> browser) override;
  void OnBeforeClose(CefRefPtr<CefBrowser> browser) override;

  // A page that tries to open a new window (target="_blank", window.open) stays
  // in one tab for now: we cancel the popup and load the URL in this tab. A real
  // new-tab/window policy is a later milestone.
  bool OnBeforePopup(CefRefPtr<CefBrowser> browser,
                     CefRefPtr<CefFrame> frame,
                     int popup_id,
                     const CefString& target_url,
                     const CefString& target_frame_name,
                     WindowOpenDisposition target_disposition,
                     bool user_gesture,
                     const CefPopupFeatures& popup_features,
                     CefWindowInfo& window_info,
                     CefRefPtr<CefClient>& client,
                     CefBrowserSettings& settings,
                     CefRefPtr<CefDictionaryValue>& extra_info,
                     bool* no_javascript_access) override;

  // CefLoadHandler
  void OnLoadingStateChange(CefRefPtr<CefBrowser> browser,
                            bool is_loading,
                            bool can_go_back,
                            bool can_go_forward) override;
  void OnLoadError(CefRefPtr<CefBrowser> browser,
                   CefRefPtr<CefFrame> frame,
                   ErrorCode error_code,
                   const CefString& error_text,
                   const CefString& failed_url) override;

  // CefDisplayHandler
  void OnTitleChange(CefRefPtr<CefBrowser> browser,
                     const CefString& title) override;
  void OnAddressChange(CefRefPtr<CefBrowser> browser,
                       CefRefPtr<CefFrame> frame,
                       const CefString& url) override;

 private:
  GoldWebWindowDelegate* host_;
  std::string tab_id_;
  CefRefPtr<CefBrowser> browser_;

  IMPLEMENT_REFCOUNTING(GoldWebContentClient);
};

#endif  // GOLDWEB_CONTENT_CLIENT_H_
