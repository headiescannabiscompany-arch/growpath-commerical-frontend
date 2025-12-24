const path = require('path');
const Ajv = require('ajv');
const addFormats = require('ajv-formats');
const SwaggerParser = require('@apidevtools/swagger-parser');

const ajv = new Ajv({ 
  allErrors: true, 
  strict: false
});
addFormats(ajv);
let dereferencedSpec = null;

async function getSpec() {
  if (dereferencedSpec) return dereferencedSpec;

  const backendDocsDir = path.resolve(__dirname, '../../growpath-backend/docs/openapi');
  const indexPath = path.join(backendDocsDir, 'index.yaml');

  // Check if file exists to avoid crashing in environments without the backend repo (e.g. CI)
  const fs = require('fs');
  if (!fs.existsSync(indexPath)) {
    return null;
  }

  try {
    dereferencedSpec = await SwaggerParser.dereference(indexPath);
    return dereferencedSpec;
  } catch (err) {
    console.warn('[Contract] Failed to parse OpenAPI spec:', err.message);
    return null;
  }
}

/**
 * Validates a response object.
 */
async function validateResponse(apiPath, method, status, body) {
  const spec = await getSpec();
  if (!spec) return true; // Skip validation if spec is unavailable
  
  const m = method.toLowerCase();

  // 1. Find the path (exact match or parameter placeholder)
  let pathKey = apiPath;
  if (!spec.paths[pathKey]) {
    // Try to find matching pattern (e.g. /api/plants/123 -> /api/plants/{id})
    pathKey = Object.keys(spec.paths).find(p => {
      const regex = new RegExp('^' + p.replace(/\{[^}]+\}/g, '[^/]+') + '$');
      return regex.test(apiPath);
    });
  }

  if (!pathKey || !spec.paths[pathKey]) {
    console.warn(`[Contract] Path ${apiPath} not found in spec.`);
    return true;
  }

  const operation = spec.paths[pathKey][m];
  if (!operation) {
    console.warn(`[Contract] Method ${m} not found for ${pathKey}.`);
    return true;
  }

  const responseSpec = operation.responses[status] || operation.responses['default'];
  if (!responseSpec || !responseSpec.content) {
    // Some responses (204 No Content) don't have bodies
    return true;
  }

  const schema = responseSpec.content['application/json']?.schema;
  if (!schema) return true;

  const validate = ajv.compile(schema);
  const valid = validate(body);

  if (!valid) {
    const errors = JSON.stringify(validate.errors, null, 2);
    throw new Error(`[Contract Violation] ${m.toUpperCase()} ${apiPath} (${status}):\n${errors}`);
  }

  return true;
}

module.exports = { getSpec, validateResponse };