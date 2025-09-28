// ---------------- ELEMENTS ----------------
const wordEl = document.getElementById("word");
const defEl = document.getElementById("definition");
const exampleEl = document.getElementById("example");
const koEl = document.getElementById("korean");
const favListEl = document.getElementById("favList");
const cardEl = document.getElementById("card");

const manualInput = document.getElementById("manualInput");
const addWordsBtn = document.getElementById("addWords");

const startTestBtn = document.getElementById("startTest");
const stopTestBtn = document.getElementById("stopTest");

const testArea = document.getElementById("testArea");
const testQuestion = document.getElementById("testQuestion");
const testAnswer = document.getElementById("testAnswer");
const submitAnswer = document.getElementById("submitAnswer");
const nextQuestion = document.getElementById("nextQuestion");
const testFeedback = document.getElementById("testFeedback");

// ---------------- DATA ----------------
let teasWords = [];
let idx = 0;
let translationsCache = {};
let exampleCache = {};
let favorites = [];
let testPool = [];
let currentTestIndex = 0;

// ---------------- THEME ----------------
const themeBtn = document.getElementById("toggleTheme");
const savedTheme = localStorage.getItem("theme") || "light";
if (savedTheme === "dark") document.documentElement.setAttribute("data-theme","dark");
themeBtn.onclick = () => {
  const t = document.documentElement.getAttribute("data-theme")==="dark"?"light":"dark";
  document.documentElement.setAttribute("data-theme", t);
  localStorage.setItem("theme", t);
};

// ---------------- FAVORITES ----------------
function getSaved() { 
  try { return JSON.parse(localStorage.getItem("teas_saved")||"[]"); } 
  catch { return []; } 
}
function setSaved(arr) { 
  localStorage.setItem("teas_saved",JSON.stringify(arr)); 
  renderSaved(); 
}
function renderSaved() {
  const s = getSaved();
  if (!s.length){ favListEl.innerHTML="(none)"; return; }
  favListEl.innerHTML="";
  s.forEach(w=>{
    const div=document.createElement("div");
    div.className="fav-item";
    div.innerHTML=`<div>${w}</div><div><button class='remove' data-word='${w}'>Remove</button></div>`;
    favListEl.appendChild(div);
  });
  favListEl.querySelectorAll(".remove").forEach(b=>{
    b.onclick=()=>{ 
      const w=b.dataset.word; 
      const arr=getSaved().filter(x=>x!==w); 
      setSaved(arr); 
    }
  });
}
renderSaved();

// ---------------- FETCH DEFINITION ----------------
async function fetchDefinition(word){
  try{
    const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
    const data = await res.json();
    return data[0]?.meanings?.[0]?.definitions?.[0]?.definition || "(definition not found)";
  } catch { return "(definition unavailable)"; }
}

// ---------------- OPENAI EXAMPLE ----------------
async function generateExample(word){
  if(exampleCache[word]) return exampleCache[word];
  try {
    const res = await fetch("http://localhost:3000/generate-example", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ word })
    });
    const data = await res.json();
    exampleCache[word] = data.example || "(example unavailable)";
    return exampleCache[word];
  } catch (err) {
    console.error(err);
    return "(example unavailable)";
  }
}

// ---------------- TRANSLATE ----------------
async function translateToKorean(text){
  if (translationsCache[text]) return translationsCache[text];
  try{
    const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|ko`);
    const data = await res.json();
    translationsCache[text] = data.responseData.translatedText || "(no translation)";
    return translationsCache[text];
  } catch { return "(translation unavailable)"; }
}

// ---------------- SHOW WORD ----------------
async function showWord(i){
  if (!teasWords.length) return;
  idx=i;
  const word = teasWords[i];
  wordEl.textContent = word;
  defEl.textContent = "Loading...";
  exampleEl.textContent = "Generating example...";
  koEl.textContent = "Loading translation...";

  const definition = await fetchDefinition(word);
  defEl.textContent = definition;

  const example = await generateExample(word);
  exampleEl.textContent = example;

  koEl.textContent = await translateToKorean(definition);
  cardEl.classList.remove("flipped");
}

// ---------------- NAVIGATION ----------------
document.getElementById("randomWord").onclick = ()=>showWord(Math.floor(Math.random()*teasWords.length));
document.getElementById("next").onclick = ()=>showWord((idx+1)%teasWords.length);
document.getElementById("prev").onclick = ()=>showWord((idx-1+teasWords.length)%teasWords.length);

// ---------------- FLIP ----------------
document.getElementById("flip").onclick = ()=>cardEl.classList.toggle("flipped");

// ---------------- SAVE FAVORITE ----------------
document.getElementById("saveWord").onclick = ()=>{
  const w = wordEl.textContent;
  if(!w) return;
  const arr=getSaved();
  if(!arr.includes(w)){ arr.push(w); setSaved(arr); }
};

// ---------------- CLEAR FAVORITES ----------------
document.getElementById("clearSaved").onclick = ()=>{ if(confirm("Clear all favorites?")) setSaved([]); };

// ---------------- UPLOAD FILE ----------------
document.getElementById("uploadFile").addEventListener("change", function(e){
  const file=e.target.files[0]; if(!file) return;
  const reader = new FileReader();
  reader.onload = function(){
    if(file.name.endsWith(".json")) teasWords=JSON.parse(reader.result);
    else if(file.name.endsWith(".csv")) teasWords=csvToJson(reader.result);
    showWord(0);
  };
  reader.readAsText(file);
});

// ---------------- CSV PARSER ----------------
function csvToJson(csvText){
  const lines = csvText.split("\n").filter(l=>l.trim()!=="");
  return lines.map(line=>line.split(",")[0].trim());
}

// ---------------- MANUAL ADD ----------------
addWordsBtn.onclick = ()=>{
  const newWords = manualInput.value.split(",").map(w=>w.trim()).filter(w=>w);
  teasWords = teasWords.concat(newWords);
  manualInput.value="";
  if(teasWords.length) showWord(teasWords.length-1);
}

// ---------------- PRELOAD WORDS ----------------
async function loadWords() {
  try {
    const res = await fetch("words.json"); // make sure this file is served
    teasWords = await res.json();
    if(teasWords.length) showWord(0);
  } catch(err) {
    console.error("Failed to load words.json:", err);
    teasWords = ["Abstain","Abrasive","Acclimate"]; // fallback
    showWord(0);
  }
}
loadWords();

// ---------------- RANDOM TEST ----------------
function renderTestQuestion(){
  if(currentTestIndex>=testPool.length){ 
    alert("Test complete!"); 
    testArea.classList.add("hidden"); 
    startTestBtn.disabled = false;
    return; 
  }
  testQuestion.textContent = `Define: ${testPool[currentTestIndex]}`;
  testAnswer.value="";
  testFeedback.textContent="";
}

startTestBtn.onclick = () => {
  if (!teasWords.length) {
    alert("No words available for test.");
    return;
  }
  testPool = [...teasWords].sort(() => Math.random() - 0.5);
  currentTestIndex = 0;
  testArea.classList.remove("hidden");
  renderTestQuestion();
  startTestBtn.disabled = true; // prevent multiple starts
};

stopTestBtn.onclick = () => {
  testArea.classList.add("hidden");
  testPool = [];
  currentTestIndex = 0;
  testAnswer.value = "";
  testFeedback.textContent = "";
  startTestBtn.disabled = false;
};

submitAnswer.onclick = async () => {
  const userAns = testAnswer.value.trim().toLowerCase();
  const word = testPool[currentTestIndex];
  const def = await fetchDefinition(word);

  if (!userAns) {
    testFeedback.textContent = "Please type an answer!";
    return;
  }

  if (userAns.length < 3) {
    testFeedback.textContent = "Your answer is too short!";
    return;
  }

  const defWords = def.toLowerCase().split(/\W+/);
  const userWords = userAns.split(/\W+/);

  const correct = userWords.every(w => defWords.includes(w));

  if (correct) {
    testFeedback.textContent = "Correct!";
  } else {
    testFeedback.textContent = `Incorrect! Correct: ${def}`;
  }
};

nextQuestion.onclick = () => {
  currentTestIndex++;
  renderTestQuestion();
};
