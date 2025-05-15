let cmu = {}, wordList = [], debounceTimer, hasSearched = false;
async function loadCMU() {
    const res = await fetch("cmudict.json");
    cmu = await res.json();
    for (let w in cmu) {
    if (!Array.isArray(cmu[w])) cmu[w] = [cmu[w]];
    }
    wordList = Object.keys(cmu);
    document.getElementById("status").innerText = "Dictionary loaded.";
}
function countSyllables(p) {
    return (p.match(/[0-2]/g) || []).length;
}
function getRhymePart(p) {
    const phones = p.split(" ");
    for (let i = phones.length - 1; i >= 0; i--) {
    if (phones[i].match(/\d/)) return phones.slice(i).join(" ");
    }
    return phones.join(" ");
}
function getAssonance(p) {
    return p.match(/[AEIOU][A-Z]*[0-2]?/g) || [];
}
function normalize(w) {
    return w.toUpperCase().replace(/[^A-Z]/g, "");
}
function matchRhyme(word, type) {
    word = normalize(word);
    if (!cmu[word]) return [];
    const target = cmu[word], out = [];
    wordList.forEach(cand => {
    if (cand === word) return;
    cmu[cand].forEach(pron => {
        target.forEach(tpron => {
        let ok = false;
        if (type === "perfect")
            ok = getRhymePart(pron) === getRhymePart(tpron);
        else if (type === "assonance")
            ok = getAssonance(pron).join("") === getAssonance(tpron).join("");
        else if (type === "slant")
            ok = getRhymePart(pron).replace(/\d/g, "") === getRhymePart(tpron).replace(/\d/g, "");
        else if (type === "pararhyme")
            ok = pron.replace(/[AEIOU][A-Z]*[0-2]?/g, "") ===
                tpron.replace(/[AEIOU][A-Z]*[0-2]?/g, "");
        else if (type === "multisyllabic")
            ok = getRhymePart(pron) === getRhymePart(tpron) &&
                countSyllables(pron) > 1;
        else if (type === "eye")
            ok = cand.slice(-3) === word.slice(-3);
        if (ok) out.push({ word: cand, syl: countSyllables(pron), type });
        });
    });
    });
    return out;
}
function dedupe(rows) {
    const map = {};
    rows.forEach(r => {
    const w = r.word.replace(/\(\d+\)$/, "").toLowerCase();
    const key = w + "|" + r.type;
    if (!map[key] || r.syl < map[key].syl) {
        map[key] = { word: w, syl: r.syl, type: r.type };
    }
    });
    return Object.values(map);
}
function renderResults(rows, types) {
    const container = document.getElementById("results");
    container.innerHTML = "";
    if (!rows.length) {
    container.innerHTML = "<p style='text-align:center;color:var(--text)'>No matches found.</p>";
    return;
    }
    types.forEach(type => {
    const group = rows.filter(r => r.type === type);
    if (!group.length) return;
    const col = document.createElement("div");
    col.className = "rhyme-col";
    col.innerHTML = `<h2>${type}</h2><div class="words"></div>`;
    const wordsEl = col.querySelector(".words");
    group.sort((a,b) => a.syl - b.syl).forEach(r => {
        const btn = document.createElement("div");
        btn.className = "word";
        btn.textContent = `${r.word} (${r.syl})`;
        btn.onclick = () => copyWord(r.word);
        wordsEl.appendChild(btn);
    });
    container.appendChild(col);
    });
}
function copyWord(w) {
    navigator.clipboard.writeText(w);
    const b = document.getElementById("banner");
    b.textContent = `Copied “${w}”`;
    b.classList.add("show");
    setTimeout(() => b.classList.remove("show"), 1200);
}
function doSearch() {
    const w = document.getElementById("inputWord").value.trim();
    const types = Array.from(
    document.querySelectorAll('input[name="rhymeType"]:checked')
    ).map(i => i.value);
    if (w && !hasSearched) {
    hasSearched = true;
    document.getElementById("app").classList.add("expanded");
    }
    let all = [];
    if (w) types.forEach(t => (all = all.concat(matchRhyme(w, t))));
    all = dedupe(all);
    renderResults(all, types);
}
function scheduleSearch() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(doSearch, 150);
}
window.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (window.SpeechRecognition) {
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    let recognizing = false;
    const micBtn = document.getElementById('micBtn');
    const inputEl = document.getElementById('inputWord');
    micBtn.addEventListener('click', () => {
    if (recognizing) {
        recognition.stop();
    } else {
        recognition.start();
    }
    });
    recognition.addEventListener('start', () => {
    recognizing = true;
    micBtn.classList.add('listening');
    });
    recognition.addEventListener('end', () => {
    recognizing = false;
    micBtn.classList.remove('listening');
    if (micBtn.classList.contains('listening')) {
        recognition.start();
    }
    });
    recognition.addEventListener('result', (event) => {
    const { transcript } = event.results[event.resultIndex][0];
    const word = transcript.trim().split(/\s+/).pop();
    inputEl.value = word;
    doSearch();
    });
}
window.onload = loadCMU;
document.getElementById("inputWord").addEventListener("input", scheduleSearch);
document.querySelectorAll('input[name="rhymeType"]').forEach(cb => cb.addEventListener("change", scheduleSearch));