/* TCC-Wasm engine worker.
 *
 * Runs the whole compile -> WAT -> assemble(WABT) -> execute pipeline off the
 * main thread. Because WASM execution is synchronous, an infinite loop in
 * student code would otherwise freeze the whole page; running it here means
 * the main thread can kill this worker (terminate()) without reloading.
 *
 * Assets live in ./tcc/ and are relative to this worker file's URL, so
 * importScripts/fetch resolve correctly over http(s) (and through the PWA
 * service worker cache once installed).
 */
"use strict";

importScripts("./tcc/runtime.js", "./tcc/ide-resources.js", "./tcc/wabt.js");

var FEATURES = {
  exceptions: true,
  mutable_globals: true,
  sat_float_to_int: true,
  sign_extension: true,
  multi_value: true,
  bulk_memory: true,
  reference_types: true
};

var host = null;

function post(kind, payload) {
  self.postMessage(Object.assign({ kind: kind }, payload || {}));
}

function assembleWat(wabt, wat) {
  var module = wabt.parseWat("input.wat", wat, FEATURES);
  try {
    module.resolveNames();
    module.validate();
    return module.toBinary({ write_debug_names: true }).buffer;
  } finally {
    module.destroy();
  }
}

function ensureHost() {
  if (host)
    return Promise.resolve(host);
  return TccWasmRuntime.CompilerHost.create({
    wasm: "./tcc/tcc.wasm",
    libc: "./tcc/libc.wasm",
    resources: TccWasmIdeResources
  }).then(function (h) {
    host = h;
    return host;
  });
}

function handleRun(msg) {
  var wat;
  return ensureHost()
    .then(function (compiler) {
      var result = compiler.compileAppResult(msg.source);
      post("compile-done", {
        diagnostics: (result.diagnostics || "").trim()
      });
      wat = result.wat;
      return WabtModule();
    })
    .then(function (wabt) {
      return assembleWat(wabt, wat);
    })
    .then(function (binary) {
      return Promise.all([
        WebAssembly.compile(binary),
        TccWasmRuntime.AppRuntime.create({ libc: "./tcc/libc.wasm" })
      ]).then(function (pair) {
        return pair[1].run(pair[0], { stdin: msg.stdin || "" })
          .then(function (out) {
            post("result", {
              rc: out.rc,
              stdout: out.stdout,
              stderr: out.stderr,
              bytes: binary.byteLength
            });
          });
      });
    })
    .catch(function (err) {
      var message = err && err.message ? err.message : String(err);
      post("error", {
        message: message,
        diagnostics: err && err.diagnostics ? err.diagnostics : "",
        compile: !!(err && err.rc !== undefined)
      });
    });
}

self.addEventListener("message", function (ev) {
  var msg = ev.data || {};
  if (msg.cmd === "run")
    handleRun(msg);
});