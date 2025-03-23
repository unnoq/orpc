import type { Ref } from 'vue'
import { useLocalStorage } from '@vueuse/core'
import { ref, watchEffect } from 'vue'

interface JSONSponsor {
  name: string
  login: string
  avatar: string
  amount: number
  link?: string
  org: boolean
  aside: 'aside' | 'aside-small' | 'none'
  asideLink?: string
  asideLogo: string
}

type UseSponsorsStatus = 'idle' | 'updating' | 'updated'

export function useSponsors(visible?: Ref<boolean>): { sponsors: Ref<JSONSponsor[]>, status: Ref<UseSponsorsStatus> } {
  const sponsors = useLocalStorage<JSONSponsor[]>('sponsors', [])
  const status = ref<UseSponsorsStatus>('idle')

  watchEffect(() => {
    if ((visible && !visible.value) || status.value !== 'idle') {
      return
    }

    status.value = 'updating'

    fetch('https://cdn.jsdelivr.net/gh/unnoq/unnoq/sponsors.json')
      .then(res => res.json())
      .then((value) => {
        sponsors.value = value
        status.value = 'updated'
      })
  })

  return {
    sponsors,
    status,
  }
}
