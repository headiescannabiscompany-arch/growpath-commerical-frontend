import path from 'path';
import { fileURLToPath } from 'url';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import SwaggerParser from '@apidevtools/swagger-parser';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ajv = new Ajv({
  allErrors: true,
  strict: false
});
addFormats(ajv);

let dereferencedSpec = null;

export async function getSpec() {
  if (dereferencedSpec) return dereferencedSpec;

  const backendDocsDir = path.resolve(__dirname, '../../growpath-backend/docs/openapi');
  const indexPath = path.join(backendDocsDir, 'index.yaml');

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
export async function validateResponse(apiPath, method, status, body) {
  const spec = await getSpec();
  if (!spec) return true;

  const m = method.toLowerCase();

  let pathKey = apiPath;
  if (!spec.paths[pathKey]) {
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
