import { getCurrentUser, supabase } from './supabase.js';

const localHistoryKey = 'studyNotesArticleHistory';
const localProgressKey = 'studyNotesArticleProgress';
const readLocal = key => { try { return JSON.parse(localStorage.getItem(key) || '{}'); } catch { return {}; } };
const writeLocal = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Continue without local persistence. */ } };

export async function trackArticleOpen(articleId, technology, topic) {
  const local = readLocal(localHistoryKey);
  local[articleId] = { articleId, technology, topic, openedAt: new Date().toISOString() };
  writeLocal(localHistoryKey, local);
  const user = await getCurrentUser();
  if (!user || !supabase) return;
  const { error } = await supabase.from('article_read_history').insert({ user_id: user.id, article_id: articleId, technology, topic });
  if (error) console.warn('Unable to sync article history.', error);
}

export async function saveArticleProgress(articleId, progress) {
  const bounded = Math.max(0, Math.min(100, Math.round(progress)));
  const local = readLocal(localProgressKey);
  local[articleId] = { articleId, progressPercent: bounded, lastReadAt: new Date().toISOString(), completed: bounded >= 100 };
  writeLocal(localProgressKey, local);
  const user = await getCurrentUser();
  if (!user || !supabase) return;
  const now = new Date().toISOString();
  const { error } = await supabase.from('article_progress').upsert({ user_id: user.id, article_id: articleId, progress_percent: bounded, last_read_at: now, completed: bounded >= 100, completed_at: bounded >= 100 ? now : null }, { onConflict: 'user_id,article_id' });
  if (error) console.warn('Unable to sync article progress.', error);
}

export async function saveQuizAttempt(result, quiz) {
  const user = await getCurrentUser();
  if (!user || !supabase) return null;
  const { data, error } = await supabase.from('quiz_attempts').insert({ user_id: user.id, quiz_id: quiz.id, technology: quiz.category, topic: quiz.topic, quiz_mode: 'practice', question_count: result.total, score: result.correct, percentage: Math.round(result.correct / result.total * 100), correct_answers: result.correct, wrong_answers: result.total - result.correct - (result.skipped || 0), skipped_answers: result.skipped || 0, time_taken_seconds: result.timeTaken || 0, passed: result.correct / result.total * 100 >= (quiz.passingScore || 60), completed_at: new Date().toISOString() }).select().single();
  if (error) { console.warn('Unable to save quiz attempt.', error); return null; }
  const answers = result.answers.map((selected, index) => ({ attempt_id: data.id, user_id: user.id, question_id: String(index), selected_answer: selected === null ? null : String(selected), correct_answer: String(quiz.questionsData[index].answer), is_correct: selected === quiz.questionsData[index].answer }));
  const answerResult = await supabase.from('quiz_answers').insert(answers);
  if (answerResult.error) console.warn('Unable to save quiz answers.', answerResult.error);
  return data;
}

export async function saveBookmark(content, active) {
  const user = await getCurrentUser();
  if (!user || !supabase) return;
  if (active) {
    const { error } = await supabase.from('bookmarks').delete().eq('user_id', user.id).eq('content_id', content.id).eq('content_type', content.type || 'article');
    if (error) console.warn('Unable to remove bookmark.', error);
    return;
  }
  const { error } = await supabase.from('bookmarks').upsert({ user_id: user.id, content_id: content.id, content_type: content.type || 'article', title: content.title, url: content.url }, { onConflict: 'user_id,content_id,content_type' });
  if (error) console.warn('Unable to save bookmark.', error);
}
