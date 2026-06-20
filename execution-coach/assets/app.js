(function () {
  const STORAGE_KEY = 'execution-coach:conversation';
  const STATS_KEY = 'execution-coach:stats';

  const chatMessages = document.getElementById('chatMessages');
  const chatScroll = document.getElementById('chatScroll');
  const chatInput = document.getElementById('chatInput');
  const sendBtn = document.getElementById('sendBtn');
  const apiWarning = document.getElementById('apiWarning');
  const resetBtn = document.getElementById('resetBtn');
  const resetBtn2 = document.getElementById('resetBtn2');

  const statStarted = document.getElementById('statStarted');
  const statExchanges = document.getElementById('statExchanges');
  const statSprints = document.getElementById('statSprints');

  const sprintIdle = document.getElementById('sprintIdle');
  const sprintActive = document.getElementById('sprintActive');
  const sprintTime = document.getElementById('sprintTime');
  const sprintCancelBtn = document.getElementById('sprintCancel');

  const OPENING_MESSAGE =
    "I'm your execution coach. Not here to motivate you — here to make sure you finish things.\n\nTell me one thing you've been putting off, and how long you've been avoiding it.";

  let history = [];
  let stats = { started: Date.now(), exchanges: 0, sprints: 0 };
  let sprintInterval = null;

  // ---------- persistence ----------
  function loadState() {
    try {
      const savedHistory = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      const savedStats = JSON.parse(localStorage.getItem(STATS_KEY) || 'null');
      if (savedHistory && savedHistory.length) history = savedHistory;
      if (savedStats) stats = savedStats;
    } catch (e) { /* ignore corrupt state */ }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  }

  // ---------- rendering ----------
  function renderMessages() {
    chatMessages.innerHTML = '';
    if (history.length === 0) {
      appendBubble('coach', OPENING_MESSAGE, false);
    } else {
      history.forEach(m => appendBubble(m.role === 'user' ? 'user' : 'coach', m.content, false));
    }
    chatScroll.scrollTop = chatScroll.scrollHeight;
  }

  function appendBubble(role, text, scroll = true) {
    const row = document.createElement('div');
    row.className = 'msg ' + role;
    const bubble = document.createElement('div');
    bubble.className = 'msg-bubble';
    const label = document.createElement('span');
    label.className = 'msg-label';
    label.textContent = role === 'user' ? 'You' : 'Coach';
    bubble.appendChild(label);
    bubble.appendChild(document.createTextNode(text));
    row.appendChild(bubble);
    chatMessages.appendChild(row);
    if (scroll) chatScroll.scrollTop = chatScroll.scrollHeight;
    return row;
  }

  function showTyping() {
    const row = document.createElement('div');
    row.className = 'msg coach';
    row.id = 'typingRow';
    row.innerHTML = '<div class="msg-bubble"><span class="msg-label">Coach</span><div class="typing"><span></span><span></span><span></span></div></div>';
    chatMessages.appendChild(row);
    chatScroll.scrollTop = chatScroll.scrollHeight;
  }
  function hideTyping() {
    const row = document.getElementById('typingRow');
    if (row) row.remove();
  }

  function renderStats() {
    const d = new Date(stats.started);
    statStarted.textContent = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    statExchanges.textContent = stats.exchanges;
    statSprints.textContent = stats.sprints;
  }

  // ---------- sending ----------
  async function sendMessage(text) {
    if (!text.trim()) return;
    history.push({ role: 'user', content: text });
    appendBubble('user', text);
    saveState();
    chatInput.value = '';
    chatInput.style.height = 'auto';
    sendBtn.disabled = true;
    showTyping();

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history })
      });
      if (!res.ok) throw new Error('Bad response: ' + res.status);
      const data = await res.json();
      hideTyping();
      const reply = data.reply || "I didn't get a usable response from the backend. Check the server logs.";
      history.push({ role: 'assistant', content: reply });
      appendBubble('coach', reply);
      apiWarning.classList.remove('show');
      stats.exchanges += 1;
      saveState();
      renderStats();
    } catch (err) {
      hideTyping();
      apiWarning.classList.add('show');
      const fallback =
        "(No backend response — this device can't reach /api/chat. Deploy with an ANTHROPIC_API_KEY set, per README.md, then try again.)";
      appendBubble('coach', fallback);
    } finally {
      sendBtn.disabled = false;
    }
  }

  sendBtn.addEventListener('click', () => sendMessage(chatInput.value));
  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(chatInput.value);
    }
  });
  chatInput.addEventListener('input', () => {
    chatInput.style.height = 'auto';
    chatInput.style.height = Math.min(chatInput.scrollHeight, 140) + 'px';
  });

  // ---------- reset ----------
  function resetSession() {
    if (!confirm('Clear this conversation and start over?')) return;
    history = [];
    stats = { started: Date.now(), exchanges: 0, sprints: stats.sprints };
    saveState();
    renderMessages();
    renderStats();
  }
  resetBtn.addEventListener('click', resetSession);
  resetBtn2.addEventListener('click', resetSession);

  // ---------- focus sprint ----------
  function startSprint(minutes) {
    let remaining = minutes * 60;
    sprintIdle.style.display = 'none';
    sprintActive.style.display = 'block';

    function render() {
      const m = Math.floor(remaining / 60);
      const s = remaining % 60;
      sprintTime.textContent = String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
    }
    render();

    sprintInterval = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        clearInterval(sprintInterval);
        sprintInterval = null;
        stats.sprints += 1;
        saveState();
        renderStats();
        endSprint();
        sendMessage('[Focus sprint complete — ' + minutes + ' minutes. Reporting back.]');
        return;
      }
      render();
    }, 1000);

    sendMessage('[Starting a ' + minutes + '-minute focus sprint.]');
  }

  function endSprint() {
    sprintActive.style.display = 'none';
    sprintIdle.style.display = 'block';
  }

  document.querySelectorAll('.sprint-btn').forEach(btn => {
    btn.addEventListener('click', () => startSprint(parseInt(btn.dataset.min, 10)));
  });
  sprintCancelBtn.addEventListener('click', () => {
    if (sprintInterval) clearInterval(sprintInterval);
    sprintInterval = null;
    endSprint();
  });

  // ---------- init ----------
  loadState();
  renderMessages();
  renderStats();
})();
