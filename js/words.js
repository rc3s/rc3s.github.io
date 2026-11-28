/* Words page: reads data/words.csv and draws it.

   Columns: word, status, meaning, why, where_found, date_added, date_kept, note
   status is "new" or "kept". Dates are YYYY-MM-DD, or "legacy" for words
   added before dates were tracked.

   A row it can't read is skipped and named in a message; the rest of the
   list still shows. A missing or empty file gets a plain message, never a
   blank page. All text goes in with textContent, never innerHTML, so
   nothing in the CSV can inject markup. */

(function () {
  'use strict';

  var COLS = ['word', 'status', 'meaning', 'why', 'where_found', 'date_added', 'date_kept', 'note'];

  /* ---------- CSV ---------- */

  // Returns [{ fields: [...], line: n, error?: '...' }]. Handles quoted
  // fields, doubled quotes, commas and line breaks inside quotes, CRLF, a
  // leading byte-order mark, and blank lines (skipped).
  function parseCSV(text) {
    if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
    var records = [];
    var row = [];
    var field = '';
    var inQuotes = false;
    var line = 1;
    var recLine = 1;
    var quoteLine = 0;

    for (var i = 0; i < text.length; i++) {
      var c = text[i];
      if (inQuotes) {
        if (c === '"') {
          if (text[i + 1] === '"') { field += '"'; i++; }
          else inQuotes = false;
        } else {
          if (c === '\n') line++;
          field += c;
        }
        continue;
      }
      if (c === '"' && field === '') {
        inQuotes = true;
        quoteLine = line;
      } else if (c === ',') {
        row.push(field);
        field = '';
      } else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(field);
        field = '';
        if (!(row.length === 1 && row[0] === '')) records.push({ fields: row, line: recLine });
        row = [];
        line++;
        recLine = line;
      } else {
        field += c;
      }
    }

    if (inQuotes) {
      records.push({
        fields: [],
        line: recLine,
        error: 'a quote opened on line ' + quoteLine + ' is never closed, so everything after it was skipped'
      });
    } else if (field !== '' || row.length) {
      row.push(field);
      records.push({ fields: row, line: recLine });
    }
    return records;
  }

  function isDate(s) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
    var d = new Date(s + 'T00:00:00Z');
    return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
  }

  // Turns parsed records into words. Returns { words, problems } or { error }.
  function toWords(records) {
    if (!records.length) return { error: 'The file is empty.' };
    var header = records[0].fields.map(function (h) { return h.trim().toLowerCase(); });
    var missing = COLS.filter(function (c) { return header.indexOf(c) === -1; });
    if (missing.length) {
      return { error: 'The header row is missing ' + (missing.length > 1 ? 'columns' : 'the column') + ': ' + missing.join(', ') + '.' };
    }
    var idx = {};
    COLS.forEach(function (c) { idx[c] = header.indexOf(c); });

    var words = [];
    var problems = [];
    records.slice(1).forEach(function (rec, n) {
      function bad(msg) { problems.push({ line: rec.line, msg: msg }); }
      if (rec.error) return bad(rec.error);
      if (rec.fields.length !== header.length) {
        return bad('expected ' + header.length + ' columns but found ' + rec.fields.length);
      }
      function get(c) { return rec.fields[idx[c]].trim(); }

      var word = get('word');
      if (!word) return bad('the word is empty');

      var status = get('status').toLowerCase();
      if (status !== 'new' && status !== 'kept') {
        return bad('status must be new or kept, not "' + get('status') + '"');
      }

      var added = get('date_added').toLowerCase();
      if (added === '') added = 'legacy';
      if (added !== 'legacy' && !isDate(added)) {
        return bad('date_added must be YYYY-MM-DD or legacy, not "' + get('date_added') + '"');
      }

      var kept = get('date_kept').toLowerCase();
      if (kept !== '' && kept !== 'legacy' && !isDate(kept)) {
        return bad('date_kept must be YYYY-MM-DD, legacy or blank, not "' + get('date_kept') + '"');
      }

      words.push({
        word: word,
        status: status,
        meaning: get('meaning'),
        why: get('why'),
        where: get('where_found'),
        added: added,
        kept: kept,
        note: get('note'),
        index: n
      });
    });
    return { words: words, problems: problems };
  }

  /* ---------- Helpers ---------- */

  // Lowercase, accents removed, ae for the ligature, so "Blasé" matches "blase".
  function norm(s) {
    return s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/æ/gi, 'ae').toLowerCase();
  }

  function letterOf(word) {
    var ch = norm(word).charAt(0).toUpperCase();
    return /[A-Z]/.test(ch) ? ch : '#';
  }

  function byWord(a, b) {
    return norm(a.word).localeCompare(norm(b.word));
  }

  function monthYear(iso) {
    return new Date(iso + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  }

  function realDate(s) {
    return s && s !== 'legacy';
  }

  // Newest real dates first; words without a real date follow, and within
  // the same date a later row in the file counts as newer.
  function recentTen(words) {
    return words.slice().sort(function (a, b) {
      var da = realDate(a.added) ? a.added : '';
      var db = realDate(b.added) ? b.added : '';
      if (da !== db) return da < db ? 1 : -1;
      return b.index - a.index;
    }).slice(0, 10);
  }

  function hasDetail(w) {
    return !!(w.meaning || w.why || w.where || w.note || realDate(w.added) || realDate(w.kept));
  }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text) e.textContent = text;
    return e;
  }

  /* ---------- Page ---------- */

  var root = document.getElementById('words');
  if (!root) return;

  var src = root.getAttribute('data-src');
  var fileName = src.split('/').pop();
  var statusEl = document.getElementById('words-status');
  var problemsEl = document.getElementById('words-problems');
  var app = document.getElementById('words-app');
  var allWords = [];
  var state = { status: 'all', letter: '', q: '' };
  var uid = 0;

  function showError(msg) {
    statusEl.textContent = msg;
    statusEl.setAttribute('role', 'alert');
    app.hidden = true;
  }

  function showProblems(problems) {
    problemsEl.textContent = '';
    if (!problems.length) return;
    var d = el('details', 'problems');
    d.open = true;
    d.appendChild(el('summary', '', problems.length + (problems.length === 1 ? ' row in ' : ' rows in ') + fileName + ' could not be read and ' + (problems.length === 1 ? 'was' : 'were') + ' skipped'));
    var ul = el('ul');
    problems.slice(0, 10).forEach(function (p) {
      ul.appendChild(el('li', '', 'Line ' + p.line + ': ' + p.msg + '.'));
    });
    if (problems.length > 10) ul.appendChild(el('li', '', 'And ' + (problems.length - 10) + ' more.'));
    d.appendChild(ul);
    problemsEl.appendChild(d);
  }

  function buildCard(w) {
    var card = el('div', 'card');
    if (w.meaning) card.appendChild(el('p', 'card-meaning', w.meaning));
    if (w.why) card.appendChild(el('p', 'card-meta', 'Why: ' + w.why));
    if (w.where) card.appendChild(el('p', 'card-meta', 'Found in: ' + w.where));
    if (w.note) card.appendChild(el('p', 'card-meta', 'Note: ' + w.note));
    var dates = [];
    if (realDate(w.added)) dates.push('Found ' + monthYear(w.added));
    if (realDate(w.kept)) dates.push('Kept ' + monthYear(w.kept));
    if (!dates.length) dates.push('Added before dates were tracked');
    card.appendChild(el('p', 'card-meta card-dates', dates.join(' · ')));
    return card;
  }

  function wordItem(w) {
    var li = el('li', 'word-item');
    if (w.word.length > 13) li.classList.add('long');

    if (!hasDetail(w)) {
      li.appendChild(el('span', 'word', w.word));
      return li;
    }

    var id = 'card-' + (++uid);
    var btn = el('button', 'word', w.word);
    btn.type = 'button';
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-controls', id);
    li.appendChild(btn);

    // Quiet preview on desktop hover or keyboard focus. The same text is in
    // the card, so it is hidden from screen readers to avoid reading it twice.
    if (w.meaning) {
      var peek = el('span', 'peek', w.meaning);
      peek.setAttribute('aria-hidden', 'true');
      li.appendChild(peek);
    }

    var card = buildCard(w);
    card.id = id;
    card.hidden = true;
    li.appendChild(card);

    function setOpen(open) {
      card.hidden = !open;
      btn.setAttribute('aria-expanded', String(open));
      li.classList.toggle('open', open);
    }
    btn.addEventListener('click', function () { setOpen(card.hidden); });
    li.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !card.hidden) { setOpen(false); btn.focus(); }
    });
    return li;
  }

  function fillList(ul, words) {
    ul.textContent = '';
    words.forEach(function (w) { ul.appendChild(wordItem(w)); });
  }

  function buildLetters() {
    var box = document.getElementById('letters');
    var present = {};
    allWords.forEach(function (w) { present[letterOf(w.word)] = true; });
    var letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ#'.split('').filter(function (l) { return present[l]; });
    var all = el('button', 'btn letter', 'All');
    all.type = 'button';
    all.setAttribute('data-letter', '');
    box.appendChild(all);
    letters.forEach(function (l) {
      var b = el('button', 'btn letter', l);
      b.type = 'button';
      b.setAttribute('data-letter', l);
      box.appendChild(b);
    });
  }

  var current = []; // words currently shown, used by Random

  function render() {
    var q = norm(state.q.trim());
    var base = allWords.filter(function (w) {
      if (state.status !== 'all' && w.status !== state.status) return false;
      return !q || norm(w.word).indexOf(q) !== -1 || norm(w.meaning).indexOf(q) !== -1;
    });

    var avail = {};
    base.forEach(function (w) { avail[letterOf(w.word)] = true; });
    if (state.letter && !avail[state.letter]) state.letter = '';

    var shown = base.filter(function (w) { return !state.letter || letterOf(w.word) === state.letter; });
    current = shown;

    // Button states
    Array.prototype.forEach.call(document.querySelectorAll('[data-status]'), function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-status') === state.status));
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-letter]'), function (b) {
      var l = b.getAttribute('data-letter');
      b.setAttribute('aria-pressed', String(l === state.letter));
      b.disabled = l !== '' && !avail[l];
    });

    // Recently added shows only on the unfiltered view.
    var unfiltered = state.status === 'all' && !state.letter && !q;
    document.getElementById('recent-section').hidden = !unfiltered;
    if (unfiltered) fillList(document.getElementById('recent'), recentTen(allWords));
    else document.getElementById('recent').textContent = '';

    var newWords = shown.filter(function (w) { return w.status === 'new'; }).sort(byWord);
    var keptWords = shown.filter(function (w) { return w.status === 'kept'; }).sort(byWord);

    document.getElementById('new-section').hidden = !newWords.length;
    document.getElementById('new-count').textContent = newWords.length;
    fillList(document.getElementById('new-list'), newWords);

    document.getElementById('kept-section').hidden = !keptWords.length;
    document.getElementById('kept-count').textContent = keptWords.length;
    var groups = document.getElementById('kept-groups');
    groups.textContent = '';
    var lastLetter = null;
    var ul = null;
    keptWords.forEach(function (w) {
      var l = letterOf(w.word);
      if (l !== lastLetter) {
        var sec = el('div', 'letter-group');
        sec.appendChild(el('h3', '', l));
        ul = el('ul', 'word-list');
        sec.appendChild(ul);
        groups.appendChild(sec);
        lastLetter = l;
      }
      ul.appendChild(wordItem(w));
    });

    document.getElementById('empty').hidden = shown.length > 0;
  }

  function showRandom() {
    var box = document.getElementById('random-result');
    box.textContent = '';
    if (!current.length) return;
    var w = current[Math.floor(Math.random() * current.length)];
    var card = el('div', 'card random-card');
    card.appendChild(el('p', 'random-word', w.word));
    if (w.meaning) card.appendChild(el('p', 'card-meaning', w.meaning));
    box.appendChild(card);
  }

  function wire() {
    document.getElementById('q').addEventListener('input', function (e) {
      state.q = e.target.value;
      render();
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-status]'), function (b) {
      b.addEventListener('click', function () {
        state.status = b.getAttribute('data-status');
        render();
      });
    });
    document.getElementById('letters').addEventListener('click', function (e) {
      var b = e.target.closest('[data-letter]');
      if (!b || b.disabled) return;
      state.letter = b.getAttribute('data-letter');
      render();
    });
    document.getElementById('random').addEventListener('click', showRandom);
  }

  function init(text) {
    var result = toWords(parseCSV(text));
    if (result.error) return showError("Can't show the list: " + fileName + ' is not usable. ' + result.error);
    allWords = result.words;
    showProblems(result.problems);
    if (!allWords.length) return showError('No words to show yet: ' + fileName + ' has no readable rows.');
    statusEl.textContent = '';
    buildLetters();
    wire();
    render();
    app.hidden = false;
  }

  fetch(src, { cache: 'no-cache' })
    .then(function (r) {
      if (!r.ok) throw new Error('the server answered ' + r.status);
      return r.text();
    })
    .then(init)
    .catch(function (err) {
      showError("Can't show the list: " + fileName + ' could not be loaded (' + err.message + ').');
    });
})();
