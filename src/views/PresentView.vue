<script setup lang="ts">
// The report: summary bullets + one card per player. Edit in place; prints to PDF as-is.
import { computed, ref } from 'vue';
import InlineText from '../components/InlineText.vue';
import ReportCard from '../components/ReportCard.vue';
import { db, savePlayer, saveSettings } from '../stores/data';
import { attempt, toast } from '../stores/ui';
import { playersIn } from '../lib/derive';
import { fmtDate, todayISO } from '../lib/format';
import { hasNewNotes, pullFromNotes } from '../lib/report';

const GROUPS = [
  ['Rookie', 'Rookies'],
  ['Carryover', '2025 Carryover & Watch List'],
] as const;

const bullets = computed(() => db.settings?.summary_bullets ?? []);
const adding = ref(false);
const shown = (g: string) => playersIn(g).filter(p => !p.report_hidden);
const hidden = computed(() => db.players.filter(p => p.report_hidden));
const stale = computed(() => db.players.filter(p => !p.report_hidden && hasNewNotes(p)));

function saveBullets(list: string[]) {
  return attempt(() => saveSettings({ summary_bullets: list }));
}
function saveBullet(i: number) {
  return (v: string) => {
    const list = [...bullets.value];
    if (v) list[i] = v;
    else list.splice(i, 1);
    return saveBullets(list);
  };
}
function addBullet(v: string) {
  return v ? saveBullets([...bullets.value, v]) : Promise.resolve(true);
}
function afterAdd(v: string) {
  adding.value = false;
  if (v) setTimeout(() => (adding.value = true)); // Enter → straight into the next bullet
}
function removeBullet(i: number) {
  const list = [...bullets.value];
  list.splice(i, 1);
  saveBullets(list);
}

async function updateAll() {
  const list = stale.value;
  if (!list.length) return;
  const names = list.map(p => p.name).join(', ');
  if (!confirm(`Pull the latest meeting notes into ${list.length} card${list.length === 1 ? '' : 's'}?\n\n${names}\n\nTheir Recent and Up next text will be replaced. Cards without new meetings are left alone.`)) return;
  const ok = await attempt(() => Promise.all(list.map(p => savePlayer({ id: p.id, ...pullFromNotes(p) }))));
  if (ok) toast(`Updated ${list.length} card${list.length === 1 ? '' : 's'} from meeting notes`);
}
function unhide(id: string) {
  attempt(() => savePlayer({ id, report_hidden: false }));
}
</script>

<template>
  <div class="present-bar noprint">
    <span class="live" :class="{ on: db.live === 'live', off: db.live === 'offline' }">
      <span class="dot"></span>{{ db.live === 'live' ? 'Live' : 'Reconnecting…' }}
    </span>
    <span class="xsmall muted">Click any text to edit. Changes save for everyone.</span>
    <button class="btn" style="margin-left: auto" :class="{ primary: stale.length }" :disabled="!stale.length" @click="updateAll">
      {{ stale.length ? `Update with new meetings (${stale.length})` : 'All cards up to date' }}
    </button>
    <button class="btn" onclick="window.print()">Print / PDF</button>
  </div>

  <div class="rpt">
    <header class="rpt-hd">
      <div>
        <div class="org">SAN FRANCISCO 49ERS · PLAYER DEVELOPMENT</div>
        <h1>The Mine <span class="gold">·</span> {{ db.settings?.season }} Player Report</h1>
      </div>
      <div class="meta">As of {{ fmtDate(todayISO()) }}<br />{{ db.settings?.maintainers }}</div>
    </header>

    <section class="rpt-sum">
      <h2>SUMMARY</h2>
      <ul>
        <li v-for="(b, i) in bullets" :key="`${i}:${b}`">
          <InlineText :value="b" :save="saveBullet(i)" enter-commits />
          <button class="rpt-x noprint" title="Remove bullet" @click="removeBullet(i)">×</button>
        </li>
        <li v-if="adding"><InlineText value="" :save="addBullet" enter-commits start-editing @committed="afterAdd" /></li>
      </ul>
      <div class="rpt-add noprint">
        <button class="linkbtn" @click="adding = true">+ Add bullet</button>
        <span v-if="bullets.length > 5" class="xsmall" style="color: var(--gold-dk)">{{ bullets.length }} bullets — aim for 4–5</span>
      </div>
    </section>

    <template v-for="[g, title] in GROUPS" :key="g">
      <template v-if="shown(g).length">
        <h2 class="rpt-grp">{{ title.toUpperCase() }} <span>{{ shown(g).length }}</span></h2>
        <ReportCard v-for="p in shown(g)" :key="p.id" :player="p" />
      </template>
    </template>

    <div v-if="hidden.length" class="rpt-hidden noprint">
      <strong>Hidden from the report:</strong>
      <span v-for="p in hidden" :key="p.id">{{ p.name }} <button class="linkbtn" @click="unhide(p.id)">show</button></span>
    </div>
  </div>
</template>
