'use strict';

/*
 * Host controller: quiz editor, lobby, presenter view and game controls.
 */

(function () {
  var socket = io();
  var SHAPES = ['▲', '◆', '●', '■', '★', '✚'];
  var STORAGE_KEY = 'kahoot_offline_draft';

  var state = { pin: null, questionCount: 0 };

  // ---- Views ----------------------------------------------------------
  var views = {
    editor: byId('view-editor'),
    lobby: byId('view-lobby'),
    question: byId('view-question'),
    reveal: byId('view-reveal'),
    end: byId('view-end')
  };
  function show(name) {
    Object.keys(views).forEach(function (k) {
      views[k].classList.toggle('hidden', k !== name);
    });
    window.scrollTo(0, 0);
  }

  // ================= EDITOR =================
  var qList = byId('questions-list');
  var qCounter = 0;

  function answerFieldHtml(qi, ai) {
    return (
      '<div class="ans-field">' +
      '<span class="dot d' + ai + '"></span>' +
      '<input type="text" class="ans-text" placeholder="Răspuns ' + (ai + 1) + '" maxlength="120" />' +
      '<label class="correct-check" title="Corect?"><input type="radio" name="correct-' + qi + '" class="ans-correct" /> ✔</label>' +
      '</div>'
    );
  }

  function addQuestion(prefill) {
    var qi = qCounter++;
    var el = document.createElement('div');
    el.className = 'q-editor';
    el.dataset.qi = qi;
    el.innerHTML =
      '<div class="q-editor-head"><strong>Întrebarea <span class="qnum"></span></strong>' +
      '<button class="btn danger small btn-del">✕</button></div>' +
      '<input type="text" class="q-text-in" placeholder="Scrie întrebarea..." maxlength="300" />' +
      '<div class="inline">' +
        '<div><label>Timp (secunde)</label><input type="number" class="q-time" min="5" max="120" value="20" /></div>' +
        '<div><label>Imagine / GIF (opțional)</label><input type="file" class="q-img" accept="image/*" /></div>' +
      '</div>' +
      '<img class="thumb hidden" />' +
      '<div class="ans-editor">' +
        answerFieldHtml(qi, 0) + answerFieldHtml(qi, 1) +
        answerFieldHtml(qi, 2) + answerFieldHtml(qi, 3) +
      '</div>';
    qList.appendChild(el);

    el.querySelector('.btn-del').addEventListener('click', function () {
      el.remove();
      renumber();
    });

    var imgInput = el.querySelector('.q-img');
    var thumb = el.querySelector('.thumb');
    imgInput.addEventListener('change', function () {
      var file = imgInput.files[0];
      if (!file) { thumb.classList.add('hidden'); el.dataset.image = ''; return; }
      if (file.size > 3 * 1024 * 1024) {
        alert('Imaginea e prea mare (max 3MB). Alege una mai mică.');
        imgInput.value = '';
        return;
      }
      var reader = new FileReader();
      reader.onload = function () {
        el.dataset.image = reader.result;
        thumb.src = reader.result;
        thumb.classList.remove('hidden');
      };
      reader.readAsDataURL(file);
    });

    if (prefill) {
      el.querySelector('.q-text-in').value = prefill.text || '';
      el.querySelector('.q-time').value = prefill.time || 20;
      if (prefill.image) {
        el.dataset.image = prefill.image;
        thumb.src = prefill.image;
        thumb.classList.remove('hidden');
      }
      var texts = el.querySelectorAll('.ans-text');
      var radios = el.querySelectorAll('.ans-correct');
      (prefill.answers || []).forEach(function (a, i) {
        if (texts[i]) texts[i].value = a.text || '';
        if (radios[i] && a.correct) radios[i].checked = true;
      });
    }
    renumber();
  }

  function renumber() {
    var items = qList.querySelectorAll('.q-editor');
    items.forEach(function (it, i) { it.querySelector('.qnum').textContent = i + 1; });
  }

  function collectGame() {
    var title = byId('game-title').value.trim() || 'Quiz';
    var questions = [];
    qList.querySelectorAll('.q-editor').forEach(function (el) {
      var text = el.querySelector('.q-text-in').value.trim();
      var time = parseInt(el.querySelector('.q-time').value, 10) || 20;
      var answers = [];
      var texts = el.querySelectorAll('.ans-text');
      var radios = el.querySelectorAll('.ans-correct');
      texts.forEach(function (t, i) {
        var v = t.value.trim();
        if (v) answers.push({ text: v, correct: radios[i].checked });
      });
      questions.push({ text: text, time: time, answers: answers, image: el.dataset.image || null });
    });
    return { title: title, questions: questions };
  }

  byId('btn-add-q').addEventListener('click', function () { addQuestion(); });

  byId('btn-save').addEventListener('click', function () {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(collectGame()));
    flashEditor('Salvat pe acest telefon ✔', false);
  });
  byId('btn-load').addEventListener('click', function () {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return flashEditor('Nu există niciun joc salvat.', true);
    loadGame(JSON.parse(raw));
  });
  byId('btn-clear').addEventListener('click', function () {
    if (!confirm('Ștergi toate întrebările din editor?')) return;
    qList.innerHTML = ''; byId('game-title').value = ''; qCounter = 0;
    addQuestion();
  });
  byId('btn-sample').addEventListener('click', function () { loadGame(sampleGame()); });

  byId('btn-export').addEventListener('click', function () {
    var game = collectGame();
    var blob = new Blob([JSON.stringify(game, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    var safeName = (game.title || 'quiz').toLowerCase()
      .replace(/[^a-z0-9ăâîșț\- ]/gi, '').trim().replace(/\s+/g, '-') || 'quiz';
    a.href = url;
    a.download = safeName + '.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  });

  byId('btn-import').addEventListener('click', function () { byId('import-file').click(); });
  byId('import-file').addEventListener('change', function () {
    var file = byId('import-file').files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      var game;
      try {
        game = JSON.parse(reader.result);
      } catch (e) {
        flashEditor('Fișierul nu e un JSON valid.', true);
        byId('import-file').value = '';
        return;
      }
      if (!game || !Array.isArray(game.questions) || game.questions.length === 0) {
        flashEditor('Fișierul nu are structura corectă (title + questions).', true);
        byId('import-file').value = '';
        return;
      }
      loadGame(game);
      flashEditor('Quiz importat: ' + game.questions.length + ' întrebări ✔', false);
      byId('import-file').value = '';
    };
    reader.readAsText(file);
  });

  function loadGame(game) {
    qList.innerHTML = ''; qCounter = 0;
    byId('game-title').value = game.title || '';
    (game.questions || []).forEach(function (q) { addQuestion(q); });
    if ((game.questions || []).length === 0) addQuestion();
    flashEditor('', false);
  }

  function flashEditor(msg, isError) {
    var e = byId('editor-error');
    e.textContent = msg;
    e.style.color = isError ? '' : '#26890c';
  }

  byId('btn-create').addEventListener('click', function () {
    var game = collectGame();
    socket.emit('host:create', game, function (res) {
      if (!res.ok) return flashEditor(res.error || 'Eroare la creare.', true);
      state.pin = res.pin;
      state.questionCount = res.questionCount;
      enterLobby(res);
    });
  });

  // ================= LOBBY =================
  function enterLobby(res) {
    byId('lobby-title').textContent = res.title || 'Lobby';
    byId('pin-badge').textContent = res.pin;

    var url = location.protocol + '//' + location.host;
    byId('join-url').textContent = location.host;
    try {
      QRCode.toCanvas(byId('qr'), url + '/play', { width: 220 });
    } catch (e) { /* QR optional */ }

    byId('players-grid').innerHTML = '';
    byId('player-count').textContent = '0';
    byId('btn-start').disabled = true;
    show('lobby');
  }

  socket.on('host:lobby', function (data) {
    byId('player-count').textContent = data.count;
    byId('btn-start').disabled = data.count === 0;
    var grid = byId('players-grid');
    grid.innerHTML = '';
    data.players.forEach(function (p) {
      var chip = document.createElement('div');
      chip.className = 'player-chip' + (p.connected ? '' : ' off');
      chip.textContent = p.name;
      var kick = document.createElement('span');
      kick.className = 'kick';
      kick.textContent = '✕';
      kick.title = 'Elimină';
      kick.addEventListener('click', function () {
        socket.emit('host:kick', { playerId: p.id });
      });
      chip.appendChild(kick);
      grid.appendChild(chip);
    });
  });

  byId('btn-start').addEventListener('click', function () {
    socket.emit('host:start', {}, function (res) {
      if (!res.ok) alert('Nu se poate începe jocul (verifică întrebările).');
    });
  });

  // ================= QUESTION (presenter) =================
  var timerEl = byId('q-timer');
  var currentTime = 0;

  socket.on('game:question', function (data) {
    byId('q-index').textContent = data.index + 1;
    byId('q-total').textContent = data.total;
    byId('q-text').textContent = data.question.text;

    var media = byId('q-media');
    if (data.question.image) {
      media.src = data.question.image;
      media.classList.remove('hidden');
    } else {
      media.classList.add('hidden');
      media.removeAttribute('src');
    }

    currentTime = data.time;
    setTimer(data.time);
    byId('q-progress').style.width = '100%';

    var ans = byId('q-answers');
    ans.innerHTML = '';
    data.question.answers.forEach(function (a, i) {
      var b = document.createElement('div');
      b.className = 'answer a' + i;
      b.innerHTML = '<span class="shape">' + SHAPES[i] + '</span><span>' + escapeHtml(a.text) + '</span>';
      b.dataset.i = i;
      ans.appendChild(b);
    });

    byId('answered').textContent = '0';
    byId('answered-total').textContent = data.totalPlayers;
    byId('btn-pause').textContent = '⏸️ Pauză';
    show('question');
  });

  socket.on('game:timer', function (d) {
    setTimer(d.remaining);
    var pct = currentTime > 0 ? (d.remaining / currentTime) * 100 : 0;
    byId('q-progress').style.width = pct + '%';
  });

  function setTimer(t) {
    timerEl.textContent = t;
    timerEl.classList.toggle('low', t <= 5);
  }

  socket.on('host:answered', function (d) {
    byId('answered').textContent = d.answered;
    byId('answered-total').textContent = d.total;
  });

  socket.on('game:paused', function (d) {
    byId('btn-pause').textContent = d.paused ? '▶️ Reia' : '⏸️ Pauză';
  });

  byId('btn-pause').addEventListener('click', function () {
    if (byId('btn-pause').textContent.indexOf('Reia') >= 0) socket.emit('host:resume');
    else socket.emit('host:pause');
  });
  byId('btn-skip').addEventListener('click', function () { socket.emit('host:skip'); });
  byId('btn-end').addEventListener('click', endGame);
  byId('btn-end2').addEventListener('click', endGame);
  function endGame() { if (confirm('Termini jocul acum?')) socket.emit('host:end'); }

  // ================= REVEAL =================
  socket.on('game:reveal', function (data) {
    byId('reveal-q').textContent = 'Întrebarea ' + (data.index + 1);
    var total = data.distribution.reduce(function (a, b) { return a + b; }, 0);
    var max = Math.max(1, Math.max.apply(null, data.distribution));

    var dist = byId('dist');
    dist.innerHTML = '';
    data.distribution.forEach(function (count, i) {
      var wrap = document.createElement('div');
      wrap.className = 'bar-wrap';
      var isCorrect = data.correctIndexes.indexOf(i) >= 0;
      wrap.innerHTML =
        '<div class="bar-check">' + (isCorrect ? '✅' : '') + '</div>' +
        '<div class="bar-val">' + count + '</div>' +
        '<div class="bar b' + i + '" style="height:0%"></div>' +
        '<div style="color:#fff;margin-top:6px;font-size:1.3rem">' + SHAPES[i] + '</div>';
      dist.appendChild(wrap);
      // animate
      var bar = wrap.querySelector('.bar');
      setTimeout(function () { bar.style.height = (count / max) * 100 + '%'; }, 30);
    });

    byId('reveal-summary').textContent =
      data.correctCount + ' din ' + total + ' au răspuns corect.';

    renderLeaderboard(byId('leaderboard'), data.leaderboard);
    show('reveal');
  });

  byId('btn-next').addEventListener('click', function () { socket.emit('host:next'); });

  // ================= END =================
  socket.on('game:ended', function (data) {
    var pod = byId('podium');
    pod.innerHTML = '';
    var medals = ['🥇', '🥈', '🥉'];
    var order = [1, 0, 2]; // visual order: 2nd, 1st, 3rd
    order.forEach(function (idx) {
      var p = data.podium[idx];
      if (!p) return;
      var el = document.createElement('div');
      el.className = 'pod p' + (idx + 1);
      el.innerHTML =
        '<div class="medal">' + medals[idx] + '</div>' +
        '<div class="pn">' + escapeHtml(p.name) + '</div>' +
        '<div class="ps">' + p.score + '</div>';
      pod.appendChild(el);
    });

    var stats = byId('full-stats');
    stats.innerHTML = '';
    data.stats.forEach(function (s) {
      var row = document.createElement('div');
      row.className = 'lb-row';
      row.innerHTML =
        '<span class="lb-rank">' + s.rank + '</span>' +
        '<span class="lb-name">' + escapeHtml(s.name) + '</span>' +
        '<span class="muted">' + s.correct + '/' + s.total + ' corecte</span>' +
        '<span class="lb-score">' + s.score + '</span>';
      stats.appendChild(row);
    });
    show('end');
  });

  byId('btn-again').addEventListener('click', function () { location.reload(); });

  // ---- helpers --------------------------------------------------------
  function renderLeaderboard(container, list) {
    container.innerHTML = '';
    list.forEach(function (p) {
      var row = document.createElement('div');
      row.className = 'lb-row';
      row.innerHTML =
        '<span class="lb-rank">' + p.rank + '</span>' +
        '<span class="lb-name">' + escapeHtml(p.name) +
        (p.streak > 1 ? ' <small>🔥' + p.streak + '</small>' : '') + '</span>' +
        '<span class="lb-score">' + p.score + '</span>';
      container.appendChild(row);
    });
    if (list.length === 0) container.innerHTML = '<p class="muted">Niciun jucător.</p>';
  }

  function byId(id) { return document.getElementById(id); }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function sampleGame() {
    return {
      title: 'Quiz demonstrativ',
      questions: [
        { text: 'Care este capitala României?', time: 20, answers: [
          { text: 'Cluj-Napoca', correct: false }, { text: 'București', correct: true },
          { text: 'Iași', correct: false }, { text: 'Timișoara', correct: false }] },
        { text: 'Cât fac 7 × 8?', time: 15, answers: [
          { text: '54', correct: false }, { text: '56', correct: true },
          { text: '64', correct: false }, { text: '48', correct: false }] },
        { text: 'Ce planetă este cunoscută ca "Planeta Roșie"?', time: 20, answers: [
          { text: 'Venus', correct: false }, { text: 'Jupiter', correct: false },
          { text: 'Marte', correct: true }, { text: 'Saturn', correct: false }] }
      ]
    };
  }

  // Start with one empty question.
  addQuestion();
})();
