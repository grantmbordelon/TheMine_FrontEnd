<script setup lang="ts">
import { reactive, ref } from 'vue';
import { db, deleteGoal, saveGoal } from '../../stores/data';
import { attempt } from '../../stores/ui';
import { sortedPlayers } from '../../lib/derive';
import { CATEGORIES, GOAL_STATUSES, type Category, type GoalStatus } from '../../lib/types';
import Modal from '../Modal.vue';

const props = defineProps<{ goalId?: string; playerId?: string }>();
const emit = defineEmits<{ close: [] }>();
const g = props.goalId ? db.goals.find(x => x.id === props.goalId) : undefined;
const f = reactive({
  player_id: g?.player_id ?? props.playerId ?? sortedPlayers()[0]?.id ?? '',
  title: g?.title ?? '',
  category: (g?.category ?? 'Body') as Category,
  status: (g?.status ?? 'Not started') as GoalStatus,
  target: g?.target ?? '',
  progress: g?.progress ?? '',
});
const busy = ref(false);

async function save() {
  if (!f.title.trim() || !f.player_id) return;
  busy.value = true;
  const ok = await attempt(() => saveGoal(g ? { id: g.id, ...f } : { ...f }), 'Goal saved');
  busy.value = false;
  if (ok) emit('close');
}
async function remove() {
  if (g && (await attempt(() => deleteGoal(g.id), 'Goal deleted'))) emit('close');
}
</script>

<template>
  <Modal :title="g ? 'Edit goal' : 'Add goal'" :busy="busy" :can-delete="!!g" @close="emit('close')" @save="save" @delete="remove">
    <div class="f">
      <label>PLAYER <span class="req">*</span></label>
      <select v-model="f.player_id"><option v-for="p in sortedPlayers()" :key="p.id" :value="p.id">{{ p.name }}</option></select>
    </div>
    <div class="f"><label>GOAL <span class="req">*</span></label><input v-model="f.title" required /></div>
    <div class="frow">
      <div class="f"><label>CATEGORY</label><select v-model="f.category"><option v-for="c in CATEGORIES" :key="c">{{ c }}</option></select></div>
      <div class="f"><label>STATUS</label><select v-model="f.status"><option v-for="s in GOAL_STATUSES" :key="s">{{ s }}</option></select></div>
    </div>
    <div class="f"><label>WHAT SUCCESS LOOKS LIKE</label><textarea v-model="f.target" rows="2"></textarea></div>
    <div class="f">
      <label>PROGRESS SO FAR</label>
      <textarea v-model="f.progress" rows="3"></textarea>
      <div class="help">The updated date stamps automatically when you save.</div>
    </div>
  </Modal>
</template>
