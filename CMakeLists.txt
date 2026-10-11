# Gold-Web is built from app/ (the CEF shell).
#
# That subdirectory is the real CMake entry point, so the documented build is:
#
#   scripts/fetch-cef.sh
#   cmake -S app -B build -G Ninja -DCMAKE_BUILD_TYPE=Release
#   cmake --build build
#
# This top-level file is only a convenience so that `cmake -S . -B build` also
# works; it forwards to the same place.

cmake_minimum_required(VERSION 3.21)

project(goldweb LANGUAGES C CXX)

add_subdirectory(app)
