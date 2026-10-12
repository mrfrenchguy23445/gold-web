#ifndef GOLDWEB_BOOKMARKS_H_
#define GOLDWEB_BOOKMARKS_H_

#include <string>
#include <vector>

namespace goldweb {

// One saved page: where it goes, what it is called, and when it was saved.
struct Bookmark {
  std::string url;
  std::string title;
  double time = 0;  // seconds since the epoch, as JSON numbers like to be
};

// The bookmarks, kept in one small JSON file beside the profile.
//
// Deliberately the same shape as the history store: a plain file that is easy to
// read, inspect and migrate, bounded, newest-first on the wire, and never sent
// anywhere. A URL can only be bookmarked once; saving it again just refreshes
// the title and the time, which is what the star toggle relies on.
class Bookmarks {
 public:
  static constexpr size_t kMaxEntries = 5000;

  // Read the file (if any) at |path|. A missing or corrupt file is simply no
  // bookmarks; it is never worth failing to start over.
  void Load(const std::string& path);

  // Save a page. Empty URLs are ignored. Saving a URL that is already there
  // refreshes it in place instead of stacking a duplicate.
  void Add(const std::string& url, const std::string& title);

  // Remove a page by URL. Returns true if something was removed.
  bool Remove(const std::string& url);

  // Forget everything, on disk too.
  void Clear();

  // A JSON array of bookmarks, newest first — the shape the interface renders.
  std::string ToJSON() const;

  size_t size() const { return entries_.size(); }

 private:
  void Save() const;

  std::string path_;
  std::vector<Bookmark> entries_;  // oldest first
};

}  // namespace goldweb

#endif  // GOLDWEB_BOOKMARKS_H_
