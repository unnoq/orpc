it('export something', async () => {
  expect(Object.keys(await import('./index'))).toContain('DurableIteratorLinkPlugin')
})
