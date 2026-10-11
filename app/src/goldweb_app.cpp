#include "goldweb_app.h"

#include <utility>

#include "goldweb_scheme.h"
#include "goldweb_window.h"

GoldWebApp::GoldWebApp(std::string ui_root) : ui_root_(std::move(ui_root)) {}

void GoldWebApp::OnRegisterCustomSchemes(
    CefRawPtr<CefSchemeRegistrar> registrar) {
  // A secure standard scheme so the UI can use fetch/CORS and is treated as a
  // trustworthy origin by the renderer.
  registrar->AddCustomScheme(
      "goldweb", CEF_SCHEME_OPTION_STANDARD | CEF_SCHEME_OPTION_SECURE |
                     CEF_SCHEME_OPTION_CORS_ENABLED);
}

void GoldWebApp::OnContextInitialized() {
  CefRegisterSchemeHandlerFactory("goldweb", "",
                                  new GoldWebSchemeFactory(ui_root_));
  GoldWebWindowDelegate::Create();
}

void GoldWebApp::OnContextCreated(CefRefPtr<CefBrowser> browser,
                                  CefRefPtr<CefFrame> frame,
                                  CefRefPtr<CefV8Context> context) {
  if (!renderer_router_) {
    CefMessageRouterConfig config;
    config.js_query_function = "cefQuery";
    config.js_cancel_function = "cefQueryCancel";
    renderer_router_ = CefMessageRouterRendererSide::Create(config);
  }
  renderer_router_->OnContextCreated(browser, frame, context);
}

void GoldWebApp::OnContextReleased(CefRefPtr<CefBrowser> browser,
                                   CefRefPtr<CefFrame> frame,
                                   CefRefPtr<CefV8Context> context) {
  if (renderer_router_) {
    renderer_router_->OnContextReleased(browser, frame, context);
  }
}

bool GoldWebApp::OnProcessMessageReceived(
    CefRefPtr<CefBrowser> browser,
    CefRefPtr<CefFrame> frame,
    CefProcessId source_process,
    CefRefPtr<CefProcessMessage> message) {
  return renderer_router_ &&
         renderer_router_->OnProcessMessageReceived(browser, frame,
                                                    source_process, message);
}
