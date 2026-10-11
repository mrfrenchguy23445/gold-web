#include "goldweb_client.h"

#include <string>

#include "include/base/cef_logging.h"
#include "include/cef_app.h"
#include "include/views/cef_browser_view.h"
#include "include/views/cef_window.h"

namespace {

CefMessageRouterConfig RouterConfig() {
  CefMessageRouterConfig config;
  config.js_query_function = "cefQuery";
  config.js_cancel_function = "cefQueryCancel";
  return config;
}

}  // namespace

// Handles queries from the web UI (ui/chrome/chrome.js) that drive the native
// window. Requests are plain strings so the UI needs no native bindings.
class GoldWebClient::MessageHandler
    : public CefMessageRouterBrowserSide::Handler {
 public:
  bool OnQuery(CefRefPtr<CefBrowser> browser,
               CefRefPtr<CefFrame> frame,
               int64_t query_id,
               const CefString& request,
               bool persistent,
               CefRefPtr<Callback> callback) override {
    const std::string query = request.ToString();

    const bool is_quit = (query == "app:quit");
    const std::string window_prefix = "window:";
    if (is_quit || query.rfind(window_prefix, 0) == 0) {
      CefRefPtr<CefBrowserView> view = CefBrowserView::GetForBrowser(browser);
      CefRefPtr<CefWindow> window = view ? view->GetWindow() : nullptr;
      if (!window) {
        callback->Failure(-1, "window unavailable");
        return true;
      }

      const std::string action =
          is_quit ? "close" : query.substr(window_prefix.size());
      if (action == "minimize") {
        window->Minimize();
      } else if (action == "maximize") {
        if (window->IsMaximized()) {
          window->Restore();
        } else {
          window->Maximize();
        }
      } else if (action == "close") {
        // Closing the window destroys the browser; the message loop is quit
        // from OnBeforeClose once cleanup is safe.
        window->Close();
      }

      callback->Success(CefString());
      return true;
    }

    return false;
  }
};

GoldWebClient::GoldWebClient()
    : router_(CefMessageRouterBrowserSide::Create(RouterConfig())),
      message_handler_(new MessageHandler()) {
  router_->AddHandler(message_handler_.get(), true);
}

GoldWebClient::~GoldWebClient() = default;

void GoldWebClient::OnAfterCreated(CefRefPtr<CefBrowser> browser) {
  browser_ = browser;
}

void GoldWebClient::OnBeforeClose(CefRefPtr<CefBrowser> browser) {
  router_->OnBeforeClose(browser);
  router_->RemoveHandler(message_handler_.get());
  browser_ = nullptr;

  // M0 owns a single window, so the app exits when that window's browser is
  // gone. Multi-window support will need to keep a window count here.
  CefQuitMessageLoop();
}

void GoldWebClient::OnLoadEnd(CefRefPtr<CefBrowser> browser,
                              CefRefPtr<CefFrame> frame,
                              int http_status_code) {
  if (!frame || !frame->IsMain()) {
    return;
  }
  LOG(INFO) << "Loaded " << frame->GetURL().ToString();
}

void GoldWebClient::OnLoadError(CefRefPtr<CefBrowser> browser,
                                CefRefPtr<CefFrame> frame,
                                ErrorCode error_code,
                                const CefString& error_text,
                                const CefString& failed_url) {
  if (frame && frame->IsMain()) {
    LOG(ERROR) << "Gold-Web could not load " << failed_url.ToString() << " ("
               << static_cast<int>(error_code) << "): " << error_text.ToString();
  }
}

void GoldWebClient::OnTitleChange(CefRefPtr<CefBrowser> browser,
                                  const CefString& title) {
  CefRefPtr<CefBrowserView> view = CefBrowserView::GetForBrowser(browser);
  if (view) {
    CefRefPtr<CefWindow> window = view->GetWindow();
    if (window) {
      window->SetTitle(title);
    }
  }
}

void GoldWebClient::OnDraggableRegionsChanged(
    CefRefPtr<CefBrowser> browser,
    CefRefPtr<CefFrame> frame,
    const std::vector<CefDraggableRegion>& regions) {
  CefRefPtr<CefBrowserView> view = CefBrowserView::GetForBrowser(browser);
  if (view) {
    CefRefPtr<CefWindow> window = view->GetWindow();
    if (window) {
      window->SetDraggableRegions(regions);
    }
  }
}

bool GoldWebClient::OnBeforeBrowse(CefRefPtr<CefBrowser> browser,
                                   CefRefPtr<CefFrame> frame,
                                   CefRefPtr<CefRequest> request,
                                   bool user_gesture,
                                   bool is_redirect) {
  // Let the router cancel any pending queries if this is a main-frame
  // navigation, then allow the navigation to proceed.
  router_->OnBeforeBrowse(browser, frame);
  return false;
}

bool GoldWebClient::OnProcessMessageReceived(
    CefRefPtr<CefBrowser> browser,
    CefRefPtr<CefFrame> frame,
    CefProcessId source_process,
    CefRefPtr<CefProcessMessage> message) {
  return router_->OnProcessMessageReceived(browser, frame, source_process,
                                           message);
}
