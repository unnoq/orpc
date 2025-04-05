export function toBatchAbortSignal(signals: readonly (AbortSignal | undefined)[]): AbortSignal {
  const realSignals = signals.filter(signal => signal !== undefined)

  const controller = new AbortController()

  const abortedSignals = realSignals.filter(signal => signal.aborted)

  if (abortedSignals.length && abortedSignals.length === realSignals.length) {
    controller.abort()
  }

  for (const signal of realSignals) {
    signal.addEventListener('abort', () => {
      abortedSignals.push(signal)

      if (abortedSignals.length === realSignals.length) {
        controller.abort()
      }
    })
  }

  return controller.signal
}
