"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const Module = require("node:module");
const os = require("node:os");
const path = require("node:path");
const { afterEach, beforeEach, describe, it } = require("node:test");

const adapterPath = path.resolve(__dirname, "../../vendor/image-size-compat/index.cjs");

let temporaryDirectory;

function removeTemporaryDirectory(directory) {
  const resolvedDirectory = path.resolve(directory);
  const resolvedTempRoot = `${path.resolve(os.tmpdir())}${path.sep}`;
  assert.ok(resolvedDirectory.startsWith(resolvedTempRoot));
  assert.match(path.basename(resolvedDirectory), /^growpath-image-size-compat-/);
  fs.rmSync(resolvedDirectory, { recursive: true, force: true });
}

function loadAdapter() {
  const calls = {
    disabledTypes: [],
    parsedInputs: [],
    concurrency: []
  };

  const modern = {
    types: ["mock"],
    disableTypes(types) {
      calls.disabledTypes.push(types);
    },
    imageSize(input) {
      calls.parsedInputs.push(input);
      if (input[0] === 0xff) {
        throw new TypeError("unsupported file type: undefined");
      }
      return { width: input[0], height: input[1], type: "mock" };
    }
  };

  const modernFiles = {
    async imageSizeFromFile(filepath) {
      return modern.imageSize(await fs.promises.readFile(filepath));
    },
    setConcurrency(value) {
      calls.concurrency.push(value);
    }
  };

  const originalLoad = Module._load;
  Module._load = function mockModernImageSize(request, parent, isMain) {
    if (request === "image-size-modern") {
      return modern;
    }
    if (request === "image-size-modern/fromFile") {
      return modernFiles;
    }
    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    delete require.cache[adapterPath];
    return { adapter: require(adapterPath), calls };
  } finally {
    Module._load = originalLoad;
  }
}

function callbackResult(invoke) {
  return new Promise((resolve) => {
    const returnValue = invoke((error, result) => {
      resolve({ error, result, returnValue });
    });
  });
}

describe("image-size 1.x compatibility adapter", () => {
  beforeEach(() => {
    temporaryDirectory = fs.mkdtempSync(
      path.join(os.tmpdir(), "growpath-image-size-compat-")
    );
  });

  afterEach(() => {
    removeTemporaryDirectory(temporaryDirectory);
    delete require.cache[adapterPath];
  });

  it("exposes the callable CommonJS and named-export contract", () => {
    const { adapter } = loadAdapter();

    assert.equal(typeof adapter, "function");
    assert.equal(adapter.default, adapter);
    assert.equal(adapter.imageSize, adapter);
    assert.equal(typeof adapter.disableFS, "function");
    assert.equal(typeof adapter.disableTypes, "function");
    assert.equal(typeof adapter.setConcurrency, "function");
    assert.deepEqual(adapter.types, ["mock"]);
  });

  it("delegates Buffer and Uint8Array parsing synchronously", () => {
    const { adapter, calls } = loadAdapter();
    let callbackCalled = false;

    assert.deepEqual(
      adapter(Buffer.from([4, 7]), () => {
        callbackCalled = true;
      }),
      { width: 4, height: 7, type: "mock" }
    );
    assert.deepEqual(adapter(new Uint8Array([8, 9])), {
      width: 8,
      height: 9,
      type: "mock"
    });
    assert.equal(callbackCalled, false);
    assert.equal(calls.parsedInputs.length, 2);
  });

  it("preserves synchronous string-path reads and the 512 KiB read cap", () => {
    const { adapter, calls } = loadAdapter();
    const filepath = path.join(temporaryDirectory, "large.mock");
    const contents = Buffer.alloc(512 * 1024 + 19, 3);
    contents[1] = 5;
    fs.writeFileSync(filepath, contents);

    assert.deepEqual(adapter(filepath), {
      width: 3,
      height: 5,
      type: "mock"
    });
    assert.equal(calls.parsedInputs[0].length, 512 * 1024);
  });

  it("preserves callback-based string-path success and failure", async () => {
    const { adapter } = loadAdapter();
    const validPath = path.join(temporaryDirectory, "valid.mock");
    const invalidPath = path.join(temporaryDirectory, "invalid.mock");
    fs.writeFileSync(validPath, Buffer.from([11, 13]));
    fs.writeFileSync(invalidPath, Buffer.from([0xff, 0]));

    const success = await callbackResult((callback) => adapter(validPath, callback));
    assert.equal(success.returnValue, undefined);
    assert.equal(success.error, null);
    assert.deepEqual(success.result, {
      width: 11,
      height: 13,
      type: "mock"
    });

    const failure = await callbackResult((callback) => adapter(invalidPath, callback));
    assert.equal(failure.returnValue, undefined);
    assert.equal(failure.result, undefined);
    assert.equal(
      failure.error.message,
      `unsupported file type: undefined (file: ${path.resolve(invalidPath)})`
    );
  });

  it("preserves legacy invocation, empty-file, and parser error behavior", () => {
    const { adapter } = loadAdapter();
    const emptyPath = path.join(temporaryDirectory, "empty.mock");
    fs.writeFileSync(emptyPath, Buffer.alloc(0));

    assert.throws(() => adapter({}), /invalid invocation\. input should be a Uint8Array/);
    assert.throws(() => adapter(emptyPath), /Empty file/);
    assert.throws(
      () => adapter(Buffer.from([0xff, 0])),
      /unsupported file type: undefined \(file: undefined\)/
    );
  });

  it("preserves disableFS while leaving byte parsing available", () => {
    const { adapter } = loadAdapter();
    const filepath = path.join(temporaryDirectory, "valid.mock");
    fs.writeFileSync(filepath, Buffer.from([2, 6]));

    adapter.disableFS(true);
    assert.throws(
      () => adapter(filepath),
      /invalid invocation\. input should be a Uint8Array/
    );
    assert.deepEqual(adapter(Buffer.from([2, 6])), {
      width: 2,
      height: 6,
      type: "mock"
    });
    adapter.disableFS(false);
    assert.deepEqual(adapter(filepath), {
      width: 2,
      height: 6,
      type: "mock"
    });
  });

  it("delegates parser controls to patched upstream 2.x", () => {
    const { adapter, calls } = loadAdapter();

    adapter.disableTypes(["mock"]);
    adapter.setConcurrency(4);

    assert.deepEqual(calls.disabledTypes, [["mock"]]);
    assert.deepEqual(calls.concurrency, [4]);
  });
});
