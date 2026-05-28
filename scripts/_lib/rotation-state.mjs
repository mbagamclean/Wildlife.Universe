/**
 * Per-category label-rotation state for the autopilot.
 *
 * Architecture (May 28 2026): we run ONE pacer process per category.
 * Each pacer instance owns the rotation through its own category's
 * labels, publishing PUBLISHES_PER_LABEL articles per label before
 * advancing to the next. The rotation is intentionally infinite —
 * north-star aim is 10M+ species, one article at a time, balanced
 * across every (category, label) tuple.
 *
 * Why per-category processes (not one master pacer):
 *   - True parallelism: 5 categories → up to 5x sustained throughput.
 *   - Isolation: a quota/billing event in one category doesn't
 *     starve the others.
 *   - Independent state files mean each process can restart without
 *     coordinating with the others.
 *
 * Repetition guard:
 *   - cron-batch already runs pre-generation dedup against the live
 *     posts table (matches scientific_name + slug). SKIPPED items
 *     never burn CLI cycles and explicitly do NOT count toward the
 *     50-per-label budget — only `succeeded` publishes do.
 */

import fs from 'node:fs/promises';
import path from 'node:path';

// Per-category label rotations. When a pacer is launched with
// --category=birds it cycles only through this category's labels.
export const LABELS_BY_CATEGORY = {
  animals: ['Mammals', 'Reptiles', 'Amphibians', 'Fish', 'IUCN Redlist'],
  plants:  ['Trees', 'Shrubs', 'Herbs', 'Vines'],
  birds:   ['Basal', 'Waterfowl', 'Coastal', 'Raptors', 'Land', 'Song', 'IUCN Redlist'],
  insects: ['Porifera', 'Cnidaria', 'Platyhelminthes', 'Nematoda', 'Annelida', 'Mollusca', 'Arthropoda', 'Echinodermata', 'IUCN Redlist'],
  posts:   ['How Questions', 'Why Questions', 'Tourism', 'Conservation', 'Articles'],
};

export const PUBLISHES_PER_LABEL = 50;

export function rotationFor(category) {
  const labels = LABELS_BY_CATEGORY[category];
  if (!labels) throw new Error(`Unknown category for rotation: ${category}`);
  return labels.map((label) => ({ category, label }));
}

function stateFile(category) {
  return path.join(process.cwd(), `.pacer-rotation-${category}.json`);
}

function defaultState() {
  return {
    rotationIndex: 0,
    publishedInLabel: 0,
    totalPublished: 0,
    cycleNumber: 1,
    lastAdvancedAt: new Date().toISOString(),
  };
}

export async function readState(category) {
  try {
    const txt = await fs.readFile(stateFile(category), 'utf8');
    return { ...defaultState(), ...JSON.parse(txt) };
  } catch {
    return defaultState();
  }
}

export async function writeState(category, state) {
  const file = stateFile(category);
  const tmp = file + '.tmp';
  await fs.writeFile(tmp, JSON.stringify(state, null, 2), 'utf8');
  await fs.rename(tmp, file);
}

export function currentTarget(category, state) {
  const rot = rotationFor(category);
  return rot[state.rotationIndex % rot.length];
}

/** Pure: returns next-tuple state. Caller persists. */
export function advanceState(category, state) {
  const rot = rotationFor(category);
  const nextIdx = (state.rotationIndex + 1) % rot.length;
  const next = {
    ...state,
    rotationIndex: nextIdx,
    publishedInLabel: 0,
    lastAdvancedAt: new Date().toISOString(),
  };
  if (nextIdx === 0) next.cycleNumber = (state.cycleNumber || 1) + 1;
  return next;
}

/** Call on each successful publish. Advances when quota hit. */
export async function recordPublish(category, stateOpt) {
  const state = stateOpt || (await readState(category));
  let updated = {
    ...state,
    publishedInLabel: state.publishedInLabel + 1,
    totalPublished: (state.totalPublished || 0) + 1,
  };
  if (updated.publishedInLabel >= PUBLISHES_PER_LABEL) {
    updated = advanceState(category, updated);
  }
  await writeState(category, updated);
  return updated;
}

/** Force-advance — used when the current tuple's queue is empty. */
export async function forceAdvance(category, stateOpt) {
  const state = stateOpt || (await readState(category));
  const advanced = advanceState(category, state);
  await writeState(category, advanced);
  return advanced;
}
