import { client as api } from "./client.js";
import ROUTES from "./routes.js";

export function getQuestions(courseId) {
  return api(ROUTES.COURSES.QUESTIONS(courseId));
}

export function askQuestion(courseId, text) {
  return api(ROUTES.COURSES.QUESTIONS(courseId), {
    method: "POST",
    body: JSON.stringify({ text })
  });
}

export function answerQuestion(courseId, questionId, text) {
  return api(ROUTES.COURSES.QUESTION_ANSWER(courseId, questionId), {
    method: "POST",
    body: JSON.stringify({ text })
  });
}

export function deleteQuestion(courseId, questionId) {
  return api(ROUTES.COURSES.QUESTION_DETAIL(courseId, questionId), { method: "DELETE" });
}

export function deleteAnswer(courseId, answerId) {
  return api(ROUTES.COURSES.ANSWER_DETAIL(courseId, answerId), { method: "DELETE" });
}