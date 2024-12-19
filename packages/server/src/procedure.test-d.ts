import type { ANY_PROCEDURE } from './procedure'
import { isProcedure } from './procedure'

describe('isProcedure', () => {
  it('works', () => {
    const item = {} as unknown

    if (isProcedure(item)) {
      expectTypeOf(item).toEqualTypeOf<ANY_PROCEDURE>()
    }
  })
})
