<script setup lang="ts">
// Log a new meeting with your notes.
import { computed, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { auth } from '../../stores/auth';
import { db, logMeeting } from '../../stores/data';
import { attempt, openModal } from '../../stores/ui';
import { memberName, notesFor, playersIn, player } from '../../lib/derive';
import { daysBetween, fmtDate, parseISO, todayISO } from '../../lib/format';
import { GROUPS, MEETING_STATUSES, MEETING_TYPES } from '../../lib/types';
import Modal from '../Modal.vue';
import NoteForm from './NoteForm.vue';

const props = defineProps<{ playerId?: string }>();
const emit = defineEmits<{ close: [] }>();
const router = useRouter();

const ATTENDEES_KEY = 'mine.lastAttendees';
function lastAttendees(): string {
  try { return localStorage.getItem(ATTENDEES_KEY) || ''; } catch { return ''; }
}
const defaultAttendees = lastAttendees() || auth.member?.name || '';
const f = reactive({
  player: props.playerId || playersIn('Rookie')[0]?.id || '',
  date: todayISO(),
  time: '',
  type: '1-on-1',
  status: 'Completed',
  attendees: defaultAttendees,
  goal: '',
  discussed: '',
  nextSteps: '',
  nextOwner: '',
  nextDue: '',
  nextDone: false,
  clearTalkingPoints: true,
});
const busy = ref(false);
const talkingPoints = computed(() => player(f.player)?.talking_points || '');

// Pre-fill the goal from the player's talking points (until the user types their own).
let prefilled = '';
watch(
  talkingPoints,
  tp => {
    if (!f.goal || f.goal === prefilled) f.goal = tp;
    prefilled = tp;
  },
  { immediate: true },
);

// Someone else already logged this meeting? Offer to add notes to theirs instead.
const existing = computed(() => {
  const d = parseISO(f.date);
  if (!d) return [];
  return db.meetings.filter(m => {
    const md = parseISO(m.meeting_date);
    return m.player_id === f.player && md && Math.abs(daysBetween(md, d)) <= 1;
  });
});
function addToExisting(meetingId: string) {
  openModal(NoteForm, { meetingId });
}
const loggedBy = (meetingId: string) =>
  notesFor(meetingId).map(n => memberName(n.author_id)).join(' & ') || 'someone';

async function save() {
  if (!f.player || !f.date) return;
  busy.value = true;
  let id = '';
  const ok = await attempt(async () => {
    id = await logMeeting({ ...f, time: f.time || null, nextDue: f.nextDue || null, clearTalkingPoints: f.clearTalkingPoints && !!talkingPoints.value });
  }, 'Meeting logged');
  busy.value = false;
  if (ok) {
    try { localStorage.setItem(ATTENDEES_KEY, f.attendees); } catch { /* storage unavailable */ }
    emit('close');
    if (id) router.push({ name: 'player', params: { id: f.player } });
  }
}
</script>

<template>
  <Modal title="Log a meeting" wide :busy="busy" @close="emit('close')" @save="save">
    <div class="f">
      <label>PLAYER <span class="req">*</span></label>
      <select v-model="f.player">
        <optgroup v-for="g in GROUPS" :key="g" :label="g">
          <option v-for="p in playersIn(g)" :key="p.id" :value="p.id">{{ p.name }}</option>
        </optgroup>
      </select>
    </div>
    <div class="frow3">
      <div class="f"><label>DATE <span class="req">*</span></label><input v-model="f.date" type="date" required /></div>
      <div class="f"><label>TIME</label><input v-model="f.time" type="time" /></div>
      <div class="f"><label>TYPE</label><select v-model="f.type"><option v-for="t in MEETING_TYPES" :key="t">{{ t }}</option></select></div>
    </div>
    <div class="frow">
      <div class="f"><label>WHO WAS THERE</label><input v-model="f.attendees" /></div>
      <div class="f"><label>STATUS</label><select v-model="f.status"><option v-for="s in MEETING_STATUSES" :key="s">{{ s }}</option></select></div>
    </div>

    <div v-for="m in existing" :key="m.id" class="dupe">
      <span><strong>{{ loggedBy(m.id) }}</strong> already logged a meeting with {{ player(f.player)?.name }} on {{ fmtDate(m.meeting_date) }}.</span>
      <button type="button" class="btn" style="padding: 5px 11px; font-size: 12px" @click="addToExisting(m.id)">Add my notes to that one</button>
    </div>

    <div class="fieldset">
      <div class="lg">YOUR NOTES · {{ auth.member?.name?.toUpperCase() }}</div>
      <div class="f">
        <label>GOAL FOR THE MEETING</label>
        <textarea v-model="f.goal" rows="2"></textarea>
        <div class="help">{{ talkingPoints && f.goal === talkingPoints ? "Pre-filled from this player's talking points." : 'What are you trying to accomplish in this conversation?' }}</div>
      </div>
      <div class="f"><label>WHAT WE TALKED ABOUT</label><textarea v-model="f.discussed" rows="5"></textarea></div>
    </div>
    <div class="fieldset">
      <div class="lg">NEXT STEPS</div>
      <div class="f">
        <label>NEXT STEPS</label>
        <textarea v-model="f.nextSteps" rows="3"></textarea>
        <div class="help">Shows on the dashboard until it's ticked off.</div>
      </div>
      <div class="frow">
        <div class="f"><label>OWNER</label><input v-model="f.nextOwner" /></div>
        <div class="f"><label>DUE</label><input v-model="f.nextDue" type="date" /></div>
      </div>
      <div class="f"><label class="chk"><input v-model="f.nextDone" type="checkbox" /> Next step already done</label></div>
    </div>
    <div v-if="talkingPoints" class="f">
      <label class="chk"><input v-model="f.clearTalkingPoints" type="checkbox" /> Clear this player's talking points after saving</label>
    </div>
  </Modal>
</template>
