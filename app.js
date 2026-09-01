const wordSets = [
  ["lantern", "meadow", "pepper", "ribbon", "harbor"],
  ["velvet", "comet", "pocket", "willow", "copper"],
  ["thimble", "orchard", "marble", "candle", "sparrow"],
  ["lilac", "window", "acorn", "teacup", "island"],
  ["maple", "button", "cloud", "basket", "ginger"],
];

const symbols = ["○", "△", "□", "◇", "☆", "+", "≈", "⌁"];
const gameLabels = {
  words: "Word Fade",
  numbers: "Catch the Number",
  symbols: "Sequence Stream",
};
const state = {
  score: 0,
  rounds: { words: 1, numbers: 1, symbols: 1 },
  wordSet: [],
  recalledWords: [],
  number: "",
  symbolSequence: [],
  symbolAnswer: [],
  medicationTasks: [],
  timers: [],
};

const byId = (id) => document.getElementById(id);
const wait = (milliseconds) => new Promise((resolve) => {
  const timer = window.setTimeout(resolve, milliseconds);
  state.timers.push(timer);
});

function clearTimers() {
  state.timers.forEach(window.clearTimeout);
  state.timers = [];
}

function updateScore(points) {
  state.score += points;
  byId("session-score").textContent = state.score;
}

function updateRound(game) {
  document.querySelector(`[data-round="${game}"]`).textContent = state.rounds[game];
}

function setResult(game, message, isMiss = false) {
  const result = byId(`${game}-result`);
  result.textContent = message;
  result.classList.toggle("is-miss", isMiss);
}

function clearResult(game) {
  setResult(game, "");
}

function shuffled(items) {
  return [...items].sort(() => Math.random() - 0.5);
}

function showRoute() {
  clearTimers();
  const route = window.location.hash.replace(/^#\/?/, "");
  const [, game] = route.match(/^game\/(words|numbers|symbols)$/) || [];
  const isGameRoute = Boolean(game);

  byId("home-view").hidden = isGameRoute;
  byId("game-view").hidden = !isGameRoute;
  byId("site-footer").hidden = isGameRoute;

  document.querySelectorAll(".game-panel").forEach((panel) => {
    const isActive = isGameRoute && panel.dataset.panel === game;
    panel.hidden = !isActive;
    panel.classList.toggle("is-active", isActive);
  });

  if (isGameRoute) {
    byId("game-window-label").textContent = gameLabels[game];
    resetGameView(game);
    document.title = `${gameLabels[game]} — Drift Lab`;
  } else {
    Object.keys(gameLabels).forEach(resetGameView);
    document.title = "Drift Lab — Memory Arcade";
  }

  window.scrollTo({ top: 0, behavior: "instant" });
}

function resetGameView(game) {
  if (game === "words") {
    byId("word-cloud").innerHTML = '<span class="word-placeholder">ready when you are</span>';
    byId("word-cloud").hidden = false;
    byId("word-recall").hidden = true;
    byId("check-words").hidden = true;
    byId("start-words").hidden = false;
    byId("start-words").disabled = false;
    byId("start-words").textContent = "Start word fade";
    byId("words-instruction").textContent = "Press start, then memorize every word.";
    state.recalledWords = [];
    byId("word-answers").innerHTML = "";
    byId("word-input").value = "";
  }

  if (game === "numbers") {
    byId("number-display").hidden = false;
    byId("number-display").classList.remove("is-hiding");
    byId("number-display").textContent = "— — — — — —";
    byId("number-entry").hidden = true;
    byId("number-input").value = "";
    byId("check-number").hidden = true;
    byId("start-numbers").hidden = false;
    byId("start-numbers").disabled = false;
    byId("start-numbers").textContent = "Show me a number";
    byId("numbers-instruction").textContent = "A six-digit number appears briefly. Catch it.";
  }

  if (game === "symbols") {
    byId("symbol-stream").hidden = false;
    byId("symbol-stream").innerHTML = "<span>?</span><span>?</span><span>?</span><span>?</span>";
    byId("symbol-recall").hidden = true;
    byId("clear-symbols").hidden = true;
    byId("start-symbols").hidden = false;
    byId("start-symbols").disabled = false;
    byId("start-symbols").textContent = "Start the stream";
    byId("symbols-instruction").textContent = "Watch the stream of four symbols, in order.";
    state.symbolAnswer = [];
    renderSymbolAnswer();
  }

  clearResult(game);
}

async function startWordGame() {
  clearTimers();
  clearResult("words");
  state.wordSet = shuffled(wordSets[Math.floor(Math.random() * wordSets.length)]);
  state.recalledWords = [];

  const startButton = byId("start-words");
  startButton.disabled = true;
  startButton.textContent = "Hold these words…";
  byId("words-instruction").textContent = "Five words. Five seconds. Read each one.";
  byId("word-answers").innerHTML = "";
  byId("word-recall").hidden = true;
  byId("word-cloud").hidden = false;

  byId("word-cloud").innerHTML = state.wordSet
    .map((word, index) => `<span class="memory-word" style="animation-delay:${index * 90}ms">${word}</span>`)
    .join("");

  await wait(5000);
  document.querySelectorAll(".memory-word").forEach((word, index) => {
    word.style.animationDelay = `${index * 65}ms`;
    word.classList.add("is-fading");
  });
  await wait(850);

  byId("word-cloud").hidden = true;
  byId("word-recall").hidden = false;
  byId("check-words").hidden = false;
  startButton.hidden = true;
  byId("words-instruction").textContent = "Add every word you can recover, in any order.";
  byId("word-input").focus();
}

function addRecalledWord() {
  const input = byId("word-input");
  const word = input.value.trim().toLowerCase().replace(/[^a-z'-]/g, "");
  if (!word || state.recalledWords.includes(word)) {
    input.value = "";
    return;
  }

  state.recalledWords.push(word);
  const chip = document.createElement("span");
  chip.className = "answer-chip";
  chip.textContent = word;
  byId("word-answers").append(chip);
  input.value = "";
  input.focus();
}

function checkWords() {
  addRecalledWord();
  const correct = state.recalledWords.filter((word) => state.wordSet.includes(word));
  const missed = state.wordSet.filter((word) => !correct.includes(word));
  const points = correct.length * 2;
  updateScore(points);

  if (missed.length === 0) {
    setResult("words", `Perfect recall — all five words returned. +${points} points.`);
  } else {
    setResult(
      "words",
      `${correct.length} of 5 remembered. The drifting words were: ${missed.join(", ")}. +${points} points.`,
      true,
    );
  }

  state.rounds.words += 1;
  updateRound("words");
  byId("check-words").hidden = true;
  byId("start-words").hidden = false;
  byId("start-words").disabled = false;
  byId("start-words").textContent = "Play another set";
}

async function startNumberGame() {
  clearTimers();
  clearResult("numbers");
  state.number = String(Math.floor(100000 + Math.random() * 900000));

  const startButton = byId("start-numbers");
  startButton.disabled = true;
  startButton.textContent = "Catch it…";
  byId("numbers-instruction").textContent = "Keep all six digits together.";
  byId("number-entry").hidden = true;
  byId("number-display").hidden = false;
  byId("number-display").classList.remove("is-hiding");
  byId("number-display").textContent = state.number;

  await wait(4000);
  byId("number-display").classList.add("is-hiding");
  await wait(350);

  byId("number-display").hidden = true;
  byId("number-entry").hidden = false;
  byId("check-number").hidden = false;
  startButton.hidden = true;
  byId("numbers-instruction").textContent = "Now type the number exactly as it appeared.";
  byId("number-input").focus();
}

function checkNumber() {
  const guess = byId("number-input").value;
  if (!/^\d{6}$/.test(guess)) {
    setResult("numbers", "Enter exactly six digits before checking.", true);
    return;
  }

  const isCorrect = guess === state.number;
  updateScore(isCorrect ? 10 : 0);
  setResult(
    "numbers",
    isCorrect
      ? "Caught cleanly — every digit is right. +10 points."
      : `That one slipped away. The number was ${state.number}.`,
    !isCorrect,
  );

  state.rounds.numbers += 1;
  updateRound("numbers");
  byId("number-entry").hidden = true;
  byId("check-number").hidden = true;
  byId("start-numbers").hidden = false;
  byId("start-numbers").disabled = false;
  byId("start-numbers").textContent = "Catch another number";
}

function buildSymbolKeypad() {
  byId("symbol-keypad").innerHTML = symbols
    .map((symbol) => `<button class="symbol-key" type="button" data-symbol="${symbol}" aria-label="Add ${symbol}">${symbol}</button>`)
    .join("");
}

async function startSymbolGame() {
  clearTimers();
  clearResult("symbols");
  state.symbolSequence = Array.from({ length: 4 }, () => symbols[Math.floor(Math.random() * symbols.length)]);
  state.symbolAnswer = [];
  renderSymbolAnswer();

  const startButton = byId("start-symbols");
  startButton.disabled = true;
  startButton.textContent = "Watch closely…";
  byId("symbols-instruction").textContent = "Four symbols are moving through the stream.";
  byId("symbol-recall").hidden = true;
  byId("symbol-stream").hidden = false;
  byId("symbol-stream").innerHTML = state.symbolSequence.map((symbol) => `<span>${symbol}</span>`).join("");

  const streamItems = [...byId("symbol-stream").children];
  for (const item of streamItems) {
    item.classList.add("is-lit");
    await wait(700);
    item.classList.remove("is-lit");
    await wait(150);
  }

  await wait(300);
  byId("symbol-stream").hidden = true;
  byId("symbol-recall").hidden = false;
  byId("clear-symbols").hidden = false;
  startButton.hidden = true;
  byId("symbols-instruction").textContent = "Tap the same four symbols in the same order.";
  byId("symbol-keypad").querySelector("button").focus();
}

function addSymbol(symbol) {
  if (state.symbolAnswer.length >= 4) return;
  state.symbolAnswer.push(symbol);
  renderSymbolAnswer();

  if (state.symbolAnswer.length === 4) {
    checkSymbols();
  }
}

function renderSymbolAnswer() {
  const slots = [...byId("symbol-answer").children];
  slots.forEach((slot, index) => {
    slot.textContent = state.symbolAnswer[index] || "";
  });
}

function checkSymbols() {
  const isCorrect = state.symbolAnswer.every((symbol, index) => symbol === state.symbolSequence[index]);
  updateScore(isCorrect ? 10 : 0);
  setResult(
    "symbols",
    isCorrect
      ? "Sequence restored — all four symbols landed in order. +10 points."
      : `The stream was ${state.symbolSequence.join("  ")}. Try another pass.`,
    !isCorrect,
  );

  state.rounds.symbols += 1;
  updateRound("symbols");
  byId("clear-symbols").hidden = true;
  byId("start-symbols").hidden = false;
  byId("start-symbols").disabled = false;
  byId("start-symbols").textContent = "Run another stream";
}

function resetSession() {
  clearTimers();
  state.score = 0;
  state.rounds = { words: 1, numbers: 1, symbols: 1 };
  byId("session-score").textContent = "0";
  Object.keys(state.rounds).forEach((game) => {
    updateRound(game);
    resetGameView(game);
  });
}

async function askHelper(event) {
  event.preventDefault();
  const questionInput = byId("helper-question");
  const answerBox = byId("helper-answer");
  const submitButton = byId("ask-helper");
  const question = questionInput.value.trim();

  if (!question) {
    answerBox.hidden = false;
    answerBox.classList.add("is-error");
    answerBox.textContent = "Please write a question first.";
    questionInput.focus();
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = "Thinking briefly…";
  answerBox.hidden = false;
  answerBox.classList.remove("is-error");
  answerBox.textContent = "Finding the clearest short answer…";

  try {
    const response = await fetch("/api/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "The helper could not answer right now.");
    }

    answerBox.textContent = data.answer;
  } catch (error) {
    answerBox.classList.add("is-error");
    answerBox.textContent = error instanceof Error
      ? error.message
      : "The helper could not answer right now. Please try again.";
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Ask clearly";
  }
}

function setMedicationStatus(message) {
  byId("medication-status").textContent = message;
}

function formatMedicationTime(value) {
  const [hours, minutes] = value.split(":").map(Number);
  const date = new Date(2000, 0, 1, hours, minutes);
  return new Intl.DateTimeFormat([], { hour: "numeric", minute: "2-digit" }).format(date);
}

function renderMedicationTasks() {
  const list = byId("medication-list");
  list.innerHTML = "";

  if (state.medicationTasks.length === 0) {
    const empty = document.createElement("li");
    empty.className = "task-empty";
    empty.textContent = "No tasks.";
    list.append(empty);
    return;
  }

  state.medicationTasks.forEach((task) => {
    const item = document.createElement("li");
    item.className = `task-item${task.completed ? " is-complete" : ""}`;

    const toggle = document.createElement("button");
    toggle.className = "task-toggle";
    toggle.type = "button";
    toggle.dataset.taskAction = "toggle";
    toggle.dataset.taskId = task.id;
    toggle.setAttribute("aria-pressed", String(task.completed));
    toggle.setAttribute("aria-label", task.completed ? `Mark ${task.name} as not taken` : `Mark ${task.name} as taken`);
    toggle.textContent = task.completed ? "✓" : "";

    const name = document.createElement("span");
    name.className = "task-name";
    name.textContent = task.name;

    const time = document.createElement("time");
    time.className = "task-time";
    time.dateTime = task.medicationTime;
    time.textContent = formatMedicationTime(task.medicationTime);

    const remove = document.createElement("button");
    remove.className = "task-delete";
    remove.type = "button";
    remove.dataset.taskAction = "delete";
    remove.dataset.taskId = task.id;
    remove.setAttribute("aria-label", `Delete ${task.name}`);
    remove.textContent = "×";

    item.append(toggle, name, time, remove);
    list.append(item);
  });
}

async function medicationRequest(method, body) {
  const response = await fetch("/api/medications", {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Tasks are unavailable right now.");
  return data;
}

async function loadMedicationTasks() {
  setMedicationStatus("Loading…");
  try {
    const data = await medicationRequest("GET");
    state.medicationTasks = data.tasks;
    renderMedicationTasks();
    setMedicationStatus("");
  } catch (error) {
    setMedicationStatus(error instanceof Error ? error.message : "Tasks are unavailable right now.");
  }
}

async function addMedicationTask(event) {
  event.preventDefault();
  const nameInput = byId("medication-name");
  const timeInput = byId("medication-time");
  const submitButton = byId("add-medication");
  submitButton.disabled = true;
  setMedicationStatus("");

  try {
    const data = await medicationRequest("POST", {
      name: nameInput.value.trim(),
      medicationTime: timeInput.value,
    });
    state.medicationTasks.push(data.task);
    state.medicationTasks.sort((first, second) => first.medicationTime.localeCompare(second.medicationTime));
    renderMedicationTasks();
    nameInput.value = "";
    timeInput.value = "";
    nameInput.focus();
  } catch (error) {
    setMedicationStatus(error instanceof Error ? error.message : "Task could not be added.");
  } finally {
    submitButton.disabled = false;
  }
}

async function handleMedicationAction(event) {
  const button = event.target.closest("[data-task-action]");
  if (!button) return;
  const task = state.medicationTasks.find((item) => item.id === button.dataset.taskId);
  if (!task) return;

  button.disabled = true;
  setMedicationStatus("");
  try {
    if (button.dataset.taskAction === "toggle") {
      const data = await medicationRequest("PATCH", { id: task.id, completed: !task.completed });
      state.medicationTasks = state.medicationTasks.map((item) => item.id === task.id ? data.task : item);
    } else {
      await medicationRequest("DELETE", { id: task.id });
      state.medicationTasks = state.medicationTasks.filter((item) => item.id !== task.id);
    }
    renderMedicationTasks();
  } catch (error) {
    setMedicationStatus(error instanceof Error ? error.message : "Task could not be updated.");
    button.disabled = false;
  }
}

byId("start-words").addEventListener("click", startWordGame);
byId("add-word").addEventListener("click", addRecalledWord);
byId("check-words").addEventListener("click", checkWords);
byId("word-input").addEventListener("keydown", (event) => {
  if (event.key === "Enter") addRecalledWord();
});

byId("start-numbers").addEventListener("click", startNumberGame);
byId("check-number").addEventListener("click", checkNumber);
byId("number-input").addEventListener("input", (event) => {
  event.target.value = event.target.value.replace(/\D/g, "").slice(0, 6);
});
byId("number-input").addEventListener("keydown", (event) => {
  if (event.key === "Enter") checkNumber();
});

byId("start-symbols").addEventListener("click", startSymbolGame);
byId("clear-symbols").addEventListener("click", () => {
  state.symbolAnswer = [];
  renderSymbolAnswer();
});
byId("symbol-keypad").addEventListener("click", (event) => {
  const button = event.target.closest("[data-symbol]");
  if (button) addSymbol(button.dataset.symbol);
});

byId("reset-session").addEventListener("click", resetSession);
byId("helper-form").addEventListener("submit", askHelper);
byId("helper-question").addEventListener("input", (event) => {
  byId("question-count").textContent = event.target.value.length;
});
byId("medication-form").addEventListener("submit", addMedicationTask);
byId("medication-list").addEventListener("click", handleMedicationAction);
window.addEventListener("hashchange", showRoute);

buildSymbolKeypad();
showRoute();
loadMedicationTasks();