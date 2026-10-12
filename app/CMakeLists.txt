# Gold-Web browser shell (CEF).
#
# Configures against the CEF binary distribution in third_party/cef, builds the
# libcef_dll_wrapper and the `goldweb` executable, then stages CEF's runtime and
# the Gold UI next to the binary so it runs in place:
#
#   cmake -S app -B build -G Ninja -DCMAKE_BUILD_TYPE=Release
#   cmake --build build
#   ./build/Release/goldweb
#
# Override the distribution location with -DCEF_ROOT=/path/to/cef.

cmake_minimum_required(VERSION 3.21)

project(goldweb C CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

if(NOT CMAKE_BUILD_TYPE AND (CMAKE_GENERATOR STREQUAL "Ninja" OR CMAKE_GENERATOR STREQUAL "Unix Makefiles"))
  set(CMAKE_BUILD_TYPE Release CACHE STRING "Build type" FORCE)
endif()

# The minimal CEF distribution ships no sandbox library, so disable the sandbox.
# A packaged build can flip this once chrome-sandbox is installed setuid root.
set(USE_SANDBOX OFF CACHE BOOL "Enable the CEF sandbox" FORCE)

if(NOT CEF_ROOT)
  set(CEF_ROOT "${CMAKE_CURRENT_SOURCE_DIR}/../third_party/cef"
      CACHE PATH "CEF binary distribution root")
endif()
if(NOT IS_DIRECTORY "${CEF_ROOT}/cmake")
  message(FATAL_ERROR
          "CEF not found at ${CEF_ROOT}. Run scripts/fetch-cef.sh first, or "
          "configure with -DCEF_ROOT=/path/to/cef.")
endif()

list(APPEND CMAKE_MODULE_PATH "${CEF_ROOT}/cmake")
find_package(CEF REQUIRED)

# libcef_dll_wrapper, built from the distribution's own sources.
add_subdirectory("${CEF_LIBCEF_DLL_WRAPPER_PATH}" libcef_dll_wrapper)

# libcef.so as an imported target.
ADD_LOGICAL_TARGET("libcef_lib" "${CEF_LIB_DEBUG}" "${CEF_LIB_RELEASE}")

set(GOLDWEB_SOURCES
  src/main.cpp
  src/goldweb_app.cpp
  src/goldweb_blocklist.cpp
  src/goldweb_client.cpp
  src/goldweb_content_client.cpp
  src/goldweb_history.cpp
  src/goldweb_window.cpp
  src/goldweb_scheme.cpp
)

# Keep the executable and the staged CEF runtime together in the build root
# (<build>/goldweb), which is what the docs and scripts expect.
set(CEF_TARGET_OUT_DIR "${CMAKE_BINARY_DIR}")
set(CMAKE_RUNTIME_OUTPUT_DIRECTORY "${CEF_TARGET_OUT_DIR}")

add_executable(goldweb ${GOLDWEB_SOURCES})
target_include_directories(goldweb PRIVATE "${CMAKE_CURRENT_SOURCE_DIR}/include")

SET_EXECUTABLE_TARGET_PROPERTIES(goldweb)
target_link_libraries(goldweb PRIVATE
  libcef_dll_wrapper
  libcef_lib
  ${CEF_STANDARD_LIBS}
)

# Stage the CEF runtime next to the executable.
COPY_FILES(goldweb "${CEF_BINARY_FILES}" "${CEF_BINARY_DIR}" "${CEF_TARGET_OUT_DIR}")
COPY_RESOURCES(goldweb "${CEF_RESOURCE_FILES}" "Resources" "${CEF_RESOURCE_DIR}" "${CEF_TARGET_OUT_DIR}")

# Stage the Gold UI so goldweb:///... resolves under the executable directory.
add_custom_command(TARGET goldweb POST_BUILD
  COMMAND "${CMAKE_COMMAND}" -E copy_directory
          "${CMAKE_CURRENT_SOURCE_DIR}/../ui" "${CEF_TARGET_OUT_DIR}/ui"
  COMMAND "${CMAKE_COMMAND}" -E copy_directory
          "${CMAKE_CURRENT_SOURCE_DIR}/../brand" "${CEF_TARGET_OUT_DIR}/brand"
  COMMENT "Staging the Gold UI"
  VERBATIM
)
