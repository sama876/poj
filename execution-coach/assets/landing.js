// ---- Hero countdown timer: cycles through micro-tasks like the real coach would assign ----
(function(){
  const tasks = [
    { seconds: 5 * 60,  text: "Open the doc and write one sentence." },
    { seconds: 10 * 60, text: "Send the first email you've been putting off." },
    { seconds: 7 * 60,  text: "Open your code editor and fix one bug." },
    { seconds: 12 * 60, text: "Draft the outline. Bullet points only." },
    { seconds: 5 * 60,  text: "Make the phone call. Just dial." }
  ];

  const displayEl = document.getElementById('timerDisplay');
  const taskEl = document.getElementById('timerTask');
  const statusEl = document.getElementById('timerStatus');
  const barFill = document.getElementById('timerBarFill');
  const bar = document.getElementById('timerBar');

  if (!displayEl) return;

  let taskIndex = 0;
  let remaining = tasks[0].seconds;
  let total = tasks[0].seconds;

  function format(s){
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return String(m).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
  }

  function render(){
    displayEl.textContent = format(remaining);
    barFill.style.width = Math.max(0, (remaining / total) * 100) + '%';
  }

  function nextTask(){
    displayEl.classList.add('done');
    bar.classList.add('done');
    statusEl.textContent = 'Report progress';
    displayEl.textContent = "DONE?";
    setTimeout(() => {
      taskIndex = (taskIndex + 1) % tasks.length;
      remaining = tasks[taskIndex].seconds;
      total = tasks[taskIndex].seconds;
      taskEl.textContent = tasks[taskIndex].text;
      statusEl.textContent = 'In progress';
      displayEl.classList.remove('done');
      bar.classList.remove('done');
      render();
    }, 1800);
  }

  taskEl.textContent = tasks[0].text;
  render();

  setInterval(() => {
    if (remaining <= 0){
      nextTask();
      return;
    }
    remaining -= 1;
    render();
  }, 1000);
})();

// ---- Diagnostic chips: light up one at a time on scroll into view ----
(function(){
  const grid = document.getElementById('diagGrid');
  if (!grid) return;
  const chips = Array.from(grid.querySelectorAll('.diag-chip'));

  let lit = false;
  function lightUp(){
    if (lit) return;
    lit = true;
    chips.forEach((chip, i) => {
      setTimeout(() => chip.classList.add('lit'), i * 110);
    });
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) lightUp();
    });
  }, { threshold: 0.3 });

  observer.observe(grid);
})();
