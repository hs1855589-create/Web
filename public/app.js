const { useEffect, useMemo, useRef, useState } = React;

const colorClass = {
  Green: 'text-emerald-400',
  Red: 'text-rose-400',
  Violet: 'text-violet-400',
};

function drawChart(canvas, config) {
  if (!canvas) return null;
  return new Chart(canvas, config);
}

function parseNumbers(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !/period\s*\|\s*number/i.test(line))
    .map((line) => {
      const match = line.match(/(\d)(?!.*\d)/);
      return match ? Number(match[1]) : null;
    })
    .filter((n) => Number.isInteger(n) && n >= 0 && n <= 9);
}

function ChartCard({ title, canvasRef }) {
  return React.createElement('div', { className: 'glass rounded-2xl p-4 border border-slate-800' },
    React.createElement('h3', { className: 'text-sm font-semibold text-slate-300 mb-3' }, title),
    React.createElement('canvas', { ref: canvasRef, className: 'w-full h-48' }),
  );
}

function App() {
  const [inputText, setInputText] = useState('Period | Number\n1001 | 7\n1002 | 1\n1003 | 7\n1004 | 9\n1005 | 5\n1006 | 0\n1007 | 8\n1008 | 3\n1009 | 7\n1010 | 9');
  const [analysis, setAnalysis] = useState(null);
  const [accuracyLog, setAccuracyLog] = useState(() => JSON.parse(localStorage.getItem('npp_accuracy') || '[]'));
  const [actualInput, setActualInput] = useState('');

  const freqRef = useRef(null);
  const ratioRef = useRef(null);
  const colorRef = useRef(null);
  const trendRef = useRef(null);
  const chartRefs = useRef([]);

  const parsedNumbers = useMemo(() => parseNumbers(inputText), [inputText]);

  useEffect(() => {
    localStorage.setItem('npp_accuracy', JSON.stringify(accuracyLog));
  }, [accuracyLog]);

  async function predictNow() {
    const resp = await fetch('/api/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rawText: inputText }),
    });
    const data = await resp.json();
    setAnalysis(data);
  }

  useEffect(() => { predictNow(); }, [inputText]);

  useEffect(() => {
    if (!analysis) return;
    chartRefs.current.forEach((ch) => ch && ch.destroy());
    chartRefs.current = [];

    chartRefs.current.push(drawChart(freqRef.current, {
      type: 'bar',
      data: {
        labels: Array.from({ length: 10 }, (_, i) => i),
        datasets: [{
          label: 'Frequency',
          data: analysis.frequency,
          backgroundColor: '#38bdf8',
          borderRadius: 6,
        }],
      },
      options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } },
    }));

    chartRefs.current.push(drawChart(ratioRef.current, {
      type: 'doughnut',
      data: {
        labels: ['Big', 'Small'],
        datasets: [{ data: [analysis.bigSmall.Big, analysis.bigSmall.Small], backgroundColor: ['#f59e0b', '#22c55e'] }],
      },
    }));

    chartRefs.current.push(drawChart(colorRef.current, {
      type: 'pie',
      data: {
        labels: ['Green', 'Red', 'Violet'],
        datasets: [{ data: [analysis.colors.Green, analysis.colors.Red, analysis.colors.Violet], backgroundColor: ['#22c55e', '#ef4444', '#a855f7'] }],
      },
    }));

    chartRefs.current.push(drawChart(trendRef.current, {
      type: 'line',
      data: {
        labels: analysis.recent.map((_, i) => i + 1),
        datasets: [{
          data: analysis.recent,
          borderColor: '#818cf8',
          tension: 0.3,
          fill: false,
        }],
      },
      options: { plugins: { legend: { display: false } }, scales: { y: { min: 0, max: 9 } } },
    }));
  }, [analysis]);

  function recordActualResult() {
    if (!analysis?.prediction || actualInput === '') return;
    const actual = Number(actualInput);
    if (!Number.isInteger(actual) || actual < 0 || actual > 9) return;
    const prediction = analysis.prediction;
    const entry = {
      ts: new Date().toISOString(),
      predicted: prediction.number,
      actual,
      match: prediction.number === actual,
      confidence: prediction.confidence,
    };
    setAccuracyLog((prev) => [entry, ...prev].slice(0, 100));
    setActualInput('');
  }

  const accuracy = useMemo(() => {
    if (!accuracyLog.length) return 0;
    const hits = accuracyLog.filter((x) => x.match).length;
    return ((hits / accuracyLog.length) * 100).toFixed(1);
  }, [accuracyLog]);

  return React.createElement('main', { className: 'max-w-7xl mx-auto p-6 space-y-6' },
    React.createElement('header', { className: 'flex flex-col md:flex-row md:items-end md:justify-between gap-3' },
      React.createElement('div', null,
        React.createElement('h1', { className: 'text-3xl font-bold tracking-tight' }, 'Number Pattern Predictor'),
        React.createElement('p', { className: 'text-slate-400' }, 'Hybrid engine: Frequency + Markov + Streak Break')
      ),
      React.createElement('button', {
        onClick: predictNow,
        className: 'px-5 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 transition font-semibold'
      }, 'Predict Next Round')
    ),

    React.createElement('section', { className: 'grid md:grid-cols-3 gap-4' },
      React.createElement('div', { className: 'md:col-span-2 glass rounded-2xl p-4 border border-slate-800' },
        React.createElement('label', { className: 'text-sm text-slate-300' }, 'Historical Data Input (Period | Number)'),
        React.createElement('textarea', {
          value: inputText,
          onChange: (e) => setInputText(e.target.value),
          className: 'w-full mt-2 h-44 bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500'
        }),
        React.createElement('p', { className: 'text-xs text-slate-500 mt-2' }, `Parsed rounds: ${parsedNumbers.length} (auto-updates)`)
      ),
      React.createElement('div', { className: 'glass rounded-2xl p-4 border border-slate-800 space-y-2' },
        React.createElement('h2', { className: 'font-semibold text-slate-200' }, 'Prediction Output'),
        analysis?.prediction
          ? React.createElement(React.Fragment, null,
              React.createElement('p', { className: 'text-4xl font-bold' }, analysis.prediction.number),
              React.createElement('p', null, 'Big/Small: ', React.createElement('span', { className: 'font-semibold' }, analysis.prediction.size)),
              React.createElement('p', null, 'Color: ', React.createElement('span', { className: `font-semibold ${colorClass[analysis.prediction.color]}` }, analysis.prediction.color)),
              React.createElement('p', null, 'Confidence: ', React.createElement('span', { className: 'font-semibold text-cyan-400' }, `${analysis.prediction.confidence}%`))
            )
          : React.createElement('p', { className: 'text-slate-500' }, 'Paste data to start predicting.')
      )
    ),

    React.createElement('section', { className: 'grid md:grid-cols-2 xl:grid-cols-4 gap-4' },
      React.createElement(ChartCard, { title: 'Number Frequency', canvasRef: freqRef }),
      React.createElement(ChartCard, { title: 'Big vs Small Ratio', canvasRef: ratioRef }),
      React.createElement(ChartCard, { title: 'Color Distribution', canvasRef: colorRef }),
      React.createElement(ChartCard, { title: 'Last 50 Round Patterns', canvasRef: trendRef }),
    ),

    React.createElement('section', { className: 'glass rounded-2xl p-4 border border-slate-800' },
      React.createElement('div', { className: 'flex flex-wrap items-end gap-3 justify-between' },
        React.createElement('h2', { className: 'font-semibold' }, 'Accuracy Tracker (LocalStorage)'),
        React.createElement('p', { className: 'text-sm text-slate-400' }, `Overall accuracy: ${accuracy}% from ${accuracyLog.length} entries`)
      ),
      React.createElement('div', { className: 'mt-3 flex flex-wrap gap-2' },
        React.createElement('input', {
          value: actualInput,
          onChange: (e) => setActualInput(e.target.value),
          placeholder: 'Actual next number (0-9)',
          className: 'px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg'
        }),
        React.createElement('button', {
          onClick: recordActualResult,
          className: 'px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg font-semibold'
        }, 'Record Actual Result')
      ),
      React.createElement('div', { className: 'mt-3 max-h-40 overflow-auto text-sm' },
        accuracyLog.map((item, idx) => React.createElement('div', {
          key: idx,
          className: 'flex justify-between py-1 border-b border-slate-800'
        },
          React.createElement('span', null, `${item.predicted} → ${item.actual}`),
          React.createElement('span', { className: item.match ? 'text-emerald-400' : 'text-rose-400' }, item.match ? 'Hit' : 'Miss')
        ))
      )
    )
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App));
