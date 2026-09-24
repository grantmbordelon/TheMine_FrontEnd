<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { auth, signOut } from './stores/auth';
import { clearData, db, loadAll, startLive, stopLive } from './stores/data';
import { closeModal, openModal, toast, ui } from './stores/ui';
import { completedCount } from './lib/derive';
import { supabaseConfigured } from './lib/supabase';
import MeetingForm from './components/forms/MeetingForm.vue';

const route = useRoute();
const router = useRouter();
const loadError = ref('');

const TABS = [
  ['dashboard', 'DASHBOARD', '/'],
  ['roster', 'ROSTER', '/roster'],
  ['log', 'MEETING LOG', '/log'],
  ['goals', 'GOALS', '/goals'],
  ['team', 'PROGRAM TEAM', '/team'],
  ['present', 'PRESENT', '/present'],
] as const;

const inApp = computed(() => Boolean(auth.session && auth.member));
const activeTab = computed(() => (route.name === 'player' ? 'roster' : String(route.name)));

// Load everything and go live once someone is signed in as a member.
watch(
  () => auth.member?.id,
  async id => {
    if (!id) {
      stopLive();
      clearData();
      if (route.name && route.name !== 'login') router.replace({ name: 'login' });
      return;
    }
    loadError.value = '';
    try {
      await loadAll();
      startLive();
    } catch (e) {
      loadError.value = e instanceof Error ? e.message : String(e);
    }
  },
  { immediate: true },
);

// Tabs left in the background can drop their socket; catch up on return.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && inApp.value && db.live !== 'live') {
    loadAll().catch(() => {});
    startLive();
  }
});

async function logout() {
  await signOut();
  toast('Signed out');
}
</script>

<template>
  <div v-if="!supabaseConfigured" class="auth">
    <div class="card"><h1>Not configured</h1><p class="muted">Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in .env.</p></div>
  </div>

  <template v-else-if="inApp">
    <div class="topbar noprint">
      <div class="topbar-in">
        <div class="brand">
          <div class="org">SAN FRANCISCO 49ERS · PLAYER DEVELOPMENT</div>
          <div class="ttl">The Mine <span style="color: var(--gold)">·</span> {{ db.settings?.season || '2026' }} Season Tracker</div>
          <div class="sub">{{ db.players.length }} players · {{ completedCount() }} conversations logged</div>
        </div>
        <span class="live" :class="{ on: db.live === 'live', off: db.live === 'offline' }"
          :title="db.live === 'live' ? 'Changes from others appear instantly' : 'Reconnecting…'">
          <span class="dot"></span>{{ db.live === 'live' ? 'Live' : db.live === 'connecting' ? 'Connecting' : 'Offline' }}
        </span>
        <span class="who hide-sm">{{ auth.member?.name }}<button @click="logout">Sign out</button></span>
        <button class="tbtn primary" @click="openModal(MeetingForm)">+ Log a meeting</button>
      </div>
    </div>
    <div class="nav noprint">
      <div class="nav-in">
        <RouterLink v-for="t in TABS" :key="t[0]" :to="t[2]" custom v-slot="{ navigate }">
          <button :class="{ on: activeTab === t[0] }" @click="navigate">{{ t[1] }}</button>
        </RouterLink>
      </div>
    </div>
    <div class="wrap">
      <div v-if="loadError" class="banner">Couldn't load data: {{ loadError }}</div>
      <div v-else-if="!db.loaded" class="loading">Loading…</div>
      <RouterView v-else />
    </div>
  </template>

  <RouterView v-else />

  <component :is="ui.modal.component" v-if="ui.modal" v-bind="ui.modal.props" @close="closeModal" />

  <div class="toasts">
    <TransitionGroup name="toast">
      <div v-for="t in ui.toasts" :key="t.id" class="toast" :class="{ err: t.err }">{{ t.msg }}</div>
    </TransitionGroup>
  </div>
</template>
