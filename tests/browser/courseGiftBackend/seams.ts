// Ordinary course ancillary APIs remain synthetic. Gift transport is the actual
// installed adapter, not an in-memory response map. Resolver excludes this import.
export * from "../courseGiftEntry/seams";
import {
  apiRequest as realRequest,
  ApiError,
  API_URL
} from "../../../src/api/apiRequest";
import { bootstrap } from "./auth";
export { ApiError, API_URL };
export async function apiRequest(url: string, options: any = {}) {
  if (url.startsWith("/api/course-gifts/")) return realRequest(url, options);
  if (!options.method || options.method === "GET") return { sessionIds: [] };
  throw Error("Unrelated fixture request refused");
}
export async function getCourse(id: string) {
  if (id !== bootstrap.courseId) throw Error("Unknown fixture course");
  const response = await fetch("/fixture/course", {
    cache: "no-store",
    credentials: "omit"
  });
  if (!response.ok) throw Error("Fixture course unavailable");
  return response.json();
}
