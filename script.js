const workerScript = `
let cmu = {};
let wordList = [];
function countSyllables(phonemes) {
  return (phonemes.match(/[0-2]/g) || []).length;
}
function getRhymePart(phonemes) {
  const parts = phonemes.split(' ');
  for (let i = parts.length - 1; i >= 0; i--) {
    if (parts[i].match(/\\d/)) {
      return parts.slice(i).join(' ');
    }
  }
  return parts.join(' ');
}
function getAssonance(phonemes) {
  return phonemes.match(/[AEIOU][A-Z]*[0-2]?/g) || [];
}
function normalize(word) {
  return word.toUpperCase().replace(/[^A-Z]/g, '');
}
function matchRhyme(word, rhymeType) {
  word = normalize(word);
  if (!cmu[word]) return [];
  const wordPhonemes = cmu[word];
  const results = [];
  wordList.forEach(candidate => {
    if (candidate === word) return;
    cmu[candidate].forEach(candidatePhonemes => {
      wordPhonemes.forEach(wordPh => {
        let isMatch = false;
        if (rhymeType === 'perfect') {
          isMatch = getRhymePart(candidatePhonemes) === getRhymePart(wordPh);
        } else if (rhymeType === 'assonance') {
          isMatch = getAssonance(candidatePhonemes).join('') === getAssonance(wordPh).join('');
        } else if (rhymeType === 'slant') {
          isMatch = getRhymePart(candidatePhonemes).replace(/\\d/g, '') === getRhymePart(wordPh).replace(/\\d/g, '');
        } else if (rhymeType === 'pararhyme') {
          isMatch = candidatePhonemes.replace(/[AEIOU][A-Z]*[0-2]?/g, '') === wordPh.replace(/[AEIOU][A-Z]*[0-2]?/g, '');
        } else if (rhymeType === 'multisyllabic') {
          isMatch = getRhymePart(candidatePhonemes) === getRhymePart(wordPh) && countSyllables(candidatePhonemes) > 1;
        } else if (rhymeType === 'eye') {
          isMatch = candidate.slice(-3) === word.slice(-3);
        }
        if (isMatch) {
          results.push({
            word: candidate.replace(/\\(\\d+\\)$/, '').toLowerCase(),
            syl: countSyllables(candidatePhonemes),
            type: rhymeType
          });
        }
      });
    });
  });
  return results;
}
function rhymeCheckPart(phonemes1, phonemes2, rhymeType) {
  if (rhymeType === 'perfect') {
    return getRhymePart(phonemes2) === getRhymePart(phonemes1);
  } else if (rhymeType === 'assonance') {
    return getAssonance(phonemes2).join('') === getAssonance(phonemes1).join('');
  } else if (rhymeType === 'slant') {
    return getRhymePart(phonemes2).replace(/\\d/g, '') === getRhymePart(phonemes1).replace(/\\d/g, '');
  } else if (rhymeType === 'pararhyme') {
    return phonemes2.replace(/[AEIOU][A-Z]*[0-2]?/g, '') === phonemes1.replace(/[AEIOU][A-Z]*[0-2]?/g, '');
  } else if (rhymeType === 'multisyllabic') {
    return getRhymePart(phonemes2) === getRhymePart(phonemes1) && countSyllables(phonemes2) > 1;
  }
  return false;
}
function matchTwoWordRhyme(word1, word2, rhymeType) {
  const normWord1 = normalize(word1);
  const normWord2 = normalize(word2);
  if (!cmu[normWord1] || !cmu[normWord2]) return [];
  const word1Phonemes = cmu[normWord1];
  const word2Phonemes = cmu[normWord2];
  const results = [];
  wordList.forEach(candidate => {
    const candWord = candidate;
    if (candWord === normWord1 || candWord === normWord2) return;
    cmu[candWord].forEach(candPhonemes => {
      const phonemeParts = candPhonemes.split(' ');
      for (let i = 1; i < phonemeParts.length; i++) {
        const part1 = phonemeParts.slice(0, i).join(' ');
        const part2 = phonemeParts.slice(i).join(' ');
        let match1 = false, match2 = false;
        for (const w1ph of word1Phonemes) {
          if (rhymeCheckPart(w1ph, part1, rhymeType)) {
            match1 = true;
            break;
          }
        }
        if (match1) {
          for (const w2ph of word2Phonemes) {
            if (rhymeCheckPart(w2ph, part2, rhymeType)) {
              match2 = true;
              break;
            }
          }
          if (match2) {
            results.push({
              word: candWord.replace(/\\(\\d+\\)$/, '').toLowerCase(),
              syl: countSyllables(candPhonemes),
              type: rhymeType
            });
            break;
          }
        }
      }
    });
  });
  return results;
}
function dedupe(results) {
  const seen = {};
  results.forEach(result => {
    const word = result.word;
    const key = word + '|' + result.type;
    if (!seen[key] || result.syl < seen[key].syl) {
      seen[key] = { word: word, syl: result.syl, type: result.type };
    }
  });
  return Object.values(seen);
}
self.onmessage = function(e) {
  const { type, data } = e.data;
  if (type === 'LOAD_DICTIONARY') {
    cmu = data.cmu;
    wordList = data.wordList;
    self.postMessage({ type: 'DICTIONARY_LOADED' });
  } else if (type === 'SEARCH') {
    const { rhymeTypes, twoWordMode, word, word1, word2 } = data;
    let results = [];
    if (twoWordMode && word1 && word2) {
      rhymeTypes.forEach(rhymeType => {
        results = results.concat(matchTwoWordRhyme(word1, word2, rhymeType));
      });
    } else if (!twoWordMode && word) {
      rhymeTypes.forEach(rhymeType => {
        results = results.concat(matchRhyme(word, rhymeType));
      });
    }
    results = dedupe(results);
    self.postMessage({ type: 'SEARCH_RESULTS', data: results });
  }
};
`;
const blob = new Blob([workerScript], { type: 'application/javascript' });
const worker = new Worker(URL.createObjectURL(blob));
let debounceTimer;
let hasSearched = false;
async function loadCMU() {
  try {
    const response = await fetch('cmudict.json');
    const cmu = await response.json();
    for (let word in cmu) {
      if (!Array.isArray(cmu[word])) {
        cmu[word] = [cmu[word]];
      }
    }
    const wordList = Object.keys(cmu);
    worker.postMessage({
      type: 'LOAD_DICTIONARY',
      data: { cmu, wordList }
    });
  } catch (error) {
    document.getElementById('status').innerText = 'Error loading dictionary.';
    console.error('Failed to load CMU dictionary:', error);
  }
}
worker.onmessage = function(e) {
  const { type, data } = e.data;
  if (type === 'DICTIONARY_LOADED') {
    document.getElementById('status').innerText = 'Dictionary loaded.';
  } else if (type === 'SEARCH_RESULTS') {
    renderResults(data);
    document.getElementById('app').classList.remove('loading');
  }
};
function renderResults(results) {
  const resultsEl = document.getElementById('results');
  resultsEl.innerHTML = '';
  if (!results.length) {
    resultsEl.innerHTML = "<p style='text-align:center;color:var(--text)'>No matches found.</p>";
    return;
  }
  const rhymeTypes = Array.from(document.querySelectorAll('input[name="rhymeType"]:checked')).map(el => el.value);
  rhymeTypes.forEach(rhymeType => {
    const typeResults = results.filter(r => r.type === rhymeType);
    if (!typeResults.length) return;
    const colEl = document.createElement('div');
    colEl.className = 'rhyme-col';
    colEl.innerHTML = `<h2>${rhymeType}</h2><div class="words"></div>`;
    const wordsEl = colEl.querySelector('.words');
    typeResults
      .sort((a, b) => a.syl - b.syl)
      .forEach(result => {
        const wordEl = document.createElement('div');
        wordEl.className = 'word';
        wordEl.textContent = result.word;
        wordEl.onclick = () => copyWord(result.word);
        wordsEl.appendChild(wordEl);
      });
    resultsEl.appendChild(colEl);
  });
}
function copyWord(word) {
  navigator.clipboard.writeText(word);
  const banner = document.getElementById('banner');
  banner.textContent = `Copied "${word}"`;
  banner.classList.add('show');
  setTimeout(() => banner.classList.remove('show'), 1200);
}
function doSearch() {
  const rhymeTypes = Array.from(document.querySelectorAll('input[name="rhymeType"]:checked')).map(el => el.value);
  const twoWordMode = document.getElementById('twoWordToggle').checked;
  if (!hasSearched) {
    hasSearched = true;
    document.getElementById('app').classList.add('expanded');
  }
  document.getElementById('app').classList.add('loading');
  const searchData = {
    rhymeTypes,
    twoWordMode,
    word: document.getElementById('inputWord').value.trim(),
    word1: document.getElementById('inputWord1').value.trim(),
    word2: document.getElementById('inputWord2').value.trim()
  };
  worker.postMessage({
    type: 'SEARCH',
    data: searchData
  });
}
function scheduleSearch() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(doSearch, 150);
}
if (window.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition) {
  const recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = false;
  let isListening = false;
  const micBtn = document.getElementById('micBtn');
  const inputWord = document.getElementById('inputWord');
  const inputWord1 = document.getElementById('inputWord1');
  const inputWord2 = document.getElementById('inputWord2');
  micBtn.addEventListener('click', () => {
    if (isListening) {
      recognition.stop();
    } else {
      recognition.start();
    }
  });
  recognition.addEventListener('start', () => {
    isListening = true;
    micBtn.classList.add('listening');
  });
  recognition.addEventListener('end', () => {
    isListening = false;
    micBtn.classList.remove('listening');
    if (micBtn.classList.contains('listening')) {
      recognition.start();
    }
  });
  recognition.addEventListener('result', (event) => {
    const transcript = Array.from(event.results)
      .slice(event.resultIndex)
      .map(result => result[0].transcript)
      .join(' ')
      .trim();
    if (document.getElementById('twoWordToggle').checked) {
      const words = transcript.split(/\s+/).filter(w => w);
      if (words.length >= 2) {
        inputWord1.value = words[words.length - 2];
        inputWord2.value = words[words.length - 1];
      } else if (words.length === 1) {
        inputWord1.value = words[0];
      }
    } else {
      const lastWord = transcript.split(/\s+/).pop() || '';
      inputWord.value = lastWord;
    }
    doSearch();
  });
}
const twoWordToggleEl = document.getElementById('twoWordToggle');
twoWordToggleEl.addEventListener('change', () => {
  const isTwoWord = twoWordToggleEl.checked;
  const inputWord = document.getElementById('inputWord');
  const inputWord1 = document.getElementById('inputWord1');
  const inputWord2 = document.getElementById('inputWord2');
  if (isTwoWord) {
    inputWord.style.display = 'none';
    inputWord1.style.display = '';
    inputWord2.style.display = '';
    inputWord.value = '';
    inputWord1.value = '';
    inputWord2.value = '';
  } else {
    inputWord.style.display = '';
    inputWord1.style.display = 'none';
    inputWord2.style.display = 'none';
    inputWord1.value = '';
    inputWord2.value = '';
    inputWord.value = '';
  }
  doSearch();
});
document.getElementById('inputWord').addEventListener('input', scheduleSearch);
document.getElementById('inputWord1').addEventListener('input', scheduleSearch);
document.getElementById('inputWord2').addEventListener('input', scheduleSearch);
document.querySelectorAll('input[name="rhymeType"]').forEach(el => 
  el.addEventListener('change', scheduleSearch)
);
window.onload = loadCMU;