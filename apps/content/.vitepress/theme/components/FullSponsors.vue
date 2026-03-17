<script lang="ts" setup>
import { computed } from 'vue'
import { sponsors } from '../sponsors'

const activeSponsors = computed(() =>
  sponsors.filter(s => s.tierLevel > 0 && s.amount > 0),
)

const pastSponsors = computed(() =>
  sponsors.filter(s => s.tierLevel <= 0 || s.amount <= 0),
)

const tierGroups = computed(() => {
  const grouped = new Map<number, typeof sponsors>()

  for (const sponsor of activeSponsors.value) {
    const group = grouped.get(sponsor.tierLevel)
    if (group) {
      group.push(sponsor)
    }
    else {
      grouped.set(sponsor.tierLevel, [sponsor])
    }
  }

  const tierLevels = [...grouped.keys()].sort((a, b) => b - a)

  return tierLevels.map((level) => {
    const tierSponsors = grouped.get(level)!
    const rank = tierLevels.indexOf(level)
    const sizes = [220, 170, 120, 88, 76, 54]
    const imageSize = sizes[Math.min(rank, sizes.length - 1)] ?? 100

    return {
      level,
      title: tierSponsors[0]?.tierTitle ?? `Tier ${level}`,
      sponsors: tierSponsors,
      imageSize,
    }
  })
})
</script>

<template>
  <div class="full-sponsors-container">
    <h2 class="sponsored-by">
      Sponsored by
    </h2>
    <p class="sponsor-cta">
      If you find oRPC valuable and would like to support its development:
      <a href="https://github.com/sponsors/dinwwwh" target="_blank" rel="noopener">GitHub Sponsors</a>
    </p>

    <div v-for="tier in tierGroups" :key="tier.level" class="tier-section">
      <h3 class="tier-title">
        {{ tier.title }}
      </h3>
      <table class="tier-table">
        <tr v-for="(row, rowIndex) in Math.ceil(tier.sponsors.length / 6)" :key="rowIndex">
          <td
            v-for="sponsor in tier.sponsors.slice(rowIndex * 6, rowIndex * 6 + 6)"
            :key="sponsor.login"
            align="center"
          >
            <a
              :href="sponsor.link"
              target="_blank"
              rel="noopener"
              :title="sponsor.name || sponsor.login"
              class="sponsor-link"
            >
              <img
                :src="sponsor.avatar"
                :alt="sponsor.name || sponsor.login"
                :width="tier.imageSize"
                loading="lazy"
              >
              <br>
              <span class="sponsor-name">{{ sponsor.name || sponsor.login }}</span>
            </a>
          </td>
        </tr>
      </table>
    </div>

    <div v-if="pastSponsors.length > 0" class="tier-section">
      <h3 class="tier-title">
        Past Sponsors
      </h3>
      <p class="past-sponsors">
        <a
          v-for="sponsor in pastSponsors"
          :key="sponsor.login"
          :href="sponsor.link"
          target="_blank"
          rel="noopener"
          :title="sponsor.name || sponsor.login"
        >
          <img
            :src="sponsor.avatar"
            :alt="sponsor.name || sponsor.login"
            width="32"
            height="32"
            class="past-sponsor-avatar"
            loading="lazy"
          >
        </a>
      </p>
    </div>
  </div>
</template>

<style scoped>
.full-sponsors-container {
  margin-top: 40px;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  max-width: 768px;
  margin-left: auto;
  margin-right: auto;
}

.sponsored-by {
  opacity: 0.8;
  margin: 48px 0 8px;
  border-top: 1px solid var(--vp-c-divider);
  padding-top: 24px;
  letter-spacing: -0.02em;
  line-height: 32px;
  font-size: 24px;
}

.sponsor-cta {
  margin-bottom: 24px;
  font-size: 14px;
  color: var(--vp-c-text-2);
}

.sponsor-cta a {
  color: var(--vp-c-brand-1);
  text-decoration: underline;
}

.tier-section {
  width: 100%;
  margin-bottom: 16px;
}

.tier-title {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 8px;
  color: var(--vp-c-text-1);
}

.tier-table {
  border-collapse: collapse;
  margin-left: auto;
  margin-right: auto;
}

.tier-table td {
  padding: 12px;
  vertical-align: top;
  text-align: center;
}

.sponsor-link {
  text-decoration: none;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
}

.sponsor-link:hover {
  opacity: 0.8;
}

.sponsor-name {
  font-size: 13px;
  color: var(--vp-c-text-2);
}

.past-sponsors {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.past-sponsor-avatar {
  opacity: 0.7;
  transition: opacity 0.2s;
}

.past-sponsor-avatar:hover {
  opacity: 1;
}
</style>
