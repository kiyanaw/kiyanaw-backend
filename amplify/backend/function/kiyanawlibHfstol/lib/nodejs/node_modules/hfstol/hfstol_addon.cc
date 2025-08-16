#include "hfst-optimized-lookup.h"
#include <napi.h>

#define VALUE_TO_CSTR(v) ((v).As<Napi::String>().Utf8Value().c_str())

static bool isArgumentCountValid(const Napi::CallbackInfo &info,
                                 size_t expected_argument_count) {
  auto env = info.Env();

  if (info.Length() != expected_argument_count) {
    Napi::TypeError::New(env, "Wrong number of arguments")
        .ThrowAsJavaScriptException();
    return false;
  }
  return true;
}

/**
 * C++ node-addon-api wrapper for hfst-optimized-lookup
 *
 * Constructor: `new Transducer(path_to_hfstol_file)`
 * Methods:
 *     .lookup_symbols(string) => array of array of symbols
 *         example: lookup_symbols("atim") => [
 *           ["a", "t", "i", "m", "+N", "+A", +Sg"],
 *           ["a", "t", "i", "m", "ê", "w", "+V", "+TA", "+Imp", "+Imm",
 *            "+2Sg", "+3SgO"]
*          ]
 */
class TransducerWrapper : public Napi::ObjectWrap<TransducerWrapper> {

public:
  TransducerWrapper(const Napi::CallbackInfo &info)
      : Napi::ObjectWrap<TransducerWrapper>(info) {
    auto env = info.Env();

    if (!isArgumentCountValid(info, 1))
      return;

    try {
      tr = new TransducerFile(VALUE_TO_CSTR(info[0]));
    } catch (const std::exception &e) {
      throw Napi::Error::New(env, std::string(e.what()));
    }
  }

  Napi::Value lookup_symbols(const Napi::CallbackInfo &info) {
    auto env = info.Env();

    if (!isArgumentCountValid(info, 1))
      return env.Null();

    auto transducer_results = tr->lookup(VALUE_TO_CSTR(info[0]));

    auto ret = Napi::Array::New(env, transducer_results.size());
    for (size_t i = 0; i < transducer_results.size(); i++) {
      auto tags = transducer_results[i];
      auto item = Napi::Array::New(env, tags.size());
      for (size_t j = 0; j < tags.size(); j++) {
        item.Set((uint32_t)j, tags[j]);
      }
      ret.Set((uint32_t)i, item);
    }
    return ret;
  }

private:
  TransducerFile *tr;
};

Napi::Object Init(Napi::Env env, Napi::Object exports) {
  Napi::Function transducerFile = TransducerWrapper::DefineClass(
      env, "Transducer",
      {
          TransducerWrapper::InstanceMethod("_lookup_symbols",
                                            &TransducerWrapper::lookup_symbols),
      });

  exports.Set("Transducer", transducerFile);

  return exports;
}

NODE_API_MODULE(hfstol_addon, Init)
