#ifndef GOLDWEB_HISTORY_H_
#define GOLDWEB_HISTORY_H_

#include <string>
#include <vector>

namespace goldweb {

// One visit we remember: where it went, what it was called, and when.
struct HistoryEntry {
  std::string url;
  std::string title;
  double time = 0;  // seconds since the epoch, as JSON numbers like to be
};

// The browsing history, kept in one small JSON file beside the profile.
//
// There is no database yet, on purpose: the file is easy to read, easy to
// inspect and easy to migrate when a real store lands. It is bounded, ordered
// oldest-first in memory and newest-first on the wire, and it never leaves the
// machine. Revisiting the same page as the previous entry updates it in place
// rather than stacking duplicates.
class History {
 public:
  static constexpr size_t kMaxEntries = 2000;

  // Read the file (if any) at |path|. A missing or corrupt file is simply an
  // empty history; it is never worth failing to start over.
  void Load(const std::string& path);

  // Record a visit. Empty URLs are ignored. A URL equal to the most recent one
  // has its title and time refreshed instead of being added again.
  void Add(const std::string& url, const std::string& title);

  // Forget everything, on disk too.
  void Clear();

  // A JSON array of entries, newest first — the shape the interface renders.
  std::string ToJSON() const;

  size_t size() const { return entries_.size(); }

 private:
  void Save() const;

  std::string path_;
  std::vector<HistoryEntry> entries_;  // oldest first
};

}  // namespace goldweb

#endif  // GOLDWEB_HISTORY_H_
