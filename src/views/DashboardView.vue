<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import PlayerAvatar from '../components/PlayerAvatar.vue';
import RichText from '../components/RichText.vue';
import StatTile from '../components/StatTile.vue';
import MeetingForm from '../components/forms/MeetingForm.vue';
import { db, isFresh, saveNote } from '../stores/data';
import { attempt, openModal } from '../stores/ui';
import {
  awaitingFirst, cadenceFor, completedCount, contactState, meetingSummary, memberName, notesFor, openNextSteps,
  player, recentActivity, sortedPlayers, tierCls, tierCount,
} from '../lib/derive';
import { fmtShort, todayISO } from '../lib/format';

const router = useRouter();
const open = (id: string) => router.push({ name: 'player', params: { id } });

const aw = computed(awaitingFirst);
const over = computed(() => db.players.filter(p => contactState(p).key === 'over'));
const steps = computed(openNextSteps);
const recent = computed(() => recentActivity(6));
const activeGoals = computed(() => db.goals.filter(g => g.status !== 'Achieved').length);
const rookies = computed(() => db.players.filter(p => p.player_group === 'Rookie').length);
const attention = computed(() =>
  sortedPlayers()
    .map(p => ({ p, s: contactState(p) }))
    .filter(x => x.s.key === 'over' || x.s.key === 'never')
    .sort((a, b) => b.s.sort - a.s.sort),
);
const authors = (meetingId: string) => notesFor(meetingId).map(n => memberName(n.author_id)).join(' & ');

function close(noteId: string) {
  attempt(() => saveNote({ id: noteId, next_done: true }), 'Next step closed out');
}
</script>

<template>
  <div class="sec">
    <div class="eyebrow">{{ db.settings?.season }} SEASON · AT A GLANCE</div>
    <div class="tiles">
      <StatTile :n="tierCount('Contributing Now')" label="CONTRIBUTING NOW" tone="dark" />
      <StatTile :n="tierCount('Trending Up')" label="TRENDING UP" tone="warm" />
      <StatTile :n="tierCount('Foundation Build')" label="FOUNDATION BUILD" />
      <StatTile :n="rookies" label="ROOKIES IN PROGRAM" />
      <StatTile :n="aw.length" label="AWAITING FIRST CHECK-IN" :tone="aw.length ? 'alert' : ''" />
      <StatTile :n="over.length" label="PAST CONTACT TARGET" :tone="over.length ? 'alert' : ''" />
      <StatTile :n="activeGoals" label="ACTIVE GOALS" />
      <StatTile :n="steps.length" label="OPEN NEXT STEPS" :tone="steps.length ? 'warm' : ''" />
    </div>
  </div>

  <div class="sec">
    <div class="sec-h"><h2>Summary</h2></div>
    <div class="card pad">
      <RichText v-if="db.settings?.core_message" :text="db.settings.core_message" tag="p"
        style="margin: 0 0 10px; font-family: var(--serif); font-size: 16px; line-height: 1.4; border-left: 3px solid var(--red); padding-left: 12px" />
      <ul v-if="db.settings?.summary_bullets?.length" style="margin: 0; padding-left: 18px">
        <li v-for="(b, i) in db.settings.summary_bullets" :key="i" style="margin-bottom: 4px"><RichText :text="b" /></li>
      </ul>
      <p v-else style="margin: 0">{{ db.settings?.summary }}</p>
      <p style="margin: 12px 0 0" class="small muted">
        {{ db.players.length }} players tracked · {{ completedCount() }} conversations logged · {{ aw.length }} awaiting a first check-in.
        <RouterLink to="/present" class="linkbtn">Edit on Present</RouterLink>
      </p>
    </div>
  </div>

  <div class="sec">
    <div class="sec-h"><h2>Most Recent Activity</h2><div class="hint">Newest first · click to open the player</div></div>
    <div class="tbl-card">
      <div class="feed">
        <div v-if="!recent.length" class="empty">No conversations logged yet.</div>
        <div v-for="m in recent" :key="m.id" class="feed-i" :class="{ fresh: isFresh(m.id) }" @click="open(m.player_id)">
          <div class="feed-d">{{ fmtShort(m.meeting_date) }}</div>
          <PlayerAvatar :player="player(m.player_id)" :size="44" />
          <div class="feed-b">
            <div class="t">
              {{ player(m.player_id)?.name }}
              <span class="pill" :class="tierCls(player(m.player_id)?.tier || '')">{{ player(m.player_id)?.tier }}</span>
              <span class="xsmall muted" style="font-weight: 400; margin-left: 6px">{{ authors(m.id) }}</span>
              <span v-if="isFresh(m.id)" class="newtag">NEW</span>
            </div>
            <div class="small muted clamp">{{ meetingSummary(m.id) }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div class="sec">
    <div class="sec-h"><h2>Needs Attention</h2><div class="hint">Past the contact target for their tier, or never contacted</div></div>
    <div class="tbl-card"><div class="scrollx"><table>
      <thead><tr><th>PLAYER</th><th>TIER</th><th>TARGET CADENCE</th><th>LAST CONTACT</th><th>PRIMARY FOCUS</th><th></th></tr></thead>
      <tbody>
        <tr v-if="!attention.length"><td colspan="6" class="empty">Everyone is inside their contact target. Good.</td></tr>
        <tr v-for="x in attention" :key="x.p.id" class="clk" @click="open(x.p.id)">
          <td class="pname"><div class="pcell"><PlayerAvatar :player="x.p" :size="34" />{{ x.p.name }}</div></td>
          <td><span class="pill" :class="tierCls(x.p.tier)">{{ x.p.tier }}</span></td>
          <td class="small muted">every {{ cadenceFor(x.p) }} days</td>
          <td><span class="pill" :class="x.s.cls">{{ x.s.label }}</span></td>
          <td class="small"><template v-if="x.p.focus">{{ x.p.focus }}</template><span v-else class="dash">—</span></td>
          <td style="text-align: right"><button class="linkbtn" @click.stop="openModal(MeetingForm, { playerId: x.p.id })">Log</button></td>
        </tr>
      </tbody>
    </table></div></div>
  </div>

  <div class="sec">
    <div class="sec-h"><h2>Open Next Steps</h2><div class="hint">Commitments from logged conversations · tick to close out</div></div>
    <div class="tbl-card"><div class="scrollx"><table>
      <thead><tr><th style="width: 34px"></th><th>PLAYER</th><th>NEXT STEP</th><th>OWNER</th><th>DUE</th><th>FROM</th></tr></thead>
      <tbody>
        <tr v-if="!steps.length"><td colspan="6" class="empty">Nothing outstanding.</td></tr>
        <tr v-for="{ note, meeting } in steps" :key="note.id" :class="{ fresh: isFresh(note.id) }">
          <td><input type="checkbox" title="Mark done" @change="close(note.id)" /></td>
          <td class="pname"><div class="pcell"><PlayerAvatar :player="player(meeting.player_id)" :size="32" /><a href="#" @click.prevent="open(meeting.player_id)">{{ player(meeting.player_id)?.name }}</a></div></td>
          <td class="small wrapy">{{ note.next_steps }}</td>
          <td class="small muted"><template v-if="note.next_owner">{{ note.next_owner }}</template><span v-else class="dash">—</span></td>
          <td class="small">
            <span v-if="note.next_due" class="pill" :class="note.next_due < todayISO() ? 'due' : 'ok'">{{ fmtShort(note.next_due) }}</span>
            <span v-else class="dash">—</span>
          </td>
          <td class="small muted">{{ fmtShort(meeting.meeting_date) }} · {{ memberName(note.author_id) }}</td>
        </tr>
      </tbody>
    </table></div></div>
  </div>

  <div v-if="aw.length" class="sec">
    <div class="sec-h"><h2>Awaiting First Check-In</h2><div class="hint">{{ aw.length }} player{{ aw.length === 1 ? '' : 's' }}</div></div>
    <div class="card pad">
      <div style="display: flex; flex-wrap: wrap; gap: 8px">
        <button v-for="p in aw" :key="p.id" class="btn pcell" style="padding: 5px 12px 5px 6px; font-size: 12.5px; gap: 7px" @click="openModal(MeetingForm, { playerId: p.id })">
          <PlayerAvatar :player="p" :size="28" />{{ p.name }} <span class="muted" style="font-weight: 400">+ log</span>
        </button>
      </div>
    </div>
  </div>
</template>
