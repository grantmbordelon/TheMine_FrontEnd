<script setup lang="ts">
defineProps<{ n: number | string; label: string; tone?: '' | 'dark' | 'warm' | 'alert' }>();
</script>

<template>
  <div class="tile" :class="tone"><div class="n">{{ n }}</div><div class="l">{{ label }}</div></div>
</template>
