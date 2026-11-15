import { describe, it, expect, vi, afterEach } from 'vitest'
import { apiUrl } from './apiUrl'

afterEach(() => vi.unstubAllEnvs())

describe('apiUrl', () => {
  it('stays relative when no API URL is configured (dev proxy / same origin)', () => {
    vi.stubEnv('VITE_API_URL', '')
    expect(apiUrl('/api/models')).toBe('/api/models')
  })
  it('prefixes the backend URL and tolerates a trailing slash', () => {
    vi.stubEnv('VITE_API_URL', 'https://speech-api.onrender.com/')
    expect(apiUrl('/api/models')).toBe('https://speech-api.onrender.com/api/models')
  })
})
