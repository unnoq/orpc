it('exports createNuxtUtils, NUXT_OPERATION_CONTEXT_SYMBOL', async () => {
  await expect(import('./index')).resolves.toMatchObject({
    createNuxtUtils: expect.any(Function),
    createRouterUtils: expect.any(Function),
    generateOperationKey: expect.any(Function),
    parseOperationKey: expect.any(Function),
    isSubsetOf: expect.any(Function),
    NUXT_OPERATION_CONTEXT_SYMBOL: expect.any(Symbol),
  })
})
