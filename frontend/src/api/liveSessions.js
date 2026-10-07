import { api } from './client'

export async function listBatchLiveSessions(batchId) {
  const res = await api.get(`/batches/${batchId}/live-sessions`)
  return res.data
}

export async function listUpcomingLiveSessions() {
  const res = await api.get('/live-sessions/upcoming')
  return res.data
}

export async function createLiveSession(batchId, payload) {
  const res = await api.post(`/batches/${batchId}/live-sessions`, payload)
  return res.data
}

export async function getSessionAttendance(sessionId) {
  const res = await api.get(`/live-sessions/${sessionId}/attendance`)
  return res.data
}

export async function markAttendance(sessionId, records) {
  const res = await api.put(`/live-sessions/${sessionId}/attendance`, { records })
  return res.data
}
