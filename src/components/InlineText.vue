<script setup lang="ts">
// Click-to-edit text that reads as plain document text (and prints that way).
import { nextTick, onMounted, ref, watch } from 'vue';

const props = withDefaults(
  defineProps<{
    value: string;
    save: (v: string) => Promise<boolean>;
    placeholder?: string;
    target?: number; // soft length guide, shown while editing
    enterCommits?: boolean; // Enter saves (Shift+Enter for a newline)
    startEditing?: boolean;
  }>(),
  { placeholder: 'Click to add…' },
);
const emit = defineEmits<{ committed: [value: string] }>();

const editing = ref(false);
const draft = ref('');
const shown = ref(props.value || '');
const ta = ref<HTMLTextAreaElement>();
watch(() => props.value, v => { if (!editing.value) shown.value = v || ''; });

function grow() {
  const el = ta.value;
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = `${el.scrollHeight}px`;
}
async function start() {
  if (editing.value) return;
  draft.value = shown.value;
  editing.value = true;
  await nextTick();
  grow();
  ta.value?.focus();
  ta.value?.setSelectionRange(draft.value.length, draft.value.length);
}
async function commit() {
  if (!editing.value) return;
  editing.value = false;
  const v = draft.value.trim();
  if (v !== (props.value || '').trim()) {
    shown.value = v;
    if (!(await props.save(v))) shown.value = props.value || '';
  }
  emit('committed', v);
}
function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    e.preventDefault();
    editing.value = false; // discard
  } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey || (props.enterCommits && !e.shiftKey))) {
    e.preventDefault();
    commit();
  }
}
onMounted(() => { if (props.startEditing) start(); });
</script>

<template>
  <div class="it">
    <template v-if="editing">
      <textarea ref="ta" v-model="draft" rows="1" @input="grow" @blur="commit" @keydown="onKey"></textarea>
      <div v-if="target" class="it-meter" :class="{ over: draft.length > target }">
        {{ draft.length }} / ~{{ target }}{{ draft.length > target ? ' · long for a compact card' : '' }}
      </div>
    </template>
    <div v-else class="it-view" :class="{ empty: !shown }" tabindex="0" @click="start" @keydown.enter.prevent="start">{{ shown || placeholder }}</div>
  </div>
</template>
