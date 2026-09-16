import { applyTheme, getTheme, setTheme } from './storage.js';
export function initTheme() { applyTheme(); window.setTheme = setTheme; const select = document.querySelector('.theme-select'); if (select) select.value = getTheme(); }
