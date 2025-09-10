{
  "targets": [
    {
      "target_name": "hfstol_addon",
      "cflags_cc!": ["-fno-exceptions", "-fno-rtti"],
      "xcode_settings": {
        "GCC_ENABLE_CPP_EXCEPTIONS": "YES",
        "GCC_ENABLE_CPP_RTTI": "YES",
        "CLANG_CXX_LIBRARY": "libc++",
        "MACOSX_DEPLOYMENT_TARGET": "10.7"
      },
      "msvs_settings": {
        "VCCLCompilerTool": {
          "ExceptionHandling": 1,
          "RuntimeTypeInfo": 1,
          "AdditionalOptions": ["/GR"]
        }
      },
      "sources": ["hfst-optimized-lookup.cc", "hfstol_addon.cc"],
      "include_dirs": ["<!@(node -p \"require('node-addon-api').include\")"]
    }
  ]
}
