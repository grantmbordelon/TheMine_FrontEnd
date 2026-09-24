<script setup lang="ts">
import { computed, reactive } from 'vue';
import MeetingCard from '../components/MeetingCard.vue';
import MeetingForm from '../components/forms/MeetingForm.vue';
import { db, freshKey } from '../stores/data';
import { openModal } from '../stores/ui';
import { notesFor, player, sortedPlayers, tierCls } from '../lib/derive';

const f = reactive({ player: '', q: '' });
const rows = computed(() => {
  const q = f.q.toLowerCase();
  return [...db.meetings]
    .sort((a, b) => b.meeting_date.localeCompare(a.meeting_date) || (b.meeting_time || '').localeCompare(a.meeting_time || ''))
    .filter(m => !f.player || m.player_id === f.player)
    .filter(m => {
      if (!q) return true;
      const text = notesFor(m.id).map(n => `${n.goal} ${n.discussed} ${n.next_steps}`).join(' ');
      return `${player(m.player_id)?.name} ${m.attendees} ${text}`.toLowerCase().includes(q);
    });
});
</script>

<template>
  <div class="sec-h">
    <h2>Ongoing Conversations Log</h2>
    <div class="hint">{{ rows.length }} entr{{ rows.length === 1 ? 'y' : 'ies' }} · newest first, every player in one stream</div>
  </div>
  <div class="filters noprint">
    <input v-model="f.q" type="search" placeholder="Search all conversations…" />
    <select v-model="f.player"><option value="">All players</option><option v-for="p in sortedPlayers()" :key="p.id" :value="p.id">{{ p.name }}</option></select>
    <button class="btn primary" style="margin-left: auto" @click="openModal(MeetingForm)">+ Log a meeting</button>
  </div>
  <div v-if="!rows.length" class="card empty">No conversations match.</div>
  <template v-for="m in rows" :key="freshKey(m.id)">
    <div style="margin-bottom: 4px">
      <RouterLink :to="{ name: 'player', params: { id: m.player_id } }" class="pname" style="color: var(--ink); font-size: 13px">{{ player(m.player_id)?.name }}</RouterLink>
      <span class="pill" :class="tierCls(player(m.player_id)?.tier || '')" style="margin-left: 6px">{{ player(m.player_id)?.tier }}</span>
    </div>
    <MeetingCard :meeting="m" />
  </template>
</template>
