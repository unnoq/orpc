import type { MaybeOptionalOptions } from '@orpc/shared'
import type { ServerDurableEventIteratorOptions } from './event-iterator'
import type { DurableEventIteratorObject } from './object'
import { resolveMaybeOptionalOptions } from '@orpc/shared'
import { ServerDurableEventIterator } from './event-iterator'

export interface DurableEventIteratorBuilderOptions extends Omit<ServerDurableEventIteratorOptions<any>, 'attachment'> {

}

export class DurableEventIteratorBuilder<
  T extends DurableEventIteratorObject<any, any>,
> {
  constructor(
    private readonly options: DurableEventIteratorBuilderOptions,
  ) {
  }

  subscribe(
    channel: string,
    ...rest: MaybeOptionalOptions<
      Partial<ServerDurableEventIteratorOptions<unknown>>
      & (
        T extends DurableEventIteratorObject<any, infer U>
          ? undefined extends U
            ? { attachment?: U }
            : { attachment: U }
          : never
      )
    >
  ): ServerDurableEventIterator<T, never> {
    const options = resolveMaybeOptionalOptions(rest) as any

    return new ServerDurableEventIterator<T, never>(channel, {
      ...this.options,
      ...options,
    })
  }
}
