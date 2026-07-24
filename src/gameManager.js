'use strict';

/*
 * GameManager - owns all live games and hands out unique PINs.
 */

const Game = require('./game');

const PIN_LENGTH = 6;
const MAX_QUESTIONS = 100;
const MAX_ANSWERS = 6;
const MIN_ANSWERS = 2;

class GameManager {
  constructor() {
    /** @type {Map<string, Game>} keyed by PIN */
    this.games = new Map();
  }

  /**
   * Create a new game from a raw payload sent by the host.
   * @param {string} hostSocketId
   * @param {object} payload { title, questions }
   * @param {(event, payload) => void} emit
   * @returns {{ game?: Game, error?: string }}
   */
  createGame(hostSocketId, payload, emit) {
    const { title, questions } = this.normalize(payload);
    if (questions.error) return { error: questions.error };

    const pin = this.generatePin();
    const game = new Game({
      pin,
      hostSocketId,
      title,
      questions: questions.list,
      emit
    });
    this.games.set(pin, game);
    return { game };
  }

  getGame(pin) {
    return this.games.get(String(pin || '').trim());
  }

  removeGame(pin) {
    const game = this.games.get(pin);
    if (game) {
      game.destroy();
      this.games.delete(pin);
    }
  }

  destroyAll() {
    for (const game of this.games.values()) game.destroy();
    this.games.clear();
  }

  /** Generate a PIN not currently in use. */
  generatePin() {
    let pin;
    let guard = 0;
    do {
      pin = String(Math.floor(Math.random() * Math.pow(10, PIN_LENGTH)))
        .padStart(PIN_LENGTH, '0');
      guard += 1;
    } while (this.games.has(pin) && guard < 50);
    return pin;
  }

  /**
   * Validate and normalize a host-provided game definition.
   * Returns { title, questions: { list } | { error } }.
   */
  normalize(payload) {
    const title = String((payload && payload.title) || 'Quiz').slice(0, 120);
    const rawQuestions = (payload && payload.questions) || [];

    if (!Array.isArray(rawQuestions) || rawQuestions.length === 0) {
      return { title, questions: { error: 'Jocul trebuie să aibă cel puțin o întrebare.' } };
    }
    if (rawQuestions.length > MAX_QUESTIONS) {
      return { title, questions: { error: `Maxim ${MAX_QUESTIONS} întrebări.` } };
    }

    const list = [];
    for (let i = 0; i < rawQuestions.length; i++) {
      const q = rawQuestions[i] || {};
      const text = String(q.text || '').trim();
      if (!text) {
        return { title, questions: { error: `Întrebarea ${i + 1} nu are text.` } };
      }

      const answers = Array.isArray(q.answers) ? q.answers : [];
      const cleanAnswers = answers
        .map((a) => ({
          text: String((a && a.text) || '').trim(),
          correct: !!(a && a.correct)
        }))
        .filter((a) => a.text.length > 0)
        .slice(0, MAX_ANSWERS);

      if (cleanAnswers.length < MIN_ANSWERS) {
        return {
          title,
          questions: { error: `Întrebarea ${i + 1} are nevoie de minim ${MIN_ANSWERS} răspunsuri.` }
        };
      }
      if (!cleanAnswers.some((a) => a.correct)) {
        return {
          title,
          questions: { error: `Întrebarea ${i + 1} nu are niciun răspuns corect marcat.` }
        };
      }

      let time = parseInt(q.time, 10);
      if (!Number.isFinite(time)) time = 20;
      time = Math.max(5, Math.min(120, time));

      // Accept a base64 data URL image/gif; reject anything else to keep
      // the app fully offline (no external URLs to fetch).
      let image = null;
      if (typeof q.image === 'string' && q.image.startsWith('data:image/')) {
        image = q.image;
      }

      list.push({ text: text.slice(0, 300), answers: cleanAnswers, time, image });
    }

    return { title, questions: { list } };
  }
}

module.exports = GameManager;
