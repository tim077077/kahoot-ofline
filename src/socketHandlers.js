'use strict';

/*
 * socketHandlers - the glue between Socket.io and the Game logic.
 *
 * Room layout, per game PIN:
 *   host:<pin>     -> the single host/presenter socket(s)
 *   players:<pin>  -> every player socket
 *
 * The Game emits transport-agnostic events; here we translate them into
 * the concrete messages that the host and player clients understand.
 */

function registerSocketHandlers(io, manager) {
  io.on('connection', (socket) => {
    // What this socket is currently part of.
    socket.data.role = null; // 'host' | 'player'
    socket.data.pin = null;
    socket.data.playerId = null;

    // ---- HOST: create a game ------------------------------------------
    socket.on('host:create', (payload, ack) => {
      const emit = makeEmitter(io, () => manager.getGame(socket.data.pin));
      const { game, error } = manager.createGame(socket.id, payload, emit);
      if (error) {
        return safeAck(ack, { ok: false, error });
      }

      socket.data.role = 'host';
      socket.data.pin = game.pin;
      socket.join(hostRoom(game.pin));

      safeAck(ack, {
        ok: true,
        pin: game.pin,
        title: game.title,
        questionCount: game.questions.length
      });
    });

    // Allow a host to re-attach to an existing game (e.g. page reload,
    // or opening the presenter screen in a second tab).
    socket.on('host:reconnect', ({ pin } = {}, ack) => {
      const game = manager.getGame(pin);
      if (!game) return safeAck(ack, { ok: false, error: 'PIN inexistent.' });

      socket.data.role = 'host';
      socket.data.pin = game.pin;
      socket.join(hostRoom(game.pin));
      safeAck(ack, {
        ok: true,
        pin: game.pin,
        title: game.title,
        state: game.state,
        players: game.lobbyList(),
        currentIndex: game.currentIndex,
        questionCount: game.questions.length
      });
    });

    socket.on('host:start', (_data, ack) => {
      const game = requireHostGame(socket, manager);
      if (!game) return safeAck(ack, { ok: false, error: 'Joc inexistent.' });
      const ok = game.start();
      safeAck(ack, { ok });
    });

    socket.on('host:next', () => {
      const game = requireHostGame(socket, manager);
      if (!game) return;
      // From reveal -> next question (or end). Ignore during an active question.
      if (game.state === 'reveal' || game.state === 'lobby') {
        game.nextQuestion();
      }
    });

    socket.on('host:skip', () => {
      const game = requireHostGame(socket, manager);
      if (game) game.skip();
    });

    socket.on('host:pause', () => {
      const game = requireHostGame(socket, manager);
      if (game) game.pause();
    });

    socket.on('host:resume', () => {
      const game = requireHostGame(socket, manager);
      if (game) game.resume();
    });

    socket.on('host:end', () => {
      const game = requireHostGame(socket, manager);
      if (game) game.end();
    });

    socket.on('host:kick', ({ playerId } = {}) => {
      const game = requireHostGame(socket, manager);
      if (!game) return;
      game.removePlayer(playerId);
      io.to(playerId).emit('player:kicked');
      const s = io.sockets.sockets.get(playerId);
      if (s) s.leave(playersRoom(game.pin));
      broadcastLobby(io, game);
    });

    // ---- PLAYER: join a game ------------------------------------------
    socket.on('player:join', ({ pin, name } = {}, ack) => {
      const game = manager.getGame(pin);
      if (!game) return safeAck(ack, { ok: false, error: 'PIN incorect. Verifică cifrele.' });
      if (game.state === 'ended') {
        return safeAck(ack, { ok: false, error: 'Jocul s-a terminat.' });
      }

      const cleanName = String(name || '').trim().slice(0, 20);
      if (!cleanName) return safeAck(ack, { ok: false, error: 'Introdu un nume.' });
      if (game.isNameTaken(cleanName)) {
        return safeAck(ack, { ok: false, error: 'Numele e deja folosit. Alege altul.' });
      }
      if (game.playerCount() >= 60) {
        return safeAck(ack, { ok: false, error: 'Jocul e plin.' });
      }

      game.addPlayer(socket.id, cleanName);
      socket.data.role = 'player';
      socket.data.pin = game.pin;
      socket.data.playerId = socket.id;
      socket.join(playersRoom(game.pin));

      safeAck(ack, {
        ok: true,
        playerId: socket.id,
        name: cleanName,
        state: game.state,
        title: game.title,
        question: game.snapshotFor(socket.id)
      });

      broadcastLobby(io, game);
    });

    // Reconnect: reclaim an existing player slot after a dropped connection.
    socket.on('player:rejoin', ({ pin, name } = {}, ack) => {
      const game = manager.getGame(pin);
      if (!game || game.state === 'ended') return safeAck(ack, { ok: false });

      const player = game.reclaim(name, socket.id);
      if (!player) return safeAck(ack, { ok: false });

      socket.data.role = 'player';
      socket.data.pin = game.pin;
      socket.data.playerId = socket.id;
      socket.join(playersRoom(game.pin));

      safeAck(ack, {
        ok: true,
        playerId: socket.id,
        name: player.name,
        state: game.state,
        score: player.score,
        question: game.snapshotFor(socket.id)
      });
      broadcastLobby(io, game);
    });

    socket.on('player:answer', ({ choice } = {}, ack) => {
      const game = manager.getGame(socket.data.pin);
      if (!game) return safeAck(ack, { ok: false });

      const outcome = game.submitAnswer(socket.data.playerId, choice);
      if (!outcome) return safeAck(ack, { ok: false });

      // Confirm receipt to the player (result shown only at reveal).
      safeAck(ack, { ok: true });

      // Keep the host's answered-counter live.
      io.to(hostRoom(game.pin)).emit('host:answered', {
        answered: game.answeredCount(),
        total: game.players.size
      });

      if (outcome.allAnswered) {
        game.reveal();
      }
    });

    // ---- Disconnect handling ------------------------------------------
    socket.on('disconnect', () => {
      const game = manager.getGame(socket.data.pin);
      if (!game) return;

      if (socket.data.role === 'player') {
        // Keep the score for a possible reconnect, but mark them offline.
        game.setDisconnected(socket.data.playerId);
        broadcastLobby(io, game);
      }
      // If the host disconnects we keep the game alive so a reload can
      // re-attach via host:reconnect. Games are cleaned up on server exit
      // or when the host ends them.
    });
  });
}

// ---- Emitter: Game events -> socket messages ------------------------------

/**
 * Build the emit callback handed to each Game. `getGame` is used lazily so
 * we always resolve the current room targets by PIN.
 */
function makeEmitter(io, getGame) {
  return function emit(event, payload) {
    const game = getGame();
    if (!game) return;
    const hRoom = hostRoom(game.pin);
    const pRoom = playersRoom(game.pin);

    switch (event) {
      case 'question': {
        io.to(hRoom).emit('game:question', {
          index: payload.index,
          total: payload.total,
          time: payload.time,
          question: payload.host,
          answered: 0,
          totalPlayers: game.players.size
        });
        io.to(pRoom).emit('game:question', {
          index: payload.index,
          total: payload.total,
          time: payload.time,
          question: payload.player
        });
        break;
      }
      case 'timer': {
        io.to(hRoom).emit('game:timer', payload);
        io.to(pRoom).emit('game:timer', payload);
        break;
      }
      case 'paused': {
        io.to(hRoom).emit('game:paused', payload);
        io.to(pRoom).emit('game:paused', payload);
        break;
      }
      case 'reveal': {
        // Host gets full distribution + leaderboard.
        io.to(hRoom).emit('game:reveal', payload);
        // Each player gets a personalized result.
        for (const player of game.players.values()) {
          const ans = player.answers[payload.index];
          io.to(player.id).emit('player:reveal', {
            answered: !!ans,
            correct: ans ? ans.correct : false,
            points: ans ? ans.points : 0,
            totalScore: player.score,
            streak: player.streak,
            rank: game.rankOf(player.id),
            totalPlayers: game.players.size,
            correctIndexes: payload.correctIndexes
          });
        }
        break;
      }
      case 'ended': {
        io.to(hRoom).emit('game:ended', payload);
        for (const stat of payload.stats) {
          io.to(stat.id).emit('player:ended', {
            rank: stat.rank,
            score: stat.score,
            correct: stat.correct,
            total: stat.total,
            podium: payload.podium
          });
        }
        break;
      }
      default:
        break;
    }
  };
}

// ---- Helpers --------------------------------------------------------------

function hostRoom(pin) {
  return `host:${pin}`;
}
function playersRoom(pin) {
  return `players:${pin}`;
}

function requireHostGame(socket, manager) {
  if (socket.data.role !== 'host') return null;
  return manager.getGame(socket.data.pin);
}

function broadcastLobby(io, game) {
  io.to(hostRoom(game.pin)).emit('host:lobby', {
    players: game.lobbyList(),
    count: game.playerCount()
  });
}

function safeAck(ack, data) {
  if (typeof ack === 'function') ack(data);
}

module.exports = registerSocketHandlers;
