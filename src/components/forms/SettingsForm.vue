<script setup lang="ts">
import { reactive, ref } from 'vue';
import { db, saveSettings } from '../../stores/data';
import { attempt } from '../../stores/ui';
import Modal from '../Modal.vue';

const emit = defineEmits<{ close: [] }>();
const s = db.settings!;
const f = reactive({
  season: s.season, maintainers: s.maintainers, summary: s.summary, quote: s.quote, quote_attrib: s.quote_attrib,
});
const busy = ref(false);

async function save() {
  busy.value = true;
  const ok = await attempt(() => saveSettings({ ...f }), 'Settings saved');
  busy.value = false;
  if (ok) emit('close');
}
</script>

<template>
  <Modal title="Report settings" :busy="busy" @close="emit('close')" @save="save">
    <div class="frow">
      <div class="f"><label>SEASON</label><input v-model="f.season" /></div>
      <div class="f"><label>MAINTAINED BY</label><input v-model="f.maintainers" /></div>
    </div>
    <div class="f">
      <label>SUMMARY</label>
      <textarea v-model="f.summary" rows="6"></textarea>
      <div class="help">Shown on the dashboard and the Present report. Counts are computed, so leave numbers out.</div>
    </div>
    <div class="f"><label>CLOSING QUOTE</label><textarea v-model="f.quote" rows="2"></textarea></div>
    <div class="f"><label>ATTRIBUTION</label><input v-model="f.quote_attrib" /></div>
  </Modal>
</template>
