#include "app.h"
#include <iostream>
#include <filesystem>
#include <cstdlib>

Application::Application() : m_isRunning(false)
#if defined(__linux__)
    , m_window(nullptr), m_webView(nullptr)
#endif
{}

Application::~Application() {}

std::string Application::getUIPath() {
    std::filesystem::path currentPath = std::filesystem::current_path();

    // Resolve path when executing from build/ directory or root
    std::filesystem::path uiPath = currentPath / "../ui/chrome/index.html";
    if (!std::filesystem::exists(uiPath)) {
        uiPath = currentPath / "ui/chrome/index.html";
    }

    return "file://" + std::filesystem::canonical(uiPath).string();
}

bool Application::initialize(int argc, char* argv[]) {
#if defined(__linux__)
    // Force software rendering for WebKitGTK to bypass NVIDIA GBM/DRM buffer errors
    setenv("WEBKIT_DISABLE_COMPOSITING_MODE", "1", 1);
    setenv("WEBKIT_DISABLE_DMABUF_RENDERER", "1", 1);
    setenv("LIBGL_ALWAYS_SOFTWARE", "1", 1);

    std::cout << "[gold-logs] Initializing GTK & WebKit runtime..." << std::endl;

    gtk_init(&argc, &argv);

    // Create main window
    m_window = gtk_window_new(GTK_WINDOW_TOPLEVEL);
    gtk_window_set_default_size(GTK_WINDOW(m_window), 1024, 680);
    gtk_window_set_title(GTK_WINDOW(m_window), "Gold-Web");
    gtk_window_set_position(GTK_WINDOW(m_window), GTK_WIN_POS_CENTER);

    g_signal_connect(m_window, "destroy", G_CALLBACK(gtk_main_quit), NULL);

    // Create WebKit view
    m_webView = WEBKIT_WEB_VIEW(webkit_web_view_new());

    gtk_container_add(GTK_CONTAINER(m_window), GTK_WIDGET(m_webView));

    // Load local UI
    std::string targetUrl = getUIPath();
    std::cout << "[gold-logs] Loading UI from: " << targetUrl << std::endl;
    webkit_web_view_load_uri(m_webView, targetUrl.c_str());

    gtk_widget_show_all(m_window);
#endif

    m_isRunning = true;
    return true;
}

void Application::run() {
    std::cout << "[gold-logs] Starting GTK main loop..." << std::endl;

#if defined(__linux__)
    if (m_isRunning) {
        gtk_main();
    }
#endif
}

void Application::shutdown() {
    std::cout << "[gold-logs] Shutting down app." << std::endl;
}