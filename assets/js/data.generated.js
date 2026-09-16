const cache = new Map();

async function loadJson(name) {
  const key = String(name);
  if (!cache.has(key)) {
    const response = await fetch(`./data/${key}.json`, { cache: 'force-cache' });
    if (!response.ok) throw new Error(`Unable to load ${key}.json`);
    cache.set(key, await response.json());
  }
  return cache.get(key);
}

export const getPosts = () => loadJson('posts');
export const getQuizzes = () => loadJson('quizzes');
export const getCategories = () => loadJson('categories');
export const getTopics = () => loadJson('topics');
export const getResources = () => loadJson('resources');
export const getSite = () => loadJson('site');
