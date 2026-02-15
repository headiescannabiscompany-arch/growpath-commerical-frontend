import { client as api } from "./client.js";
import apiRoutes from "./routes.js";

export function getQuestions(courseId) {
  return api(apiRoutes.COURSES.QUESTIONS(courseId));
}

export function askQuestion(courseId, text) {
  return api(apiRoutes.COURSES.QUESTIONS(courseId), {
    method: "POST",
    body: JSON.stringify({ text })
  });
}

export function answerQuestion(courseId, questionId, text) {
  return api(apiRoutes.COURSES.QUESTION_ANSWER(courseId, questionId), {
    method: "POST",
    body: JSON.stringify({ text })
  });
}

export function deleteQuestion(courseId, questionId) {
  return api(apiRoutes.COURSES.QUESTION_DETAIL(courseId, questionId), {
    method: "DELETE"
  });
}

export function deleteAnswer(courseId, answerId) {
  return api(apiRoutes.COURSES.ANSWER_DETAIL(courseId, answerId), { method: "DELETE" });
}
