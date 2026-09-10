/* C++ (wasm-clang) engine worker.
 *
 * Runs binji/wasm-clang's full compile -> link -> run pipeline off the main
 * thread, exactly like tcc-worker.js does for TCC-Wasm:
 *
 *   1. memfs.wasm  - WASI in-memory filesystem (holds the sysroot + files)
 *   2. sysroot.tar - C++ standard headers + libc/libc++/libc++abi/canvas libs
 *   3. clang.wasm  - real Clang (-cc1 -emit-obj, single tool, no subprocess)
 *   4. lld.wasm    - wasm-ld linker (links crt1 + libc + libc++ -> test.wasm)
 *   5. test.wasm   - the compiled student program, executed with WASI imports
 *
 * All assets live in ./cpp/ and are relative to this worker file's URL, so
 * fetch() resolves correctly over http(s) (through the PWA service-worker
 * cache once installed). Execution is synchronous, hence the worker: the main
 * thread can terminate() it to stop an infinite loop.
 *
 * Input is batch-ahead (like TCC-Wasm): the pre-run modal collects all input
 * and memfs.setStdinStr() feeds it as fd 0 before the program starts.
 */
"use strict";

importScripts("./cpp/shared.js");

/* shared.js's App class references free `canvas`/`ctx2d` bindings, but those
 * methods only run if the compiled program calls the <canvas.h> library - a
 * beginner console program never does. Define benign placeholders so nothing
 * crashes at eval time. */
var canvas = { width: 0, height: 0 };
var ctx2d = null;

var api = null;

function post(kind, payload) {
  self.postMessage(Object.assign({ kind: kind }, payload || {}));
}

function createApi() {
  return new API({
    async readBuffer(filename) {
      var response = await fetch(filename);
      return response.arrayBuffer();
    },
    async compileStreaming(filename) {
      var response = await fetch(filename);
      return WebAssembly.compile(await response.arrayBuffer());
    },
    hostWrite(s) {
      post("write", { data: s });
    },
    clang: "./cpp/clang.wasm",
    lld: "./cpp/lld.wasm",
    sysroot: "./cpp/sysroot.tar",
    memfs: "./cpp/memfs.wasm",
    showTiming: false
  });
}

/* Same as shared.js API.compileLinkRun, but injects batch stdin into the
 * memfs before the linked program starts (fd 0 -> host_read). */
async function compileLinkRun(contents, stdin) {
  var input = "test.cc";
  var obj = "test.o";
  var wasm = "test.wasm";
  await api.compile({ input: input, contents: contents, obj: obj });
  await api.link(obj, wasm);
  var buffer = api.memfs.getFileContents(wasm);
  var testMod = await WebAssembly.compile(buffer);
  api.memfs.setStdinStr(stdin || "");
  return await api.run(testMod, wasm);
}

function handleRun(msg) {
  var phase = "init";   /* init -> compile -> link -> run */

  api = api || createApi();
  api.ready
    .then(function () {
      post("ready", {});
    })
    .then(function () {
      phase = "compile";
      return api.compile({ input: "test.cc", contents: msg.source, obj: "test.o" });
    })
    .then(function () {
      post("compile-done", {});
      phase = "link";
      return api.link("test.o", "test.wasm");
    })
    .then(function () {
      phase = "run";
      var buffer = api.memfs.getFileContents("test.wasm");
      return WebAssembly.compile(buffer);
    })
    .then(function (testMod) {
      api.memfs.setStdinStr(msg.stdin || "");
      return api.run(testMod, "test.wasm");
    })
    .then(function () {
      post("result", { rc: 0 });
    })
    .catch(function (err) {
      var code = (err && err.code !== undefined) ? err.code : null;
      var message = err && err.message ? err.message : String(err);
      /* A non-zero exit code that surfaced DURING program execution is a real
       * program exit (e.g. return 1) - report it as an rc, not a crash. */
      if (phase === "run" && typeof code === "number") {
        post("result", { rc: code });
        return;
      }
      post("error", { rc: code, message: message });
    });
}

self.addEventListener("message", function (ev) {
  var msg = ev.data || {};
  if (msg.cmd === "run")
    handleRun(msg);
});