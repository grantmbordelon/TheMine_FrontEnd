<script setup lang="ts">
import { computed } from 'vue';
import StatTile from '../components/StatTile.vue';
import GoalForm from '../components/forms/GoalForm.vue';
import { db, isFresh } from '../stores/data';
import { openModal } from '../stores/ui';
import { goalPill, player } from '../lib/derive';
import { fmtShort } from '../lib/format';
import { CATEGORIES, GOAL_STATUSES } from '../lib/types';

const players = computed(() => new Set(db.goals.map(g => g.player_id)).size);
const byCat = computed(() => CATEGORIES.map(c => ({ c, goals: db.goals.filter(g => g.category === c) })).filter(x => x.goals.length));
const tone = (s: string) => (s === 'Achieved' ? 'dark' : s === 'At risk' ? 'alert' : s === 'On track' ? 'warm' : '');
</script>

<template>
  <div class="sec-h">
    <h2>Goals &amp; Progress</h2>
    <div class="hint">{{ db.goals.length }} goals across {{ players }} players · <button class="linkbtn" @click="openModal(GoalForm)">+ Add goal</button></div>
  </div>
  <div class="tiles" style="margin-bottom: 24px">
    <StatTile v-for="s in GOAL_STATUSES" :key="s" :n="db.goals.filter(g => g.status === s).length" :label="s.toUpperCase()" :tone="tone(s)" />
  </div>
  <div v-if="!db.goals.length" class="card empty">No goals yet. Open a player and add one.</div>
  <div v-for="{ c, goals } in byCat" :key="c" class="sec">
    <div class="sec-h"><h2>{{ c }}</h2><div class="hint">{{ goals.length }} goal{{ goals.length === 1 ? '' : 's' }}</div></div>
    <div class="tbl-card"><div class="scrollx"><table>
      <thead><tr><th>PLAYER</th><th>GOAL</th><th>TARGET</th><th>STATUS</th><th>PROGRESS</th><th>UPDATED</th><th></th></tr></thead>
      <tbody>
        <tr v-for="g in goals" :key="g.id" :class="{ fresh: isFresh(g.id) }">
          <td class="pname"><RouterLink :to="{ name: 'player', params: { id: g.player_id } }">{{ player(g.player_id)?.name }}</RouterLink></td>
          <td class="small" style="font-weight: 700">{{ g.title }}</td>
          <td class="small"><template v-if="g.target">{{ g.target }}</template><span v-else class="dash">—</span></td>
          <td><span class="pill" :class="goalPill(g.status)">{{ g.status }}</span></td>
          <td class="small muted"><template v-if="g.progress">{{ g.progress }}</template><span v-else class="dash">—</span></td>
          <td class="xsmall muted">{{ fmtShort(g.updated_at) }}</td>
          <td style="text-align: right"><button class="linkbtn noprint" @click="openModal(GoalForm, { goalId: g.id })">Edit</button></td>
        </tr>
      </tbody>
    </table></div></div>
  </div>
</template>
