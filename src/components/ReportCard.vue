<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import InlineText from './InlineText.vue';
import PlayerAvatar from './PlayerAvatar.vue';
import GoalForm from './forms/GoalForm.vue';
import { isFresh, savePlayer } from '../stores/data';
import { attempt, openModal } from '../stores/ui';
import { lastContact, positionLabel } from '../lib/derive';
import { fmtDate, fmtShort } from '../lib/format';
import { TARGET, hasNewNotes, pullFromNotes, reportGoals } from '../lib/report';
import type { Player } from '../lib/types';

const props = defineProps<{ player: Player }>();
const p = computed(() => props.player);
const goals = computed(() => reportGoals(p.value));
const stale = computed(() => hasNewNotes(p.value));
const meta = computed(() =>
  [positionLabel(p.value), p.value.tier, p.value.status !== 'Active' ? p.value.status : ''].filter(Boolean).join(' · '));

function saveField(field: 'report_recent' | 'report_upcoming') {
  return (v: string) => {
    // First touch on a card that was never pulled: fill the rest from the notes so
    // nothing is left silently blank, then apply this edit on top.
    const base = p.value.report_synced_at ? {} : pullFromNotes(p.value);
    return attempt(() => savePlayer({ id: p.value.id, ...base, [field]: v }));
  };
}

function refresh() {
  const hasText = p.value.report_recent || p.value.report_upcoming;
  if (hasText && !confirm(`Replace ${p.value.name}'s Recent and Up next with the latest meeting notes?`)) return;
  attempt(() => savePlayer({ id: p.value.id, ...pullFromNotes(p.value) }), 'Card updated from notes');
}
function hide() {
  attempt(() => savePlayer({ id: p.value.id, report_hidden: true }), `${p.value.name} hidden from the report`);
}
const dot = (s: string) => ({ Achieved: 'g-done', 'On track': 'g-ok', 'At risk': 'g-risk' } as Record<string, string>)[s] || 'g-prog';
</script>

<template>
  <article class="pc" :class="{ fresh: isFresh(p.id) }" :data-id="p.id">
    <button class="pc-grip noprint" type="button" title="Drag to reorder" aria-label="Drag to reorder">⠿</button>
    <PlayerAvatar :player="p" :size="70" eager />
    <div class="pc-main">
      <header class="pc-h">
        <span class="pc-name">{{ p.name }}</span>
        <span class="pc-meta">{{ meta }}</span>
        <span class="pc-lc">{{ lastContact(p.id) ? `Last contact ${fmtDate(lastContact(p.id))}` : 'No contact yet' }}</span>
      </header>
      <div class="pc-cols">
        <section>
          <h4>GOALS <button class="pc-add noprint" title="Add goal" @click="openModal(GoalForm, { playerId: p.id })">+</button></h4>
          <ul v-if="goals.current.length" class="pc-goals">
            <li v-for="g in goals.current" :key="g.id" :class="dot(g.status)" @click="openModal(GoalForm, { goalId: g.id })">
              <span class="t">{{ g.title }}</span> <span class="s">{{ g.status }}</span>
            </li>
          </ul>
          <div v-else class="it-view is-empty" @click="openModal(GoalForm, { playerId: p.id })"><span class="ph">No goals set</span></div>
        </section>
        <section>
          <h4>RECENT <span v-if="p.report_as_of" class="asof">· {{ fmtShort(p.report_as_of) }}</span></h4>
          <InlineText :value="p.report_recent" :save="saveField('report_recent')" :target="TARGET.recent" placeholder="What came out of recent meetings…" />
        </section>
        <section>
          <h4>UP NEXT</h4>
          <InlineText :value="p.report_upcoming" :save="saveField('report_upcoming')" :target="TARGET.upcoming" placeholder="Plan for the next meeting…" />
          <div v-if="goals.next.length" class="pc-next">
            <strong>Next goals:</strong>
            <template v-for="(g, i) in goals.next" :key="g.id">{{ i ? ' · ' : ' ' }}<a href="#" @click.prevent="openModal(GoalForm, { goalId: g.id })">{{ g.title }}</a></template>
          </div>
        </section>
      </div>
      <footer class="pc-acts noprint">
        <span v-if="stale" class="pc-stale">New meeting notes since {{ p.report_synced_at ? 'this card was updated' : 'the report started' }}</span>
        <button class="linkbtn" :class="{ hot: stale }" @click="refresh">Update from notes</button>
        <RouterLink class="linkbtn" :to="{ name: 'player', params: { id: p.id } }">Open player</RouterLink>
        <button class="linkbtn" @click="hide">Hide from report</button>
      </footer>
    </div>
  </article>
</template>
