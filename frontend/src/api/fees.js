import { api } from './client'

export async function createInvoice(payload) {
  const res = await api.post('/invoices', payload)
  return res.data
}

export async function recordPayment(invoiceId, payload) {
  const res = await api.post(`/invoices/${invoiceId}/payments`, payload)
  return res.data
}

export async function getStudentInvoices(studentId) {
  const res = await api.get(`/students/${studentId}/invoices`)
  return res.data
}

export async function getInvoicePayments(invoiceId) {
  const res = await api.get(`/invoices/${invoiceId}/payments`)
  return res.data
}

export async function issueCertificate(studentId, payload) {
  const res = await api.post(`/students/${studentId}/certificates`, payload)
  return res.data
}

export async function getStudentCertificates(studentId) {
  const res = await api.get(`/students/${studentId}/certificates`)
  return res.data
}
