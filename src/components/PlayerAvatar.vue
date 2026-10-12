<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { headshotUrl } from '../lib/espn';
import type { Player } from '../lib/types';

const props = withDefaults(defineProps<{ player?: Player | null; size?: number; eager?: boolean }>(), { size: 28 });
const failed = ref(false);
const src = computed(() => (props.player ? headshotUrl(props.player) : ''));
watch(src, () => (failed.value = false));
const initials = computed(() =>
  (props.player?.name || '?').split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase());
</script>

<template>
  <span class="av" :style="{ width: `${size}px`, height: `${size}px`, fontSize: `${Math.round(size * 0.36)}px` }">
    <img v-if="src && !failed" :src="src" alt="" :loading="eager ? 'eager' : 'lazy'" @error="failed = true" />
    <span v-else>{{ initials }}</span>
  </span>
</template>
