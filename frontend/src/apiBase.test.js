import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('apiBase', () => {
  beforeEach(() => { vi.resetModules() })
  afterEach(() => { vi.unstubAllEnvs() })

  it('defaults to same origin', async () => {
    vi.stubEnv('VITE_API_BASE', '')
    const axios = (await import('axios')).default
    const { API_BASE, apiUrl } = await import('./apiBase')
    expect(API_BASE).toBe('')
    expect(apiUrl('/api/raw/abc')).toBe('/api/raw/abc')
    expect(axios.defaults.baseURL).toBe('')
  })

  it('uses VITE_API_BASE without trailing slash for axios and links', async () => {
    vi.stubEnv('VITE_API_BASE', 'https://api.example.org/')
    const axios = (await import('axios')).default
    const { API_BASE, apiUrl } = await import('./apiBase')
    expect(API_BASE).toBe('https://api.example.org')
    expect(apiUrl('/api/raw/abc')).toBe('https://api.example.org/api/raw/abc')
    expect(axios.defaults.baseURL).toBe('https://api.example.org')
  })
})
