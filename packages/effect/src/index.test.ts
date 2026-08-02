it('exports EffectSchemaToJsonSchemaConverter, handlerGen, toStandardSchema, catchORPCError, catchORPCErrorByCode', async () => {
  await expect(import('./index')).resolves.toMatchObject({
    handlerGen: expect.any(Function),
    EffectSchemaToJsonSchemaConverter: expect.any(Function),
    toStandardSchema: expect.any(Function),
    catchORPCError: expect.any(Function),
    catchORPCErrorByCode: expect.any(Function),
  })
})
