#ifndef GOLDWEB_DOWNLOADS_H_
#define GOLDWEB_DOWNLOADS_H_

#include <cstdint>
#include <string>
#include <vector>

namespace goldweb {

// One download, flattened so it can be written to disk and handed to the
// interface. The live CefDownloadItem is only readable inside its callback, so
// everything we want to keep is copied here as it arrives.
struct Download {
  int id = 0;
  std::string url;
  std::string name;     // the suggested file name
  std::string path;     // where it is (or would be) written
  int64_t received = 0;  // bytes so far
  int64_t total = 0;     // bytes expected, 0 when the server did not say
  int percent = -1;      // 0..100, -1 when it cannot be known yet
  std::string state;  // "progress", "done", "cancelled" or "interrupted"
  double time = 0;    // seconds since the epoch, when it started
};

// The download list, kept in one small JSON file beside the profile, the same
// way history and bookmarks are. Newest first. A download that was still in
// progress when Gold-Web last closed is shown as interrupted on the next run
// rather than silently forgotten.
class Downloads {
 public:
  static constexpr size_t kMaxEntries = 500;

  void Load(const std::string& path);

  // Insert or update one download, keyed by its id. In-memory always; to disk
  // only when it starts or reaches a final state, so progress ticks do not
  // hammer the file.
  void Update(const Download& item);

  void Remove(int id);
  void Clear();

  // A JSON array, newest first — the shape the interface renders.
  std::string ToJSON() const;

  size_t size() const { return items_.size(); }

 private:
  void Save() const;

  std::string path_;
  std::vector<Download> items_;  // newest first
};

}  // namespace goldweb

#endif  // GOLDWEB_DOWNLOADS_H_
