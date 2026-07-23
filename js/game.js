document.addEventListener('DOMContentLoaded', async () => {
  if (!Storage.hasValidSession()) {
    window.location.href = '../index.html';
    return;
  }

  const session = Storage.get();

  const errorBox = document.getElementById('error-box');
  const gameOverBanner = document.getElementById('game-over-banner');
  const roomCodeSubtitle = document.getElementById('room-code-subtitle');
  const lastNumberValue = document.getElementById('last-number-value');
  const drawnNumbersEl = document.getElementById('drawn-numbers');
  const hostSidebar = document.getElementById('host-sidebar');
  const drawNumberBtn = document.getElementById('draw-number-btn');
  const finishGameBtn = document.getElementById('finish-game-btn');
  const autoDrawToggle = document.getElementById('auto-draw-toggle');
  const autoDrawInterval = document.getElementById('auto-draw-interval');
  const autoDrawStatus = document.getElementById('auto-draw-status');
  const hostPlayerList = document.getElementById('host-player-list');
  const markModeHint = document.getElementById('mark-mode-hint');
  const bingoCardEl = document.getElementById('bingo-card');
  const claimLineBtn = document.getElementById('claim-line-btn');
  const claimFullBtn = document.getElementById('claim-full-btn');
  const winnersListEl = document.getElementById('winners-list');
  const leaveRoomBtn = document.getElementById('leave-room-btn');
  const cardSplashEl = document.getElementById('card-splash');
  const bingoToastContainer = document.getElementById('bingo-toast-container');
  const voiceAnnouncementToggle = document.getElementById('voice-announcement-toggle');
  const voiceAnnouncementStatus = document.getElementById('voice-announcement-status');

  const BINGO_LETTERS = ['B', 'I', 'N', 'G', 'O'];

  let drawnNumbers = [];
  let card = null;
  let players = [];
  let autoDrawTimer = null;
  let gameFinished = false;

  let autoMarkNumbers = true;
  let allowLineWin = true;
  let allowFullWin = true;
  const manuallyMarked = new Set();

  let lineClaimed = false;
  const myWinTypes = new Set();
  let winnersCache = [];

  function showError(message) {
    errorBox.textContent = message;
    errorBox.hidden = false;
    setTimeout(() => (errorBox.hidden = true), 4000);
  }

  // ---------------------------------------------------------
  // Voice — só renderiza/liga no aside do host
  // ---------------------------------------------------------

  function renderVoiceUI() {
    if (!voiceAnnouncementToggle) return;
    const enabled = Voice.isEnabled();
    voiceAnnouncementToggle.innerHTML = enabled
      ? '<img src="../assets/icons/volume-on.svg" alt="" class="icon-inline" aria-hidden="true"> Desativar anúncio por voz'
      : '<img src="../assets/icons/volume-off.svg" alt="" class="icon-inline" aria-hidden="true"> Ativar anúncio por voz';
    voiceAnnouncementToggle.setAttribute('aria-pressed', String(enabled));
    voiceAnnouncementStatus.textContent = enabled
      ? 'Números sorteados são lidos em voz alta.'
      : 'Anúncio por voz desativado.';
  }

  // ---------------------------------------------------------
  // Cartela
  // ---------------------------------------------------------

  function renderMarkModeHint() {
    markModeHint.textContent = autoMarkNumbers
      ? 'Marcação automática: os números sorteados são marcados pra você.'
      : 'Marcação manual: clique nos números sorteados na sua cartela para marcá-los.';
  }

  function renderDrawnNumbers() {
    drawnNumbersEl.innerHTML = '';
    drawnNumbers.forEach((n) => {
      const chip = document.createElement('span');
      chip.className = 'chip';
      chip.textContent = n;
      drawnNumbersEl.appendChild(chip);
    });
    const last = drawnNumbers[drawnNumbers.length - 1];
    lastNumberValue.textContent = last !== undefined ? last : '--';
  }

  function renderBingoHeader() {
    BINGO_LETTERS.forEach((letter) => {
      const headerCell = document.createElement('div');
      headerCell.className = 'cell free';
      headerCell.textContent = letter;
      bingoCardEl.appendChild(headerCell);
    });
  }

  function renderCard() {
    if (!card) return;
    bingoCardEl.innerHTML = '';
    renderBingoHeader();

    const sorted = [...card.numbers].sort(
      (a, b) => a.rowIndex - b.rowIndex || a.columnIndex - b.columnIndex
    );

    sorted.forEach((item) => {
      const cell = document.createElement('div');
      cell.className = 'cell';

      if (item.free) {
        cell.classList.add('free', 'marked');
        cell.textContent = 'FREE';
        bingoCardEl.appendChild(cell);
        return;
      }

      cell.textContent = item.number;
      cell.dataset.number = item.number;

      const isDrawn = drawnNumbers.includes(item.number);
      const isMarked = autoMarkNumbers ? isDrawn : manuallyMarked.has(item.number);
      if (isMarked) cell.classList.add('marked');

      // No modo manual, só faz sentido poder clicar em números já
      // sorteados (não dá pra "adivinhar" e marcar antes da hora).
      if (!autoMarkNumbers && isDrawn) {
        cell.setAttribute('role', 'button');
        cell.setAttribute('tabindex', '0');
      }

      bingoCardEl.appendChild(cell);
    });
  }

  function toggleManualMark(number) {
    if (autoMarkNumbers) return;
    if (!drawnNumbers.includes(number)) return; // não deixa marcar número que ainda não saiu

    if (manuallyMarked.has(number)) {
      manuallyMarked.delete(number);
    } else {
      manuallyMarked.add(number);
    }
    renderCard();
  }

  bingoCardEl.addEventListener('click', (event) => {
    const cell = event.target.closest('.cell[data-number]');
    if (!cell) return;
    toggleManualMark(Number(cell.dataset.number));
  });

  bingoCardEl.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const cell = event.target.closest('.cell[data-number]');
    if (!cell) return;
    event.preventDefault();
    toggleManualMark(Number(cell.dataset.number));
  });

  function renderWinners(winners) {
    if (!winners || winners.length === 0) {
      winnersListEl.innerHTML = '<li class="text-muted">Ninguém venceu ainda.</li>';
      return;
    }
    winnersListEl.innerHTML = '';
    winners.forEach((w) => {
      const li = document.createElement('li');
      li.innerHTML = `<span>${w.playerNickname}</span><span>${w.winType === 'FULL' ? 'Cartela cheia' : 'Linha'}</span>`;
      winnersListEl.appendChild(li);
    });
  }

  function applyWinnersState(winners) {
    lineClaimed = (winners || []).some((w) => w.winType === 'LINE');
    myWinTypes.clear();
    (winners || [])
      .filter((w) => w.playerId === session.playerId)
      .forEach((w) => myWinTypes.add(w.winType));
    updateClaimButtonsState();
  }

  function updateClaimButtonsState() {
    if (gameFinished) return;
    if (allowLineWin) claimLineBtn.disabled = myWinTypes.has('LINE') || lineClaimed;
    if (allowFullWin) claimFullBtn.disabled = myWinTypes.has('FULL');
  }

  function renderWinTypeButtons() {
    claimLineBtn.hidden = !allowLineWin;
    claimFullBtn.hidden = !allowFullWin;
  }

  // ---------------------------------------------------------
  // Notificação de bingo (topo da tela)
  // ---------------------------------------------------------

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function showBingoToast(winner) {
    if (!bingoToastContainer) return;
    const modalidade = winner.winType === 'FULL' ? 'Cartela cheia' : 'Linha';
    const toast = document.createElement('div');
    toast.className = 'bingo-toast';
    toast.innerHTML = `
      <span class="bingo-toast-icon" aria-hidden="true">🏆</span>
      <span><strong>${escapeHtml(winner.playerNickname)}</strong> fez BINGO!
        <span class="bingo-toast-badge">${modalidade}</span>
      </span>
    `;
    bingoToastContainer.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('is-visible'));

    setTimeout(() => {
      toast.classList.remove('is-visible');
      toast.classList.add('is-leaving');
      setTimeout(() => toast.remove(), 300);
    }, 5000);
  }

  // Só notifica quando o bingo em questão é o "último" da modalidade em jogo:
  // se linha e cartela cheia estiverem ativas ao mesmo tempo, a linha é uma
  // etapa intermediária (não notifica) e só a cartela cheia é o bingo final.
  // Se só um dos dois tipos estiver ativo, ele já é o bingo final.
  function isFinalWinType(winType) {
    if (winType === 'FULL') return true;
    return winType === 'LINE' && !allowFullWin;
  }

  function notifyNewWinners(previousWinners, currentWinners) {
    const previous = previousWinners || [];
    const current = currentWinners || [];
    current
      .filter((w) => !previous.some((p) => p.playerId === w.playerId && p.winType === w.winType))
      .filter((w) => isFinalWinType(w.winType))
      .forEach(showBingoToast);
  }

  // ---------------------------------------------------------
  // Splash de fim de jogo (verde se venceu, vermelho se não)
  // ---------------------------------------------------------

  function showEndGameSplash() {
    if (session.host || !cardSplashEl) return;
    const won = myWinTypes.size > 0;
    cardSplashEl.classList.remove('splash-win', 'splash-lose', 'is-active');
    void cardSplashEl.offsetWidth; // força reflow pra reiniciar a animação
    cardSplashEl.classList.add(won ? 'splash-win' : 'splash-lose', 'is-active');
  }

  // ---------------------------------------------------------
  // Host — jogadores
  // ---------------------------------------------------------

  function renderHostPlayerList() {
    if (!session.host) return;
    hostPlayerList.innerHTML = '';
    players.forEach((player) => {
      const li = document.createElement('li');
      li.innerHTML = `
        <div>
          <span class="status-dot ${player.connected ? 'online' : ''}"></span>
          ${player.nickname}
          ${player.host ? '<span class="badge badge-host">Host</span>' : ''}
          <span class="badge ${player.connected ? 'badge-online' : 'badge-offline'}">
            ${player.connected ? 'Conectado' : 'Desconectado'}
          </span>
        </div>
        ${player.host ? '' : `
        <div class="action-row">
          <button class="btn btn-danger" data-kick-player-id="${player.id}">Remover</button>
        </div>`}
      `;
      hostPlayerList.appendChild(li);
    });
  }

  hostPlayerList.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-kick-player-id]');
    if (!button) return;
    const targetId = button.dataset.kickPlayerId;
    const target = players.find((p) => p.id === targetId);
    if (!confirm(`Remover ${target ? target.nickname : 'este jogador'} da sala?`)) return;
    button.disabled = true;
    try {
      await Api.leaveRoom(targetId);
      players = players.filter((p) => p.id !== targetId);
      renderHostPlayerList();
    } catch (err) {
      showError(err.message);
      button.disabled = false;
    }
  });

  // ---------------------------------------------------------
  // Sorteio automático — auto-save on change
  // ---------------------------------------------------------

  function applyAutoDraw() {
    const enabled = autoDrawToggle.value === 'enabled';
    const seconds = Math.min(60, Math.max(3, Number(autoDrawInterval.value) || 10));
    autoDrawInterval.value = seconds;

    if (enabled) {
      startAutoDraw(seconds);
      autoDrawStatus.textContent = `Ativo — sorteio a cada ${seconds}s.`;
    } else {
      stopAutoDraw();
      autoDrawStatus.textContent = 'Desativado.';
    }
  }

  function stopAutoDraw() {
    if (autoDrawTimer) {
      clearInterval(autoDrawTimer);
      autoDrawTimer = null;
    }
  }

  function startAutoDraw(seconds) {
    stopAutoDraw();
    autoDrawTimer = setInterval(() => {
      BingoSocket.drawNumber(session.roomId);
    }, seconds * 1000);
  }

  // ---------------------------------------------------------
  // Fim de jogo
  // ---------------------------------------------------------

  function endGame(message) {
    gameFinished = true;
    stopAutoDraw();
    Voice.stop();
    gameOverBanner.textContent = message;
    gameOverBanner.hidden = false;
    if (drawNumberBtn) drawNumberBtn.disabled = true;
    if (finishGameBtn) finishGameBtn.disabled = true;
    claimLineBtn.disabled = true;
    claimFullBtn.disabled = true;
    showEndGameSplash();
  }

  // ---------------------------------------------------------
  // Init
  // ---------------------------------------------------------

  try {
    roomCodeSubtitle.textContent = `Sala ${session.roomCode}`;

    if (!session.cardId && !session.host) {
      const generated = await Api.generateCard(session.playerId);
      Storage.save({ cardId: generated.id });
      session.cardId = generated.id;
    }

    const requests = [
      Api.getGameState(session.roomId),
      Api.getWinners(session.roomId),
      Api.getPlayersByRoom(session.roomId),
    ];
    if (!session.host) requests.splice(1, 0, Api.getCard(session.cardId));

    const results = await Promise.all(requests);
    const gameState = results[0];
    const cardData  = session.host ? null : results[1];
    const winners   = session.host ? results[1] : results[2];
    const roomPlayers = session.host ? results[2] : results[3];

    drawnNumbers  = gameState.drawnNumbers || [];
    Voice.seed(drawnNumbers);
    autoMarkNumbers = gameState.autoMarkNumbers;
    allowLineWin    = gameState.allowLineWin;
    allowFullWin    = gameState.allowFullWin;
    card            = cardData;
    players         = roomPlayers;

    winnersCache = winners || [];

    renderDrawnNumbers();
    renderWinners(winners);
    applyWinnersState(winners);

    if (session.host) {
      hostSidebar.hidden = false;
      document.body.classList.add('is-host');
      renderHostPlayerList();
      renderVoiceUI();

      voiceAnnouncementToggle.addEventListener('click', () => {
        Voice.setEnabled(!Voice.isEnabled());
        renderVoiceUI();
      });

      autoDrawToggle.addEventListener('change', applyAutoDraw);
      autoDrawInterval.addEventListener('change', applyAutoDraw);

      drawNumberBtn.addEventListener('click', () => {
        BingoSocket.drawNumber(session.roomId);
      });

      finishGameBtn.addEventListener('click', () => {
        if (!confirm('Tem certeza que deseja encerrar o jogo? Isso não pode ser desfeito.')) return;
        finishGameBtn.disabled = true;
        BingoSocket.finishGame(session.roomId);
      });
    } else {
      renderMarkModeHint();
      renderWinTypeButtons();
      renderCard();
      Voice.setEnabledSilent(false);
    }

    if (gameState.status === 'FINISHED') {
      endGame('O jogo já foi encerrado.');
    }
  } catch (err) {
    showError(err.message);
  }

  // ---------------------------------------------------------
  // Socket
  // ---------------------------------------------------------

  BingoSocket.connect({
    token: session.token,
    roomId: session.roomId,
    onError: (message) => showError(message),
  });

  BingoSocket.on('NUMBER_DRAWN', (draw) => {
    if (!drawnNumbers.includes(draw.number)) drawnNumbers.push(draw.number);
    Voice.announceNumber(draw.number);
    renderDrawnNumbers();
    if (!session.host) renderCard();
  });

  BingoSocket.on('BINGO_CONFIRMED', async () => {
    try {
      const winners = await Api.getWinners(session.roomId);
      notifyNewWinners(winnersCache, winners);
      winnersCache = winners || [];
      renderWinners(winners);
      applyWinnersState(winners);
    } catch (err) {
      showError(err.message);
    }
  });

  BingoSocket.on('GAME_FINISHED', async () => {
    try {
      const winners = await Api.getWinners(session.roomId);
      winnersCache = winners || [];
      renderWinners(winners);
      applyWinnersState(winners);
    } catch (_) {
      // segue com o estado local mais recente caso a busca falhe
    }
    endGame('Fim de jogo! Confira os vencedores abaixo.');
  });

  BingoSocket.on('PLAYER_JOINED', (player) => {
    if (!players.some((p) => p.id === player.id)) players.push(player);
    renderHostPlayerList();
  });

  BingoSocket.on('PLAYER_LEFT', (player) => {
    // Disparado tanto em saída voluntária quanto em queda de conexão
    // (reconexão do WebSocket) — não é expulsão. Só atualiza status.
    if (player.id === session.playerId) return;

    const existing = players.find((p) => p.id === player.id);
    if (existing) {
      existing.connected = player.connected;
      renderHostPlayerList();
    }
  });

  if (!session.host) {
    claimLineBtn.addEventListener('click', () => {
      BingoSocket.claimBingo(session.roomId, session.cardId, 'LINE');
    });

    claimFullBtn.addEventListener('click', () => {
      BingoSocket.claimBingo(session.roomId, session.cardId, 'FULL');
    });
  }

  leaveRoomBtn.addEventListener('click', async () => {
    stopAutoDraw();
    Voice.stop();
    BingoSocket.leaveRoom(session.roomId);
    try {
      await Api.leaveRoom(session.playerId);
    } catch (_) {}
    Storage.clear();
    window.location.href = '../index.html';
  });
});