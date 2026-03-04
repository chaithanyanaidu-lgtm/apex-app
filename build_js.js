const fs = require('fs');
const path = require('path');

const targetHtml = path.join(__dirname, 'apex-pro.html');
const appJsPath = path.join(__dirname, 'app.js');

let html = fs.readFileSync(targetHtml, 'utf8');

const scriptStart = html.indexOf('<script>');
const scriptEnd = html.lastIndexOf('</script>');

let inlineJs = html.substring(scriptStart + 8, scriptEnd);

inlineJs = inlineJs.replace(
    'let U = {};',
    "let U = {};\n" +
    "let selectedPlan = 1;\n" +
    "let userHabits = [];\n" +
    "let todayHabitLogs = [];\n" +
    "let cachedCalTarget = 0;\n" +
    "let cachedProtTarget = 0;\n" +
    "const UPI_ID = 'yourname@upi';\n\n" +
    "const ABBREV = { 'OHP':'Overhead Press','RDL':'Romanian Deadlift','DB':'Dumbbell','BB':'Barbell', 'EZ':'EZ-Curl Bar','Tri':'Triceps','Lat':'Lateral','HIIT':'High-Intensity Interval Training', 'LISS':'Low-Intensity Steady State','Pec Deck':'Pec Deck Fly Machine','Hack Squat':'Hack Squat Machine' };\n" +
    "const MUSCLE_TARGETS = { 'Push':'Chest / Shoulders / Triceps','Pull':'Back / Biceps / Rear Delts', 'Legs':'Quadriceps / Hamstrings / Glutes / Calves','Upper':'Chest / Back / Shoulders / Arms', 'Lower':'Quads / Hamstrings / Glutes / Calves','Full Body':'All Major Muscle Groups', 'Chest':'Pectorals / Front Delts','Back':'Lats / Traps / Rhomboids', 'Shoulders':'All 3 Delt Heads / Traps','Arms':'Biceps / Triceps / Forearms', 'Circuit':'Full Body / Cardiovascular','Cardio + Core':'Core / Cardiovascular', 'HIIT + Core':'Core / Cardiovascular','Core + Cardio':'Core / Cardiovascular' };\n" +
    "function getMuscleTarget(name) { for (const [k,v] of Object.entries(MUSCLE_TARGETS)) { if (name.toLowerCase().includes(k.toLowerCase())) return v; } return 'Multiple Muscle Groups'; }\n" +
    "function expandAbbrev(text) { let full = text; for (const [k,v] of Object.entries(ABBREV)) { const re = new RegExp('\\\\b' + k + '\\\\b', 'gi'); if (re.test(text) && !text.toLowerCase().includes(v.toLowerCase())) { return text + ' (' + v + ')'; } } return full; }\n" +
    "function todayStr() { return new Date().toISOString().split('T')[0]; }\n" +
    "function showToast(msg, type) { const c = document.getElementById('toast-container'); if(!c) return; const t = document.createElement('div'); t.className = 'toast' + (type === 'warning' ? ' warning' : ''); t.textContent = msg; c.appendChild(t); setTimeout(() => t.remove(), 4200); }\n"
);

inlineJs = inlineJs.replace(
    "function doLogout() {",
    "function postAuthFlow() { if (U.profileComplete === false) { document.getElementById('profile-setup-overlay').style.display = 'flex'; } else { initDashboard(); showPage('pg-dashboard'); showTab('overview'); } }\n" +
    "async function completeProfileSetup() { const age = parseFloat(document.getElementById('ps-age').value); const weight = parseFloat(document.getElementById('ps-weight').value); const height = parseFloat(document.getElementById('ps-height').value); const goal = document.getElementById('ps-goal').value; const exp = document.getElementById('ps-exp').value; const budget = document.getElementById('ps-budget').value || 'medium'; if (!age || !weight || !height) { alert('Please fill all required fields.'); return; } try { const res = await fetch('/api/user/' + encodeURIComponent(U.email), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ age, weight, height, goal, exp, budget, profileComplete: true }) }); if(!res.ok) throw new Error('Update failed'); U.age = age; U.weight = weight; U.height = height; U.goal = goal; U.exp = exp; U.budget = budget; U.profileComplete = true; document.getElementById('profile-setup-overlay').style.display = 'none'; showToast('Profile Setup Complete! AI generated your plans.', 'success'); initDashboard(); showPage('pg-dashboard'); showTab('overview'); } catch (error) { alert('Could not save profile details.'); } }\n" +
    "function doLogout() {"
);
inlineJs = inlineJs.replace(/initDashboard\(\);\s*showPage\('pg-dashboard'\);\s*showTab\('overview'\);/g, "postAuthFlow();");

inlineJs = inlineJs.replace(
    "const displayPlan = isFree ? plan.slice(0, 3) : plan;",
    "const displayPlan = isFree ? plan.slice(0, 3) : plan; const interSetRest = '60-90s'; const interExRest = '2-3 min';"
);
inlineJs = inlineJs.replace(
    /<div class="sdc-hd">[\s\S]*?<div class="sdc-name">\$\{d\.day\} — \$\{d\.name\}<\/div>[\s\S]*?<div class="sdc-tag">\$\{d\.tag\}<\/div>[\s\S]*?<\/div>/g,
    '<div class="sdc-hd"><div class="sdc-name">${d.day} — ${d.name} <br><span style="font-size:0.65rem;color:var(--muted);font-weight:400;text-transform:uppercase;">TARGET: ${getMuscleTarget(d.name)}</span></div><div class="sdc-tag">${d.tag}</div></div>'
);
inlineJs = inlineJs.replace(
    /<div class="ex-pill"/g,
    '<div class="ex-pill" data-desc="Rest ${interSetRest} between sets"'
);
inlineJs = inlineJs.replace(
    /\$\{e\}/g,
    '${expandAbbrev(e)}'
);

inlineJs = inlineJs.replace(
    "document.querySelectorAll('.week-chips .day-chip').forEach((el, i) => {",
    "cachedCalTarget = cal; cachedProtTarget = prot; fetchMealLogs(); fetchWorkoutLogsAndPlan(); fetchHabits(); document.querySelectorAll('.week-chips .day-chip').forEach((el, i) => {"
);

let addons = fs.readFileSync(path.join(__dirname, 'addons.js'), 'utf8');
inlineJs += "\n\n" + addons;

fs.writeFileSync(appJsPath, inlineJs);
console.log("Extracted and modified JS to app.js");

// Use single quotes for HTML tags to avoid JSON escaping issues
const finalHtml = html.substring(0, scriptStart) + '<script src="app.js"></script>' + html.substring(scriptEnd + 9);
fs.writeFileSync(targetHtml, finalHtml);
console.log("Replaced script tag in apex-pro.html");
