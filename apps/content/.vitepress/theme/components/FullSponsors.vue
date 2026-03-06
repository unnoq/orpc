<template>
  <div class="full-sponsors-container">
    <h2 class="sponsored-by">
      Sponsored by
    </h2>

    <div class="full-sponsors">
      <a href="https://cdn.jsdelivr.net/gh/dinwwwh/dinwwwh/sponsors.svg" target="_blank" rel="noopener noreferrer">
        <img
          crossorigin="anonymous"
          inline-block
          width="768" height="1464"
          class="resizable-img"
          loading="lazy"
          src="https://cdn.jsdelivr.net/gh/dinwwwh/dinwwwh/sponsors.svg"
          alt="Anthony Fu's sponsors"
        >
      </a>
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
}

.sponsored-by {
  opacity: 0.8;
  margin: 48px 0 16px;
  border-top: 1px solid var(--vp-c-divider);
  padding-top: 24px;
  letter-spacing: -0.02em;
  line-height: 32px;
  font-size: 24px;
}

.full-sponsors {
  margin-top: 24px;
}
</style>
