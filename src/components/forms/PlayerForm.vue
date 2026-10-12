<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { auth } from '../../stores/auth';
import { db, deletePlayer, savePlayer } from '../../stores/data';
import { attempt } from '../../stores/ui';
import { goalsFor, meetingsFor } from '../../lib/derive';
import { lookupEspn } from '../../lib/espn';
import { GROUPS, STATUSES, TIERS, type Group, type PlayerStatus, type Tier } from '../../lib/types';
import Modal from '../Modal.vue';

const props = defineProps<{ playerId?: string }>();
const emit = defineEmits<{ close: [] }>();
const router = useRouter();
const p = props.playerId ? db.players.find(x => x.id === props.playerId) : undefined;
const f = reactive({
  name: p?.name ?? '',
  player_group: (p?.player_group ?? 'Rookie') as Group,
  tier: (p?.tier ?? 'Contributing Now') as Tier,
  status: (p?.status ?? 'Active') as PlayerStatus,
  focus: p?.focus ?? '',
  notes: p?.notes ?? '',
  owner: p?.owner ?? '',
  position: p?.position ?? '',
  jersey: p?.jersey ?? '',
  headshot_url: p?.headshot_url ?? '',
});
const busy = ref(false);

async function save() {
  if (!f.name.trim()) return;
  busy.value = true;
  const sort = p ? p.sort : Math.max(0, ...db.players.map(x => x.sort)) + 1;
  // New player or renamed: find them on ESPN's 49ers roster for photo, position and number.
  let espn = {};
  if (!p || p.name !== f.name.trim() || !p.espn_id) {
    const hit = await lookupEspn(f.name).catch(() => null);
    if (hit) espn = { espn_id: hit.espn_id, position: f.position || hit.position, jersey: f.jersey || hit.jersey };
  }
  const ok = await attempt(() => savePlayer(p ? { id: p.id, ...f, ...espn } : { ...f, ...espn, sort }), 'Saved');
  busy.value = false;
  if (ok) emit('close');
}
async function remove() {
  if (!p) return;
  const n = meetingsFor(p.id).length + goalsFor(p.id).length;
  if (n && !confirm(`${p.name} has ${n} meetings/goals. Delete the player and all of it?`)) return;
  if (await attempt(() => deletePlayer(p.id), 'Player removed')) {
    emit('close');
    router.push({ name: 'roster' });
  }
}
</script>

<template>
  <Modal :title="p ? `Edit ${p.name}` : 'Add player'" :busy="busy" :can-delete="!!p && auth.member?.is_admin" @close="emit('close')" @save="save" @delete="remove">
    <div class="f"><label>NAME <span class="req">*</span></label><input v-model="f.name" required /></div>
    <div class="frow3">
      <div class="f"><label>GROUP</label><select v-model="f.player_group"><option v-for="g in GROUPS" :key="g">{{ g }}</option></select></div>
      <div class="f"><label>READINESS TIER</label><select v-model="f.tier"><option v-for="t in TIERS" :key="t">{{ t }}</option></select></div>
      <div class="f"><label>STATUS</label><select v-model="f.status"><option v-for="s in STATUSES" :key="s">{{ s }}</option></select></div>
    </div>
    <div class="frow3">
      <div class="f"><label>POSITION</label><input v-model="f.position" placeholder="WR" /></div>
      <div class="f"><label>NUMBER</label><input v-model="f.jersey" placeholder="7" /></div>
      <div class="f"><label>PHOTO URL</label><input v-model="f.headshot_url" placeholder="Optional override" /></div>
    </div>
    <p class="help" style="margin: -8px 0 14px; font-size: 11.5px; color: var(--faint)">Photo, position and number fill in from ESPN's 49ers roster when you save. Use Photo URL only to override the headshot.</p>
    <div class="f"><label>PRIMARY FOCUS</label><input v-model="f.focus" /></div>
    <div class="f"><label>NOTES</label><textarea v-model="f.notes" rows="3"></textarea></div>
    <div class="f"><label>STAFF ON THIS PLAYER</label><input v-model="f.owner" /></div>
  </Modal>
</template>
