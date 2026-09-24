<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import PlayerForm from '../components/forms/PlayerForm.vue';
import { db, isFresh } from '../stores/data';
import { openModal } from '../stores/ui';
import { contactState, goalsFor, meetingsFor, needsAttention, playerOrder, statusCls, tierCls } from '../lib/derive';
import { pad2 } from '../lib/format';
import { GROUPS, TIERS, type Player } from '../lib/types';

const router = useRouter();
const filters = reactive({ q: '', group: '', tier: '', attention: false });
const sortKey = ref<'order' | 'name' | 'tier' | 'contact' | 'goals' | 'mtgs'>('order');
const sortDir = ref(1);

const sortVal: Record<string, (p: Player) => number | string> = {
  order: p => (p.player_group === 'Rookie' ? 0 : 1000) + p.sort,
  name: p => p.name.toLowerCase(),
  tier: p => TIERS.indexOf(p.tier),
  contact: p => contactState(p).sort,
  goals: p => goalsFor(p.id).length,
  mtgs: p => meetingsFor(p.id, true).length,
};

const rows = computed(() => {
  const q = filters.q.toLowerCase();
  return db.players
    .filter(p => !q || `${p.name} ${p.focus} ${p.notes} ${p.talking_points}`.toLowerCase().includes(q))
    .filter(p => !filters.group || p.player_group === filters.group)
    .filter(p => !filters.tier || p.tier === filters.tier)
    .filter(p => !filters.attention || needsAttention(p))
    .sort((a, b) => {
      const f = sortVal[sortKey.value];
      const av = f(a), bv = f(b);
      return av < bv ? -sortDir.value : av > bv ? sortDir.value : 0;
    });
});

function sortBy(k: typeof sortKey.value) {
  if (sortKey.value === k) sortDir.value = -sortDir.value;
  else { sortKey.value = k; sortDir.value = 1; }
}
const arrow = (k: string) => (sortKey.value === k ? (sortDir.value > 0 ? '▲' : '▼') : '');
const goalsLabel = (id: string) => {
  const gs = goalsFor(id);
  return gs.length ? `${gs.filter(g => g.status === 'Achieved').length}/${gs.length}` : '';
};
</script>

<template>
  <div class="sec-h">
    <h2>Who We're Investing In</h2>
    <div class="hint">{{ rows.length }} of {{ db.players.length }} shown · click a row for the full record</div>
  </div>
  <div class="filters noprint">
    <input v-model="filters.q" type="search" placeholder="Search name, focus, notes…" />
    <select v-model="filters.group"><option value="">All groups</option><option v-for="g in GROUPS" :key="g">{{ g }}</option></select>
    <select v-model="filters.tier"><option value="">All tiers</option><option v-for="t in TIERS" :key="t">{{ t }}</option></select>
    <label class="chk"><input v-model="filters.attention" type="checkbox" /> Needs attention only</label>
    <button class="btn" style="margin-left: auto" @click="openModal(PlayerForm)">+ Add player</button>
  </div>
  <div class="tbl-card"><div class="scrollx"><table>
    <thead><tr>
      <th class="sortable" @click="sortBy('order')"># <span class="arw">{{ arrow('order') }}</span></th>
      <th class="sortable" @click="sortBy('name')">PLAYER <span class="arw">{{ arrow('name') }}</span></th>
      <th>GROUP</th>
      <th class="sortable" @click="sortBy('tier')">READINESS <span class="arw">{{ arrow('tier') }}</span></th>
      <th>STATUS</th><th>PRIMARY FOCUS</th>
      <th class="sortable" @click="sortBy('goals')">GOALS <span class="arw">{{ arrow('goals') }}</span></th>
      <th class="sortable" @click="sortBy('mtgs')">MTGS <span class="arw">{{ arrow('mtgs') }}</span></th>
      <th class="sortable" @click="sortBy('contact')">LAST CONTACT <span class="arw">{{ arrow('contact') }}</span></th>
    </tr></thead>
    <tbody>
      <tr v-if="!rows.length"><td colspan="9" class="empty">No players match those filters.</td></tr>
      <tr v-for="p in rows" :key="p.id" class="clk" :class="{ fresh: isFresh(p.id) }" @click="router.push({ name: 'player', params: { id: p.id } })">
        <td class="num">{{ pad2(playerOrder(p)) }}</td>
        <td class="pname">{{ p.name }}<div v-if="p.notes" class="xsmall muted clamp" style="font-weight: 400">{{ p.notes }}</div></td>
        <td class="xsmall muted">{{ p.player_group }}</td>
        <td><span class="pill" :class="tierCls(p.tier)">{{ p.tier }}</span></td>
        <td><span class="pill" :class="statusCls(p.status)">{{ p.status }}</span></td>
        <td class="small"><template v-if="p.focus">{{ p.focus }}</template><span v-else class="dash">—</span></td>
        <td class="small"><template v-if="goalsLabel(p.id)">{{ goalsLabel(p.id) }}</template><span v-else class="dash">—</span></td>
        <td class="small"><template v-if="meetingsFor(p.id, true).length">{{ meetingsFor(p.id, true).length }}</template><span v-else class="dash">—</span></td>
        <td><span class="pill" :class="contactState(p).cls">{{ contactState(p).label }}</span></td>
      </tr>
    </tbody>
  </table></div></div>
</template>
