const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Persistence layer: Upstash Redis (REST) when configured, otherwise local JSON files.
// Serverless invocations on Vercel start fresh, so slots cache + subscriber alerts
// must live outside the filesystem for transition detection to work between scans.

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const useRedis = !!(REDIS_URL && REDIS_TOKEN);

const SLOTS_KEY = 'slotwatch:slots';
const ALERTS_KEY = 'slotwatch:alerts';

const isVercel = !!(process.env.VERCEL || process.env.NOW_BUILDER);
const DATA_DIR = isVercel ? '/tmp' : path.join(__dirname, 'data');
const SLOTS_FILE = path.join(DATA_DIR, 'slots.json');
const ALERTS_FILE = path.join(DATA_DIR, 'alerts.json');

const EMPTY_SLOTS = { tourist: [], business: [], lastUpdated: null };

function ensureFiles() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(SLOTS_FILE)) {
    fs.writeFileSync(SLOTS_FILE, JSON.stringify(EMPTY_SLOTS, null, 2));
  }
  if (!fs.existsSync(ALERTS_FILE)) {
    fs.writeFileSync(ALERTS_FILE, JSON.stringify([], null, 2));
  }
}

async function redisCommand(...args) {
  const res = await axios.post(REDIS_URL, args, {
    headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
    timeout: 8000
  });
  return res.data.result;
}

async function redisGetJson(key, fallback) {
  const raw = await redisCommand('GET', key);
  if (raw === null || raw === undefined) return fallback;
  try {
    return JSON.parse(raw);
  } catch (e) {
    console.error(`Corrupt JSON in Redis key ${key}, using fallback.`);
    return fallback;
  }
}

async function redisSetJson(key, value) {
  await redisCommand('SET', key, JSON.stringify(value));
}

function readFileJson(file, fallback) {
  try {
    ensureFiles();
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    return fallback;
  }
}

function writeFileJson(file, value) {
  ensureFiles();
  fs.writeFileSync(file, JSON.stringify(value, null, 2));
}

async function loadSlots() {
  if (useRedis) return redisGetJson(SLOTS_KEY, EMPTY_SLOTS);
  return readFileJson(SLOTS_FILE, EMPTY_SLOTS);
}

async function saveSlots(slots) {
  if (useRedis) return redisSetJson(SLOTS_KEY, slots);
  writeFileJson(SLOTS_FILE, slots);
}

async function loadAlerts() {
  if (useRedis) return redisGetJson(ALERTS_KEY, []);
  return readFileJson(ALERTS_FILE, []);
}

async function saveAlerts(alerts) {
  if (useRedis) return redisSetJson(ALERTS_KEY, alerts);
  writeFileJson(ALERTS_FILE, alerts);
}

console.log(useRedis
  ? 'Storage: Upstash Redis'
  : `Storage: local JSON files in ${DATA_DIR}${isVercel ? ' (ephemeral! set UPSTASH_REDIS_REST_URL/TOKEN)' : ''}`);

module.exports = { loadSlots, saveSlots, loadAlerts, saveAlerts, useRedis };
