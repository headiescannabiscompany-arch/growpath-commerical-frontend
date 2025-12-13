import { client } from "./client";

export function convertTrainingToTasks(payload, token) {
  // Payload example: { plantId, actions: [{ title, details, dueDate }], photo }
  return client.post("/training/convert", payload, token);
}
