import { computed, ref } from 'vue'
import { unrefDeep } from './utils'

it('unrefDeep', () => {
  const date = new Date()
  const url = new URL('https://orpc.dev')
  const regex = /regex/
  const set = new Set([1, 2, 3])
  const map = new Map([['a', 1], ['b', 2]])

  expect(
    unrefDeep({
      primitive: 1,
      nested: computed(() => ({
        primitive: 1,
        date: ref(date),
        url: ref(url),
        regex: ref(regex),
        set: ref(set),
        map: ref(map),
        nested: ref([
          computed(() => ({
            primitive: 1,
            date: ref(date),
            url: ref(url),
            regex: ref(regex),
            set: ref(set),
            map: ref(map),
          })),
          ref(ref(ref(computed(() => ({
            primitive: 1,
            date: ref(date),
            url: ref(url),
            regex: ref(regex),
            set: ref(set),
            map: ref(map),
            arr: [[computed(() => ({
              primitive: 1,
              date: ref(date),
              url: ref(url),
              regex: ref(regex),
              set: ref(set),
              map: ref(map),
            }))]],
          }))))),
        ]),
      })),
    }),
  ).toEqual({
    primitive: 1,
    nested: {
      primitive: 1,
      date,
      url,
      regex,
      set,
      map,
      nested: [
        {
          primitive: 1,
          date,
          url,
          regex,
          set,
          map,
        },
        {
          primitive: 1,
          date,
          url,
          regex,
          set,
          map,
          arr: [[
            {
              primitive: 1,
              date,
              url,
              regex,
              set,
              map,
            },
          ]],
        },
      ],
    },
  })
})
