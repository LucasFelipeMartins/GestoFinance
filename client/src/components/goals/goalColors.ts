/**
 * Metas use the app's own accent rather than one of the three ledger hues —
 * verde, vermelho and azul mean receita, despesa and investimento everywhere
 * else, and a meta is none of those. Reusing one of them here would make the
 * colours stop meaning anything specific.
 *
 * Expressed through the theme variables so they follow light/dark.
 */
export const GOAL_ACCENT = 'rgb(var(--c-sage))';
export const GOAL_DONE = 'var(--goal-done)';
export const GOAL_OVERDUE = 'rgb(var(--c-danger))';
export const GOAL_MUTED = 'rgb(var(--c-text-secondary))';
