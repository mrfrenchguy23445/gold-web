#include "goldweb_window.h"

#include "goldweb_client.h"

namespace {

// The chrome UI. The host ("app") must stay constant so that relative asset
// URLs such as ../../brand/gold-ui/tokens.css resolve under the same origin;
// the scheme handler maps the URL path onto the UI root.
const char kChromeUrl[] = "goldweb://app/ui/chrome/index.html";

}  // namespace

GoldWebWindowDelegate::GoldWebWindowDelegate() = default;

GoldWebWindowDelegate::~GoldWebWindowDelegate() = default;

// static
void GoldWebWindowDelegate::Create() {
  CefRefPtr<GoldWebWindowDelegate> delegate(new GoldWebWindowDelegate());
  CefWindow::CreateTopLevelWindow(delegate);
}

CefRect GoldWebWindowDelegate::GetInitialBounds(CefRefPtr<CefWindow> window) {
  // TODO: persist the window size and position between runs.
  return CefRect(80, 80, 1280, 800);
}

void GoldWebWindowDelegate::OnWindowCreated(CefRefPtr<CefWindow> window) {
  CefRefPtr<GoldWebClient> client(new GoldWebClient());
  CefBrowserSettings settings;
  browser_view_ = CefBrowserView::CreateBrowserView(
      client, kChromeUrl, settings, nullptr, nullptr, nullptr);
  window->AddChildView(browser_view_);
  window->SetTitle("Gold-Web");
  window->Show();
}

void GoldWebWindowDelegate::OnWindowDestroyed(CefRefPtr<CefWindow> window) {
  browser_view_ = nullptr;
}
