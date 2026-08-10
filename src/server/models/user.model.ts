import { supabase } from '../utils/supabase.js';

export interface DbUser {
  id: number;
  github_id: string;
  username: string;
  avatar_url: string;
}

export interface UserWithWatchlist extends DbUser {
  watchlist: string[];
}

/**
 * Upsert a user row on login. If the user already exists the username /
 * avatar are updated.
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

/**
 * Uses a SQL JOIN to fetch the user and their tracked repositories in one query.
 */
export const getWatchlist = async (githubId: string): Promise<string[]> => {
  // PostgREST natively performs a LEFT JOIN here.
  const { data, error } = await supabase
    .from('users')
    .select('*, tracked_repositories(repo_name)')
    .eq('github_id', githubId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  if (!data) return [];
  
  const repos = (data.tracked_repositories as any[]) || [];
  return repos.map(r => r.repo_name);
};

export const addToWatchlist = async (
  githubId: string,
  repo: string
): Promise<string[]> => {
  const user = await getUser(githubId);
  if (!user) throw new Error('User not found');

  const { error } = await supabase
    .from('tracked_repositories')
    .upsert(
      { user_id: user.id, repo_name: repo },
      { onConflict: 'user_id, repo_name' }
    );

  if (error && error.code !== '23505') throw error; // Ignore unique constraint violation if already exists
  
  return getWatchlist(githubId);
};

export const removeFromWatchlist = async (
  githubId: string,
  repo: string
): Promise<string[]> => {
  const user = await getUser(githubId);
  if (!user) throw new Error('User not found');

  const { error } = await supabase
    .from('tracked_repositories')
    .delete()
    .eq('user_id', user.id)
    .eq('repo_name', repo);

  if (error) throw error;

  return getWatchlist(githubId);
};