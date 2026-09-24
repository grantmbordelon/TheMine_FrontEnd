<script setup lang="ts">
import { reactive, ref } from 'vue';
import { db, deleteStaff, saveStaff } from '../../stores/data';
import { attempt } from '../../stores/ui';
import Modal from '../Modal.vue';

const props = defineProps<{ staffId?: string }>();
const emit = defineEmits<{ close: [] }>();
const s = props.staffId ? db.staff.find(x => x.id === props.staffId) : undefined;
const f = reactive({ role: s?.role ?? '', name: s?.name ?? '', responsibility: s?.responsibility ?? '' });
const busy = ref(false);

async function save() {
  if (!f.name.trim()) return;
  busy.value = true;
  const sort = s ? s.sort : Math.max(0, ...db.staff.map(x => x.sort)) + 1;
  const ok = await attempt(() => saveStaff(s ? { id: s.id, ...f } : { ...f, sort }), 'Saved');
  busy.value = false;
  if (ok) emit('close');
}
async function remove() {
  if (s && (await attempt(() => deleteStaff(s.id), 'Removed'))) emit('close');
}
</script>

<template>
  <Modal :title="s ? 'Edit staff member' : 'Add staff member'" :busy="busy" :can-delete="!!s" @close="emit('close')" @save="save" @delete="remove">
    <div class="f"><label>ROLE</label><input v-model="f.role" /></div>
    <div class="f"><label>NAME <span class="req">*</span></label><input v-model="f.name" required /></div>
    <div class="f"><label>RESPONSIBILITY</label><textarea v-model="f.responsibility" rows="2"></textarea></div>
  </Modal>
</template>
