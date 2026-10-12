#include "goldweb_downloads.h"

#include <algorithm>
#include <fstream>
#include <iterator>

#include "include/cef_parser.h"
#include "include/cef_values.h"

namespace goldweb {
namespace {

// A download is over once it is in one of these states; only then is it worth
// writing to disk (plus once when it first appears).
bool IsFinalState(const std::string& state) {
  return state == "done" || state == "cancelled" || state == "interrupted";
}

}  // namespace

void Downloads::Load(const std::string& path) {
  path_ = path;
  items_.clear();
  if (path_.empty()) {
    return;
  }

  std::ifstream in(path_, std::ios::binary);
  if (!in) {
    return;  // Nothing downloaded yet, which is the normal first run.
  }
  const std::string text((std::istreambuf_iterator<char>(in)),
                         std::istreambuf_iterator<char>());

  CefRefPtr<CefValue> value =
      CefParseJSON(CefString(text), JSON_PARSER_ALLOW_TRAILING_COMMAS);
  if (!value || value->GetType() != VTYPE_LIST) {
    return;
  }

  CefRefPtr<CefListValue> list = value->GetList();
  for (size_t i = 0; i < list->GetSize(); ++i) {
    if (list->GetType(i) != VTYPE_DICTIONARY) {
      continue;
    }
    CefRefPtr<CefDictionaryValue> row = list->GetDictionary(i);
    Download item;
    item.id = row->GetInt("id");
    item.url = row->GetString("url").ToString();
    item.name = row->GetString("name").ToString();
    item.path = row->GetString("path").ToString();
    item.received = row->GetInt("received");
    item.total = row->GetInt("total");
    item.percent = row->GetInt("percent");
    item.state = row->GetString("state").ToString();
    item.time = row->GetDouble("time");
    // A download that was still running when we last closed never finished.
    if (item.state == "progress") {
      item.state = "interrupted";
    }
    items_.push_back(std::move(item));
  }
}

void Downloads::Update(const Download& item) {
  if (item.id == 0) {
    return;
  }
  bool is_new = true;
  for (Download& existing : items_) {
    if (existing.id == item.id) {
      // A later update from CEF carries progress but not always the name or the
      // start time, so anything the new report left blank keeps what the first
      // report established. Losing the file name there would leave a row with
      // nothing to show.
      Download merged = item;
      if (merged.url.empty()) merged.url = existing.url;
      if (merged.name.empty()) merged.name = existing.name;
      if (merged.path.empty()) merged.path = existing.path;
      if (merged.total == 0) merged.total = existing.total;
      if (merged.time == 0) merged.time = existing.time;
      existing = merged;
      is_new = false;
      break;
    }
  }
  if (is_new) {
    items_.insert(items_.begin(), item);  // newest first
  }

  if (items_.size() > kMaxEntries) {
    items_.resize(kMaxEntries);
  }
  if (is_new || IsFinalState(item.state)) {
    Save();
  }
}

void Downloads::Remove(int id) {
  const auto it = std::remove_if(items_.begin(), items_.end(),
                                 [id](const Download& d) { return d.id == id; });
  if (it == items_.end()) {
    return;
  }
  items_.erase(it, items_.end());
  Save();
}

void Downloads::Clear() {
  items_.clear();
  Save();
}

std::string Downloads::ToJSON() const {
  CefRefPtr<CefListValue> list = CefListValue::Create();
  int index = 0;
  for (const Download& d : items_) {
    CefRefPtr<CefDictionaryValue> row = CefDictionaryValue::Create();
    row->SetInt("id", d.id);
    row->SetString("url", d.url);
    row->SetString("name", d.name);
    row->SetString("path", d.path);
    row->SetInt("received", static_cast<int>(d.received));
    row->SetInt("total", static_cast<int>(d.total));
    row->SetInt("percent", d.percent);
    row->SetString("state", d.state);
    row->SetDouble("time", d.time);
    list->SetDictionary(index++, row);
  }

  CefRefPtr<CefValue> value = CefValue::Create();
  value->SetList(list);
  return CefWriteJSON(value, JSON_WRITER_DEFAULT).ToString();
}

void Downloads::Save() const {
  if (path_.empty()) {
    return;
  }
  std::ofstream out(path_, std::ios::binary | std::ios::trunc);
  if (!out) {
    return;
  }
  out << ToJSON();
}

}  // namespace goldweb
