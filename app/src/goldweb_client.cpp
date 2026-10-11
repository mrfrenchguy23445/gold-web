#include "goldweb_client.h"

#include <string>

#include "include/base/cef_logging.h"
#include "include/cef_app.h"
#include "include/cef_parser.h"
#include "include/cef_values.h"
#include "include/views/cef_browser_view.h"
#include "include/views/cef_window.h"

#include "goldweb_window.h"

namespace {

CefMessageRouterConfig RouterConfig() {
  CefMessageRouterConfig config;
  config.js_query_function = "cefQuery";
  config.js_cancel_function = "cefQueryCancel";
  return config;
}

// JSON commands from the UI use a "cmd" field; the older string commands are a
// bare "window:minimize" style token. Both reach the same handler.
CefRefPtr<CefDictionaryValue> ParseCommand(const std::string& request) {
  if (request.empty() || request.front() != '{') {
    return nullptr;
  }
  CefRefPtr<CefValue> value =
      CefParseJSON(request, JSON_PARSER_ALLOW_TRAILING_COMMAS);
  if (!value || value->GetType() != VTYPE_DICTIONARY) {
    return nullptr;
  }
  return value->GetDictionary();
}

}  // namespace

// Handles queries from the web UI (ui/chrome/chrome.js) that drive the native
// window and the tab strip. Requests are plain strings so the UI needs no
// native bindings.
class GoldWebClient::MessageHandler
    : public CefMessageRouterBrowserSide::Handler {
 public:
  explicit MessageHandler(GoldWebWindowDelegate* host) : host_(host) {}

  bool OnQuery(CefRefPtr<CefBrowser> browser,
               CefRefPtr<CefFrame> frame,
               int64_t query_id,
               const CefString& request,
               bool persistent,
               CefRefPtr<Callback> callback) override {
    const std::string query = request.ToString();

    // Tab strip and navigation commands arrive as JSON.
    if (CefRefPtr<CefDictionaryValue> command = ParseCommand(query)) {
      const std::string name = command->GetString("cmd").ToString();
      if (host_) {
        host_->OnChromeCommand(name, command);
      }
      callback->Success(CefString());
      return true;
    }

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
        // Closing the window destroys the browsers; the message loop is quit
        // from OnBeforeClose once cleanup is safe.
        window->Close();
      }

      callback->Success(CefString());
      return true;
    }

    return false;
  }

 private:
  GoldWebWindowDelegate* host_;
};

GoldWebClient::GoldWebClient(GoldWebWindowDelegate* host)
    : host_(host),
      router_(CefMessageRouterBrowserSide::Create(RouterConfig())),
      message_handler_(new MessageHandler(host)) {
  router_->AddHandler(message_handler_.get(), true);
}

GoldWebClient::~GoldWebClient() = default;

void GoldWebClient::OnAfterCreated(CefRefPtr<CefBrowser> browser) {
  browser_ = browser;
  if (host_) {
    host_->OnBrowserCreated();
    host_->OnChromeBrowserCreated(browser);
  }
}

void GoldWebClient::OnBeforeClose(CefRefPtr<CefBrowser> browser) {
  router_->OnBeforeClose(browser);
  router_->RemoveHandler(message_handler_.get());
  browser_ = nullptr;
  if (host_) {
    // Count this browser out; the last close quits the message loop.
    host_->OnBrowserClosed();
  }
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
