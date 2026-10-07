import { api } from './client'

export async function listNotifications() {
  const res = await api.get('/notifications')
  return res.data
}

export async function markNotificationRead(id) {
  const res = await api.put(`/notifications/${id}/read`)
  return res.data
}

export async function getProgressReport() {
  const res = await api.get('/reports/progress')
  return res.data
}

export async function getPaymentsReport() {
  const res = await api.get('/reports/payments')
  return res.data
}

export async function getAttendanceReport() {
  const res = await api.get('/reports/attendance')
  return res.data
}
