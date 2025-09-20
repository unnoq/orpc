vi.mock('cloudflare:workers', () => ({
  DurableObject: class {
    constructor(
      protected readonly ctx: any,
      protected readonly env: unknown,
    ) { }
  },
}))

it('export something', async () => {
  expect(Object.keys(await import('./index'))).toContain('DurableIteratorObject')
})
