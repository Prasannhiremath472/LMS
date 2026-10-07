import { api } from './client'

export async function getLesson(id) {
  const res = await api.get(`/lessons/${id}`)
  return res.data
}

export async function updateLessonProgress(lessonId, payload) {
  const res = await api.post(`/lessons/${lessonId}/progress`, payload)
  return res.data
}

export async function getCourseProgress(courseId) {
  const res = await api.get(`/courses/${courseId}/progress`)
  return res.data
}

export async function submitAssignment(assignmentId, fileUrl) {
  const res = await api.post(`/assignments/${assignmentId}/submit`, { file_url: fileUrl })
  return res.data
}

export async function getAssignmentSubmissions(assignmentId) {
  const res = await api.get(`/assignments/${assignmentId}/submissions`)
  return res.data
}

export async function gradeSubmission(submissionId, score, feedback) {
  const res = await api.put(`/submissions/${submissionId}/grade`, { score, feedback })
  return res.data
}

export async function getQuiz(quizId) {
  const res = await api.get(`/quizzes/${quizId}`)
  return res.data
}

export async function attemptQuiz(quizId, answers) {
  const res = await api.post(`/quizzes/${quizId}/attempt`, { answers })
  return res.data
}
