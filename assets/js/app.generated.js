import { getCategories, getPosts, getQuizzes, getResources, getSite, getTopics } from './data.js';
import { getScores, saveScore } from './storage.js';
import { initTheme } from './theme.js';
import { setupNavigation } from './navigation.js';

const app = document.querySelector('#app');
const page = document.body.dataset.page;
const params = new URLSearchParams(location.search);

const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#039;'
}[char]));

const fmt = value => new Intl.NumberFormat('en-US', {
  notation: value > 999 ? 'compact' : 'standard',
  maximumFractionDigits: 1,
}).format(value);

const date = value => new Date(`${value}T00:00:00`).toLocaleDateString('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

const button = (label, href, className = 'primary') => `<a class="button ${className}" href="${href}">${label}</a>`;

function renderShell(site) {
  const links = [
    ['index.html', 'Home', 'home'],
    ['study-notes.html', 'Study Notes', 'posts'],
    ['quizzes.html', 'Quizzes', 'quizzes'],
    ['categories.html', 'Categories', 'categories'],
    ['resources.html', 'Resources', 'resources'],
    ['search.html', 'Search', 'search'],
    ['about.html', 'About', 'about'],
  ];

  document.querySelector('#site-header').innerHTML = `
    <header class="site-header">
      <div class="top-header">
        <div class="header-inner">
          <button class="menu-toggle" type="button" aria-label="Toggle navigation" aria-expanded="false">☰</button>
          <a class="brand" href="index.html" aria-label="StudyNotes home">
            <span class="brand-mark">SN</span>
            <span>StudyNotes</span>
          </a>
          <nav class="nav-links" aria-label="Primary navigation">
            ${links.map(([href, label, id]) => `<a href="${href}" ${page === id ? 'aria-current="page"' : ''}>${label}</a>`).join('')}
          </nav>
          <div class="header-actions">
            <a href="search.html" class="header-search" aria-label="Search the portal">Search</a>
            <button type="button" class="theme-toggle" aria-label="Toggle theme">☀</button>
          </div>
        </div>
      </div>
      <div class="category-bar">
        <div class="category-bar-inner">
          ${['SQL', 'PostgreSQL', 'Python', 'PySpark', 'Databricks', 'Azure', 'Data Engineering', 'ETL', 'System Design', 'Interview Questions'].map(item => `<a href="search.html?q=${encodeURIComponent(item)}" class="category-pill">${esc(item)}</a>`).join('')}
        </div>
      </div>
    </header>
  `;

  document.querySelector('#site-footer').innerHTML = `
    <footer class="footer">
      <div class="footer-inner">
        <div>
          <strong>StudyNotes</strong>
          <div>Learn. Practice. Prepare.</div>
        </div>
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

  initTheme();
  setupNavigation();
}

function noteCard(post) {
  return `
    <article class="card post-card">
      <div class="card-top">
        <span class="badge">${esc(post.category)}</span>
        <span class="badge subtle ${post.difficulty === 'Advanced' ? 'danger' : ''}">${esc(post.difficulty)}</span>
      </div>
      <h3>${esc(post.title)}</h3>
      <p>${esc(post.description)}</p>
      <div class="meta-row">
        <span>${esc(post.readingTime)}</span>
        <span>${fmt(post.views)} views</span>
      </div>
      <div class="tag-list">${(post.tags || []).slice(0, 3).map(tag => `<span class="tag">${esc(tag)}</span>`).join('')}</div>
      <div class="card-actions">
        <a class="button primary" href="post.html?id=${encodeURIComponent(post.id)}">Read note</a>
      </div>
    </article>
  `;
}

function quizCard(quiz) {
  const score = getScores()[quiz.id];
  const bestLabel = score ? `Best ${score.bestScore}/${score.bestTotal}` : 'New quiz';
  return `
    <article class="card quiz-card">
      <div class="card-top">
        <span class="badge">${esc(quiz.category)}</span>
        <span class="badge subtle ${quiz.difficulty === 'Advanced' ? 'danger' : ''}">${esc(quiz.difficulty)}</span>
      </div>
      <h3>${esc(quiz.title)}</h3>
      <p>${esc(quiz.description || 'Practice this topic with a structured set of multiple-choice questions.')}</p>
      <div class="meta-row">
        <span>${fmt(quiz.questionCount || quiz.questions || 0)} questions</span>
        <span>${(quiz.timeLimit || 0)} min</span>
      </div>
      <div class="meta-row details-row">
        <span>Pass: ${quiz.passingScore || 60}%</span>
        <span>${fmt(quiz.attempts || 0)} attempts</span>
      </div>
      <div class="meta-row details-row">
        <span>${bestLabel}</span>
      </div>
      <div class="card-actions">
        <a class="button primary" href="quiz.html?id=${encodeURIComponent(quiz.id)}">Start quiz</a>
      </div>
    </article>
  `;
}

function categoryCard(category) {
  return `
    <article class="card category-card">
      <div class="card-top">
        <span class="badge">${fmt(category.topics || 0)} topics</span>
        <span class="badge subtle">${fmt(category.quizzes || 0)} quizzes</span>
      </div>
      <h3>${esc(category.name)}</h3>
      <p>${esc(category.description)}</p>
      <a class="text-link" href="category.html?id=${encodeURIComponent(category.id)}">Explore category →</a>
    </article>
  `;
}

function resourceCard(item) {
  return `
    <article class="card resource-card">
      <div class="card-top">
        <span class="badge">${esc(item.type)}</span>
        <span class="badge subtle">${esc(item.access || 'Free')}</span>
      </div>
      <h3>${esc(item.title)}</h3>
      <p>${esc(item.description)}</p>
      <div class="meta-row">
        <span>${esc(item.category)}</span>
        <span>${esc(item.fileSize || 'N/A')}</span>
      </div>
      <div class="card-actions split-actions">
        <a href="resource.html?id=${encodeURIComponent(item.id)}" class="button secondary">Preview</a>
        <a href="${item.file || '#'}" class="button primary" target="_blank" rel="noreferrer">Download</a>
      </div>
    </article>
  `;
}

async function renderHome() {
  const [site, categories, posts, quizzes, resources] = await Promise.all([getSite(), getCategories(), getPosts(), getQuizzes(), getResources()]);
  const latest = [...posts].sort((a, b) => new Date(b.publishedDate) - new Date(a.publishedDate)).slice(0, 3);
  const popular = [...quizzes].sort((a, b) => (b.attempts || 0) - (a.attempts || 0)).slice(0, 3);

  app.innerHTML = `
    <section class="hero section-spacing">
      <div class="hero-copy">
        <div class="eyebrow">Learn. Practice. Prepare.</div>
        <h1>${esc(site.tagline || 'Learn Data Engineering.')}</h1>
        <p class="lede">${esc(site.description || 'Technical study notes, MCQ practice and interview preparation for data and software engineering roles.')}</p>
        <div class="hero-actions">
          <a href="study-notes.html" class="button primary">Explore Study Notes</a>
          <a href="quizzes.html" class="button secondary">Practice Quizzes</a>
        </div>
      </div>
      <div class="hero-art" aria-hidden="true">
        <div class="hero-shell">
          <div class="hero-header"><span>Study Notes</span><span>2026</span></div>
          <h3>Build the habits that stick.</h3>
          <div class="hero-lines"><span></span><span></span><span></span><span></span></div>
        </div>
      </div>
    </section>

    <section class="search-panel section-spacing">
      <div class="search-bar" role="search">
        <input id="home-search" type="search" placeholder="Search SQL, Python, PySpark, Databricks..." aria-label="Search all content">
        <button id="home-search-button" type="button">Search</button>
      </div>
    </section>

    <section class="section-spacing">
      <div class="section-heading">
        <div>
          <div class="eyebrow">Popular tracks</div>
          <h2>Study by category</h2>
        </div>
        <a href="categories.html" class="text-link">View all categories →</a>
      </div>
      <div class="grid grid-3">${categories.slice(0, 6).map(categoryCard).join('')}</div>
    </section>

    <section class="section-spacing">
      <div class="section-heading">
        <div>
          <div class="eyebrow">Fresh from the desk</div>
          <h2>Latest study notes</h2>
        </div>
        <a href="study-notes.html" class="text-link">All study notes →</a>
      </div>
      <div class="grid grid-3">${latest.map(noteCard).join('')}</div>
    </section>

    <section class="section-spacing">
      <div class="section-heading">
        <div>
          <div class="eyebrow">Practice</div>
          <h2>Popular quizzes</h2>
        </div>
        <a href="quizzes.html" class="text-link">All quizzes →</a>
      </div>
      <div class="grid grid-3">${popular.map(quizCard).join('')}</div>
    </section>

    <section class="section-spacing">
      <div class="section-heading">
        <div>
          <div class="eyebrow">Interview prep</div>
          <h2>Resources and revision</h2>
        </div>
        <a href="resources.html" class="text-link">Browse resources →</a>
      </div>
      <div class="grid grid-3">${resources.slice(0, 3).map(resourceCard).join('')}</div>
    </section>
  `;

  const input = document.querySelector('#home-search');
  const buttonEl = document.querySelector('#home-search-button');
  const trigger = () => {
    const value = input.value.trim();
    if (value) window.location.href = `search.html?q=${encodeURIComponent(value)}`;
  };
  buttonEl?.addEventListener('click', trigger);
  input?.addEventListener('keydown', event => {
    if (event.key === 'Enter') trigger();
  });
}

async function renderPosts() {
  const posts = await getPosts();
  app.innerHTML = `
    <div class="page-intro section-spacing">
      <div class="eyebrow">Study notes</div>
      <h1>Structured notes for technical learning.</h1>
      <p class="lede">Clear explanations, practical examples and focused revision for SQL, Python, PySpark, cloud platforms and beyond.</p>
    </div>
    <div class="filter-panel">
      <input id="post-search" type="search" placeholder="Search study notes..." aria-label="Search study notes">
      <select id="post-category" aria-label="Filter by category">
        <option value="">All categories</option>
        ${[...new Set(posts.map(item => item.category))].sort().map(category => `<option value="${esc(category)}">${esc(category)}</option>`).join('')}
      </select>
      <select id="post-difficulty" aria-label="Filter by difficulty">
        <option value="">All difficulty levels</option>
        <option value="Beginner">Beginner</option>
        <option value="Intermediate">Intermediate</option>
        <option value="Advanced">Advanced</option>
      </select>
      <select id="post-sort" aria-label="Sort notes">
        <option value="latest">Latest</option>
        <option value="views">Most viewed</option>
      </select>
    </div>
    <div id="post-grid" class="grid grid-3"></div>
  `;

  const applyFilters = () => {
    const query = document.querySelector('#post-search').value.toLowerCase();
    const category = document.querySelector('#post-category').value;
    const difficulty = document.querySelector('#post-difficulty').value;
    const sortValue = document.querySelector('#post-sort').value;

    let list = [...posts].filter(item => {
      const haystack = `${item.title} ${item.category} ${item.topic || ''} ${(item.tags || []).join(' ')}`.toLowerCase();
      return (!query || haystack.includes(query)) && (!category || item.category === category) && (!difficulty || item.difficulty === difficulty);
    });

    list = list.sort((a, b) => {
      if (sortValue === 'views') return (b.views || 0) - (a.views || 0);
      return new Date(b.publishedDate) - new Date(a.publishedDate);
    });

    const grid = document.querySelector('#post-grid');
    grid.innerHTML = list.length ? list.map(noteCard).join('') : '<div class="empty-state">No study notes match that search.</div>';
  };

  ['post-search', 'post-category', 'post-difficulty', 'post-sort'].forEach(id => {
    document.querySelector(`#${id}`)?.addEventListener('input', applyFilters);
    document.querySelector(`#${id}`)?.addEventListener('change', applyFilters);
  });
  applyFilters();
}

async function renderPost() {
  const posts = await getPosts();
  const post = posts.find(item => item.id === params.get('id'));
  if (!post) return renderNotFound('The study note you requested does not exist.');

  const related = posts.filter(item => item.id !== post.id && item.category === post.category).slice(0, 2);

  let content = '<div class="error-box">Unable to load study content. Please refresh the page.</div>';
  try {
    const response = await fetch(post.contentFile);
    if (response.ok) content = await response.text();
  } catch (error) {
    console.error(error);
  }

  app.innerHTML = `
    <div class="article-layout">
      <aside class="toc-panel">
        <h3>Topic navigation</h3>
        <div class="toc-links">
          <a href="#article">Article</a>
          <a href="#related">Related notes</a>
        </div>
      </aside>
      <article class="article-panel" id="article">
        <div class="eyebrow">${esc(post.category)} · ${esc(post.difficulty)}</div>
        <h1>${esc(post.title)}</h1>
        <p class="lede">${esc(post.description)}</p>
        <div class="meta-row article-meta">
          <span>${formatDate(post.publishedDate)}</span>
          <span>${esc(post.readingTime)}</span>
          <span>${fmt(post.views)} views</span>
        </div>
        <div class="tag-list article-tags">${(post.tags || []).map(tag => `<span class="tag">${esc(tag)}</span>`).join('')}</div>
        <div class="article-body">${content}</div>

        <section id="related" class="section-spacing">
          <div class="section-heading">
            <div>
              <div class="eyebrow">Continue learning</div>
              <h2>Related study notes</h2>
            </div>
          </div>
          <div class="grid grid-2">${related.length ? related.map(noteCard).join('') : '<div class="empty-state">No related notes yet.</div>'}</div>
        </section>
      </article>
    </div>
  `;
}

function formatDate(value) {
  return new Date(`${value}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

async function renderCategories() {
  const [categories, topics] = await Promise.all([getCategories(), getTopics()]);
  app.innerHTML = `
    <div class="page-intro section-spacing">
      <div class="eyebrow">Browse by domain</div>
      <h1>Categories</h1>
      <p class="lede">Move from fundamentals to applied technical depth through structured subject areas.</p>
    </div>
    <div class="grid grid-3">${categories.map(category => `
      <article class="card category-card">
        <div class="card-top">
          <span class="badge">${fmt(category.topics || 0)} topics</span>
          <span class="badge subtle">${fmt(category.quizzes || 0)} quizzes</span>
        </div>
        <h3>${esc(category.name)}</h3>
        <p>${esc(category.description)}</p>
        <div class="mini-list">
          ${topics.filter(topic => topic.category === category.id).slice(0, 6).map(topic => `<a href="topic.html?topic=${encodeURIComponent(topic.id)}">${esc(topic.name)}</a>`).join('') || '<span>No topics yet</span>'}
        </div>
        <div class="card-actions">
          <a href="category.html?id=${encodeURIComponent(category.id)}" class="button secondary">Explore</a>
        </div>
      </article>
    `).join('')}</div>
  `;
}

async function renderCategory() {
  const [categories, topics, posts, quizzes] = await Promise.all([getCategories(), getTopics(), getPosts(), getQuizzes()]);
  const category = categories.find(item => item.id === params.get('id'));
  if (!category) return renderNotFound('That category does not exist.');

  const categoryTopics = topics.filter(topic => topic.category === category.id);
  const categoryPosts = posts.filter(post => post.category === category.name || categoryTopics.some(topic => topic.name === post.topic));
  const categoryQuizzes = quizzes.filter(quiz => quiz.category === category.name);

  app.innerHTML = `
    <div class="page-intro section-spacing">
      <div class="eyebrow">Category</div>
      <h1>${esc(category.name)}</h1>
      <p class="lede">${esc(category.description)}</p>
    </div>
    <section class="section-spacing">
      <div class="section-heading"><div><div class="eyebrow">Topics</div><h2>Popular learning paths</h2></div></div>
      <div class="grid grid-3">
        ${categoryTopics.length ? categoryTopics.map(topic => `
          <article class="card topic-card">
            <div class="card-top">
              <span class="badge">${esc(topic.difficulty)}</span>
              <span class="badge subtle">${fmt(topic.notes || 0)} notes</span>
            </div>
            <h3>${esc(topic.name)}</h3>
            <p>${esc(topic.description)}</p>
            <div class="card-actions"><a href="topic.html?topic=${encodeURIComponent(topic.id)}" class="button primary">Open topic</a></div>
          </article>
        `).join('') : '<div class="empty-state">Topics will appear here soon.</div>'}
      </div>
    </section>
    <section class="section-spacing">
      <div class="section-heading"><div><div class="eyebrow">Study notes</div><h2>Articles in this category</h2></div></div>
      <div class="grid grid-3">${categoryPosts.length ? categoryPosts.slice(0, 6).map(noteCard).join('') : '<div class="empty-state">No notes in this category yet.</div>'}</div>
    </section>
    <section class="section-spacing">
      <div class="section-heading"><div><div class="eyebrow">Practice</div><h2>Quizzes in this category</h2></div></div>
      <div class="grid grid-3">${categoryQuizzes.length ? categoryQuizzes.slice(0, 6).map(quizCard).join('') : '<div class="empty-state">No quizzes here yet.</div>'}</div>
    </section>
  `;
}

async function renderTopic() {
  const [topics, posts, quizzes] = await Promise.all([getTopics(), getPosts(), getQuizzes()]);
  const topic = topics.find(item => item.id === params.get('topic'));
  if (!topic) return renderNotFound('That topic does not exist.');

  const topicPosts = posts.filter(post => post.topic === topic.name || post.category === topic.name);
  const topicQuizzes = quizzes.filter(quiz => quiz.topic === topic.name || quiz.category === topic.name);

  app.innerHTML = `
    <div class="page-intro section-spacing">
      <div class="eyebrow">Topic</div>
      <h1>${esc(topic.name)}</h1>
      <p class="lede">${esc(topic.description)}</p>
    </div>
    <section class="section-spacing">
      <div class="section-heading"><div><div class="eyebrow">Learning material</div><h2>Study notes</h2></div></div>
      <div class="grid grid-3">${topicPosts.length ? topicPosts.map(noteCard).join('') : '<div class="empty-state">More notes are coming soon.</div>'}</div>
    </section>
    <section class="section-spacing">
      <div class="section-heading"><div><div class="eyebrow">Practice</div><h2>Relevant quizzes</h2></div></div>
      <div class="grid grid-3">${topicQuizzes.length ? topicQuizzes.map(quizCard).join('') : '<div class="empty-state">No relevant quizzes yet.</div>'}</div>
    </section>
  `;
}

async function renderQuizzesPage() {
  const quizzes = await getQuizzes();
  const categories = [...new Set(quizzes.map(item => item.category))].sort();
  const topics = [...new Set(quizzes.map(item => item.topic))].sort();
  const questionCounts = [...new Set(quizzes.map(item => item.questionCount || item.questions || 0))].sort((a, b) => a - b);

  app.innerHTML = `
    <div class="page-intro section-spacing">
      <div class="eyebrow">MCQ practice</div>
      <h1>Quizzes</h1>
      <p class="lede">Choose a subject, answer carefully and review your reasoning after submission.</p>
    </div>
    <div class="filter-panel quiz-filters">
      <input id="quiz-search" type="search" placeholder="Search quizzes..." aria-label="Search quizzes">
      <select id="quiz-category" aria-label="Filter by category"><option value="">All categories</option>${categories.map(category => `<option value="${esc(category)}">${esc(category)}</option>`).join('')}</select>
      <select id="quiz-topic" aria-label="Filter by topic"><option value="">All topics</option>${topics.map(topic => `<option value="${esc(topic)}">${esc(topic)}</option>`).join('')}</select>
      <select id="quiz-difficulty" aria-label="Filter by difficulty"><option value="">All difficulty levels</option><option value="Beginner">Beginner</option><option value="Intermediate">Intermediate</option><option value="Advanced">Advanced</option></select>
      <select id="quiz-count" aria-label="Filter by question count"><option value="">All lengths</option>${questionCounts.map(size => `<option value="${size}">${size} Questions</option>`).join('')}</select>
      <select id="quiz-sort" aria-label="Sort quizzes"><option value="popular">Popular</option><option value="newest">Newest</option><option value="difficulty">Difficulty</option><option value="questions">Most questions</option></select>
    </div>
    <div id="quiz-grid" class="grid grid-3"></div>
  `;

  const render = () => {
    const query = document.querySelector('#quiz-search').value.toLowerCase();
    const category = document.querySelector('#quiz-category').value;
    const topic = document.querySelector('#quiz-topic').value;
    const difficulty = document.querySelector('#quiz-difficulty').value;
    const count = document.querySelector('#quiz-count').value;
    const sort = document.querySelector('#quiz-sort').value;

    let list = [...quizzes].filter(item => {
      const haystack = `${item.title} ${item.description || ''} ${item.category} ${item.topic} ${item.difficulty}`.toLowerCase();
      return (!query || haystack.includes(query)) && (!category || item.category === category) && (!topic || item.topic === topic) && (!difficulty || item.difficulty === difficulty) && (!count || (item.questionCount || item.questions || 0) === Number(count));
    });

    list.sort((a, b) => {
      if (sort === 'questions') return (b.questionCount || b.questions || 0) - (a.questionCount || a.questions || 0);
      if (sort === 'difficulty') return ['Beginner', 'Intermediate', 'Advanced'].indexOf(a.difficulty) - ['Beginner', 'Intermediate', 'Advanced'].indexOf(b.difficulty);
      if (sort === 'newest') return (b.createdAt || 0) - (a.createdAt || 0);
      return (b.attempts || 0) - (a.attempts || 0);
    });

    document.querySelector('#quiz-grid').innerHTML = list.length ? list.map(quizCard).join('') : '<div class="empty-state">No quizzes match that filter.</div>';
  };

  ['quiz-search', 'quiz-category', 'quiz-topic', 'quiz-difficulty', 'quiz-count', 'quiz-sort'].forEach(id => {
    document.querySelector(`#${id}`)?.addEventListener('input', render);
    document.querySelector(`#${id}`)?.addEventListener('change', render);
  });
  render();
}

async function getQuizData(quizId) {
  const metadata = await getQuizzes();
  const quiz = metadata.find(item => item.id === quizId);
  if (!quiz) return null;
  try {
    const response = await fetch(`./data/quizzes/${quizId}.json`);
    if (!response.ok) return quiz;
    const data = await response.json();
    return { ...quiz, ...data };
  } catch (error) {
    return quiz;
  }
}

async function renderQuiz() {
  const quizId = params.get('id');
  const quiz = await getQuizData(quizId);
  if (!quiz) return renderNotFound('That quiz does not exist.');

  app.innerHTML = `
    <div class="quiz-shell">
      <div class="card info-card">
        <div class="eyebrow">Quiz instructions</div>
        <h1>${esc(quiz.title)}</h1>
        <p class="lede">${esc(quiz.description || 'Practice with a focused set of technical questions and review the reasoning behind every answer.')}</p>
        <div class="stat-grid">
          <div class="stat-box"><span>Category</span><strong>${esc(quiz.category)}</strong></div>
          <div class="stat-box"><span>Difficulty</span><strong>${esc(quiz.difficulty)}</strong></div>
          <div class="stat-box"><span>Questions</span><strong>${fmt(quiz.questionCount || quiz.questions || 0)}</strong></div>
          <div class="stat-box"><span>Time</span><strong>${quiz.timeLimit || 0} min</strong></div>
          <div class="stat-box"><span>Passing</span><strong>${quiz.passingScore || 60}%</strong></div>
          <div class="stat-box"><span>Attempts</span><strong>${fmt(quiz.attempts || 0)}</strong></div>
        </div>
        <ul class="instruction-list">
          <li>Each question has one correct answer.</li>
          <li>Select the best option from the available choices.</li>
          <li>You may navigate backward and forward before submitting.</li>
          <li>Questions marked for review are highlighted in the navigator.</li>
          <li>The quiz is read-only and answers remain hidden until submission.</li>
        </ul>
        <div class="hero-actions">
          <button type="button" class="button primary" id="start-quiz">Start quiz</button>
          <a href="quizzes.html" class="button secondary">Back to quizzes</a>
        </div>
      </div>
    </div>
  `;

  document.querySelector('#start-quiz')?.addEventListener('click', () => startQuiz(quiz));
}

function startQuiz(quiz) {
  const questions = Array.isArray(quiz.questionsData) ? quiz.questionsData : [];
  if (!questions.length) {
    app.innerHTML = '<div class="empty-state">This quiz does not include any questions yet.</div>';
    return;
  }

  const state = {
    current: 0,
    answers: Array(questions.length).fill(null),
    review: new Set(),
    remaining: (quiz.timeLimit || 0) * 60,
    timerId: null,
  };

  const formatClock = seconds => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

  const finishQuiz = (autoSubmit = false) => {
    clearInterval(state.timerId);
    const correct = questions.reduce((total, item, index) => total + (state.answers[index] === item.answer ? 1 : 0), 0);
    const total = questions.length;
    const answered = state.answers.filter(answer => answer !== null).length;
    const reviewCount = state.review.size;
    const skipped = total - answered - reviewCount;
    const percent = Math.round((correct / total) * 100);

    const result = {
      quizId: quiz.id,
      title: quiz.title,
      total,
      correct,
      skipped,
      answered,
      review: reviewCount,
      percent,
      passed: percent >= (quiz.passingScore || 60),
      timeTaken: (quiz.timeLimit || 0) * 60 - state.remaining,
      answers: state.answers,
      autoSubmit,
      finishedAt: new Date().toISOString(),
    };

    saveScore(quiz.id, correct, total);
    sessionStorage.setItem('studyNotesLastResult', JSON.stringify(result));
    window.location.href = `quiz-result.html?id=${encodeURIComponent(quiz.id)}`;
  };

  const updateUI = () => {
    const question = questions[state.current];
    const answered = state.answers.filter(answer => answer !== null).length;
    const reviewCount = state.review.size;
    const unanswered = questions.length - answered - reviewCount;
    const progress = ((state.current + 1) / questions.length) * 100;

    app.innerHTML = `
      <div class="quiz-layout">
        <aside class="quiz-sidebar">
          <div class="panel-block">
            <div class="eyebrow">Progress</div>
            <div class="timer-box">${formatClock(state.remaining)}</div>
            <div class="status-grid">
              <div><span>Answered</span><strong>${answered}</strong></div>
              <div><span>Unanswered</span><strong>${unanswered}</strong></div>
              <div><span>Review</span><strong>${reviewCount}</strong></div>
            </div>
          </div>
          <div class="question-nav" aria-label="Question navigation">
            ${questions.map((_, index) => {
              const status = state.answers[index] !== null ? 'answered' : state.review.has(index) ? 'review' : '';
              const currentClass = index === state.current ? 'current' : '';
              return `<button type="button" class="question-dot ${status} ${currentClass}" data-index="${index}" aria-label="Go to question ${index + 1}">${index + 1}</button>`;
            }).join('')}
          </div>
        </aside>
        <section class="quiz-main">
          <div class="quiz-topbar">
            <div class="question-count">Question ${state.current + 1} of ${questions.length}</div>
            <div class="timer-pill">${formatClock(state.remaining)}</div>
          </div>
          <div class="progress-bar" aria-label="Quiz progress"><span style="width: ${progress}%"></span></div>
          <article class="card question-panel">
            <div class="question-number">Question ${state.current + 1}</div>
            <h2>${esc(question.question)}</h2>
            <div class="option-list">
              ${question.options.map((option, optionIndex) => {
                const checked = state.answers[state.current] === optionIndex;
                return `<label class="option-item ${checked ? 'selected' : ''}"><input type="radio" name="answer" value="${optionIndex}" ${checked ? 'checked' : ''}><span>${esc(option)}</span></label>`;
              }).join('')}
            </div>
          </article>
          <div class="quiz-controls">
            <button type="button" class="button secondary" id="prev-question">Previous</button>
            <button type="button" class="button secondary" id="mark-review">${state.review.has(state.current) ? 'Reviewing' : 'Mark for review'}</button>
            <button type="button" class="button secondary" id="clear-answer">Clear answer</button>
            <button type="button" class="button primary" id="next-question">${state.current === questions.length - 1 ? 'Submit quiz' : 'Next'}</button>
          </div>
        </section>
      </div>
    `;

    document.querySelectorAll('input[name="answer"]').forEach(input => {
      input.addEventListener('change', event => {
        state.answers[state.current] = Number(event.target.value);
        state.review.delete(state.current);
        updateUI();
      });
    });

    document.querySelectorAll('.question-dot').forEach(dot => {
      dot.addEventListener('click', () => {
        state.current = Number(dot.dataset.index);
        updateUI();
      });
    });

    document.querySelector('#prev-question')?.addEventListener('click', () => {
      if (state.current > 0) {
        state.current -= 1;
        updateUI();
      }
    });

    document.querySelector('#next-question')?.addEventListener('click', () => {
      if (state.current === questions.length - 1) {
        const confirmed = window.confirm('Are you sure you want to submit?');
        if (confirmed) finishQuiz(false);
        return;
      }
      state.current += 1;
      updateUI();
    });

    document.querySelector('#mark-review')?.addEventListener('click', () => {
      if (state.review.has(state.current)) {
        state.review.delete(state.current);
      } else {
        state.review.add(state.current);
      }
      updateUI();
    });

    document.querySelector('#clear-answer')?.addEventListener('click', () => {
      state.answers[state.current] = null;
      state.review.delete(state.current);
      updateUI();
    });
  };

  state.timerId = window.setInterval(() => {
    state.remaining -= 1;
    if (state.remaining <= 0) {
      clearInterval(state.timerId);
      finishQuiz(true);
      return;
    }
    updateUI();
  }, 1000);

  updateUI();
}

function renderQuizResult() {
  const data = JSON.parse(sessionStorage.getItem('studyNotesLastResult') || 'null');
  if (!data) return renderNotFound('Complete a quiz to see its result.');

  getQuizData(data.quizId).then(quiz => {
    if (!quiz) return renderNotFound('That quiz result is no longer available.');

    const questions = Array.isArray(quiz.questionsData) ? quiz.questionsData : [];
    const scoreData = getScores()[quiz.id];
    const percent = Math.round((data.correct / data.total) * 100);
    const status = percent >= (quiz.passingScore || 60) ? 'PASSED' : 'KEEP PRACTICING';
    const skipped = data.skipped ?? data.total - data.answers.filter(Boolean).length;

    app.innerHTML = `
      <div class="quiz-shell">
        <div class="card result-card">
          <div class="eyebrow">${status}</div>
          <h1>Quiz completed</h1>
          <div class="score-number">${percent}%</div>
          <p class="lede">${data.correct} / ${data.total} correct · ${data.total - data.correct} incorrect · ${skipped} skipped</p>
          <div class="stat-grid result-grid">
            <div class="stat-box"><span>Correct</span><strong>${data.correct}</strong></div>
            <div class="stat-box"><span>Incorrect</span><strong>${data.total - data.correct - skipped}</strong></div>
            <div class="stat-box"><span>Skipped</span><strong>${skipped}</strong></div>
            <div class="stat-box"><span>Time taken</span><strong>${Math.floor(data.timeTaken / 60)}:${String(data.timeTaken % 60).padStart(2, '0')}</strong></div>
          </div>
          <div class="best-score">Your best score: ${scoreData ? `${scoreData.bestScore}/${scoreData.bestTotal} · ${scoreData.bestPercentage}%` : `0/${data.total}`}</div>
          <div class="hero-actions result-actions">
            <button type="button" class="button primary" id="review-answers">Review answers</button>
            <a href="quiz.html?id=${encodeURIComponent(quiz.id)}" class="button secondary">Retry quiz</a>
            <a href="quizzes.html" class="button secondary">Back to quizzes</a>
          </div>
        </div>

        <section class="section-spacing review-panel">
          <div class="section-heading"><div><div class="eyebrow">Answer review</div><h2>Detailed review</h2></div></div>
          <div class="review-list">
            ${questions.map((item, index) => {
              const selected = data.answers[index];
              const isCorrect = selected === item.answer;
              const isSkipped = selected === null;
              const className = isSkipped ? 'skipped' : isCorrect ? 'correct' : 'incorrect';
              const userAnswer = selected === null ? 'Skipped' : item.options[selected];
              return `<article class="card review-item ${className}"><div class="question-number">Question ${index + 1}</div><h3>${esc(item.question)}</h3><p><strong>Your answer:</strong> ${esc(userAnswer)}</p><p><strong>Correct answer:</strong> ${esc(item.options[item.answer])}</p><p><strong>Explanation:</strong> ${esc(item.explanation)}</p></article>`;
            }).join('')}
          </div>
        </section>
      </div>
    `;

    document.querySelector('#review-answers')?.addEventListener('click', () => {
      document.querySelector('.review-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

function renderResources() {
  getResources().then(resources => {
    app.innerHTML = `
      <div class="page-intro section-spacing">
        <div class="eyebrow">Resources</div>
        <h1>Reference material and study guides.</h1>
        <p class="lede">Useful revision pages, cheat sheets and technical references across SQL, Python, Azure and data engineering.</p>
      </div>
      <div class="grid grid-3">${resources.map(resourceCard).join('')}</div>
    `;
  });
}

function renderResource() {
  const id = params.get('id');
  getResources().then(resources => {
    const item = resources.find(resource => resource.id === id);
    if (!item) return renderNotFound('That resource was not found.');

    app.innerHTML = `
      <div class="quiz-shell">
        <div class="card info-card">
          <div class="eyebrow">${esc(item.category)} · ${esc(item.type)}</div>
          <h1>${esc(item.title)}</h1>
          <p class="lede">${esc(item.description)}</p>
          <div class="stat-grid">
            <div class="stat-box"><span>Pages</span><strong>${item.pages || 0}</strong></div>
            <div class="stat-box"><span>Size</span><strong>${esc(item.fileSize || 'N/A')}</strong></div>
            <div class="stat-box"><span>Access</span><strong>${esc(item.access || 'Free')}</strong></div>
          </div>
          <div class="hero-actions result-actions">
            <a href="${item.file || '#'}" class="button primary" target="_blank" rel="noreferrer">Preview</a>
            <a href="${item.file || '#'}" class="button secondary" download>Download</a>
            <a href="resources.html" class="button secondary">Back to resources</a>
          </div>
        </div>
      </div>
    `;
  });
}

function renderSearch() {
  Promise.all([getPosts(), getTopics(), getCategories(), getQuizzes(), getResources()]).then(([posts, topics, categories, quizzes, resources]) => {
    const query = (params.get('q') || '').trim();
    app.innerHTML = `
      <div class="page-intro section-spacing">
        <div class="eyebrow">Search</div>
        <h1>Search StudyNotes</h1>
        <div class="search-bar">
          <input id="global-search" type="search" value="${esc(query)}" placeholder="Search notes, topics, quizzes and resources..." aria-label="Search all content">
          <button id="global-search-button" type="button">Search</button>
        </div>
      </div>
      <div id="search-results"></div>
    `;

    const updateResults = () => {
      const term = document.querySelector('#global-search').value.trim().toLowerCase();
      if (!term) {
        document.querySelector('#search-results').innerHTML = '<div class="empty-state">Start typing to search across the portal.</div>';
        return;
      }

      const matches = item => `${item.title || ''} ${item.name || ''} ${item.description || ''} ${item.category || ''} ${item.topic || ''} ${(item.tags || []).join(' ')}`.toLowerCase().includes(term);

      const noteResults = posts.filter(matches).map(noteCard);
      const topicResults = topics.filter(matches).map(topic => `
        <article class="card">
          <div class="card-top"><span class="badge">Topic</span></div>
          <h3>${esc(topic.name)}</h3>
          <p>${esc(topic.description)}</p>
          <a class="text-link" href="topic.html?topic=${encodeURIComponent(topic.id)}">Open topic →</a>
        </article>
      `);
      const categoryResults = categories.filter(matches).map(categoryCard);
      const quizResults = quizzes.filter(matches).map(quizCard);
      const resourceResults = resources.filter(matches).map(resourceCard);

      const groups = [
        ['Study Notes', noteResults],
        ['Topics', topicResults],
        ['Categories', categoryResults],
        ['Quizzes', quizResults],
        ['Resources', resourceResults],
      ].filter(([, items]) => items.length);

      document.querySelector('#search-results').innerHTML = groups.length ? groups.map(([label, items]) => `
        <section class="section-spacing">
          <div class="section-heading"><div><div class="eyebrow">Results</div><h2>${label}</h2></div></div>
          <div class="grid grid-3">${items.join('')}</div>
        </section>
      `).join('') : '<div class="empty-state">No results found. Try a broader search term.</div>';
    };

    updateResults();
    document.querySelector('#global-search-button')?.addEventListener('click', updateResults);
    document.querySelector('#global-search')?.addEventListener('input', updateResults);
  });
}

function renderAbout() {
  app.innerHTML = `
    <div class="page-intro section-spacing">
      <div class="eyebrow">About</div>
      <h1>About StudyNotes</h1>
      <p class="lede">StudyNotes is a practical learning platform focused on data engineering, SQL, Python, PySpark, Databricks, Azure and technical interview preparation.</p>
    </div>
    <div class="grid grid-2">
      <div class="card">
        <h2>Created by Ashish Zope</h2>
        <p>StudyNotes brings together practical technical study, quizzes and revision material in one place without making the experience feel like a generic portfolio.</p>
      </div>
      <div class="card">
        <h2>Focus areas</h2>
        <div class="tag-list">
          <span class="tag">SQL</span>
          <span class="tag">PostgreSQL</span>
          <span class="tag">Python</span>
          <span class="tag">PySpark</span>
          <span class="tag">Databricks</span>
          <span class="tag">Azure</span>
          <span class="tag">System Design</span>
        </div>
      </div>
    </div>
  `;
}

function renderNotFound(message = 'The page you are looking for is not here.') {
  app.innerHTML = `
    <div class="empty-state large-empty">
      <div class="eyebrow">404</div>
      <h1>Keep exploring.</h1>
      <p>${esc(message)}</p>
      <a href="index.html" class="button primary">Back home</a>
    </div>
  `;
}

async function render() {
  try {
    const site = await getSite();
    renderShell(site);
    const pages = {
      home: renderHome,
      posts: renderPosts,
      post: renderPost,
      categories: renderCategories,
      category: renderCategory,
      topic: renderTopic,
      quizzes: renderQuizzesPage,
      quiz: renderQuiz,
      result: renderQuizResult,
      resources: renderResources,
      resource: renderResource,
      search: renderSearch,
      about: renderAbout,
      '404': () => renderNotFound(),
    };
    await (pages[page] || pages['404'])();
  } catch (error) {
    console.error(error);
    app.innerHTML = '<div class="empty-state">Unable to load StudyNotes right now. Please refresh the page.</div>';
  }
}

render();
