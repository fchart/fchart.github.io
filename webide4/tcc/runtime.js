(function (root, factory) {
  if (typeof module === "object" && module.exports)
    module.exports = factory();
  else
    root.TccWasmRuntime = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const DEFAULT_PAGES = 4096;
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  function isNode() {
    return typeof process === "object" && process.versions && process.versions.node;
  }

  function valueOf(exported) {
    return exported && typeof exported === "object" && "value" in exported
      ? exported.value
      : exported;
  }

  function bytes(memory) {
    return new Uint8Array(memory.buffer);
  }

  function readString(memory, ptr, len) {
    if (!ptr || len <= 0)
      return "";
    return decoder.decode(bytes(memory).subarray(ptr, ptr + len));
  }

  async function readBytes(source) {
    if (source instanceof Uint8Array)
      return source;
    if (source instanceof ArrayBuffer)
      return new Uint8Array(source);
    if (ArrayBuffer.isView(source))
      return new Uint8Array(source.buffer, source.byteOffset, source.byteLength);
    if (typeof source === "string") {
      if (isNode()) {
        const fs = require("fs");
        return new Uint8Array(fs.readFileSync(source));
      }
      const response = await fetch(source);
      if (!response.ok)
        throw new Error(`could not fetch ${source}`);
      return new Uint8Array(await response.arrayBuffer());
    }
    throw new Error("unsupported wasm source");
  }

  async function compileModule(source) {
    if (source instanceof WebAssembly.Module)
      return source;
    return WebAssembly.compile(await readBytes(source));
  }

  function decodeBase64(text) {
    if (typeof atob === "function") {
      const binary = atob(String(text));
      const raw = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; ++i)
        raw[i] = binary.charCodeAt(i);
      return raw;
    }
    if (typeof Buffer === "function")
      return new Uint8Array(Buffer.from(String(text), "base64"));
    throw new Error("base64 resource decoding is not available");
  }

  function fillRandom(dst) {
    if (typeof crypto === "object" && crypto.getRandomValues) {
      crypto.getRandomValues(dst);
      return;
    }
    if (typeof require === "function") {
      try {
        require("crypto").randomFillSync(dst);
        return;
      } catch (err) {
        /* fall through to deterministic-enough fallback for non-crypto hosts */
      }
    }
    for (let i = 0; i < dst.length; ++i)
      dst[i] = (Math.random() * 256) | 0;
  }

  function createCompilerImports(getInstance) {
    const enosys = -52;

    function exp(name) {
      const instance = getInstance();
      return instance.exports[name] || instance.exports[`_${name}`];
    }

    function memory() {
      return exp("memory");
    }

    function storeU32(ptr, value) {
      if (ptr)
        new DataView(memory().buffer).setUint32(ptr, value, true);
    }

    function storeU64(ptr, value) {
      if (ptr)
        new DataView(memory().buffer).setBigUint64(ptr, BigInt(value), true);
    }

    function invoke(fn, ...args) {
      const table = exp("__indirect_function_table");
      const target = table && table.get(fn);
      if (!target)
        throw new Error(`bad indirect function ${fn}`);
      return target(...args);
    }

    return {
      env: {
        emscripten_notify_memory_growth() {},
        __syscall_getcwd() { return enosys; },
        __syscall_readlinkat() { return enosys; },
        _emscripten_throw_longjmp() { throw new Error("longjmp"); },
        invoke_ii: (fn, a) => invoke(fn, a),
        invoke_iii: (fn, a, b) => invoke(fn, a, b),
        invoke_iiii: (fn, a, b, c) => invoke(fn, a, b, c),
        invoke_iiiiii: (fn, a, b, c, d, e) => invoke(fn, a, b, c, d, e),
        invoke_iiiiiiii: (fn, a, b, c, d, e, f, g) => invoke(fn, a, b, c, d, e, f, g),
        invoke_v: fn => { invoke(fn); },
        invoke_vi: (fn, a) => { invoke(fn, a); },
        invoke_vii: (fn, a, b) => { invoke(fn, a, b); },
        invoke_viii: (fn, a, b, c) => { invoke(fn, a, b, c); },
        invoke_viiii: (fn, a, b, c, d) => { invoke(fn, a, b, c, d); },
        invoke_viiiii: (fn, a, b, c, d, e) => { invoke(fn, a, b, c, d, e); }
      },
      wasi_snapshot_preview1: {
        fd_write(fd, iovs, iovsLen, nwritten) {
          let written = 0;
          const view = new DataView(memory().buffer);
          for (let i = 0; i < iovsLen; ++i)
            written += view.getUint32(iovs + i * 8 + 4, true);
          storeU32(nwritten, written);
          return 0;
        },
        fd_close() { return 0; },
        fd_seek(fd, offset, whence, newOffset) {
          storeU64(newOffset, 0);
          return 0;
        },
        fd_read(fd, iovs, iovsLen, nread) {
          storeU32(nread, 0);
          return 0;
        },
        path_open() { return 44; },
        proc_exit(code) { throw new Error(`proc_exit(${code})`); },
        environ_sizes_get(count, size) {
          storeU32(count, 0);
          storeU32(size, 0);
          return 0;
        },
        environ_get() { return 0; },
        clock_time_get(clockId, precision, timePtr) {
          storeU64(timePtr, BigInt(Date.now()) * 1000000n);
          return 0;
        },
        random_get(ptr, len) {
          fillRandom(bytes(memory()).subarray(ptr, ptr + len));
          return 0;
        }
      }
    };
  }

  function createAppLibcImports(memory, libcExports) {
    const view = () => new DataView(memory.buffer);
    const imports = Object.create(null);
    Object.assign(imports, libcExports);

    imports.fabs = Math.abs;
    imports.sin = Math.sin;
    imports.sinh = Math.sinh || (x => (Math.exp(x) - Math.exp(-x)) / 2);
    imports.cos = Math.cos;
    imports.cosh = Math.cosh || (x => (Math.exp(x) + Math.exp(-x)) / 2);
    imports.tan = Math.tan;
    imports.tanh = Math.tanh || (x => {
      const e = Math.exp(2 * x);
      return (e - 1) / (e + 1);
    });
    imports.asin = Math.asin;
    imports.acos = Math.acos;
    imports.atan = Math.atan;
    imports.atan2 = Math.atan2;
    imports.ceil = Math.ceil;
    imports.floor = Math.floor;
    imports.fmod = (x, y) => x % y;
    imports.sqrt = Math.sqrt;
    imports.pow = Math.pow;
    imports.log = Math.log;
    imports.log10 = Math.log10 || (x => Math.log(x) / Math.LN10);
    imports.exp = Math.exp;
    imports.ldexp = (x, exp) => x * Math.pow(2, exp);
    imports.modf = (x, iptr) => {
      const i = x < 0 ? Math.ceil(x) : Math.floor(x);
      view().setFloat64(iptr, i, true);
      return x - i;
    };
    imports.frexp = (x, expPtr) => {
      if (x === 0 || !Number.isFinite(x)) {
        view().setInt32(expPtr, 0, true);
        return x;
      }
      const sign = x < 0 ? -1 : 1;
      let y = Math.abs(x);
      let exp = 0;
      while (y < 0.5) {
        y *= 2;
        --exp;
      }
      while (y >= 1) {
        y /= 2;
        ++exp;
      }
      view().setInt32(expPtr, exp, true);
      return sign * y;
    };
    return imports;
  }

  function createLibcImports(memory, options = {}) {
    const useNodeStdio = options.stdio === "inherit" && isNode();
    const fs = useNodeStdio ? require("fs") : null;

    function copyWrite(fd, ptr, len) {
      if (!useNodeStdio)
        return len;
      const outFd = fd === 2 ? 2 : 1;
      const chunk = Buffer.from(bytes(memory).subarray(ptr, ptr + len));
      return fs.writeSync(outFd, chunk, 0, chunk.length);
    }

    return {
      env: {
        memory,
        rt_host_read(fd, ptr, len) {
          if (!useNodeStdio)
            return 0;
          if (fd !== 0)
            return -9;
          const cap = Math.min(len, 65536);
          const buf = Buffer.alloc(cap || 1);
          const n = fs.readSync(0, buf, 0, cap, null);
          if (n > 0)
            bytes(memory).set(buf.subarray(0, n), ptr);
          return n;
        },
        rt_host_write(fd, ptr, len) {
          if (fd !== 1 && fd !== 2)
            return -9;
          return copyWrite(fd, ptr, len);
        },
        rt_host_exit(code) {
          const err = new Error(`app exited with code ${code}`);
          err.name = "WasmExit";
          err.code = code;
          throw err;
        },
        rt_host_isatty(fd) {
          if (!useNodeStdio)
            return fd === 0 ? 1 : 0;
          if (fd === 0)
            return process.stdin.isTTY ? 1 : 0;
          if (fd === 1)
            return process.stdout.isTTY ? 1 : 0;
          if (fd === 2)
            return process.stderr.isTTY ? 1 : 0;
          return 0;
        }
      }
    };
  }

  class CompilerHost {
    constructor(module, options = {}) {
      this.module = module;
      this.options = options;
      this.imports = WebAssembly.Module.imports(module);
      this.usesLibc = this.imports.some(imp => imp.module === "libc");
      this.pages = options.pages || DEFAULT_PAGES;
      this.resources = options.resources !== undefined
        ? options.resources
        : (typeof globalThis !== "undefined" ? globalThis.TccWasmIdeResources : null);
      this.libcModule = options.libcModule || null;
      this.instance = null;
      this.libc = null;
      this.exports = null;
      this.allocExports = null;
      this.memory = null;
    }

    static async create(options = {}) {
      const wasm = options.wasm || "./tcc.wasm";
      const module = await compileModule(wasm);
      const host = new CompilerHost(module, options);
      if (host.usesLibc)
        host.libcModule = await compileModule(options.libc || "./libc.wasm");
      await host.reset();
      return host;
    }

    async reset(options = {}) {
      if (Object.prototype.hasOwnProperty.call(options, "resources"))
        this.resources = options.resources;
      if (this.usesLibc)
        await this.instantiateWithLibc();
      else
        await this.instantiateStandalone();
      this.initialize();
      this.seedResources(this.resources);
      return this;
    }

    async instantiateStandalone() {
      let instance = null;
      const imports = this.options.imports || createCompilerImports(() => instance);
      instance = await WebAssembly.instantiate(this.module, imports);
      this.instance = instance;
      this.libc = null;
      this.exports = instance.exports;
      this.allocExports = instance.exports;
      this.memory = instance.exports.memory;
      if (!this.memory)
        throw new Error("compiler module did not export memory");
    }

    async instantiateWithLibc() {
      const memory = new WebAssembly.Memory({
        initial: this.pages,
        maximum: this.pages
      });
      const libc = await WebAssembly.instantiate(this.libcModule,
        createLibcImports(memory, this.options));
      const libcImports = createAppLibcImports(memory, libc.exports);
      for (const imp of this.imports) {
        if (imp.module === "libc" && !(imp.name in libcImports))
          throw new Error(`compiler imports unavailable libc symbol: ${imp.name}`);
      }
      const env = Object.assign({ memory }, this.options.env || {});
      const instance = await WebAssembly.instantiate(this.module, {
        env,
        libc: libcImports
      });
      this.instance = instance;
      this.libc = libc;
      this.exports = instance.exports;
      this.allocExports = libc.exports;
      this.memory = memory;
      const heapBase = valueOf(instance.exports.__heap_base);
      const heapEnd = valueOf(instance.exports.__heap_end);
      if (heapBase === undefined || heapEnd === undefined)
        throw new Error("compiler module did not export heap bounds");
      if (libc.exports.rt_init_heap(heapBase, heapEnd) !== 0)
        throw new Error("could not initialize compiler heap");
    }

    initialize() {
      if (this.exports._initialize)
        this.exports._initialize();
      else if (this.exports.__wasm_call_ctors)
        this.exports.__wasm_call_ctors();
    }

    exp(name) {
      return this.exports[name] || this.exports[`_${name}`];
    }

    allocExp(name) {
      return this.allocExports[name] || this.allocExports[`_${name}`];
    }

    malloc(size) {
      const malloc = this.allocExp("malloc");
      if (typeof malloc !== "function")
        throw new Error("compiler allocator does not export malloc");
      const ptr = malloc(size);
      if (!ptr)
        throw new Error("compiler malloc failed");
      return ptr;
    }

    free(ptr) {
      const free = this.allocExp("free");
      if (ptr && typeof free === "function")
        free(ptr);
    }

    memoryBytes() {
      return bytes(this.memory);
    }

    readString(ptr, len) {
      return readString(this.memory, ptr, len);
    }

    writeCString(text) {
      const raw = encoder.encode(text);
      const ptr = this.malloc(raw.length + 1);
      const mem = this.memoryBytes();
      mem.set(raw, ptr);
      mem[ptr + raw.length] = 0;
      return ptr;
    }

    seedResources(resources) {
      if (!resources)
        return;
      const addResource = this.exp("tcc_bare_add_resource");
      if (typeof addResource !== "function")
        throw new Error("compiler does not support virtual resources");
      const files = resources.files || resources;
      const isBase64 = resources.encoding === "base64";
      for (const name of Object.keys(files).sort()) {
        const data = files[name];
        const raw = isBase64
          ? decodeBase64(data)
          : encoder.encode(typeof data === "string" ? data : String(data));
        const namePtr = this.writeCString(name);
        const dataPtr = this.malloc(raw.length + 1);
        try {
          const mem = this.memoryBytes();
          mem.set(raw, dataPtr);
          mem[dataPtr + raw.length] = 0;
          if (addResource(namePtr, dataPtr, raw.length) !== 0)
            throw new Error(`could not add compiler resource: ${name}`);
        } finally {
          this.free(dataPtr);
          this.free(namePtr);
        }
      }
    }

    readCompileResult(rc) {
      const wat = this.readString(this.exp("tcc_bare_output")(),
                                  this.exp("tcc_bare_output_len")());
      const diagnostics = this.readString(this.exp("tcc_bare_error")(),
                                          this.exp("tcc_bare_error_len")());
      if (rc !== 0) {
        const err = new Error(diagnostics || "compile failed");
        err.diagnostics = diagnostics;
        err.wat = wat;
        err.rc = rc;
        throw err;
      }
      return { wat, diagnostics, rc };
    }

    compileWithOptionsResult(source, options) {
      const compile = this.exp("tcc_bare_compile_with_options");
      const sourcePtr = this.writeCString(source);
      const optionsPtr = this.writeCString(options || "");
      try {
        return this.readCompileResult(compile(sourcePtr, optionsPtr));
      } finally {
        this.free(optionsPtr);
        this.free(sourcePtr);
      }
    }

    compileWithOptions(source, options) {
      return this.compileWithOptionsResult(source, options).wat;
    }

    compileResult(source) {
      const compile = this.exp("tcc_bare_compile");
      const sourcePtr = this.writeCString(source);
      try {
        return this.readCompileResult(compile(sourcePtr));
      } finally {
        this.free(sourcePtr);
      }
    }

    compile(source) {
      return this.compileResult(source).wat;
    }

    compileAppResult(source) {
      const compile = this.exp("tcc_bare_compile_app");
      const sourcePtr = this.writeCString(source);
      try {
        return this.readCompileResult(compile(sourcePtr));
      } finally {
        this.free(sourcePtr);
      }
    }

    compileApp(source) {
      return this.compileAppResult(source).wat;
    }
  }

  class AppRuntime {
    constructor(libcModule, options = {}) {
      this.libcModule = libcModule;
      this.pages = options.pages || DEFAULT_PAGES;
    }

    static async create(options = {}) {
      const libc = options.libc || "./libc.wasm";
      return new AppRuntime(await compileModule(libc), options);
    }

    validateAppImports(appModule, libcImports) {
      const imports = WebAssembly.Module.imports(appModule);
      const hasSharedMemory = imports.some(imp =>
        imp.module === "env" && imp.name === "memory" && imp.kind === "memory");
      if (!hasSharedMemory)
        throw new Error("app module did not import shared memory");
      for (const imp of imports) {
        if (imp.module === "libc" && !(imp.name in libcImports))
          throw new Error(`app imports unavailable libc symbol: ${imp.name}`);
      }
    }

    async run(appSource, options = {}) {
      const pages = options.pages || this.pages;
      const memory = options.memory || new WebAssembly.Memory({
        initial: pages,
        maximum: pages
      });
      const appModule = await compileModule(appSource);
      const libc = await WebAssembly.instantiate(this.libcModule,
        createLibcImports(memory, options));
      const libcImports = createAppLibcImports(memory, libc.exports);
      if (options.stdio === "inherit" && libc.exports.rt_stdio_set_hosted)
        libc.exports.rt_stdio_set_hosted(1);
      this.validateAppImports(appModule, libcImports);
      const app = await WebAssembly.instantiate(appModule, {
        env: { memory },
        libc: libcImports
      });
      const heapBase = valueOf(app.exports.__heap_base);
      const heapEnd = valueOf(app.exports.__heap_end);
      if (heapBase === undefined || heapEnd === undefined)
        throw new Error("app module did not export heap bounds");
      const entryName = options.entry || "main";
      const entry = app.exports[entryName] || app.exports[`_${entryName}`];
      if (typeof entry !== "function")
        throw new Error(`app module did not export entry: ${entryName}`);
      if (libc.exports.rt_init_heap(heapBase, heapEnd) !== 0)
        throw new Error("could not initialize libc heap");
      if (options.files)
        this.seedFiles(memory, libc.exports, options.files);
      let argv = null;
      if (entry.length >= 2 || options.args)
        argv = this.writeArgv(memory, libc.exports, options.args || [entryName]);
      if (options.stdio !== "inherit")
        this.seedStdin(memory, libc.exports, options.stdin || "");
      if (app.exports.__wasm_call_ctors)
        app.exports.__wasm_call_ctors();
      let rc;
      try {
        rc = argv ? entry(argv.argc, argv.argv) : entry();
      } catch (err) {
        if (!err || err.name !== "WasmExit")
          throw err;
        rc = err.code;
      }
      return {
        rc,
        stdout: this.readRuntimeBuffer(memory, libc.exports, "rt_stdout_ptr", "rt_stdout_len"),
        stderr: this.readRuntimeBuffer(memory, libc.exports, "rt_stderr_ptr", "rt_stderr_len"),
        memory,
        app,
        libc
      };
    }

    writeArgv(memory, exports, args) {
      const mem = bytes(memory);
      const argv = exports.malloc((args.length + 1) * 4);
      if (!argv)
        throw new Error("could not allocate argv");
      const view = new DataView(memory.buffer);
      for (let i = 0; i < args.length; ++i) {
        const raw = encoder.encode(args[i]);
        const ptr = exports.malloc(raw.length + 1);
        if (!ptr)
          throw new Error("could not allocate argv string");
        mem.set(raw, ptr);
        mem[ptr + raw.length] = 0;
        view.setUint32(argv + i * 4, ptr, true);
      }
      view.setUint32(argv + args.length * 4, 0, true);
      return { argc: args.length, argv };
    }

    seedStdin(memory, exports, input) {
      const raw = typeof input === "string" ? encoder.encode(input) : input;
      const inputBytes = raw instanceof Uint8Array ? raw : new Uint8Array(raw || 0);
      const ptr = exports.malloc(inputBytes.length || 1);
      if (!ptr)
        throw new Error("could not allocate stdin buffer");
      bytes(memory).set(inputBytes, ptr);
      const written = exports.rt_stdin_set(ptr, inputBytes.length);
      exports.free(ptr);
      if (written !== inputBytes.length)
        throw new Error("could not seed stdin");
    }

    seedFiles(memory, exports, files) {
      if (!exports.rt_file_add)
        throw new Error("runtime does not support seeded files");
      for (const name of Object.keys(files)) {
        const pathBytes = encoder.encode(name);
        const value = files[name];
        const raw = typeof value === "string" ? encoder.encode(value) : value;
        const fileBytes = raw instanceof Uint8Array ? raw : new Uint8Array(raw || 0);
        const pathPtr = exports.malloc(pathBytes.length + 1);
        const dataPtr = exports.malloc(fileBytes.length || 1);
        if (!pathPtr || !dataPtr)
          throw new Error("could not allocate seeded file");
        const mem = bytes(memory);
        mem.set(pathBytes, pathPtr);
        mem[pathPtr + pathBytes.length] = 0;
        mem.set(fileBytes, dataPtr);
        const written = exports.rt_file_add(pathPtr, dataPtr, fileBytes.length);
        exports.free(dataPtr);
        exports.free(pathPtr);
        if (written !== fileBytes.length)
          throw new Error(`could not seed file: ${name}`);
      }
    }

    readRuntimeBuffer(memory, exports, ptrName, lenName) {
      const ptr = exports[ptrName]();
      const len = exports[lenName]();
      return decoder.decode(bytes(memory).subarray(ptr, ptr + len));
    }
  }

  async function runApp(appSource, options = {}) {
    const runtime = await AppRuntime.create(options);
    return runtime.run(appSource, options);
  }

  return {
    DEFAULT_PAGES,
    CompilerHost,
    AppRuntime,
    compileModule,
    createLibcImports,
    createAppLibcImports,
    readBytes,
    readString,
    runApp,
    valueOf
  };
});
