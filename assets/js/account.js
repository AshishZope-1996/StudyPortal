import { requireAuth } from './auth.js';
import { supabase } from './supabase.js';

const app = document.querySelector('#account-app');
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));
const empty = text => `<div class="empty-state"><p>${text}</p></div>`;

async function load(user) {
  const [profile, progress, history, attempts, bookmarks] = await Promise.all([
    supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle(),
    supabase.from('article_progress').select('*').eq('user_id', user.id).order('last_read_at', { ascending: false }),
    supabase.from('article_read_history').select('*').eq('user_id', user.id).order('opened_at', { ascending: false }).limit(8),
    supabase.from('quiz_attempts').select('*').eq('user_id', user.id).order('completed_at', { ascending: false }),
    supabase.from('bookmarks').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
  ]);
  const data = { profile: profile.data || {}, progress: progress.data || [], history: history.data || [], attempts: attempts.data || [], bookmarks: bookmarks.data || [] };
  if (page === 'profile') renderProfile(user, data); else if (page === 'quiz-history') renderQuizHistory(data); else if (page === 'bookmarks') renderBookmarks(data); else renderSettings(user, data);
}

function renderProfile(user, data) {
  const completed = data.progress.filter(item => item.completed).length;
  const average = data.attempts.length ? Math.round(data.attempts.reduce((sum, item) => sum + Number(item.percentage), 0) / data.attempts.length) : 0;
  app.innerHTML = `<div class="page-intro"><div class="eyebrow">Your learning desk</div><h1>${esc(data.profile.full_name || user.email?.split('@')[0] || 'Your profile')}</h1><p class="lede">${esc(user.email)}</p></div><div class="stat-grid account-stats"><div class="stat-box"><span>Articles read</span><strong>${new Set(data.history.map(item => item.article_id)).size}</strong></div><div class="stat-box"><span>Completed</span><strong>${completed}</strong></div><div class="stat-box"><span>Quiz attempts</span><strong>${data.attempts.length}</strong></div><div class="stat-box"><span>Average score</span><strong>${average}%</strong></div></div><section class="section"><div class="section-heading"><h2>Continue learning</h2></div>${data.progress.filter(item => !item.completed).slice(0, 5).map(item => `<article class="card progress-row"><div><h3>${esc(item.article_id)}</h3><div class="progress"><span style="width:${item.progress_percent}%"></span></div></div><strong>${item.progress_percent}%</strong></article>`).join('') || empty('Start reading to see your progress here.')}</section><section class="section"><div class="section-heading"><h2>Recent quiz attempts</h2><a class="text-link" href="./quiz-history.html">View history</a></div>${data.attempts.slice(0, 5).map(item => `<article class="card list-row"><span>${esc(item.quiz_id)}</span><strong>${item.percentage}%</strong></article>`).join('') || empty('Complete a quiz to see your results here.')}</section>`;
}

function renderQuizHistory(data) {
  app.innerHTML = `<div class="page-intro"><div class="eyebrow">Your practice record</div><h1>Quiz history</h1><p class="lede">Review the attempts saved to your account.</p></div><section class="account-list">${data.attempts.map(item => `<article class="card list-row"><div><h3>${esc(item.quiz_id)}</h3><span class="meta-row">${new Date(item.completed_at || item.started_at).toLocaleDateString()}</span></div><div class="account-result"><strong>${item.percentage}%</strong><span>${item.correct_answers} correct · ${item.wrong_answers} wrong</span></div></article>`).join('') || empty('No quiz attempts yet. Start a public quiz whenever you are ready.')}</section>`;
}

function renderBookmarks(data) {
  app.innerHTML = `<div class="page-intro"><div class="eyebrow">Saved for later</div><h1>Bookmarks</h1><p class="lede">Keep useful notes and resources close at hand.</p></div><section class="account-list">${data.bookmarks.map(item => `<article class="card list-row"><div><h3>${esc(item.title || item.content_id)}</h3><span class="badge">${esc(item.content_type)}</span></div><a class="button button-secondary" href="${esc(item.url || '#')}">Open</a></article>`).join('') || empty('No bookmarks yet. Save a study note to see it here.')}</section>`;
}

function renderSettings(user, data) {
  app.innerHTML = `<div class="page-intro"><div class="eyebrow">Account settings</div><h1>Settings</h1><p class="lede">Keep your account details current.</p></div><form id="settings-form" class="auth-form"><div class="card"><label>Full name<input name="fullName" value="${esc(data.profile.full_name || '')}" autocomplete="name"></label><label>Username<input name="username" value="${esc(data.profile.username || '')}" autocomplete="username"></label><button class="button button-primary" type="submit">Save profile</button><div id="settings-message" class="auth-message" hidden></div></div></form>`;
  document.querySelector('#settings-form').addEventListener('submit', async event => { event.preventDefault(); const form = new FormData(event.currentTarget); const { error } = await supabase.from('profiles').upsert({ user_id: user.id, full_name: form.get('fullName').trim(), username: form.get('username').trim() || null, updated_at: new Date().toISOString() }, { onConflict: 'user_id' }); const message = document.querySelector('#settings-message'); message.hidden = false; message.className = `auth-message ${error ? 'error' : 'success'}`; message.textContent = error ? 'Unable to save these details.' : 'Profile updated.'; });
}

const page = document.body.dataset.page;
requireAuth().then(user => { if (user && supabase) load(user).catch(() => { app.innerHTML = '<div class="error-box">Unable to load your account data right now.</div>'; }); });
