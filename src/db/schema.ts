import { sql } from 'drizzle-orm';
import { index, integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

// All ids are UUID strings so an optional sync could be added later without
// rewriting keys. Timestamps are epoch milliseconds. Calendar dates are
// 'YYYY-MM-DD' strings in the user's local time.

const id = () => text('id').primaryKey();
const createdAt = () =>
  integer('created_at', { mode: 'number' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`);

export const domains = sqliteTable('domains', {
  id: id(),
  name: text('name').notNull(),
  /** A built-in key ('work' | 'study' | 'health' | 'life'), a custom key ('custom1'..'custom4'), or a #hex. */
  color: text('color').notNull(),
  icon: text('icon').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  isDefault: integer('is_default', { mode: 'boolean' }).notNull().default(false),
  /** Archived domains leave every picker and list; their history stays. They can be restored. */
  archived: integer('archived', { mode: 'boolean' }).notNull().default(false),
  createdAt: createdAt(),
});

export const tasks = sqliteTable(
  'tasks',
  {
    id: id(),
    title: text('title').notNull(),
    notes: text('notes'),
    domainId: text('domain_id')
      .notNull()
      .references(() => domains.id),
    energy: text('energy', { enum: ['high', 'medium', 'low'] })
      .notNull()
      .default('medium'),
    dueDate: text('due_date'),
    scheduledStart: integer('scheduled_start', { mode: 'number' }),
    estimateMin: integer('estimate_min'),
    status: text('status', { enum: ['todo', 'done', 'archived'] })
      .notNull()
      .default('todo'),
    completedAt: integer('completed_at', { mode: 'number' }),
    createdAt: createdAt(),
  },
  (t) => [index('tasks_status_due_idx').on(t.status, t.dueDate), index('tasks_domain_idx').on(t.domainId)],
);

export const habits = sqliteTable('habits', {
  id: id(),
  name: text('name').notNull(),
  domainId: text('domain_id')
    .notNull()
    .references(() => domains.id),
  type: text('type', { enum: ['check', 'count', 'duration'] })
    .notNull()
    .default('check'),
  target: real('target').notNull().default(1),
  unit: text('unit'),
  /** JSON array of weekday numbers 0 (Mon) to 6 (Sun). */
  schedule: text('schedule').notNull().default('[0,1,2,3,4,5,6]'),
  /** 'HH:mm' local time, or null for no reminder. */
  reminderTime: text('reminder_time'),
  archived: integer('archived', { mode: 'boolean' }).notNull().default(false),
  createdAt: createdAt(),
});

export const habitLogs = sqliteTable(
  'habit_logs',
  {
    id: id(),
    habitId: text('habit_id')
      .notNull()
      .references(() => habits.id, { onDelete: 'cascade' }),
    date: text('date').notNull(),
    value: real('value').notNull().default(1),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex('habit_logs_habit_date_uq').on(t.habitId, t.date)],
);

export const focusSessions = sqliteTable(
  'focus_sessions',
  {
    id: id(),
    taskId: text('task_id').references(() => tasks.id, { onDelete: 'set null' }),
    domainId: text('domain_id')
      .notNull()
      .references(() => domains.id),
    startedAt: integer('started_at', { mode: 'number' }).notNull(),
    endedAt: integer('ended_at', { mode: 'number' }),
    plannedMin: integer('planned_min').notNull(),
    kind: text('kind', { enum: ['focus', 'break'] })
      .notNull()
      .default('focus'),
    completed: integer('completed', { mode: 'boolean' }).notNull().default(false),
  },
  (t) => [index('focus_sessions_started_idx').on(t.startedAt)],
);

export const workoutTemplates = sqliteTable('workout_templates', {
  id: id(),
  name: text('name').notNull(),
  createdAt: createdAt(),
});

export const templateExercises = sqliteTable('template_exercises', {
  id: id(),
  templateId: text('template_id')
    .notNull()
    .references(() => workoutTemplates.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  sets: integer('sets').notNull().default(3),
  reps: integer('reps').notNull().default(10),
  weight: real('weight'),
  restSec: integer('rest_sec').notNull().default(90),
  sortOrder: integer('sort_order').notNull().default(0),
});

export const workoutSessions = sqliteTable(
  'workout_sessions',
  {
    id: id(),
    templateId: text('template_id').references(() => workoutTemplates.id, { onDelete: 'set null' }),
    name: text('name').notNull(),
    domainId: text('domain_id')
      .notNull()
      .references(() => domains.id),
    startedAt: integer('started_at', { mode: 'number' }).notNull(),
    endedAt: integer('ended_at', { mode: 'number' }),
  },
  (t) => [index('workout_sessions_started_idx').on(t.startedAt)],
);

export const workoutSets = sqliteTable('workout_sets', {
  id: id(),
  sessionId: text('session_id')
    .notNull()
    .references(() => workoutSessions.id, { onDelete: 'cascade' }),
  exerciseName: text('exercise_name').notNull(),
  /** Position of this exercise in the workout (0 first). Sets of one exercise share it. */
  exerciseOrder: integer('exercise_order').notNull().default(0),
  /** Rest after each set of this exercise, in seconds. */
  restSec: integer('rest_sec').notNull().default(90),
  setIndex: integer('set_index').notNull(),
  reps: integer('reps').notNull(),
  weight: real('weight'),
  done: integer('done', { mode: 'boolean' }).notNull().default(false),
});

export const notes = sqliteTable('notes', {
  id: id(),
  body: text('body').notNull(),
  domainId: text('domain_id').references(() => domains.id, { onDelete: 'set null' }),
  processed: integer('processed', { mode: 'boolean' }).notNull().default(false),
  convertedTaskId: text('converted_task_id').references(() => tasks.id, { onDelete: 'set null' }),
  createdAt: createdAt(),
});

/** Key/value store for preferences. `value` is JSON. */
export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

export type Domain = typeof domains.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type Habit = typeof habits.$inferSelect;
export type HabitLog = typeof habitLogs.$inferSelect;
export type FocusSession = typeof focusSessions.$inferSelect;
export type Note = typeof notes.$inferSelect;
