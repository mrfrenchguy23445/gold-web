#include "goldweb_content_client.h"

#include <string>
#include <utility>

#include "include/cef_request.h"

#include "goldweb_blocklist.h"
#include "goldweb_window.h"

namespace {

// The privacy layer for a page: one of these is handed to CEF for every
// request a content browser makes. It has no say over the page itself — only
// over the resources the page pulls in.
class GoldWebResourceRequestHandler : public CefResourceRequestHandler {
 public:
  GoldWebResourceRequestHandler(GoldWebWindowDelegate* host, std::string tab_id)
      : host_(host), tab_id_(std::move(tab_id)) {}

  ReturnValue OnBeforeResourceLoad(CefRefPtr<CefBrowser> browser,
                                   CefRefPtr<CefFrame> frame,
                                   CefRefPtr<CefRequest> request,
                                   CefRefPtr<CefCallback> callback) override {
    if (!host_ || !request || !host_->ProtectionEnabled()) {
      return RV_CONTINUE;
    }
    // Never block the page the user asked for; a blocked navigation would look
    // like a broken site, not a blocked tracker.
    if (request->GetResourceType() == RT_MAIN_FRAME) {
      return RV_CONTINUE;
    }
    const std::string request_host =
        goldweb::HostFromUrl(request->GetURL().ToString());
    if (request_host.empty() || !goldweb::IsTrackerHost(request_host)) {
      return RV_CONTINUE;
    }
    // A site loading its own assets is first-party, not tracking, however
    // tracker-ish the name looks.
    if (browser && browser->GetMainFrame()) {
      const std::string site_host = goldweb::HostFromUrl(
          browser->GetMainFrame()->GetURL().ToString());
      if (goldweb::SameSite(request_host, site_host)) {
        return RV_CONTINUE;
      }
    }
    host_->OnContentBlocked(tab_id_, request_host);
    return RV_CANCEL;  // The request never leaves the machine.
  }

 private:
  GoldWebWindowDelegate* host_;
  std::string tab_id_;

  IMPLEMENT_REFCOUNTING(GoldWebResourceRequestHandler);
};

}  // namespace

GoldWebContentClient::GoldWebContentClient(GoldWebWindowDelegate* host,
                                           std::string tab_id)
    : host_(host), tab_id_(std::move(tab_id)) {}

void GoldWebContentClient::OnAfterCreated(CefRefPtr<CefBrowser> browser) {
  browser_ = browser;
  if (host_) {
    host_->OnBrowserCreated();
    host_->OnContentBrowserCreated(tab_id_);
  }
}

void GoldWebContentClient::OnBeforeClose(CefRefPtr<CefBrowser> browser) {
  browser_ = nullptr;
  if (host_) {
    host_->OnContentClosed(tab_id_);
    host_->OnBrowserClosed();
  }
}

bool GoldWebContentClient::OnBeforePopup(
    CefRefPtr<CefBrowser> browser,
    CefRefPtr<CefFrame> frame,
    int popup_id,
    const CefString& target_url,
    const CefString& target_frame_name,
    CefLifeSpanHandler::WindowOpenDisposition target_disposition,
    bool user_gesture,
    const CefPopupFeatures& popup_features,
    CefWindowInfo& window_info,
    CefRefPtr<CefClient>& client,
    CefBrowserSettings& settings,
    CefRefPtr<CefDictionaryValue>& extra_info,
    bool* no_javascript_access) {
  // One window, one tab: no popups yet. Cancel the popup and let the owning
  // window decide (today, it opens the target in the same tab).
  if (!target_url.empty() && host_) {
    host_->OnContentPopup(tab_id_, target_url.ToString());
  }
  return true;
}

void GoldWebContentClient::OnLoadingStateChange(CefRefPtr<CefBrowser> browser,
                                                bool is_loading,
                                                bool can_go_back,
                                                bool can_go_forward) {
  if (host_) {
    host_->OnContentLoadingState(tab_id_, is_loading, can_go_back,
                                 can_go_forward);
  }
}

void GoldWebContentClient::OnLoadError(CefRefPtr<CefBrowser> browser,
                                       CefRefPtr<CefFrame> frame,
                                       ErrorCode error_code,
                                       const CefString& error_text,
                                       const CefString& failed_url) {
  if (frame && frame->IsMain() && host_) {
    host_->OnContentLoadError(tab_id_, failed_url.ToString(),
                              static_cast<int>(error_code),
                              error_text.ToString());
  }
}

void GoldWebContentClient::OnTitleChange(CefRefPtr<CefBrowser> browser,
                                         const CefString& title) {
  if (host_) {
    host_->OnContentTitle(tab_id_, title.ToString());
  }
}

void GoldWebContentClient::OnAddressChange(CefRefPtr<CefBrowser> browser,
                                           CefRefPtr<CefFrame> frame,
                                           const CefString& url) {
  if (frame && frame->IsMain() && host_) {
    host_->OnContentUrl(tab_id_, url.ToString());
  }
}

CefRefPtr<CefResourceRequestHandler>
GoldWebContentClient::GetResourceRequestHandler(
    CefRefPtr<CefBrowser> browser,
    CefRefPtr<CefFrame> frame,
    CefRefPtr<CefRequest> request,
    bool is_navigation,
    bool is_download,
    const CefString& request_initiator,
    bool& disable_default_handling) {
  return new GoldWebResourceRequestHandler(host_, tab_id_);
}
