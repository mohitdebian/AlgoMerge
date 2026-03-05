// Simple in-memory store for MVP
const users = new Map<string, { id: string; watchlist: string[] }>();

export const getUser = (id: string) => {
  if (!users.has(id)) {
    users.set(id, { id, watchlist: [] });
  }
  return users.get(id);
};

export const addToWatchlist = (userId: string, repo: string) => {
  const user = getUser(userId);
  if (user && !user.watchlist.includes(repo)) {
    user.watchlist.push(repo);
  }
  return user;
};

export const removeFromWatchlist = (userId: string, repo: string) => {
  const user = getUser(userId);
  if (user) {
    user.watchlist = user.watchlist.filter(r => r !== repo);
  }
  return user;
};

export const getWatchlist = (userId: string) => {
  return getUser(userId)?.watchlist || [];
};