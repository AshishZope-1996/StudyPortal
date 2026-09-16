const cache = new Map();
export async function load(name) {
  if (!cache.has(name)) {
    const response = await fetch(`data/${name}.json`);
    if (!response.ok) throw new Error(`Unable to load ${name}.json`);
    cache.set(name, await response.json());
  }
  return cache.get(name);
}
export const getPosts = () => load('posts');
export const getQuizzes = () => load('quizzes');
export const getCategories = () => load('categories');
export const getTopics = () => load('topics');
export const getResources = () => load('resources');
export const getSite = () => load('site');
