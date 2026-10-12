#ifndef GOLDWEB_WINDOW_H_
#define GOLDWEB_WINDOW_H_

#include <map>
#include <string>

#include "include/cef_browser.h"
#include "include/cef_values.h"
#include "include/views/cef_browser_view.h"
#include "include/views/cef_fill_layout.h"
#include "include/views/cef_overlay_controller.h"
#include "include/views/cef_window.h"

#include "goldweb_content_client.h"
#include "goldweb_history.h"

// One tab in a Gold-Web window.
//
// "Internal" tabs (new tab, Settings, the Protection Centre) are drawn by the
// chrome UI in the top browser. Everything else is a real page and gets its own
// content browser, shown as an overlay beneath the chrome's toolbar.
struct GoldWebTab {
  std::string id;
  bool internal = true;
  std::string url;
  std::string title;
  // Held until the content browser finishes coming up, then loaded.
  std::string pending_url;
  bool loading = false;
  bool can_go_back = false;
  bool can_go_forward = false;
  // Trackers refused for this tab since it was created.
  int blocked = 0;

  CefRefPtr<GoldWebContentClient> client;
  CefRefPtr<CefBrowserView> view;
  CefRefPtr<CefOverlayController> overlay;
};

// Creates and owns a top-level Gold-Web window, and coordinates the tabs in it.
//
// The window is frameless and holds two kinds of browser:
//
//   * the chrome browser, one per window, drawn full-size and owned here. It is
//     the only browser that gets the message bridge, and the only one whose
//     draggable regions are honoured.
//   * content browsers, one per external tab, added as absolutely-positioned
//     overlays in the rectangle below the chrome. Only the active tab's overlay
//     is visible.
//
// Keeping content in overlays means the chrome stays a single, ordinary web
// document and the page area stays a real, separately-sandboxed browser.
class GoldWebWindowDelegate : public CefWindowDelegate {
 public:
  explicit GoldWebWindowDelegate(std::string profile_dir);
  ~GoldWebWindowDelegate() override;

  static CefRefPtr<GoldWebWindowDelegate> Create(const std::string& profile_dir);

  // CefWindowDelegate
  void OnWindowCreated(CefRefPtr<CefWindow> window) override;
  void OnWindowDestroyed(CefRefPtr<CefWindow> window) override;
  void OnWindowBoundsChanged(CefRefPtr<CefWindow> window,
                             const CefRect& new_bounds) override;
  CefRect GetInitialBounds(CefRefPtr<CefWindow> window) override;
  bool IsFrameless(CefRefPtr<CefWindow> window) override { return true; }
  bool WithStandardWindowButtons(CefRefPtr<CefWindow> window) override {
    return false;
  }
  bool CanResize(CefRefPtr<CefWindow> window) override { return true; }
  bool CanMaximize(CefRefPtr<CefWindow> window) override { return true; }
  bool CanMinimize(CefRefPtr<CefWindow> window) override { return true; }

  // Called by the chrome client (app/src/goldweb_client.cpp).
  void OnChromeBrowserCreated(CefRefPtr<CefBrowser> browser);
  void OnChromeCommand(const std::string& command,
                       CefRefPtr<CefDictionaryValue> args);

  // Browser lifetime, shared by the chrome and content clients. The message loop
  // is only left once every browser has closed; see OnBrowserClosed().
  void OnBrowserCreated();
  void OnBrowserClosed();

  // Called by content clients (app/src/goldweb_content_client.cpp).
  void OnContentBrowserCreated(const std::string& tab_id);
  void OnContentClosed(const std::string& tab_id);
  void OnContentLoadingState(const std::string& tab_id,
                             bool loading,
                             bool can_go_back,
                             bool can_go_forward);
  void OnContentTitle(const std::string& tab_id, const std::string& title);
  void OnContentUrl(const std::string& tab_id, const std::string& url);
  void OnContentLoadError(const std::string& tab_id,
                          const std::string& url,
                          int error_code,
                          const std::string& error_text);
  void OnContentPopup(const std::string& tab_id, const std::string& url);

  // A browser shortcut pressed while a page had focus. The content client
  // matches the keys and sends the action name here; it runs in the chrome UI.
  void OnContentAccelerator(const std::string& name);

  // The privacy layer. A request that is a known tracker, and not first-party,
  // is refused before it loads and reported here.
  bool ProtectionEnabled() const { return protection_enabled_; }
  void OnContentBlocked(const std::string& tab_id, const std::string& host);

 private:
  GoldWebTab* FindTab(const std::string& id);
  void CreateTab(const std::string& id);
  void CloseTab(const std::string& id);
  void ActivateTab(const std::string& id);
  void GoTo(const std::string& id, const std::string& url);
  void EnsureContent(GoldWebTab& tab);
  void Layout();
  void SendTabState(const std::string& id);
  void SendProtection(const std::string& id);
  void RunInChrome(const std::string& script);

  CefRefPtr<CefWindow> window_;
  CefRefPtr<CefBrowserView> chrome_view_;
  CefRefPtr<CefBrowser> chrome_browser_;

  std::map<std::string, GoldWebTab> tabs_;
  std::string active_id_;

  // Number of live browsers (chrome + content). The app shuts down when this
  // reaches zero.
  int browser_count_ = 0;

  // The chrome UI reports how tall it is; the page area starts below that.
  int content_top_ = 108;
  CefSize window_size_ = CefSize(1280, 800);

  // Tracking protection is on by default and cannot be turned on by a site.
  bool protection_enabled_ = true;
  int session_blocked_ = 0;

  // Every page the user visits, so the History page has something to show.
  goldweb::History history_;

  IMPLEMENT_REFCOUNTING(GoldWebWindowDelegate);
  GoldWebWindowDelegate(const GoldWebWindowDelegate&) = delete;
  GoldWebWindowDelegate& operator=(const GoldWebWindowDelegate&) = delete;
};

#endif  // GOLDWEB_WINDOW_H_
