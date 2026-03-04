// ── LIQUID BARS & MEALS ──
async function fetchMealLogs() {
    try {
        const res = await fetch(\`/api/meal/logs/\${U.email}/\${todayStr()}\`);
    const logs = await res.json();
    let totalCals = 0, totalProt = 0;
    logs.forEach(l => { totalCals += l.calories; totalProt += l.protein; });
    
    updateLiquidBars(totalCals, totalProt);
  } catch(e) { console.error("Meal fetch error", e); }
}

function updateLiquidBars(calsConsumed, protConsumed) {
  const calPct = Math.min((calsConsumed / cachedCalTarget) * 100, 100);
  const protPct = Math.min((protConsumed / cachedProtTarget) * 100, 100);
  
  const cb = document.getElementById('cal-fill');
  const pb = document.getElementById('prot-fill');
  if(cb && pb) {
    cb.style.height = calPct + '%';
    pb.style.height = protPct + '%';
    
    document.getElementById('cal-bar-text').textContent = calsConsumed + ' / ' + cachedCalTarget + ' kcal';
    document.getElementById('prot-bar-text').textContent = protConsumed + ' / ' + cachedProtTarget + ' g';
  }
}

async function quickLogMeal(type) {
  if (!U || !U.email) { alert("Please login first."); return; }
  const calInput = document.getElementById('quick-cal');
  const protInput = document.getElementById('quick-prot');
  let cals = parseFloat(calInput.value);
  let prot = parseFloat(protInput.value);
  
  if(!cals && !prot) { alert('Enter some values'); return; }
  cals = cals || 0; prot = prot || 0;
  
  try {
    await fetch('/api/meal/log', {
      method: 'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ email: U.email, name: 'Quick add: ' + type, calories: cals, protein: prot })
    });
    calInput.value = ''; protInput.value = '';
    showToast('Meal logged successfully!', 'success');
    fetchMealLogs();
  } catch (e) {
    showToast('Failed to log meal', 'warning');
  }
}

// ── WORKOUT DISPLAY IN OVERVIEW ──
async function fetchWorkoutLogsAndPlan() {
  try {
    const res = await fetch(\`/api/workout/logs/\${U.email}\`);
    const logs = await res.json();
    
    const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    const todayIdx = new Date().getDay();
    const daysArr = document.querySelectorAll('.week-chips .day-chip');
    
    daysArr.forEach((el, idx) => {
      el.classList.remove('today', 'done');
      if (idx === todayIdx) el.classList.add('today');
      
      const logMatch = logs.find(l => {
         const ld = new Date(l.date);
         return ld.getDay() === idx && /* mock check for same week */ (Date.now() - ld.getTime() < 7*86400000);
      });
      if (logMatch || idx < todayIdx) {
        el.classList.add('done');
        el.onclick = () => showWorkoutDetail('Last ' + dayNames[idx], (logMatch ? logMatch.name : 'Completed Workout'));
      }
    });
    
  } catch(e) { console.error("Workout fetch error", e); }
}

function showWorkoutDetail(date, title) {
  const panel = document.getElementById('workout-detail-panel');
  if(!panel) return;
  panel.style.display = 'block';
  let wTitle = document.getElementById('wdp-title');
  if(wTitle) wTitle.textContent = title + " (" + date + ")";
  let wExs = document.getElementById('wdp-exs');
  if(wExs) wExs.innerHTML = '<div>Great job completing this workout!</div>';
  panel.scrollIntoView({behavior: 'smooth', block: 'start'});
}

// ── HABIT TRACKER ──
async function fetchHabits() {
  try {
    const res = await fetch(\`/api/habits/\${U.email}\`);
    const data = await res.json();
    userHabits = data.habits || [];
    
    const allLogsRes = await fetch(\`/api/habit/logs/\${U.email}\`);
    const allLogs = await allLogsRes.json();
    todayHabitLogs = allLogs.filter(l => l.date === todayStr());
    
    renderHabits();
    renderWeeklyVolume(allLogs);
  } catch (e) { console.error("Habit fetch", e); }
}

function renderHabits() {
  const d = new Date();
  let hdt = document.getElementById('habit-date-tag');
  if(hdt) hdt.textContent = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][d.getDay()];
  const list = document.getElementById('habit-list');
  if(!list) return;
  list.innerHTML = '';
  
  if (userHabits.length === 0) {
    list.innerHTML = '<div style="font-size:0.8rem;color:var(--muted);text-align:center;">No habits created yet. Type one above!</div>';
  }
  
  let completed = 0;
  userHabits.forEach(h => {
    const isDone = todayHabitLogs.some(l => l.habitId === h.id);
    if(isDone) completed++;
    
    list.innerHTML += \`
      <div class="habit-item">
        <label class="habit-toggle">
          <input type="checkbox" \${isDone ? 'checked' : ''} onchange="toggleHabit('\${h.id}', this.checked)">
          <span class="habit-toggle-slider"></span>
        </label>
        <span class="habit-name \${isDone ? 'done-text' : ''}" style="color:var(--text);font-size:0.9rem;">\${h.name}</span>
        <button class="ph-btn" style="background:transparent;color:var(--muted);border:none;margin-left:auto;padding:5px;" onclick="deleteHabit('\${h.id}')">✕</button>
      </div>
    \`;
  });
  
  let htc = document.getElementById('habit-total-count'); if(htc) htc.textContent = userHabits.length;
  let hdc = document.getElementById('habit-done-count'); if(hdc) hdc.textContent = completed;
  let pct = userHabits.length === 0 ? 0 : Math.round((completed / userHabits.length) * 100);
  let hpct = document.getElementById('habit-pct'); if(hpct) hpct.textContent = pct + '%';
  
  const ring = document.getElementById('habit-ring');
  if(ring) {
    const circ = 239;
    const offset = circ - (pct / 100) * circ;
    ring.style.strokeDashoffset = isNaN(offset) ? circ : offset;
  }
}

async function toggleHabit(habitId, completed) {
  if(!U || !U.email) { alert("Login required"); return; }
  try {
    await fetch('/api/habit/log', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({email: U.email, habitId, date: todayStr(), completed})
    });
    
    const habitObj = userHabits.find(h => h.id === habitId);
    if(completed && habitObj && (habitObj.name.toLowerCase().includes('breakfast') || habitObj.name.toLowerCase().includes('lunch') || habitObj.name.toLowerCase().includes('dinner') || habitObj.name.toLowerCase().includes('protein'))) {
       // visual simulated increment for diet alignment
       updateLiquidBars(cachedCalTarget * 0.3, cachedProtTarget * 0.3);
       showToast("Diet tracked via Habit", "success");
    }
    
    fetchHabits();
  } catch(e) { showToast('Network Error', 'warning'); }
}

async function addCustomHabit() {
  if(!U || !U.email) { alert("Login required"); return; }
  const inp = document.getElementById('habit-new-name');
  if(!inp.value.trim()) return;
  try {
    await fetch('/api/habit', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({email: U.email, name: inp.value.trim()})
    });
    inp.value = '';
    fetchHabits();
  } catch(e) { showToast('Error adding habit', 'warning'); }
}

async function deleteHabit(id) {
  if(!U || !U.email) return;
  if(!confirm("Delete this habit?")) return;
  try {
    await fetch('/api/habit/' + id, { method: 'DELETE' });
    fetchHabits();
  } catch(e) { showToast('Error deleting habit', 'warning'); }
}

function renderWeeklyVolume(logs) {
  // Very simplistic mock for streak
  let st = logs.filter(l => l.date === todayStr() || l.date === new Date(Date.now()-86400000).toISOString().split('T')[0]).length > 0;
  let num = document.getElementById('streak-num'); if(num) num.textContent = st ? "1" : "0";
  
  let dots = document.getElementById('streak-dots');
  if(dots) {
    dots.innerHTML = Array(21).fill(0).map((_, i) => \`<div class="s-dot \${i < (logs.length || 7) ? 'done':''}"></div>\`).join('');
  }
  
  let wkb = document.getElementById('weekly-volume-bars');
  if(wkb) {
    const heights = [70, 55, 85, Math.min(logs.length * 10, 100) || 5];
    wkb.innerHTML = heights.map((h, i) => \`
      <div class="act-col">
        <div class="act-bar \${i === 3 ? 'today-bar':'done-bar'}" style="height:\${h}%;"></div>
        <div class="act-lbl">Week \${i+1}</div>
      </div>
    \`).join('');
  }
}

// ── CHATBOT ──
function toggleChat() {
  const panel = document.getElementById('chat-panel');
  if(!panel) return;
  panel.classList.toggle('open');
  if (panel.classList.contains('open')) {
    let ci = document.getElementById('chat-input');
    if(ci) ci.focus();
    let cm = document.getElementById('chat-messages');
    if(cm && cm.children.length === 0) {
      appendChatMessage('system', "I'm APEX AI. I can answer fitness questions, create routines, and track your habits.\\n\\nTry:\\n- Log my breakfast (500 cal)\\n- I just completed my meditation habit\\n- What's a good workout for triceps?");
    }
  }
}

async function sendChatMessage() {
  if(!U || !U.email) {
    appendChatMessage('system', "Please log in to use the AI."); return;
  }
  const inp = document.getElementById('chat-input');
  if(!inp) return;
  const txt = inp.value.trim();
  if(!txt) return;
  
  appendChatMessage('user', txt);
  inp.value = '';
  
  const loadingId = appendChatMessage('system', '...', true);
  
  try {
    const res = await fetch('/api/gemini', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ message: txt, email: U.email })
    });
    const data = await res.json();
    const lMsg = document.getElementById(loadingId);
    if(lMsg) lMsg.remove();
    
    if (data.action && data.action.type) {
      handleChatAction(data.action);
    }
    
    if (data.reply) {
      appendChatMessage('system', data.reply);
    } else {
      appendChatMessage('system', "Could not process request.");
    }
  } catch(e) {
    const lMsg = document.getElementById(loadingId);
    if(lMsg) lMsg.remove();
    appendChatMessage('system', 'Error connecting to AI.');
  }
}

function handleChatAction(action) {
  if (action.type === 'log_meal' && action.calories) {
    updateLiquidBars((cachedCalTarget * 0.5) + action.calories, cachedProtTarget * 0.5); 
    fetchMealLogs(); 
    showToast("Meal logged via AI", "success");
  } else if (action.type === 'complete_habit') {
    fetchHabits();
    showToast("Habit updated via AI", "success");
  }
}

function appendChatMessage(sender, text, isLoading = false) {
  const c = document.getElementById('chat-messages');
  if(!c) return null;
  const d = document.createElement('div');
  d.className = 'msg ' + sender;
  d.innerHTML = text.replace(/\\n/g, '<br>');
  d.id = 'msg-' + Date.now();
  c.appendChild(d);
  c.scrollTop = c.scrollHeight;
  return d.id;
}
