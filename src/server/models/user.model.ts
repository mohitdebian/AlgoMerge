import { supabase } from '../utils/supabase.js';

export interface DbUser {
  github_id: string;
  username: string;
  avatar_url: string;
  watchlist: string[];
}

/**
 * Upsert a user row on login. If the user already exists the username /
 * avatar are updated but watchlist is preserved.
 */
export const upsertUser = async (
  githubId: string,
  username: string,
  avatarUrl: string
): Promise<DbUser> => {
  const { data, error } = await supabase
    .from('users')
    .upsert(
      { github_id: githubId, username, avatar_url: avatarUrl },
      { onConflict: 'github_id', ignoreDuplicates: false }
    )
    .select()
    .single();

  if (error) throw error;
  return data as DbUser;
};

export const getUser = async (githubId: string): Promise<DbUser | null> => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('github_id', githubId)
    .single();

  if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
  return (data as DbUser) || null;
};

export const getWatchlist = async (githubId: string): Promise<string[]> => {
  const user = await getUser(githubId);
  return user?.watchlist || [];
};

export const addToWatchlist = async (
  githubId: string,
  repo: string
): Promise<string[]> => {
  const current = await getWatchlist(githubId);
  if (current.includes(repo)) return current;

  const updated = [...current, repo];
  const { error } = await supabase
    .from('users')
    .update({ watchlist: updated })
    .eq('github_id', githubId);

  if (error) throw error;
  return updated;
};

export const removeFromWatchlist = async (
  githubId: string,
  repo: string
): Promise<string[]> => {
  const current = await getWatchlist(githubId);
  const updated = current.filter(r => r !== repo);

  const { error } = await supabase
    .from('users')
    .update({ watchlist: updated })
    .eq('github_id', githubId);

  if (error) throw error;
  return updated;
};