const STORAGE_KEY = 'bingo_session';

const Storage = {
  save(partialSession) {
    const current = this.get() || {};
    const merged = { ...current, ...partialSession };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    return merged;
  },

  get() {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  },

  clear() {
    sessionStorage.removeItem(STORAGE_KEY);
  },

  hasValidSession() {
    const session = this.get();
    if (!session || !session.token || !session.roomId || !session.playerId) {
      return false;
    }
    if (session.expiresAt && Date.now() > session.expiresAt) {
      this.clear();
      return false;
    }
    return true;
  },
};