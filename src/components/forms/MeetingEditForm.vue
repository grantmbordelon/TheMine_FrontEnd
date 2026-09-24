<script setup lang="ts">
// Edit a meeting's shared details (date, time, who was there) or delete it.
import { reactive, ref } from 'vue';
import { db, deleteMeeting, saveMeeting } from '../../stores/data';
import { attempt } from '../../stores/ui';
import { notesFor, playersIn } from '../../lib/derive';
import { GROUPS, MEETING_STATUSES, MEETING_TYPES, type MeetingStatus } from '../../lib/types';
import Modal from '../Modal.vue';

const props = defineProps<{ meetingId: string }>();
const emit = defineEmits<{ close: [] }>();
const m = db.meetings.find(x => x.id === props.meetingId)!;
const f = reactive({
  player_id: m.player_id,
  meeting_date: m.meeting_date,
  meeting_time: (m.meeting_time || '').slice(0, 5),
  meeting_type: m.meeting_type,
  status: m.status as MeetingStatus,
  attendees: m.attendees,
});
const busy = ref(false);

async function save() {
  if (!f.meeting_date) return;
  busy.value = true;
  const ok = await attempt(() => saveMeeting({ id: m.id, ...f, meeting_time: f.meeting_time || null }), 'Meeting updated');
  busy.value = false;
  if (ok) emit('close');
}
async function remove() {
  const n = notesFor(m.id).length;
  if (n > 1 && !confirm(`This deletes all ${n} sets of notes on this meeting. Continue?`)) return;
  if (await attempt(() => deleteMeeting(m.id), 'Meeting deleted')) emit('close');
}
</script>

<template>
  <Modal title="Edit meeting" :busy="busy" can-delete @close="emit('close')" @save="save" @delete="remove">
    <div class="f">
      <label>PLAYER</label>
      <select v-model="f.player_id">
        <optgroup v-for="g in GROUPS" :key="g" :label="g">
          <option v-for="p in playersIn(g)" :key="p.id" :value="p.id">{{ p.name }}</option>
        </optgroup>
      </select>
    </div>
    <div class="frow3">
      <div class="f"><label>DATE</label><input v-model="f.meeting_date" type="date" required /></div>
      <div class="f"><label>TIME</label><input v-model="f.meeting_time" type="time" /></div>
      <div class="f"><label>TYPE</label><select v-model="f.meeting_type"><option v-for="t in MEETING_TYPES" :key="t">{{ t }}</option></select></div>
    </div>
    <div class="frow">
      <div class="f"><label>WHO WAS THERE</label><input v-model="f.attendees" /></div>
      <div class="f"><label>STATUS</label><select v-model="f.status"><option v-for="s in MEETING_STATUSES" :key="s">{{ s }}</option></select></div>
    </div>
    <p class="small muted" style="margin: 0">Each person's notes are edited from their own section of the meeting card.</p>
  </Modal>
</template>
