#include "goldweb_history.h"

#include <ctime>
#include <fstream>
#include <iterator>

#include "include/cef_parser.h"
#include "include/cef_values.h"

namespace goldweb {

void History::Load(const std::string& path) {
  path_ = path;
  entries_.clear();
  if (path_.empty()) {
    return;
  }

  std::ifstream in(path_, std::ios::binary);
  if (!in) {
    return;  // No history yet, which is the normal first run.
  }
  const std::string text((std::istreambuf_iterator<char>(in)),
                         std::istreambuf_iterator<char>());

  CefRefPtr<CefValue> value =
      CefParseJSON(CefString(text), JSON_PARSER_ALLOW_TRAILING_COMMAS);
  if (!value || value->GetType() != VTYPE_LIST) {
    return;  // A corrupt file is treated as no history.
  }

  CefRefPtr<CefListValue> list = value->GetList();
  for (size_t i = 0; i < list->GetSize(); ++i) {
    if (list->GetType(i) != VTYPE_DICTIONARY) {
      continue;
    }
    CefRefPtr<CefDictionaryValue> row = list->GetDictionary(i);
    HistoryEntry entry;
    entry.url = row->GetString("url").ToString();
    entry.title = row->GetString("title").ToString();
    entry.time = row->GetDouble("time");
    if (!entry.url.empty()) {
      entries_.push_back(std::move(entry));
    }
  }
}

void History::Add(const std::string& url, const std::string& title) {
  if (url.empty()) {
    return;
  }
  const double now = static_cast<double>(std::time(nullptr));

  if (!entries_.empty() && entries_.back().url == url) {
    if (!title.empty()) {
      entries_.back().title = title;
    }
    entries_.back().time = now;
  } else {
    HistoryEntry entry;
    entry.url = url;
    entry.title = title;
    entry.time = now;
    entries_.push_back(std::move(entry));
  }

  if (entries_.size() > kMaxEntries) {
    entries_.erase(entries_.begin(),
                   entries_.begin() + (entries_.size() - kMaxEntries));
  }
  Save();
}

void History::Clear() {
  entries_.clear();
  Save();
}

std::string History::ToJSON() const {
  CefRefPtr<CefListValue> list = CefListValue::Create();
  int index = 0;
  for (auto it = entries_.rbegin(); it != entries_.rend(); ++it) {
    CefRefPtr<CefDictionaryValue> row = CefDictionaryValue::Create();
    row->SetString("url", it->url);
    row->SetString("title", it->title);
    row->SetDouble("time", it->time);
    list->SetDictionary(index++, row);
  }

  CefRefPtr<CefValue> value = CefValue::Create();
  value->SetList(list);
  return CefWriteJSON(value, JSON_WRITER_DEFAULT).ToString();
}

void History::Save() const {
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
