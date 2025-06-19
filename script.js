let cmu = {},
  wordList = [],
  debounceTimer,
  hasSearched = false;
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
  const targetPronList = cmu[word];
  const out = [];
  wordList.forEach((cand) => {
    if (cand === word) return;
    cmu[cand].forEach((pron) => {
      targetPronList.forEach((tpron) => {
        let ok = false;
        if (type === "perfect") ok = getRhymePart(pron) === getRhymePart(tpron);
        else if (type === "assonance")
          ok = getAssonance(pron).join("") === getAssonance(tpron).join("");
        else if (type === "slant")
          ok =
            getRhymePart(pron).replace(/\d/g, "") ===
            getRhymePart(tpron).replace(/\d/g, "");
        else if (type === "pararhyme")
          ok =
            pron.replace(/[AEIOU][A-Z]*[0-2]?/g, "") ===
            tpron.replace(/[AEIOU][A-Z]*[0-2]?/g, "");
        else if (type === "multisyllabic")
          ok =
            getRhymePart(pron) === getRhymePart(tpron) &&
            countSyllables(pron) > 1;
        else if (type === "eye") ok = cand.slice(-3) === word.slice(-3);
        if (ok)
          out.push({
            word: cand.replace(/\(\d+\)$/, "").toLowerCase(),
            syl: countSyllables(pron),
            type,
          });
      });
    });
  });
  return out;
}
function dedupe(rows) {
  const map = {};
  rows.forEach((r) => {
    const w = r.word;
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
    container.innerHTML =
      "<p style='text-align:center;color:var(--text)'>No matches found.</p>";
    return;
  }
  types.forEach((type) => {
    const group = rows.filter((r) => r.type === type);
    if (!group.length) return;
    const col = document.createElement("div");
    col.className = "rhyme-col";
    col.innerHTML = `<h2>${type}</h2><div class="words"></div>`;
    const wordsEl = col.querySelector(".words");
    group
      .sort((a, b) => a.syl - b.syl)
      .forEach((r) => {
        const btn = document.createElement("div");
        btn.className = "word";
        btn.textContent = r.word;
        btn.onclick = () => copyWord(r.word);
        wordsEl.appendChild(btn);
      });
    container.appendChild(col);
  });
}
function copyWord(w) {
  navigator.clipboard.writeText(w);
  const b = document.getElementById("banner");
  b.textContent = `Copied "${w}"`;
  b.classList.add("show");
  setTimeout(() => b.classList.remove("show"), 1200);
}
function matchTwoWordRhyme(word1, word2, type) {
  const w1 = normalize(word1);
  const w2 = normalize(word2);
  if (!cmu[w1] || !cmu[w2]) return [];
  const pronList1 = cmu[w1];
  const pronList2 = cmu[w2];
  const out = [];
  wordList.forEach((cand) => {
    const candNorm = cand;
    if (candNorm === w1 || candNorm === w2) return;
    cmu[candNorm].forEach((pronCand) => {
      const phones = pronCand.split(" ");
      for (let split = 1; split < phones.length; split++) {
        const part1Phones = phones.slice(0, split).join(" ");
        const part2Phones = phones.slice(split).join(" ");
        let rhymes1 = false,
          rhymes2 = false;
        for (const p1 of pronList1) {
          if (rhymeCheckPart(p1, part1Phones, type)) {
            rhymes1 = true;
            break;
          }
        }
        if (!rhymes1) continue;
        for (const p2 of pronList2) {
          if (rhymeCheckPart(p2, part2Phones, type)) {
            rhymes2 = true;
            break;
          }
        }
        if (!rhymes2) continue;
        out.push({
          word: candNorm.replace(/\(\d+\)$/, "").toLowerCase(),
          syl: countSyllables(pronCand),
          type,
        });
        break;
      }
    });
  });
  return out;
}
function rhymeCheckPart(pronTarget, pronCandPart, type) {
  if (type === "perfect") {
    return getRhymePart(pronCandPart) === getRhymePart(pronTarget);
  } else if (type === "assonance") {
    return (
      getAssonance(pronCandPart).join("") === getAssonance(pronTarget).join("")
    );
  } else if (type === "slant") {
    return (
      getRhymePart(pronCandPart).replace(/\d/g, "") ===
      getRhymePart(pronTarget).replace(/\d/g, "")
    );
  } else if (type === "pararhyme") {
    return (
      pronCandPart.replace(/[AEIOU][A-Z]*[0-2]?/g, "") ===
      pronTarget.replace(/[AEIOU][A-Z]*[0-2]?/g, "")
    );
  } else if (type === "multisyllabic") {
    return (
      getRhymePart(pronCandPart) === getRhymePart(pronTarget) &&
      countSyllables(pronCandPart) > 1
    );
  } else if (type === "eye") {
    return false;
  }
  return false;
}
function doSearch() {
  const types = Array.from(
    document.querySelectorAll('input[name="rhymeType"]:checked')
  ).map((i) => i.value);
  const twoWordMode = document.getElementById("twoWordToggle").checked;
  if (!hasSearched) {
    hasSearched = true;
    document.getElementById("app").classList.add("expanded");
  }
  let all = [];
  if (!twoWordMode) {
    const w = document.getElementById("inputWord").value.trim();
    if (w) {
      types.forEach((t) => {
        all = all.concat(matchRhyme(w, t));
      });
    }
  } else {
    const w1 = document.getElementById("inputWord1").value.trim();
    const w2 = document.getElementById("inputWord2").value.trim();
    if (w1 && w2) {
      types.forEach((t) => {
        all = all.concat(matchTwoWordRhyme(w1, w2, t));
      });
    } else {
      all = [];
    }
  }
  all = dedupe(all);
  renderResults(all, types);
}
function scheduleSearch() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(doSearch, 150);
}
window.SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;
if (window.SpeechRecognition) {
  const recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = false;
  let recognizing = false;
  const micBtn = document.getElementById("micBtn");
  const inputEl = document.getElementById("inputWord");
  const inputEl1 = document.getElementById("inputWord1");
  const inputEl2 = document.getElementById("inputWord2");
  micBtn.addEventListener("click", () => {
    if (recognizing) {
      recognition.stop();
    } else {
      recognition.start();
    }
  });
  recognition.addEventListener("start", () => {
    recognizing = true;
    micBtn.classList.add("listening");
  });
  recognition.addEventListener("end", () => {
    recognizing = false;
    micBtn.classList.remove("listening");
    if (micBtn.classList.contains("listening")) {
      recognition.start();
    }
  });
  recognition.addEventListener("result", (event) => {
    const transcript = Array.from(event.results)
      .slice(event.resultIndex)
      .map((r) => r[0].transcript)
      .join(" ")
      .trim();
    const twoWordMode = document.getElementById("twoWordToggle").checked;
    if (!twoWordMode) {
      const word = transcript.split(/\s+/).pop() || "";
      inputEl.value = word;
    } else {
      const words = transcript.split(/\s+/).filter((s) => s);
      if (words.length >= 2) {
        inputEl1.value = words[words.length - 2];
        inputEl2.value = words[words.length - 1];
      } else if (words.length === 1) {
        inputEl1.value = words[0];
      }
    }
    doSearch();
  });
}
const twoWordToggleEl = document.getElementById("twoWordToggle");
twoWordToggleEl.addEventListener("change", () => {
  const twoWordMode = twoWordToggleEl.checked;
  const singleEl = document.getElementById("inputWord");
  const in1 = document.getElementById("inputWord1");
  const in2 = document.getElementById("inputWord2");
  if (twoWordMode) {
    singleEl.style.display = "none";
    in1.style.display = "";
    in2.style.display = "";
    singleEl.value = "";
    in1.value = "";
    in2.value = "";
  } else {
    singleEl.style.display = "";
    in1.style.display = "none";
    in2.style.display = "none";
    in1.value = "";
    in2.value = "";
    singleEl.value = "";
  }
  doSearch();
});
document.getElementById("inputWord").addEventListener("input", scheduleSearch);
document.getElementById("inputWord1").addEventListener("input", scheduleSearch);
document.getElementById("inputWord2").addEventListener("input", scheduleSearch);
document
  .querySelectorAll('input[name="rhymeType"]')
  .forEach((cb) => cb.addEventListener("change", scheduleSearch));
window.onload = loadCMU;
