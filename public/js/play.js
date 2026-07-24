'use strict';

/*
 * Player controller: join, answer pad, per-round result, final screen.
 * Supports automatic reconnection (phone screen sleep / tab backgrounded).
 */

(function () {
  var socket = io();
  var SHAPES = ['▲', '◆', '●', '■', '★', '✚'];
  var SESSION_KEY = 'kahoot_offline_player';

  var me = { pin: null, name: null, playerId: null, answered: false };
  var currentTime = 0;

  var views = {
    join: byId('view-join'),
    wait: byId('view-wait'),
    answer: byId('view-answer'),
    result: byId('view-result'),
    final: byId('view-final'),
    kicked: byId('view-kicked')
  };
  function show(name) {
    Object.keys(views).forEach(function (k) {
      views[k].classList.toggle('hidden', k !== name);
    });
    window.scrollTo(0, 0);
  }

  // Prefill PIN from ?pin= or #pin (e.g. from a QR that encodes it).
  var params = new URLSearchParams(location.search);
  if (params.get('pin')) byId('pin').value = params.get('pin');

  // ---- JOIN -----------------------------------------------------------
  byId('btn-join').addEventListener('click', doJoin);
  byId('name').addEventListener('keydown', function (e) { if (e.key === 'Enter') doJoin(); });

  function doJoin() {
    var pin = byId('pin').value.trim();
    var name = byId('name').value.trim();
    if (pin.length < 4) return joinError('Introdu PIN-ul complet.');
    if (!name) return joinError('Introdu numele tău.');

    joinError('');
    byId('btn-join').disabled = true;

    socket.emit('player:join', { pin: pin, name: name }, function (res) {
      byId('btn-join').disabled = false;
      if (!res.ok) return joinError(res.error || 'Nu s-a putut intra.');
      me.pin = pin; me.name = res.name; me.playerId = res.playerId;
      saveSession();
      byId('my-name').textContent = res.name;
      if (res.question) renderQuestion(res.question);
      else show('wait');
    });
  }

  function joinError(msg) { byId('join-error').textContent = msg; }

  // ---- Reconnect ------------------------------------------------------
  socket.on('connect', function () {
    // If we already had a session and the socket reconnected, try to reclaim.
    if (me.pin && me.name) {
      socket.emit('player:rejoin', { pin: me.pin, name: me.name }, function (res) {
        if (res && res.ok) {
          me.playerId = res.playerId;
          if (res.question) renderQuestion(res.question);
          else if (!isVisible('answer') && !isVisible('result') && !isVisible('final')) show('wait');
        }
      });
    } else {
      // Attempt restore from a previous page load.
      var saved = loadSession();
      if (saved) {
        me.pin = saved.pin; me.name = saved.name;
        socket.emit('player:rejoin', { pin: saved.pin, name: saved.name }, function (res) {
          if (res && res.ok) {
            me.playerId = res.playerId;
            byId('my-name').textContent = saved.name;
            if (res.question) renderQuestion(res.question);
            else show('wait');
          } else {
            clearSession();
          }
        });
      }
    }
  });

  // ---- QUESTION -------------------------------------------------------
  socket.on('game:question', function (data) {
    renderQuestion(data);
  });

  function renderQuestion(data) {
    me.answered = data.answered || false;
    byId('p-index').textContent = data.index + 1;
    byId('p-total').textContent = data.total;
    byId('p-qtext').textContent = data.question.text;

    currentTime = data.time;
    setTimer(data.remaining != null ? data.remaining : data.time);

    var wrap = byId('p-answers');
    wrap.innerHTML = '';
    data.question.answers.forEach(function (a, i) {
      var b = document.createElement('button');
      b.className = 'answer a' + i;
      b.innerHTML = '<span class="shape">' + SHAPES[i] + '</span>';
      b.addEventListener('click', function () { sendAnswer(i, b); });
      wrap.appendChild(b);
    });

    byId('p-locked').classList.toggle('hidden', !me.answered);
    if (me.answered) lockAnswers();
    show('answer');
  }

  function sendAnswer(i, btn) {
    if (me.answered) return;
    me.answered = true;
    lockAnswers();
    btn.classList.add('chosen');
    byId('p-locked').classList.remove('hidden');
    if (navigator.vibrate) navigator.vibrate(30);
    socket.emit('player:answer', { choice: i }, function () {});
  }

  function lockAnswers() {
    var btns = byId('p-answers').querySelectorAll('.answer');
    btns.forEach(function (b) { b.disabled = true; b.classList.add('dim'); });
  }

  socket.on('game:timer', function (d) { setTimer(d.remaining); });
  function setTimer(t) {
    var el = byId('p-timer');
    el.textContent = t;
    el.classList.toggle('low', t <= 5);
  }

  socket.on('game:paused', function (d) {
    byId('p-timer').textContent = d.paused ? '⏸' : byId('p-timer').textContent;
  });

  // ---- RESULT ---------------------------------------------------------
  socket.on('player:reveal', function (data) {
    var splash = byId('result-splash');
    if (!data.answered) {
      splash.className = 'splash bad';
      byId('result-title').textContent = '⏱️ Fără răspuns';
      byId('result-points').textContent = '+0';
    } else if (data.correct) {
      splash.className = 'splash good';
      byId('result-title').textContent = '✅ Corect!';
      byId('result-points').textContent = '+' + data.points + ' puncte' +
        (data.streak > 1 ? '  🔥' + data.streak : '');
    } else {
      splash.className = 'splash bad';
      byId('result-title').textContent = '❌ Greșit';
      byId('result-points').textContent = '+0';
    }
    byId('result-rank').textContent =
      'Locul ' + (data.rank || '-') + ' din ' + data.totalPlayers +
      ' • ' + data.totalScore + ' puncte';
    show('result');
  });

  // ---- END ------------------------------------------------------------
  socket.on('player:ended', function (data) {
    clearSession();
    byId('final-emoji').textContent = data.rank === 1 ? '🥇' : data.rank <= 3 ? '🏅' : '🎉';
    byId('final-place').textContent = 'Locul ' + data.rank;
    byId('final-score').textContent = data.score + ' puncte';
    byId('final-correct').textContent = data.correct + ' din ' + data.total + ' răspunsuri corecte';

    var pod = byId('final-podium');
    pod.innerHTML = '';
    var medals = ['🥇', '🥈', '🥉'];
    (data.podium || []).forEach(function (p, i) {
      var row = document.createElement('div');
      row.className = 'lb-row';
      row.innerHTML = '<span class="lb-rank">' + medals[i] + '</span>' +
        '<span class="lb-name">' + escapeHtml(p.name) + '</span>' +
        '<span class="lb-score">' + p.score + '</span>';
      pod.appendChild(row);
    });
    show('final');
  });

  socket.on('player:kicked', function () {
    clearSession();
    byId('kicked-msg').textContent = 'Ai fost eliminat din joc.';
    show('kicked');
  });

  byId('btn-replay').addEventListener('click', function () { clearSession(); location.href = '/'; });

  // ---- session persistence -------------------------------------------
  function saveSession() {
    try { sessionStorage.setItem(SESSION_KEY, JSON.stringify({ pin: me.pin, name: me.name })); } catch (e) {}
  }
  function loadSession() {
    try { return JSON.parse(sessionStorage.getItem(SESSION_KEY)); } catch (e) { return null; }
  }
  function clearSession() { try { sessionStorage.removeItem(SESSION_KEY); } catch (e) {} }

  // ---- helpers --------------------------------------------------------
  function isVisible(name) { return !views[name].classList.contains('hidden'); }
  function byId(id) { return document.getElementById(id); }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
})();
