<script lang="ts" setup>
import { useElementVisibility } from '@vueuse/core'
import { computed, ref } from 'vue'
import { useSponsors } from '../composables/sponsors.ts'

const container = ref<HTMLDivElement>()
const containerIsVisible = useElementVisibility(container)

const { sponsors } = useSponsors(containerIsVisible)

const normalSponsors = computed(() => sponsors.value.filter(s => s.rideSidebarSize === 'normal'))
const smallSponsors = computed(() => sponsors.value.filter(s => s.rideSidebarSize === 'small'))
</script>

<template>
  <div ref="container" class="aside-container">
    <a class="aside-sponsors-title" href="https://github.com/sponsors/unnoq" target="_blank" rel="noopener">SPONSORS</a>

    <div class="aside-sponsors-list">
      <a v-for="sponsor in normalSponsors" :key="sponsor.login" class="aside-sponsor" target="_blank" :href="sponsor.rideSidebarLink">
        <img :src="sponsor.rightSidebarLogo" :alt="sponsor.name">
      </a>

      <a v-if="!normalSponsors.length && !smallSponsors.length" class="aside-sponsor" href="https://github.com/sponsors/unnoq" target="_blank" rel="noopener">
        Become a sponsor
      </a>

      <div class="aside-sponsors-small">
        <a v-for="sponsor in smallSponsors" :key="sponsor.login" class="aside-sponsor" target="_blank" :href="sponsor.rideSidebarLink">
          <img :src="sponsor.rightSidebarLogo" :alt="sponsor.name">
        </a>
      </div>
    </div>
  </div>
</template>

<style scoped>
.aside-container {
  margin-top: 33px;
}

.aside-sponsors-title {
  display: inline-block;
  padding-bottom: 11px;
  font-size: 11px;
  font-weight: 700;
  opacity: 50%;
  letter-spacing: 0.4px;
}

.aside-sponsors-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.aside-sponsor {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 60px;
  border-radius: 2px;

  font-size: 13px;
  font-weight: 700;
  background-color: var(--vp-c-bg-soft);
}

.dark .aside-sponsor {
  filter: grayscale(1) invert(1);
  color: var(--vp-c-bg-soft);
  background-color: var(--vp-c-text-1);
}

.dark .aside-sponsor:hover {
  transition: filter 0.2s ease;
  filter: brightness(1.1);
}

.aside-sponsor img {
  max-width: 120px;
  max-height: 48px;
}

.aside-sponsors-small {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 2px;
}

.aside-sponsors-small .aside-sponsor img {
  max-width: 80px;
  max-height: 35px;
}
</style>
