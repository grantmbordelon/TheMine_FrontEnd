<script setup lang="ts">
import { ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { supabase } from '../lib/supabase';
import { auth, refreshMember, signOut } from '../stores/auth';

const router = useRouter();
const route = useRoute();
const mode = ref<'in' | 'up'>('in');
const email = ref('');
const password = ref('');
const busy = ref(false);
const error = ref('');

// Join step
const code = ref('');
const choice = ref('');
const newName = ref('');
const unclaimed = ref<{ id: string; name: string }[]>([]);

async function loadUnclaimed() {
  const { data } = await supabase.rpc('unclaimed_members');
  unclaimed.value = (data as { id: string; name: string }[] | null) ?? [];
}
watch(
  () => [auth.session?.user.id, auth.member?.id],
  () => {
    if (auth.session && auth.member) router.replace(String(route.query.next || '/'));
    else if (auth.session) loadUnclaimed();
  },
  { immediate: true },
);

async function submit() {
  busy.value = true;
  error.value = '';
  const res =
    mode.value === 'in'
      ? await supabase.auth.signInWithPassword({ email: email.value, password: password.value })
      : await supabase.auth.signUp({ email: email.value, password: password.value });
  busy.value = false;
  if (res.error) {
    error.value = res.error.message;
    return;
  }
  auth.session = res.data.session;
  await refreshMember();
}

async function join() {
  busy.value = true;
  error.value = '';
  const res =
    choice.value === 'new'
      ? await supabase.rpc('join_as_new_member', { p_name: newName.value, p_code: code.value })
      : await supabase.rpc('claim_member', { p_member: choice.value, p_code: code.value });
  if (res.error) {
    busy.value = false;
    error.value = res.error.message;
    return;
  }
  await refreshMember();
  busy.value = false;
}
</script>

<template>
  <div class="auth">
    <div style="text-align: center; margin-bottom: 22px">
      <div class="eyebrow" style="color: var(--red); margin-bottom: 4px">SAN FRANCISCO 49ERS · PLAYER DEVELOPMENT</div>
      <div style="font-family: var(--serif); font-size: 28px">The Mine</div>
    </div>

    <form v-if="!auth.session" class="card" @submit.prevent="submit">
      <h1>{{ mode === 'in' ? 'Sign in' : 'Create your account' }}</h1>
      <p class="small muted" style="margin: 0 0 18px">
        {{ mode === 'in' ? 'Staff access only.' : "You'll need the team join code on the next step." }}
      </p>
      <div v-if="error" class="err">{{ error }}</div>
      <div class="f"><label>EMAIL</label><input v-model="email" type="email" required autocomplete="email" /></div>
      <div class="f">
        <label>PASSWORD</label>
        <input v-model="password" type="password" required minlength="6" :autocomplete="mode === 'in' ? 'current-password' : 'new-password'" />
      </div>
      <button class="btn primary" style="width: 100%" :disabled="busy">{{ busy ? '…' : mode === 'in' ? 'Sign in' : 'Create account' }}</button>
      <p class="small" style="text-align: center; margin: 14px 0 0">
        <button type="button" class="linkbtn" @click="mode = mode === 'in' ? 'up' : 'in'; error = ''">
          {{ mode === 'in' ? 'First time here? Create an account' : 'Already have an account? Sign in' }}
        </button>
      </p>
    </form>

    <form v-else class="card" @submit.prevent="join">
      <h1>Join the team</h1>
      <p class="small muted" style="margin: 0 0 18px">Pick your name so your existing notes stay attached to you, then enter the join code.</p>
      <div v-if="error" class="err">{{ error }}</div>
      <div class="f"><label>WHO ARE YOU?</label></div>
      <div class="choices">
        <button v-for="m in unclaimed" :key="m.id" type="button" class="btn" :class="{ on: choice === m.id }" @click="choice = m.id">{{ m.name }}</button>
        <button type="button" class="btn" :class="{ on: choice === 'new' }" @click="choice = 'new'">Someone else</button>
      </div>
      <div v-if="choice === 'new'" class="f"><label>YOUR NAME</label><input v-model="newName" required /></div>
      <div class="f"><label>JOIN CODE</label><input v-model="code" required autocomplete="off" /></div>
      <button class="btn primary" style="width: 100%" :disabled="busy || !choice || !code || (choice === 'new' && !newName.trim())">
        {{ busy ? '…' : 'Join' }}
      </button>
      <p class="small" style="text-align: center; margin: 14px 0 0">
        <span class="muted">{{ auth.session.user.email }}</span> · <button type="button" class="linkbtn" @click="signOut">Sign out</button>
      </p>
    </form>
  </div>
</template>
