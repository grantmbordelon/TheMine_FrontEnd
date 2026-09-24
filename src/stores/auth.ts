import { reactive } from 'vue';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Member } from '../lib/types';

export const auth = reactive({
  ready: false,
  session: null as Session | null,
  member: null as Member | null,
});

export async function refreshMember() {
  const uid = auth.session?.user.id;
  if (!uid) {
    auth.member = null;
    return;
  }
  // RLS only lets members read members, so a non-member gets no row back.
  const { data } = await supabase.from('members').select('*').eq('user_id', uid).maybeSingle();
  auth.member = (data as Member | null) ?? null;
}

export async function initAuth() {
  const { data } = await supabase.auth.getSession();
  auth.session = data.session;
  await refreshMember();
  auth.ready = true;
  supabase.auth.onAuthStateChange((_event, session) => {
    const userChanged = session?.user.id !== auth.session?.user.id;
    auth.session = session;
    // Supabase warns against awaiting its own calls inside this callback.
    if (userChanged) setTimeout(refreshMember, 0);
  });
}

export async function signOut() {
  await supabase.auth.signOut();
  auth.session = null;
  auth.member = null;
}
