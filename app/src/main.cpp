#include <cstdlib>
#include <string>
#include <vector>

#include "include/cef_app.h"
#include "include/cef_command_line.h"

#include "goldweb_app.h"

#if defined(__linux__)
#include <unistd.h>
#endif

namespace {

bool FileExists(const std::string& path) {
  return access(path.c_str(), F_OK) == 0;
}

std::string DirName(const std::string& path) {
  const std::string::size_type slash = path.find_last_of('/');
  return (slash == std::string::npos) ? std::string() : path.substr(0, slash);
}

std::string ExecutableDir() {
  char buffer[4096];
  const ssize_t length = readlink("/proc/self/exe", buffer, sizeof(buffer) - 1);
  if (length <= 0) {
    return ".";
  }
  buffer[length] = '\0';
  return DirName(std::string(buffer));
}

// The scheme handler serves goldweb:///... from a directory containing the ui/
// and brand/ trees. Resolution order: --goldweb-root, $GOLDWEB_ROOT, the
// working directory, then the executable directory (and its source tree).
std::string ResolveUiRoot(int argc, char* argv[]) {
  const std::string flag = "--goldweb-root=";
  for (int i = 1; i < argc; ++i) {
    const std::string arg = argv[i];
    if (arg.rfind(flag, 0) == 0) {
      return arg.substr(flag.size());
    }
  }

  if (const char* env = std::getenv("GOLDWEB_ROOT")) {
    return env;
  }

  if (FileExists("ui/chrome/index.html")) {
    return ".";
  }

  const std::string exe_dir = ExecutableDir();
  if (FileExists(exe_dir + "/ui/chrome/index.html")) {
    return exe_dir;
  }
  if (FileExists(exe_dir + "/../../ui/chrome/index.html")) {
    return exe_dir + "/../..";
  }

  return ".";
}

bool HasSwitch(int argc, char* argv[], const char* name) {
  const std::string wanted(name);
  for (int i = 1; i < argc; ++i) {
    if (wanted == argv[i]) {
      return true;
    }
  }
  return false;
}

}  // namespace

int main(int argc, char* argv[]) {
  // This build runs unsandboxed: the minimal CEF distribution ships no sandbox
  // library, so sub-processes are launched directly rather than through the
  // zygote. Adding the switch here means the binary behaves correctly even when
  // it is launched with no arguments at all.
  static char kNoZygote[] = "--no-zygote";
  std::vector<char*> args(argv, argv + argc);
  if (!HasSwitch(argc, argv, kNoZygote)) {
    args.push_back(kNoZygote);
  }
  const int arg_count = static_cast<int>(args.size());

  CefMainArgs main_args(argc, argv);
  CefRefPtr<GoldWebApp> app(new GoldWebApp(ResolveUiRoot(arg_count, args.data())));

  // If this is a sub-process (renderer, GPU, utility) run it and exit.
  const int exit_code = CefExecuteProcess(main_args, app, nullptr);
  if (exit_code >= 0) {
    return exit_code;
  }

  const std::string exe_dir = ExecutableDir();
  const std::string user_data = exe_dir + "/user-data";

  CefSettings settings;
  settings.no_sandbox = true;
  settings.multi_threaded_message_loop = false;
  settings.log_severity = LOGSEVERITY_WARNING;

  // --goldweb-verbose raises CEF's logging (handy while developing).
  if (HasSwitch(argc, argv, "--goldweb-verbose")) {
    settings.log_severity = LOGSEVERITY_INFO;
  }

  // Keep browsing data next to the binary for now; a real profile directory is
  // a later milestone.
  CefString(&settings.root_cache_path) = user_data;
  CefString(&settings.cache_path) = user_data;
  CefString(&settings.resources_dir_path) = exe_dir;
  CefString(&settings.locales_dir_path) = exe_dir + "/locales";
  CefString(&settings.user_agent_product) = "GoldWeb";

  CefMainArgs init_args(arg_count, args.data());
  if (!CefInitialize(init_args, settings, app, nullptr)) {
    return 1;
  }

  CefRunMessageLoop();
  CefShutdown();
  return 0;
}
