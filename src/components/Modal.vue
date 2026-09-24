<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';

defineProps<{ title: string; wide?: boolean; busy?: boolean; canDelete?: boolean; saveLabel?: string }>();
const emit = defineEmits<{ close: []; save: []; delete: [] }>();
const body = ref<HTMLElement>();

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close');
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') emit('save');
}
onMounted(() => {
  document.addEventListener('keydown', onKey);
  body.value?.querySelector<HTMLElement>('input,select,textarea')?.focus();
});
onUnmounted(() => document.removeEventListener('keydown', onKey));

function confirmDelete() {
  if (confirm('Delete this permanently?')) emit('delete');
}
</script>

<template>
  <div class="mask" @mousedown.self="emit('close')">
    <div class="modal" :class="{ wide }">
      <div class="modal-h">
        <h3>{{ title }}</h3>
        <button class="x" aria-label="Close" @click="emit('close')">&times;</button>
      </div>
      <form ref="body" class="modal-b" @submit.prevent="emit('save')">
        <slot />
        <button type="submit" hidden></button>
      </form>
      <div class="modal-f">
        <button v-if="canDelete" class="btn danger" style="margin-right: auto" :disabled="busy" @click="confirmDelete">Delete</button>
        <button class="btn" @click="emit('close')">Cancel</button>
        <button class="btn primary" :disabled="busy" @click="emit('save')">{{ busy ? 'Saving…' : saveLabel || 'Save' }}</button>
      </div>
    </div>
  </div>
</template>
