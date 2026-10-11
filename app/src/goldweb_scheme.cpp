#include "goldweb_scheme.h"

#include <string>
#include <utility>

#include "include/cef_parser.h"
#include "include/cef_stream.h"
#include "include/wrapper/cef_stream_resource_handler.h"

namespace {

const char kNotFound[] = "404 - not found";

std::string MimeTypeForPath(const std::string& path) {
  const std::string::size_type dot = path.find_last_of('.');
  if (dot == std::string::npos) {
    return "application/octet-stream";
  }
  const std::string ext = path.substr(dot + 1);
  if (ext == "html" || ext == "htm") return "text/html";
  if (ext == "css") return "text/css";
  if (ext == "js" || ext == "mjs") return "text/javascript";
  if (ext == "json") return "application/json";
  if (ext == "svg") return "image/svg+xml";
  if (ext == "png") return "image/png";
  if (ext == "jpg" || ext == "jpeg") return "image/jpeg";
  if (ext == "gif") return "image/gif";
  if (ext == "webp") return "image/webp";
  if (ext == "ico") return "image/x-icon";
  if (ext == "woff") return "font/woff";
  if (ext == "woff2") return "font/woff2";
  if (ext == "ttf") return "font/ttf";
  if (ext == "otf") return "font/otf";
  if (ext == "wasm") return "application/wasm";
  return "application/octet-stream";
}

}  // namespace

GoldWebSchemeFactory::GoldWebSchemeFactory(const std::string& root)
    : root_(root) {}

CefRefPtr<CefResourceHandler> GoldWebSchemeFactory::Create(
    CefRefPtr<CefBrowser> browser,
    CefRefPtr<CefFrame> frame,
    const CefString& scheme_name,
    CefRefPtr<CefRequest> request) {
  const std::string url = request->GetURL().ToString();
  const std::string prefix = "goldweb://";
  if (url.rfind(prefix, 0) != 0) {
    return nullptr;
  }

  std::string rest = url.substr(prefix.size());
  const std::string::size_type cut = rest.find_first_of("?#");
  if (cut != std::string::npos) {
    rest = rest.substr(0, cut);
  }

  // Our URLs look like goldweb:///path, so the authority is empty. Drop any
  // authority component if one is present and keep the path.
  const std::string::size_type slash = rest.find('/');
  std::string path = (slash == std::string::npos) ? "/" : rest.substr(slash);
  path = CefURIDecode(CefString(path), true, UU_NORMAL).ToString();

  if (path.empty() || path == "/") {
    path = "/index.html";
  } else if (path.back() == '/') {
    path += "index.html";
  }

  // Refuse to escape the UI root.
  if (path.find("..") != std::string::npos) {
    return nullptr;
  }

  CefRefPtr<CefStreamReader> stream =
      CefStreamReader::CreateForFile(root_ + path);
  if (!stream) {
    return new CefStreamResourceHandler(
        404, "Not Found", "text/plain; charset=utf-8",
        CefResponse::HeaderMap(),
        CefStreamReader::CreateForData(const_cast<char*>(kNotFound),
                                       sizeof(kNotFound) - 1));
  }

  CefResponse::HeaderMap headers;
  headers.insert(
      std::make_pair(CefString("Cache-Control"), CefString("no-cache")));
  return new CefStreamResourceHandler(200, "OK", MimeTypeForPath(path), headers,
                                      stream);
}
