#include "app.h"
#include <iostream>

int main(int argc, char* argv[]) {
    Application app;

    if (!app.initialize(argc, argv)) {
        std::cerr << "[gold-logs] Error: Initialization failed." << std::endl;
        return 1;
    }

    app.run();
    app.shutdown();

    return 0;
}