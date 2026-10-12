<script setup lang="ts">
import { reactive, ref } from 'vue';
import { db, saveSettings } from '../../stores/data';
import { attempt } from '../../stores/ui';
import Modal from '../Modal.vue';

const emit = defineEmits<{ close: [] }>();
const s = db.settings!;
const f = reactive({ season: s.season, maintainers: s.maintainers });
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
    <p class="small muted" style="margin: 0">The summary bullets are edited directly on the Present tab.</p>
  </Modal>
</template>
