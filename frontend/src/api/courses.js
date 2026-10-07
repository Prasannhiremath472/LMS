import { api } from './client'

export async function listCourses() {
  const res = await api.get('/courses')
  return res.data
}

export async function getCourse(id) {
  const res = await api.get(`/courses/${id}`)
  return res.data
}

export async function createCourse(payload) {
  const res = await api.post('/courses', payload)
  return res.data
}

export async function updateCourse(id, payload) {
  const res = await api.put(`/courses/${id}`, payload)
  return res.data
}

export async function createModule(courseId, title) {
  const res = await api.post(`/courses/${courseId}/modules`, { title })
  return res.data
}

export async function createLesson(moduleId, payload) {
  const res = await api.post(`/modules/${moduleId}/lessons`, payload)
  return res.data
}
