<script setup lang="ts">
// Read-only display of report text with bold / italic.
import { renderRich } from '../lib/rich';

defineProps<{ text: string | null | undefined; tag?: string }>();
</script>

<template>
  <component :is="tag || 'span'" class="rich" v-html="renderRich(text)" />
</template>
