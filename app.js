/* =========================================
   NIROO PLANNER — JavaScript
   All data via localStorage
   ========================================= */

// ---- State ----
const STATE = {
  routine: [],
  weekly: {},
  targets: [],
  special: [],
  thoughts: [],
};

// ---- Quotes ----
const QUOTES = [
  '"You\'ve got this 💖"',
  '"Be your own sunshine ☀️"',
  '"Small steps, big results 🌸"',
  '"Today is your masterpiece ✨"',
  '"Grow through what you go through 🌿"',
  '"You are enough, always 💫"',
  '"Your dreams are valid 🌙"',
];

// ---- Helpers ----
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);
const uid = () => '_' + Math.random().toString(36).slice(2, 9);

function save() {
  localStorage.setItem('niroo_planner_v2', JSON.stringify(STATE));
  // Snapshot runs after current render cycle finishes — never blocks UI
  setTimeout(() => {
    if (typeof saveSnapshot === 'function') saveSnapshot();
  }, 0);
}

function load() {
  const raw = localStorage.getItem('niroo_planner_v2');
  if (raw) {
    try {
      const data = JSON.parse(raw);
      Object.assign(STATE, data);
    } catch (e) {}
  }
  // Ensure weekly has all days
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  days.forEach(d => { if (!STATE.weekly[d]) STATE.weekly[d] = []; });
}

function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2800);
}

function formatTime(t) {
  if (!t) return '';
  const [h, m] = t.split(':');
  const hr = +h;
  const suffix = hr >= 12 ? 'PM' : 'AM';
  const display = ((hr % 12) || 12) + ':' + m + ' ' + suffix;
  return display;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function daysUntil(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + 'T00:00:00');
  const diff = Math.round((target - today) / 86400000);
  if (diff === 0) return '🎉 Today!';
  if (diff < 0) return `${Math.abs(diff)} days ago`;
  if (diff === 1) return 'Tomorrow!';
  return `in ${diff} days`;
}

function playDone() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const notes = [523, 659, 784];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.12);
      gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + i * 0.12 + 0.04);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + i * 0.12 + 0.25);
      osc.start(ctx.currentTime + i * 0.12);
      osc.stop(ctx.currentTime + i * 0.12 + 0.3);
    });
  } catch (e) {}
}

// ---- Navigation ----
function navigate(page) {
  $$('.page').forEach(p => p.classList.remove('active'));
  $$('.nav-link').forEach(l => l.classList.remove('active'));
  const pageEl = $(`#page-${page}`);
  if (pageEl) pageEl.classList.add('active');
  const link = $(`.nav-link[data-page="${page}"]`);
  if (link) link.classList.add('active');
  // Close sidebar on mobile
  $('#sidebar').classList.remove('open');
  $('#sideOverlay').classList.remove('open');
}

// ---- Progress Circles ----
function updateCircle(fillId, pctId, percent) {
  const fill = $(`#${fillId}`);
  const pct = $(`#${pctId}`);
  if (!fill || !pct) return;
  const circumference = 176;
  const offset = circumference - (percent / 100) * circumference;
  fill.style.strokeDashoffset = offset;
  pct.textContent = Math.round(percent) + '%';
}

function calcPercent(items) {
  if (!items || items.length === 0) return 0;
  const done = items.filter(i => i.done).length;
  return (done / items.length) * 100;
}

function updateAllStats() {
  // Routine
  updateCircle('fillRoutine', 'pctRoutine', calcPercent(STATE.routine));
  // Weekly (all tasks)
  const allWeekly = Object.values(STATE.weekly).flat();
  updateCircle('fillWeekly', 'pctWeekly', calcPercent(allWeekly));
  // Targets
  if (STATE.targets.length === 0) {
    updateCircle('fillTargets', 'pctTargets', 0);
  } else {
    const achieved = STATE.targets.filter(t => t.achieved).length;
    updateCircle('fillTargets', 'pctTargets', (achieved / STATE.targets.length) * 100);
  }
}

// ---- Home Dashboard ----
function renderHome() {
  updateAllStats();

  // Today's tasks preview
  const el = $('#homeTodayTasks');
  if (STATE.routine.length === 0) {
    el.innerHTML = '<div class="empty-state-sm">No tasks yet 🌸 Add some!</div>';
  } else {
    const sorted = [...STATE.routine].sort((a, b) => (a.start || '').localeCompare(b.start || ''));
    el.innerHTML = sorted.slice(0, 4).map(t => `
      <div class="dash-task-item ${t.done ? 'done' : ''}">
        <span>${t.done ? '✅' : '⭕'}</span>
        <span>${t.name}</span>
        ${t.start ? `<span style="margin-left:auto;font-size:0.78rem;color:var(--text3)">${formatTime(t.start)}</span>` : ''}
      </div>
    `).join('');
  }

  // Upcoming special days
  const specialEl = $('#homeSpecialDays');
  const upcoming = STATE.special
    .filter(s => new Date(s.date + 'T00:00:00') >= new Date(new Date().setHours(0,0,0,0)))
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 3);
  if (upcoming.length === 0) {
    specialEl.innerHTML = '<div class="empty-state-sm">Nothing upcoming 💫 Add events!</div>';
  } else {
    specialEl.innerHTML = upcoming.map(s => `
      <div class="dash-task-item">
        <span>✨</span>
        <span>${s.title}</span>
        <span style="margin-left:auto;font-size:0.78rem;color:var(--pink-500)">${daysUntil(s.date)}</span>
      </div>
    `).join('');
  }

  // Latest thought
  const thoughtEl = $('#homeLatestThought');
  if (STATE.thoughts.length === 0) {
    thoughtEl.innerHTML = '<div class="empty-state-sm">No notes yet 🌙 Write your first thought!</div>';
  } else {
    const latest = STATE.thoughts[STATE.thoughts.length - 1];
    thoughtEl.innerHTML = `<strong>${latest.title || 'Untitled'}</strong><br>${latest.body.slice(0, 180)}${latest.body.length > 180 ? '…' : ''}`;
  }

  // Greeting
  const hour = new Date().getHours();
  let greet = 'Good morning,';
  if (hour >= 12 && hour < 17) greet = 'Good afternoon,';
  else if (hour >= 17) greet = 'Good evening,';
  $('#heroGreeting').textContent = greet;
}

// ---- ROUTINE ----
function renderRoutine() {
  const tl = $('#routineTimeline');
  if (STATE.routine.length === 0) {
    tl.innerHTML = '<div class="empty-state">No tasks yet 🌸<br>Add your first routine task!</div>';
    return;
  }
  const sorted = [...STATE.routine].sort((a, b) => (a.start || '').localeCompare(b.start || ''));
  tl.innerHTML = sorted.map(t => `
    <div class="timeline-item ${t.done ? 'done' : ''}" data-id="${t.id}">
      <div class="timeline-time">
        ${t.start ? `<div>${formatTime(t.start)}</div>` : ''}
        ${t.end ? `<div style="color:var(--text3)">${formatTime(t.end)}</div>` : ''}
      </div>
      <div class="timeline-dot"></div>
      <div class="timeline-card">
        <div class="timeline-card-header">
          <span class="timeline-task-name">${t.name}</span>
          <div class="item-actions">
            <button class="action-btn" onclick="editRoutineTask('${t.id}')" title="Edit">✏️</button>
            <button class="action-btn" onclick="deleteRoutineTask('${t.id}')" title="Delete">🗑️</button>
            <button class="check-btn" onclick="toggleRoutine('${t.id}')" title="Done">${t.done ? '✓' : ''}</button>
          </div>
        </div>
        ${t.start && t.end ? `<div class="timeline-duration">${formatTime(t.start)} → ${formatTime(t.end)}</div>` : ''}
      </div>
    </div>
  `).join('');
}

$('#addRoutineTask').addEventListener('click', () => {
  const name = $('#routineTaskName').value.trim();
  if (!name) { toast('Please enter a task name 💌'); return; }
  STATE.routine.push({
    id: uid(),
    name,
    start: $('#routineStart').value,
    end: $('#routineEnd').value,
    done: false,
  });
  save();
  $('#routineTaskName').value = '';
  $('#routineStart').value = '';
  $('#routineEnd').value = '';
  renderRoutine();
  renderHome();
  toast('Task added! ✨');
});

window.toggleRoutine = (id) => {
  const t = STATE.routine.find(x => x.id === id);
  if (t) {
    t.done = !t.done;
    if (t.done) playDone();
    save(); renderRoutine(); renderHome();
    toast(t.done ? 'Task completed! 🌸' : 'Marked as pending 📌');
  }
};

window.deleteRoutineTask = (id) => {
  STATE.routine = STATE.routine.filter(x => x.id !== id);
  save(); renderRoutine(); renderHome();
  toast('Task removed 🗑️');
};

window.editRoutineTask = (id) => {
  const t = STATE.routine.find(x => x.id === id);
  if (!t) return;
  openModal('Edit Task', `
    <div class="form-group"><label>Task Name</label><input type="text" id="editName" value="${t.name}" /></div>
    <div class="form-group"><label>Start Time</label><input type="time" id="editStart" value="${t.start || ''}" /></div>
    <div class="form-group"><label>End Time</label><input type="time" id="editEnd" value="${t.end || ''}" /></div>
  `, () => {
    t.name = $('#editName').value.trim() || t.name;
    t.start = $('#editStart').value;
    t.end = $('#editEnd').value;
    save(); renderRoutine(); renderHome(); toast('Task updated! ✏️');
  });
};

// ---- WEEKLY ----
const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

function renderWeekly() {
  const grid = $('#weeklyGrid');
  grid.innerHTML = DAYS.map(day => {
    const tasks = STATE.weekly[day] || [];
    const done = tasks.filter(t => t.done).length;
    const pct = tasks.length ? (done / tasks.length * 100) : 0;
    return `
      <div class="day-column">
        <div class="day-header">
          <div class="day-name">${day.slice(0,3)}</div>
          <div class="day-progress">${done}/${tasks.length}</div>
          <div class="day-progress-bar"><div class="day-progress-fill" style="width:${pct}%"></div></div>
        </div>
        <div class="day-tasks" id="tasks-${day}">
          ${tasks.length === 0 ? `<div class="empty-state-sm" style="padding:10px">Empty 🌸</div>` : ''}
          ${tasks.map(t => `
            <div class="weekly-task-item ${t.done ? 'done' : ''}" data-id="${t.id}">
              <button class="task-check" onclick="toggleWeekly('${day}','${t.id}')">${t.done ? '✓' : ''}</button>
              <span class="task-text">${t.name}</span>
              <button class="task-del" onclick="deleteWeekly('${day}','${t.id}')">✕</button>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }).join('');
}

$('#addWeeklyTask').addEventListener('click', () => {
  const name = $('#weeklyTaskName').value.trim();
  const day = $('#weeklyDay').value;
  if (!name) { toast('Please enter a task 💌'); return; }
  if (!STATE.weekly[day]) STATE.weekly[day] = [];
  STATE.weekly[day].push({ id: uid(), name, done: false });
  save(); renderWeekly(); renderHome();
  $('#weeklyTaskName').value = '';
  toast(`Added to ${day}! 📅`);
});

window.toggleWeekly = (day, id) => {
  const t = STATE.weekly[day]?.find(x => x.id === id);
  if (t) {
    t.done = !t.done;
    if (t.done) playDone();
    save(); renderWeekly(); renderHome();
    toast(t.done ? 'Done! 💖' : 'Marked as pending');
  }
};

window.deleteWeekly = (day, id) => {
  STATE.weekly[day] = STATE.weekly[day].filter(x => x.id !== id);
  save(); renderWeekly(); renderHome();
  toast('Removed 🗑️');
};

// ---- TARGETS ----
function renderTargets() {
  const list = $('#targetsList');
  if (STATE.targets.length === 0) {
    list.innerHTML = '<div class="empty-state">No goals yet 🎯<br>Set your first weekly target!</div>';
    return;
  }
  list.innerHTML = STATE.targets.map(t => {
    const pct = Math.min((t.current / t.total) * 100, 100);
    return `
      <div class="target-card ${t.achieved ? 'achieved' : ''}">
        <div class="target-top">
          <span class="target-name">${t.achieved ? '🏆 ' : ''}${t.name}</span>
          <span class="target-status">${t.current}/${t.total} sessions</span>
        </div>
        <div class="progress-bar-wrap">
          <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
          <span style="font-size:0.8rem;color:var(--text2);min-width:36px">${Math.round(pct)}%</span>
        </div>
        <div class="target-counter">
          <button class="counter-btn" onclick="incrementTarget('${t.id}')">+ Add Session</button>
          <button class="counter-btn" onclick="decrementTarget('${t.id}')">- Remove</button>
          <button class="counter-btn achieve-btn" onclick="toggleAchieve('${t.id}')">${t.achieved ? '✅ Achieved!' : '🎯 Mark Achieved'}</button>
          <button class="counter-btn" onclick="deleteTarget('${t.id}')" style="margin-left:auto">🗑️</button>
        </div>
      </div>
    `;
  }).join('');
}

$('#addTarget').addEventListener('click', () => {
  const name = $('#targetName').value.trim();
  const total = parseInt($('#targetTotal').value) || 3;
  if (!name) { toast('Please enter a goal 💌'); return; }
  STATE.targets.push({ id: uid(), name, total, current: 0, achieved: false });
  save(); renderTargets(); renderHome();
  $('#targetName').value = '';
  toast('Goal set! 🎯');
});

window.incrementTarget = (id) => {
  const t = STATE.targets.find(x => x.id === id);
  if (t) { t.current = Math.min(t.current + 1, t.total); save(); renderTargets(); renderHome(); }
};
window.decrementTarget = (id) => {
  const t = STATE.targets.find(x => x.id === id);
  if (t) { t.current = Math.max(t.current - 1, 0); save(); renderTargets(); renderHome(); }
};
window.toggleAchieve = (id) => {
  const t = STATE.targets.find(x => x.id === id);
  if (t) {
    t.achieved = !t.achieved;
    if (t.achieved) { t.current = t.total; playDone(); }
    save(); renderTargets(); renderHome();
    toast(t.achieved ? '🏆 Goal achieved! Amazing!' : 'Unmarked');
  }
};
window.deleteTarget = (id) => {
  STATE.targets = STATE.targets.filter(x => x.id !== id);
  save(); renderTargets(); renderHome();
  toast('Goal removed 🗑️');
};

// ---- SPECIAL DAYS ----
const SPECIAL_ICONS = ['🌸','✨','💖','🎉','📖','🎂','🌙','⭐','💫','🌺','🎊','💝'];

function renderSpecial() {
  const list = $('#specialList');
  if (STATE.special.length === 0) {
    list.innerHTML = '<div class="empty-state">No special days yet ✨<br>Add important events!</div>';
    return;
  }
  const sorted = [...STATE.special].sort((a, b) => new Date(a.date) - new Date(b.date));
  const today = new Date(); today.setHours(0,0,0,0);
  list.innerHTML = sorted.map(s => {
    const d = new Date(s.date + 'T00:00:00');
    const isPast = d < today;
    const isToday = d.getTime() === today.getTime();
    const icon = s.icon || '✨';
    return `
      <div class="special-card ${isToday ? 'today' : ''} ${isPast ? 'past' : ''}" data-icon="${icon}">
        <div class="special-card-top">
          <span class="special-title">${icon} ${s.title}</span>
          <span class="special-date-badge">${formatDate(s.date)}</span>
        </div>
        <div class="special-countdown">${daysUntil(s.date)}</div>
        ${s.notes ? `<div class="special-notes">📝 ${s.notes}</div>` : ''}
        <div class="special-actions">
          <button class="btn-sm" onclick="editSpecial('${s.id}')">✏️ Edit</button>
          <button class="btn-sm" onclick="deleteSpecial('${s.id}')" style="border-color:var(--pink-300)">🗑️ Delete</button>
        </div>
      </div>
    `;
  }).join('');
}

$('#addSpecial').addEventListener('click', () => {
  const title = $('#specialTitle').value.trim();
  const date = $('#specialDate').value;
  if (!title) { toast('Please enter event title 💌'); return; }
  if (!date) { toast('Please pick a date 📅'); return; }
  const icon = SPECIAL_ICONS[Math.floor(Math.random() * SPECIAL_ICONS.length)];
  STATE.special.push({ id: uid(), title, date, notes: $('#specialNotes').value.trim(), icon });
  save(); renderSpecial(); renderHome();
  $('#specialTitle').value = ''; $('#specialDate').value = ''; $('#specialNotes').value = '';
  toast('Event added! ✨');
});

window.deleteSpecial = (id) => {
  STATE.special = STATE.special.filter(x => x.id !== id);
  save(); renderSpecial(); renderHome();
  toast('Event removed 🗑️');
};

window.editSpecial = (id) => {
  const s = STATE.special.find(x => x.id === id);
  if (!s) return;
  openModal('Edit Event', `
    <div class="form-group"><label>Title</label><input type="text" id="editSTitle" value="${s.title}" /></div>
    <div class="form-group"><label>Date</label><input type="date" id="editSDate" value="${s.date}" /></div>
    <div class="form-group"><label>Notes</label><input type="text" id="editSNotes" value="${s.notes || ''}" /></div>
  `, () => {
    s.title = $('#editSTitle').value.trim() || s.title;
    s.date = $('#editSDate').value || s.date;
    s.notes = $('#editSNotes').value.trim();
    save(); renderSpecial(); renderHome(); toast('Event updated! ✨');
  });
};

// ---- THOUGHTS ----
$('#thoughtBody').addEventListener('input', function () {
  $('#thoughtChar').textContent = this.value.length + ' characters';
});

$('#saveThought').addEventListener('click', () => {
  const title = $('#thoughtTitle').value.trim();
  const body = $('#thoughtBody').value.trim();
  if (!body) { toast('Write something first 💭'); return; }
  STATE.thoughts.push({
    id: uid(),
    title: title || 'Untitled thought',
    body,
    date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
  });
  save(); renderThoughts(); renderHome();
  $('#thoughtTitle').value = '';
  $('#thoughtBody').value = '';
  $('#thoughtChar').textContent = '0 characters';
  toast('Thought saved! 💭');
});

function renderThoughts() {
  const grid = $('#thoughtsGrid');
  if (STATE.thoughts.length === 0) {
    grid.innerHTML = '<div class="empty-state">No notes yet 💭<br>Write your first thought!</div>';
    return;
  }
  const reversed = [...STATE.thoughts].reverse();
  grid.innerHTML = reversed.map(t => `
    <div class="thought-card" data-id="${t.id}">
      <div class="thought-card-actions">
        <button class="action-btn" onclick="editThought('${t.id}')">✏️</button>
        <button class="action-btn" onclick="deleteThought('${t.id}')">🗑️</button>
      </div>
      <div class="thought-card-title">${t.title}</div>
      <div class="thought-card-body">${t.body}</div>
      <div class="thought-card-date">🌙 ${t.date}</div>
    </div>
  `).join('');
}

window.deleteThought = (id) => {
  STATE.thoughts = STATE.thoughts.filter(x => x.id !== id);
  save(); renderThoughts(); renderHome();
  toast('Note deleted 🗑️');
};

window.editThought = (id) => {
  const t = STATE.thoughts.find(x => x.id === id);
  if (!t) return;
  openModal('Edit Thought', `
    <div class="form-group"><label>Title</label><input type="text" id="editTTitle" value="${t.title}" /></div>
    <div class="form-group"><label>Note</label><textarea id="editTBody" rows="6">${t.body}</textarea></div>
  `, () => {
    t.title = $('#editTTitle').value.trim() || t.title;
    t.body = $('#editTBody').value.trim() || t.body;
    save(); renderThoughts(); renderHome(); toast('Note updated ✏️');
  });
};

// ---- MODAL ----
let _modalSaveCallback = null;

function openModal(title, bodyHTML, onSave) {
  $('#modalTitle').textContent = title;
  $('#modalBody').innerHTML = bodyHTML;
  _modalSaveCallback = onSave;
  $('#modalOverlay').classList.add('open');
}

function closeModal() {
  $('#modalOverlay').classList.remove('open');
  _modalSaveCallback = null;
}

$('#modalClose').addEventListener('click', closeModal);
$('#modalCancel').addEventListener('click', closeModal);
$('#modalSave').addEventListener('click', () => {
  if (_modalSaveCallback) _modalSaveCallback();
  closeModal();
});
$('#modalOverlay').addEventListener('click', (e) => {
  if (e.target === $('#modalOverlay')) closeModal();
});

// ---- THEME ----
function setTheme(dark) {
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  $('#themeToggle').textContent = dark ? '☀️ Light Mode' : '🌙 Dark Mode';
  localStorage.setItem('niroo_theme', dark ? 'dark' : 'light');
}

$('#themeToggle').addEventListener('click', () => {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  setTheme(!isDark);
});

// ---- SIDEBAR NAV ----
$$('.nav-link').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    navigate(link.dataset.page);
    renderForPage(link.dataset.page);
  });
});

// Quick nav cards & dash buttons
document.addEventListener('click', (e) => {
  const qc = e.target.closest('.quick-card');
  const bsm = e.target.closest('.btn-sm[data-page]');
  if (qc && qc.dataset.page) { navigate(qc.dataset.page); renderForPage(qc.dataset.page); }
  if (bsm && bsm.dataset.page) { navigate(bsm.dataset.page); renderForPage(bsm.dataset.page); }
});

function renderForPage(page) {
  if (page === 'home') renderHome();
  if (page === 'routine') { renderRoutine(); renderHome(); }
  if (page === 'weekly') { renderWeekly(); renderHome(); }
  if (page === 'targets') { renderTargets(); renderHome(); }
  if (page === 'special') { renderSpecial(); renderHome(); }
  if (page === 'thoughts') { renderThoughts(); renderHome(); }
  if (page === 'calendar') { renderCalendar(); }
}

// ---- HAMBURGER ----
const overlay = document.createElement('div');
overlay.className = 'sidebar-overlay';
overlay.id = 'sideOverlay';
document.body.appendChild(overlay);

$('#hamburger').addEventListener('click', () => {
  $('#sidebar').classList.toggle('open');
  overlay.classList.toggle('open');
});
overlay.addEventListener('click', () => {
  $('#sidebar').classList.remove('open');
  overlay.classList.remove('open');
});

// ---- PETALS ----
function createPetals() {
  const wrap = $('#petals');
  const colors = ['#ffb3d4','#c4aaff','#ffcba4','#b8f0e0','#ffd6e8'];
  for (let i = 0; i < 14; i++) {
    const p = document.createElement('div');
    p.className = 'petal';
    const size = 6 + Math.random() * 8;
    p.style.cssText = `
      left: ${Math.random() * 100}%;
      width: ${size}px;
      height: ${size}px;
      background: ${colors[Math.floor(Math.random() * colors.length)]};
      animation-duration: ${8 + Math.random() * 12}s;
      animation-delay: ${-Math.random() * 15}s;
    `;
    wrap.appendChild(p);
  }
}

// ---- SIDEBAR QUOTE ----
function rotateSideQuote() {
  const el = $('#sideQuote');
  let i = 0;
  setInterval(() => {
    el.style.opacity = '0';
    setTimeout(() => {
      i = (i + 1) % QUOTES.length;
      el.textContent = QUOTES[i];
      el.style.opacity = '1';
    }, 400);
  }, 6000);
  el.style.transition = 'opacity 0.4s';
  el.textContent = QUOTES[0];
}

// ---- SVG gradient for circles ----
function injectGradient() {
  const svgs = $$('.stat-circle svg');
  svgs.forEach(svg => {
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    defs.innerHTML = `
      <linearGradient id="statGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#e85d9a"/>
        <stop offset="100%" stop-color="#9f75f5"/>
      </linearGradient>`;
    svg.prepend(defs);
    svg.querySelector('.stat-fill').setAttribute('stroke', 'url(#statGrad)');
  });
}

// ---- INIT ----
function init() {
  load();

  // Theme
  const savedTheme = localStorage.getItem('niroo_theme');
  if (savedTheme === 'dark') setTheme(true);

  // Petals
  createPetals();

  // Quotes
  rotateSideQuote();

  // SVG gradients
  setTimeout(injectGradient, 50);

  // Initial render
  renderHome();
  renderRoutine();
  renderWeekly();
  renderTargets();
  renderSpecial();
  renderThoughts();
  // Calendar
  if (!STATE.calSnapshots) STATE.calSnapshots = {};
  saveSnapshot(); // snapshot current state on load
  renderCalendar();

  // Set current day in weekly select
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const daySelect = $('#weeklyDay');
  if (daySelect) {
    for (let opt of daySelect.options) {
      if (opt.value === today) { opt.selected = true; break; }
    }
  }

  // Default special date to today
  const sDate = $('#specialDate');
  if (sDate) sDate.valueAsDate = new Date();
}

document.addEventListener('DOMContentLoaded', init);

/* =========================================
   CALENDAR MODULE
   ========================================= */

// calSnapshots: { 'YYYY-MM-DD': { routinePct, weeklyPct, targetPct, overall, dayName } }
// stored inside STATE.calSnapshots
if (!STATE.calSnapshots) STATE.calSnapshots = {};

// --- Snapshot helpers ---
function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function getDayName(date) {
  return date.toLocaleDateString('en-US', { weekday: 'long' });
}

/** Compute and persist today's snapshot from live STATE — includes full task lists */
function saveSnapshot() {
  const key = todayKey();
  const routinePct = calcPercent(STATE.routine);

  // For weekly, get tasks for today's weekday name
  const todayDayName = getDayName(new Date());
  const todayWeeklyTasks = STATE.weekly[todayDayName] || [];
  const weeklyPct = calcPercent(todayWeeklyTasks);

  const targetPct = STATE.targets.length === 0 ? 0 :
    STATE.targets.filter(t => t.achieved).length / STATE.targets.length * 100;

  // overall = weighted average (routine 40%, weekly tasks 40%, targets 20%)
  const overall = routinePct * 0.4 + weeklyPct * 0.4 + targetPct * 0.2;

  // Update STATE only — save() already wrote to localStorage before us
  STATE.calSnapshots[key] = {
    routinePct,
    weeklyPct,
    targetPct,
    overall,
    dayName: todayDayName,
    routineTasks: STATE.routine.map(t => ({ name: t.name, done: t.done, start: t.start, end: t.end })),
    weeklyTasks: todayWeeklyTasks.map(t => ({ name: t.name, done: t.done })),
    targets: STATE.targets.map(t => ({ name: t.name, achieved: t.achieved, current: t.current, total: t.total })),
  };
  // Persist the updated snapshot quietly
  localStorage.setItem('niroo_planner_v2', JSON.stringify(STATE));
}

/** Get data for a specific date key */
function getDayData(key) {
  return STATE.calSnapshots[key] || null;
}

/** Special events on a given date */
function getSpecialForDate(dateKey) {
  return STATE.special.filter(s => s.date === dateKey);
}

// --- Calendar State ---
let calYear = new Date().getFullYear();
let calMonth = new Date().getMonth();
let calView = 'month';
let calWeekOffset = 0;        // which week of current month to show in week view
let weekDetailDay = null;     // selected day in week view

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAY_NAMES_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

// --- Render Calendar ---
function renderCalendar() {
  updateCalMonthLabel();
  if (calView === 'month') renderMonthGrid();
  else renderWeekStrip();
  renderWeeklySummary();
}

function updateCalMonthLabel() {
  const el = $('#calMonthLabel');
  if (el) el.textContent = MONTH_NAMES[calMonth] + ' ' + calYear;
}

// Month Grid
function renderMonthGrid() {
  const grid = $('#calGrid');
  if (!grid) return;

  const today = new Date();
  const todayKey2 = today.toISOString().slice(0,10);

  // Day headers
  let html = DAY_NAMES_SHORT.map(d => `<div class="cal-day-header">${d}</div>`).join('');

  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();

  // Empty cells before first day
  for (let i = 0; i < firstDay; i++) {
    html += `<div class="cal-day-cell empty"></div>`;
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const mm = String(calMonth + 1).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    const key = `${calYear}-${mm}-${dd}`;
    const snap = getDayData(key);
    const specials = getSpecialForDate(key);
    const isToday = key === todayKey2;

    let classes = 'cal-day-cell';
    if (isToday) classes += ' today';
    if (specials.length > 0) classes += ' has-special';

    let pct = 0;
    if (snap) {
      pct = Math.round(snap.overall);
      if (pct >= 100) classes += ' done-full';
      else if (pct > 0) classes += ' done-partial';
    }

    // Dots
    let dots = '';
    if (snap && snap.routinePct > 0) dots += `<span class="cal-dot routine" title="Routine"></span>`;
    if (snap && snap.weeklyPct > 0) dots += `<span class="cal-dot weekly" title="Weekly"></span>`;
    if (specials.length > 0) dots += `<span class="cal-dot special" title="Special"></span>`;

    const pctLabel = snap ? `<div class="cal-day-pct">${pct}%</div>` : '';

    html += `
      <div class="${classes}" data-key="${key}" onclick="openDayPopup('${key}')">
        <div class="cal-day-num">${d}${isToday ? ' 🌸' : ''}</div>
        <div class="cal-day-dots">${dots}</div>
        ${pctLabel}
      </div>
    `;
  }

  grid.innerHTML = html;
}

// Week Strip View
function renderWeekStrip() {
  const strip = $('#weekStrip');
  const detail = $('#weekDetail');
  if (!strip) return;

  const today = new Date();
  const todayKey2 = today.toISOString().slice(0,10);

  // Find the start of current week (Sunday) for this month
  const startOfMonth = new Date(calYear, calMonth, 1);
  const weekStart = new Date(startOfMonth);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + (calWeekOffset * 7));

  let html = '';
  let firstValidKey = null;

  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    const mm = String(d.getMonth() + 1).padStart(2,'0');
    const dd = String(d.getDate()).padStart(2,'0');
    const key = `${d.getFullYear()}-${mm}-${dd}`;
    if (!firstValidKey) firstValidKey = key;
    const snap = getDayData(key);
    const isToday = key === todayKey2;
    const isSelected = weekDetailDay === key;

    const pct = snap ? snap.overall : 0;
    let cls = 'week-strip-day';
    if (isSelected) cls += ' selected';
    if (snap && pct >= 100) cls += ' done-full';
    else if (snap && pct > 0) cls += ' done-partial';
    if (isToday) cls += ' today';

    html += `
      <div class="${cls}" onclick="selectWeekDay('${key}')">
        <div class="wsd-name">${DAY_NAMES_SHORT[d.getDay()]}</div>
        <div class="wsd-num">${d.getDate()}${isToday ? '🌸' : ''}</div>
        <div class="wsd-pie"><div class="wsd-pie-fill" style="--pct:${pct}%"></div></div>
      </div>
    `;
  }
  strip.innerHTML = html;

  // Show detail for selected day or first day
  if (!weekDetailDay) weekDetailDay = firstValidKey;
  renderWeekDayDetail(weekDetailDay);
}

window.selectWeekDay = (key) => {
  weekDetailDay = key;
  renderWeekStrip();
};

function renderWeekDayDetail(key) {
  const detail = $('#weekDetail');
  if (!detail) return;
  const snap = getDayData(key);
  const specials = getSpecialForDate(key);
  const d = new Date(key + 'T00:00:00');
  const dayLabel = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  if (!snap && specials.length === 0) {
    detail.innerHTML = `
      <div class="week-detail-title">📅 ${dayLabel}</div>
      <div class="empty-state-sm" style="padding:30px">No data saved for this day yet 🌸<br>
      ${key === todayKey() ? '<br><em>Complete tasks today and they\'ll appear here!</em>' : ''}
      </div>`;
    return;
  }

  let html = `<div class="week-detail-title">📅 ${dayLabel}</div>`;

  if (snap) {
    html += `
      <div class="popup-progress-ring" style="margin-bottom:14px">
        <div>
          <div class="popup-ring-label">Overall</div>
          <div class="popup-ring-pct">${Math.round(snap.overall)}%</div>
        </div>
        <div style="flex:1;display:flex;gap:12px;flex-wrap:wrap">
          ${progressPill('⏰ Routine', snap.routinePct)}
          ${progressPill('📅 Weekly', snap.weeklyPct)}
          ${progressPill('🎯 Targets', snap.targetPct)}
        </div>
      </div>`;

    // Routine tasks
    if (snap.routineTasks && snap.routineTasks.length > 0) {
      const sorted = [...snap.routineTasks].sort((a,b) => (a.start||'').localeCompare(b.start||''));
      html += `<div class="detail-section">
        <div class="detail-section-label">⏰ Routine</div>
        ${sorted.map(t => `
          <div class="detail-task-row ${t.done ? 'done' : ''}">
            <span>${t.done ? '✅' : '⭕'}</span>
            <span style="flex:1">${t.name}</span>
            ${t.start ? `<span style="font-size:0.72rem;color:var(--text3)">${formatTime(t.start)}</span>` : ''}
          </div>`).join('')}
      </div>`;
    }

    // Weekly tasks
    if (snap.weeklyTasks && snap.weeklyTasks.length > 0) {
      html += `<div class="detail-section">
        <div class="detail-section-label">📅 Today's Weekly</div>
        ${snap.weeklyTasks.map(t => `
          <div class="detail-task-row ${t.done ? 'done' : ''}">
            <span>${t.done ? '✅' : '⭕'}</span>
            <span>${t.name}</span>
          </div>`).join('')}
      </div>`;
    }

    // Targets
    if (snap.targets && snap.targets.length > 0) {
      html += `<div class="detail-section">
        <div class="detail-section-label">🎯 Targets</div>
        ${snap.targets.map(t => `
          <div class="detail-task-row ${t.achieved ? 'done' : ''}">
            <span>${t.achieved ? '🏆' : '🎯'}</span>
            <span style="flex:1">${t.name}</span>
            <span style="font-size:0.72rem;color:var(--text3)">${t.current}/${t.total}</span>
          </div>`).join('')}
      </div>`;
    }
  }

  if (specials.length > 0) {
    html += `<div class="detail-section">
      <div class="detail-section-label">✨ Special Events</div>
      ${specials.map(s => `
        <div class="detail-task-row">${s.icon || '✨'} <strong>${s.title}</strong>${s.notes ? ' — ' + s.notes : ''}</div>
      `).join('')}
    </div>`;
  }

  detail.innerHTML = html;
}

function progressPill(label, pct) {
  const p = Math.round(pct);
  return `<div style="text-align:center;font-size:0.78rem;color:var(--text2)">
    <div style="font-weight:700;color:var(--pink-500)">${p}%</div>
    <div>${label}</div>
  </div>`;
}

// Day Popup (from monthly grid) — shows full task breakdown
window.openDayPopup = (key) => {
  const snap = getDayData(key);
  const specials = getSpecialForDate(key);
  const d = new Date(key + 'T00:00:00');
  const dayLabel = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const isToday = key === todayKey();

  let html = `<h3 style="font-family:var(--font-display);font-size:1.2rem;font-weight:700;color:var(--text);margin-bottom:16px">
    📅 ${dayLabel}${isToday ? ' <span class="snapshot-badge">Today 🌸</span>' : ''}
  </h3>`;

  if (snap) {
    // Progress ring row
    const pct = Math.round(snap.overall);
    html += `
      <div class="popup-progress-ring" style="margin-bottom:14px">
        <div>
          <div class="popup-ring-label">Overall</div>
          <div class="popup-ring-pct">${pct}%</div>
        </div>
        <div style="flex:1;display:flex;gap:16px;flex-wrap:wrap">
          ${progressPill('⏰ Routine', snap.routinePct)}
          ${progressPill('📅 Weekly', snap.weeklyPct)}
          ${progressPill('🎯 Targets', snap.targetPct)}
        </div>
      </div>
      <div style="margin-bottom:18px">
        <div style="height:8px;background:var(--border);border-radius:10px;overflow:hidden">
          <div style="height:100%;width:${pct}%;background:linear-gradient(to right,var(--pink-400),var(--purple-400));border-radius:10px"></div>
        </div>
        <div style="font-size:0.75rem;color:var(--text3);margin-top:4px">${pct >= 100 ? '🌟 Perfect day!' : pct >= 70 ? '💖 Great job!' : pct >= 40 ? '✨ Keep going!' : pct > 0 ? '🌸 Good start!' : 'No tasks recorded'}</div>
      </div>`;

    // ⏰ Routine Tasks
    if (snap.routineTasks && snap.routineTasks.length > 0) {
      const sorted = [...snap.routineTasks].sort((a,b) => (a.start||'').localeCompare(b.start||''));
      html += `<div class="detail-section">
        <div class="detail-section-label">⏰ Daily Routine</div>
        ${sorted.map(t => `
          <div class="detail-task-row ${t.done ? 'done' : ''}">
            <span style="font-size:1rem">${t.done ? '✅' : '⭕'}</span>
            <span style="flex:1">${t.name}</span>
            ${t.start ? `<span style="font-size:0.75rem;color:var(--text3)">${formatTime(t.start)}${t.end ? ' → ' + formatTime(t.end) : ''}</span>` : ''}
          </div>`).join('')}
      </div>`;
    }

    // 📅 Weekly Tasks (today's day)
    if (snap.weeklyTasks && snap.weeklyTasks.length > 0) {
      html += `<div class="detail-section">
        <div class="detail-section-label">📅 Weekly Tasks — ${snap.dayName || ''}</div>
        ${snap.weeklyTasks.map(t => `
          <div class="detail-task-row ${t.done ? 'done' : ''}">
            <span style="font-size:1rem">${t.done ? '✅' : '⭕'}</span>
            <span>${t.name}</span>
          </div>`).join('')}
      </div>`;
    }

    // 🎯 Targets
    if (snap.targets && snap.targets.length > 0) {
      html += `<div class="detail-section">
        <div class="detail-section-label">🎯 Weekly Targets</div>
        ${snap.targets.map(t => {
          const tPct = Math.min(Math.round((t.current / t.total) * 100), 100);
          return `<div class="detail-task-row ${t.achieved ? 'done' : ''}">
            <span style="font-size:1rem">${t.achieved ? '🏆' : '🎯'}</span>
            <span style="flex:1">${t.name}</span>
            <span style="font-size:0.75rem;color:var(--text3)">${t.current}/${t.total} (${tPct}%)</span>
          </div>`;
        }).join('')}
      </div>`;
    }

  } else {
    html += `<div class="empty-state-sm" style="padding:20px 0">No productivity data saved for this day${isToday ? '<br><br><em>✨ Your tasks are tracked live — complete some and reopen!</em>' : ''}</div>`;
  }

  // ✨ Special Events
  if (specials.length > 0) {
    html += `<div class="detail-section">
      <div class="detail-section-label">✨ Special Events</div>
      ${specials.map(s => `
        <div class="detail-task-row">${s.icon || '✨'} <strong>${s.title}</strong>${s.notes ? ' — ' + s.notes : ''}</div>
      `).join('')}
    </div>`;
  }

  $('#dayPopupContent').innerHTML = html;
  $('#dayPopupOverlay').classList.add('open');
};

$('#dayPopupClose').addEventListener('click', () => {
  $('#dayPopupOverlay').classList.remove('open');
});
$('#dayPopupOverlay').addEventListener('click', (e) => {
  if (e.target === $('#dayPopupOverlay')) $('#dayPopupOverlay').classList.remove('open');
});

// Weekly Summary
function renderWeeklySummary() {
  const el = $('#weeklySummary');
  if (!el) return;

  // Get the 7 days of this week (Sun–Sat around today)
  const today = new Date();
  const dayOfWeek = today.getDay();
  const weekDays = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - dayOfWeek + i);
    const mm = String(d.getMonth()+1).padStart(2,'0');
    const dd = String(d.getDate()).padStart(2,'0');
    weekDays.push(`${d.getFullYear()}-${mm}-${dd}`);
  }

  const snaps = weekDays.map(k => STATE.calSnapshots[k]).filter(Boolean);
  if (snaps.length === 0) {
    el.innerHTML = `
      <div class="summary-title">📊 This Week's Summary</div>
      <div class="empty-state-sm">No data yet — start completing tasks and they'll show up here! 🌸</div>`;
    return;
  }

  const avgOverall = Math.round(snaps.reduce((a,s) => a + s.overall, 0) / snaps.length);
  const fullDays = snaps.filter(s => s.overall >= 100).length;
  const avgRoutine = Math.round(snaps.reduce((a,s) => a + s.routinePct, 0) / snaps.length);
  const avgWeekly = Math.round(snaps.reduce((a,s) => a + s.weeklyPct, 0) / snaps.length);
  const daysTracked = snaps.length;
  const specialThisWeek = STATE.special.filter(s => weekDays.includes(s.date)).length;

  el.innerHTML = `
    <div class="summary-title">📊 This Week's Summary <span style="font-size:0.8rem;color:var(--text3);font-family:var(--font-body)">(${daysTracked}/7 days tracked)</span></div>
    <div class="summary-row">
      <div class="summary-stat">
        <div class="summary-stat-num">${avgOverall}%</div>
        <div class="summary-stat-label">Avg. Progress</div>
      </div>
      <div class="summary-stat">
        <div class="summary-stat-num">${fullDays}</div>
        <div class="summary-stat-label">🌟 Perfect Days</div>
      </div>
      <div class="summary-stat">
        <div class="summary-stat-num">${avgRoutine}%</div>
        <div class="summary-stat-label">⏰ Routine Avg</div>
      </div>
      <div class="summary-stat">
        <div class="summary-stat-num">${avgWeekly}%</div>
        <div class="summary-stat-label">📅 Weekly Avg</div>
      </div>
      ${specialThisWeek > 0 ? `<div class="summary-stat"><div class="summary-stat-num">${specialThisWeek}</div><div class="summary-stat-label">✨ Special Days</div></div>` : ''}
    </div>
  `;
}

// --- Nav & Controls ---
$('#calPrev').addEventListener('click', () => {
  if (calView === 'month') {
    calMonth--;
    if (calMonth < 0) { calMonth = 11; calYear--; }
  } else {
    calWeekOffset--;
    weekDetailDay = null;
  }
  renderCalendar();
});
$('#calNext').addEventListener('click', () => {
  if (calView === 'month') {
    calMonth++;
    if (calMonth > 11) { calMonth = 0; calYear++; }
  } else {
    calWeekOffset++;
    weekDetailDay = null;
  }
  renderCalendar();
});

$$('.cal-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    $$('.cal-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    calView = tab.dataset.view;
    calWeekOffset = 0;
    weekDetailDay = null;
    $('#calMonthView').classList.toggle('hidden', calView !== 'month');
    $('#calWeekView').classList.toggle('hidden', calView !== 'week');
    renderCalendar();
  });
});

// Auto-save snapshot whenever tasks change (hook into save())
const _originalSave = save;
// We override save to also refresh the snapshot for today
window._calSnapshotSave = function() {
  saveSnapshot();
  renderCalendar();
};
