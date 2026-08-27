it('exports defineORPCEventHandler', async () => {
  await expect(import('./index')).resolves.toMatchObject({
    defineORPCEventHandler: expect.any(Function),
  })
})
