import { initAuthShell, requireAuth } from './auth.js';
import { supabase } from './supabase.js';
import { initTheme } from './theme.js';
import { setupNavigation } from './navigation.js';

const app = document.querySelector('#account-app');
const page = document.body.dataset.page || 'profile';
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));
const empty = text => `<div class="empty-state"><p>${text}</p></div>`;
const loadingSkeleton = () => `
  <div class="profile-page">
    <div class="skeleton-line short"></div>
    <div class="profile-summary card skeleton-card">
      <div class="profile-summary-main">
        <div class="profile-avatar skeleton-avatar"></div>
        <div class="skeleton-stack">
          <div class="skeleton-line"></div>
          <div class="skeleton-line medium"></div>
          <div class="skeleton-line small"></div>
        </div>
      </div>
    </div>
    <div class="profile-stat-grid">
      ${Array.from({ length: 6 }, () => '<div class="stat-card skeleton-card"><div class="skeleton-line"></div><div class="skeleton-line medium"></div></div>').join('')}
    </div>
    <div class="profile-list">
      ${Array.from({ length: 3 }, () => '<div class="card compact-card skeleton-card"><div class="skeleton-line"></div><div class="skeleton-line medium"></div></div>').join('')}
    </div>
  </div>
`;
const relativeTime = value => {
  if (!value) return 'Recently';
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.max(1, Math.round(diff / 60000));
  if (minutes < 60) return minutes === 1 ? '1 minute ago' : `${minutes} minutes ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return new Date(value).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
};
const initialsFrom = value => {
  const names = String(value || '').trim().split(/\s+/).filter(Boolean);
  if (!names.length) return 'SN';
  return names.slice(0, 2).map(part => part.charAt(0).toUpperCase()).join('').slice(0, 2);
};
const uniqueHistory = history => {
  const map = new Map();
  [...history].sort((a, b) => new Date(b.opened_at || b.created_at || 0) - new Date(a.opened_at || a.created_at || 0)).forEach(item => {
    const key = item.article_id || item.content_id;
    if (!key || map.has(key)) return;
    map.set(key, item);
  });
  return [...map.values()];
};

function renderShell() {
  if (document.querySelector('#site-header')) return;
  const baseLinks = [
    ['index.html', 'Home', 'home'],
    ['study-notes.html', 'Study Notes', 'posts'],
    ['quizzes.html', 'Quizzes', 'quizzes'],
    ['categories.html', 'Categories', 'categories'],
    ['resources.html', 'Resources', 'resources'],
    ['about.html', 'About', 'about']
  ];
  const header = document.createElement('div');
  header.id = 'site-header';
  header.innerHTML = `
    <header class="site-header">
      <div class="header-inner">
        <button class="menu-toggle" aria-label="Open navigation" aria-expanded="false">☰</button>
        <a class="brand" href="index.html"><span class="brand-mark">SN</span><span>StudyNotes</span></a>
        <nav class="nav-links" aria-label="Primary navigation">${baseLinks.map(([href, label, id]) => `<a href="${href}" ${page === id ? 'aria-current="page"' : ''}>${label}</a>`).join('')}</nav>
        <div class="header-actions">
          <a class="icon-button" href="search.html" aria-label="Search notes">⌕</a>
          <select class="theme-select" aria-label="Color theme">
            <option value="system">System</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
          <div class="auth-slot" data-auth-slot></div>
          <button type="button" class="header-ashu" aria-label="Open Ask Ashu">✦</button>
        </div>
      </div>
    </header>
  `;
  document.body.insertBefore(header, document.body.firstChild);

  const footer = document.createElement('div');
  footer.id = 'site-footer';
  footer.innerHTML = `
    <footer class="footer">
      <div class="footer-inner">
        <div><strong>StudyNotes</strong><div>Learn. Practice. Prepare.</div></div>
        <div class="footer-links">
          <a href="study-notes.html">Study Notes</a>
          <a href="quizzes.html">Quizzes</a>
          <a href="categories.html">Categories</a>
          <a href="resources.html">Resources</a>
          <a href="about.html">About</a>
        </div>
        <div>© 2026 StudyNotes</div>
      </div>
    </footer>
  `;
  document.body.appendChild(footer);

  document.body.insertAdjacentHTML('beforeend', `<nav class="mobile-bottom-nav" aria-label="Mobile navigation"><a class="${page === 'home' ? 'active' : ''}" href="index.html"><span aria-hidden="true">⌂</span><span>Home</span></a><a class="${['posts','post','topic','category'].includes(page) ? 'active' : ''}" href="study-notes.html"><span aria-hidden="true">▤</span><span>Study</span></a><a class="${['quizzes','quiz','result'].includes(page) ? 'active' : ''}" href="quizzes.html"><span aria-hidden="true">▣</span><span>Quiz</span></a><button id="mobile-more" type="button" aria-expanded="false"><span aria-hidden="true">☰</span><span>More</span></button></nav><div id="mobile-more-sheet" class="more-sheet" hidden><section class="more-panel" role="dialog" aria-modal="true" aria-labelledby="more-title"><button type="button" class="icon-button more-close" data-close-more aria-label="Close more menu">×</button><h2 id="more-title">More StudyNotes</h2><div class="more-links"><a href="categories.html">Categories</a><a href="resources.html">Resources</a><a href="search.html?q=Interview%20Questions">Interview Questions</a><a href="search.html?q=Competitive%20Exams">Competitive Exams</a><a href="search.html">Search</a><a href="about.html">About</a></div></section></div>`);

  const more = document.querySelector('#mobile-more');
  const sheet = document.querySelector('#mobile-more-sheet');
  if (more && sheet) {
    const close = () => { sheet.hidden = true; document.body.classList.remove('drawer-open'); more.setAttribute('aria-expanded', 'false'); };
    more.addEventListener('click', () => { sheet.hidden = false; document.body.classList.add('drawer-open'); more.setAttribute('aria-expanded', 'true'); sheet.querySelector('button')?.focus(); });
    sheet.querySelector('[data-close-more]')?.addEventListener('click', close);
    sheet.addEventListener('click', event => { if (event.target === sheet) close(); });
    document.addEventListener('keydown', event => { if (event.key === 'Escape' && !sheet.hidden) close(); });
  }

  initTheme();
  setupNavigation();
  initAuthShell();
}

async function load(user) {
  const [profile, progress, history, attempts, bookmarks] = await Promise.all([
    supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle(),
    supabase.from('article_progress').select('*').eq('user_id', user.id).order('last_read_at', { ascending: false }),
    supabase.from('article_read_history').select('*').eq('user_id', user.id).order('opened_at', { ascending: false }).limit(50),
    supabase.from('quiz_attempts').select('*').eq('user_id', user.id).order('completed_at', { ascending: false }),
    supabase.from('bookmarks').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
  ]);
  const data = { profile: profile.data || {}, progress: progress.data || [], history: history.data || [], attempts: attempts.data || [], bookmarks: bookmarks.data || [] };
  if (page === 'profile') renderProfile(user, data); else if (page === 'reading-history') renderReadingHistory(data); else if (page === 'my-learning') renderMyLearning(user, data); else if (page === 'quiz-history') renderQuizHistory(data); else if (page === 'bookmarks') renderBookmarks(data); else renderSettings(user, data);
}

function getProfileName(user, data) {
  return data.profile?.full_name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Your profile';
}

function renderProfile(user, data) {
  const displayName = getProfileName(user, data);
  const recentReads = uniqueHistory(data.history).slice(0, 5);
  const continueItems = [...data.progress].filter(item => !item.completed && Number(item.progress_percent || 0) > 0).slice(0, 3);
  const completed = data.progress.filter(item => item.completed || Number(item.progress_percent || 0) >= 100).length;
  const average = data.attempts.length ? Math.round(data.attempts.reduce((sum, item) => sum + Number(item.percentage || 0), 0) / data.attempts.length) : 0;
  const totalArticles = new Set(data.history.map(item => item.article_id).filter(Boolean)).size;
  const bookmarks = data.bookmarks.length;
  const recentQuizAttempts = [...data.attempts].slice(0, 3);
  const memberSince = data.profile?.created_at || user.created_at || new Date().toISOString();
  const currentDate = new Date(memberSince).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  app.innerHTML = `
    <div class="profile-page">
      <nav class="breadcrumb" aria-label="Breadcrumb">
        <a href="./index.html">Home</a>
        <span>›</span>
        <span>My Profile</span>
      </nav>

      <section class="profile-summary card">
        <div class="profile-summary-main">
          <div class="profile-avatar" aria-label="${esc(displayName)} initials">${esc(initialsFrom(displayName))}</div>
          <div>
            <div class="eyebrow">My Profile</div>
            <h1>${esc(displayName)}</h1>
            <p>${esc(user.email || 'No email available')}</p>
            <div class="profile-meta">Member since ${esc(currentDate)}</div>
          </div>
        </div>
        <div class="profile-summary-actions">
          <a class="button button-secondary" href="./settings.html">Edit profile</a>
        </div>
      </section>

      <section class="profile-section">
        <div class="section-heading">
          <div>
            <div class="eyebrow">Profile overview</div>
            <h2>Learning overview</h2>
          </div>
        </div>
        <div class="profile-stat-grid">
          <div class="stat-card">
            <span>Articles Read</span>
            <strong>${totalArticles}</strong>
          </div>
          <div class="stat-card">
            <span>Completed</span>
            <strong>${completed}</strong>
          </div>
          <div class="stat-card">
            <span>Quizzes</span>
            <strong>${data.attempts.length}</strong>
          </div>
          <div class="stat-card">
            <span>Avg. Score</span>
            <strong>${average}%</strong>
          </div>
          <div class="stat-card">
            <span>Bookmarks</span>
            <strong>${bookmarks}</strong>
          </div>
          <div class="stat-card">
            <span>Streak</span>
            <strong>${Math.max(0, new Set(data.history.map(item => item.opened_at ? new Date(item.opened_at).toISOString().slice(0,10) : null).filter(Boolean)).size)}</strong>
          </div>
        </div>
      </section>

      <section class="profile-section">
        <div class="section-heading">
          <div>
            <div class="eyebrow">Continue learning</div>
            <h2>Continue learning</h2>
          </div>
        </div>
        <div class="profile-list">
          ${continueItems.length ? continueItems.map(item => `
            <article class="card compact-card">
              <div class="list-header">
                <div>
                  <h3>${esc(item.article_id || 'Article')}</h3>
                  <div class="muted-row">${esc(item.technology || 'Learning')} • ${esc(item.topic || 'General')}</div>
                </div>
                <span class="progress-pill">${Number(item.progress_percent || 0)}%</span>
              </div>
              <div class="progress" aria-label="${Number(item.progress_percent || 0)}% complete"><span style="width:${Number(item.progress_percent || 0)}%"></span></div>
              <div class="meta-row compact-row"><span>Last read: ${esc(relativeTime(item.last_read_at))}</span><a class="text-link" href="./study-notes.html">Continue</a></div>
            </article>
          `).join('') : empty('No articles in progress yet. Start reading and your active learning will appear here.')}
        </div>
      </section>

      <div class="two-column-layout">
        <section class="profile-section">
          <div class="section-heading">
            <div>
              <div class="eyebrow">Recently read</div>
              <h2>Recently read</h2>
            </div>
            <a class="text-link" href="./reading-history.html">View All Reads →</a>
          </div>
          <div class="profile-list">
            ${recentReads.length ? recentReads.map((item, index) => `
              <article class="card history-card">
                <div class="history-index">${index + 1}.</div>
                <div>
                  <h3>${esc(item.article_id || 'Article')}</h3>
                  <div class="muted-row">${esc(item.technology || 'General')} • ${esc(item.topic || 'Study note')}</div>
                  <div class="history-time">${esc(relativeTime(item.opened_at))}</div>
                </div>
              </article>
            `).join('') : empty('No articles read yet.')}
          </div>
        </section>

        <section class="profile-section">
          <div class="section-heading">
            <div>
              <div class="eyebrow">Recent quiz activity</div>
              <h2>Recent quiz attempts</h2>
            </div>
            <a class="text-link" href="./quiz-history.html">View All Quizzes →</a>
          </div>
          <div class="profile-list">
            ${recentQuizAttempts.length ? recentQuizAttempts.map(item => `
              <article class="card history-card quiz-card">
                <div>
                  <h3>${esc(item.quiz_id || 'Quiz')}</h3>
                  <div class="muted-row">${Number(item.percentage || 0)}% • ${Number(item.correct_answers || 0)}/${Number(item.question_count || 0)}</div>
                  <div class="history-time">${esc(relativeTime(item.completed_at || item.started_at))}</div>
                </div>
              </article>
            `).join('') : empty('No quiz attempts yet.')}
          </div>
        </section>
      </div>

      <section class="profile-section">
        <div class="section-heading">
          <div>
            <div class="eyebrow">Saved for later</div>
            <h2>Bookmarks</h2>
          </div>
          <a class="text-link" href="./bookmarks.html">View All Bookmarks →</a>
        </div>
        <div class="bookmark-list">
          ${data.bookmarks.length ? data.bookmarks.slice(0, 4).map(item => `<a class="bookmark-item" href="${esc(item.url || './study-notes.html')}"><span>${esc(item.title || item.content_id || 'Saved item')}</span><small>${esc(item.content_type || 'Study')}</small></a>`).join('') : empty('No bookmarks yet. Save useful content to keep it here.')}
        </div>
      </section>

      <section class="profile-section">
        <div class="section-heading">
          <div>
            <div class="eyebrow">Quick actions</div>
            <h2>Continue exploring</h2>
          </div>
        </div>
        <div class="quick-actions">
          <a class="button button-secondary" href="./study-notes.html">Continue learning</a>
          <a class="button button-secondary" href="./quizzes.html">Practice quiz</a>
          <a class="button button-secondary" href="./reading-history.html">View reading history</a>
          <a class="button button-secondary" href="./quiz-history.html">View quiz history</a>
        </div>
      </section>
    </div>
  `;
}

function renderReadingHistory(data) {
  const items = uniqueHistory(data.history).map(item => ({ ...item, progress: Number(item.progress_percent || 0), status: item.completed ? 'Completed' : 'In progress' }));
  app.innerHTML = `
    <div class="profile-page">
      <nav class="breadcrumb" aria-label="Breadcrumb">
        <a href="./index.html">Home</a>
        <span>›</span>
        <a href="./profile.html">My Profile</a>
        <span>›</span>
        <span>Reading History</span>
      </nav>
      <div class="page-intro">
        <div class="eyebrow">Reading history</div>
        <h1>Reading history</h1>
        <p class="lede">Track what you opened, how far you got, and what to continue next.</p>
      </div>
      <div class="filters history-filters">
        <input id="history-search" type="search" placeholder="Search your reading history..." aria-label="Search reading history">
        <select id="history-technology" aria-label="Filter by technology">
          <option value="">Technology</option>
          <option value="SQL">SQL</option>
          <option value="Python">Python</option>
          <option value="PySpark">PySpark</option>
          <option value="Databricks">Databricks</option>
          <option value="Azure">Azure</option>
        </select>
        <select id="history-status" aria-label="Filter by status">
          <option value="">Status</option>
          <option value="Completed">Completed</option>
          <option value="In progress">In progress</option>
        </select>
      </div>
      <div id="history-list" class="history-table"></div>
    </div>
  `;

  const list = document.querySelector('#history-list');
  const historySearch = () => {
    const query = document.querySelector('#history-search')?.value?.toLowerCase() || '';
    const technology = document.querySelector('#history-technology')?.value || '';
    const status = document.querySelector('#history-status')?.value || '';
    const filtered = items.filter(item => {
      const matchesQuery = !query || `${item.article_id || ''} ${item.technology || ''} ${item.topic || ''}`.toLowerCase().includes(query);
      const matchesTech = !technology || (item.technology || '').toLowerCase() === technology.toLowerCase();
      const matchesStatus = !status || item.status === status;
      return matchesQuery && matchesTech && matchesStatus;
    });

    list.innerHTML = filtered.length ? filtered.map(item => `
      <article class="history-row card">
        <div class="history-main">
          <div>
            <h3>${esc(item.article_id || 'Article')}</h3>
            <div class="muted-row">${esc(item.technology || 'General')} → ${esc(item.topic || 'Study note')}</div>
          </div>
          <div class="history-pill ${item.status === 'Completed' ? 'is-complete' : ''}">${item.status}</div>
        </div>
        <div class="history-meta">
          <div><span>Progress</span><strong>${Number(item.progress || 0)}%</strong></div>
          <div><span>Last read</span><strong>${esc(relativeTime(item.opened_at))}</strong></div>
          <div><span>Completed</span><strong>${item.status === 'Completed' ? 'Yes' : 'No'}</strong></div>
        </div>
        <div class="history-actions">
          <div class="progress" aria-label="${Number(item.progress || 0)}% complete"><span style="width:${Number(item.progress || 0)}%"></span></div>
          <a class="button button-secondary" href="./study-notes.html">Continue</a>
        </div>
      </article>
    `).join('') : empty('No reading activity matches that filter yet.');
  };

  document.querySelector('#history-search')?.addEventListener('input', historySearch);
  document.querySelector('#history-technology')?.addEventListener('change', historySearch);
  document.querySelector('#history-status')?.addEventListener('change', historySearch);
  historySearch();
}

function renderMyLearning(user, data) {
  const progress = [...data.progress].filter(item => Number(item.progress_percent || 0) > 0).slice(0, 4);
  const completed = data.progress.filter(item => item.completed || Number(item.progress_percent || 0) >= 100).slice(0, 4);
  const recent = uniqueHistory(data.history).slice(0, 4);
  app.innerHTML = `
    <div class="profile-page">
      <nav class="breadcrumb" aria-label="Breadcrumb">
        <a href="./index.html">Home</a>
        <span>›</span>
        <a href="./profile.html">My Profile</a>
        <span>›</span>
        <span>My Learning</span>
      </nav>
      <div class="page-intro">
        <div class="eyebrow">My Learning</div>
        <h1>Learning dashboard</h1>
        <p class="lede">A quick view of active progress, completed items and your recent reading momentum.</p>
      </div>
      <div class="profile-stat-grid compact-grid">
        <div class="stat-card"><span>Active</span><strong>${progress.length}</strong></div>
        <div class="stat-card"><span>Completed</span><strong>${completed.length}</strong></div>
        <div class="stat-card"><span>Recent</span><strong>${recent.length}</strong></div>
        <div class="stat-card"><span>Bookmarks</span><strong>${data.bookmarks.length}</strong></div>
      </div>
      <div class="two-column-layout">
        <section class="profile-section">
          <div class="section-heading"><div><div class="eyebrow">Continue learning</div><h2>Continue learning</h2></div></div>
          <div class="profile-list">${progress.length ? progress.map(item => `<article class="card compact-card"><div class="list-header"><div><h3>${esc(item.article_id || 'Article')}</h3><div class="muted-row">${esc(item.technology || 'Learning')}</div></div><span class="progress-pill">${Number(item.progress_percent || 0)}%</span></div><div class="progress"><span style="width:${Number(item.progress_percent || 0)}%"></span></div></article>`).join('') : empty('Your active learning paths will appear here.')}</div>
        </section>
        <section class="profile-section">
          <div class="section-heading"><div><div class="eyebrow">Completed</div><h2>Completed articles</h2></div></div>
          <div class="profile-list">${completed.length ? completed.map(item => `<article class="card compact-card"><h3>${esc(item.article_id || 'Article')}</h3><div class="muted-row">Completed ${esc(relativeTime(item.completed_at || item.last_read_at))}</div></article>`).join('') : empty('No completed articles yet.')}</div>
        </section>
      </div>
      <section class="profile-section">
        <div class="section-heading"><div><div class="eyebrow">Recent reads</div><h2>Recent articles</h2></div></div>
        <div class="profile-list">${recent.length ? recent.map(item => `<article class="card history-card"><div class="history-index">•</div><div><h3>${esc(item.article_id || 'Article')}</h3><div class="muted-row">${esc(item.technology || 'Learning')} • ${esc(item.topic || 'Study note')}</div><div class="history-time">${esc(relativeTime(item.opened_at))}</div></div></article>`).join('') : empty('No recent articles yet.')}</div>
      </section>
    </div>
  `;
}

function renderQuizHistory(data) {
  app.innerHTML = `
    <div class="profile-page">
      <nav class="breadcrumb" aria-label="Breadcrumb">
        <a href="./index.html">Home</a>
        <span>›</span>
        <a href="./profile.html">My Profile</a>
        <span>›</span>
        <span>Quiz History</span>
      </nav>
      <div class="page-intro"><div class="eyebrow">Quiz history</div><h1>Quiz history</h1><p class="lede">Review your recent practice attempts and outcomes.</p></div>
      <section class="profile-list">${data.attempts.length ? data.attempts.map(item => `<article class="card list-row"><div><h3>${esc(item.quiz_id || 'Quiz')}</h3><span class="muted-row">${esc(relativeTime(item.completed_at || item.started_at))}</span></div><div class="account-result"><strong>${Number(item.percentage || 0)}%</strong><span>${Number(item.correct_answers || 0)} correct · ${Number(item.wrong_answers || 0)} wrong</span></div></article>`).join('') : empty('No quiz attempts yet. Start a public quiz whenever you are ready.')}</section>
    </div>
  `;
}

function renderBookmarks(data) {
  app.innerHTML = `
    <div class="profile-page">
      <nav class="breadcrumb" aria-label="Breadcrumb">
        <a href="./index.html">Home</a>
        <span>›</span>
        <a href="./profile.html">My Profile</a>
        <span>›</span>
        <span>Bookmarks</span>
      </nav>
      <div class="page-intro"><div class="eyebrow">Saved for later</div><h1>Bookmarks</h1><p class="lede">Keep useful notes and resources close at hand.</p></div>
      <section class="profile-list">${data.bookmarks.length ? data.bookmarks.map(item => `<article class="card list-row"><div><h3>${esc(item.title || item.content_id || 'Saved item')}</h3><span class="badge">${esc(item.content_type || 'article')}</span></div><a class="button button-secondary" href="${esc(item.url || './study-notes.html')}">Open</a></article>`).join('') : empty('No bookmarks yet. Save a study note to see it here.')}</section>
    </div>
  `;
}

function renderSettings(user, data) {
  app.innerHTML = `
    <div class="profile-page">
      <nav class="breadcrumb" aria-label="Breadcrumb">
        <a href="./index.html">Home</a>
        <span>›</span>
        <a href="./profile.html">My Profile</a>
        <span>›</span>
        <span>Settings</span>
      </nav>
      <div class="page-intro"><div class="eyebrow">Account settings</div><h1>Settings</h1><p class="lede">Keep your account details current.</p></div>
      <form id="settings-form" class="settings-form">
        <div class="settings-group card">
          <div class="section-heading compact-heading"><div><div class="eyebrow">Profile</div><h2>Profile details</h2></div></div>
          <label>Full name<input name="fullName" value="${esc(data.profile.full_name || '')}" autocomplete="name"></label>
          <label>Username<input name="username" value="${esc(data.profile.username || '')}" autocomplete="username"></label>
          <label>Email<input value="${esc(user.email || '')}" type="email" autocomplete="email" disabled></label>
          <button class="button button-primary" type="submit">Save profile</button>
          <div id="settings-message" class="auth-message" hidden></div>
        </div>
        <div class="settings-group card">
          <div class="section-heading compact-heading"><div><div class="eyebrow">Appearance</div><h2>Preferences</h2></div></div>
          <label>Theme<select aria-label="Theme preference"><option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option></select></label>
          <label>Learning preferences<select aria-label="Learning mode"><option>Focus mode</option><option>Deep study</option><option>Quick review</option></select></label>
          <button type="button" class="button button-secondary" onclick="window.location.href='./index.html'">Back to home</button>
        </div>
      </form>
    </div>
  `;

  document.querySelector('#settings-form').addEventListener('submit', async event => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const { error } = await supabase.from('profiles').upsert({ user_id: user.id, full_name: String(form.get('fullName') || '').trim(), username: String(form.get('username') || '').trim() || null, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
    const message = document.querySelector('#settings-message');
    message.hidden = false;
    message.className = `auth-message ${error ? 'error' : 'success'}`;
    message.textContent = error ? 'Unable to save these details right now.' : 'Profile updated.';
  });
}

renderShell();
if (app) app.innerHTML = loadingSkeleton();
requireAuth().then(user => {
  if (!user || !supabase) {
    if (app) app.innerHTML = '<div class="error-box">Please sign in to view your account.</div>';
    return;
  }
  load(user).catch(() => {
    app.innerHTML = '<div class="error-box">Unable to load your account data right now.</div>';
  });
}).catch(() => {
  if (app) app.innerHTML = '<div class="error-box">Unable to load your account data right now.</div>';
});
