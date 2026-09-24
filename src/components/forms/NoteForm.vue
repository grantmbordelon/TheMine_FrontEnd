<script setup lang="ts">
// Add or edit one person's notes on an existing meeting.
import { computed, reactive, ref } from 'vue';
import { auth } from '../../stores/auth';
import { db, deleteNote, saveNote } from '../../stores/data';
import { attempt } from '../../stores/ui';
import { memberName, player } from '../../lib/derive';
import { fmtDate } from '../../lib/format';
import Modal from '../Modal.vue';

const props = defineProps<{ meetingId: string; noteId?: string }>();
const emit = defineEmits<{ close: [] }>();

const meeting = computed(() => db.meetings.find(m => m.id === props.meetingId));
const note = props.noteId ? db.notes.find(n => n.id === props.noteId) : undefined;
const f = reactive({
  goal: note?.goal ?? '',
  discussed: note?.discussed ?? '',
  next_steps: note?.next_steps ?? '',
  next_owner: note?.next_owner ?? '',
  next_due: note?.next_due ?? '',
  next_done: note?.next_done ?? false,
});
const busy = ref(false);
const author = note ? memberName(note.author_id) : auth.member?.name ?? '';
const title = computed(() => {
  const p = meeting.value && player(meeting.value.player_id);
  return `${note ? 'Edit' : 'Add'} notes — ${p?.name ?? ''}, ${fmtDate(meeting.value?.meeting_date)}`;
});

async function save() {
  busy.value = true;
  const row = { ...f, next_due: f.next_due || null };
  const ok = await attempt(
    () => saveNote(note ? { id: note.id, ...row } : { ...row, meeting_id: props.meetingId, author_id: auth.member!.id }),
    note ? 'Notes updated' : 'Notes added',
  );
  busy.value = false;
  if (ok) emit('close');
}
async function remove() {
  if (!note) return;
  if (await attempt(() => deleteNote(note.id), 'Notes deleted')) emit('close');
}
</script>

<template>
  <Modal :title="title" wide :busy="busy" :can-delete="!!note" @close="emit('close')" @save="save" @delete="remove">
    <div class="fieldset">
      <div class="lg">NOTES · {{ author.toUpperCase() }}</div>
      <div class="f"><label>GOAL FOR THE MEETING</label><textarea v-model="f.goal" rows="2"></textarea></div>
      <div class="f"><label>WHAT WE TALKED ABOUT</label><textarea v-model="f.discussed" rows="6"></textarea></div>
    </div>
    <div class="fieldset">
      <div class="lg">NEXT STEPS</div>
      <div class="f"><label>NEXT STEPS</label><textarea v-model="f.next_steps" rows="3"></textarea></div>
      <div class="frow">
        <div class="f"><label>OWNER</label><input v-model="f.next_owner" /></div>
        <div class="f"><label>DUE</label><input v-model="f.next_due" type="date" /></div>
      </div>
      <div class="f"><label class="chk"><input v-model="f.next_done" type="checkbox" /> Next step done</label></div>
    </div>
  </Modal>
</template>
