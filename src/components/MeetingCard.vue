<script setup lang="ts">
import { computed } from 'vue';
import { auth } from '../stores/auth';
import { freshKey, isFresh, saveNote } from '../stores/data';
import { attempt, openModal } from '../stores/ui';
import { memberName, notesFor } from '../lib/derive';
import { fmtDate, fmtTime } from '../lib/format';
import type { Meeting, Note } from '../lib/types';
import MeetingEditForm from './forms/MeetingEditForm.vue';
import NoteForm from './forms/NoteForm.vue';

const props = defineProps<{ meeting: Meeting; readonly?: boolean }>();
const notes = computed(() => notesFor(props.meeting.id));
const myNote = computed(() => notes.value.find(n => n.author_id === auth.member?.id));
const canEdit = (n: Note) => !props.readonly && (n.author_id === auth.member?.id || !n.author_id || auth.member?.is_admin);

function closeStep(n: Note) {
  attempt(() => saveNote({ id: n.id, next_done: true }), 'Next step closed out');
}
</script>

<template>
  <div class="mtg" :class="{ fresh: isFresh(meeting.id) }">
    <div class="mtg-h">
      <span class="dt">{{ fmtDate(meeting.meeting_date) }}<span v-if="meeting.meeting_time" class="who" style="margin-left: 7px">{{ fmtTime(meeting.meeting_time) }}</span></span>
      <span class="pill" :class="meeting.status === 'Completed' ? 'ok' : 'soon'">{{ meeting.status }}</span>
      <span class="pill never">{{ meeting.meeting_type }}</span>
      <span v-if="meeting.attendees" class="who">{{ meeting.attendees }}</span>
      <span v-if="isFresh(meeting.id)" class="newtag">NEW</span>
      <span v-if="!readonly" class="ra noprint">
        <button class="linkbtn" @click="openModal(MeetingEditForm, { meetingId: meeting.id })">Edit meeting</button>
      </span>
    </div>

    <div v-for="n in notes" :key="freshKey(n.id)" class="note" :class="{ fresh: isFresh(n.id) }">
      <div class="note-h">
        <span class="au" :class="{ prog: !n.author_id }">{{ memberName(n.author_id) }}</span>
        <span v-if="isFresh(n.id)" class="newtag">NEW</span>
        <span v-if="canEdit(n)" class="ra noprint">
          <button class="linkbtn" @click="openModal(NoteForm, { meetingId: meeting.id, noteId: n.id })">Edit</button>
        </span>
      </div>
      <div v-if="n.goal" class="fld goal-f"><div class="fl">GOAL FOR THE MEETING</div><div class="wrapy">{{ n.goal }}</div></div>
      <div v-if="n.discussed" class="fld"><div class="fl">WHAT WE TALKED ABOUT</div><div class="wrapy">{{ n.discussed }}</div></div>
      <div v-if="n.next_steps" class="fld next-f">
        <div class="fl">NEXT STEPS <span v-if="n.next_done" class="pill ok">Done</span></div>
        <div class="wrapy">{{ n.next_steps }}</div>
        <div v-if="n.next_owner || n.next_due" class="xsmall muted" style="margin-top: 5px">
          <template v-if="n.next_owner">Owner: {{ n.next_owner }}</template>
          <template v-if="n.next_owner && n.next_due"> · </template>
          <template v-if="n.next_due">Due: {{ fmtDate(n.next_due) }}</template>
        </div>
        <button v-if="!readonly && !n.next_done" class="linkbtn noprint" style="margin-top: 6px" @click="closeStep(n)">Mark done</button>
      </div>
      <div v-if="!n.goal && !n.discussed && !n.next_steps" class="small dash">No detail recorded.</div>
    </div>
    <div v-if="!notes.length" class="note small dash">No notes yet.</div>

    <div v-if="!readonly && !myNote" class="mtg-add noprint">
      <button class="linkbtn" @click="openModal(NoteForm, { meetingId: meeting.id })">+ Add my notes to this meeting</button>
    </div>
  </div>
</template>
