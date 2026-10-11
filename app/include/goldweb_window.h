#ifndef GOLDWEB_WINDOW_H_
#define GOLDWEB_WINDOW_H_

#include "include/cef_browser.h"
#include "include/views/cef_browser_view.h"
#include "include/views/cef_window.h"

// Creates and owns the top-level Gold-Web window.
//
// The window is frameless: the chrome UI draws its own title bar, and the shell
// forwards the CSS draggable regions (-webkit-app-region) to the native window.
class GoldWebWindowDelegate : public CefWindowDelegate {
 public:
  GoldWebWindowDelegate();
  ~GoldWebWindowDelegate() override;

  static void Create();

  // CefWindowDelegate
  void OnWindowCreated(CefRefPtr<CefWindow> window) override;
  void OnWindowDestroyed(CefRefPtr<CefWindow> window) override;
  CefRect GetInitialBounds(CefRefPtr<CefWindow> window) override;
  bool IsFrameless(CefRefPtr<CefWindow> window) override { return true; }
  bool WithStandardWindowButtons(CefRefPtr<CefWindow> window) override {
    return false;
  }
  bool CanResize(CefRefPtr<CefWindow> window) override { return true; }
  bool CanMaximize(CefRefPtr<CefWindow> window) override { return true; }
  bool CanMinimize(CefRefPtr<CefWindow> window) override { return true; }

 private:
  CefRefPtr<CefBrowserView> browser_view_;

  IMPLEMENT_REFCOUNTING(GoldWebWindowDelegate);
  GoldWebWindowDelegate(const GoldWebWindowDelegate&) = delete;
  GoldWebWindowDelegate& operator=(const GoldWebWindowDelegate&) = delete;
};

#endif  // GOLDWEB_WINDOW_H_
