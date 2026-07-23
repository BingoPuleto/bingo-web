document.addEventListener('DOMContentLoaded', () => {
  // Começar do zero sempre que voltar para a home.
  Storage.clear();

  const errorBox = document.getElementById('error-box');
  const tabButtons = document.querySelectorAll('.tab-btn');
  const createForm = document.getElementById('create-room-form');
  const joinForm = document.getElementById('join-room-form');

  function showError(message) {
    errorBox.textContent = message;
    errorBox.hidden = false;
  }

  function hideError() {
    errorBox.hidden = true;
  }

  // Coloca/tira o botão de um form em estado de carregamento, trocando o
  // texto e mostrando um spinner, sem perder o label original.
  function setButtonLoading(button, isLoading, loadingText) {
    if (isLoading) {
      button.dataset.originalText = button.textContent;
      button.disabled = true;
      button.classList.add('btn-loading');
      button.innerHTML = `<span class="btn-spinner" aria-hidden="true"></span> ${loadingText}`;
    } else {
      button.disabled = false;
      button.classList.remove('btn-loading');
      button.textContent = button.dataset.originalText || button.textContent;
    }
  }

  const roomCodeInput = document.getElementById('room-code');
  roomCodeInput.addEventListener('input', () => {
    const cleaned = roomCodeInput.value.replace(/[^A-Za-z0-9]/g, '');
    if (cleaned !== roomCodeInput.value) roomCodeInput.value = cleaned;
  });

  // Alterna entre a aba "Criar sala" e "Entrar em sala".
  tabButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      tabButtons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');

      document.getElementById('tab-create').hidden = btn.dataset.tab !== 'create';
      document.getElementById('tab-join').hidden = btn.dataset.tab !== 'join';
      hideError();
    });
  });

  createForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    hideError();

    const nickname = document.getElementById('host-nickname').value.trim();
    if (!nickname) return showError('Informe seu nome.');

    const submitBtn = createForm.querySelector('button[type="submit"]');
    setButtonLoading(submitBtn, true, 'Criando sala...');

    try {
      const room = await Api.createRoom(nickname);
      const host = room.players[0];
      const card = await Api.generateCard(host.id);

      Storage.save({
        roomId: room.id,
        roomCode: room.code,
        playerId: host.id,
        nickname: host.nickname,
        host: true,
        cardId: card.id,
      });

      window.location.href = 'pages/room.html';
    } catch (err) {
      setButtonLoading(submitBtn, false);
      showError(err.message);
    }
  });

  joinForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    hideError();

    const roomCode = document.getElementById('room-code').value.trim().toUpperCase();
    const nickname = document.getElementById('player-nickname').value.trim();
    if (!roomCode || !nickname) {
      return showError('Preencha o código da sala e seu nome.');
    }

    const submitBtn = joinForm.querySelector('button[type="submit"]');
    setButtonLoading(submitBtn, true, 'Entrando...');

    try {
      const player = await Api.joinRoom(roomCode, nickname);
      const card = await Api.generateCard(player.id);

      Storage.save({
        roomId: player.roomId,
        roomCode,
        playerId: player.id,
        nickname: player.nickname,
        host: player.host,
        cardId: card.id,
      });

      window.location.href = 'pages/room.html';
    } catch (err) {
      setButtonLoading(submitBtn, false);
      showError(err.message);
    }
  });
});