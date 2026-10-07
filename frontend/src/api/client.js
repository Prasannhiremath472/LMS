import axios from 'axios'

export const api = axios.create({
  baseURL: '/api/v1',
  withCredentials: true, // sends the httpOnly refresh cookie
})

let accessToken = null

export function setAccessToken(token) {
  accessToken = token
}

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  return config
})

let refreshPromise = null

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      try {
        refreshPromise ??= api.post('/auth/refresh').then((res) => {
          setAccessToken(res.data.accessToken)
          return res.data.accessToken
        }).finally(() => {
          refreshPromise = null
        })
        const token = await refreshPromise
        original.headers.Authorization = `Bearer ${token}`
        return api(original)
      } catch (refreshError) {
        setAccessToken(null)
        window.location.href = '/login'
        return Promise.reject(refreshError)
      }
    }
    return Promise.reject(error)
  }
)
