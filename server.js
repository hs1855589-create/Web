const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => { data += chunk; });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

function parseNumbers(rawText = '') {
  return rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !/period\s*\|\s*number/i.test(line))
    .map((line) => {
      const match = line.match(/(\d)(?!.*\d)/);
      return match ? Number(match[1]) : null;
    })
    .filter((n) => Number.isInteger(n) && n >= 0 && n <= 9);
}

function colorOf(n) {
  if ([1, 3, 7, 9].includes(n)) return 'Green';
  if ([2, 4, 6, 8].includes(n)) return 'Red';
  return 'Violet';
}

function sizeOf(n) {
  return n <= 4 ? 'Small' : 'Big';
}

function analyze(numbers) {
  if (!numbers.length) {
    return {
      prediction: null,
      frequency: Array(10).fill(0),
      bigSmall: { Big: 0, Small: 0 },
      colors: { Green: 0, Red: 0, Violet: 0 },
      recent: [],
    };
  }

  const total = numbers.length;
  const frequencyCount = Array(10).fill(0);
  const transitions = Array.from({ length: 10 }, () => Array(10).fill(0));

  numbers.forEach((n) => { frequencyCount[n] += 1; });
  for (let i = 0; i < numbers.length - 1; i += 1) {
    transitions[numbers[i]][numbers[i + 1]] += 1;
  }

  const frequencyNorm = frequencyCount.map((count) => count / total);

  const last = numbers[numbers.length - 1];
  const outgoing = transitions[last];
  const outgoingTotal = outgoing.reduce((a, b) => a + b, 0);
  const transitionNorm = outgoingTotal
    ? outgoing.map((count) => count / outgoingTotal)
    : Array(10).fill(1 / 10);

  let streakLength = 1;
  for (let i = numbers.length - 2; i >= 0; i -= 1) {
    if (numbers[i] === last) streakLength += 1;
    else break;
  }

  const breakBoost = Math.min(1, streakLength / 5);
  const streakBreak = Array(10).fill(0).map((_, n) => {
    if (n === last) return Math.max(0, 0.4 - breakBoost);
    return 0.4 + breakBoost / 2;
  });

  const scores = Array(10).fill(0).map((_, n) => (
    (0.4 * frequencyNorm[n]) + (0.4 * transitionNorm[n]) + (0.2 * streakBreak[n])
  ));

  const maxScore = Math.max(...scores);
  const predictedNumber = scores.indexOf(maxScore);
  const scoreSum = scores.reduce((a, b) => a + b, 0) || 1;
  const confidence = (maxScore / scoreSum) * 100;

  const bigSmall = { Big: 0, Small: 0 };
  const colors = { Green: 0, Red: 0, Violet: 0 };
  numbers.forEach((n) => {
    bigSmall[sizeOf(n)] += 1;
    colors[colorOf(n)] += 1;
  });

  return {
    prediction: {
      number: predictedNumber,
      size: sizeOf(predictedNumber),
      color: colorOf(predictedNumber),
      confidence: Number(confidence.toFixed(2)),
      scoreBreakdown: scores.map((score, n) => ({
        number: n,
        score: Number(score.toFixed(4)),
        frequency: Number(frequencyNorm[n].toFixed(4)),
        transition: Number(transitionNorm[n].toFixed(4)),
        streakBreak: Number(streakBreak[n].toFixed(4)),
      })),
    },
    frequency: frequencyCount,
    bigSmall,
    colors,
    recent: numbers.slice(-50),
  };
}

function send(res, status, body, type = 'application/json; charset=utf-8') {
  res.writeHead(status, {
    'Content-Type': type,
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(body);
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return send(res, 204, '');

  if (req.url === '/api/predict' && req.method === 'POST') {
    try {
      const body = await readBody(req);
      const parsed = JSON.parse(body || '{}');
      const numbers = Array.isArray(parsed.numbers)
        ? parsed.numbers.filter((n) => Number.isInteger(n) && n >= 0 && n <= 9)
        : parseNumbers(parsed.rawText || '');
      return send(res, 200, JSON.stringify({ numbers, ...analyze(numbers) }));
    } catch (error) {
      return send(res, 400, JSON.stringify({ error: 'Invalid payload' }));
    }
  }

  const filePath = req.url === '/'
    ? path.join(__dirname, 'public', 'index.html')
    : path.join(__dirname, 'public', req.url.replace(/^\//, ''));

  if (!filePath.startsWith(path.join(__dirname, 'public'))) {
    return send(res, 403, 'Forbidden', 'text/plain; charset=utf-8');
  }

  fs.readFile(filePath, (err, data) => {
    if (err) return send(res, 404, 'Not found', 'text/plain; charset=utf-8');
    const ext = path.extname(filePath);
    return send(res, 200, data, MIME[ext] || 'application/octet-stream');
  });
});

server.listen(PORT, () => {
  console.log(`Number Pattern Predictor running on http://localhost:${PORT}`);
});
