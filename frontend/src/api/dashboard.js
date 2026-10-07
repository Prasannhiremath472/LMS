import { api } from './client'

export async function getAdminDashboard() {
  const res = await api.get('/dashboard/admin')
  return res.data
}

export async function getTrainerDashboard() {
  const res = await api.get('/dashboard/trainer')
  return res.data
}

export async function getStudentDashboard() {
  const res = await api.get('/dashboard/student')
  return res.data
}
