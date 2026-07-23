# 🎱 Bingo Puleto

Um cliente web de Bingo multiplayer em tempo real. Os jogadores criam ou entram em uma sala usando um código curto, recebem uma cartela gerada aleatoriamente e jogam juntos ao vivo — os números sorteados pelo host são transmitidos instantaneamente para todos os jogadores via WebSocket.

Este repositório contém **apenas o front-end**: uma aplicação estática em HTML/CSS/JavaScript que consome uma **Bingo API** externa (REST + STOMP sobre WebSocket) para toda a lógica de jogo, persistência e mensagens em tempo real.

> Os textos da interface estão em português do Brasil (`lang="pt-BR"`).

---

## ✨ Principais Funcionalidades

- **Criar ou entrar em uma sala** — o host cria uma sala e recebe um código de 6 caracteres; os demais jogadores entram usando esse código.
- **Sala de espera / lobby** — exibe os jogadores conectados, status de entrada/saída/conexão em tempo real, e permite que o host remova jogadores.
- **Regras configuráveis pelo host** — antes do jogo começar, o host pode escolher:
  - Modo de marcação de números: **automática** (as cartelas marcam sozinhas os números sorteados) ou **manual** (os jogadores clicam para marcar).
  - Tipos de vitória permitidos: **Linha** e/ou **Cartela cheia**, sendo obrigatório manter pelo menos um habilitado.
- **Jogo em tempo real via WebSocket (STOMP/SockJS)**:
  - Sorteio de números ao vivo, com histórico contínuo e exibição do "último número sorteado".
  - Sorteio manual acionado pelo host, ou um **timer de sorteio automático** (intervalo configurável de 3 a 60s) que roda no lado do cliente enquanto a aba do host estiver aberta.
  - Jogadores reivindicam **Bingo** (linha ou cartela cheia) e veem os vencedores atualizados ao vivo para todos.
  - O host pode encerrar o jogo a qualquer momento; um banner de fim de jogo é exibido para todos os jogadores.
- **Anúncio por voz (host)** — os números sorteados são lidos em voz alta em português usando a API `SpeechSynthesis` do navegador, incluindo algumas frases lúdicas de "chamada de bingo" para números específicos (ex.: 13, 22, 33, 51).
- **Alternância de tema claro/escuro** — a preferência de tema é detectada a partir de `prefers-color-scheme` e persistida em `localStorage`.
- **Persistência de sessão** — a sessão ativa do jogador (token, sala, cartela, apelido) é mantida em `sessionStorage`, e as páginas protegidas redirecionam de volta para a tela inicial caso não haja sessão válida.
- **Autenticação baseada em token** — um token bearer emitido pela API (via cabeçalho de resposta `X-Player-Token`) é armazenado e anexado às chamadas REST autenticadas e à conexão WebSocket.

---

## 🛠️ Stack Tecnológica

Este projeto foi construído intencionalmente **sem etapa de build, framework ou gerenciador de pacotes** — é um código front-end simples e com poucas dependências.

| Camada | Tecnologia |
| --- | --- |
| Marcação | HTML5 |
| Estilização | CSS3 puro (custom properties / design tokens, sem pré-processador) |
| Script | JavaScript puro (ES6+, sem framework, sem bundler) |
| Transporte em tempo real | [SockJS](https://github.com/sockjs/sockjs-client) + [STOMP.js](https://stomp-js.github.io/) (carregados via CDN) |
| Persistência (cliente) | `sessionStorage` (sessão do jogador) e `localStorage` (tema, preferência de voz) |
| Voz | API `SpeechSynthesis` do navegador |
| Backend | "Bingo API" externa via REST + WebSocket (não incluída neste repositório) |

**Dependências externas via CDN** (carregadas diretamente em `pages/room.html` e `pages/game.html`):

```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/sockjs-client/1.6.1/sockjs.min.js"></script>
<script src="https://unpkg.com/@stomp/stompjs@7/bundles/stomp.umd.min.js"></script>
```

---

## 🏗️ Arquitetura do Projeto

A aplicação é um **site estático multi-página** (sem framework de roteamento no cliente / SPA). Cada página carrega um pequeno conjunto de scripts compartilhados, mais um script controlador específico da página.

```
Início (index.html)            →  cria/entra em uma sala e redireciona para:
Sala (pages/room.html)         →  lobby de espera, configurações do host e redireciona para:
Jogo (pages/game.html)         →  jogo ao vivo, sorteio, reivindicação de bingo
```

Módulos compartilhados (carregados como tags `<script>` simples, expostos como objetos globais — sem bundler de módulos):

| Módulo | Responsabilidade |
| --- | --- |
| `js/config.js` | Configuração global: URL base da API, URL do WebSocket, tamanho do código da sala, tamanho do apelido. |
| `js/storage.js` | Encapsula o `sessionStorage` para a sessão do jogador (token, sala, jogador, cartela, expiração). |
| `js/api.js` | Cliente REST simples (baseado em `fetch`) para todas as chamadas HTTP à Bingo API; anexa automaticamente o token bearer e captura novos tokens vindos dos cabeçalhos de resposta. |
| `js/socket.js` | Encapsula STOMP/SockJS: conecta, assina os tópicos de sala/usuário e expõe funções auxiliares para enviar ações de jogo (iniciar jogo, sortear número, reivindicar bingo, atualizar configurações, encerrar jogo, sair da sala). |
| `js/theme.js` | Detecção, alternância e persistência do tema claro/escuro. Carregado antecipadamente (no `<head>`) para evitar um "flash" do tema errado. |
| `js/voice.js` | Anúncios por voz (text-to-speech) dos números sorteados, com preferência de ativação/desativação persistida em `localStorage`. |
| `js/home.js` | Controlador da `index.html` — formulários de criar sala / entrar em sala. |
| `js/room.js` | Controlador da `pages/room.html` — sala de espera, lista de jogadores, configurações do host, início de jogo. |
| `js/game.js` | Controlador da `pages/game.html` — renderização da cartela, números sorteados, reivindicação de bingo, controles do host (sortear, sorteio automático, encerrar jogo). |

---

## 📁 Estrutura de Pastas

```
bingo-web/
├── index.html            # Tela inicial: criar ou entrar em uma sala
├── assets/
│   └── icons/              # Ícones do sistema
├── css/
│   ├── reset.css          # Reset básico de CSS
│   ├── style.css          # Design tokens (cores, espaçamentos) + componentes compartilhados
│   ├── home.css            # Estilos da tela inicial
│   ├── room.css              # Estilos da sala de espera (e layout compartilhado do jogo)
│   └── game.css               # Estilos da tela de jogo
├── pages/
│   ├── room.html          # Sala de espera / lobby
│   └── game.html          # Tela de jogo ao vivo
└── js/
    ├── config.js          # Endpoints da API/WS e constantes
    ├── storage.js         # Auxiliar de persistência de sessão
    ├── api.js              # Cliente da API REST
    ├── socket.js            # Cliente STOMP/SockJS em tempo real
    ├── theme.js              # Lógica de alternância de tema
    ├── voice.js               # Anunciador de números via síntese de voz
    ├── home.js                 # Controlador da tela inicial
    └── room.js/game.js           # Controladores das telas de sala e jogo
```

---

## ✅ Requisitos

- Qualquer navegador moderno (Chromium, Firefox, Safari) com suporte a `fetch`, `sessionStorage`/`localStorage` e (opcionalmente) `SpeechSynthesis` para os anúncios por voz.
- Uma instância em execução da **Bingo API** complementar, expondo:
  - Uma API REST (esperada por padrão em `http://localhost:8080/api/v1`)
  - Um endpoint STOMP sobre WebSocket (esperado por padrão em `http://localhost:8080/ws`)
- Um servidor simples de arquivos estáticos para servir o HTML/CSS/JS (um `http-server` em Node, o `http.server` do Python, Live Server do VS Code, Nginx, etc.). Abrir o `index.html` diretamente via `file://` **não é recomendado**, já que os caminhos relativos de assets e as chamadas à API funcionam melhor quando servidos via HTTP.

---

## 📦 Instalação

Não há gerenciador de pacotes nem etapa de instalação de dependências — este é um código front-end estático e sem dependências (além dos dois scripts via CDN referenciados diretamente no HTML).

```bash
git clone <repository-url>
cd bingo-web
```

---

## ⚙️ Configuração

Toda a configuração de execução está centralizada em um único arquivo: **`js/config.js`**.

```js
const CONFIG = Object.freeze({
  API_BASE_URL: 'http://localhost:8080/api/v1',
  WS_URL: 'http://localhost:8080/ws',
  ROOM_CODE_LENGTH: 6,
  NICKNAME_MAX_LENGTH: 30,
});
```

| Chave | Descrição | Padrão |
| --- | --- | --- |
| `API_BASE_URL` | URL base dos endpoints REST da Bingo API. | `http://localhost:8080/api/v1` |
| `WS_URL` | URL do endpoint WebSocket SockJS/STOMP. | `http://localhost:8080/ws` |
| `ROOM_CODE_LENGTH` | Tamanho esperado dos códigos de sala (usado nas restrições de input/UI). | `6` |
| `NICKNAME_MAX_LENGTH` | Tamanho máximo do apelido, aplicado nos campos de input. | `30` |

Para apontar a aplicação para um backend diferente (ex.: um ambiente de staging ou produção), edite os valores de `API_BASE_URL` e `WS_URL` em `js/config.js` antes de fazer o deploy.

> Não há arquivo `.env` nem mecanismo de variáveis de ambiente — como se trata de um site estático, a configuração é um arquivo de constantes JS simples, incorporado nos arquivos servidos.

---

## ▶️ Executando Localmente

1. Garanta que um backend da Bingo API esteja em execução e acessível nas URLs configuradas em `js/config.js` (ou atualize a configuração para corresponder ao seu backend).
2. Sirva a raiz do projeto como arquivos estáticos, por exemplo:

   ```bash
   # Usando Python
   python3 -m http.server 5500

   # ou usando o http-server do Node
   npx http-server -p 5500
   ```

3. Abra `http://localhost:5500/index.html` no navegador.
4. Crie uma sala (como host) em uma aba/navegador e entre nela a partir de outra aba/navegador (ou de outro dispositivo) usando o código de sala gerado, para testar o fluxo multiplayer.

---

## 🚀 Build de Produção

Não há etapa de build/compilação nem bundler — os arquivos deste repositório (`index.html`, `pages/`, `css/`, `js/`, `assets/`) já são assets estáticos prontos para produção. "Preparar" para produção significa simplesmente:

1. Atualizar `js/config.js` com o `API_BASE_URL` e `WS_URL` de produção.
2. Fazer o deploy do conteúdo do repositório como está, em qualquer provedor de hospedagem estática ou servidor web.

---

## 🔌 Visão Geral da Integração com a API

O cliente se comunica com o backend por meio de dois canais:

### REST (`js/api.js`)

Todas as requisições são feitas para `${CONFIG.API_BASE_URL}` com corpos em JSON, e as respostas seguem o formato `{ success, data, message }`. Requisições autenticadas anexam `Authorization: Bearer <token>`, sendo que o token é capturado a partir do cabeçalho de resposta `X-Player-Token` (e `X-Player-Token-Expires-In`) e armazenado via `Storage`.

| Endpoint | Método | Finalidade |
| --- | --- | --- |
| `/rooms` | `POST` | Criar uma sala (apelido do host). |
| `/rooms/:id` | `GET` | Buscar uma sala pelo ID. |
| `/rooms/code/:code` | `GET` | Buscar uma sala pelo código de entrada. |
| `/rooms/:id/settings` | `PATCH` | Atualizar configurações da sala (modo de marcação, tipos de vitória). |
| `/rooms/:id/finish` | `PATCH` | Encerrar o jogo de uma sala. |
| `/rooms/:id/game` | `GET` | Buscar o estado atual do jogo (status, números sorteados, configurações). |
| `/rooms/:id/draws` | `GET` | Buscar o histórico de sorteios. |
| `/rooms/:id/winners` | `GET` | Buscar os vencedores atuais. |
| `/players/join` | `POST` | Entrar em uma sala pelo código + apelido. |
| `/players/leave` | `POST` | Sair de (ou ser removido de) uma sala. |
| `/players/:id` | `GET` | Buscar um jogador. |
| `/players/room/:roomId` | `GET` | Listar jogadores de uma sala. |
| `/players/:id/cards` | `POST` / `GET` | Gerar / buscar a cartela de um jogador. |
| `/cards/:id` | `GET` | Buscar uma cartela específica. |

### Tempo real (`js/socket.js`)

Um cliente STOMP se conecta via SockJS a `${CONFIG.WS_URL}`, autenticando-se com o mesmo token bearer. Ele assina `/topic/rooms/:roomId` para eventos de jogo transmitidos em broadcast e `/user/queue/errors` para erros específicos do usuário, além de publicar ações nos seguintes destinos:

| Destino | Ação |
| --- | --- |
| `/app/rooms/:roomId/game/start` | Iniciar o jogo. |
| `/app/rooms/:roomId/game/settings` | Atualizar configurações da sala. |
| `/app/rooms/:roomId/draws` | Sortear o próximo número. |
| `/app/rooms/:roomId/winners` | Reivindicar um bingo (linha ou cartela cheia). |
| `/app/rooms/:roomId/game/finish` | Encerrar o jogo. |
| `/app/rooms/:roomId/players/leave` | Sair da sala. |

Os eventos de broadcast recebidos e tratados pela interface incluem `PLAYER_JOINED`, `PLAYER_LEFT`, `ROOM_SETTINGS_UPDATED`, `GAME_STARTED`, `NUMBER_DRAWN`, `BINGO_CONFIRMED` e `GAME_FINISHED`.

---

## 📜 Scripts Disponíveis

Este projeto não possui `package.json` e, portanto, não possui scripts npm. Ele é servido diretamente como arquivos estáticos (veja [Executando Localmente](#️-executando-localmente)).

---

## 🌍 Notas de Deploy

- Por ser um site estático, pode ser hospedado em qualquer provedor de hospedagem estática (Nginx/Apache, Netlify, Vercel, GitHub Pages, S3 + CloudFront, etc.).
- Antes do deploy, atualize `API_BASE_URL` e `WS_URL` em `js/config.js` para apontar para a Bingo API de produção.
- O backend precisa permitir requisições cross-origin (CORS) e conexões WebSocket a partir de onde este front-end estiver hospedado.
- Como as URLs de API/WS em `js/config.js` são strings HTTP(S)/WS(S) simples, garanta que o front-end e o backend em produção usem protocolos compatíveis com o navegador (ex.: `https://` + `wss://` quando o site for servido via HTTPS).

---

## 👩‍💻 Diretrizes de Desenvolvimento

- **Sem framework, sem bundler** — mantenha as adições em HTML/CSS/JS puro, a menos que a ferramentação do projeto mude.
- **Padrão de namespace global** — os módulos compartilhados são IIFEs expostas em `window` (ex.: `Api`, `Storage`, `BingoSocket`, `Theme`, `Voice`). Siga esse padrão para novos utilitários compartilhados em vez de introduzir módulos ES, já que os scripts são carregados via tags `<script>` simples em uma ordem fixa.
- **A ordem de carregamento dos scripts importa** — cada página HTML carrega as dependências antes do script controlador da página (ex.: `storage.js` → `config.js` → `api.js` → `socket.js` → script da página). Preserve essa ordem ao adicionar novos scripts.
- **Design tokens** — cores, espaçamentos e componentes compartilhados ficam em `css/style.css` como CSS custom properties; estilos específicos de cada página ficam em `home.css` / `room.css` / `game.css`.
- **Idioma** — os textos atuais da interface estão em português do Brasil (`pt-BR`); mantenha os novos textos voltados ao usuário consistentes, a menos que seja introduzida internacionalização.

---

## 🌐 Compatibilidade com Navegadores

A aplicação depende de APIs modernas e amplamente suportadas pelos navegadores:

- `fetch` para chamadas REST
- `sessionStorage` / `localStorage`
- `window.matchMedia` (detecção de tema)
- WebSockets (via SockJS/STOMP)
- `SpeechSynthesis` (anúncios por voz — detectado por feature e desativado graciosamente caso não seja suportado)

O projeto é voltado para versões atuais de navegadores evergreen (Chrome, Edge, Firefox, Safari). Não há polyfills ou transpilação incluídos, portanto navegadores mais antigos sem suporte nativo a essas APIs não são suportados.

---

## 📄 Licença
Este projeto está licenciado sob a **Licença MIT**.
A Licença MIT permite que qualquer pessoa utilize, copie, modifique, publique, distribua, sublicencie e/ou venda cópias do software, desde que o aviso de copyright e a licença original sejam incluídos em todas as cópias ou partes substanciais do projeto.
Consulte o arquivo `LICENSE` para o texto completo da licença.