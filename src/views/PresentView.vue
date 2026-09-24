<script setup lang="ts">
// Read-only report — the old Word doc, always current. Updates live as notes come in.
import { computed } from 'vue';
import MeetingCard from '../components/MeetingCard.vue';
import { db, freshKey, isFresh } from '../stores/data';
import {
  awaitingFirst, completedCount, goalsFor, lastContact, meetingSummary, meetingsFor, player, playerOrder, playersIn,
  recentActivity, statusCls, tierCls,
} from '../lib/derive';
import { fmtDate, fmtTime, pad2, todayISO } from '../lib/format';

const aw = computed(awaitingFirst);
const latest = computed(() => recentActivity(1)[0]);
const staff = computed(() => [...db.staff].sort((a, b) => a.sort - b.sort));
const GROUP_TITLES: Record<string, string> = {
  Rookie: 'Conversation Log — Rookies',
  Carryover: 'Conversation Log — 2025 Carryover & Watch List',
};
const lastChange = computed(() => {
  const stamps = [...db.meetings, ...db.notes, ...db.players, ...db.goals].map(r => r.updated_at).sort();
  const s = stamps[stamps.length - 1];
  return s ? new Date(s) : null;
});
</script>

<template>
  <div class="present-bar noprint">
    <span class="live" :class="{ on: db.live === 'live', off: db.live === 'offline' }">
      <span class="dot"></span>{{ db.live === 'live' ? 'Live — new notes appear here as they are saved' : 'Reconnecting…' }}
    </span>
    <span v-if="lastChange" class="xsmall muted">Last change {{ lastChange.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) }}</span>
    <button class="btn primary" style="margin-left: auto" onclick="window.print()">Print / PDF</button>
  </div>

  <div class="rep">
    <div class="rep-hd">
      <div class="org">SAN FRANCISCO 49ERS</div>
      <div class="dept">PLAYER DEVELOPMENT</div>
      <h1>The Mine — {{ db.settings?.season }} Season Tracker</h1>
      <div class="sub">Last updated: {{ fmtDate(todayISO()) }} · Maintained by {{ db.settings?.maintainers }}</div>
    </div>

    <h2>Summary</h2>
    <p>{{ db.settings?.summary }}</p>
    <p>
      {{ playersIn('Rookie').length }} rookies are tracked across Contributing Now, Trending Up, and Foundation Build tiers, plus a
      separate carryover group of {{ playersIn('Carryover').length }} returning/new-watch players. {{ completedCount() }} conversations
      logged to date<template v-if="aw.length">; {{ aw.length }} player{{ aw.length === 1 ? '' : 's' }} still awaiting a first check-in</template>.
    </p>

    <template v-if="latest">
      <h2>Most Recent Activity</h2>
      <p :key="freshKey(latest.id)" :class="{ fresh: isFresh(latest.id) }">
        <strong>{{ player(latest.player_id)?.name }}</strong> · {{ fmtDate(latest.meeting_date) }}
        <template v-if="latest.meeting_time"> {{ fmtTime(latest.meeting_time) }}</template> — {{ meetingSummary(latest.id) }}
        <span v-if="isFresh(latest.id)" class="newtag">NEW</span>
      </p>
    </template>

    <template v-if="aw.length">
      <h2>Awaiting First Check-In ({{ aw.length }})</h2>
      <p class="small">{{ aw.map(p => p.name).join('  ·  ') }}</p>
    </template>

    <h2>Who We're Investing In</h2>
    <div class="scrollx"><table>
      <thead><tr><th>#</th><th>PLAYER</th><th>READINESS</th><th>PRIMARY FOCUS</th><th>NOTES</th><th>LAST CONTACT</th></tr></thead>
      <tbody>
        <template v-for="g in ['Rookie', 'Carryover']" :key="g">
          <tr v-for="p in playersIn(g)" :key="p.id">
            <td class="num">{{ pad2(playerOrder(p)) }}</td>
            <td class="pname">{{ p.name }} <span v-if="p.status !== 'Active'" class="pill" :class="statusCls(p.status)">{{ p.status }}</span></td>
            <td class="small">{{ p.tier }}</td>
            <td class="small"><template v-if="p.focus">{{ p.focus }}</template><span v-else class="dash">—</span></td>
            <td class="small"><template v-if="p.notes">{{ p.notes }}</template><span v-else class="dash">—</span></td>
            <td class="small"><template v-if="lastContact(p.id)">{{ fmtDate(lastContact(p.id)) }}</template><span v-else class="dash">No contact yet</span></td>
          </tr>
        </template>
      </tbody>
    </table></div>

    <template v-for="g in ['Rookie', 'Carryover']" :key="g">
      <h2>{{ GROUP_TITLES[g] }}</h2>
      <div v-for="p in playersIn(g)" :key="p.id" class="psec">
        <div class="phd">
          <span class="nm">{{ p.name }}</span>
          <span class="pill" :class="tierCls(p.tier)" style="border-color: #555">{{ p.tier }}</span>
          <span style="margin-left: auto; font-size: 10px; letter-spacing: 0.11em; color: var(--gold)">
            {{ lastContact(p.id) ? 'LAST CONTACT: ' + fmtDate(lastContact(p.id)).toUpperCase() : 'NO CONTACT LOGGED YET' }}
          </span>
        </div>
        <div class="pbody">
          <div v-if="goalsFor(p.id).length" class="fld">
            <div class="fl">GOALS</div>
            <div v-for="goal in goalsFor(p.id)" :key="goal.id" class="small" style="margin-bottom: 4px">
              <strong>{{ goal.title }}</strong> <span class="muted">({{ goal.category }} · {{ goal.status }})</span>
              <template v-if="goal.target"> — {{ goal.target }}</template>
            </div>
          </div>
          <div v-if="p.talking_points" class="fld">
            <div class="fl">TALKING POINTS FOR NEXT MEETING</div>
            <div class="wrapy small">{{ p.talking_points }}</div>
          </div>
          <MeetingCard v-for="m in meetingsFor(p.id)" :key="freshKey(m.id)" :meeting="m" readonly />
          <div v-if="!meetingsFor(p.id).length && !p.talking_points" class="small dash">Nothing logged yet.</div>
        </div>
      </div>
    </template>

    <h2>Program Team</h2>
    <div class="scrollx"><table>
      <thead><tr><th>ROLE</th><th>NAME</th><th>RESPONSIBILITY</th></tr></thead>
      <tbody>
        <tr v-for="s in staff" :key="s.id">
          <td class="small" style="font-weight: 700">{{ s.role }}</td><td class="pname">{{ s.name }}</td><td class="small muted">{{ s.responsibility }}</td>
        </tr>
      </tbody>
    </table></div>

    <div class="quote">“{{ db.settings?.quote }}”</div>
    <div class="qa">— {{ db.settings?.quote_attrib }}</div>
    <div class="rep-ft">The Mine — San Francisco 49ers Player Development Program · Internal use only</div>
  </div>
</template>
