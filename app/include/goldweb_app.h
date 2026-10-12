#ifndef GOLDWEB_APP_H_
#define GOLDWEB_APP_H_

#include <string>

#include "include/cef_app.h"
#include "include/wrapper/cef_message_router.h"

class GoldWebWindowDelegate;

// The CefApp for Gold-Web.
//
// In the browser process it registers the goldweb:// scheme and opens the
// window. In each renderer process it installs the JS-side half of the message
// router (the same object is instantiated for every CEF process).
class GoldWebApp : public CefApp,
                   public CefBrowserProcessHandler,
                   public CefRenderProcessHandler {
 public:
  explicit GoldWebApp(std::string ui_root, std::string profile_dir);
  ~GoldWebApp() override;

  GoldWebApp(const GoldWebApp&) = delete;
  GoldWebApp& operator=(const GoldWebApp&) = delete;

  // CefApp
  void OnRegisterCustomSchemes(
      CefRawPtr<CefSchemeRegistrar> registrar) override;
  CefRefPtr<CefBrowserProcessHandler> GetBrowserProcessHandler() override {
    return this;
  }
  CefRefPtr<CefRenderProcessHandler> GetRenderProcessHandler() override {
    return this;
  }

  // CefBrowserProcessHandler
  void OnContextInitialized() override;

  // CefRenderProcessHandler
  void OnContextCreated(CefRefPtr<CefBrowser> browser,
                        CefRefPtr<CefFrame> frame,
                        CefRefPtr<CefV8Context> context) override;
  void OnContextReleased(CefRefPtr<CefBrowser> browser,
                         CefRefPtr<CefFrame> frame,
                         CefRefPtr<CefV8Context> context) override;
  bool OnProcessMessageReceived(CefRefPtr<CefBrowser> browser,
                                CefRefPtr<CefFrame> frame,
                                CefProcessId source_process,
                                CefRefPtr<CefProcessMessage> message) override;

 private:
  std::string ui_root_;
  std::string profile_dir_;
  CefRefPtr<CefMessageRouterRendererSide> renderer_router_;
  // Kept alive for the whole browser process so the window's clients can hold a
  // plain pointer to it without a reference cycle.
  CefRefPtr<GoldWebWindowDelegate> window_;

  IMPLEMENT_REFCOUNTING(GoldWebApp);
};

#endif  // GOLDWEB_APP_H_
