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
      showError(err.message);
    }
  });
});