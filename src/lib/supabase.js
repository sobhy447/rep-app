import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ouielvsbmdjnsllvlnys.supabase.co';
const SUPABASE_KEY = 'sb_publishable_2rxwELUPahB-g4fYr6D5FA_U9W-TwuT';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ─── Auth helpers ────────────────────────────────────────────
export const signIn = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return { data, error };
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};

export const getSession = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
};

// ─── Generic DB helpers ──────────────────────────────────────
export const db = {
  select: (table, query = '*') => supabase.from(table).select(query),
  insert: (table, data) => supabase.from(table).insert(data).select(),
  update: (table, id, data) => supabase.from(table).update(data).eq('id', id).select(),
  delete: (table, id) => supabase.from(table).update({ deleted_at: new Date().toISOString() }).eq('id', id),
  hardDelete: (table, id) => supabase.from(table).delete().eq('id', id),
};
