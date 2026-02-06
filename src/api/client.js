/**
 * LEGACY SHIM - DO NOT ADD LOGIC HERE
 *
 * This file is quarantined. All API calls must use src/api/client.ts.
 * If you have imports pointing to this file, update them to use client.ts instead.
 */

import { client, api, setAuthToken } from "./client.ts";

export { client, api, setAuthToken };
