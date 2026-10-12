<script setup lang="ts">
import { computed, ref } from 'vue';
import StaffForm from '../components/forms/StaffForm.vue';
import { auth } from '../stores/auth';
import { db, getJoinCode, savePlayer, saveSettings, setJoinCode } from '../stores/data';
import { lookupEspn } from '../lib/espn';
import { attempt, openModal, toast } from '../stores/ui';
import { TIERS } from '../lib/types';

const staff = computed(() => [...db.staff].sort((a, b) => a.sort - b.sort));
const joinCode = ref('');
const newCode = ref('');

function setCadence(tier: string, v: string) {
  const n = parseInt(v, 10);
  if (!n || n < 1 || !db.settings) return;
  attempt(() => saveSettings({ cadence: { ...db.settings!.cadence, [tier]: n } }), 'Cadence updated');
}
const syncing = ref(false);
async function syncEspn() {
  syncing.value = true;
  const missed: string[] = [];
  let updated = 0;
  await attempt(async () => {
    for (const p of db.players) {
      const hit = await lookupEspn(p.name);
      if (!hit) { missed.push(p.name); continue; }
      if (hit.espn_id !== p.espn_id || hit.position !== p.position || hit.jersey !== p.jersey) {
        await savePlayer({ id: p.id, ...hit });
        updated++;
      }
    }
  }, undefined);
  syncing.value = false;
  toast(`${updated} player${updated === 1 ? '' : 's'} updated from ESPN${missed.length ? ` · not on the roster: ${missed.join(', ')}` : ''}`);
}

async function reveal() {
  await attempt(async () => { joinCode.value = await getJoinCode(); });
}
async function change() {
  const c = newCode.value.trim();
  if (await attempt(() => setJoinCode(c), 'Join code changed')) {
    joinCode.value = c;
    newCode.value = '';
  }
}
</script>

<template>
  <div class="sec">
    <div class="sec-h"><h2>Program Team</h2><div class="hint">Who owns what</div></div>
    <div class="tbl-card"><div class="scrollx"><table>
      <thead><tr><th>ROLE</th><th>NAME</th><th>RESPONSIBILITY</th><th></th></tr></thead>
      <tbody>
        <tr v-for="s in staff" :key="s.id">
          <td class="small" style="font-weight: 700">{{ s.role }}</td>
          <td class="pname">{{ s.name }}</td>
          <td class="small muted">{{ s.responsibility }}</td>
          <td style="text-align: right"><button class="linkbtn noprint" @click="openModal(StaffForm, { staffId: s.id })">Edit</button></td>
        </tr>
      </tbody>
    </table></div></div>
    <div style="margin-top: 14px" class="noprint"><button class="btn" @click="openModal(StaffForm)">+ Add staff</button></div>
  </div>

  <div class="sec">
    <div class="sec-h"><h2>Contact Cadence Targets</h2><div class="hint">Drives the "Needs Attention" list</div></div>
    <div class="card pad"><div class="frow">
      <div v-for="t in TIERS" :key="t" class="f">
        <label>{{ t.toUpperCase() }}</label>
        <input type="number" min="1" max="365" :value="db.settings?.cadence?.[t] ?? 21" @change="setCadence(t, ($event.target as HTMLInputElement).value)" />
        <div class="help">days between conversations</div>
      </div>
    </div></div>
  </div>

  <div class="sec">
    <div class="sec-h"><h2>App Access</h2><div class="hint">Who can sign in to The Mine</div></div>
    <div class="tbl-card"><div class="scrollx"><table>
      <thead><tr><th>NAME</th><th>STATUS</th><th>ROLE</th></tr></thead>
      <tbody>
        <tr v-for="m in db.members" :key="m.id">
          <td class="pname">{{ m.name }}<span v-if="m.id === auth.member?.id" class="xsmall muted" style="font-weight: 400"> (you)</span></td>
          <td><span class="pill" :class="m.user_id ? 'ok' : 'never'">{{ m.user_id ? 'Joined' : 'Not signed up yet' }}</span></td>
          <td class="small muted">{{ m.is_admin ? 'Admin' : 'Member' }}</td>
        </tr>
      </tbody>
    </table></div></div>

    <div class="card pad" style="margin-top: 14px; display: flex; gap: 14px; align-items: center; flex-wrap: wrap">
      <div style="flex: 1; min-width: 240px">
        <div class="eyebrow" style="margin-bottom: 4px">HEADSHOTS &amp; NUMBERS</div>
        <p class="small muted" style="margin: 0">Pulled from ESPN's 49ers roster. Re-sync after a jersey change or roster move.</p>
      </div>
      <button class="btn" :disabled="syncing" @click="syncEspn">{{ syncing ? 'Syncing…' : 'Sync from ESPN' }}</button>
    </div>

    <div v-if="auth.member?.is_admin" class="card pad" style="margin-top: 14px">
      <div class="fl eyebrow" style="margin-bottom: 8px">JOIN CODE</div>
      <p class="small muted" style="margin: 0 0 12px">New staff create an account, then enter this code to get in. Change it if it gets passed around.</p>
      <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap">
        <span v-if="joinCode" class="codebox">{{ joinCode }}</span>
        <button v-else class="btn" @click="reveal">Show join code</button>
        <input v-model="newCode" placeholder="New code (6+ characters)" style="padding: 8px 11px; border: 1px solid var(--line); border-radius: 5px" />
        <button class="btn" :disabled="newCode.trim().length < 6" @click="change">Change</button>
      </div>
    </div>
  </div>
</template>
