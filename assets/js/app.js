import { getCategories, getPosts, getQuizzes, getResources, getSite, getTopics } from './data.js';
import { getQuizHistory, getScores, saveQuizHistory, saveScore } from './storage.js';
import { initTheme } from './theme.js';
import { setupNavigation } from './navigation.js';
import { initAuthShell } from './auth.js';
import { saveArticleProgress, saveBookmark, saveQuizAttempt, trackArticleOpen } from './learning.js';

const app = document.querySelector('#app');
const page = document.body.dataset.page;
const params = new URLSearchParams(location.search);
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));
const fmt = value => new Intl.NumberFormat('en-US', { notation: value > 999 ? 'compact' : 'standard', maximumFractionDigits: 1 }).format(value);
const date = value => new Date(`${value}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const button = (label, href, className = 'button-primary') => `<a class="button ${className}" href="${href}">${label}</a>`;

function setupTopicNavigation() {
  fetch('./data/topic-menu.json').then(response => response.ok ? response.json() : {}).then(menu => {
    const target = document.querySelector('#topic-menu-items');
    if (!target) return;
    target.innerHTML = Object.entries(menu).map(([label, items]) => `<details class="topic-menu-group"><summary>${esc(label)}</summary><div>${items.map(item => `<a href="${esc(item.url)}">${esc(item.title)}</a>`).join('')}</div></details>`).join('');
  }).catch(() => {});
}

function setupMobileNavigation() {
  const more = document.querySelector('#mobile-more');
  const sheet = document.querySelector('#mobile-more-sheet');
  if (!more || !sheet) return;
  const close = () => { sheet.hidden = true; document.body.classList.remove('drawer-open'); more.setAttribute('aria-expanded', 'false'); };
  more.addEventListener('click', () => { sheet.hidden = false; document.body.classList.add('drawer-open'); more.setAttribute('aria-expanded', 'true'); sheet.querySelector('button')?.focus(); });
  sheet.querySelector('[data-close-more]')?.addEventListener('click', close);
  sheet.addEventListener('click', event => { if (event.target === sheet) close(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && !sheet.hidden) close(); });
}

function renderShell(site) {
  const links = [['index.html','Home','home'],['study-notes.html','Study Notes','posts'],['quizzes.html','Quizzes','quizzes'],['roadmap.html','Roadmap','roadmap'],['categories.html','Categories','categories'],['resources.html','Resources','resources'],['about.html','About','about']];
  document.querySelector('#site-header').innerHTML = `<header class="site-header"><div class="header-inner"><button class="menu-toggle" aria-label="Open navigation" aria-expanded="false">☰</button><a class="brand" href="index.html"><span class="brand-mark">SN</span><span>${esc(site.name)}</span></a><nav class="nav-links" aria-label="Primary navigation">${links.map(([href,label,id]) => `<a href="${href}" ${page === id ? 'aria-current="page"' : ''}>${label}</a>`).join('')}</nav><div class="header-actions"><a class="icon-button" href="search.html" aria-label="Search">⌕</a><select class="theme-select" aria-label="Color theme"><option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option></select><div class="auth-slot" data-auth-slot></div></div></div></header>`;
  document.querySelector('#site-footer').innerHTML = `<footer class="footer"><div class="footer-inner"><div><strong>StudyNotes</strong><div>Learn. Practice. Prepare.</div></div><div class="footer-links"><a href="study-notes.html">Study Notes</a><a href="quizzes.html">Quizzes</a><a href="categories.html">Categories</a><a href="resources.html">Resources</a><a href="about.html">About</a><a href="https://github.com/" rel="noreferrer">GitHub</a><a href="https://www.linkedin.com/" rel="noreferrer">LinkedIn</a></div><div>© 2026 StudyNotes</div></div></footer>`;
  document.querySelector('.header-actions').insertAdjacentHTML('beforeend', '<button type="button" class="header-ashu" aria-label="Open Ask Ashu">✦</button>');
  if (page !== 'home') document.querySelector('#site-header').insertAdjacentHTML('beforeend', '<div class="category-bar" aria-label="Topic navigation"><div id="topic-menu-items" class="category-bar-inner"><span class="topic-loading">Loading topics...</span></div></div>');
  document.body.insertAdjacentHTML('beforeend', `<nav class="mobile-bottom-nav" aria-label="Mobile navigation"><a class="${page === 'home' ? 'active' : ''}" href="index.html"><span aria-hidden="true">⌂</span><span>Home</span></a><a class="${['posts','post','topic','category'].includes(page) ? 'active' : ''}" href="study-notes.html"><span aria-hidden="true">▤</span><span>Study</span></a><a class="${['quizzes','quiz','result'].includes(page) ? 'active' : ''}" href="quizzes.html"><span aria-hidden="true">▣</span><span>Quiz</span></a><button id="mobile-more" type="button" aria-expanded="false"><span aria-hidden="true">☰</span><span>More</span></button></nav><div id="mobile-more-sheet" class="more-sheet" hidden><section class="more-panel" role="dialog" aria-modal="true" aria-labelledby="more-title"><button type="button" class="icon-button more-close" data-close-more aria-label="Close more menu">×</button><h2 id="more-title">More StudyNotes</h2><div class="more-links"><a href="categories.html">Categories</a><a href="roadmap.html">Roadmap</a><a href="resources.html">Resources</a><a href="search.html?q=Interview%20Questions">Interview Questions</a><a href="search.html?q=Competitive%20Exams">Competitive Exams</a><a href="search.html">Search</a><a href="about.html">About</a></div></section></div>`);
  setupTopicNavigation(); setupMobileNavigation();
  initTheme(); setupNavigation(); initAuthShell();
}

function noteCard(post) { return `<article class="card"><div class="card-top"><span class="badge">${esc(post.category)}</span><span class="badge ${post.difficulty === 'Advanced' ? 'coral' : ''}">${esc(post.difficulty)}</span></div><h3>${esc(post.title)}</h3><p>${esc(post.description)}</p><div class="meta-row"><span>${post.readingTime} read</span><span>${fmt(post.views)} views</span></div><div style="margin-top:18px">${button('Read note →', `post.html?id=${encodeURIComponent(post.id)}`)}</div></article>`; }
function quizCard(quiz) { const score = getScores()[quiz.id]; return `<article class="card"><div class="card-top"><span class="badge">${esc(quiz.category)}</span><span class="badge ${quiz.difficulty === 'Advanced' ? 'coral' : ''}">${esc(quiz.difficulty)}</span></div><h3>${esc(quiz.title)}</h3><p>${quiz.questions} questions · ${quiz.timeLimit ? `${Math.round(quiz.timeLimit / 60)} min` : 'No time limit'}</p><div class="meta-row"><span>${fmt(quiz.attempts)} attempts</span><span>${score ? `Best ${score.bestScore}/${score.bestTotal}` : 'New quiz'}</span></div><div style="margin-top:18px">${button('Start quiz →', `quiz.html?id=${encodeURIComponent(quiz.id)}`)}</div></article>`; }
function categoryCard(category) { return `<article class="card category-card"><div class="card-top"><span class="badge ${category.accent === 'coral' ? 'coral' : category.accent === 'gold' ? 'gold' : ''}">${category.topics} topics</span><span class="meta-row">${category.quizzes} quizzes</span></div><h3>${esc(category.name)}</h3><p>${esc(category.description)}</p><a class="text-link" href="category.html?id=${category.id}">Explore category →</a></article>`; }
function resourceCard(item) { return `<article class="card"><div class="card-top"><span class="badge">${esc(item.type)}</span><span class="badge gold">${esc(item.access)}</span></div><h3>${esc(item.title)}</h3><p>${esc(item.description)}</p><div class="meta-row"><span>${item.pages} pages</span><span>${item.fileSize}</span></div><div style="margin-top:18px">${button('View resource →', `resource.html?id=${item.id}`, 'button-secondary')}</div></article>`; }

async function renderLegacyHome() {
  const [site, categories, posts, quizzes, resources] = await Promise.all([getSite(), getCategories(), getPosts(), getQuizzes(), getResources()]);
  app.innerHTML = `<section class="hero"><div class="hero-copy"><div class="eyebrow">A practical study desk for technical minds</div><h1>${esc(site.tagline)}</h1><p class="lede">${esc(site.description)}</p><div class="hero-actions">${button('Explore study notes', 'study-notes.html')}${button('Start a quiz', 'quizzes.html', 'button-secondary')}</div></div><div class="hero-art"><div class="notebook"><div class="notebook-top"><span>Field notes / 01</span><span>2026</span></div><h3>Make the hard parts familiar.</h3><div class="study-lines"><span></span><span></span><span></span><span></span></div></div></div></section><div class="search-bar" role="search"><input id="home-search" placeholder="Search notes, quizzes, topics..." aria-label="Search StudyNotes"><button id="home-search-button">Search</button></div><section class="section"><div class="section-heading"><div><div class="eyebrow">Start somewhere useful</div><h2>Explore categories</h2></div><a class="text-link" href="categories.html">View all categories →</a></div><div class="grid grid-3">${categories.map(categoryCard).join('')}</div></section><section class="section"><div class="section-heading"><div><div class="eyebrow">Fresh from the desk</div><h2>Latest study notes</h2></div><a class="text-link" href="study-notes.html">All study notes →</a></div><div class="grid grid-3">${posts.slice(0, 3).map(noteCard).join('')}</div></section><section class="section"><div class="section-heading"><div><div class="eyebrow">Practice with intent</div><h2>Popular quizzes</h2></div><a class="text-link" href="quizzes.html">All quizzes →</a></div><div class="grid grid-3">${[...quizzes].sort((a,b) => b.attempts - a.attempts).slice(0, 3).map(quizCard).join('')}</div></section><section class="section"><div class="section-heading"><div><div class="eyebrow">A simple rhythm</div><h2>How StudyNotes works</h2></div></div><div class="steps"><div class="step"><div class="step-number">01</div><h3>Choose a topic</h3><p>Start with the problem you want to solve.</p></div><div class="step"><div class="step-number">02</div><h3>Read & learn</h3><p>Use short, focused notes with working examples.</p></div><div class="step"><div class="step-number">03</div><h3>Take the quiz</h3><p>Turn recognition into recall with practice.</p></div><div class="step"><div class="step-number">04</div><h3>Check & improve</h3><p>Review every answer and try again.</p></div></div></section><section class="section"><div class="section-heading"><div><div class="eyebrow">Keep a useful copy</div><h2>Featured resources</h2></div><a class="text-link" href="resources.html">Browse resources →</a></div><div class="grid grid-3">${resources.map(resourceCard).join('')}</div></section><section class="section profile-band"><div><div class="eyebrow">Made by a working engineer</div><h3>StudyNotes is a quiet place to get better at the technical details.</h3><p>Created by Ashish Zope for students and professionals building their data engineering practice.</p></div>${button('About the project →', 'about.html', 'button-secondary')}</section>`;
  document.querySelector('#home-search-button').addEventListener('click', () => location.href = `search.html?q=${encodeURIComponent(document.querySelector('#home-search').value)}`);
  document.querySelector('#home-search').addEventListener('keydown', event => { if (event.key === 'Enter') document.querySelector('#home-search-button').click(); });
}

async function renderHome() {
  const [site, categories, posts, quizzes] = await Promise.all([getSite(), getCategories(), getPosts(), getQuizzes()]);
  const popularIds = ['sql', 'python', 'postgresql', 'pyspark', 'databricks', 'azure', 'data-engineering', 'system-design'];
  const popular = popularIds.map(id => categories.find(category => category.id === id)).filter(Boolean);
  const latest = [...posts].sort((a, b) => b.publishedDate.localeCompare(a.publishedDate)).slice(0, 4);
  const popularQuizzes = [...quizzes].sort((a, b) => b.attempts - a.attempts).slice(0, 3);
  const scores = getScores();
  const activeQuiz = popularQuizzes.find(quiz => scores[quiz.id]?.attempts) || quizzes.find(quiz => scores[quiz.id]?.attempts);
  const activeScore = activeQuiz ? scores[activeQuiz.id] : null;
  const progress = activeQuiz && activeScore ? Math.round((activeScore.bestScore / activeScore.bestTotal) * 100) : 0;
  const continueLearning = activeQuiz ? `<section class="section continue-learning"><div class="section-heading"><div><div class="eyebrow">Pick up where you left off</div><h2>Continue learning</h2></div></div><div class="continue-card"><div><h3>${esc(activeQuiz.title)}</h3><p>${progress}% best score · ${activeScore.attempts} local attempt${activeScore.attempts === 1 ? '' : 's'}</p><div class="progress" aria-label="${progress}% completed"><span style="width:${progress}%"></span></div></div>${button('Continue →', `quiz.html?id=${encodeURIComponent(activeQuiz.id)}`)}</div></section>` : '';

  app.innerHTML = `<section class="home-hero"><div class="eyebrow">StudyNotes</div><h1>Learn. Practice. Prepare.</h1><p class="lede">Study Data Engineering, practice technical questions, and prepare for interviews.</p><div class="search-bar home-search" role="search"><input id="home-search" placeholder="What do you want to learn?" aria-label="What do you want to learn? Example: SQL, Python, PySpark, PostgreSQL"><button id="home-search-button">Search</button></div><div class="hero-actions">${button('Explore Study Notes', 'study-notes.html')}${button('Practice Quizzes', 'quizzes.html', 'button-secondary')}</div></section><section class="section popular-technologies"><div class="section-heading"><div><div class="eyebrow">Start with a subject</div><h2>Popular technologies</h2></div><a class="text-link" href="categories.html">View all technologies →</a></div><div class="technology-grid">${popular.map(category => `<a class="technology-chip" href="category.html?id=${encodeURIComponent(category.id)}"><strong>${esc(category.name)}</strong><span>${category.topics} topics</span></a>`).join('')}</div></section>${continueLearning}<section class="section"><div class="section-heading"><div><div class="eyebrow">Fresh from the desk</div><h2>Latest study notes</h2></div><a class="text-link" href="study-notes.html">View all study notes →</a></div><div class="grid grid-2 home-notes">${latest.map(noteCard).join('')}</div></section><section class="section"><div class="section-heading"><div><div class="eyebrow">Practice with intent</div><h2>Popular quizzes</h2></div><a class="text-link" href="quizzes.html">View all quizzes →</a></div><div class="grid grid-3">${popularQuizzes.map(quizCard).join('')}</div></section><section class="section ask-ashu-home"><div><div class="eyebrow">Your learning assistant</div><h2>Ask Ashu</h2><p>Ask me about SQL, Python, PySpark, Databricks, Azure or start a quiz.</p></div><button class="button button-secondary" type="button" data-open-ashu>Ask Ashu →</button></section><section class="section home-cta"><h2>Ready to start learning?</h2><p>Explore study material, practice quizzes and prepare for technical interviews.</p>${button('Explore Study Notes', 'study-notes.html')}</section><section class="section home-about"><div><div class="eyebrow">About StudyNotes</div><h2>Technical learning, made practical.</h2><p>StudyNotes is a technical learning platform for study material, interview preparation and practice.</p><p class="meta-row">Created by Ashish Zope.</p></div><a class="text-link" href="about.html">About →</a></section>`;
  document.querySelector('#home-search-button').addEventListener('click', () => location.href = `search.html?q=${encodeURIComponent(document.querySelector('#home-search').value)}`);
  document.querySelector('#home-search').addEventListener('keydown', event => { if (event.key === 'Enter') document.querySelector('#home-search-button').click(); });
  document.querySelector('[data-open-ashu]')?.addEventListener('click', () => document.querySelector('.header-ashu')?.click());
}

async function renderPosts() {
  const posts = await getPosts();
  app.innerHTML = `<div class="page-intro"><div class="eyebrow">Notes you can return to</div><h1>Study notes</h1><p class="lede">Clear explanations for SQL, Python, cloud data platforms and the systems around them.</p></div><div class="filters"><input id="post-filter" placeholder="Search study notes..." aria-label="Search study notes"><select id="difficulty-filter" aria-label="Filter by difficulty"><option value="">All difficulty levels</option><option>Beginner</option><option>Intermediate</option><option>Advanced</option></select><select id="sort-posts" aria-label="Sort notes"><option value="latest">Latest</option><option value="views">Most viewed</option></select></div><div id="post-grid" class="grid grid-3"></div>`;
  const draw = () => { const query = document.querySelector('#post-filter').value.toLowerCase(); const difficulty = document.querySelector('#difficulty-filter').value; const sort = document.querySelector('#sort-posts').value; const items = posts.filter(post => (!difficulty || post.difficulty === difficulty) && `${post.title} ${post.category} ${post.tags.join(' ')}`.toLowerCase().includes(query)).sort((a,b) => sort === 'views' ? b.views - a.views : b.publishedDate.localeCompare(a.publishedDate)); document.querySelector('#post-grid').innerHTML = items.length ? items.map(noteCard).join('') : '<div class="empty-state">No notes match that search.</div>'; };
  ['post-filter','difficulty-filter','sort-posts'].forEach(id => document.querySelector(`#${id}`).addEventListener('input', draw)); draw();
}

async function renderPost() {
  const posts = await getPosts(); const post = posts.find(item => item.id === params.get('id'));
  if (!post) return renderNotFound('That study note does not exist.');
  let content = '<div class="error-box">Unable to load study content. Please refresh the page.</div>';
  try { const response = await fetch(post.contentFile); if (response.ok) content = await response.text(); } catch (error) { console.error(error); }
  const related = posts.filter(item => item.id !== post.id && item.category === post.category).slice(0, 2);
  app.innerHTML = `<div class="article-layout"><aside class="toc"><strong>On this page</strong><a href="#article">Article</a><a href="#takeaways">Key takeaways</a><a href="#related">Related notes</a></aside><article class="article" id="article"><div class="eyebrow">${esc(post.category)} · ${esc(post.difficulty)}</div><h1>${esc(post.title)}</h1><p class="lede">${esc(post.description)}</p><div class="meta-row" style="justify-content:flex-start; gap:20px; margin:20px 0 35px"><span>${date(post.publishedDate)}</span><span>${post.readingTime} read</span><span>${fmt(post.views)} views</span></div><div>${content}</div><div id="takeaways" class="tip-box"><strong>Keep going:</strong> Practice the idea while it is still warm. The related quiz is a good next move.</div><section id="related" class="section"><div class="section-heading"><h2>Related notes</h2></div><div class="grid grid-2">${related.map(noteCard).join('')}</div></section></article></div>`;
}

async function renderCategories() { const categories = await getCategories(); const topics = await getTopics(); app.innerHTML = `<div class="page-intro"><div class="eyebrow">Find your next thread</div><h1>Browse categories</h1><p class="lede">Follow a subject from broad foundations into the details that matter in practice.</p></div><div class="grid grid-3">${categories.map(category => `${categoryCard(category)}<div class="card"><div class="eyebrow">Topics inside</div>${topics.filter(topic => topic.category === category.id).map(topic => `<a class="text-link" style="display:block;margin-top:12px" href="topic.html?topic=${topic.id}">${esc(topic.name)} →</a>`).join('') || '<p>No topics published yet.</p>'}</div>`).join('')}</div>`; }
async function renderCategory() { const [categories, topics] = await Promise.all([getCategories(), getTopics()]); const category = categories.find(item => item.id === params.get('id')); if (!category) return renderNotFound('That category does not exist.'); const categoryTopics = topics.filter(topic => topic.category === category.id); app.innerHTML = `<div class="page-intro"><div class="eyebrow">Category / ${category.topics} topics</div><h1>${esc(category.name)}</h1><p class="lede">${esc(category.description)}</p></div><div class="grid grid-3">${categoryTopics.map(topic => `<article class="card"><div class="card-top"><span class="badge">${topic.notes} notes</span><span class="badge ${topic.difficulty === 'Advanced' ? 'coral' : ''}">${esc(topic.difficulty)}</span></div><h3>${esc(topic.name)}</h3><p>${esc(topic.description)}</p><div class="meta-row"><span>${topic.quizzes} quizzes</span><span>${topic.notes} study notes</span></div><div style="margin-top:18px">${button('Open topic →', `topic.html?topic=${topic.id}`)}</div></article>`).join('')}</div>`; }
async function renderTopic() { const [topics, posts, quizzes] = await Promise.all([getTopics(), getPosts(), getQuizzes()]); const topic = topics.find(item => item.id === params.get('topic')); if (!topic) return renderNotFound('That topic does not exist.'); const topicPosts = posts.filter(post => post.topic === topic.name); const topicQuizzes = quizzes.filter(quiz => quiz.topic === topic.name); app.innerHTML = `<div class="page-intro"><div class="eyebrow">Topic / ${esc(topic.difficulty)}</div><h1>${esc(topic.name)}</h1><p class="lede">${esc(topic.description)}</p></div><section class="section"><div class="section-heading"><h2>Study notes</h2></div><div class="grid grid-3">${topicPosts.length ? topicPosts.map(noteCard).join('') : '<div class="empty-state">More notes are coming to this topic.</div>'}</div></section><section class="section"><div class="section-heading"><h2>Practice quizzes</h2></div><div class="grid grid-3">${topicQuizzes.length ? topicQuizzes.map(quizCard).join('') : '<div class="empty-state">More quizzes are coming to this topic.</div>'}</div></section>`; }

async function renderQuizzes() { const quizzes = await getQuizzes(); const categories = [...new Set(quizzes.map(item => item.category))]; app.innerHTML = `<div class="page-intro"><div class="eyebrow">Practice, then inspect the why</div><h1>Quizzes</h1><p class="lede">Short, focused MCQ sessions with instant results and a local best score.</p></div><div class="filters"><input id="quiz-filter" placeholder="Search quizzes..." aria-label="Search quizzes"><select id="quiz-category" aria-label="Filter quizzes"><option value="">All categories</option>${categories.map(category => `<option>${esc(category)}</option>`).join('')}</select><select id="quiz-sort" aria-label="Sort quizzes"><option value="popular">Popular</option><option value="latest">Latest</option></select></div><div id="quiz-grid" class="grid grid-3"></div>`; const draw = () => { const query = document.querySelector('#quiz-filter').value.toLowerCase(); const category = document.querySelector('#quiz-category').value; const sort = document.querySelector('#quiz-sort').value; const items = quizzes.filter(quiz => (!category || quiz.category === category) && `${quiz.title} ${quiz.topic} ${quiz.category}`.toLowerCase().includes(query)).sort((a,b) => sort === 'popular' ? b.attempts - a.attempts : a.title.localeCompare(b.title)); document.querySelector('#quiz-grid').innerHTML = items.length ? items.map(quizCard).join('') : '<div class="empty-state">No quizzes match that search.</div>'; }; ['quiz-filter','quiz-category','quiz-sort'].forEach(id => document.querySelector(`#${id}`).addEventListener('input', draw)); draw(); }

async function renderQuiz() { const quizzes = await getQuizzes(); const quiz = quizzes.find(item => item.id === params.get('id')) || quizzes[0]; if (!quiz) return renderNotFound('That quiz does not exist.'); app.innerHTML = `<div class="quiz-shell"><div class="quiz-header"><div><div class="eyebrow">${esc(quiz.category)} · ${esc(quiz.difficulty)}</div><h1>${esc(quiz.title)}</h1><p class="lede">${quiz.questions} questions · ${quiz.timeLimit ? `${Math.round(quiz.timeLimit / 60)} minutes` : 'No time limit'} · Pass at ${quiz.passingScore}%</p></div></div><div id="quiz-mount"><div class="card result-score"><p>Ready when you are.</p><p class="lede">Answer every question, then review the reasoning behind your score.</p>${button('Start quiz', '#start-quiz')}</div></div></div>`; app.querySelector('a[href="#start-quiz"]').addEventListener('click', event => { event.preventDefault(); startQuiz(quiz); }); }
function startQuiz(quiz) { let current = 0; const answers = Array(quiz.questionsData.length).fill(null); let remaining = quiz.timeLimit; let interval; const renderQuestion = () => { const item = quiz.questionsData[current]; document.querySelector('#quiz-mount').innerHTML = `<div class="progress" aria-label="Quiz progress"><span style="width:${((current + 1) / quiz.questionsData.length) * 100}%"></span></div><div class="question-nav" aria-label="Question navigation">${quiz.questionsData.map((_, index) => `<button class="question-dot ${index === current ? 'current' : ''} ${answers[index] !== null ? 'answered' : ''}" data-index="${index}" aria-label="Go to question ${index + 1}">${index + 1}</button>`).join('')}</div><div class="card question-card"><div class="question-number">Question ${current + 1} of ${quiz.questionsData.length}</div><h2>${esc(item.question)}</h2><div class="options">${item.options.map((option, index) => `<label class="option"><input type="radio" name="answer" value="${index}" ${answers[current] === index ? 'checked' : ''}> <span>${esc(option)}</span></label>`).join('')}</div></div><div class="quiz-controls">${current ? '<button class="button button-secondary" id="previous">← Previous</button>' : '<span></span>'}${current === quiz.questionsData.length - 1 ? '<button class="button button-coral" id="submit">Submit quiz</button>' : '<button class="button button-primary" id="next">Next →</button>'}</div>`; document.querySelectorAll('input[name="answer"]').forEach(input => input.addEventListener('change', () => { answers[current] = Number(input.value); renderQuestion(); })); document.querySelectorAll('.question-dot').forEach(dot => dot.addEventListener('click', () => { current = Number(dot.dataset.index); renderQuestion(); })); document.querySelector('#previous')?.addEventListener('click', () => { current -= 1; renderQuestion(); }); document.querySelector('#next')?.addEventListener('click', () => { current += 1; renderQuestion(); }); document.querySelector('#submit')?.addEventListener('click', () => finish()); };
  const finish = async () => { clearInterval(interval); const correct = answers.reduce((total, answer, index) => total + (answer === quiz.questionsData[index].answer ? 1 : 0), 0); const result = { quizId: quiz.id, answers, correct, total: quiz.questionsData.length, skipped: answers.filter(answer => answer === null).length, timeTaken: quiz.timeLimit ? quiz.timeLimit - remaining : 0, completedAt: Date.now() }; sessionStorage.setItem('studyNotesLastResult', JSON.stringify(result)); saveScore(quiz.id, correct, quiz.questionsData.length); await saveQuizAttempt(result, quiz); location.href = `quiz-result.html?id=${quiz.id}`; };
  app.querySelector('.quiz-shell').insertAdjacentHTML('afterbegin', '<div class="timer" id="timer">--:--</div>'); const timer = document.querySelector('#timer'); if (quiz.timeLimit) { const tick = () => { timer.textContent = `${String(Math.floor(remaining / 60)).padStart(2, '0')}:${String(remaining % 60).padStart(2, '0')}`; if (remaining <= 0) finish(); remaining -= 1; }; tick(); interval = setInterval(tick, 1000); } else timer.textContent = 'No timer'; renderQuestion(); }

function startQuizModern(quiz) {
  const questions = Array.isArray(quiz.questionsData) ? quiz.questionsData : [];
  if (!questions.length) {
    document.querySelector('#quiz-mount').innerHTML = '<div class="empty-state">This quiz has no questions yet.</div>';
    return;
  }

  let current = 0;
  let remaining = Number(quiz.timeLimit) || 0;
  let interval;
  const answers = Array(questions.length).fill(null);
  const review = new Set();
  const mount = document.querySelector('#quiz-mount');
  const formatTime = seconds => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  const answered = () => answers.filter(answer => answer !== null).length;

  const finish = () => {
    clearInterval(interval);
    const correct = answers.reduce((total, answer, index) => total + (answer === questions[index].answer ? 1 : 0), 0);
    const result = { quizId: quiz.id, quizTitle: quiz.title, category: quiz.category, topic: quiz.topic, answers, correct, total: questions.length, skipped: answers.filter(answer => answer === null).length, timeTaken: quiz.timeLimit ? quiz.timeLimit - remaining : 0, completedAt: Date.now() };
    sessionStorage.setItem('studyNotesLastResult', JSON.stringify(result));
    saveQuizHistory({ ...result, percentage: Math.round(correct / questions.length * 100) });
    saveScore(quiz.id, correct, questions.length);
    location.href = `quiz-result.html?id=${encodeURIComponent(quiz.id)}`;
  };

  const renderQuestion = () => {
    const item = questions[current];
    const progress = Math.round((answered() / questions.length) * 100);
    const navigator = questions.map((_, index) => `<button type="button" class="question-dot ${index === current ? 'current' : ''} ${answers[index] !== null ? 'answered' : 'unanswered'} ${review.has(index) ? 'review' : ''}" data-index="${index}" aria-label="Go to question ${index + 1}${review.has(index) ? ', marked for review' : ''}">${index + 1}</button>`).join('');
    mount.innerHTML = `<button type="button" class="button button-secondary quiz-mobile-toggle" id="open-questions">Questions <span>${answered()}/${questions.length}</span></button><div class="quiz-workspace"><aside class="card quiz-sidebar" id="quiz-sidebar"><div class="quiz-sidebar-heading"><div><div class="eyebrow">${esc(quiz.category)}</div><h2>${esc(quiz.title)}</h2></div><button type="button" class="icon-button" id="close-questions" aria-label="Close question navigator">×</button></div><p class="meta-row">${answered()} / ${questions.length} answered</p><div class="progress" aria-label="Quiz progress"><span style="width:${progress}%"></span></div><div class="quiz-sidebar-stats"><div><span>Answered</span><strong>${answered()}</strong></div><div><span>Open</span><strong>${questions.length - answered()}</strong></div><div><span>Review</span><strong>${review.size}</strong></div></div><div class="question-nav" aria-label="Question navigation">${navigator}</div></aside><section class="quiz-main"><div class="quiz-topbar"><div class="question-count">Question ${current + 1} of ${questions.length}</div><div class="timer ${remaining && remaining <= 60 ? 'warning' : ''}" id="timer">${quiz.timeLimit ? formatTime(remaining) : 'No timer'}</div></div><div class="progress" aria-label="Answered progress"><span style="width:${progress}%"></span></div><div class="card question-card"><div class="question-number">Question ${current + 1}</div><h2>${esc(item.question)}</h2><div class="options">${item.options.map((option, index) => `<label class="option"><input type="radio" name="answer" value="${index}" ${answers[current] === index ? 'checked' : ''}><span>${esc(option)}</span></label>`).join('')}</div></div><div class="quiz-controls"><button type="button" class="button button-secondary" id="previous" ${current === 0 ? 'disabled' : ''}>Previous</button><button type="button" class="button button-secondary" id="mark-review">${review.has(current) ? 'Unmark review' : 'Mark for review'}</button><button type="button" class="button button-secondary" id="clear-answer" ${answers[current] === null ? 'disabled' : ''}>Clear answer</button><button type="button" class="button button-primary" id="next">${current === questions.length - 1 ? 'Submit quiz' : 'Next'}</button></div></section></div>`;

    mount.querySelectorAll('input[name="answer"]').forEach(input => input.addEventListener('change', event => { answers[current] = Number(event.target.value); review.delete(current); renderQuestion(); }));
    mount.querySelectorAll('.question-dot').forEach(dot => dot.addEventListener('click', () => { current = Number(dot.dataset.index); document.querySelector('#quiz-sidebar')?.classList.remove('open'); renderQuestion(); }));
    mount.querySelector('#previous')?.addEventListener('click', () => { if (current > 0) { current -= 1; renderQuestion(); } });
    mount.querySelector('#next')?.addEventListener('click', () => { if (current === questions.length - 1) { showSubmitModal({ answered: answered(), total: questions.length, review: review.size, onSubmit: finish }); } else { current += 1; renderQuestion(); } });
    mount.querySelector('#mark-review')?.addEventListener('click', () => { review.has(current) ? review.delete(current) : review.add(current); renderQuestion(); });
    mount.querySelector('#clear-answer')?.addEventListener('click', () => { answers[current] = null; renderQuestion(); });
    mount.querySelector('#open-questions')?.addEventListener('click', () => document.querySelector('#quiz-sidebar')?.classList.add('open'));
    mount.querySelector('#close-questions')?.addEventListener('click', () => document.querySelector('#quiz-sidebar')?.classList.remove('open'));
  };

  const tick = () => {
    const timer = document.querySelector('#timer');
    if (timer) { timer.textContent = quiz.timeLimit ? formatTime(Math.max(remaining, 0)) : 'No timer'; timer.classList.toggle('warning', remaining > 0 && remaining <= 60); }
    if (quiz.timeLimit && remaining <= 0) finish();
    remaining -= 1;
  };
  renderQuestion();
  if (quiz.timeLimit) { tick(); interval = window.setInterval(tick, 1000); }
}

startQuiz = startQuizModern;

async function renderResult() { const result = JSON.parse(sessionStorage.getItem('studyNotesLastResult') || 'null'); const quizzes = await getQuizzes(); const quiz = result && quizzes.find(item => item.id === result.quizId); if (!result || !quiz) return renderNotFound('Complete a quiz to see its result.'); const percent = Math.round(result.correct / result.total * 100); const status = percent >= quiz.passingScore ? 'PASSED' : 'KEEP PRACTICING'; const score = getScores()[quiz.id]; app.innerHTML = `<div class="quiz-shell"><div class="card result-score"><div class="eyebrow">${esc(status)}</div><h1>Quiz completed</h1><div class="score-number">${percent}%</div><p class="lede">${result.correct} / ${result.total} correct · ${result.total - result.correct} to revisit</p><div class="meta-row" style="justify-content:center;gap:20px"><span>Best score: ${score.bestScore}/${score.bestTotal}</span><span>${score.attempts} local attempt${score.attempts === 1 ? '' : 's'}</span></div><div class="hero-actions" style="justify-content:center">${button('Retry quiz', `quiz.html?id=${quiz.id}`)}${button('Back to quizzes', 'quizzes.html', 'button-secondary')}</div></div><section class="section"><div class="section-heading"><h2>Review answers</h2></div>${quiz.questionsData.map((item, index) => { const answer = result.answers[index]; const kind = answer === null ? 'unanswered' : answer === item.answer ? 'correct' : 'incorrect'; return `<article class="card review-item ${kind}"><div class="question-number">Question ${index + 1}</div><h3>${esc(item.question)}</h3><div class="answer-line ${kind === 'correct' ? 'answer-good' : kind === 'incorrect' ? 'answer-bad' : ''}">Your answer: ${answer === null ? 'Not answered' : esc(item.options[answer])}</div><div class="answer-line answer-good">Correct answer: ${esc(item.options[item.answer])}</div><p>${esc(item.explanation)}</p></article>`; }).join('')}</section></div>`; }

async function renderRoadmap() {
  const [topics, categories] = await Promise.all([getTopics(), getCategories()]);
  const stages = ['SQL', 'Python', 'Git', 'Linux', 'Data Modeling', 'ETL', 'PySpark', 'Cloud', 'Databricks', 'Kafka', 'System Design', 'Interview Preparation'];
  const stored = (() => { try { return JSON.parse(localStorage.getItem('studyNotesRoadmap') || '{}'); } catch { return {}; } })();
  const relatedItem = stage => { const topic = topics.find(item => item.name.toLowerCase().includes(stage.toLowerCase())); if (topic) return { ...topic, kind: 'topic' }; const category = categories.find(item => item.name.toLowerCase().includes(stage.toLowerCase())); return category ? { ...category, kind: 'category' } : null; };
  app.innerHTML = `<div class="page-intro"><div class="eyebrow">A practical sequence</div><h1>Data Engineering roadmap</h1><p class="lede">Move from foundations to interview-ready systems knowledge, one stage at a time.</p></div><section class="roadmap-list">${stages.map((stage, index) => { const item = relatedItem(stage); const state = stored[stage] || 'Not started'; const href = item?.kind === 'topic' ? `topic.html?topic=${encodeURIComponent(item.id)}` : item?.kind === 'category' ? `category.html?id=${encodeURIComponent(item.id)}` : '#'; return `<article class="roadmap-stage card"><div class="roadmap-stage-number">${String(index + 1).padStart(2, '0')}</div><div class="roadmap-stage-content"><div class="eyebrow">Stage ${index + 1}</div><h2>${esc(stage)}</h2><p>${item?.description ? esc(item.description) : 'Build practical fluency before moving to the next layer.'}</p>${href !== '#' ? `<a class="text-link" href="${href}">Open learning path →</a>` : ''}</div><label class="roadmap-status">Status<select data-roadmap-stage="${esc(stage)}"><option ${state === 'Not started' ? 'selected' : ''}>Not started</option><option ${state === 'In progress' ? 'selected' : ''}>In progress</option><option ${state === 'Completed' ? 'selected' : ''}>Completed</option></select></label></article>`; }).join('')}</section>`;
  document.querySelectorAll('[data-roadmap-stage]').forEach(select => select.addEventListener('change', event => { stored[event.target.dataset.roadmapStage] = event.target.value; try { localStorage.setItem('studyNotesRoadmap', JSON.stringify(stored)); } catch {} showToast('Roadmap progress updated.', 'success'); }));
}
async function renderResources() { const resources = await getResources(); app.innerHTML = `<div class="page-intro"><div class="eyebrow">Good references deserve a home</div><h1>Resources</h1><p class="lede">Free guides and practical reference material for revision sessions.</p></div><div class="grid grid-3">${resources.map(resourceCard).join('')}</div>`; }
async function renderResource() { const resources = await getResources(); const item = resources.find(resource => resource.id === params.get('id')); if (!item) return renderNotFound('That resource does not exist.'); app.innerHTML = `<div class="quiz-shell"><div class="page-intro"><div class="eyebrow">${esc(item.category)} · ${esc(item.type)}</div><h1>${esc(item.title)}</h1><p class="lede">${esc(item.description)}</p></div><div class="card"><div class="stat-strip"><div class="stat"><strong>${item.pages}</strong><span>pages</span></div><div class="stat"><strong>${item.fileSize}</strong><span>file size</span></div><div class="stat"><strong>${esc(item.access)}</strong><span>access</span></div></div><div class="hero-actions">${button('Preview PDF', item.file, 'button-primary')}${button('Download', item.file, 'button-secondary')}</div><p class="meta-row" style="margin-top:18px">PDF preview and download use the static file path configured in resources.json.</p></div></div>`; }
async function renderSearch() { const [posts, quizzes, categories, topics, resources] = await Promise.all([getPosts(), getQuizzes(), getCategories(), getTopics(), getResources()]); app.innerHTML = `<div class="page-intro"><div class="eyebrow">One search, several paths</div><h1>Search StudyNotes</h1><div class="search-bar"><input id="global-search" value="${esc(params.get('q') || '')}" placeholder="Search notes, quizzes, topics..." aria-label="Search all StudyNotes"><button id="global-search-button">Search</button></div></div><div id="search-results"></div>`; const draw = () => { const query = document.querySelector('#global-search').value.toLowerCase().trim(); const match = item => `${item.title || item.name} ${item.description || ''} ${item.category || ''}`.toLowerCase().includes(query); const groups = [['Study notes', posts.filter(match).map(noteCard)],['Quizzes', quizzes.filter(match).map(quizCard)],['Categories', categories.filter(match).map(categoryCard)],['Topics', topics.filter(match).map(topic => `<article class="card"><span class="badge">Topic</span><h3>${esc(topic.name)}</h3><p>${esc(topic.description)}</p><a class="text-link" href="topic.html?topic=${topic.id}">Open topic →</a></article>`,)],['Resources', resources.filter(match).map(resourceCard)]]; document.querySelector('#search-results').innerHTML = query ? groups.filter(([,items]) => items.length).map(([title,items]) => `<section class="section"><div class="section-heading"><h2>${title}</h2></div><div class="grid grid-3">${items.join('')}</div></section>`).join('') || '<div class="empty-state">No results yet. Try a broader search.</div>' : '<div class="empty-state">Type a subject, topic or quiz name to begin.</div>'; }; document.querySelector('#global-search-button').addEventListener('click', draw); document.querySelector('#global-search').addEventListener('input', draw); draw(); }
function renderAbout() { app.innerHTML = `<div class="page-intro"><div class="eyebrow">A small project with a useful ambition</div><h1>About StudyNotes</h1><p class="lede">StudyNotes is a technical study and MCQ practice portal, not a personal portfolio.</p></div><div class="grid grid-2"><section class="card"><h2>About Ashish Zope</h2><p>Ashish Zope is a Senior Data Engineer with 5+ years of experience in data engineering, cloud data platforms and enterprise-scale data systems.</p><p>StudyNotes was created to share practical technical knowledge, interview preparation material and learning resources.</p></section><section class="card"><h2>Technical focus</h2><div class="filters"><span class="badge">SQL</span><span class="badge">PostgreSQL</span><span class="badge">Python</span><span class="badge">PySpark</span><span class="badge">Databricks</span><span class="badge">Azure</span><span class="badge">ETL</span></div><p class="meta-row">Local quiz identity and scores stay in your browser. There is no registered account or global leaderboard.</p></section></div>`; }
function renderNotFound(message = 'The page you are looking for is not here.') { app.innerHTML = `<div class="empty-state"><div class="eyebrow">404</div><h1>Keep exploring.</h1><p>${esc(message)}</p>${button('Back home', 'index.html')}</div>`; }

function showToast(message, type = 'info') {
  const region = document.querySelector('#toast-region');
  if (!region) return;
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.setAttribute('role', type === 'error' ? 'alert' : 'status');
  toast.innerHTML = `<span>${esc(message)}</span><button type="button" aria-label="Dismiss notification">×</button>`;
  region.append(toast);
  const dismiss = () => toast.remove();
  toast.querySelector('button').addEventListener('click', dismiss);
  window.setTimeout(dismiss, 4200);
}

function showSubmitModal({ answered, total, review, onSubmit }) {
  document.querySelector('#submit-modal')?.remove();
  const modal = document.createElement('div');
  modal.id = 'submit-modal';
  modal.className = 'modal-backdrop';
  modal.innerHTML = `<section class="modal" role="dialog" aria-modal="true" aria-labelledby="submit-title"><button type="button" class="modal-close" aria-label="Close submit dialog">×</button><div class="eyebrow">Ready to review?</div><h2 id="submit-title">Submit quiz?</h2><p>You are about to finish this practice session.</p><div class="modal-stats"><span><strong>${answered}</strong>Answered</span><span><strong>${total - answered}</strong>Unanswered</span><span><strong>${review}</strong>Review</span></div><div class="modal-actions"><button type="button" class="button button-secondary" id="continue-quiz">Continue quiz</button><button type="button" class="button button-primary" id="confirm-submit">Submit quiz</button></div></section>`;
  document.body.append(modal);
  const close = () => modal.remove();
  modal.querySelector('.modal-close').addEventListener('click', close);
  modal.querySelector('#continue-quiz').addEventListener('click', close);
  modal.querySelector('#confirm-submit').addEventListener('click', () => { close(); showToast('Quiz submitted. Preparing your review.', 'success'); onSubmit(); });
  modal.addEventListener('click', event => { if (event.target === modal) close(); });
  modal.addEventListener('keydown', event => { if (event.key === 'Escape') close(); });
  modal.querySelector('#continue-quiz').focus();
}

function assistantContext() {
  const title = document.querySelector('h1')?.textContent?.trim() || 'technical learning';
  const category = document.querySelector('.eyebrow')?.textContent?.split('·')[0]?.trim() || 'StudyNotes';
  return { title, category };
}

const assistantIndexPromise = Promise.all([
  getPosts(),
  getTopics(),
  getQuizzes(),
  getResources(),
  getCategories(),
  fetch('./data/ask-ashu-normal.json').then(response => response.ok ? response.json() : []),
  fetch('./data/ask-ashu-knowledge.json').then(response => response.ok ? response.json() : [])
]).then(async ([posts, topics, quizzes, resources, categories, normal, knowledge]) => {
  const content = await Promise.all(posts.map(async post => {
    try { const response = await fetch(post.contentFile); return response.ok ? await response.text() : ''; } catch (error) { return ''; }
  }));
  return { posts: posts.map((post, index) => ({ ...post, content: content[index] })), topics, quizzes, resources, categories, normal, knowledge };
}).catch(() => ({ posts: [], topics: [], quizzes: [], resources: [], categories: [], normal: [], knowledge: [] }));
let askAshuQuizState = null;

function askAshuQuestion(quiz, index) {
  const question = quiz.questionsData[index];
  return `### Question ${index + 1} of ${quiz.questionsData.length}\n\n${question.question}\n\n${question.options.map((option, optionIndex) => `${String.fromCharCode(65 + optionIndex)}. ${option}`).join('\n')}`;
}

function renderAskAshuResponse(value) {
  const escaped = esc(value || '');
  const lines = escaped.split('\n');
  let html = '';
  let list = '';
  let code = false;
  lines.forEach(line => {
    if (line.trim().startsWith('```')) { code = !code; if (!code) html += '</code></pre>'; else html += '<pre><code>'; return; }
    if (code) { html += `${line}\n`; return; }
    if (!line.trim()) { if (list) { html += `</ul>`; list = ''; } return; }
    const formatted = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/`([^`]+)`/g, '<code>$1</code>');
    if (/^###\s+/.test(formatted)) { if (list) { html += '</ul>'; list = ''; } html += `<h3>${formatted.replace(/^###\s+/, '')}</h3>`; }
    else if (/^[-*]\s+/.test(formatted)) { if (!list) { html += '<ul>'; list = 'ul'; } html += `<li>${formatted.replace(/^[-*]\s+/, '')}</li>`; }
    else if (/^\d+\.\s+/.test(formatted)) { if (!list) { html += '<ol>'; list = 'ol'; } html += `<li>${formatted.replace(/^\d+\.\s+/, '')}</li>`; }
    else { if (list) { html += `</${list}>`; list = ''; } html += `<p>${formatted}</p>`; }
  });
  if (list) html += `</${list}>`;
  if (code) html += '</code></pre>';
  return html;
}

async function assistantAnswer(prompt) {
  const context = assistantContext();
  const lower = prompt.toLowerCase().trim();
  const index = await assistantIndexPromise;

  const knowledge = index.knowledge?.find(entry => {
    const patterns = entry.patterns || [];
    const keywords = entry.keywords || [];
    const patternMatch = patterns.some(pattern => lower === pattern || lower.includes(pattern) || pattern.includes(lower));
    const keywordMatch = keywords.some(keyword => lower.includes(keyword.toLowerCase()));
    return patternMatch || keywordMatch;
  });

  if (knowledge) {
    const relatedActions = [];
    const topic = index.topics.find(item => item.id === knowledge.topicId) || index.topics.find(item => item.name?.toLowerCase() === knowledge.category?.toLowerCase());
    if (topic) relatedActions.push({ label: `Open ${topic.name || knowledge.category}`, href: `topic.html?topic=${encodeURIComponent(topic.id)}` });
    const relatedQuiz = (knowledge.relatedQuizzes || []).map(id => index.quizzes.find(quiz => quiz.id === id)).find(Boolean);
    if (relatedQuiz) relatedActions.push({ label: `Practice ${relatedQuiz.title}`, href: `quiz.html?id=${encodeURIComponent(relatedQuiz.id)}` });
    const summary = `${knowledge.response}\n\nTry next:\n• ${knowledge.suggestedActions?.slice(0, 3).join('\n• ') || 'Review the related study notes and quiz'}`;
    return { text: summary, actions: relatedActions };
  }

  const normal = index.normal?.find(entry => entry.patterns.some(pattern => lower === pattern || lower.includes(pattern)));
  if (normal) return { text: normal.responses[Math.floor(Math.random() * normal.responses.length)], actions: [] };
  if (askAshuQuizState && /^[a-d1-4]$/.test(lower)) {
    const answerIndex = /^[1-4]$/.test(lower) ? Number(lower) - 1 : lower.charCodeAt(0) - 97;
    const question = askAshuQuizState.quiz.questionsData[askAshuQuizState.index];
    const correct = answerIndex === question.answer;
    const feedback = correct ? 'Nice one! Correct.' : `Good attempt. The correct answer is ${question.options[question.answer]}.`;
    const explanation = question.explanation || 'Review the related StudyNote for more detail.';
    askAshuQuizState.index += 1;
    if (askAshuQuizState.index >= askAshuQuizState.quiz.questionsData.length) {
      const quizId = askAshuQuizState.quiz.id;
      askAshuQuizState = null;
      return { text: `### ${feedback}\n\n${explanation}\n\nThat was the last question. Open the full quiz when you want to complete a scored attempt.`, actions: [{ label: 'Start full quiz', href: `quiz.html?id=${encodeURIComponent(quizId)}` }] };
    }
    return { text: `### ${feedback}\n\n${explanation}\n\n${askAshuQuestion(askAshuQuizState.quiz, askAshuQuizState.index)}`, actions: [] };
  }
  const normalized = lower.replace(/[^a-z0-9 ]/g, ' ');
  const tokens = normalized.split(/\s+/).filter(token => token.length > 2 && !['what', 'this', 'that', 'tell', 'about', 'give', 'with', 'from'].includes(token));
  const score = item => {
    const haystack = `${item.title || item.name || ''} ${item.topic || ''} ${item.category || ''} ${(item.tags || []).join(' ')} ${item.description || ''} ${item.content || ''}`.toLowerCase();
    return tokens.reduce((total, token) => total + (haystack.includes(token) ? (haystack.startsWith(token) ? 4 : 1) : 0), 0);
  };
  const rankedPosts = index.posts.map(item => ({ item, rank: score(item) })).filter(result => result.rank).sort((a, b) => b.rank - a.rank);
  const rankedTopics = index.topics.map(item => ({ item, rank: score(item) })).filter(result => result.rank).sort((a, b) => b.rank - a.rank);
  const isQuizCommand = /\b(start|take|launch|give me|quiz me)\b.*\bquiz\b|\bquiz me\b/.test(lower);
  if (isQuizCommand) {
    const candidates = index.quizzes.map(item => ({ item, rank: score(item) })).filter(result => result.rank).sort((a, b) => b.rank - a.rank).slice(0, 4);
    if (candidates.length > 1) return { text: 'I found several relevant practice sessions. Which one would you like to attempt?', actions: candidates.map(({ item }) => ({ label: `${item.title} · ${item.questions || item.questionsData?.length || 0} questions`, href: `quiz.html?id=${encodeURIComponent(item.id)}` })) };
    if (candidates.length) {
      const quiz = candidates[0].item;
      if (Array.isArray(quiz.questionsData) && quiz.questionsData.length) { askAshuQuizState = { quiz, index: 0 }; return { text: `Let’s test your ${quiz.category} knowledge. Reply with A, B, C, or D.\n\n${askAshuQuestion(quiz, 0)}`, actions: [{ label: `Open full ${quiz.title} quiz`, href: `quiz.html?id=${encodeURIComponent(quiz.id)}` }] }; }
      return { text: `Sure. Let’s test your ${quiz.category} knowledge with ${quiz.title}.`, actions: [{ label: `Start ${quiz.title}`, href: `quiz.html?id=${encodeURIComponent(quiz.id)}` }] };
    }
  }
  const current = rankedPosts[0]?.item || rankedTopics[0]?.item;
  if (/\b(open|show)\b.*\b(notes?|resources?)\b/.test(lower)) {
    const post = rankedPosts[0]?.item;
    return { text: post ? `Here is the most relevant StudyNote I found: ${post.title}.` : 'Browse the Study Notes collection for the closest match.', actions: [{ label: post ? `Read ${post.title}` : 'Open Study Notes', href: post ? `post.html?id=${encodeURIComponent(post.id)}` : 'study-notes.html' }] };
  }
  if (current) {
    const title = current.title || current.name;
    const excerpt = (current.description || current.content || 'A focused StudyNotes topic.').replace(/\s+/g, ' ').slice(0, 420);
    const actions = [];
    if (current.id && current.content) actions.push({ label: `Read ${title}`, href: `post.html?id=${encodeURIComponent(current.id)}` });
    const relatedQuiz = index.quizzes.find(quiz => score(quiz) > 0 && (quiz.category === current.category || quiz.topic === current.topic));
    if (relatedQuiz) actions.push({ label: `Practice ${relatedQuiz.title}`, href: `quiz.html?id=${encodeURIComponent(relatedQuiz.id)}` });
    return { text: `### ${title}\n\n${excerpt}\n\nAsk me for a simple explanation, an example, interview questions, or a quick revision of this topic.`, actions };
  }
  if (lower.includes('interview')) return { text: `For an interview-ready answer on ${context.title}, define the concept, show a small example, then explain one trade-off or common mistake.`, actions: [{ label: 'Open Interview Search', href: 'search.html?q=Interview%20Questions' }] };
  return { text: `I could not find a close match yet. Try a topic such as SQL, joins, Python, PySpark, Databricks, or ask “start SQL quiz”.`, actions: [] };
}

function setupAssistant() {
  if (document.querySelector('#ask-ashu')) return;
  document.body.insertAdjacentHTML('beforeend', `<div id="toast-region" class="toast-region" aria-live="polite"></div><button id="ask-ashu" class="ask-ashu" type="button" aria-expanded="false" aria-controls="ashu-panel"><span aria-hidden="true">✦</span><span>Ask Ashu</span></button><aside id="ashu-panel" class="ashu-panel" aria-label="Ask Ashu assistant" hidden><div class="ashu-header"><div><strong>✦ Ask Ashu</strong><small>StudyNotes learning guide</small></div><button type="button" class="icon-button" id="close-ashu" aria-label="Close Ask Ashu">×</button></div><div id="ashu-messages" class="ashu-messages"><div class="ashu-message assistant">Hi, I’m Ashu. Ask about the page you’re reading, or choose a prompt to get moving.</div></div><div class="ashu-prompts"><button type="button">Explain this simply</button><button type="button">Give me an example</button><button type="button">Give me interview questions</button><button type="button">Quiz me on this topic</button></div><form id="ashu-form" class="ashu-form"><input id="ashu-input" type="text" placeholder="Ask something..." aria-label="Ask Ashu a question"><button class="button button-primary" type="submit">Send</button></form></aside>`);
  const trigger = document.querySelector('#ask-ashu');
  const panel = document.querySelector('#ashu-panel');
  const input = document.querySelector('#ashu-input');
  const messages = document.querySelector('#ashu-messages');
  const open = () => { panel.hidden = false; trigger.setAttribute('aria-expanded', 'true'); input.focus(); };
  const close = () => { panel.hidden = true; trigger.setAttribute('aria-expanded', 'false'); };
  const ask = async value => { const prompt = value.trim(); if (!prompt) return; messages.insertAdjacentHTML('beforeend', `<div class="ashu-message user">${esc(prompt)}</div><div class="ashu-message assistant" data-typing="true">Ask Ashu is thinking...</div>`); messages.scrollTop = messages.scrollHeight; const response = await assistantAnswer(prompt); const reply = messages.querySelector('[data-typing="true"]'); if (reply) { reply.removeAttribute('data-typing'); reply.innerHTML = `${renderAskAshuResponse(response.text)}${response.actions?.length ? `<div class="ashu-actions">${response.actions.map(action => `<a href="${esc(action.href)}">${esc(action.label)}</a>`).join('')}</div>` : ''}`; } messages.scrollTop = messages.scrollHeight; };
  trigger.addEventListener('click', () => panel.hidden ? open() : close());
  document.querySelector('.header-ashu')?.addEventListener('click', () => panel.hidden ? open() : close());
  document.querySelector('#close-ashu').addEventListener('click', close);
  document.querySelector('#ashu-form').addEventListener('submit', event => { event.preventDefault(); ask(input.value); input.value = ''; });
  document.querySelectorAll('.ashu-prompts button').forEach(buttonEl => buttonEl.addEventListener('click', () => ask(buttonEl.textContent)));
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && !panel.hidden) close(); });
}

async function renderPostsEnhanced() {
  const [posts, topics] = await Promise.all([getPosts(), getTopics()]);
  const groups = [...new Set(posts.map(post => post.category))];
  app.innerHTML = `<div class="page-intro"><div class="eyebrow">Notes you can return to</div><h1>Study notes</h1><p class="lede">Clear explanations for SQL, Python, cloud data platforms and the systems around them.</p></div><div class="docs-layout"><aside class="docs-sidebar card"><div class="sidebar-heading"><strong>Topics</strong><input id="topic-filter" type="search" placeholder="Filter topics" aria-label="Filter study note topics"></div><div id="topic-tree">${groups.map(group => `<details open><summary>${esc(group)}</summary><div class="sidebar-links">${topics.filter(topic => topic.name.includes(group) || posts.some(post => post.category === group && post.topic === topic.name)).map(topic => `<a href="topic.html?topic=${encodeURIComponent(topic.id)}">${esc(topic.name)}</a>`).join('') || `<a href="search.html?q=${encodeURIComponent(group)}">Explore ${esc(group)}</a>`}</div></details>`).join('')}</div></aside><section><div class="filters"><input id="post-filter" placeholder="Search study notes..." aria-label="Search study notes"><select id="difficulty-filter" aria-label="Filter by difficulty"><option value="">All difficulty levels</option><option>Beginner</option><option>Intermediate</option><option>Advanced</option></select><select id="sort-posts" aria-label="Sort notes"><option value="latest">Latest</option><option value="views">Most viewed</option></select></div><div id="post-grid" class="grid grid-3"></div></section></div>`;
  app.insertAdjacentHTML('afterbegin', '<button type="button" class="button button-secondary mobile-topic-toggle" id="open-topic-sidebar">☰ Topics</button>');
  document.querySelector('.docs-sidebar').insertAdjacentHTML('afterbegin', '<button type="button" class="icon-button sidebar-close" id="close-topic-sidebar" aria-label="Close topic navigation">×</button>');
  const topicSidebar = document.querySelector('.docs-sidebar');
  document.querySelector('#open-topic-sidebar').addEventListener('click', () => { topicSidebar.classList.add('open'); document.body.classList.add('drawer-open'); });
  document.querySelector('#close-topic-sidebar').addEventListener('click', () => { topicSidebar.classList.remove('open'); document.body.classList.remove('drawer-open'); });
  document.querySelectorAll('.docs-sidebar details').forEach(section => { const key = `studyNotesTopic_${section.querySelector('summary').textContent}`; section.open = localStorage.getItem(key) !== 'closed'; section.addEventListener('toggle', () => localStorage.setItem(key, section.open ? 'open' : 'closed')); });
  const draw = () => { const query = document.querySelector('#post-filter').value.toLowerCase(); const difficulty = document.querySelector('#difficulty-filter').value; const sort = document.querySelector('#sort-posts').value; const items = posts.filter(post => (!difficulty || post.difficulty === difficulty) && `${post.title} ${post.category} ${(post.tags || []).join(' ')}`.toLowerCase().includes(query)).sort((a, b) => sort === 'views' ? b.views - a.views : b.publishedDate.localeCompare(a.publishedDate)); document.querySelector('#post-grid').innerHTML = items.length ? items.map(noteCard).join('') : '<div class="empty-state">No notes match that search.</div>'; };
  ['post-filter', 'difficulty-filter', 'sort-posts'].forEach(id => document.querySelector(`#${id}`).addEventListener('input', draw));
  document.querySelector('#topic-filter').addEventListener('input', event => document.querySelectorAll('#topic-tree a').forEach(link => { link.hidden = !link.textContent.toLowerCase().includes(event.target.value.toLowerCase()); }));
  draw();
}

async function renderQuizzesEnhanced() {
  const quizzes = await getQuizzes();
  const categories = [...new Set(quizzes.map(quiz => quiz.category))].sort();
  const counts = [...new Set(quizzes.map(quiz => Number(quiz.questions || quiz.questionsData?.length || 0)))].sort((a, b) => a - b);
  app.innerHTML = `<div class="page-intro"><div class="eyebrow">Practice, then inspect the why</div><h1>Practice quizzes</h1><p class="lede">Find a focused session by category, difficulty, topic, size, or time limit.</p></div><button type="button" class="button button-secondary mobile-filter-toggle" id="open-quiz-filters">☰ Filters</button><div class="quiz-list-layout"><aside class="card filter-sidebar" id="quiz-filters"><div class="sidebar-heading"><strong>Filter quizzes</strong><button type="button" class="icon-button" id="close-quiz-filters" aria-label="Close quiz filters">×</button></div><label>Search<input id="quiz-filter" placeholder="Search quizzes..." aria-label="Search quizzes"></label><label>Category<select id="quiz-category"><option value="">All categories</option>${categories.map(category => `<option>${esc(category)}</option>`).join('')}</select></label><label>Topic<select id="quiz-topic"><option value="">All topics</option>${[...new Set(quizzes.map(quiz => quiz.topic).filter(Boolean))].sort().map(topic => `<option>${esc(topic)}</option>`).join('')}</select></label><fieldset><legend>Difficulty</legend>${['Beginner', 'Intermediate', 'Advanced'].map(value => `<label class="check-row"><input type="checkbox" name="quiz-difficulty" value="${value}">${value}</label>`).join('')}</fieldset><fieldset><legend>Question count</legend>${counts.map(count => `<label class="check-row"><input type="checkbox" name="quiz-count" value="${count}">${count} questions</label>`).join('')}</fieldset><button type="button" class="button button-secondary" id="clear-quiz-filters">Clear filters</button></aside><section><div class="quiz-results-toolbar"><input id="quiz-sort-search" type="search" placeholder="Search within results" aria-label="Search within quiz results"><select id="quiz-sort"><option value="popular">Most popular</option><option value="questions">Most questions</option><option value="difficulty">Difficulty</option></select></div><div id="quiz-grid" class="grid grid-3"></div></section></div>`;
  const filterSidebar = document.querySelector('#quiz-filters');
  const draw = () => { const term = document.querySelector('#quiz-filter').value.toLowerCase(); const search = document.querySelector('#quiz-sort-search').value.toLowerCase(); const category = document.querySelector('#quiz-category').value; const topic = document.querySelector('#quiz-topic').value; const difficulties = [...document.querySelectorAll('input[name="quiz-difficulty"]:checked')].map(input => input.value); const countsSelected = [...document.querySelectorAll('input[name="quiz-count"]:checked')].map(input => Number(input.value)); const sort = document.querySelector('#quiz-sort').value; let items = quizzes.filter(quiz => { const haystack = `${quiz.title} ${quiz.topic} ${quiz.category}`.toLowerCase(); const count = Number(quiz.questions || quiz.questionsData?.length || 0); return (!term || haystack.includes(term)) && (!search || haystack.includes(search)) && (!category || quiz.category === category) && (!topic || quiz.topic === topic) && (!difficulties.length || difficulties.includes(quiz.difficulty)) && (!countsSelected.length || countsSelected.includes(count)); }); items.sort((a, b) => sort === 'questions' ? Number(b.questions || b.questionsData?.length || 0) - Number(a.questions || a.questionsData?.length || 0) : sort === 'difficulty' ? ['Beginner', 'Intermediate', 'Advanced'].indexOf(a.difficulty) - ['Beginner', 'Intermediate', 'Advanced'].indexOf(b.difficulty) : (b.attempts || 0) - (a.attempts || 0)); document.querySelector('#quiz-grid').innerHTML = items.length ? items.map(quizCard).join('') : '<div class="empty-state"><h3>No quizzes found</h3><p>Try another keyword or clear a filter.</p><button type="button" class="button button-secondary" id="empty-clear-filters">Clear filters</button></div>'; document.querySelector('#empty-clear-filters')?.addEventListener('click', clear); };
  const clear = () => { document.querySelector('#quiz-filter').value = ''; document.querySelector('#quiz-sort-search').value = ''; document.querySelector('#quiz-category').value = ''; document.querySelector('#quiz-topic').value = ''; document.querySelectorAll('#quiz-filters input[type="checkbox"]').forEach(input => { input.checked = false; }); draw(); };
  ['quiz-filter', 'quiz-sort-search', 'quiz-category', 'quiz-topic', 'quiz-sort'].forEach(id => document.querySelector(`#${id}`).addEventListener('input', draw));
  document.querySelectorAll('#quiz-filters input[type="checkbox"]').forEach(input => input.addEventListener('change', draw));
  document.querySelector('#clear-quiz-filters').addEventListener('click', clear);
  document.querySelector('#open-quiz-filters').addEventListener('click', () => { filterSidebar.classList.add('open'); document.body.classList.add('drawer-open'); });
  document.querySelector('#close-quiz-filters').addEventListener('click', () => { filterSidebar.classList.remove('open'); document.body.classList.remove('drawer-open'); });
  draw();
}

renderPosts = renderPostsEnhanced;
renderQuizzes = renderQuizzesEnhanced;

function printDocument(title) {
  const previousTitle = document.title;
  document.title = title;
  document.body.classList.add('printing');
  window.print();
  window.setTimeout(() => { document.title = previousTitle; document.body.classList.remove('printing'); }, 500);
}

async function renderPostEnhanced() {
  const posts = await getPosts();
  const post = posts.find(item => item.id === params.get('id'));
  if (!post) return renderNotFound('That study note does not exist.');
  let content = '<div class="error-box">Unable to load study content. Please refresh the page.</div>';
  try { const response = await fetch(post.contentFile); if (response.ok) content = await response.text(); } catch (error) { content = '<div class="error-box">Unable to load study content.</div>'; }
  const related = posts.filter(item => item.id !== post.id && item.category === post.category).slice(0, 2);
  trackArticleOpen(post.id, post.category, post.topic).catch(() => {});
  const bookmarked = JSON.parse(localStorage.getItem('studyNotesBookmarks') || '[]').includes(post.id);
  app.innerHTML = `<div class="article-layout"><aside class="toc"><strong>On this page</strong><a href="#article">Article</a><a href="#takeaways">Key takeaways</a><a href="#related">Related notes</a></aside><article class="article print-note" id="article"><div class="print-brand">STUDYNOTES</div><div class="eyebrow">${esc(post.category)} · ${esc(post.difficulty)}</div><h1>${esc(post.title)}</h1><p class="lede">${esc(post.description)}</p><div class="meta-row article-meta"><span>${date(post.publishedDate)}</span><span>${esc(post.readingTime)} read</span><span>${fmt(post.views)} views</span></div><div class="note-actions"><button type="button" class="button button-secondary" id="bookmark-note">${bookmarked ? '★ Bookmarked' : '☆ Bookmark'}</button><button type="button" class="button button-secondary" id="export-note">Export PDF</button><button type="button" class="button button-secondary" id="share-note">Share</button></div><div class="reading-progress" aria-label="Reading progress"><span></span></div><div class="article-body">${content}</div><div id="takeaways" class="tip-box"><strong>Key takeaways</strong><p>Practice the idea while it is still warm, then test yourself with a related quiz.</p></div><section id="related" class="section"><div class="section-heading"><h2>Related notes</h2></div><div class="grid grid-2">${related.map(noteCard).join('')}</div></section><footer class="print-footer">StudyNotes | Learn. Practice. Prepare.</footer></article></div>`;
  document.querySelector('#export-note').addEventListener('click', () => { printDocument(`StudyNotes_${post.title.replace(/[^a-z0-9]+/gi, '-')}`); showToast('Print dialog opened. Choose Save as PDF to export your note.', 'success'); });
  document.querySelector('#share-note').addEventListener('click', async () => { try { await navigator.clipboard.writeText(location.href); showToast('Note link copied.', 'success'); } catch (error) { showToast('Copy is unavailable. Share the page URL from your browser.', 'info'); } });
    document.querySelector('#bookmark-note').addEventListener('click', event => { const bookmarks = JSON.parse(localStorage.getItem('studyNotesBookmarks') || '[]'); const active = bookmarks.includes(post.id); const next = active ? bookmarks.filter(id => id !== post.id) : [...bookmarks, post.id]; localStorage.setItem('studyNotesBookmarks', JSON.stringify(next)); event.target.textContent = next.includes(post.id) ? '★ Bookmarked' : '☆ Bookmark'; saveBookmark({ id: post.id, title: post.title, url: `post.html?id=${encodeURIComponent(post.id)}` }, active).catch(() => {}); showToast(next.includes(post.id) ? 'Note bookmarked.' : 'Bookmark removed.', 'success'); });
  window.addEventListener('scroll', () => { const progress = document.querySelector('.reading-progress span'); if (!progress) return; const max = document.documentElement.scrollHeight - window.innerHeight; const percent = max > 0 ? Math.round((window.scrollY / max) * 100) : 0; progress.style.width = `${percent}%`; saveArticleProgress(post.id, percent).catch(() => {}); }, { passive: true });
}

async function renderResultEnhanced() {
  const result = JSON.parse(sessionStorage.getItem('studyNotesLastResult') || 'null');
  const quizzes = await getQuizzes();
  const quiz = result && quizzes.find(item => item.id === result.quizId);
  if (!result || !quiz) return renderNotFound('Complete a quiz to see its result.');
  const questions = Array.isArray(quiz.questionsData) ? quiz.questionsData : [];
  const percent = Math.round((result.correct / result.total) * 100);
  const skipped = result.answers.filter(answer => answer === null).length;
  const score = getScores()[quiz.id] || { bestScore: result.correct, bestTotal: result.total, attempts: 1 };
  app.innerHTML = `<div class="quiz-shell print-result"><div class="card result-score"><div class="print-brand">STUDYNOTES</div><div class="eyebrow">${percent >= quiz.passingScore ? 'PASSED' : 'KEEP PRACTICING'}</div><h1>Quiz Result</h1><h2>${esc(quiz.title)}</h2><div class="score-number">${result.correct}/${result.total}</div><p class="lede">${percent}% · ${quiz.category} · ${quiz.difficulty}</p><div class="stat-grid result-grid"><div class="stat-box"><span>Correct</span><strong>${result.correct}</strong></div><div class="stat-box"><span>Incorrect</span><strong>${result.total - result.correct - skipped}</strong></div><div class="stat-box"><span>Skipped</span><strong>${skipped}</strong></div><div class="stat-box"><span>Best score</span><strong>${score.bestScore}/${score.bestTotal}</strong></div><div class="stat-box"><span>Time taken</span><strong>${Math.floor((result.timeTaken || 0) / 60)}:${String((result.timeTaken || 0) % 60).padStart(2, '0')}</strong></div></div><div class="hero-actions result-actions"><button type="button" class="button button-primary" id="export-result">Export Quiz Result</button><a href="quiz.html?id=${encodeURIComponent(quiz.id)}" class="button button-secondary">Retry Quiz</a><a href="quizzes.html" class="button button-secondary">Back to Quizzes</a></div></div><section class="section review-panel"><div class="section-heading"><h2>Question review</h2></div>${questions.map((item, index) => { const answer = result.answers[index]; const correct = answer === item.answer; const skippedAnswer = answer === null; return `<article class="card review-item ${skippedAnswer ? 'unanswered' : correct ? 'correct' : 'incorrect'}"><div class="question-number">Question ${index + 1} · ${skippedAnswer ? 'Skipped' : correct ? 'Correct' : 'Incorrect'}</div><h3>${esc(item.question)}</h3><p><strong>Your answer:</strong> ${skippedAnswer ? 'Not answered' : esc(item.options[answer])}</p><p><strong>Correct answer:</strong> ${esc(item.options[item.answer])}</p><p><strong>Explanation:</strong> ${esc(item.explanation || 'Review the related StudyNote for more detail.')}</p></article>`; }).join('')}</section><footer class="print-footer">StudyNotes | Learn. Practice. Prepare.</footer></div>`;
  document.querySelector('#export-result').addEventListener('click', () => { printDocument(`StudyNotes_${quiz.title.replace(/[^a-z0-9]+/gi, '-')}_Result_${new Date().toISOString().slice(0, 10)}`); showToast('Print dialog opened. Choose Save as PDF to export your result.', 'success'); });
}

renderPost = renderPostEnhanced;
renderResult = renderResultEnhanced;

async function render() { try { const site = await getSite(); renderShell(site); const pages = {home:renderHome,posts:renderPosts,post:renderPost,categories:renderCategories,category:renderCategory,topic:renderTopic,quizzes:renderQuizzes,quiz:renderQuiz,result:renderResult,roadmap:renderRoadmap,resources:renderResources,resource:renderResource,search:renderSearch,about:renderAbout,'404':() => renderNotFound()}; await (pages[page] || pages['404'])(); setupAssistant(); } catch (error) { console.error(error); renderShell({name:'StudyNotes'}); app.innerHTML = '<div class="error-box">Unable to load StudyNotes right now. Please refresh the page.</div>'; setupAssistant(); } }
render();
