document.addEventListener('DOMContentLoaded', async () => {
  if (!Storage.hasValidSession()) {
    window.location.href = '../index.html';
    return;
  }

  const session = Storage.get();

  const errorBox = document.getElementById('error-box');
  const roomCodeValue = document.getElementById('room-code-value');
  const copyRoomCodeBtn = document.getElementById('copy-room-code-btn');
  const playerCount = document.getElementById('player-count');
  const playerList = document.getElementById('player-list');
  const markModeValue = document.getElementById('mark-mode-value');
  const winTypesValue = document.getElementById('win-types-value');
  const hostSidebar = document.getElementById('host-sidebar');
  const hostSettings = document.getElementById('host-settings');
  const winTypesSettings = document.getElementById('win-types-settings');
  const startGameBtn = document.getElementById('start-game-btn');
  const markModeSelect = document.getElementById('mark-mode-select');
  const markModeHint = document.getElementById('mark-mode-hint');
  const allowLineWinCheckbox = document.getElementById('allow-line-win-checkbox');
  const allowFullWinCheckbox = document.getElementById('allow-full-win-checkbox');
  const winTypesHint = document.getElementById('win-types-hint');
  const leaveRoomBtn = document.getElementById('leave-room-btn');

  let players = [];
  let autoMarkNumbers = true;
  let allowLineWin = true;
  let allowFullWin = true;

  function showError(message) {
    errorBox.textContent = message;
    errorBox.hidden = false;
  }

  function pushSettings() {
    BingoSocket.updateRoomSettings(session.roomId, {
      autoMarkNumbers: markModeSelect.value === 'auto',
      allowLineWin: allowLineWinCheckbox.checked,
      allowFullWin: allowFullWinCheckbox.checked,
    });
  }

  function renderMarkMode() {
    markModeValue.textContent = autoMarkNumbers ? 'Automática' : 'Manual';

    if (session.host) {
      markModeSelect.value = autoMarkNumbers ? 'auto' : 'manual';
      markModeHint.textContent = autoMarkNumbers
        ? 'Automática: os números sorteados são marcados na cartela de cada jogador.'
        : 'Manual: cada jogador precisa clicar nos números sorteados para marcá-los na própria cartela.';
    }
  }

  function renderWinTypes() {
    if (allowLineWin && allowFullWin) {
      winTypesValue.textContent = 'Linha e cartela cheia';
    } else if (allowLineWin) {
      winTypesValue.textContent = 'Somente linha';
    } else {
      winTypesValue.textContent = 'Somente cartela cheia';
    }

    if (session.host) {
      allowLineWinCheckbox.checked = allowLineWin;
      allowFullWinCheckbox.checked = allowFullWin;
    }
  }

  function renderPlayers() {
    playerCount.textContent = players.length;
    playerList.innerHTML = '';

    players.forEach((player) => {
      const li = document.createElement('li');
      const canKick = session.host && !player.host;

      li.innerHTML = `
        <span class="player-name">
          <span class="status-dot ${player.connected ? 'online' : ''}"></span>
          ${player.nickname}
          ${player.host ? '<span class="badge badge-host">Host</span>' : ''}
          <span class="badge ${player.connected ? 'badge-online' : 'badge-offline'}">
            ${player.connected ? 'Conectado' : 'Desconectado'}
          </span>
        </span>
        ${canKick ? `<button class="btn btn-danger" data-kick-player-id="${player.id}">Remover</button>` : ''}
      `;
      playerList.appendChild(li);
    });

    if (session.host) {
      startGameBtn.disabled = players.length < 2;
    }
  }

  playerList.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-kick-player-id]');
    if (!button) return;

    const targetId = button.dataset.kickPlayerId;
    const target = players.find((p) => p.id === targetId);
    if (!confirm(`Remover ${target ? target.nickname : 'este jogador'} da sala?`)) return;

    button.disabled = true;
    try {
      await Api.leaveRoom(targetId);
      players = players.filter((p) => p.id !== targetId);
      renderPlayers();
    } catch (err) {
      showError(err.message);
      button.disabled = false;
    }
  });

  function goToGame() {
    BingoSocket.disconnect();
    window.location.href = 'game.html';
  }

  async function copyRoomCode() {
    const code = session.roomCode;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(code);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = code;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        textarea.remove();
      }

      copyRoomCodeBtn.classList.add('is-copied');
      copyRoomCodeBtn.querySelector('.icon-copy').hidden = true;
      copyRoomCodeBtn.querySelector('.icon-check').hidden = false;
      copyRoomCodeBtn.setAttribute('title', 'Copiado!');

      setTimeout(() => {
        copyRoomCodeBtn.classList.remove('is-copied');
        copyRoomCodeBtn.querySelector('.icon-copy').hidden = false;
        copyRoomCodeBtn.querySelector('.icon-check').hidden = true;
        copyRoomCodeBtn.setAttribute('title', 'Copiar código');
      }, 1800);
    } catch (err) {
      showError('Não foi possível copiar o código. Copie manualmente: ' + code);
    }
  }

  copyRoomCodeBtn.addEventListener('click', copyRoomCode);

  try {
    roomCodeValue.textContent = session.roomCode;
    const room = await Api.getRoomById(session.roomId);
    players = room.players;
    autoMarkNumbers = room.autoMarkNumbers;
    allowLineWin = room.allowLineWin;
    allowFullWin = room.allowFullWin;
    renderPlayers();
    renderMarkMode();
    renderWinTypes();

    if (room.status !== 'WAITING') {
      goToGame();
      return;
    }
  } catch (err) {
    showError(err.message);
  }

  if (session.host) {
    hostSettings.hidden = false;
    winTypesSettings.hidden = false;

    markModeSelect.addEventListener('change', pushSettings);

    allowLineWinCheckbox.addEventListener('change', () => {
      if (!allowLineWinCheckbox.checked && !allowFullWinCheckbox.checked) {
        winTypesHint.textContent = 'Pelo menos um tipo de vitória precisa ficar habilitado.';
        winTypesHint.style.color = 'var(--danger)';
        allowLineWinCheckbox.checked = true;
        return;
      }
      winTypesHint.textContent = '';
      pushSettings();
    });

    allowFullWinCheckbox.addEventListener('change', () => {
      if (!allowLineWinCheckbox.checked && !allowFullWinCheckbox.checked) {
        winTypesHint.textContent = 'Pelo menos um tipo de vitória precisa ficar habilitado.';
        winTypesHint.style.color = 'var(--danger)';
        allowFullWinCheckbox.checked = true;
        return;
      }
      winTypesHint.textContent = '';
      pushSettings();
    });
  }

  BingoSocket.connect({
    token: session.token,
    roomId: session.roomId,
    onError: (message) => showError(message),
  });

  BingoSocket.on('PLAYER_JOINED', (player) => {
    if (!players.some((p) => p.id === player.id)) {
      players.push(player);
    }
    renderPlayers();
  });

  BingoSocket.on('PLAYER_LEFT', (player) => {
    // Disparado tanto em saída voluntária quanto em queda de conexão
    // (reconexão do WebSocket). Nunca deve afetar o próprio jogador que
    // recebeu o evento sobre si mesmo (ele já não está mais conectado
    // quando isso acontece de verdade).
    if (player.id === session.playerId) return;

    const existing = players.find((p) => p.id === player.id);
    if (existing) {
      existing.connected = player.connected;
      renderPlayers();
    }
  });

  BingoSocket.on('PLAYER_KICKED', (player) => {
    // TEMPORÁRIO (modo de teste): redirecionamento por expulsão desativado.
    // O jogador expulso continua vendo a sala normalmente no front-end,
    // mesmo já tendo sido removido no backend. Reativar antes de ir pra
    // produção: veja o histórico do arquivo pra restaurar o alert +
    // Storage.clear() + redirect.
    if (player.id === session.playerId) return;

    players = players.filter((p) => p.id !== player.id);
    renderPlayers();
  });

  BingoSocket.on('ROOM_SETTINGS_UPDATED', (room) => {
    autoMarkNumbers = room.autoMarkNumbers;
    allowLineWin = room.allowLineWin;
    allowFullWin = room.allowFullWin;
    renderMarkMode();
    renderWinTypes();
  });

  BingoSocket.on('GAME_STARTED', goToGame);

  startGameBtn.addEventListener('click', () => {
    BingoSocket.startGame(session.roomId);
  });

  leaveRoomBtn.addEventListener('click', async () => {
    BingoSocket.leaveRoom(session.roomId);
    try {
      await Api.leaveRoom(session.playerId);
    } catch (_) {}
    Storage.clear();
    window.location.href = '../index.html';
  });
});