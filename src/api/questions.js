import { api } from "./client";

export function getQuestions(courseId) {
  return api(`/courses/${courseId}/questions`);
}

export function askQuestion(courseId, text) {
  return api(`/courses/${courseId}/questions`, {
    method: "POST",
    body: JSON.stringify({ text }),
  });
}

export function answerQuestion(courseId, questionId, text) {
  return api(`/courses/${courseId}/questions/${questionId}/answer`, {
    method: "POST",
    body: JSON.stringify({ text }),
  });
}

export function deleteQuestion(courseId, questionId) {
  return api(`/courses/${courseId}/questions/${questionId}`, { method: "DELETE" });
}

export function deleteAnswer(courseId, answerId) {
  return api(`/courses/${courseId}/answers/${answerId}`, { method: "DELETE" });
}