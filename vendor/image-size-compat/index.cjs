"use strict";

const fs = require("node:fs");
const path = require("node:path");
const modern = require("image-size-modern");
const modernFiles = require("image-size-modern/fromFile");

const MAX_INPUT_SIZE = 512 * 1024;

let disabledFS = false;

function addLegacyFileContext(error, filepath) {
  if (
    error instanceof TypeError &&
    error.message.startsWith("unsupported file type:") &&
    !error.message.includes("(file:")
  ) {
    error.message += ` (file: ${filepath})`;
  }

  return error;
}

function lookup(input, filepath) {
  try {
    return modern.imageSize(input);
  } catch (error) {
    throw addLegacyFileContext(error, filepath);
  }
}

function readFileSync(filepath) {
  const descriptor = fs.openSync(filepath, "r");

  try {
    const { size } = fs.fstatSync(descriptor);
    if (size <= 0) {
      throw new Error("Empty file");
    }

    const inputSize = Math.min(size, MAX_INPUT_SIZE);
    const input = new Uint8Array(inputSize);
    fs.readSync(descriptor, input, 0, inputSize, 0);
    return input;
  } finally {
    fs.closeSync(descriptor);
  }
}

/**
 * Compatibility entry point for image-size 1.x consumers.
 *
 * Buffer and Uint8Array inputs remain synchronous. String paths remain
 * synchronous unless a callback is supplied, matching the API Metro 0.83 and
 * other existing callers were written against.
 */
function imageSize(input, callback) {
  if (input instanceof Uint8Array) {
    return lookup(input);
  }

  if (typeof input !== "string" || disabledFS) {
    throw new TypeError("invalid invocation. input should be a Uint8Array");
  }

  const filepath = path.resolve(input);
  if (typeof callback === "function") {
    modernFiles.imageSizeFromFile(filepath).then(
      (result) => process.nextTick(callback, null, result),
      (error) => callback(addLegacyFileContext(error, filepath))
    );
    return undefined;
  }

  return lookup(readFileSync(filepath), filepath);
}

function disableFS(value) {
  disabledFS = value;
}

function disableTypes(types) {
  modern.disableTypes(types);
}

function setConcurrency(value) {
  modernFiles.setConcurrency(value);
}

module.exports = imageSize;
module.exports.default = imageSize;
module.exports.imageSize = imageSize;
module.exports.disableFS = disableFS;
module.exports.disableTypes = disableTypes;
module.exports.setConcurrency = setConcurrency;
module.exports.types = modern.types;
