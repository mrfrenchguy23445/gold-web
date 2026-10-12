#include "goldweb_window.h"

#include <sys/stat.h>
#include <unistd.h>

#include <algorithm>
#include <cstdlib>
#include <ctime>
#include <string>
#include <utility>

#include "include/base/cef_logging.h"
#include "include/cef_app.h"
#include "include/cef_command_line.h"
#include "include/cef_parser.h"
#include "include/cef_process_util.h"
#include "include/cef_values.h"

#include "goldweb_client.h"

namespace {

// The chrome UI. The host ("app") must stay constant so that relative asset
// URLs such as ../../brand/gold-ui/tokens.css resolve under the same origin;
// the scheme handler maps the URL path onto the UI root.
const char kChromeUrl[] = "goldweb://app/ui/chrome/index.html";

const char kInternalScheme[] = "goldweb://";

// Content pages are a neutral near-black while they load, so a slow page does
// not flash the chrome's wallpaper through the tab.
const cef_color_t kContentBackground = 0xFF0A0A0C;

// Only real web pages are history. Internal pages (goldweb://) have no content
// browser to report a URL in the first place, but a page's about:blank or a
// data: frame should not be remembered either.
bool IsWebUrl(const std::string& url) {
  return url.rfind("http://", 0) == 0 || url.rfind("https://", 0) == 0;
}

// Where downloads go: the desktop's Downloads folder if it has one, otherwise
// the profile. Created on demand, because a download into a folder that is not
// there fails.
std::string DownloadDirectory(const std::string& profile_dir) {
  const char* xdg = std::getenv("XDG_DOWNLOAD_DIR");
  std::string dir = (xdg && *xdg) ? xdg : std::string();
  if (dir.empty()) {
    const char* home = std::getenv("HOME");
    if (home && *home) {
      dir = std::string(home) + "/Downloads";
    }
  }
  if (dir.empty()) {
    dir = profile_dir.empty() ? std::string(".") : profile_dir + "/downloads";
  }
  mkdir(dir.c_str(), 0755);  // EEXIST is expected and fine.
  return dir;
}

// A path in |dir| for |name| that does not overwrite anything: "report.pdf",
// then "report (1).pdf", and so on.
std::string UniquePath(const std::string& dir, const std::string& name) {
  std::string stem = name;
  std::string ext;
  const std::string::size_type dot = name.find_last_of('.');
  if (dot != std::string::npos && dot != 0) {
    stem = name.substr(0, dot);
    ext = name.substr(dot);
  }
  std::string candidate = dir + "/" + name;
  for (int n = 1; n < 10000 && access(candidate.c_str(), F_OK) == 0; ++n) {
    candidate = dir + "/" + stem + " (" + std::to_string(n) + ")" + ext;
  }
  return candidate;
}

// Hand a file or folder to the desktop to open. A failure is logged, never
// surfaced: an unopened download is not worth a dialog.
void LaunchWithDefaultApp(const std::string& target) {
  if (target.empty()) {
    return;
  }
  CefRefPtr<CefCommandLine> command = CefCommandLine::CreateCommandLine();
  command->SetProgram("xdg-open");
  command->AppendArgument(target);
  if (!CefLaunchProcess(command)) {
    LOG(WARNING) << "Could not open " << target << " with the desktop";
  }
}

}  // namespace

GoldWebWindowDelegate::GoldWebWindowDelegate(std::string profile_dir)
    : profile_dir_(std::move(profile_dir)) {
  if (!profile_dir_.empty()) {
    history_.Load(profile_dir_ + "/goldweb-history.json");
    bookmarks_.Load(profile_dir_ + "/goldweb-bookmarks.json");
    downloads_.Load(profile_dir_ + "/goldweb-downloads.json");
  }
}

GoldWebWindowDelegate::~GoldWebWindowDelegate() = default;

// static
CefRefPtr<GoldWebWindowDelegate> GoldWebWindowDelegate::Create(
    const std::string& profile_dir) {
  CefRefPtr<GoldWebWindowDelegate> delegate(
      new GoldWebWindowDelegate(profile_dir));
  CefWindow::CreateTopLevelWindow(delegate);
  return delegate;
}

CefRect GoldWebWindowDelegate::GetInitialBounds(CefRefPtr<CefWindow> window) {
  // TODO: persist the window size and position between runs.
  return CefRect(80, 80, 1280, 800);
}

void GoldWebWindowDelegate::OnWindowCreated(CefRefPtr<CefWindow> window) {
  window_ = window;
  window_size_ = window->GetSize();

  CefRefPtr<GoldWebClient> client(new GoldWebClient(this));
  CefBrowserSettings settings;
  chrome_view_ = CefBrowserView::CreateBrowserView(
      client, kChromeUrl, settings, nullptr, nullptr, nullptr);
  chrome_view_->SetBackgroundColor(0xFF000000);

  // The chrome fills the window; content browsers are added as overlays on top
  // of just the page area, so no native layout is needed for them.
  window->SetToFillLayout();
  window->AddChildView(chrome_view_);
  window->SetTitle("Gold-Web");
  window->Show();
}

void GoldWebWindowDelegate::OnWindowDestroyed(CefRefPtr<CefWindow> window) {
  window_ = nullptr;
  chrome_view_ = nullptr;
  chrome_browser_ = nullptr;
  active_id_.clear();

  // Releasing the tab views is what closes the content browsers. Move the tabs
  // into a local so the map is not being mutated if a client reports back while
  // the views are being torn down; FindTab then simply finds nothing.
  std::map<std::string, GoldWebTab> closing;
  closing.swap(tabs_);
}

/* ------------------------------------------------------- browser lifetime */

void GoldWebWindowDelegate::OnBrowserCreated() {
  ++browser_count_;
}

void GoldWebWindowDelegate::OnBrowserClosed() {
  if (browser_count_ > 0) {
    --browser_count_;
  }
  if (browser_count_ > 0) {
    return;
  }

  // Nothing is left. Release the last CEF references while the message loop is
  // still running, then leave it: releasing wrappers after CefShutdown() is
  // undefined behaviour and crashes.
  tabs_.clear();
  active_id_.clear();
  chrome_browser_ = nullptr;
  chrome_view_ = nullptr;
  window_ = nullptr;
  CefQuitMessageLoop();
}

void GoldWebWindowDelegate::OnWindowBoundsChanged(CefRefPtr<CefWindow> window,
                                                  const CefRect& new_bounds) {
  window_size_ = CefSize(new_bounds.width, new_bounds.height);
  Layout();
}

/* --------------------------------------------------------------- tabs */

GoldWebTab* GoldWebWindowDelegate::FindTab(const std::string& id) {
  const auto it = tabs_.find(id);
  return it == tabs_.end() ? nullptr : &it->second;
}

void GoldWebWindowDelegate::CreateTab(const std::string& id) {
  if (id.empty()) {
    return;
  }
  // Indexing keeps an existing tab unchanged if the UI re-sends tab:new.
  GoldWebTab& tab = tabs_[id];
  tab.id = id;
}

void GoldWebWindowDelegate::CloseTab(const std::string& id) {
  const auto it = tabs_.find(id);
  if (it == tabs_.end()) {
    return;
  }
  GoldWebTab& tab = it->second;

  // Close the browser first, while its view is still attached, then let go of
  // the overlay and views. Closing after tearing the view down can leave the
  // browser alive with no way to reach it.
  CefRefPtr<CefBrowser> browser =
      (tab.view && tab.view->GetBrowser()) ? tab.view->GetBrowser() : nullptr;
  if (browser) {
    browser->GetHost()->CloseBrowser(true);
  }
  if (tab.overlay) {
    tab.overlay->Destroy();
    tab.overlay = nullptr;
  }
  tab.view = nullptr;
  tab.client = nullptr;

  if (active_id_ == id) {
    active_id_.clear();
  }
  tabs_.erase(it);
}

void GoldWebWindowDelegate::ActivateTab(const std::string& id) {
  GoldWebTab* tab = FindTab(id);
  if (!tab) {
    return;
  }
  active_id_ = id;
  Layout();

  // Move keyboard focus to whatever the user is now looking at.
  if (!tab->internal && tab->view && tab->view->GetBrowser()) {
    tab->view->GetBrowser()->GetHost()->SetFocus(true);
  } else if (chrome_browser_) {
    chrome_browser_->GetHost()->SetFocus(true);
  }
  SendTabState(id);
  SendProtection(id);
}

void GoldWebWindowDelegate::EnsureContent(GoldWebTab& tab) {
  if (tab.view) {
    return;
  }

  CefRefPtr<GoldWebContentClient> client(
      new GoldWebContentClient(this, tab.id));
  CefBrowserSettings settings;
  settings.background_color = kContentBackground;
  CefRefPtr<CefBrowserView> view = CefBrowserView::CreateBrowserView(
      client, "about:blank", settings, nullptr, nullptr,
      new GoldWebContentBrowserViewDelegate());
  if (!view) {
    LOG(ERROR) << "Could not create a content browser for tab " << tab.id;
    return;
  }
  view->SetBackgroundColor(kContentBackground);

  tab.client = client;
  tab.view = view;

  if (window_) {
    tab.overlay = window_->AddOverlayView(view, CEF_DOCKING_MODE_CUSTOM, true);
    if (tab.overlay) {
      tab.overlay->SetVisible(false);
    }
  }
}

void GoldWebWindowDelegate::GoTo(const std::string& id, const std::string& url) {
  GoldWebTab* tab = FindTab(id);
  if (!tab || url.empty()) {
    return;
  }

  if (url.rfind(kInternalScheme, 0) == 0) {
    // New tab, Settings, the Protection Centre: the chrome UI draws these, so
    // there is nothing to load here — just take the page overlay away. The UI
    // owns the title for internal pages; clear ours so we do not overwrite it.
    tab->internal = true;
    tab->url = url;
    tab->title.clear();
    tab->pending_url.clear();
    tab->loading = false;
    tab->can_go_back = false;
    tab->can_go_forward = false;
    ActivateTab(id);
    SendTabState(id);
    return;
  }

  tab->internal = false;
  tab->url = url;
  EnsureContent(*tab);

  if (tab->view && tab->view->GetBrowser() &&
      tab->view->GetBrowser()->GetMainFrame()) {
    tab->view->GetBrowser()->GetMainFrame()->LoadURL(url);
    tab->pending_url.clear();
  } else {
    // The browser is still coming up; load once OnAfterCreated fires.
    tab->pending_url = url;
  }
  ActivateTab(id);
  SendTabState(id);
}

void GoldWebWindowDelegate::Layout() {
  if (!window_) {
    return;
  }
  const int height = window_size_.height - content_top_;
  const int width = content_width_ > 0 ? content_width_ : window_size_.width;
  const CefRect rect(content_left_, content_top_, width, height > 0 ? height : 0);
  for (auto& entry : tabs_) {
    GoldWebTab& tab = entry.second;
    if (!tab.overlay) {
      continue;
    }
    const bool show = (entry.first == active_id_) && !tab.internal;
    if (show) {
      tab.overlay->SetBounds(rect);
    }
    tab.overlay->SetVisible(show);
  }
}

/* ---------------------------------------------------------- reporting */

void GoldWebWindowDelegate::RunInChrome(const std::string& script) {
  if (!chrome_browser_ || !chrome_browser_->GetMainFrame()) {
    return;
  }
  chrome_browser_->GetMainFrame()->ExecuteJavaScript(script, "", 0);
}

void GoldWebWindowDelegate::SendTabState(const std::string& id) {
  GoldWebTab* tab = FindTab(id);
  if (!tab) {
    return;
  }
  CefRefPtr<CefDictionaryValue> state = CefDictionaryValue::Create();
  state->SetString("id", tab->id);
  state->SetString("title", tab->title);
  state->SetString("url", tab->url);
  state->SetBool("loading", tab->loading);
  state->SetBool("canGoBack", tab->can_go_back);
  state->SetBool("canGoForward", tab->can_go_forward);
  state->SetBool("external", !tab->internal);

  CefRefPtr<CefValue> value = CefValue::Create();
  value->SetDictionary(state);
  const CefString json = CefWriteJSON(value, JSON_WRITER_DEFAULT);

  RunInChrome("window.GoldChrome&&window.GoldChrome.onTabState(" +
              json.ToString() + ");");
}

void GoldWebWindowDelegate::SendProtection(const std::string& id) {
  const GoldWebTab* tab = FindTab(id);
  const int page = tab ? tab->blocked : 0;
  RunInChrome("window.GoldChrome&&window.GoldChrome.onProtection({page:" +
              std::to_string(page) +
              ",session:" + std::to_string(session_blocked_) +
              ",enabled:" + (protection_enabled_ ? "true" : "false") + "});");
}

/* -------------------------------------------------- chrome client calls */

void GoldWebWindowDelegate::OnChromeBrowserCreated(CefRefPtr<CefBrowser> browser) {
  chrome_browser_ = browser;
}

void GoldWebWindowDelegate::OnChromeCommand(
    const std::string& command,
    CefRefPtr<CefDictionaryValue> args) {
  const std::string id =
      (args && args->HasKey("id")) ? args->GetString("id").ToString() : "";

  if (command == "chrome:ready") {
    return;
  }
  if (command == "chrome:top") {
    // The chrome reports where the page area is. With the tab strip on a side
    // it also starts a rail width in, so honour left/width too.
    if (args) {
      if (args->HasKey("top")) content_top_ = args->GetInt("top");
      if (args->HasKey("left")) content_left_ = args->GetInt("left");
      if (args->HasKey("width")) content_width_ = args->GetInt("width");
    }
    Layout();
    return;
  }
  if (command == "protection:set") {
    protection_enabled_ =
        !args || !args->HasKey("enabled") || args->GetBool("enabled");
    SendProtection(active_id_);
    return;
  }
  if (command == "history:list") {
    RunInChrome("window.GoldChrome&&window.GoldChrome.onHistory({entries:" +
                history_.ToJSON() + "});");
    return;
  }
  if (command == "history:clear") {
    history_.Clear();
    RunInChrome("window.GoldChrome&&window.GoldChrome.onHistory({entries:[]});");
    return;
  }
  if (command == "bookmark:list") {
    SendBookmarks();
    return;
  }
  if (command == "bookmark:add" || command == "bookmark:remove") {
    const std::string url =
        (args && args->HasKey("url")) ? args->GetString("url").ToString() : "";
    const std::string title = (args && args->HasKey("title"))
                                  ? args->GetString("title").ToString()
                                  : std::string();
    if (command == "bookmark:add") {
      bookmarks_.Add(url, title);
    } else {
      bookmarks_.Remove(url);
    }
    // Send the whole list back so the star and the Bookmarks page agree with
    // the store, whatever the interface thought it knew.
    SendBookmarks();
    return;
  }
  if (command == "bookmark:clear") {
    bookmarks_.Clear();
    SendBookmarks();
    return;
  }
  if (command == "download:list") {
    SendDownloads();
    return;
  }
  if (command == "download:cancel") {
    if (args && args->HasKey("id")) {
      CancelDownload(args->GetInt("id"));
    }
    return;
  }
  if (command == "download:remove") {
    if (args && args->HasKey("id")) {
      downloads_.Remove(args->GetInt("id"));
    }
    SendDownloads();
    return;
  }
  if (command == "download:clear") {
    downloads_.Clear();
    SendDownloads();
    return;
  }
  if (command == "download:open" || command == "download:reveal") {
    if (args && args->HasKey("path")) {
      const std::string path = args->GetString("path").ToString();
      // "Open" hands over the file; "show in folder" hands over the folder it
      // is in, because that is what a file manager can actually show.
      if (command == "download:reveal") {
        const std::string::size_type slash = path.find_last_of('/');
        if (slash != std::string::npos) {
          LaunchWithDefaultApp(path.substr(0, slash));
        }
      } else {
        LaunchWithDefaultApp(path);
      }
    }
    return;
  }
  if (command == "tab:new") {
    CreateTab(id);
    return;
  }
  if (command == "tab:close") {
    CloseTab(id);
    return;
  }
  if (command == "tab:activate") {
    ActivateTab(id);
    return;
  }
  if (command == "tab:go") {
    GoTo(id, (args && args->HasKey("url")) ? args->GetString("url").ToString()
                                           : std::string());
    return;
  }

  // Navigation commands act on the tab's content browser.
  GoldWebTab* tab = FindTab(id);
  if (!tab || !tab->view || !tab->view->GetBrowser()) {
    return;
  }
  CefRefPtr<CefBrowser> browser = tab->view->GetBrowser();
  if (command == "nav:back") {
    browser->GoBack();
  } else if (command == "nav:forward") {
    browser->GoForward();
  } else if (command == "nav:reload") {
    browser->Reload();
  } else if (command == "nav:stop") {
    browser->StopLoad();
  } else if (command == "nav:zoom") {
    const std::string direction =
        (args && args->HasKey("direction"))
            ? args->GetString("direction").ToString()
            : std::string();
    double level = tab->zoom_level;
    if (direction == "in") {
      level = std::min(level + 0.5, 5.0);
    } else if (direction == "out") {
      level = std::max(level - 0.5, -3.0);
    } else if (direction == "reset") {
      level = 0;
    }
    tab->zoom_level = level;
    browser->GetHost()->SetZoomLevel(level);
    RunInChrome("window.GoldChrome&&window.GoldChrome.onZoom({id:'" + tab->id +
                "',level:" + std::to_string(level) + "});");
  } else if (command == "find:start" || command == "find:next") {
    const std::string text =
        (args && args->HasKey("text")) ? args->GetString("text").ToString() : "";
    if (text.empty()) {
      browser->GetHost()->StopFinding(true);
    } else {
      const bool forward =
          !args || !args->HasKey("forward") || args->GetBool("forward");
      const bool match_case = args && args->HasKey("matchCase") &&
                              args->GetBool("matchCase");
      browser->GetHost()->Find(text, forward, match_case,
                               command == "find:next");
    }
  } else if (command == "find:stop") {
    browser->GetHost()->StopFinding(true);
  }
}

/* ------------------------------------------------- content client calls */

void GoldWebWindowDelegate::OnContentBrowserCreated(const std::string& tab_id) {
  GoldWebTab* tab = FindTab(tab_id);
  if (!tab) {
    return;
  }
  if (!tab->pending_url.empty() && tab->view && tab->view->GetBrowser() &&
      tab->view->GetBrowser()->GetMainFrame()) {
    tab->view->GetBrowser()->GetMainFrame()->LoadURL(tab->pending_url);
    tab->pending_url.clear();
  }
  // A zoom the tab already had carries over to its (re)created browser.
  if (tab->view && tab->view->GetBrowser() && tab->zoom_level != 0) {
    tab->view->GetBrowser()->GetHost()->SetZoomLevel(tab->zoom_level);
  }
  Layout();
}

void GoldWebWindowDelegate::OnContentClosed(const std::string& tab_id) {
  GoldWebTab* tab = FindTab(tab_id);
  if (!tab) {
    return;
  }
  tab->view = nullptr;
  tab->overlay = nullptr;
  tab->client = nullptr;
}

void GoldWebWindowDelegate::OnContentLoadingState(const std::string& tab_id,
                                                  bool loading,
                                                  bool can_go_back,
                                                  bool can_go_forward) {
  GoldWebTab* tab = FindTab(tab_id);
  if (!tab) {
    return;
  }
  tab->loading = loading;
  tab->can_go_back = can_go_back;
  tab->can_go_forward = can_go_forward;
  SendTabState(tab_id);
  SendProtection(tab_id);
}

void GoldWebWindowDelegate::OnContentTitle(const std::string& tab_id,
                                           const std::string& title) {
  GoldWebTab* tab = FindTab(tab_id);
  if (!tab) {
    return;
  }
  const bool changed = tab->title != title;
  tab->title = title;
  SendTabState(tab_id);
  // The title arrives after the URL, so the visit recorded on URL change gets
  // its real name here. Re-adding the same URL refreshes it in place.
  if (changed && IsWebUrl(tab->url)) {
    history_.Add(tab->url, title);
  }
}

void GoldWebWindowDelegate::OnContentUrl(const std::string& tab_id,
                                         const std::string& url) {
  GoldWebTab* tab = FindTab(tab_id);
  if (!tab || tab->internal) {
    return;
  }
  tab->url = url;
  SendTabState(tab_id);
  if (IsWebUrl(url)) {
    history_.Add(url, tab->title);
  }
}

void GoldWebWindowDelegate::OnContentLoadError(const std::string& tab_id,
                                               const std::string& url,
                                               int error_code,
                                               const std::string& error_text) {
  GoldWebTab* tab = FindTab(tab_id);
  if (!tab) {
    return;
  }
  LOG(ERROR) << "Tab " << tab_id << " could not load " << url << " ("
             << error_code << "): " << error_text;
  // Keep the URL honest but show that it failed, rather than a blank tab.
  tab->url = url;
  if (tab->title.empty() || tab->title == "about:blank") {
    tab->title = error_text.empty() ? "Page didn't load" : error_text;
  }
  SendTabState(tab_id);
}

void GoldWebWindowDelegate::OnContentPopup(const std::string& tab_id,
                                           const std::string& url) {
  // No popup windows yet: send the target to the tab that asked for it.
  GoTo(tab_id, url);
}

void GoldWebWindowDelegate::OnContentBlocked(const std::string& tab_id,
                                             const std::string& host) {
  GoldWebTab* tab = FindTab(tab_id);
  if (!tab) {
    return;
  }
  ++tab->blocked;
  ++session_blocked_;
  SendProtection(tab_id);
}

void GoldWebWindowDelegate::OnContentAccelerator(const std::string& name) {
  // |name| is one of a fixed set produced by the content client, so it is safe
  // to interpolate. The chrome decides what each action does.
  RunInChrome("window.GoldChrome&&window.GoldChrome.onAccelerator('" + name +
              "');");
}

void GoldWebWindowDelegate::OnContentFindResult(const std::string& tab_id,
                                                int count,
                                                int active_match,
                                                bool final_update) {
  RunInChrome("window.GoldChrome&&window.GoldChrome.onFindResult({id:'" +
              tab_id + "',count:" + std::to_string(count) +
              ",active:" + std::to_string(active_match) +
              ",final:" + (final_update ? "true" : "false") + "});");
}

/* ------------------------------------------------------------- bookmarks */

void GoldWebWindowDelegate::SendBookmarks() {
  RunInChrome("window.GoldChrome&&window.GoldChrome.onBookmarks({entries:" +
              bookmarks_.ToJSON() + "});");
}

/* ------------------------------------------------------------- downloads */

std::string GoldWebWindowDelegate::TakeDownloadPath(
    const std::string& suggested_name) {
  const std::string dir = DownloadDirectory(profile_dir_);

  // A site can suggest anything, including a path. Keep only the file name so a
  // download cannot be talked into writing somewhere else.
  std::string name = suggested_name.empty() ? "download" : suggested_name;
  const std::string::size_type slash = name.find_last_of('/');
  if (slash != std::string::npos) {
    name = name.substr(slash + 1);
  }
  if (name.empty() || name == "." || name == "..") {
    name = "download";
  }

  return UniquePath(dir, name);
}

void GoldWebWindowDelegate::OnDownloadStart(int id,
                                            const std::string& url,
                                            const std::string& name,
                                            const std::string& path) {
  goldweb::Download item;
  item.id = id;
  item.url = url;
  item.name = name;
  item.path = path;
  item.percent = -1;
  item.state = "progress";
  item.time = static_cast<double>(std::time(nullptr));
  downloads_.Update(item);
  SendDownloads();
}

void GoldWebWindowDelegate::OnDownloadProgress(CefRefPtr<CefDownloadItem> item) {
  if (!item) {
    return;
  }
  goldweb::Download entry;
  entry.id = static_cast<int>(item->GetId());
  entry.url = item->GetURL().ToString();
  entry.name = item->GetSuggestedFileName().ToString();
  entry.path = item->GetFullPath().ToString();
  entry.received = item->GetReceivedBytes();
  entry.total = item->GetTotalBytes();
  entry.percent = item->GetPercentComplete();
  if (item->IsComplete()) {
    entry.state = "done";
  } else if (item->IsCanceled()) {
    entry.state = "cancelled";
  } else if (item->IsInterrupted()) {
    entry.state = "interrupted";
  } else {
    entry.state = "progress";
  }
  // time == 0: Downloads::Update keeps the start time it already has.

  if (entry.state != "progress") {
    cancel_requests_.erase(entry.id);
  }
  downloads_.Update(entry);
  SendDownloads();
}

bool GoldWebWindowDelegate::DownloadCancelRequested(int id) const {
  return cancel_requests_.find(id) != cancel_requests_.end();
}

void GoldWebWindowDelegate::CancelDownload(int id) {
  if (id == 0) {
    return;
  }
  cancel_requests_.insert(id);
}

void GoldWebWindowDelegate::SendDownloads() {
  RunInChrome("window.GoldChrome&&window.GoldChrome.onDownloads({entries:" +
              downloads_.ToJSON() + "});");
}
