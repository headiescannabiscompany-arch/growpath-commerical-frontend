'use strict';

// Local mitigation for GHSA-vfj7-8cjw-p6xm. This cannot be disabled by options.
// A parsed root and its leaf add one traversal level beyond 64 nested blocks.
const MAX_NESTING_DEPTH = 64;

const assertDepth = (depth, max = MAX_NESTING_DEPTH + 1) => {
  if (depth > max) {
    const error = new SyntaxError(`Brace pattern nesting exceeds ${MAX_NESTING_DEPTH} levels`);
    error.code = 'ERR_BRACES_MAX_DEPTH';
    throw error;
  }
};

module.exports = { MAX_NESTING_DEPTH, assertDepth };
