const Api = (() => {
  async function request(path, { method = 'GET', body, auth = false } = {}) {
    const headers = { 'Content-Type': 'application/json' };

    if (auth) {
      const session = Storage.get();
      if (session?.token) {
        headers['Authorization'] = `Bearer ${session.token}`;
      }
    }

    const response = await fetch(`${CONFIG.API_BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok || (payload && payload.success === false)) {
      const message = payload?.message || `Erro ${response.status} ao chamar ${path}`;
      throw new Error(message);
    }

    const token = response.headers.get('X-Player-Token');
    const ttlSeconds = response.headers.get('X-Player-Token-Expires-In');
    if (token) {
      Storage.save({
        token,
        expiresAt: ttlSeconds ? Date.now() + Number(ttlSeconds) * 1000 : null,
      });
    }

    return payload ? payload.data : null;
  }

  return {
    createRoom: (hostNickname) =>
      request('/rooms', { method: 'POST', body: { hostNickname } }),
    getRoomById: (roomId) =>
      request(`/rooms/${roomId}`, { auth: true }),
    getRoomByCode: (code) =>
      request(`/rooms/code/${code}`, { auth: true }),
    updateRoomSettings: (roomId, hostPlayerId, settings) =>
      request(`/rooms/${roomId}/settings`, {
        method: 'PATCH',
        body: { hostPlayerId, ...settings },
        auth: true,
      }),
    finishRoom: (roomId) =>
      request(`/rooms/${roomId}/finish`, { method: 'PATCH', auth: true }),

    joinRoom: (roomCode, nickname) =>
      request('/players/join', { method: 'POST', body: { roomCode, nickname } }),
    leaveRoom: (playerId) =>
      request('/players/leave', { method: 'POST', body: { playerId }, auth: true }),
    getPlayer: (playerId) =>
      request(`/players/${playerId}`, { auth: true }),
    getPlayersByRoom: (roomId) =>
      request(`/players/room/${roomId}`, { auth: true }),

    generateCard: (playerId) =>
      request(`/players/${playerId}/cards`, { method: 'POST', auth: true }),
    getCardsByPlayer: (playerId) =>
      request(`/players/${playerId}/cards`, { auth: true }),
    getCard: (cardId) =>
      request(`/cards/${cardId}`, { auth: true }),

    getGameState: (roomId) =>
      request(`/rooms/${roomId}/game`, { auth: true }),
    getDrawHistory: (roomId) =>
      request(`/rooms/${roomId}/draws`, { auth: true }),
    getWinners: (roomId) =>
      request(`/rooms/${roomId}/winners`, { auth: true }),
  };
})();