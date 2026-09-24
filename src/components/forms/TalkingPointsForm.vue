<script setup lang="ts">
import { ref } from 'vue';
import { db, savePlayer } from '../../stores/data';
import { attempt } from '../../stores/ui';
import Modal from '../Modal.vue';

const props = defineProps<{ playerId: string }>();
const emit = defineEmits<{ close: [] }>();
const p = db.players.find(x => x.id === props.playerId)!;
const text = ref(p.talking_points);
const busy = ref(false);

async function save() {
  busy.value = true;
  const ok = await attempt(() => savePlayer({ id: p.id, talking_points: text.value.trim() }), 'Talking points saved');
  busy.value = false;
  if (ok) emit('close');
}
</script>

<template>
  <Modal :title="`Talking points — ${p.name}`" :busy="busy" @close="emit('close')" @save="save">
    <div class="f">
      <label>PREP FOR THE NEXT MEETING</label>
      <textarea v-model="text" rows="8"></textarea>
      <div class="help">Draft these ahead of time. They pre-fill <strong>Goal for the meeting</strong> when the next conversation is logged.</div>
    </div>
  </Modal>
</template>
