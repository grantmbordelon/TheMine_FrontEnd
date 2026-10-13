<script setup lang="ts">
// Click-to-edit text that reads as plain document text (and prints that way).
// Supports bold / italic: toolbar buttons or ⌘B / ⌘I. Stored as light markup (lib/rich).
import { nextTick, onMounted, ref, watch } from 'vue';
import { domToMarkup, renderRich } from '../lib/rich';

const props = withDefaults(
  defineProps<{
    value: string;
    save: (v: string) => Promise<boolean>;
    placeholder?: string;
    target?: number; // soft length guide, shown while editing
    enterCommits?: boolean; // Enter saves (Shift+Enter for a new line)
    startEditing?: boolean;
  }>(),
  { placeholder: 'Click to add…' },
);
const emit = defineEmits<{ committed: [value: string] }>();

const editing = ref(false);
const shown = ref(props.value || '');
const ed = ref<HTMLDivElement>();
const length = ref(0);
watch(() => props.value, v => { if (!editing.value) shown.value = v || ''; });

function measure() {
  length.value = (ed.value?.innerText || '').trim().length;
}
async function start() {
  if (editing.value) return;
  editing.value = true;
  await nextTick();
  const el = ed.value!;
  el.innerHTML = renderRich(shown.value);
  el.focus();
  const range = document.createRange(); // caret to the end
  range.selectNodeContents(el);
  range.collapse(false);
  const sel = window.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(range);
  measure();
}
async function commit() {
  if (!editing.value || !ed.value) return;
  const v = domToMarkup(ed.value);
  editing.value = false;
  if (v !== (props.value || '').trim()) {
    shown.value = v;
    if (!(await props.save(v))) shown.value = props.value || '';
  }
  emit('committed', v);
}
function format(cmd: 'bold' | 'italic') {
  document.execCommand(cmd);
  ed.value?.focus();
}
function newline() {
  if (!document.execCommand('insertLineBreak')) document.execCommand('insertHTML', false, '<br>');
}
function onKey(e: KeyboardEvent) {
  const mod = e.metaKey || e.ctrlKey;
  if (e.key === 'Escape') {
    e.preventDefault();
    editing.value = false; // discard
  } else if (mod && (e.key === 'b' || e.key === 'i')) {
    e.preventDefault();
    format(e.key === 'b' ? 'bold' : 'italic');
  } else if (mod && e.key === 'u') {
    e.preventDefault(); // underline isn't supported
  } else if (e.key === 'Enter') {
    e.preventDefault();
    if (mod || (props.enterCommits && !e.shiftKey)) commit();
    else newline();
  }
}
function onPaste(e: ClipboardEvent) {
  e.preventDefault(); // paste as plain text so outside formatting doesn't come along
  document.execCommand('insertText', false, e.clipboardData?.getData('text/plain') || '');
}
onMounted(() => { if (props.startEditing) start(); });
</script>

<template>
  <div class="it">
    <template v-if="editing">
      <div ref="ed" class="it-ed" contenteditable="true" @input="measure" @blur="commit" @keydown="onKey" @paste="onPaste"></div>
      <div class="it-bar">
        <button type="button" title="Bold (⌘B)" @mousedown.prevent="format('bold')"><b>B</b></button>
        <button type="button" title="Italic (⌘I)" @mousedown.prevent="format('italic')"><i>I</i></button>
        <span class="it-keys">{{ enterCommits ? 'Enter to save · Shift+Enter new line' : '⌘Enter or click away to save' }} · Esc cancels</span>
        <span v-if="target" class="it-meter" :class="{ over: length > target }">
          {{ length }} / ~{{ target }}{{ length > target ? ' · long for a compact card' : '' }}
        </span>
      </div>
    </template>
    <div v-else class="it-view" :class="{ 'is-empty': !shown }" tabindex="0" @click="start" @keydown.enter.prevent="start">
      <span v-if="shown" class="rich" v-html="renderRich(shown)"></span>
      <span v-else class="ph">{{ placeholder }}</span>
    </div>
  </div>
</template>
