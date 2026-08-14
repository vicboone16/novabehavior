import { describe, it, expect } from 'vitest';
import { mergeDrafts, DraftSnapshot } from '@/lib/multiStudentDraftMerge';

const snap = (o: Partial<DraftSnapshot>): DraftSnapshot => ({
  chosenStudents: [],
  chosenBehaviors: {},
  configs: {},
  updatedAt: 0,
  ...o,
});

describe('mergeDrafts', () => {
  it('returns local when there is no server row', () => {
    const local = snap({ chosenStudents: ['s1'], updatedAt: 5 });
    expect(mergeDrafts(null, local, null)).toEqual(local);
  });

  it('unions additions from both sides', () => {
    const base = snap({ chosenStudents: ['s1'] });
    const local = snap({ chosenStudents: ['s1', 's2'], updatedAt: 2 });
    const server = snap({ chosenStudents: ['s1', 's3'], updatedAt: 1 });
    expect(mergeDrafts(base, local, server).chosenStudents.sort()).toEqual(['s1', 's2', 's3']);
  });

  it('honors a removal made on one side only', () => {
    const base = snap({ chosenStudents: ['s1', 's2'] });
    const local = snap({ chosenStudents: ['s1'], updatedAt: 2 });
    const server = snap({ chosenStudents: ['s1', 's2'], updatedAt: 1 });
    expect(mergeDrafts(base, local, server).chosenStudents).toEqual(['s1']);
  });

  it('merges per-student behavior lists', () => {
    const base = snap({ chosenStudents: ['s1'], chosenBehaviors: { s1: ['b1'] } });
    const local = snap({ chosenStudents: ['s1'], chosenBehaviors: { s1: ['b1', 'b2'] }, updatedAt: 2 });
    const server = snap({ chosenStudents: ['s1'], chosenBehaviors: { s1: ['b1', 'b3'] }, updatedAt: 1 });
    expect(mergeDrafts(base, local, server).chosenBehaviors.s1.sort()).toEqual(['b1', 'b2', 'b3']);
  });

  it('keeps the side that changed a config', () => {
    const base = snap({
      chosenStudents: ['s1'],
      chosenBehaviors: { s1: ['b1', 'b2'] },
      configs: { 's1::b1': { intervalSec: 10 }, 's1::b2': { intervalSec: 10 } },
    });
    const local = snap({
      ...base,
      configs: { 's1::b1': { intervalSec: 30 }, 's1::b2': { intervalSec: 10 } },
      updatedAt: 2,
    });
    const server = snap({
      ...base,
      configs: { 's1::b1': { intervalSec: 10 }, 's1::b2': { intervalSec: 60 } },
      updatedAt: 3,
    });
    const merged = mergeDrafts(base, local, server);
    expect(merged.configs['s1::b1']).toEqual({ intervalSec: 30 });
    expect(merged.configs['s1::b2']).toEqual({ intervalSec: 60 });
  });

  it('uses the newer snapshot when both sides changed the same config', () => {
    const base = snap({
      chosenStudents: ['s1'],
      chosenBehaviors: { s1: ['b1'] },
      configs: { 's1::b1': { intervalSec: 10 } },
    });
    const local = snap({ ...base, configs: { 's1::b1': { intervalSec: 20 } }, updatedAt: 1 });
    const server = snap({ ...base, configs: { 's1::b1': { intervalSec: 30 } }, updatedAt: 9 });
    expect(mergeDrafts(base, local, server).configs['s1::b1']).toEqual({ intervalSec: 30 });
  });

  it('drops configs for pairs removed by the merge', () => {
    const base = snap({ chosenStudents: ['s1', 's2'], chosenBehaviors: { s1: ['b1'], s2: ['b9'] }, configs: { 's1::b1': {}, 's2::b9': {} } });
    const local = snap({ chosenStudents: ['s1'], chosenBehaviors: { s1: ['b1'] }, configs: { 's1::b1': {} }, updatedAt: 2 });
    const server = snap({ ...base, updatedAt: 1 });
    const merged = mergeDrafts(base, local, server);
    expect(Object.keys(merged.configs)).toEqual(['s1::b1']);
  });
});
