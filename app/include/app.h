#ifndef APP_H
#define APP_H

#include <string>

#if defined(__linux__)
#include <gtk/gtk.h>
#include <webkit2/webkit2.h>
#endif

class Application {
public:
    Application();
    ~Application();

    bool initialize(int argc, char* argv[]);
    void run();
    void shutdown();

private:
    bool m_isRunning;
    std::string getUIPath();

#if defined(__linux__)
    GtkWidget* m_window;
    WebKitWebView* m_webView;
#endif
};

#endif // APP_H