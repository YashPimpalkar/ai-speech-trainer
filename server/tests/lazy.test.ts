import { describe, it, expect, vi } from 'vitest'
import { lazyStore, memoryStore } from '../src/history.js'

describe('lazyStore', () => {
  it('does not connect until first use, then connects once', async () => {
    const init = vi.fn(async () => memoryStore())
    const store = lazyStore(init)
    expect(init).not.toHaveBeenCalled()
    await store.create('essay', 'a', {})
    await store.list()
    expect(init).toHaveBeenCalledTimes(1)
    expect((await store.list()).map((i) => i.title)).toEqual(['a'])
  })

  it('retries initialisation after a failure (e.g. cold start with DB briefly unreachable)', async () => {
    const init = vi.fn()
      .mockRejectedValueOnce(new Error('db down'))
      .mockResolvedValueOnce(memoryStore())
    const store = lazyStore(init)
    await expect(store.list()).rejects.toThrow('db down')
    await expect(store.list()).resolves.toEqual([])
    expect(init).toHaveBeenCalledTimes(2)
  })
})
