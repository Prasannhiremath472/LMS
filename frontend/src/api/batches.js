import { api } from './client'

export async function listBatches() {
  const res = await api.get('/batches')
  return res.data
}

export async function getBatch(id) {
  const res = await api.get(`/batches/${id}`)
  return res.data
}

export async function createBatch(payload) {
  const res = await api.post('/batches', payload)
  return res.data
}

export async function assignTrainer(batchId, trainerId) {
  const res = await api.put(`/batches/${batchId}/trainer`, { trainer_id: trainerId })
  return res.data
}

export async function enrollStudent(batchId, studentId) {
  const res = await api.post(`/batches/${batchId}/enroll`, { student_id: studentId })
  return res.data
}

export async function listStudents() {
  const res = await api.get('/students')
  return res.data
}

export async function listTrainers() {
  const res = await api.get('/trainers')
  return res.data
}
