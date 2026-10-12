<script setup lang="ts">
import { computed } from 'vue';
import MeetingCard from '../components/MeetingCard.vue';
import PlayerAvatar from '../components/PlayerAvatar.vue';
import GoalForm from '../components/forms/GoalForm.vue';
import MeetingForm from '../components/forms/MeetingForm.vue';
import PlayerForm from '../components/forms/PlayerForm.vue';
import TalkingPointsForm from '../components/forms/TalkingPointsForm.vue';
import { freshKey, isFresh } from '../stores/data';
import { openModal } from '../stores/ui';
import {
  cadenceFor, contactState, goalCls, goalPill, goalsFor, lastContact, meetingsFor, player, positionLabel, statusCls, tierCls,
} from '../lib/derive';
import { fmtDate, fmtShort } from '../lib/format';

const props = defineProps<{ id: string }>();
const p = computed(() => player(props.id));
const meetings = computed(() => meetingsFor(props.id));
const goals = computed(() => goalsFor(props.id));
</script>

<template>
  <div v-if="!p" class="empty">Player not found. <RouterLink to="/roster">Back to roster</RouterLink></div>
  <template v-else>
    <RouterLink to="/roster" class="linkbtn noprint" style="display: inline-block; margin-bottom: 14px">← Back to roster</RouterLink>

    <div class="card" style="overflow: hidden; margin-bottom: 22px">
      <div class="pd-head">
        <PlayerAvatar :player="p" :size="96" eager />
        <div>
          <h2>{{ p.name }}</h2>
          <div class="meta">
            <span class="pill" :class="tierCls(p.tier)">{{ p.tier }}</span>
            <span class="pill" :class="statusCls(p.status)">{{ p.status }}</span>
            <span class="xsmall" style="color: #b5af9f"><template v-if="positionLabel(p)">{{ positionLabel(p) }} · </template>{{ p.player_group }} · target contact every {{ cadenceFor(p) }} days</span>
          </div>
        </div>
        <div class="acts noprint">
          <button class="tbtn" @click="openModal(PlayerForm, { playerId: p.id })">Edit profile</button>
          <button class="tbtn primary" @click="openModal(MeetingForm, { playerId: p.id })">+ Log a meeting</button>
        </div>
      </div>
      <div class="pad">
        <dl class="kv">
          <dt>LAST CONTACT</dt>
          <dd><span class="pill" :class="contactState(p).cls">{{ contactState(p).label }}</span> <span class="small muted">{{ lastContact(p.id) ? fmtDate(lastContact(p.id)) : '' }}</span></dd>
          <dt>CONVERSATIONS</dt><dd>{{ meetingsFor(p.id, true).length }}</dd>
          <dt>PRIMARY FOCUS</dt><dd><template v-if="p.focus">{{ p.focus }}</template><span v-else class="dash">—</span></dd>
          <dt>NOTES</dt><dd class="wrapy"><template v-if="p.notes">{{ p.notes }}</template><span v-else class="dash">—</span></dd>
          <template v-if="p.owner"><dt>STAFF</dt><dd class="small">{{ p.owner }}</dd></template>
        </dl>
      </div>
    </div>

    <div class="cols">
      <div>
        <div class="blk">
          <div class="blk-h"><h3>TALKING POINTS FOR NEXT MEETING</h3></div>
          <div class="tp">
            <div class="fl">PREP <button class="linkbtn noprint" @click="openModal(TalkingPointsForm, { playerId: p.id })">Edit</button></div>
            <div v-if="p.talking_points" class="wrapy small">{{ p.talking_points }}</div>
            <div v-else class="small" style="color: var(--gold-dk)">Nothing drafted yet. These pre-fill the goal field when the next meeting is logged.</div>
          </div>
        </div>

        <div class="blk">
          <div class="blk-h"><h3>GOALS &amp; PROGRESS</h3><button class="add noprint" @click="openModal(GoalForm, { playerId: p.id })">+ Add goal</button></div>
          <div v-if="!goals.length" class="card empty">No goals set yet.</div>
          <div v-for="g in goals" :key="freshKey(g.id)" class="goal" :class="[goalCls(g.status), { fresh: isFresh(g.id) }]">
            <div class="goal-t"><div class="ti">{{ g.title }}</div><span class="pill" :class="goalPill(g.status)">{{ g.status }}</span></div>
            <div class="cat">{{ g.category }}</div>
            <div v-if="g.target" class="small" style="margin-top: 6px">{{ g.target }}</div>
            <div v-if="g.progress" class="small muted wrapy" style="margin-top: 6px"><strong>Progress:</strong> {{ g.progress }}</div>
            <div class="rowacts noprint">
              <button class="linkbtn" @click="openModal(GoalForm, { goalId: g.id })">Edit</button>
              <span class="xsmall muted" style="margin-left: auto">updated {{ fmtShort(g.updated_at) }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="blk">
        <div class="blk-h"><h3>CONVERSATION LOG</h3><button class="add noprint" @click="openModal(MeetingForm, { playerId: p.id })">+ Log a meeting</button></div>
        <div v-if="!meetings.length" class="card empty">No conversations logged yet.</div>
        <MeetingCard v-for="m in meetings" :key="freshKey(m.id)" :meeting="m" />
      </div>
    </div>
  </template>
</template>
