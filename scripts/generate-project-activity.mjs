#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ASSETS_DIR = path.join(ROOT_DIR, 'assets');
const STAR_HISTORY_PATH = path.join(ASSETS_DIR, 'star-history.json');
const STAR_SVG_PATH = path.join(ASSETS_DIR, 'star-history.svg');
const COMMIT_SVG_PATH = path.join(ASSETS_DIR, 'commit-activity.svg');
const REPOSITORY = 'wangjicheng2004/dsh-desktop';
const DAY_MS = 24 * 60 * 60 * 1000;
const COMMIT_COLORS = ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39'];

function escapeXml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;',
  }[character]));
}

function dateKey(date) {
  return date.toISOString().slice(0, 10);
}

function dateFromKey(value) {
  return new Date(`${value}T00:00:00.000Z`);
}

function startOfUtcDay(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addDays(date, days) {
  return new Date(date.getTime() + days * DAY_MS);
}

function readStarHistory() {
  try {
    const data = JSON.parse(readFileSync(STAR_HISTORY_PATH, 'utf8'));
    return Array.isArray(data.points) ? data : { repository: REPOSITORY, points: [] };
  } catch {
    return { repository: REPOSITORY, points: [] };
  }
}

function updateStarHistory() {
  const starsArgument = process.argv.indexOf('--stars');
  const starCount = starsArgument >= 0 ? Number(process.argv[starsArgument + 1]) : Number.NaN;
  const history = readStarHistory();
  const today = dateKey(new Date());

  if (Number.isInteger(starCount) && starCount >= 0) {
    history.points = history.points.filter((point) => point.date !== today);
    history.points.push({ date: today, stars: starCount });
  }

  history.repository = REPOSITORY;
  history.points = history.points
    .filter((point) => /^\d{4}-\d{2}-\d{2}$/.test(point.date) && Number.isInteger(point.stars) && point.stars >= 0)
    .sort((left, right) => left.date.localeCompare(right.date));
  writeFileSync(STAR_HISTORY_PATH, `${JSON.stringify(history, null, 2)}\n`);
  return history.points;
}

function renderStarHistory(points) {
  const width = 760;
  const height = 220;
  const padding = { top: 34, right: 26, bottom: 40, left: 48 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const lastPoint = points.at(-1);
  const values = points.map((point) => point.stars);
  const minimum = values.length ? Math.min(...values) : 0;
  const maximum = values.length ? Math.max(...values) : 0;
  const range = Math.max(1, maximum - minimum);
  const firstDate = points.length ? dateFromKey(points[0].date) : startOfUtcDay(new Date());
  const lastDate = points.length ? dateFromKey(lastPoint.date) : firstDate;
  const days = Math.max(1, Math.round((lastDate - firstDate) / DAY_MS));
  const coordinates = points.map((point) => {
    const x = padding.left + ((dateFromKey(point.date) - firstDate) / DAY_MS / days) * plotWidth;
    const y = padding.top + plotHeight - ((point.stars - minimum) / range) * plotHeight;
    return { x, y, ...point };
  });
  const polyline = coordinates.map(({ x, y }) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const series = coordinates.length > 1
    ? `<polyline points="${polyline}" fill="none" stroke="#0969da" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>`
    : '';
  const labels = lastPoint
    ? `起点 ${escapeXml(points[0].date)} · 当前 ${lastPoint.stars} Stars · 更新 ${escapeXml(lastPoint.date)}`
    : '等待首次 Star 数据更新';
  const dots = coordinates.map(({ x, y, date, stars }) =>
    `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4" fill="#0969da"><title>${escapeXml(`${date}: ${stars} Stars`)}</title></circle>`,
  ).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeXml(labels)}">
  <rect width="100%" height="100%" rx="8" fill="#ffffff" stroke="#d0d7de"/>
  <text x="${padding.left}" y="22" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" font-size="14" font-weight="600" fill="#24292f">⭐ Star 趋势</text>
  <text x="${padding.left}" y="${height - 14}" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" font-size="11" fill="#57606a">${labels}</text>
  <line x1="${padding.left}" y1="${padding.top + plotHeight}" x2="${width - padding.right}" y2="${padding.top + plotHeight}" stroke="#d0d7de"/>
  <text x="10" y="${padding.top + 4}" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" font-size="11" fill="#57606a">${maximum}</text>
  <text x="10" y="${padding.top + plotHeight}" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" font-size="11" fill="#57606a">${minimum}</text>
${series}
  ${dots}
</svg>
`;
}

function commitCounts() {
  const output = execFileSync('git', ['log', '--format=%cs', 'HEAD'], { cwd: ROOT_DIR, encoding: 'utf8' });
  return output.trim().split('\n').filter(Boolean).reduce((counts, date) => {
    counts.set(date, (counts.get(date) ?? 0) + 1);
    return counts;
  }, new Map());
}

function renderCommitActivity(counts) {
  const today = startOfUtcDay(new Date());
  const end = addDays(today, 6 - today.getUTCDay());
  const start = addDays(end, -(53 * 7 - 1));
  const cell = 11;
  const gap = 3;
  const left = 44;
  const top = 34;
  const width = left + 53 * (cell + gap) + 12;
  const height = top + 7 * (cell + gap) + 38;
  const maximum = Math.max(1, ...counts.values());
  const cells = [];

  for (let offset = 0; offset < 53 * 7; offset += 1) {
    const date = addDays(start, offset);
    const count = counts.get(dateKey(date)) ?? 0;
    const level = count === 0 ? 0 : Math.min(4, Math.ceil((count / maximum) * 4));
    const week = Math.floor(offset / 7);
    const day = offset % 7;
    const x = left + week * (cell + gap);
    const y = top + day * (cell + gap);
    cells.push(`<rect x="${x}" y="${y}" width="${cell}" height="${cell}" rx="2" fill="${COMMIT_COLORS[level]}"><title>${dateKey(date)}: ${count} commits</title></rect>`);
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="本仓库最近一年的提交活跃度">
  <rect width="100%" height="100%" rx="8" fill="#ffffff" stroke="#d0d7de"/>
  <text x="${left}" y="22" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" font-size="14" font-weight="600" fill="#24292f">🟩 提交活跃度（最近 53 周）</text>
  <text x="8" y="${top + 10}" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" font-size="10" fill="#57606a">日</text>
  <text x="4" y="${top + 3 * (cell + gap) + 10}" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" font-size="10" fill="#57606a">三</text>
  <text x="4" y="${top + 6 * (cell + gap) + 10}" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" font-size="10" fill="#57606a">六</text>
  ${cells.join('')}
</svg>
`;
}

mkdirSync(ASSETS_DIR, { recursive: true });
const points = updateStarHistory();
writeFileSync(STAR_SVG_PATH, renderStarHistory(points));
writeFileSync(COMMIT_SVG_PATH, renderCommitActivity(commitCounts()));
