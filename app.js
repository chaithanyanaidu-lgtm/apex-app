
'use strict';

// ── STATE ──
let U = {};
let selectedPlan = 1;
let userHabits = [];
let todayHabitLogs = [];
let cachedCalTarget = 0;
let cachedProtTarget = 0;
const UPI_ID = 'yourname@upi';

const ABBREV = { 'OHP': 'Overhead Press', 'RDL': 'Romanian Deadlift', 'DB': 'Dumbbell', 'BB': 'Barbell', 'EZ': 'EZ-Curl Bar', 'Tri': 'Triceps', 'Lat': 'Lateral', 'HIIT': 'High-Intensity Interval Training', 'LISS': 'Low-Intensity Steady State', 'Pec Deck': 'Pec Deck Fly Machine', 'Hack Squat': 'Hack Squat Machine' };
function getMuscleTarget(name) { for (const [k, v] of Object.entries(MUSCLE_TARGETS)) { if (name.toLowerCase().includes(k.toLowerCase())) return v; } return 'Multiple Muscle Groups'; }
function expandAbbrev(text) { let full = text; for (const [k, v] of Object.entries(ABBREV)) { const re = new RegExp('\\b' + k + '\\b', 'gi'); if (re.test(text) && !text.toLowerCase().includes(v.toLowerCase())) { return text + ' (' + v + ')'; } } return full; }
function todayStr() { return new Date().toISOString().split('T')[0]; }
function showToast(msg, type) { const c = document.getElementById('toast-container'); if (!c) return; const t = document.createElement('div'); t.className = 'toast' + (type === 'warning' ? ' warning' : ''); t.textContent = msg; c.appendChild(t); setTimeout(() => t.remove(), 4200); }





function getMuscleTarget(name) {
  for (const [k, v] of Object.entries(MUSCLE_TARGETS)) {
    if (name.toLowerCase().includes(k.toLowerCase())) return v;
  }
  return 'Multiple Muscle Groups';
}

function expandAbbrev(text) {
  let full = text;
  for (const [k, v] of Object.entries(ABBREV)) {
    const re = new RegExp('\\b' + k + '\\b', 'gi');
    if (re.test(text) && !text.toLowerCase().includes(v.toLowerCase())) {
      full = text + ' (' + v + ')';
      break;
    }
  }
  return full;
}

// ── HELPER: today string ──
function todayStr() { return new Date().toISOString().split('T')[0]; }
function getWeekStart(d) {
  const dt = d ? new Date(d) : new Date();
  const day = dt.getDay();
  const diff = dt.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(dt.setDate(diff)).toISOString().split('T')[0];
}

// ── TOAST NOTIFICATIONS ──
function showToast(msg, type) {
  const c = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = 'toast' + (type === 'warning' ? ' warning' : '');
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => t.remove(), 4200);
}

// ── PAGE ROUTING (full version below in initPWA section) ──
// showPage is defined later with history + animation support
// ── TAB ROUTING ──
function showTab(tab) {
  // panels
  document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
  const pane = document.getElementById('tab-' + tab);
  if (pane) pane.classList.add('active');

  // sidebar items
  document.querySelectorAll('.sb-item').forEach(b => b.classList.remove('active'));
  const nbtn = document.getElementById('nav-' + tab);
  if (nbtn) nbtn.classList.add('active');

  // mobile nav
  document.querySelectorAll('.mn-item').forEach(b => b.classList.remove('active'));
  const mbtn = document.getElementById('mn-' + tab);
  if (mbtn) mbtn.classList.add('active');
}

// ── AUTH ──
async function doLogin() {
  const email = document.getElementById('li-email').value.trim();
  const pass = document.getElementById('li-pass').value;
  if (!email || !pass) { alert('Please fill all fields.'); return; }

  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, pass })
    });
    const data = await res.json();
    if (!res.ok) { alert(data.error); return; }

    U = data.user;
    localStorage.setItem('apexSessionEmail', U.email);
    if (data.token) {
      localStorage.setItem('apexSessionToken', data.token);
    }
    postAuthFlow();
  } catch (err) {
    alert('Server error. Please try again later.');
  }
}

async function doSignup() {
  const fname = document.getElementById('su-fname').value.trim();
  const lname = document.getElementById('su-lname').value.trim();
  const email = document.getElementById('su-email').value.trim();
  const pass = document.getElementById('su-pass').value;
  const age = parseFloat(document.getElementById('su-age').value);
  const weight = parseFloat(document.getElementById('su-weight').value);
  const height = parseFloat(document.getElementById('su-height').value);
  const gender = document.getElementById('su-gender').value;
  const goal = document.getElementById('su-goal').value;
  const exp = document.getElementById('su-exp').value;
  const activity = document.getElementById('su-activity').value;

  if (!fname || !email || !pass || !age || !weight || !height || !gender || !goal || !exp || !activity) {
    alert('Please fill all fields before continuing.'); return;
  }
  if (pass.length < 6) { alert('Password must be at least 6 characters.'); return; }

  const payload = { fname, lname, email, pass, age, weight, height, gender, goal, exp, activity };

  try {
    const res = await fetch('/api/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();

    if (!res.ok) { alert(data.error); return; }

    U = data.user;
    localStorage.setItem('apexSessionEmail', U.email);
    if (data.token) {
      localStorage.setItem('apexSessionToken', data.token);
    }
    postAuthFlow();
  } catch (err) {
    alert('Server error. Please try again later.');
  }
}

function postAuthFlow() { if (U.profileComplete === false) { document.getElementById('profile-setup-overlay').style.display = 'flex'; } else { postAuthFlow(); } }
async function completeProfileSetup() { const age = parseFloat(document.getElementById('ps-age').value); const weight = parseFloat(document.getElementById('ps-weight').value); const height = parseFloat(document.getElementById('ps-height').value); const goal = document.getElementById('ps-goal').value; const exp = document.getElementById('ps-exp').value; const budget = document.getElementById('ps-budget').value || 'medium'; if (!age || !weight || !height) { alert('Please fill all required fields.'); return; } try { const token = localStorage.getItem('apexSessionToken'); const res = await fetch('/api/auth/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ age, weight, height, goal, exp, budget, profileComplete: true }) }); if (!res.ok) throw new Error('Update failed'); U.age = age; U.weight = weight; U.height = height; U.goal = goal; U.exp = exp; U.budget = budget; U.profileComplete = true; document.getElementById('profile-setup-overlay').style.display = 'none'; showToast('Profile Setup Complete! AI generated your plans.', 'success'); postAuthFlow(); } catch (error) { alert('Could not save profile details.'); } }
function doLogout() {
  U = {};
  localStorage.removeItem('apexSessionEmail');
  localStorage.removeItem('apexSessionToken');
  showPage('pg-landing');
}

// ── DASHBOARD INIT ──
function initDashboard() {
  const { fname, lname, weight, height, age, gender, goal, exp, activity, plan } = U;

  // Sidebar
  const name = (fname + ' ' + (lname || '')).trim();
  document.getElementById('sb-avatar').textContent = (fname || 'A')[0].toUpperCase();
  document.getElementById('sb-name').textContent = name;
  const planEl = document.getElementById('sb-plan');
  planEl.textContent = plan === 'pro' ? '⭐ Pro Plan' : plan === 'elite' ? '👑 Elite Plan' : 'Free Plan';
  planEl.className = 'sb-plan' + (plan === 'pro' ? ' pro' : plan === 'elite' ? ' elite' : '');

  // Header
  const hrs = new Date().getHours();
  const greet = hrs < 12 ? 'Good Morning,' : hrs < 17 ? 'Good Afternoon,' : 'Good Evening,';
  document.getElementById('dash-title').textContent = greet.replace(',', '') + ' ' + (fname || '').toUpperCase();

  const now = new Date();
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  document.getElementById('dash-date').innerHTML =
    days[now.getDay()] + ', ' + now.toLocaleDateString('en-IN', { month: 'long', day: 'numeric', year: 'numeric' });

  // Calculate macros using Mifflin-St Jeor BMR
  const bmr = gender === 'female'
    ? 10 * weight + 6.25 * height - 5 * age - 161
    : 10 * weight + 6.25 * height - 5 * age + 5;

  const actMap = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, veryactive: 1.9 };
  const actVal = parseFloat(activity) || 1.55;
  const tdee = Math.round(bmr * actVal);

  let cal;
  if (goal === 'bulk') cal = tdee + 300;
  else if (goal === 'cut') cal = tdee - 500;
  else cal = tdee;
  cal = Math.max(cal, 1200);

  const prot = Math.round(weight * 2);
  const fats = Math.round(cal * 0.25 / 9);
  const carbs = Math.round((cal - prot * 4 - fats * 9) / 4);
  const fibre = Math.round(cal / 1000 * 14);
  const bmi = Math.round(weight / Math.pow(height / 100, 2) * 10) / 10;
  const bmiLbl = bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Normal' : bmi < 30 ? 'Overweight' : 'Obese';

  // Metrics
  document.getElementById('m-cal').textContent = cal;
  document.getElementById('m-prot').innerHTML = prot + '<span class="metric-unit">g</span>';
  document.getElementById('m-weight').innerHTML = weight + '<span class="metric-unit">kg</span>';

  // Macro display
  document.getElementById('ring-cal').textContent = cal;
  document.getElementById('bar-prot').textContent = prot + 'g';
  document.getElementById('bar-carbs').textContent = carbs + 'g';
  document.getElementById('bar-fats').textContent = fats + 'g';
  document.getElementById('bar-fibre').textContent = fibre + 'g';

  setTimeout(() => {
    const maxProt = prot / 250 * 100;
    document.getElementById('fill-prot').style.width = Math.min(maxProt, 100) + '%';
    document.getElementById('fill-carbs').style.width = Math.min(carbs / 350 * 100, 100) + '%';
    document.getElementById('fill-fats').style.width = Math.min(fats / 80 * 100, 100) + '%';
    document.getElementById('fill-fibre').style.width = Math.min(fibre / 35 * 100, 100) + '%';
    // Ring: circumference = 2πr = 2*π*66 ≈ 414.7
    const circ = 414.7;
    const offset = circ - (cal / 3000) * circ;
    document.getElementById('calRing').style.strokeDasharray = circ;
    document.getElementById('calRing').style.strokeDashoffset = Math.max(offset, 20);
  }, 300);

  // Progress tab
  if (document.getElementById('pg-weight')) document.getElementById('pg-weight').textContent = weight;
  if (document.getElementById('pg-tdee')) document.getElementById('pg-tdee').textContent = tdee;
  if (document.getElementById('pg-cal')) document.getElementById('pg-cal').textContent = cal;
  if (document.getElementById('pg-prot')) document.getElementById('pg-prot').textContent = prot;
  if (document.getElementById('pg-bmi')) document.getElementById('pg-bmi').textContent = bmi;
  if (document.getElementById('pg-bmi-lbl')) document.getElementById('pg-bmi-lbl').textContent = bmiLbl;

  // Pre-fill diet form
  document.getElementById('d-weight').value = weight || '';
  document.getElementById('d-age').value = age || '';
  document.getElementById('d-height').value = height || '';
  if (gender) document.getElementById('d-gender').value = gender;
  if (goal) document.getElementById('d-goal').value = goal;

  // Plan-based locks
  const isFree = !plan || plan === 'free';
  document.getElementById('free-banner').style.display = isFree ? 'flex' : 'none';
  document.getElementById('workout-free-lock').style.display = isFree ? 'flex' : 'none';
  document.getElementById('diet-free-lock').style.display = isFree ? 'flex' : 'none';
  document.getElementById('progress-free-lock').style.display = isFree ? 'flex' : 'none';

  // Today chip
  const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const todayIdx = new Date().getDay();
  cachedCalTarget = cal; cachedProtTarget = prot; fetchMealLogs(); fetchWorkoutLogsAndPlan(); fetchHabits(); document.querySelectorAll('.week-chips .day-chip').forEach((el, i) => {
    el.classList.remove('today');
    if (el.textContent === dayNames[todayIdx]) el.classList.add('today');
  });
}

// ── WORKOUT GENERATOR ──
const PLANS = {
  bulk: {
    beginner: {
      3: [
        { day: 'Day 1', name: 'Full Body A', tag: 'Push Emphasis', ex: ['Squat 4×8', 'Bench Press 4×8', 'Shoulder Press 3×10', 'Tricep Pushdown 3×12', 'Leg Raises 3×15'] },
        { day: 'Day 2', name: 'Full Body B', tag: 'Pull Emphasis', ex: ['Deadlift 4×5', 'Barbell Row 4×8', 'Pull-ups 3×Max', 'Bicep Curls 3×12', 'Planks 3×45s'] },
        { day: 'Day 3', name: 'Full Body C', tag: 'Leg Emphasis', ex: ['Squat 4×6', 'Romanian Deadlift 3×10', 'Leg Press 3×12', 'Lunges 3×12', 'Calf Raises 4×15'] }
      ],
      4: [
        { day: 'Day 1', name: 'Upper A', tag: 'Push', ex: ['Bench Press 4×8', 'OHP 3×10', 'Incline DB 3×10', 'Triceps 3×12'] },
        { day: 'Day 2', name: 'Lower A', tag: 'Quad Focus', ex: ['Squat 4×8', 'Leg Press 3×12', 'Lunges 3×12', 'Calf Raises 4×15'] },
        { day: 'Day 3', name: 'Upper B', tag: 'Pull', ex: ['Deadlift 3×6', 'Barbell Row 4×8', 'Pull-ups 3×Max', 'Bicep Curls 3×12'] },
        { day: 'Day 4', name: 'Lower B', tag: 'Hamstring Focus', ex: ['Romanian Deadlift 4×10', 'Leg Curl 3×12', 'Step-ups 3×12', 'Calf Raises 4×15'] }
      ]
    },
    intermediate: {
      4: [
        { day: 'Day 1', name: 'Push A', tag: 'Strength', ex: ['Bench Press 5×5', 'OHP 4×6', 'Incline DB 4×8', 'Lateral Raises 3×15', 'Tri Pushdown 4×12'] },
        { day: 'Day 2', name: 'Pull A', tag: 'Strength', ex: ['Deadlift 4×5', 'Barbell Row 4×6', 'Weighted Pull-ups 4×Max', 'Face Pulls 3×15', 'Hammer Curls 3×12'] },
        { day: 'Day 3', name: 'Legs', tag: 'Volume', ex: ['Squat 5×5', 'Romanian Deadlift 4×8', 'Leg Press 4×12', 'Leg Curl 3×12', 'Calf Raises 5×15'] },
        { day: 'Day 4', name: 'Upper', tag: 'Hypertrophy', ex: ['DB Bench 4×10', 'Cable Row 4×10', 'Arnold Press 3×12', 'Cable Fly 3×15', 'Curls + Triceps 3×12'] }
      ],
      5: [
        { day: 'Day 1', name: 'Push A', tag: 'Strength', ex: ['Bench Press 5×5', 'OHP 4×6', 'Incline DB 4×8', 'Lateral Raises 3×15', 'Tri Pushdown 3×12'] },
        { day: 'Day 2', name: 'Pull A', tag: 'Strength', ex: ['Deadlift 4×5', 'Weighted Pull-ups 4×6', 'Barbell Row 4×8', 'Face Pulls 3×15', 'Hammer Curls 3×12'] },
        { day: 'Day 3', name: 'Legs', tag: 'Volume', ex: ['Squat 5×5', 'Romanian Deadlift 4×8', 'Leg Press 4×12', 'Leg Curl 4×12', 'Calf Raises 5×15'] },
        { day: 'Day 4', name: 'Push B', tag: 'Hypertrophy', ex: ['Incline Bench 4×10', 'Cable Fly 4×15', 'Arnold Press 4×12', 'Cable Lateral 4×20', 'Overhead Tri 4×12'] },
        { day: 'Day 5', name: 'Pull B', tag: 'Hypertrophy', ex: ['Pendlay Row 4×8', 'Cable Row 4×12', 'Lat Pulldown 4×12', 'DB Row 4×12', 'Incline Curl 4×12'] }
      ]
    },
    advanced: {
      5: [
        { day: 'Day 1', name: 'Push A', tag: 'Heavy', ex: ['Bench Press 6×4', 'OHP 5×5', 'Incline DB 4×8', 'Lateral Raises 4×15', 'Tri Pushdown 4×12'] },
        { day: 'Day 2', name: 'Pull A', tag: 'Heavy', ex: ['Deadlift 5×4', 'Weighted Pull-ups 5×5', 'Barbell Row 4×6', 'Shrugs 4×12', 'Preacher Curl 4×10'] },
        { day: 'Day 3', name: 'Legs A', tag: 'Heavy', ex: ['Squat 6×4', 'Romanian Deadlift 4×8', 'Hack Squat 4×10', 'Leg Curl 4×12', 'Calf Raises 6×15'] },
        { day: 'Day 4', name: 'Push B', tag: 'Volume', ex: ['Incline Bench 4×10', 'Pec Deck 4×15', 'Arnold Press 4×12', 'Cable Lateral 4×20', 'Overhead Tri 4×12'] },
        { day: 'Day 5', name: 'Pull B', tag: 'Volume', ex: ['Pendlay Row 4×8', 'Lat Pulldown 4×12', 'Cable Row 4×12', 'DB Row 4×12', 'Incline Curl 4×12'] }
      ],
      6: [
        { day: 'Day 1', name: 'Chest', tag: 'Volume', ex: ['Bench Press 5×6', 'Incline DB 4×10', 'Pec Deck 4×15', 'Cable Crossover 4×15'] },
        { day: 'Day 2', name: 'Back', tag: 'Volume', ex: ['Deadlift 4×5', 'Weighted Pull-ups 4×8', 'Barbell Row 4×8', 'Cable Row 4×12', 'Lat Pulldown 4×12'] },
        { day: 'Day 3', name: 'Shoulders', tag: 'Volume', ex: ['OHP 5×6', 'Arnold Press 4×10', 'Lateral Raises 5×15', 'Face Pulls 4×20', 'Shrugs 4×15'] },
        { day: 'Day 4', name: 'Legs A', tag: 'Quad', ex: ['Squat 5×5', 'Leg Press 4×12', 'Hack Squat 4×10', 'Lunges 3×12', 'Calf Raises 5×15'] },
        { day: 'Day 5', name: 'Arms', tag: 'Volume', ex: ['EZ Bar Curl 4×12', 'Preacher Curl 4×12', 'Skull Crushers 4×12', 'Rope Pushdown 4×15', 'Hammer Curls 3×15'] },
        { day: 'Day 6', name: 'Legs B', tag: 'Hamstring', ex: ['Romanian Deadlift 4×8', 'Leg Curl 4×12', 'Step-ups 3×12', 'Calf Raises 5×15'] }
      ]
    }
  },
  cut: {
    beginner: {
      3: [
        { day: 'Day 1', name: 'Full Body A', tag: 'Preserve Muscle', ex: ['Squat 3×10', 'DB Bench 3×10', 'DB Row 3×10', 'Plank 3×45s', 'Bicycle Crunches 3×20'] },
        { day: 'Day 2', name: 'Full Body B', tag: 'Metabolic', ex: ['Deadlift 3×8', 'OHP 3×10', 'Lat Pulldown 3×12', 'Mountain Climbers 3×30s'] },
        { day: 'Day 3', name: 'Circuit', tag: 'Fat Burn', ex: ['Bodyweight Squat 4×15', 'Push-ups 4×15', 'Dumbbell Row 4×12', 'Jump Rope 4×2min', 'Burpees 3×10'] }
      ],
      4: [
        { day: 'Day 1', name: 'Upper A', tag: 'Compound', ex: ['Bench Press 3×10', 'Barbell Row 3×10', 'OHP 3×12', 'Face Pulls 3×15'] },
        { day: 'Day 2', name: 'Lower A', tag: 'Fat Burn', ex: ['Goblet Squat 4×15', 'RDL 4×12', 'Walking Lunges 3×20', 'Calf Raises 4×20'] },
        { day: 'Day 3', name: 'Upper B', tag: 'Isolation', ex: ['DB Incline 3×12', 'Cable Row 3×12', 'Lateral Raises 4×20', 'Curls + Tri 3×15'] },
        { day: 'Day 4', name: 'Cardio + Core', tag: 'Metabolic', ex: ['HIIT 20 min', 'Plank Holds 4×60s', 'Leg Raises 4×15', 'Russian Twists 4×20'] }
      ]
    },
    intermediate: {
      5: [
        { day: 'Day 1', name: 'Push', tag: 'High Rep', ex: ['Bench 4×12', 'Incline DB 4×12', 'Lateral Raises 4×20', 'Tri Rope 4×15'] },
        { day: 'Day 2', name: 'Pull', tag: 'High Rep', ex: ['Pull-ups 4×12', 'DB Row 4×12', 'Cable Row 4×15', 'Curls 4×15'] },
        { day: 'Day 3', name: 'Legs', tag: 'High Rep', ex: ['Goblet Squat 4×15', 'RDL 4×12', 'Leg Press 4×15', 'Walking Lunges 3×20'] },
        { day: 'Day 4', name: 'Upper', tag: 'Compound', ex: ['OHP 4×10', 'Barbell Row 4×10', 'DB Fly 4×15', 'Face Pulls 4×20'] },
        { day: 'Day 5', name: 'Cardio + Core', tag: 'Shred', ex: ['HIIT 20min', 'Steady Cardio 20min', 'Crunches 4×20', 'Plank 3×60s'] }
      ],
      6: [
        { day: 'Day 1', name: 'Push A', tag: 'Strength', ex: ['Bench 4×8', 'OHP 4×10', 'Incline DB 4×12', 'Tri Pushdown 4×15'] },
        { day: 'Day 2', name: 'Pull A', tag: 'Strength', ex: ['Deadlift 3×5', 'Pull-ups 4×10', 'Barbell Row 4×10', 'Curls 4×12'] },
        { day: 'Day 3', name: 'Legs + HIIT', tag: 'Fat Burn', ex: ['Squat 4×12', 'RDL 4×12', 'Leg Press 4×15', 'HIIT 15min'] },
        { day: 'Day 4', name: 'Push B', tag: 'Volume', ex: ['DB Bench 4×15', 'Cable Lateral 4×20', 'Pec Deck 4×15', 'Overhead Tri 4×15'] },
        { day: 'Day 5', name: 'Pull B', tag: 'Volume', ex: ['Lat Pulldown 4×15', 'Cable Row 4×15', 'Reverse Fly 4×20', 'Hammer Curl 4×15'] },
        { day: 'Day 6', name: 'Core + Cardio', tag: 'Metabolic', ex: ['LISS 40min', 'Plank 4×60s', 'V-Ups 4×20', 'Russian Twists 4×30', 'Mountain Climbers 3×30s'] }
      ]
    },
    advanced: {
      6: [
        { day: 'Day 1', name: 'Push', tag: 'Heavy', ex: ['Bench 5×6', 'OHP 4×8', 'Incline DB 4×10', 'Cable Fly 4×15', 'Tri 4×15'] },
        { day: 'Day 2', name: 'Pull', tag: 'Heavy', ex: ['Deadlift 4×5', 'Weighted Pull-ups 4×6', 'Barbell Row 4×8', 'Curls 4×12'] },
        { day: 'Day 3', name: 'Legs A', tag: 'Heavy', ex: ['Squat 5×5', 'RDL 4×8', 'Hack Squat 4×10', 'Leg Curl 3×12', 'Calf 5×20'] },
        { day: 'Day 4', name: 'Upper Volume', tag: 'Hypertrophy', ex: ['DB Bench 4×15', 'Cable Row 4×15', 'Arnold 4×12', 'Pec Deck 4×15', 'Arms 4×15'] },
        { day: 'Day 5', name: 'Legs B', tag: 'Volume', ex: ['Front Squat 4×10', 'Leg Curl 4×12', 'Walking Lunges 3×20', 'Calf 4×20'] },
        { day: 'Day 6', name: 'HIIT + Core', tag: 'Shred', ex: ['HIIT Sprint Intervals 25min', 'Plank 4×60s', 'Dragon Flag 3×8', 'Hanging Leg Raise 4×15'] }
      ]
    }
  },
  maintain: {
    beginner: {
      3: [
        { day: 'Day 1', name: 'Upper', tag: 'Balanced', ex: ['Bench 3×10', 'Row 3×10', 'OHP 3×10', 'Curls 3×12', 'Triceps 3×12'] },
        { day: 'Day 2', name: 'Lower', tag: 'Balanced', ex: ['Squat 3×10', 'RDL 3×10', 'Leg Press 3×12', 'Calf Raises 3×15'] },
        { day: 'Day 3', name: 'Full Body', tag: 'Compound', ex: ['Deadlift 3×8', 'Pull-ups 3×Max', 'DB Bench 3×10', 'Lunges 3×12', 'Core 3×30s'] }
      ]
    },
    intermediate: {
      4: [
        { day: 'Day 1', name: 'Push', tag: 'Maintain', ex: ['Bench 4×8', 'OHP 3×10', 'Lateral Raises 3×15', 'Tri 3×12'] },
        { day: 'Day 2', name: 'Pull', tag: 'Maintain', ex: ['Pull-ups 4×8', 'Row 3×10', 'Face Pulls 3×15', 'Curls 3×12'] },
        { day: 'Day 3', name: 'Legs', tag: 'Maintain', ex: ['Squat 4×8', 'RDL 3×10', 'Leg Press 3×12', 'Calf 4×15'] },
        { day: 'Day 4', name: 'Upper Mix', tag: 'Hypertrophy', ex: ['DB Bench 4×12', 'Cable Row 4×12', 'Shoulder 3×12', 'Arms 4×12', 'Core 3×45s'] }
      ]
    },
    advanced: {
      5: [
        { day: 'Day 1', name: 'Push', tag: 'Strength', ex: ['Bench 5×5', 'OHP 4×6', 'Incline 4×8', 'Lateral 4×15', 'Tri 4×12'] },
        { day: 'Day 2', name: 'Pull', tag: 'Strength', ex: ['Deadlift 4×5', 'Weighted Pull-ups 4×6', 'Row 4×8', 'Curls 4×10'] },
        { day: 'Day 3', name: 'Legs', tag: 'Strength', ex: ['Squat 5×5', 'RDL 4×8', 'Hack Squat 4×10', 'Calf 5×15'] },
        { day: 'Day 4', name: 'Upper B', tag: 'Volume', ex: ['DB Bench 4×12', 'Cable Row 4×12', 'Arnold 4×12', 'Fly 4×15', 'Arms 4×12'] },
        { day: 'Day 5', name: 'Lower B', tag: 'Volume', ex: ['Front Squat 4×10', 'Leg Curl 4×12', 'Walking Lunges 3×20', 'Calf 4×20'] }
      ]
    }
  }
};

function getBestPlan(goal, exp, days) {
  const g = PLANS[goal] || PLANS['maintain'];
  const e = g[exp] || g['beginner'] || Object.values(g)[0];
  if (e[days]) return e[days];
  // find closest days
  const availDays = Object.keys(e).map(Number).sort((a, b) => a - b);
  const closest = availDays.reduce((prev, curr) => Math.abs(curr - days) < Math.abs(prev - days) ? curr : prev);
  return e[closest];
}

function generateWorkout() {
  const goal = document.getElementById('wg-goal').value;
  const exp = document.getElementById('wg-exp').value;
  const days = parseInt(document.getElementById('wg-days').value);

  if (!goal || !exp || !days) { alert('Please select all options.'); return; }

  const isFree = !U.plan || U.plan === 'free';
  const plan = getBestPlan(goal, exp, days);
  if (!plan || !plan.length) { alert('No plan found for this combination. Try a different selection.'); return; }

  const displayPlan = isFree ? plan.slice(0, 3) : plan; const interSetRest = '60-90s'; const interExRest = '2-3 min';
  let html = `
    <div style="margin:16px 0 14px;padding:14px 16px;background:rgba(200,255,0,0.06);border:1px solid rgba(200,255,0,0.18);">
      <div style="font-family:var(--font-m);font-size:0.65rem;color:var(--accent);letter-spacing:2px;text-transform:uppercase;margin-bottom:4px;">
        ${goal.toUpperCase()} · ${exp.toUpperCase()} · ${days}-DAY SPLIT
      </div>
      <div style="font-size:0.82rem;color:var(--muted);">Tap any exercise pill to mark as done. Generated for your goal.</div>
    </div>`;

  displayPlan.forEach(d => {
    html += `
    <div class="split-day-card">
      <div class="sdc-hd"><div class="sdc-name">${d.day} — ${d.name} <br><span style="font-size:0.65rem;color:var(--muted);font-weight:400;text-transform:uppercase;">TARGET: ${getMuscleTarget(d.name)}</span></div><div class="sdc-tag">${d.tag}</div></div>
      <div class="sdc-exs">${d.ex.map(e => `<div class="ex-pill" data-desc="Rest ${interSetRest} between sets" onclick="this.style.borderColor='var(--accent)';this.style.color='var(--text)'">${expandAbbrev(e)}</div>`).join('')}</div>
    </div>`;
  });

  if (isFree && plan.length > 3) {
    html += `<div style="padding:16px;background:rgba(255,69,69,0.06);border:1px solid rgba(255,69,69,0.2);margin-top:10px;font-size:0.85rem;color:var(--muted);">
      🔒 <strong style="color:var(--text);">${plan.length - 3} more days hidden.</strong> Upgrade to Pro to unlock the full split.
      <button class="btn-upgrade" style="margin-top:10px;display:block;" onclick="openPayment()">Upgrade ₹39/mo →</button>
    </div>`;
  }

  const res = document.getElementById('workoutResult');
  res.innerHTML = html;
  res.style.display = 'block';
}

// ── DIET GENERATOR ──
const FOODS = {
  veg: {
    low: [
      { e: '🥚', name: 'Whole Eggs (4)', p: 24, cal: 280, c: 2, f: 20, fi: 0, cost: 24, meal: 'Breakfast / Snack' },
      { e: '🫘', name: 'Moong Dal (150g dry)', p: 24, cal: 520, c: 90, f: 2, fi: 8, cost: 18, meal: 'Lunch / Dinner' },
      { e: '🍚', name: 'White Rice (200g)', p: 4, cal: 260, c: 56, f: 1, fi: 1, cost: 10, meal: 'Lunch / Dinner' },
      { e: '🥜', name: 'Peanut Butter (3 tbsp)', p: 12, cal: 285, c: 9, f: 24, fi: 2, cost: 20, meal: 'Breakfast / Snack' },
      { e: '🍌', name: 'Banana (2)', p: 2, cal: 210, c: 54, f: 0, fi: 3, cost: 10, meal: 'Snack / Pre-workout' },
      { e: '🫓', name: 'Whole Wheat Roti (4)', p: 12, cal: 320, c: 60, f: 4, fi: 5, cost: 12, meal: 'Lunch / Dinner' },
      { e: '🥛', name: 'Full Cream Milk (500ml)', p: 17, cal: 310, c: 24, f: 17, fi: 0, cost: 30, meal: 'Breakfast / Dinner' },
      { e: '🟤', name: 'Soya Chunks (60g dry)', p: 30, cal: 205, c: 12, f: 1, fi: 3, cost: 14, meal: 'Lunch / Dinner' },
      { e: '🫐', name: 'Seasonal Fruits Mix', p: 2, cal: 120, c: 30, f: 0, fi: 4, cost: 20, meal: 'Snack' },
      { e: '🥦', name: 'Vegetables (200g)', p: 4, cal: 60, c: 12, f: 0, fi: 6, cost: 20, meal: 'Lunch / Dinner' },
      { e: '🌾', name: 'Oats (80g)', p: 10, cal: 310, c: 54, f: 5, fi: 6, cost: 12, meal: 'Breakfast' },
      { e: '🧀', name: 'Paneer (100g)', p: 18, cal: 265, c: 4, f: 20, fi: 0, cost: 40, meal: 'Lunch / Dinner' },
    ],
    medium: [
      { e: '🧀', name: 'Paneer (150g)', p: 27, cal: 398, c: 6, f: 30, fi: 0, cost: 60, meal: 'Lunch / Dinner' },
      { e: '🌾', name: 'Oats (100g)', p: 13, cal: 389, c: 66, f: 7, fi: 8, cost: 15, meal: 'Breakfast' },
      { e: '🥚', name: 'Whole Eggs (6)', p: 36, cal: 420, c: 3, f: 30, fi: 0, cost: 36, meal: 'Breakfast / Snack' },
      { e: '🥛', name: 'Greek Yogurt (250g)', p: 25, cal: 165, c: 10, f: 5, fi: 0, cost: 50, meal: 'Snack / Breakfast' },
      { e: '🫘', name: 'Rajma (150g dry)', p: 22, cal: 510, c: 90, f: 2, fi: 12, cost: 25, meal: 'Lunch / Dinner' },
      { e: '🍚', name: 'Brown Rice (200g)', p: 5, cal: 260, c: 54, f: 2, fi: 3, cost: 20, meal: 'Lunch / Dinner' },
      { e: '🥑', name: 'Avocado (½)', p: 2, cal: 120, c: 6, f: 11, fi: 5, cost: 50, meal: 'Breakfast / Snack' },
      { e: '🍌', name: 'Banana (3)', p: 3, cal: 315, c: 81, f: 0, fi: 4, cost: 15, meal: 'Pre/Post workout' },
      { e: '🥦', name: 'Broccoli (200g)', p: 5, cal: 68, c: 13, f: 1, fi: 5, cost: 30, meal: 'Lunch / Dinner' },
      { e: '🫐', name: 'Blueberries (150g)', p: 2, cal: 86, c: 21, f: 0, fi: 4, cost: 70, meal: 'Breakfast / Snack' },
      { e: '🌽', name: 'Sweet Potato (200g)', p: 4, cal: 172, c: 40, f: 0, fi: 4, cost: 20, meal: 'Lunch / Pre-workout' },
      { e: '🥜', name: 'Almonds (30g)', p: 6, cal: 174, c: 6, f: 15, fi: 4, cost: 35, meal: 'Snack' },
    ],
    high: [
      { e: '🧀', name: 'Paneer (200g)', p: 36, cal: 530, c: 8, f: 40, fi: 0, cost: 80, meal: 'Lunch / Dinner' },
      { e: '💊', name: 'Whey Protein Shake', p: 25, cal: 130, c: 5, f: 2, fi: 0, cost: 60, meal: 'Post-workout' },
      { e: '🥚', name: 'Whole Eggs (6)', p: 36, cal: 420, c: 3, f: 30, fi: 0, cost: 36, meal: 'Breakfast' },
      { e: '🥑', name: 'Avocado (1 full)', p: 4, cal: 240, c: 12, f: 22, fi: 10, cost: 100, meal: 'Breakfast / Snack' },
      { e: '🫐', name: 'Mixed Berries (200g)', p: 2, cal: 110, c: 27, f: 0, fi: 7, cost: 120, meal: 'Breakfast / Snack' },
      { e: '🌾', name: 'Quinoa (150g dry)', p: 12, cal: 540, c: 94, f: 6, fi: 7, cost: 60, meal: 'Lunch / Dinner' },
      { e: '🥦', name: 'Broccoli + Spinach', p: 6, cal: 80, c: 15, f: 1, fi: 7, cost: 40, meal: 'Lunch / Dinner' },
      { e: '🥛', name: 'Greek Yogurt (300g)', p: 30, cal: 195, c: 12, f: 6, fi: 0, cost: 80, meal: 'Snack / Breakfast' },
      { e: '🥜', name: 'Mixed Nuts (40g)', p: 8, cal: 240, c: 8, f: 20, fi: 3, cost: 80, meal: 'Snack' },
      { e: '🫒', name: 'Olive Oil (tbsp)', p: 0, cal: 119, c: 0, f: 14, fi: 0, cost: 10, meal: 'Cooking' },
      { e: '🌽', name: 'Sweet Potato (300g)', p: 6, cal: 258, c: 60, f: 0, fi: 6, cost: 30, meal: 'Pre-workout' },
    ]
  },
  nonveg: {
    low: [
      { e: '🥚', name: 'Whole Eggs (4)', p: 24, cal: 280, c: 2, f: 20, fi: 0, cost: 24, meal: 'Breakfast' },
      { e: '🍗', name: 'Egg Whites (6)', p: 18, cal: 90, c: 0, f: 0, fi: 0, cost: 20, meal: 'Breakfast / Post-workout' },
      { e: '🍚', name: 'White Rice (200g)', p: 4, cal: 260, c: 56, f: 1, fi: 1, cost: 10, meal: 'Lunch / Dinner' },
      { e: '🐟', name: 'Canned Tuna (100g)', p: 25, cal: 116, c: 0, f: 1, fi: 0, cost: 40, meal: 'Lunch / Snack' },
      { e: '🍌', name: 'Banana (2)', p: 2, cal: 210, c: 54, f: 0, fi: 3, cost: 10, meal: 'Snack' },
      { e: '🫓', name: 'Whole Wheat Roti (4)', p: 12, cal: 320, c: 60, f: 4, fi: 5, cost: 12, meal: 'Lunch / Dinner' },
      { e: '🥛', name: 'Milk (500ml)', p: 17, cal: 310, c: 24, f: 17, fi: 0, cost: 30, meal: 'Breakfast / Night' },
      { e: '🍗', name: 'Chicken Leg (100g)', p: 20, cal: 180, c: 0, f: 10, fi: 0, cost: 35, meal: 'Dinner' },
      { e: '🥦', name: 'Vegetables (200g)', p: 4, cal: 60, c: 12, f: 0, fi: 6, cost: 20, meal: 'Lunch / Dinner' },
      { e: '🫘', name: 'Dal (100g dry)', p: 16, cal: 350, c: 60, f: 1, fi: 6, cost: 12, meal: 'Lunch / Dinner' },
      { e: '🌾', name: 'Oats (80g)', p: 10, cal: 310, c: 54, f: 5, fi: 6, cost: 12, meal: 'Breakfast' },
    ],
    medium: [
      { e: '🍗', name: 'Chicken Breast (200g)', p: 54, cal: 330, c: 0, f: 7, fi: 0, cost: 60, meal: 'Lunch / Dinner' },
      { e: '🥚', name: 'Whole Eggs (4)', p: 24, cal: 280, c: 2, f: 20, fi: 0, cost: 24, meal: 'Breakfast' },
      { e: '🌾', name: 'Oats (100g)', p: 13, cal: 389, c: 66, f: 7, fi: 8, cost: 15, meal: 'Breakfast' },
      { e: '🥛', name: 'Greek Yogurt (250g)', p: 25, cal: 165, c: 10, f: 5, fi: 0, cost: 50, meal: 'Snack' },
      { e: '🍚', name: 'Brown Rice (200g)', p: 5, cal: 260, c: 54, f: 2, fi: 3, cost: 20, meal: 'Lunch / Dinner' },
      { e: '🍌', name: 'Banana (3)', p: 3, cal: 315, c: 81, f: 0, fi: 4, cost: 15, meal: 'Pre-workout' },
      { e: '🥦', name: 'Broccoli (200g)', p: 5, cal: 68, c: 13, f: 1, fi: 5, cost: 30, meal: 'Lunch / Dinner' },
      { e: '🫐', name: 'Seasonal Fruits', p: 2, cal: 120, c: 30, f: 0, fi: 5, cost: 30, meal: 'Snack' },
      { e: '🌽', name: 'Sweet Potato (200g)', p: 4, cal: 172, c: 40, f: 0, fi: 4, cost: 20, meal: 'Pre-workout' },
      { e: '🥜', name: 'Almonds (30g)', p: 6, cal: 174, c: 6, f: 15, fi: 4, cost: 35, meal: 'Snack' },
      { e: '🐟', name: 'Fish (150g)', p: 30, cal: 210, c: 0, f: 8, fi: 0, cost: 50, meal: 'Lunch / Dinner' },
    ],
    high: [
      { e: '🍗', name: 'Chicken Breast (300g)', p: 81, cal: 495, c: 0, f: 10, fi: 0, cost: 90, meal: 'Lunch / Dinner' },
      { e: '💊', name: 'Whey Protein Shake', p: 25, cal: 130, c: 5, f: 2, fi: 0, cost: 60, meal: 'Post-workout' },
      { e: '🐟', name: 'Salmon (180g)', p: 40, cal: 374, c: 0, f: 22, fi: 0, cost: 150, meal: 'Dinner' },
      { e: '🥚', name: 'Whole Eggs (6)', p: 36, cal: 420, c: 3, f: 30, fi: 0, cost: 36, meal: 'Breakfast' },
      { e: '🥑', name: 'Avocado (1)', p: 4, cal: 240, c: 12, f: 22, fi: 10, cost: 100, meal: 'Breakfast' },
      { e: '🫐', name: 'Mixed Berries (200g)', p: 2, cal: 110, c: 27, f: 0, fi: 7, cost: 120, meal: 'Breakfast / Snack' },
      { e: '🌾', name: 'Quinoa (150g dry)', p: 12, cal: 540, c: 94, f: 6, fi: 7, cost: 60, meal: 'Lunch' },
      { e: '🥦', name: 'Broccoli + Spinach', p: 6, cal: 80, c: 15, f: 1, fi: 7, cost: 40, meal: 'Lunch / Dinner' },
      { e: '🥛', name: 'Greek Yogurt (300g)', p: 30, cal: 195, c: 12, f: 6, fi: 0, cost: 80, meal: 'Snack' },
      { e: '🌽', name: 'Sweet Potato (300g)', p: 6, cal: 258, c: 60, f: 0, fi: 6, cost: 30, meal: 'Pre-workout' },
      { e: '🥜', name: 'Mixed Nuts (40g)', p: 8, cal: 240, c: 8, f: 20, fi: 3, cost: 80, meal: 'Snack' },
    ]
  },
  vegan: {
    low: [
      { e: '🟤', name: 'Soya Chunks (60g dry)', p: 30, cal: 205, c: 12, f: 1, fi: 3, cost: 14, meal: 'Lunch / Dinner' },
      { e: '🫘', name: 'Moong Dal (150g dry)', p: 24, cal: 520, c: 90, f: 2, fi: 8, cost: 18, meal: 'Lunch / Dinner' },
      { e: '🍚', name: 'White Rice (200g)', p: 4, cal: 260, c: 56, f: 1, fi: 1, cost: 10, meal: 'Lunch / Dinner' },
      { e: '🥜', name: 'Peanut Butter (3 tbsp)', p: 12, cal: 285, c: 9, f: 24, fi: 2, cost: 20, meal: 'Breakfast / Snack' },
      { e: '🍌', name: 'Banana (3)', p: 3, cal: 315, c: 81, f: 0, fi: 4, cost: 15, meal: 'Snack / Pre-workout' },
      { e: '🌾', name: 'Oats (100g)', p: 13, cal: 389, c: 66, f: 7, fi: 8, cost: 12, meal: 'Breakfast' },
      { e: '🫓', name: 'Whole Wheat Roti (4)', p: 12, cal: 320, c: 60, f: 4, fi: 5, cost: 12, meal: 'Lunch / Dinner' },
      { e: '🥦', name: 'Vegetables (200g)', p: 4, cal: 60, c: 12, f: 0, fi: 6, cost: 20, meal: 'Lunch / Dinner' },
      { e: '🫐', name: 'Seasonal Fruits', p: 2, cal: 120, c: 30, f: 0, fi: 4, cost: 20, meal: 'Snack' },
    ],
    medium: [
      { e: '🌾', name: 'Quinoa (150g dry)', p: 12, cal: 540, c: 94, f: 6, fi: 7, cost: 60, meal: 'Lunch / Dinner' },
      { e: '🟤', name: 'Tofu (200g)', p: 20, cal: 144, c: 4, f: 8, fi: 2, cost: 50, meal: 'Lunch / Dinner' },
      { e: '🌾', name: 'Oats (100g)', p: 13, cal: 389, c: 66, f: 7, fi: 8, cost: 15, meal: 'Breakfast' },
      { e: '🥜', name: 'Almonds (40g)', p: 8, cal: 232, c: 8, f: 20, fi: 5, cost: 46, meal: 'Snack' },
      { e: '🫘', name: 'Chickpeas (200g cooked)', p: 15, cal: 330, c: 55, f: 5, fi: 12, cost: 25, meal: 'Lunch / Dinner' },
      { e: '🍌', name: 'Banana (3)', p: 3, cal: 315, c: 81, f: 0, fi: 4, cost: 15, meal: 'Pre-workout' },
      { e: '🥦', name: 'Broccoli (200g)', p: 5, cal: 68, c: 13, f: 1, fi: 5, cost: 30, meal: 'Lunch / Dinner' },
      { e: '🌽', name: 'Sweet Potato (200g)', p: 4, cal: 172, c: 40, f: 0, fi: 4, cost: 20, meal: 'Pre-workout' },
    ],
    high: [
      { e: '💊', name: 'Plant Protein Shake', p: 22, cal: 130, c: 5, f: 2, fi: 2, cost: 70, meal: 'Post-workout' },
      { e: '🌾', name: 'Quinoa (200g dry)', p: 16, cal: 720, c: 125, f: 8, fi: 10, cost: 80, meal: 'Lunch / Dinner' },
      { e: '🥑', name: 'Avocado (1 full)', p: 4, cal: 240, c: 12, f: 22, fi: 10, cost: 100, meal: 'Breakfast' },
      { e: '🟤', name: 'Tofu (300g)', p: 30, cal: 216, c: 6, f: 12, fi: 3, cost: 75, meal: 'Lunch / Dinner' },
      { e: '🫐', name: 'Mixed Berries (200g)', p: 2, cal: 110, c: 27, f: 0, fi: 7, cost: 120, meal: 'Breakfast / Snack' },
      { e: '🥜', name: 'Mixed Nuts (50g)', p: 10, cal: 300, c: 10, f: 25, fi: 4, cost: 100, meal: 'Snack' },
      { e: '🥦', name: 'Broccoli + Spinach', p: 6, cal: 80, c: 15, f: 1, fi: 7, cost: 40, meal: 'Lunch / Dinner' },
      { e: '🌽', name: 'Sweet Potato (300g)', p: 6, cal: 258, c: 60, f: 0, fi: 6, cost: 30, meal: 'Pre-workout' },
    ]
  }
};

function generateDiet() {
  const weight = parseFloat(document.getElementById('d-weight').value);
  const age = parseFloat(document.getElementById('d-age').value);
  const height = parseFloat(document.getElementById('d-height').value);
  const gender = document.getElementById('d-gender').value;
  const actVal = parseFloat(document.getElementById('d-activity').value);
  const goal = document.getElementById('d-goal').value;
  const diet = document.getElementById('d-diet').value;
  const budget = document.getElementById('d-budget').value;

  if (!weight || !age || !height || !gender || !actVal || !goal || !diet || !budget) {
    alert('Please fill all fields to generate your personalized meal plan.'); return;
  }

  // Mifflin-St Jeor BMR
  const bmr = gender === 'female'
    ? 10 * weight + 6.25 * height - 5 * age - 161
    : 10 * weight + 6.25 * height - 5 * age + 5;
  const tdee = Math.round(bmr * actVal);

  let cal;
  if (goal === 'bulk') cal = tdee + 300;
  else if (goal === 'cut') cal = tdee - 500;
  else cal = tdee;
  cal = Math.max(cal, 1200);

  const prot = Math.round(weight * 2);
  const fats = Math.round(cal * 0.25 / 9);
  const carbs = Math.round((cal - prot * 4 - fats * 9) / 4);
  const fibre = Math.round(cal / 1000 * 14);
  const bmi = (weight / Math.pow(height / 100, 2)).toFixed(1);

  const dietKey = diet || 'nonveg';
  const budgetKey = budget || 'medium';
  const foodList = (FOODS[dietKey] && FOODS[dietKey][budgetKey]) || FOODS.nonveg.medium;

  const isFree = !U.plan || U.plan === 'free';
  const displayFoods = isFree ? foodList.slice(0, 2) : foodList;

  let totalCost = displayFoods.reduce((s, f) => s + f.cost, 0);
  let totalP = displayFoods.reduce((s, f) => s + f.p, 0);
  let totalC = displayFoods.reduce((s, f) => s + f.c, 0);
  let totalFt = displayFoods.reduce((s, f) => s + f.f, 0);
  let totalFi = displayFoods.reduce((s, f) => s + f.fi, 0);
  let totalCal = displayFoods.reduce((s, f) => s + f.cal, 0);

  let html = `
    <div class="diet-top-metrics">
      <div class="dtm"><div class="dtm-val">${cal}</div><div class="dtm-unit">kcal</div><div class="dtm-lbl">Target</div></div>
      <div class="dtm"><div class="dtm-val">${prot}g</div><div class="dtm-unit">protein</div><div class="dtm-lbl">Daily</div></div>
      <div class="dtm"><div class="dtm-val">${fibre}g</div><div class="dtm-unit">fibre</div><div class="dtm-lbl">Daily</div></div>
      <div class="dtm"><div class="dtm-val">${tdee}</div><div class="dtm-unit">kcal</div><div class="dtm-lbl">TDEE</div></div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px;padding:12px;background:var(--surface);border:1px solid var(--border);font-family:var(--font-m);font-size:0.72rem;text-align:center;">
      <div><span style="color:var(--accent);">${prot}g</span><br><span style="color:var(--muted);">Protein</span></div>
      <div><span style="color:var(--accent3);">${carbs}g</span><br><span style="color:var(--muted);">Carbs</span></div>
      <div><span style="color:#ff7a3c;">${fats}g</span><br><span style="color:var(--muted);">Fats</span></div>
    </div>
    <div style="padding:10px 14px;background:rgba(200,255,0,0.05);border-left:3px solid var(--accent);margin-bottom:14px;font-size:0.82rem;color:var(--muted);">
      <strong style="color:var(--text);">BMI: ${bmi}</strong> · 
      <strong style="color:var(--text);">BMR: ${Math.round(bmr)} kcal</strong> · 
      ${goal === 'bulk' ? 'Surplus +300 kcal' : goal === 'cut' ? 'Deficit −500 kcal' : 'Maintenance calories'}
    </div>
    <div class="food-section-title">📋 Suggested Daily Foods — ${diet === 'veg' ? 'Vegetarian' : diet === 'vegan' ? 'Vegan' : 'Non-Vegetarian'} · ${budget === 'low' ? 'Budget' : budget === 'medium' ? 'Medium' : 'Premium'}</div>
    <div class="food-cards">`;

  displayFoods.forEach(f => {
    html += `
    <div class="food-card">
      <div class="fc-emoji">${f.e}</div>
      <div class="fc-info">
        <div class="fc-name">${f.name}</div>
        <div class="fc-macro">${f.p}g P · ${f.c}g C · ${f.f}g F · 🌿${f.fi}g Fibre · ${f.cal} kcal</div>
        <div class="fc-meal">🕐 ${f.meal}</div>
      </div>
      <div class="fc-cost">₹${f.cost}</div>
    </div>`;
  });

  html += `</div>`;

  if (isFree && foodList.length > 2) {
    html += `<div style="padding:16px;background:rgba(255,69,69,0.06);border:1px solid rgba(255,69,69,0.2);margin-top:12px;font-size:0.85rem;color:var(--muted);">
      🔒 <strong style="color:var(--text);">${foodList.length - 2} more food items hidden.</strong> Upgrade to see full meal plan with timing, meal categories, fruits & fibre foods.
      <button class="btn-upgrade" style="margin-top:10px;display:block;" onclick="openPayment()">Upgrade ₹39/mo →</button>
    </div>`;
  } else {
    html += `
    <div class="daily-total-row">
      <span>Total from above foods</span>
      <div style="text-align:right;">
        <strong>₹${totalCost}/day</strong>
        <div style="font-size:0.72rem;color:var(--muted);font-family:var(--font-m);">${totalCal} kcal · ${totalP}g P · ${totalFi}g Fibre</div>
      </div>
    </div>
    <div class="diet-note">
      💡 <strong>How to use:</strong> Spread these foods across 4–6 meals per day. Hit your <strong>protein target first</strong> — fill remaining calories with carbs and fats. 
      Drink 3–4 litres of water daily. Adjust portions up/down to meet your calorie target exactly.
      <br><br>🌿 <strong>Fibre goal: ${fibre}g/day</strong> — eat plenty of vegetables, fruits, and whole grains. Fibre aids digestion, keeps you full, and supports fat loss.
    </div>`;
  }

  const res = document.getElementById('dietResult');
  res.innerHTML = html;
  res.style.display = 'block';
}

// ── PAYMENT ──
function openPayment() {
  document.getElementById('upi-display').textContent = UPI_ID;
  document.getElementById('payOverlay').classList.add('open');
}
function closePayment() {
  document.getElementById('payOverlay').classList.remove('open');
}
function closeSuccess() {
  document.getElementById('successOverlay').classList.remove('open');
}
function selectPlan(p) {
  selectedPlan = p;
  document.getElementById('pt1').className = 'plan-tog-btn' + (p === 1 ? ' selected' : '');
  document.getElementById('pt2').className = 'plan-tog-btn' + (p === 2 ? ' selected' : '');
  if (p === 1) {
    document.getElementById('pay-amount').textContent = '₹39';
    document.getElementById('pay-plan-name').textContent = 'PRO — 1 MONTH';
  } else {
    document.getElementById('pay-amount').textContent = '₹99';
    document.getElementById('pay-plan-name').textContent = 'ELITE — 3 MONTHS';
  }
}
async function submitPayment() {
  const name = document.getElementById('pay-name').value.trim();
  const ref = document.getElementById('pay-ref').value.trim();
  if (!name) { alert('Please enter your name.'); return; }
  if (!ref || ref.length < 6) { alert('Please enter a valid UTR / Transaction reference number.'); return; }

  const payload = {
    name, ref,
    plan: selectedPlan === 1 ? 'pro' : 'elite',
    amount: selectedPlan === 1 ? 39 : 99,
    email: U.email || 'guest'
  };

  try {
    const token = localStorage.getItem('apexSessionToken');
    const res = await fetch('/api/payment/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errorData = await res.json();
      alert(errorData.error || 'Payment recorded failed. Try again.');
      return;
    }

    // Update local user's plan state
    U.plan = payload.plan;
    initDashboard(); // Re-render dash to unlock tabs

    // Close payment popup, show success
    closePayment();
    document.getElementById('pay-name').value = '';
    document.getElementById('pay-ref').value = '';
    document.getElementById('successOverlay').classList.add('open');
  } catch (err) {
    alert('Network issue while recording payment.');
  }
}

// Close overlays on background click
document.getElementById('payOverlay').addEventListener('click', function (e) {
  if (e.target === this) closePayment();
});
document.getElementById('successOverlay').addEventListener('click', function (e) {
  if (e.target === this) closeSuccess();
});

// Check for stored session on load
window.addEventListener('load', async () => {
  const token = localStorage.getItem('apexSessionToken');
  const email = localStorage.getItem('apexSessionEmail');
  if (token) {
    try {
      const res = await fetch(`/api/auth/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        U = data.user;
      } else {
        U = {};
        localStorage.removeItem('apexSessionEmail');
      }
    } catch (err) {
      U = {};
    }
  }
  initFloatingIcons();
  initHeroCanvas();
  initPWA();
});

// ── PAGE TRANSITIONS WITH ANIMATION + HISTORY ──
let _pageHistory = ['pg-landing'];

function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const pg = document.getElementById(id);
  if (!pg) return;
  pg.classList.add('active');
  pg.classList.remove('page-enter');
  void pg.offsetWidth;
  pg.classList.add('page-enter');
  window.scrollTo(0, 0);

  // Update history stack
  if (_pageHistory[_pageHistory.length - 1] !== id) {
    _pageHistory.push(id);
  }

  // Mobile header visibility
  updateMobileHeader(id);

  // Start canvas only on landing
  if (id === 'pg-landing') {
    setTimeout(initHeroCanvas, 100);
  }
}

function updateMobileHeader(pageId) {
  const header = document.getElementById('mobile-header');
  const title = document.getElementById('mh-title');
  if (!header) return;

  if (pageId === 'pg-login') {
    header.classList.add('visible');
    title.textContent = 'SIGN IN';
  } else if (pageId === 'pg-signup') {
    header.classList.add('visible');
    title.textContent = 'CREATE ACCOUNT';
  } else {
    header.classList.remove('visible');
  }
}

function mobileBack() {
  // Remove current page from history
  if (_pageHistory.length > 1) _pageHistory.pop();
  const prev = _pageHistory[_pageHistory.length - 1] || 'pg-landing';
  showPage(prev);
}

// ── FLOATING ICONS ──
function initFloatingIcons() {
  const icons = ['🏋️', '💪', '🔥', '⚡', '🏃', '🥗', '🎯', '💥', '🥊', '🧬', '🍗', '🥚', '🏆', '⚙️'];
  const container = document.getElementById('float-icons');
  if (!container) return;
  container.innerHTML = '';
  icons.forEach((icon) => {
    const el = document.createElement('span');
    el.className = 'fi-icon';
    el.textContent = icon;
    const leftPct = 5 + Math.random() * 90;
    const dur = 8 + Math.random() * 12;
    const delay = Math.random() * 10;
    el.style.cssText = `left:${leftPct}%;bottom:-60px;--dur:${dur}s;--delay:${delay}s;font-size:${1.2 + Math.random() * 1.2}rem;`;
    container.appendChild(el);
  });
}

// ── HERO CANVAS ──
function initHeroCanvas() {
  const canvas = document.getElementById('fitness-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  function resize() {
    const s = canvas.parentElement;
    canvas.width = s.offsetWidth; canvas.height = s.offsetHeight;
  }
  resize();
  window.addEventListener('resize', resize);
  const ACCENT = 'rgba(200,255,0,';
  class Particle {
    constructor() { this.reset(true); }
    reset(init) {
      this.x = Math.random() * canvas.width;
      this.y = init ? Math.random() * canvas.height : canvas.height + 20;
      this.vx = (Math.random() - 0.5) * 0.3; this.vy = -(0.2 + Math.random() * 0.5);
      this.size = 1.5 + Math.random() * 3; this.alpha = 0.03 + Math.random() * 0.08;
      this.type = Math.floor(Math.random() * 3); this.life = 0; this.maxLife = 300 + Math.random() * 200;
    }
    update() { this.x += this.vx; this.y += this.vy; this.life++; if (this.life > this.maxLife || this.y < -30) this.reset(false); }
    draw() {
      const p = this.life / this.maxLife, fade = p < 0.1 ? p * 10 : p > 0.8 ? (1 - p) * 5 : 1;
      ctx.globalAlpha = this.alpha * fade;
      if (this.type === 0) { ctx.fillStyle = ACCENT + this.alpha * fade + ')'; ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2); ctx.fill(); }
      else if (this.type === 1) { ctx.strokeStyle = ACCENT + this.alpha * fade + ')'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(this.x, this.y, this.size * 2, 0, Math.PI * 2); ctx.stroke(); }
      else { const s = this.size * 2; ctx.strokeStyle = ACCENT + this.alpha * fade + ')'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(this.x - s, this.y); ctx.lineTo(this.x + s, this.y); ctx.stroke(); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(this.x - s - 2, this.y - s * 0.6); ctx.lineTo(this.x - s - 2, this.y + s * 0.6); ctx.moveTo(this.x + s + 2, this.y - s * 0.6); ctx.lineTo(this.x + s + 2, this.y + s * 0.6); ctx.stroke(); }
      ctx.globalAlpha = 1;
    }
  }
  class HeartbeatLine {
    constructor() { this.reset(); }
    reset() { this.x = -50; this.y = canvas.height * (0.3 + Math.random() * 0.4); this.speed = 1.5 + Math.random() * 1; this.alpha = 0.06 + Math.random() * 0.06; this.pts = [0, 0, 0, 0, 0, 5, -5, 10, 0, -20, 0, 30, -5, 0, 0, 0, 0, 0]; }
    update() { this.x += this.speed; if (this.x > canvas.width + 100) this.reset(); }
    draw() { ctx.globalAlpha = this.alpha; ctx.strokeStyle = '#c8ff00'; ctx.lineWidth = 1; ctx.beginPath(); let px = this.x; ctx.moveTo(px, this.y); this.pts.forEach(p => { px += 8; ctx.lineTo(px, this.y + p); }); ctx.stroke(); ctx.globalAlpha = 1; }
  }
  const parts = []; for (let i = 0; i < 55; i++)parts.push(new Particle());
  const hb = [new HeartbeatLine(), new HeartbeatLine(), new HeartbeatLine()];
  let rafId;
  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(200,255,0,0.03)';
    for (let x = 40; x < canvas.width; x += 55)for (let y = 40; y < canvas.height; y += 55) { ctx.beginPath(); ctx.arc(x, y, 1, 0, Math.PI * 2); ctx.fill(); }
    parts.forEach(p => { p.update(); p.draw(); }); hb.forEach(h => { h.update(); h.draw(); });
    rafId = requestAnimationFrame(animate);
  }
  animate();
  const land = document.getElementById('pg-landing');
  if (land) new MutationObserver(() => { if (!land.classList.contains('active')) cancelAnimationFrame(rafId); else animate(); }).observe(land, { attributes: true, attributeFilter: ['class'] });
}

// ── COUNTER ANIMATION ──
function animateCount(el, target, suffix, duration) {
  if (!el) return;
  const start = Date.now(); el.classList.add('counting');
  function update() {
    const p = Math.min((Date.now() - start) / duration, 1), ease = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(target * ease) + (suffix || '');
    if (p < 1) requestAnimationFrame(update);
    else { el.textContent = target + (suffix || ''); el.classList.remove('counting'); }
  }
  requestAnimationFrame(update);
}

// ── STREAK DOTS ──
function applyStreakDelays() {
  document.querySelectorAll('.s-dot.done').forEach((el, i) => { el.style.animationDelay = (i * 0.04) + 's'; });
}
document.addEventListener('DOMContentLoaded', applyStreakDelays);

// ── PWA INSTALL ──
function initPWA() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => { });
  }
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isStandalone = window.navigator.standalone === true || window.matchMedia('(display-mode:standalone)').matches;
  if (isStandalone) return;
  if (isIOS) {
    setTimeout(() => { const h = document.getElementById('ios-hint'); if (h) h.style.display = 'block'; }, 4000);
    return;
  }
  let deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); deferredPrompt = e;
    const banner = document.getElementById('install-banner'); if (banner) banner.style.display = 'block';
  });
  const ib = document.getElementById('ib-install-btn');
  if (ib) ib.addEventListener('click', async () => {
    if (!deferredPrompt) return; deferredPrompt.prompt();
    await deferredPrompt.userChoice; deferredPrompt = null;
    const b = document.getElementById('install-banner'); if (b) { b.classList.add('hide'); setTimeout(() => b.style.display = 'none', 300); }
  });
  const db = document.getElementById('ib-dismiss-btn');
  if (db) db.addEventListener('click', () => {
    const b = document.getElementById('install-banner'); if (b) { b.classList.add('hide'); setTimeout(() => b.style.display = 'none', 300); }
  });
  window.addEventListener('appinstalled', () => { const b = document.getElementById('install-banner'); if (b) b.style.display = 'none'; });
}

// ── INIT ON LOAD ──
window.addEventListener('load', async () => {
  const token = localStorage.getItem('apexSessionToken');
  const email = localStorage.getItem('apexSessionEmail');
  if (token) {
    try {
      const res = await fetch(`/api/auth/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        U = data.user;
      } else {
        U = {};
        localStorage.removeItem('apexSessionEmail');
      }
    } catch (err) {
      U = {};
    }
  }
  initFloatingIcons();
  initHeroCanvas();
  initPWA();
  // Back button / popstate
  window.addEventListener('popstate', () => { mobileBack(); });
});


// ── LIQUID BARS & MEALS ──
async function fetchMealLogs() {
  try {
    const token = localStorage.getItem('apexSessionToken');
    const res = await fetch(`/api/meal/logs/${todayStr()}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const logs = await res.json();
    let totalCals = 0, totalProt = 0;
    logs.forEach(l => { totalCals += l.calories; totalProt += l.protein; });

    updateLiquidBars(totalCals, totalProt);
  } catch (e) { console.error("Meal fetch error", e); }
}

function updateLiquidBars(calsConsumed, protConsumed) {
  const calPct = Math.min((calsConsumed / cachedCalTarget) * 100, 100);
  const protPct = Math.min((protConsumed / cachedProtTarget) * 100, 100);

  const cb = document.getElementById('cal-fill');
  const pb = document.getElementById('prot-fill');
  if (cb && pb) {
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

  if (!cals && !prot) { alert('Enter some values'); return; }
  cals = cals || 0; prot = prot || 0;

  try {
    await fetch('/api/meal/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
    const token = localStorage.getItem('apexSessionToken');
    const res = await fetch('/api/workout/logs', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const logs = await res.json();

    const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    const todayIdx = new Date().getDay();
    const daysArr = document.querySelectorAll('.week-chips .day-chip');

    daysArr.forEach((el, idx) => {
      el.classList.remove('today', 'done');
      if (idx === todayIdx) el.classList.add('today');

      const logMatch = logs.find(l => {
        const ld = new Date(l.date);
        return ld.getDay() === idx && /* mock check for same week */ (Date.now() - ld.getTime() < 7 * 86400000);
      });
      if (logMatch || idx < todayIdx) {
        el.classList.add('done');
        el.onclick = () => showWorkoutDetail('Last ' + dayNames[idx], (logMatch ? logMatch.name : 'Completed Workout'));
      }
    });

  } catch (e) { console.error("Workout fetch error", e); }
}

function showWorkoutDetail(date, title) {
  const panel = document.getElementById('workout-detail-panel');
  if (!panel) return;
  panel.style.display = 'block';
  let wTitle = document.getElementById('wdp-title');
  if (wTitle) wTitle.textContent = title + " (" + date + ")";
  let wExs = document.getElementById('wdp-exs');
  if (wExs) wExs.innerHTML = '<div>Great job completing this workout!</div>';
  panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── HABIT TRACKER ──
async function fetchHabits() {
  try {
    const token = localStorage.getItem('apexSessionToken');
    const res = await fetch('/api/habit', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    userHabits = data.habits || [];

    const allLogsRes = await fetch('/api/habit/logs/all', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const allLogs = await allLogsRes.json();
    todayHabitLogs = allLogs.filter(l => l.date === todayStr());

    renderHabits();
    renderWeeklyVolume(allLogs);
  } catch (e) { console.error("Habit fetch", e); }
}

function renderHabits() {
  const d = new Date();
  let hdt = document.getElementById('habit-date-tag');
  if (hdt) hdt.textContent = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getDay()];
  const list = document.getElementById('habit-list');
  if (!list) return;
  list.innerHTML = '';

  if (userHabits.length === 0) {
    list.innerHTML = '<div style="font-size:0.8rem;color:var(--muted);text-align:center;">No habits created yet. Type one above!</div>';
  }

  let completed = 0;
  userHabits.forEach(h => {
    const isDone = todayHabitLogs.some(l => l.habitId === h.id);
    if (isDone) completed++;

    list.innerHTML += `
      <div class="habit-item">
        <label class="habit-toggle">
          <input type="checkbox" ${isDone ? 'checked' : ''} onchange="toggleHabit('${h.id}', this.checked)">
          <span class="habit-toggle-slider"></span>
        </label>
        <span class="habit-name ${isDone ? 'done-text' : ''}" style="color:var(--text);font-size:0.9rem;">${h.name}</span>
        <button class="ph-btn" style="background:transparent;color:var(--muted);border:none;margin-left:auto;padding:5px;" onclick="deleteHabit('${h.id}')">✕</button>
      </div>
    `;
  });

  let htc = document.getElementById('habit-total-count'); if (htc) htc.textContent = userHabits.length;
  let hdc = document.getElementById('habit-done-count'); if (hdc) hdc.textContent = completed;
  let pct = userHabits.length === 0 ? 0 : Math.round((completed / userHabits.length) * 100);
  let hpct = document.getElementById('habit-pct'); if (hpct) hpct.textContent = pct + '%';

  const ring = document.getElementById('habit-ring');
  if (ring) {
    const circ = 239;
    const offset = circ - (pct / 100) * circ;
    ring.style.strokeDashoffset = isNaN(offset) ? circ : offset;
  }
}

async function toggleHabit(habitId, completed) {
  if (!U || !U.email) { alert("Login required"); return; }
  try {
    await fetch('/api/habit/log', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: U.email, habitId, date: todayStr(), completed })
    });

    const habitObj = userHabits.find(h => h.id === habitId);
    if (completed && habitObj && (habitObj.name.toLowerCase().includes('breakfast') || habitObj.name.toLowerCase().includes('lunch') || habitObj.name.toLowerCase().includes('dinner') || habitObj.name.toLowerCase().includes('protein'))) {
      // Visual simulated increment for diet alignment
      updateLiquidBars((cachedCalTarget * 0.3), (cachedProtTarget * 0.3));
      showToast("Diet tracked via Habit", "success");
    }

    fetchHabits();
  } catch (e) { showToast('Network Error', 'warning'); }
}

async function addCustomHabit() {
  if (!U || !U.email) { alert("Login required"); return; }
  const inp = document.getElementById('habit-new-name');
  if (!inp.value.trim()) return;
  try {
    await fetch('/api/habit', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: U.email, name: inp.value.trim() })
    });
    inp.value = '';
    fetchHabits();
  } catch (e) { showToast('Error adding habit', 'warning'); }
}

async function deleteHabit(id) {
  if (!U || !U.email) return;
  if (!confirm("Delete this habit?")) return;
  try {
    await fetch('/api/habit/' + id, { method: 'DELETE' });
    fetchHabits();
  } catch (e) { showToast('Error deleting habit', 'warning'); }
}

function renderWeeklyVolume(logs) {
  // Very simplistic mock for streak
  let st = logs.filter(l => l.date === todayStr() || l.date === new Date(Date.now() - 86400000).toISOString().split('T')[0]).length > 0;
  let num = document.getElementById('streak-num'); if (num) num.textContent = st ? "1" : "0";

  let dots = document.getElementById('streak-dots');
  if (dots) {
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
    const token = localStorage.getItem('apexSessionToken');
    const res = await fetch('/api/gemini', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ token }`
      },
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
  d.innerHTML = text.replace(/\n/g, '<br>');
  d.id = 'msg-' + Date.now();
  c.appendChild(d);
  c.scrollTop = c.scrollHeight;
  return d.id;
}
