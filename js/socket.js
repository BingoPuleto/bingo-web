const BingoSocket = (() => {
  let client = null;
  let subscription = null;
  let errorSubscription = null;
  let currentOnError = null;
  const listeners = {};

  function on(eventType, handler) {
    if (!listeners[eventType]) listeners[eventType] = [];
    listeners[eventType].push(handler);
  }

  function emit(eventType, payload) {
    (listeners[eventType] || []).forEach((fn) => fn(payload));
    (listeners['*'] || []).forEach((fn) => fn(eventType, payload));
  }

  function connect({ token, roomId, onConnect, onError }) {
    currentOnError = onError;

    client = new StompJs.Client({
      webSocketFactory: () => new SockJS(CONFIG.WS_URL),
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 4000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      onConnect: () => {
        subscription = client.subscribe(`/topic/rooms/${roomId}`, (message) => {
          const gameEvent = JSON.parse(message.body);
          emit(gameEvent.event, gameEvent.payload);
        });
        errorSubscription = client.subscribe('/user/queue/errors', (message) => {
          const error = JSON.parse(message.body);
          if (currentOnError) currentOnError(error.message || 'Ocorreu um erro ao processar a ação.');
        });
        if (onConnect) onConnect();
      },
      onStompError: (frame) => {
        if (currentOnError) currentOnError(frame.headers?.message || 'Erro no WebSocket');
      },
      onWebSocketError: () => {
        if (currentOnError) currentOnError('Não foi possível conectar ao servidor em tempo real.');
      },
    });

    client.activate();
  }

  function send(destination, body = {}) {
    if (!client || !client.connected) {
      if (currentOnError) currentOnError('Ainda conectando ao servidor, tente novamente em instantes.');
      return;
    }
    client.publish({ destination, body: JSON.stringify(body) });
  }

  function startGame(roomId) {
    send(`/app/rooms/${roomId}/game/start`);
  }

  function updateRoomSettings(roomId, settings) {
    send(`/app/rooms/${roomId}/game/settings`, settings);
  }

  function drawNumber(roomId) {
    send(`/app/rooms/${roomId}/draws`);
  }

  function claimBingo(roomId, cardId, winType) {
    send(`/app/rooms/${roomId}/winners`, { cardId, winType });
  }

  function finishGame(roomId) {
    send(`/app/rooms/${roomId}/game/finish`);
  }

  function leaveRoom(roomId) {
    send(`/app/rooms/${roomId}/players/leave`);
  }

  function disconnect() {
    if (subscription) subscription.unsubscribe();
    if (errorSubscription) errorSubscription.unsubscribe();
    if (client) client.deactivate();
    client = null;
    subscription = null;
    errorSubscription = null;
    currentOnError = null;
  }

  return {
    on,
    connect,
    disconnect,
    startGame,
    updateRoomSettings,
    drawNumber,
    claimBingo,
    finishGame,
    leaveRoom,
  };
})();