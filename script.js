const wordInput      = document.getElementById('wordInput');
const sortSelect     = document.getElementById('sortSelect');
const resultsEl      = document.getElementById('results');
const searchedWordEl = document.getElementById('searchedWord');
const resultCountEl  = document.getElementById('resultCount');
const syllableInfoEl = document.getElementById('syllableInfo');
const loadingSection = document.getElementById('loadingSection');
const resultsSection = document.getElementById('resultsSection');
const noResultsEl    = document.getElementById('noResults');
const micButton      = document.getElementById('micButton');
const micStatus      = document.getElementById('micStatus');
const limit          = 1000;
let dict = {}, rhymesMap = { exact: {}, relaxed: {} }, syllableCounts = {};
let recognition;
let isListening = false;
function initSpeechRecognition() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    micButton.disabled = true;
    micStatus.textContent = 'Speech recognition not supported in your browser';
    return false;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.onstart = () => {
    isListening = true;
    micButton.classList.add('listening');
    micStatus.textContent = 'Listening...';
    };
    recognition.onend = () => {
    if (isListening) {
        recognition.start();
    }
    };
    recognition.onerror = (event) => {
    console.error('Speech recognition error', event.error);
    micStatus.textContent = `Error: ${event.error}`;
    if (event.error === 'not-allowed') {
        stopListening();
    }
    };
    recognition.onresult = (event) => {
    const result = event.results[event.results.length - 1];
    if (result.isFinal) {
        const word = result[0].transcript.trim().split(' ').pop();
        if (word) {
        wordInput.value = word;
        onSearch();
        }
    }
    };
    return true;
}
function toggleListening() {
    if (!recognition && !initSpeechRecognition()) {
    return;
    }
    if (isListening) {
    stopListening();
    } else {
    startListening();
    }
}
function startListening() {
    try {
    recognition.start();
    isListening = true;
    } catch (err) {
    console.error('Failed to start speech recognition', err);
    micStatus.textContent = 'Failed to start listening';
    }
}
function stopListening() {
    if (recognition) {
    recognition.stop();
    }
    isListening = false;
    micButton.classList.remove('listening');
    micStatus.textContent = '';
}
function loadDict() {
    loadingSection.style.display = 'block';
    fetch('dict.txt')
    .then(res => res.ok ? res.text() : Promise.reject(res.status))
    .then(text => {
        text.split(/\r?\n/).forEach(line => {
        if (!line || line.startsWith(';;;')) return;
        const [w, ph] = line.split('  ');
        if (!ph) return;
        dict[w] = ph.trim().split(' ');
        syllableCounts[w] = dict[w].filter(p => p.match(/[AEIOU].*[012]/)).length;
        });
        buildRhymesMap();
        loadingSection.style.display = 'none';
    })
    .catch(err => {
        console.error(err);
        loadingSection.style.display = 'none';
        alert('Failed to load dictionary.');
    });
}
function getKey(ph, exact) {
    let idx = ph.length - 1;
    while (idx >= 0 && !ph[idx].match(/[AEIOU].*[12]/)) idx--;
    if (idx < 0) idx = ph.findIndex(p => p.match(/[AEIOU]/));
    if (idx < 0) return ph.join(' ');
    return exact
    ? ph.slice(idx).join(' ')
    : ph.slice(-3).map(p => p.replace(/[0-9]/g, '')).join(' ');
}
function buildRhymesMap() {
    Object.entries(dict).forEach(([w, ph]) => {
    if (w.match(/[^A-Z']/)) return;
    ['exact','relaxed'].forEach(type => {
        const key = getKey(ph, type === 'exact');
        (rhymesMap[type][key] = rhymesMap[type][key]||[]).push(w);
    });
    });
}
function findRhymes(word) {
    const up = word.toUpperCase();
    if (!dict[up]) return [];
    const ph = dict[up];
    const perfect = new Set(rhymesMap.exact[getKey(ph,true)]||[]);
    const near    = new Set(rhymesMap.relaxed[getKey(ph,false)]||[]);
    const both = [
    ...[...perfect].filter(w => w !== up),
    ...[...near].filter(w => !perfect.has(w) && w !== up)
    ];
    return both.slice(0, limit);
}
function sortRhymes(list, sortType) {
    switch(sortType) {
    case 'alpha-asc':
        return [...list].sort();
    case 'alpha-desc':
        return [...list].sort().reverse();
    case 'syllables-asc':
        return [...list].sort((a,b) => (syllableCounts[a]||0) - (syllableCounts[b]||0));
    case 'syllables-desc':
        return [...list].sort((a,b) => (syllableCounts[b]||0) - (syllableCounts[a]||0));
    default:
        return list;
    }
}
function showResults(list, word) {
    resultsEl.innerHTML = '';
    if (!list.length) {
    noResultsEl.style.display = 'block';
    resultCountEl.textContent = '0 rhymes found';
    syllableInfoEl.textContent = (syllableCounts[word.toUpperCase()]||'') + (syllableCounts[word.toUpperCase()]?' syllables':'');
    return;
    }
    noResultsEl.style.display = 'none';
    list.forEach(r => {
    const li = document.createElement('li');
    li.className = 'rhyme-item';
    li.textContent = r.toLowerCase();
    const tip = document.createElement('span');
    tip.className = 'tooltip';
    tip.textContent = 'Copied!';
    li.appendChild(tip);
    li.onclick = async () => {
        try {
        await navigator.clipboard.writeText(r.toLowerCase());
        li.classList.add('show-tooltip');
        setTimeout(() => li.classList.remove('show-tooltip'), 800);
        } catch(err) {
        console.error('Copy failed', err);
        }
    };
    resultsEl.appendChild(li);
    });
    resultCountEl.textContent = `${list.length} rhymes found`;
    syllableInfoEl.textContent = `${syllableCounts[word.toUpperCase()]} syllables`;
}
function onSearch() {
    const w = wordInput.value.trim();
    if (!w) {
    resultsSection.style.display = 'none';
    return;
    }
    searchedWordEl.textContent = w;
    resultsSection.style.display = 'block';
    let rhymes = findRhymes(w);
    rhymes = sortRhymes(rhymes, sortSelect.value);
    showResults(rhymes, w);
}
micButton.addEventListener('click', toggleListening);
wordInput.addEventListener('input', onSearch);
sortSelect.addEventListener('change', onSearch);
window.addEventListener('DOMContentLoaded', () => {
    loadDict();
    initSpeechRecognition();
});