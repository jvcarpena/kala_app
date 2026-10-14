import {
  type HistorySet,
  type NewSet,
  STARTER_TEMPLATES,
  buildSessionSets,
  describePerformance,
  doneCount,
  exerciseKey,
  extendRest,
  findPersonalRecords,
  formatDuration,
  formatElapsed,
  formatVolume,
  formatWeight,
  groupByExercise,
  lastPerformance,
  nudge,
  restElapsed,
  restEnded,
  restRemainingMs,
  startRest,
  volume,
} from '../logic';

const hist = (
  key: string,
  sessionId: string,
  endedAt: number,
  setIndex: number,
  reps: number,
  weight: number | null,
): HistorySet => ({ key, sessionId, endedAt, setIndex, reps, weight });

describe('exerciseKey', () => {
  it('ignores case, outer and repeated spaces', () => {
    expect(exerciseKey('  Bench   Press ')).toBe('bench press');
  });
});

describe('lastPerformance and describePerformance', () => {
  const history = [
    hist('bench press', 'old', 1000, 0, 8, 50),
    hist('bench press', 'new', 2000, 1, 8, 57.5),
    hist('bench press', 'new', 2000, 0, 8, 57.5),
    hist('squat', 'old', 1000, 0, 5, 80),
  ];

  it('finds the most recent session for the exercise, sets in order', () => {
    expect(lastPerformance('Bench Press', history)).toEqual({
      sessionId: 'new',
      endedAt: 2000,
      sets: [
        { reps: 8, weight: 57.5 },
        { reps: 8, weight: 57.5 },
      ],
    });
  });

  it('returns null for an exercise never done', () => {
    expect(lastPerformance('Deadlift', history)).toBeNull();
  });

  it('describes identical sets compactly and mixed sets by the top one', () => {
    const four = { reps: 8, weight: 57.5 };
    expect(describePerformance({ sessionId: 's', endedAt: 1, sets: [four, four, four, four] })).toBe('4 × 8 @ 57.5 kg');
    expect(
      describePerformance({
        sessionId: 's',
        endedAt: 1,
        sets: [
          { reps: 8, weight: 60 },
          { reps: 6, weight: 65 },
        ],
      }),
    ).toBe('2 sets, top 6 @ 65 kg');
    const bw = { reps: 12, weight: null };
    expect(describePerformance({ sessionId: 's', endedAt: 1, sets: [bw, bw] })).toBe('2 × 12');
  });
});

describe('buildSessionSets', () => {
  const template = [
    { name: 'Bench press', sets: 3, reps: 8, weight: 40, restSec: 120 },
    { name: 'Pull-up', sets: 2, reps: 6, weight: null, restSec: 90 },
  ];

  it('uses the template when there is no history', () => {
    const sets = buildSessionSets(template, []);
    expect(sets).toHaveLength(5);
    expect(sets[0]).toEqual({ exerciseName: 'Bench press', exerciseOrder: 0, setIndex: 0, reps: 8, weight: 40, restSec: 120 });
    expect(sets[3]).toMatchObject({ exerciseName: 'Pull-up', exerciseOrder: 1, setIndex: 0, reps: 6, weight: null });
  });

  it('carries over what you did last time, set by set, falling back to your last set', () => {
    const history = [hist('bench press', 's1', 5, 0, 8, 50), hist('bench press', 's1', 5, 1, 7, 52.5)];
    const bench = buildSessionSets(template, history).filter((s) => s.exerciseName === 'Bench press');
    expect(bench.map((s) => [s.reps, s.weight])).toEqual([
      [8, 50],
      [7, 52.5],
      [7, 52.5], // the template has 3 sets but last time had 2
    ]);
  });

  it('always creates at least one set per exercise', () => {
    expect(buildSessionSets([{ name: 'Plank', sets: 0, reps: 1, weight: null, restSec: 30 }], [])).toHaveLength(1);
  });
});

describe('groupByExercise, volume and counts', () => {
  const sets = [
    { id: 'c', exerciseName: 'Row', exerciseOrder: 1, setIndex: 0, reps: 10, weight: 40, restSec: 60, done: true },
    { id: 'b', exerciseName: 'Bench', exerciseOrder: 0, setIndex: 1, reps: 8, weight: 60, restSec: 90, done: false },
    { id: 'a', exerciseName: 'Bench', exerciseOrder: 0, setIndex: 0, reps: 8, weight: 60, restSec: 90, done: true },
  ];

  it('groups in exercise order with sets in order', () => {
    const groups = groupByExercise(sets);
    expect(groups.map((g) => g.name)).toEqual(['Bench', 'Row']);
    expect(groups[0].sets.map((s) => s.id)).toEqual(['a', 'b']);
    expect(groups[0].restSec).toBe(90);
  });

  it('counts volume and sets from completed sets only, ignoring bodyweight in volume', () => {
    expect(volume(sets)).toBe(8 * 60 + 10 * 40);
    expect(doneCount(sets)).toBe(2);
    expect(volume([{ reps: 10, weight: null, done: true }])).toBe(0);
  });
});

describe('findPersonalRecords', () => {
  const past = [
    hist('bench press', 'old', 1, 0, 8, 60),
    hist('bench press', 'old', 1, 1, 8, 60),
    hist('pull-up', 'old', 1, 0, 8, null),
  ];
  const s = (name: string, order: number, reps: number, weight: number | null, done = true): NewSet & { done: boolean } => ({
    exerciseName: name,
    exerciseOrder: order,
    setIndex: 0,
    reps,
    weight,
    restSec: 90,
    done,
  });

  it('reports a heavier top set as a record', () => {
    expect(findPersonalRecords([s('Bench press', 0, 6, 62.5)], past)).toEqual([
      { exerciseName: 'Bench press', kind: 'weight', value: 62.5, previous: 60 },
    ]);
  });

  it('does not count ties, lighter sets or sets that were not completed', () => {
    expect(findPersonalRecords([s('Bench press', 0, 8, 60)], past)).toEqual([]);
    expect(findPersonalRecords([s('Bench press', 0, 8, 70, false)], past)).toEqual([]);
  });

  it('does not call the first time doing an exercise a record', () => {
    expect(findPersonalRecords([s('Deadlift', 0, 5, 100)], past)).toEqual([]);
  });

  it('compares reps for bodyweight exercises', () => {
    expect(findPersonalRecords([s('Pull-up', 0, 10, null)], past)).toEqual([
      { exerciseName: 'Pull-up', kind: 'reps', value: 10, previous: 8 },
    ]);
  });
});

describe('formatting', () => {
  it('formats weights, volume and durations', () => {
    expect(formatWeight(57.5)).toBe('57.5 kg');
    expect(formatWeight(60)).toBe('60 kg');
    expect(formatWeight(null)).toBe('Bodyweight');
    expect(formatVolume(3420)).toBe('3,420 kg');
    expect(formatVolume(980.4)).toBe('980 kg');
    expect(formatDuration(42 * 60_000)).toBe('42 min');
    expect(formatDuration(65 * 60_000)).toBe('1 h 05 min');
    expect(formatElapsed(65_000)).toBe('01:05');
    expect(formatElapsed(3_725_000)).toBe('1:02:05');
  });

  it('nudges values without going below zero or leaving float noise', () => {
    expect(nudge(60, 2.5)).toBe(62.5);
    expect(nudge(0.1, 0.2)).toBe(0.3);
    expect(nudge(1, -2.5)).toBe(0);
  });
});

describe('rest timer', () => {
  const T0 = 1_000_000;

  it('counts down and ends on time', () => {
    const r = startRest(90, T0);
    expect(restRemainingMs(r, T0 + 30_000)).toBe(60_000);
    expect(restEnded(r, T0 + 89_999)).toBe(false);
    expect(restEnded(r, T0 + 90_000)).toBe(true);
    expect(restRemainingMs(r, T0 + 999_999)).toBe(0);
  });

  it('can be extended and reports progress against the new total', () => {
    const r = extendRest(startRest(60, T0), 30);
    expect(r).toEqual({ endsAt: T0 + 90_000, totalSec: 90 });
    expect(restElapsed(r, T0 + 45_000)).toBeCloseTo(0.5);
    expect(restElapsed(r, T0 + 200_000)).toBe(1);
  });
});

describe('starter templates', () => {
  it('give a push, pull and legs split with sensible sets', () => {
    expect(STARTER_TEMPLATES.map((t) => t.name)).toEqual(['Push day', 'Pull day', 'Leg day']);
    for (const t of STARTER_TEMPLATES) {
      expect(t.exercises.length).toBeGreaterThanOrEqual(4);
      for (const e of t.exercises) {
        expect(e.sets).toBeGreaterThan(0);
        expect(e.reps).toBeGreaterThan(0);
        expect(e.weight).toBeNull();
      }
    }
  });
});
