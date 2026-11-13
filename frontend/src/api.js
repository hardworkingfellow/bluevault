const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? '' : 'http://localhost:4000')

export async function api(path, { token, ...options } = {}) {
  let response
  try {
    response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    })
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(`Could not reach the Bluevault API (${API_URL || 'the Vite development proxy'}). Make sure the backend is running and its MongoDB connection is configured.`)
    }
    throw error
  }
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload.error || 'The server could not complete the request.')
  return payload
}
