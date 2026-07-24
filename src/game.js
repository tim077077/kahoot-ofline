'use strict';

/*
 * Game - a single quiz session, identified by a PIN.
 *
 * Holds the questions, the connected players, the scoring, and the
 * state machine that drives the flow:
 *
 *   lobby -> question -> reveal -> (leaderboard) -> question ... -> ended
 *
 * The class is transport-agnostic: it emits high-level events through a
 * callback ("emit") and does NOT know about Socket.io. socketHandlers.js
 * is responsible for turning those events into socket messages.
 */

const MAX_POINTS = 1000; // points for an instant correct answer
const MIN_CORRECT_POINTS = 500; // floor for a correct-but-slow answer

class Game {
  /**
   * @param {object} opts
   * @param {string} opts.pin
   * @param {string} opts.hostSocketId
   * @param {string} opts.title
   * @param {Array}  opts.questions  normalized question objects
   * @param {(event: string, payload: any) => void} opts.emit  callback
   */
  constructor({ pin, hostSocketId, title, questions, emit }) {
    this.pin = pin;
    this.hostSocketId = hostSocketId;
    this.title = title || 'Quiz';
    this.questions = questions;
    this.emit = emit;

    /** @type {Map<string, Player>} keyed by player id (socket id) */
    this.players = new Map();

    this.state = 'lobby'; // lobby | question | reveal | ended
    this.paused = false;

    this.currentIndex = -1;
    this.questionStartedAt = 0;
    this.timeLimit = 0; // seconds for current question
    this.remaining = 0; // seconds left
    this._ticker = null;

    this.createdAt = Date.now();
  }

  // ---- Player management -------------------------------------------------

  addPlayer(id, name) {
    const player = {
      id,
      name,
      score: 0,
      streak: 0,
      answers: [], // per-question: { choice, correct, points, timeMs }
      connected: true,
      answeredCurrent: false
    };
    this.players.set(id, player);
    return player;
  }

  removePlayer(id) {
    this.players.delete(id);
  }

  /** Mark a player disconnected but keep their score for reconnection. */
  setDisconnected(id) {
    const p = this.players.get(id);
    if (p) p.connected = false;
  }

  /** Returns true if the given name is already taken (case-insensitive). */
  isNameTaken(name) {
    const wanted = name.trim().toLowerCase();
    for (const p of this.players.values()) {
      if (p.name.trim().toLowerCase() === wanted) return true;
    }
    return false;
  }

  playerCount() {
    return this.players.size;
  }

  /**
   * Re-attach a disconnected (or duplicate-name) player to a new socket id,
   * preserving their score/answers. Used for reconnection after the phone
   * screen sleeps or the browser tab is backgrounded.
   */
  reclaim(name, newId) {
    const wanted = String(name || '').trim().toLowerCase();
    for (const [id, p] of this.players) {
      if (p.name.trim().toLowerCase() === wanted) {
        this.players.delete(id);
        p.id = newId;
        p.connected = true;
        this.players.set(newId, p);
        return p;
      }
    }
    return null;
  }

  /** Snapshot of the current question for a (re)joining player. */
  snapshotFor(playerId) {
    if (this.state !== 'question') return null;
    const q = this.questions[this.currentIndex];
    const player = this.players.get(playerId);
    return {
      index: this.currentIndex,
      total: this.questions.length,
      time: this.timeLimit,
      remaining: Math.max(0, this.remaining),
      answered: !!(player && player.answeredCurrent),
      question: {
        text: q.text,
        image: q.image || null,
        answers: q.answers.map((a) => ({ text: a.text }))
      }
    };
  }

  activePlayers() {
    return [...this.players.values()].filter((p) => p.connected);
  }

  lobbyList() {
    return [...this.players.values()].map((p) => ({
      id: p.id,
      name: p.name,
      connected: p.connected
    }));
  }

  // ---- Flow control ------------------------------------------------------

  start() {
    if (this.state !== 'lobby') return false;
    if (this.questions.length === 0) return false;
    this.currentIndex = -1;
    this.nextQuestion();
    return true;
  }

  /** Advance from lobby/reveal to the next question, or end the game. */
  nextQuestion() {
    this.clearTicker();
    this.currentIndex += 1;

    if (this.currentIndex >= this.questions.length) {
      return this.end();
    }

    const q = this.questions[this.currentIndex];
    this.state = 'question';
    this.paused = false;
    this.timeLimit = q.time;
    this.remaining = q.time;
    this.questionStartedAt = Date.now();

    for (const p of this.players.values()) {
      p.answeredCurrent = false;
    }

    // Emit the sanitized question to players (no correct answer!) and the
    // full question to the host.
    this.emit('question', {
      index: this.currentIndex,
      total: this.questions.length,
      time: q.time,
      // host view (full)
      host: {
        text: q.text,
        image: q.image || null,
        answers: q.answers.map((a) => ({ text: a.text, correct: a.correct }))
      },
      // player view (safe)
      player: {
        text: q.text,
        image: q.image || null,
        answers: q.answers.map((a) => ({ text: a.text }))
      }
    });

    this.startTicker();
  }

  startTicker() {
    this.clearTicker();
    this._ticker = setInterval(() => {
      if (this.paused) return;
      this.remaining -= 1;
      this.emit('timer', { remaining: Math.max(0, this.remaining) });
      if (this.remaining <= 0) {
        this.reveal();
      }
    }, 1000);
  }

  clearTicker() {
    if (this._ticker) {
      clearInterval(this._ticker);
      this._ticker = null;
    }
  }

  pause() {
    if (this.state !== 'question') return false;
    this.paused = true;
    this.emit('paused', { paused: true });
    return true;
  }

  resume() {
    if (this.state !== 'question') return false;
    this.paused = false;
    this.emit('paused', { paused: false });
    return true;
  }

  /** Force the current question to end early (host "skip"). */
  skip() {
    if (this.state !== 'question') return false;
    this.reveal();
    return true;
  }

  /**
   * Record a player's answer. Scoring rewards correctness and speed.
   * Returns a per-player result object, or null if not accepted.
   */
  submitAnswer(playerId, choiceIndex) {
    if (this.state !== 'question' || this.paused) return null;
    const player = this.players.get(playerId);
    if (!player || player.answeredCurrent) return null;

    const q = this.questions[this.currentIndex];
    if (choiceIndex < 0 || choiceIndex >= q.answers.length) return null;

    const elapsedMs = Date.now() - this.questionStartedAt;
    const correct = !!q.answers[choiceIndex].correct;

    let points = 0;
    if (correct) {
      const frac = Math.min(1, elapsedMs / (this.timeLimit * 1000));
      // Linear from MAX_POINTS (instant) down to MIN_CORRECT_POINTS (last moment).
      points = Math.round(MAX_POINTS - frac * (MAX_POINTS - MIN_CORRECT_POINTS));
      player.streak += 1;
      // Small streak bonus, capped, to reward consistency.
      points += Math.min(player.streak - 1, 5) * 20;
    } else {
      player.streak = 0;
    }

    player.score += points;
    player.answeredCurrent = true;
    player.answers[this.currentIndex] = {
      choice: choiceIndex,
      correct,
      points,
      timeMs: elapsedMs
    };

    // If everyone connected has answered, end the question early.
    const active = this.activePlayers();
    const allAnswered =
      active.length > 0 && active.every((p) => p.answeredCurrent);

    return {
      result: { correct, points, totalScore: player.score, streak: player.streak },
      allAnswered
    };
  }

  answeredCount() {
    let n = 0;
    for (const p of this.players.values()) {
      if (p.answeredCurrent) n += 1;
    }
    return n;
  }

  /** Move to the reveal phase: compute distribution + leaderboard. */
  reveal() {
    if (this.state !== 'question') return;
    this.clearTicker();
    this.state = 'reveal';

    const q = this.questions[this.currentIndex];
    const distribution = q.answers.map(() => 0);
    let correctCount = 0;

    for (const p of this.players.values()) {
      const a = p.answers[this.currentIndex];
      if (a && typeof a.choice === 'number') {
        distribution[a.choice] += 1;
        if (a.correct) correctCount += 1;
      }
    }

    this.emit('reveal', {
      index: this.currentIndex,
      correctIndexes: q.answers
        .map((a, i) => (a.correct ? i : -1))
        .filter((i) => i >= 0),
      distribution,
      correctCount,
      answered: this.answeredCount(),
      leaderboard: this.leaderboard()
    });
  }

  /** Top players sorted by score. */
  leaderboard(limit = 5) {
    return [...this.players.values()]
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((p, i) => ({
        rank: i + 1,
        id: p.id,
        name: p.name,
        score: p.score,
        streak: p.streak
      }));
  }

  /** A player's current rank (1-based) among everyone. */
  rankOf(playerId) {
    const sorted = [...this.players.values()].sort((a, b) => b.score - a.score);
    const idx = sorted.findIndex((p) => p.id === playerId);
    return idx === -1 ? null : idx + 1;
  }

  end() {
    this.clearTicker();
    this.state = 'ended';

    const sorted = [...this.players.values()].sort((a, b) => b.score - a.score);
    const podium = sorted.slice(0, 3).map((p, i) => ({
      rank: i + 1,
      name: p.name,
      score: p.score
    }));

    const stats = sorted.map((p, i) => {
      const correct = p.answers.filter((a) => a && a.correct).length;
      const answered = p.answers.filter((a) => a).length;
      return {
        rank: i + 1,
        id: p.id,
        name: p.name,
        score: p.score,
        correct,
        answered,
        total: this.questions.length
      };
    });

    this.emit('ended', { podium, stats, title: this.title });
    return true;
  }

  destroy() {
    this.clearTicker();
    this.players.clear();
  }
}

module.exports = Game;
