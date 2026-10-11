#ifndef GOLDWEB_CLIENT_H_
#define GOLDWEB_CLIENT_H_

#include <memory>
#include <vector>

#include "include/cef_client.h"
#include "include/wrapper/cef_message_router.h"

// The CefClient for a Gold-Web window.
//
// Owns the browser-side half of the JS <-> native message router. The chrome UI
// uses it to drive the (frameless) native window: minimise, maximise/restore,
// close and quit.
class GoldWebClient : public CefClient,
                      public CefLifeSpanHandler,
                      public CefLoadHandler,
                      public CefDisplayHandler,
                      public CefDragHandler,
                      public CefRequestHandler {
 public:
  GoldWebClient();
  ~GoldWebClient() override;

  GoldWebClient(const GoldWebClient&) = delete;
  GoldWebClient& operator=(const GoldWebClient&) = delete;

  CefRefPtr<CefLifeSpanHandler> GetLifeSpanHandler() override { return this; }
  CefRefPtr<CefLoadHandler> GetLoadHandler() override { return this; }
  CefRefPtr<CefDisplayHandler> GetDisplayHandler() override { return this; }
  CefRefPtr<CefDragHandler> GetDragHandler() override { return this; }
  CefRefPtr<CefRequestHandler> GetRequestHandler() override { return this; }

  // CefLifeSpanHandler
  void OnAfterCreated(CefRefPtr<CefBrowser> browser) override;
  void OnBeforeClose(CefRefPtr<CefBrowser> browser) override;

  // CefLoadHandler
  void OnLoadEnd(CefRefPtr<CefBrowser> browser,
                 CefRefPtr<CefFrame> frame,
                 int http_status_code) override;
  void OnLoadError(CefRefPtr<CefBrowser> browser,
                   CefRefPtr<CefFrame> frame,
                   ErrorCode error_code,
                   const CefString& error_text,
                   const CefString& failed_url) override;

  // CefDisplayHandler
  void OnTitleChange(CefRefPtr<CefBrowser> browser,
                     const CefString& title) override;

  // CefDragHandler
  void OnDraggableRegionsChanged(
      CefRefPtr<CefBrowser> browser,
      CefRefPtr<CefFrame> frame,
      const std::vector<CefDraggableRegion>& regions) override;

  // CefRequestHandler
  bool OnBeforeBrowse(CefRefPtr<CefBrowser> browser,
                      CefRefPtr<CefFrame> frame,
                      CefRefPtr<CefRequest> request,
                      bool user_gesture,
                      bool is_redirect) override;

  // CefClient
  bool OnProcessMessageReceived(CefRefPtr<CefBrowser> browser,
                                CefRefPtr<CefFrame> frame,
                                CefProcessId source_process,
                                CefRefPtr<CefProcessMessage> message) override;

 private:
  class MessageHandler;

  CefRefPtr<CefBrowser> browser_;
  CefRefPtr<CefMessageRouterBrowserSide> router_;
  std::unique_ptr<MessageHandler> message_handler_;

  IMPLEMENT_REFCOUNTING(GoldWebClient);
};

#endif  // GOLDWEB_CLIENT_H_
