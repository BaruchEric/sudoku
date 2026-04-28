const SOLUTION =
  "534678912672195348198342567859761423426853791713924856961537284287419635345286179";

const DIGITS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];
const INDICES = Array.from({ length: 81 }, (_, i) => i);
const NINE = [0, 1, 2, 3, 4, 5, 6, 7, 8];

const PUZZLES = {
  easy:
    "53..7...." +
    "6..195..." +
    ".98....6." +
    "8...6...3" +
    "4..8.3..1" +
    "7...2...6" +
    ".6....28." +
    "...419..5" +
    "....8..79",
  medium:
    "53..7...." +
    "6..195..." +
    ".98......" +
    "8...6...3" +
    "4..8.3..1" +
    "7.......6" +
    "......28." +
    "...419..5" +
    "....8..79",
  hard:
    "5...7...." +
    "..2195..." +
    ".9.....6." +
    "8.....2.3" +
    ".2.8....1" +
    "7...2...." +
    ".6....2.." +
    "...4.9..5" +
    "....8..7.",
};

function buildPeers(index) {
  const row = Math.floor(index / 9);
  const col = index % 9;
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;
  const peers = new Set();
  for (let p = 0; p < 9; p += 1) {
    peers.add(row * 9 + p);
    peers.add(p * 9 + col);
  }
  for (let r = 0; r < 3; r += 1) {
    for (let c = 0; c < 3; c += 1) {
      peers.add((boxRow + r) * 9 + (boxCol + c));
    }
  }
  peers.delete(index);
  return peers;
}

const PEERS = INDICES.map(buildPeers);

const STORAGE_KEY = "sunlit-sudoku:save:v1";
const THEME_STORAGE_KEY = "sunlit-sudoku:theme:v1";
const TIMER_SAVE_INTERVAL_MS = 10_000;
const THEMES = ["auto", "light", "dark"];
const THEME_COLORS = { light: "#f4ede0", dark: "#11161a" };
const THEME_ICONS = { auto: "◐", light: "☀", dark: "☾" };

const boardElement = document.querySelector("#sudoku-board");
const liveRegion = document.querySelector("#live-region");
const difficultyLabel = document.querySelector("#difficulty-label");
const mistakesCount = document.querySelector("#mistakes-count");
const timerLabel = document.querySelector("#timer-label");
const progressLabel = document.querySelector("#progress-label");
const statusMessage = document.querySelector("#status-message");
const filledCount = document.querySelector("#filled-count");
const correctCount = document.querySelector("#correct-count");
const noteCount = document.querySelector("#note-count");
const notesToggle = document.querySelector("#notes-toggle");
const highlightToggle = document.querySelector("#highlight-toggle");
const rainbowToggle = document.querySelector("#rainbow-toggle");
const newGameButton = document.querySelector("#new-game-button");
const hintButton = document.querySelector("#hint-button");
const eraseButton = document.querySelector("#erase-button");
const solveButton = document.querySelector("#solve-button");
const checkButton = document.querySelector("#check-button");
const undoButton = document.querySelector("#undo-button");
const pauseButton = document.querySelector("#pause-button");
const pauseButtonLabel = document.querySelector("#pause-button-label");
const pauseOverlay = document.querySelector("#pause-overlay");
const resumeButton = document.querySelector("#resume-button");
const progressFill = document.querySelector("#progress-fill");
const cellPopover = document.querySelector("#cell-popover");
const popoverEraseButton = document.querySelector("#popover-erase");
const popoverCloseButton = document.querySelector("#popover-close");
const celebration = document.querySelector("#celebration");
const celebrationMessage = document.querySelector("#celebration-message");
const playAgainButton = document.querySelector("#play-again-button");
const themeToggle = document.querySelector("#theme-toggle");
const themeToggleIcon = themeToggle?.querySelector(".theme-toggle-icon");
const themeToggleLabel = themeToggle?.querySelector(".theme-toggle-label");
const themeColorMeta = document.querySelector("#theme-color-meta");
const numberButtons = document.querySelectorAll(".number-button");
const popoverNumberButtons = document.querySelectorAll(".popover-number");
const difficultyButtons = document.querySelectorAll("[data-difficulty]");

const cellElements = [];

const state = {
  difficulty: "easy",
  solution: [],
  given: new Set(),
  values: [],
  notes: [],
  selectedIndex: null,
  notesMode: false,
  highlightMode: false,
  highlightDigit: "",
  rainbowMode: false,
  mistakes: 0,
  history: [],
  completed: false,
  paused: false,
  elapsedMs: 0,
  runStartedAt: 0,
  timerId: null,
  hydrating: false,
  lastTimerSaveAt: 0,
  themePreference: "auto",
};

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function cellRC(index) {
  return { row: Math.floor(index / 9) + 1, col: (index % 9) + 1 };
}

function setStatus(visible, spoken = visible) {
  statusMessage.textContent = visible;
  announce(spoken);
}

function announce(message) {
  liveRegion.textContent = message;
}

function setToggleButton(button, baseLabel, on) {
  button.classList.toggle("is-active", on);
  button.textContent = on ? `${baseLabel} On` : baseLabel;
}

function applyDifficultySelection(difficulty) {
  difficultyLabel.textContent = capitalize(difficulty);
  difficultyButtons.forEach((button) =>
    button.classList.toggle("is-active", button.dataset.difficulty === difficulty),
  );
}

function applyControlsUI() {
  setToggleButton(notesToggle, "Notes", state.notesMode);
  setToggleButton(highlightToggle, "Highlight", state.highlightMode);
  setToggleButton(rainbowToggle, "Rainbow", state.rainbowMode);
  boardElement.classList.toggle("is-rainbow", state.rainbowMode);
}

function randomInt(max) {
  return Math.floor(Math.random() * max);
}

function shuffle(array) {
  const clone = [...array];
  for (let index = clone.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(index + 1);
    [clone[index], clone[swapIndex]] = [clone[swapIndex], clone[index]];
  }
  return clone;
}

function stringToGrid(boardString) {
  return boardString.split("");
}

function gridToString(grid) {
  return grid.join("");
}

function createTransformPlan(options = {}) {
  const shuffled = shuffle(DIGITS);
  const digitMap = new Map(DIGITS.map((digit, index) => [digit, shuffled[index]]));
  return {
    digitMap,
    rowOrders: shuffle([0, 1, 2]).flatMap((band) =>
      shuffle([0, 1, 2]).map((offset) => band * 3 + offset),
    ),
    colOrders: shuffle([0, 1, 2]).flatMap((stack) =>
      shuffle([0, 1, 2]).map((offset) => stack * 3 + offset),
    ),
    shouldTranspose: options.transpose ?? Math.random() > 0.5,
  };
}

function transformBoardString(boardString, plan) {
  const chars = stringToGrid(boardString);
  const { digitMap, rowOrders, colOrders, shouldTranspose } = plan;
  const transformed = Array.from({ length: 81 }, () => ".");
  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      let sourceRow = rowOrders[row];
      let sourceCol = colOrders[col];
      if (shouldTranspose) {
        [sourceRow, sourceCol] = [sourceCol, sourceRow];
      }
      const sourceIndex = sourceRow * 9 + sourceCol;
      const targetIndex = row * 9 + col;
      const value = chars[sourceIndex];
      transformed[targetIndex] = digitMap.get(value) ?? value;
    }
  }
  return gridToString(transformed);
}

function createPuzzle(difficulty, fixed = false) {
  const basePuzzle = PUZZLES[difficulty];
  if (fixed) {
    return { puzzle: basePuzzle, solution: SOLUTION };
  }
  const plan = createTransformPlan();
  return {
    puzzle: transformBoardString(basePuzzle, plan),
    solution: transformBoardString(SOLUTION, plan),
  };
}

function buildBoard() {
  boardElement.innerHTML = "";
  cellElements.length = 0;
  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      const index = row * 9 + col;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "sudoku-cell";
      button.dataset.index = String(index);
      button.dataset.row = String(row + 1);
      button.dataset.col = String(col + 1);
      button.dataset.bandEdge = row % 3 === 2 && row !== 8 ? "bottom" : "";
      button.dataset.stackEdge = col % 3 === 2 && col !== 8 ? "right" : "";
      button.setAttribute("aria-label", `Row ${row + 1} Column ${col + 1}`);
      button.addEventListener("click", () => handleCellSelection(index));
      boardElement.appendChild(button);
      cellElements.push(button);
    }
  }
}

function currentElapsedMs() {
  if (state.paused || state.runStartedAt === 0) {
    return state.elapsedMs;
  }
  return state.elapsedMs + (Date.now() - state.runStartedAt);
}

function startTimer({ elapsedMs = 0, paused = false } = {}) {
  clearInterval(state.timerId);
  state.elapsedMs = elapsedMs;
  state.paused = paused;
  state.runStartedAt = paused ? 0 : Date.now();
  state.timerId = window.setInterval(handleTimerTick, 1000);
  state.lastTimerSaveAt = Date.now();
  updateTimer();
}

function handleTimerTick() {
  updateTimer();
  if (state.paused || state.completed) {
    return;
  }
  const now = Date.now();
  if (now - state.lastTimerSaveAt >= TIMER_SAVE_INTERVAL_MS) {
    state.lastTimerSaveAt = now;
    saveState();
  }
}

function updateTimer() {
  const elapsed = Math.floor(currentElapsedMs() / 1000);
  const minutes = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const seconds = String(elapsed % 60).padStart(2, "0");
  timerLabel.textContent = `${minutes}:${seconds}${state.paused ? " (paused)" : ""}`;
}

function pauseGame() {
  if (state.paused || state.completed) {
    return;
  }
  state.elapsedMs = currentElapsedMs();
  state.runStartedAt = 0;
  state.paused = true;
  hideCellPopover();
  applyPauseUI();
  updateTimer();
  saveState();
  setStatus("Paused. Resume when you're ready.", "Game paused.");
}

function resumeGame() {
  if (!state.paused || state.completed) {
    return;
  }
  state.runStartedAt = Date.now();
  state.paused = false;
  applyPauseUI();
  updateTimer();
  saveState();
  setStatus("Back to the board.", "Game resumed.");
}

function togglePause() {
  if (state.paused) {
    resumeGame();
  } else {
    pauseGame();
  }
}

function applyPauseUI() {
  pauseOverlay.classList.toggle("hidden", !state.paused);
  pauseOverlay.setAttribute("aria-hidden", state.paused ? "false" : "true");
  pauseButton.classList.toggle("is-active", state.paused);
  pauseButtonLabel.textContent = state.paused ? "Resume" : "Pause";
  pauseButton.setAttribute(
    "title",
    state.paused ? "Resume game" : "Pause game",
  );
  boardElement.setAttribute("aria-hidden", state.paused ? "true" : "false");
}

function startNewGame(difficulty, fixed = false) {
  const { puzzle, solution } = createPuzzle(difficulty, fixed);
  const puzzleGrid = stringToGrid(puzzle);

  state.difficulty = difficulty;
  state.solution = stringToGrid(solution);
  state.values = puzzleGrid.map((char) => (char === "." ? "" : char));
  state.notes = INDICES.map(() => new Set());
  state.given = new Set(
    puzzleGrid
      .map((char, index) => (char !== "." ? index : -1))
      .filter((index) => index !== -1),
  );
  state.selectedIndex = state.values.findIndex((value) => value === "");
  state.notesMode = false;
  state.highlightMode = false;
  state.highlightDigit = "";
  state.rainbowMode = false;
  state.mistakes = 0;
  state.history = [];
  state.completed = false;

  celebration.classList.add("hidden");
  mistakesCount.textContent = "0";
  applyDifficultySelection(difficulty);
  applyControlsUI();

  startTimer();
  applyPauseUI();
  render();
  saveState();

  if (state.selectedIndex !== -1 && state.selectedIndex !== null) {
    cellElements[state.selectedIndex]?.focus();
  }

  const clueCount = state.given.size;
  setStatus(
    difficulty === "hard"
      ? "The quiet squares are carrying the weight."
      : "Find the next clean placement.",
    `Started a new ${difficulty} Sudoku with ${clueCount} clues and ${
      81 - clueCount
    } empty spaces.`,
  );
}

function hideCellPopover() {
  cellPopover.classList.add("hidden");
}

function positionCellPopover(cell) {
  const cellRect = cell.getBoundingClientRect();
  const popoverRect = cellPopover.getBoundingClientRect();
  const gap = 10;
  const viewportPadding = 12;
  const cellCenter = cellRect.left + cellRect.width / 2;
  let left = cellCenter - popoverRect.width / 2;
  let top = cellRect.bottom + gap;

  left = Math.max(
    viewportPadding,
    Math.min(left, window.innerWidth - popoverRect.width - viewportPadding),
  );

  if (top + popoverRect.height > window.innerHeight - viewportPadding) {
    top = cellRect.top - popoverRect.height - gap;
  }

  top = Math.max(
    viewportPadding,
    Math.min(top, window.innerHeight - popoverRect.height - viewportPadding),
  );

  const arrowLeft = Math.max(
    18,
    Math.min(cellCenter - left - 6, popoverRect.width - 30),
  );

  cellPopover.style.left = `${left}px`;
  cellPopover.style.top = `${top}px`;
  cellPopover.style.setProperty("--popover-arrow-left", `${arrowLeft}px`);
}

function showCellPopover(index) {
  if (state.completed || state.given.has(index)) {
    hideCellPopover();
    return;
  }
  const cell = cellElements[index];
  if (!cell) {
    return;
  }
  cellPopover.classList.remove("hidden");
  positionCellPopover(cell);
}

function describeCell(row, col, value, notes, isFixed) {
  let detail;
  if (value) {
    detail = ` value ${value}`;
  } else if (notes.size) {
    detail = ` notes ${[...notes].join(", ")}`;
  } else {
    detail = " empty";
  }
  return `Row ${row} Column ${col}${detail}${isFixed ? ", given clue" : ""}`;
}

function cloneNotes(notes) {
  return notes.map((noteSet) => new Set(noteSet));
}

function pushHistory() {
  state.history.push({
    values: [...state.values],
    notes: cloneNotes(state.notes),
    mistakes: state.mistakes,
    selectedIndex: state.selectedIndex,
  });
  if (state.history.length > 80) {
    state.history.shift();
  }
}

function renderCell(index, ctx) {
  const cell = cellElements[index];
  const value = state.values[index];
  const notes = state.notes[index];
  const isRelated = ctx.selectedIndex === index || ctx.peers.has(index);
  const isSelected = ctx.selectedIndex === index;
  const isFixed = state.given.has(index);
  const isMatch =
    ctx.selectedValue !== "" &&
    value !== "" &&
    ctx.selectedValue === value &&
    ctx.selectedIndex !== index;
  const isError =
    value !== "" && !isFixed && value !== state.solution[index] && !state.completed;
  const isHighlighted =
    ctx.highlightDigit !== "" && value === ctx.highlightDigit;
  const hasHighlightedNote =
    ctx.highlightDigit !== "" && value === "" && notes.has(ctx.highlightDigit);

  cell.classList.toggle("is-fixed", isFixed);
  cell.classList.toggle("is-related", isRelated);
  cell.classList.toggle("is-selected", isSelected);
  cell.classList.toggle("is-match", isMatch);
  cell.classList.toggle("is-error", isError);
  cell.classList.toggle("is-highlighted", isHighlighted || hasHighlightedNote);
  cell.setAttribute(
    "aria-label",
    describeCell(cell.dataset.row, cell.dataset.col, value, notes, isFixed),
  );

  if (value) {
    cell.dataset.digit = value;
    cell.innerHTML = `<span class="cell-value">${value}</span>`;
    return;
  }

  cell.dataset.digit = "";
  const noteMarkup = NINE.map((offset) => {
    const digit = String(offset + 1);
    const has = notes.has(digit);
    const cls =
      has && ctx.highlightDigit === digit ? ' class="is-highlighted-note"' : "";
    return `<span data-digit="${digit}"${cls}>${has ? digit : ""}</span>`;
  }).join("");

  cell.innerHTML = `<div class="note-grid" aria-hidden="true">${noteMarkup}</div>`;
}

function render() {
  const ctx = {
    selectedIndex: state.selectedIndex,
    selectedValue:
      state.selectedIndex !== null ? state.values[state.selectedIndex] : "",
    peers: state.selectedIndex !== null ? PEERS[state.selectedIndex] : new Set(),
    highlightDigit: state.highlightDigit,
  };

  const digitCounts = new Map();
  let filled = 0;
  let correct = 0;
  let notesTotal = 0;

  for (let index = 0; index < 81; index += 1) {
    renderCell(index, ctx);
    const value = state.values[index];
    if (value) {
      filled += 1;
      if (value === state.solution[index]) correct += 1;
      digitCounts.set(value, (digitCounts.get(value) ?? 0) + 1);
    }
    notesTotal += state.notes[index].size;
  }

  const remaining = 81 - filled;
  mistakesCount.textContent = String(state.mistakes);
  filledCount.textContent = `${filled} / 81`;
  correctCount.textContent = String(correct);
  noteCount.textContent = String(notesTotal);
  progressLabel.textContent = `${state.given.size} clues, ${remaining} open`;
  progressFill.style.width = `${Math.round((filled / 81) * 100)}%`;
  undoButton.disabled = state.history.length === 0 || state.completed;

  numberButtons.forEach((button) => {
    const value = button.dataset.value;
    const count = digitCounts.get(value) ?? 0;
    button.classList.toggle("is-complete", count >= 9);
    button.classList.toggle(
      "is-highlight-active",
      state.highlightDigit !== "" && state.highlightDigit === value,
    );
  });
}

function handleCellSelection(index) {
  if (state.paused) {
    return;
  }
  state.selectedIndex = index;
  if (state.highlightMode) {
    const cellValue = state.values[index];
    if (cellValue) {
      state.highlightDigit = cellValue;
    }
  }
  render();
  showCellPopover(index);
  saveState();
  const { row, col } = cellRC(index);
  announce(`Selected row ${row}, column ${col}.`);
}

function setHighlightedDigit(rawValue) {
  const value = rawValue ? String(rawValue) : "";
  state.highlightDigit = state.highlightDigit === value ? "" : value;
  render();
  saveState();
  if (state.highlightDigit) {
    setStatus(
      `Highlighting every ${state.highlightDigit} on the board.`,
      `Highlighting ${state.highlightDigit}.`,
    );
  } else {
    setStatus("Highlight cleared.", "Highlight cleared.");
  }
}

function toggleHighlightMode() {
  state.highlightMode = !state.highlightMode;
  if (state.highlightMode && state.notesMode) {
    state.notesMode = false;
  }
  if (!state.highlightMode) {
    state.highlightDigit = "";
  }
  applyControlsUI();
  render();
  saveState();
  setStatus(
    state.highlightMode
      ? "Pick a number to highlight every match."
      : "Highlight off. Numbers place again.",
    state.highlightMode ? "Highlight mode on." : "Highlight mode off.",
  );
}

function toggleRainbowMode() {
  state.rainbowMode = !state.rainbowMode;
  applyControlsUI();
  saveState();
  setStatus(
    state.rainbowMode
      ? "Rainbow palette on. Every digit gets its own color."
      : "Rainbow off. Default ink restored.",
    state.rainbowMode ? "Rainbow mode on." : "Rainbow mode off.",
  );
}

function clearNotesFromPeers(index, value) {
  for (const peerIndex of PEERS[index]) {
    state.notes[peerIndex].delete(value);
  }
}

function placeValue(rawValue) {
  if (state.paused) {
    return;
  }

  if (state.highlightMode) {
    const idx = state.selectedIndex;
    const canPlace =
      idx !== null &&
      !state.completed &&
      !state.given.has(idx) &&
      state.values[idx] === "";
    if (!canPlace) {
      setHighlightedDigit(rawValue);
      return;
    }
    state.highlightDigit = String(rawValue);
  }

  if (state.completed || state.selectedIndex === null) {
    hideCellPopover();
    return;
  }

  const index = state.selectedIndex;

  if (state.given.has(index)) {
    setStatus("That square is locked in as a clue.", "That square is a given clue.");
    return;
  }

  const value = String(rawValue);

  if (state.notesMode) {
    if (state.values[index]) {
      setStatus(
        "Clear the square first if you want to sketch notes there.",
        "Clear the square before adding notes.",
      );
      return;
    }

    pushHistory();

    if (state.notes[index].has(value)) {
      state.notes[index].delete(value);
    } else {
      state.notes[index].add(value);
    }

    const { row, col } = cellRC(index);
    statusMessage.textContent = `Notes ${
      state.notes[index].has(value) ? "added to" : "removed from"
    } row ${row}, column ${col}.`;
    render();
    showCellPopover(index);
    return;
  }

  const wasWrongBefore =
    state.values[index] !== "" && state.values[index] !== state.solution[index];

  pushHistory();
  state.values[index] = value;
  state.notes[index].clear();
  clearNotesFromPeers(index, value);

  if (value !== state.solution[index] && !wasWrongBefore) {
    state.mistakes += 1;
    setStatus(
      "Not quite. The square is highlighted so you can revisit it.",
      "That move does not match the solution.",
    );
  } else if (value === state.solution[index]) {
    setStatus("Nice. That placement fits cleanly.", "Value placed.");
  }

  render();
  saveState();
  checkCompletion();

  if (!state.completed) {
    hideCellPopover();
  }
}

function eraseSelected() {
  if (state.paused || state.completed || state.selectedIndex === null) {
    hideCellPopover();
    return;
  }

  const index = state.selectedIndex;

  if (state.given.has(index)) {
    setStatus("Clue squares cannot be erased.");
    return;
  }

  pushHistory();
  state.values[index] = "";
  state.notes[index].clear();
  render();
  showCellPopover(index);
  saveState();
  setStatus("Square cleared.");
}

function moveSelection(deltaRow, deltaCol) {
  if (state.paused) {
    return;
  }
  const current = state.selectedIndex ?? 0;
  const row = Math.floor(current / 9);
  const col = current % 9;
  const nextRow = (row + deltaRow + 9) % 9;
  const nextCol = (col + deltaCol + 9) % 9;
  const nextIndex = nextRow * 9 + nextCol;
  state.selectedIndex = nextIndex;
  render();
  showCellPopover(nextIndex);
  saveState();
  cellElements[nextIndex]?.focus();
}

function toggleNotes() {
  state.notesMode = !state.notesMode;
  if (state.notesMode && state.highlightMode) {
    state.highlightMode = false;
    state.highlightDigit = "";
  }
  applyControlsUI();
  render();
  saveState();
  setStatus(
    state.notesMode ? "Pencil marks are active." : "Final entries are active.",
    state.notesMode ? "Notes mode on." : "Notes mode off.",
  );
}

function undoLastMove() {
  if (state.paused || state.history.length === 0) {
    return;
  }

  const previous = state.history.pop();
  state.values = previous.values;
  state.notes = cloneNotes(previous.notes);
  state.mistakes = previous.mistakes;
  state.selectedIndex = previous.selectedIndex;
  state.completed = false;
  celebration.classList.add("hidden");
  render();
  showCellPopover(state.selectedIndex);
  saveState();
  setStatus("Last move undone.");
}

function checkBoard() {
  let incorrect = 0;
  for (let index = 0; index < 81; index += 1) {
    const value = state.values[index];
    if (value !== "" && value !== state.solution[index] && !state.given.has(index)) {
      incorrect += 1;
    }
  }

  if (incorrect === 0) {
    setStatus(
      "Everything on the board is currently consistent. Keep going.",
      "Board check complete. No incorrect squares found.",
    );
    return;
  }

  setStatus(
    `${incorrect} square${
      incorrect === 1 ? "" : "s"
    } need attention. They are highlighted in rose.`,
    `Board check found ${incorrect} incorrect squares.`,
  );
}

function hint() {
  if (state.paused || state.completed) {
    return;
  }

  const selected = state.selectedIndex;
  const selectedNeedsFix =
    selected !== null &&
    !state.given.has(selected) &&
    state.values[selected] !== state.solution[selected];
  const targetIndex = selectedNeedsFix
    ? selected
    : state.values.findIndex((value, index) => value !== state.solution[index]);

  if (targetIndex === -1) {
    checkCompletion();
    return;
  }

  pushHistory();
  state.values[targetIndex] = state.solution[targetIndex];
  state.notes[targetIndex].clear();
  clearNotesFromPeers(targetIndex, state.solution[targetIndex]);
  state.selectedIndex = targetIndex;
  render();
  hideCellPopover();
  saveState();
  const { row, col } = cellRC(targetIndex);
  setStatus(`Hint placed at row ${row}, column ${col}.`, "Hint placed.");
  checkCompletion();
}

function revealSolution() {
  if (state.paused) {
    return;
  }
  hideCellPopover();
  pushHistory();
  state.values = [...state.solution];
  state.notes = INDICES.map(() => new Set());
  render();
  saveState();
  setStatus("The full solution is on the board.", "Solution revealed.");
  checkCompletion(true);
}

function checkCompletion(revealed = false) {
  const solved = state.values.every((value, index) => value === state.solution[index]);
  if (!solved) {
    return;
  }

  state.completed = true;
  state.elapsedMs = currentElapsedMs();
  state.runStartedAt = 0;
  clearInterval(state.timerId);
  hideCellPopover();
  render();
  saveState();

  const elapsed = Math.floor(state.elapsedMs / 1000);
  const minutes = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const seconds = String(elapsed % 60).padStart(2, "0");
  const timeTaken = `${minutes}:${seconds}`;
  celebrationMessage.textContent = revealed
    ? `The board is complete. Explore another puzzle whenever you want.`
    : `You solved it in ${timeTaken} with ${state.mistakes} mistake${
        state.mistakes === 1 ? "" : "s"
      }.`;
  celebration.classList.remove("hidden");
  setStatus(
    revealed
      ? "Solution shown. Start another board when you're ready."
      : "Puzzle complete. Clean work.",
    "Puzzle complete.",
  );
}

function handleKeydown(event) {
  if (
    event.target instanceof HTMLButtonElement &&
    event.target.closest(".keypad, .tool-row, .command-bar, .cell-popover")
  ) {
    return;
  }

  if (event.key.toLowerCase() === "p") {
    togglePause();
    return;
  }

  if (state.paused) {
    return;
  }

  if (event.key >= "1" && event.key <= "9") {
    placeValue(event.key);
    return;
  }

  if (event.key === "Backspace" || event.key === "Delete" || event.key === "0") {
    eraseSelected();
    return;
  }

  if (event.key === "ArrowUp") {
    event.preventDefault();
    moveSelection(-1, 0);
  } else if (event.key === "ArrowDown") {
    event.preventDefault();
    moveSelection(1, 0);
  } else if (event.key === "ArrowLeft") {
    event.preventDefault();
    moveSelection(0, -1);
  } else if (event.key === "ArrowRight") {
    event.preventDefault();
    moveSelection(0, 1);
  } else if (event.key.toLowerCase() === "n") {
    toggleNotes();
  } else if (event.key.toLowerCase() === "g") {
    toggleHighlightMode();
  } else if (event.key.toLowerCase() === "h") {
    hint();
  } else if (event.key === "Escape") {
    hideCellPopover();
  }
}

function saveState() {
  if (state.hydrating) {
    return;
  }
  try {
    const data = {
      v: 1,
      difficulty: state.difficulty,
      solution: state.solution.join(""),
      given: [...state.given],
      values: state.values,
      notes: state.notes.map((noteSet) => [...noteSet]),
      selectedIndex: state.selectedIndex,
      notesMode: state.notesMode,
      highlightMode: state.highlightMode,
      highlightDigit: state.highlightDigit,
      rainbowMode: state.rainbowMode,
      mistakes: state.mistakes,
      completed: state.completed,
      paused: state.paused,
      elapsedMs: currentElapsedMs(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    // localStorage may be unavailable (private mode, quota); ignore.
  }
}

function loadSavedState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || data.v !== 1) return null;
    if (typeof data.solution !== "string" || data.solution.length !== 81) return null;
    if (!Array.isArray(data.values) || data.values.length !== 81) return null;
    if (!Array.isArray(data.notes) || data.notes.length !== 81) return null;
    return data;
  } catch (err) {
    return null;
  }
}

function hydrateFromSave() {
  const saved = loadSavedState();
  if (!saved) {
    return false;
  }

  state.hydrating = true;
  try {
    state.difficulty = saved.difficulty || "easy";
    state.solution = stringToGrid(saved.solution);
    state.given = new Set(saved.given || []);
    state.values = saved.values.map((value) => (value ? String(value) : ""));
    state.notes = saved.notes.map((arr) => new Set(arr || []));
    state.selectedIndex =
      typeof saved.selectedIndex === "number" ? saved.selectedIndex : null;
    state.notesMode = !!saved.notesMode;
    state.highlightMode = !!saved.highlightMode;
    state.highlightDigit = saved.highlightDigit || "";
    state.rainbowMode = !!saved.rainbowMode;
    state.mistakes = saved.mistakes || 0;
    state.history = [];
    state.completed = !!saved.completed;

    applyDifficultySelection(state.difficulty);
    applyControlsUI();

    const elapsedMs = Math.max(0, Number(saved.elapsedMs) || 0);
    if (state.completed) {
      clearInterval(state.timerId);
      state.timerId = null;
      state.elapsedMs = elapsedMs;
      state.runStartedAt = 0;
      state.paused = false;
      celebration.classList.remove("hidden");
    } else {
      celebration.classList.add("hidden");
      startTimer({ elapsedMs, paused: !!saved.paused });
    }

    applyPauseUI();
    updateTimer();
    render();
  } finally {
    state.hydrating = false;
  }

  saveState();
  setStatus(
    state.completed
      ? "Welcome back. The board you finished is still here."
      : state.paused
        ? "Welcome back. Resume when you're ready."
        : "Welcome back. Pick up where you left off.",
    "Restored saved game.",
  );
  return true;
}

const themeMedia = window.matchMedia("(prefers-color-scheme: dark)");

function loadThemePreference() {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    return THEMES.includes(saved) ? saved : "auto";
  } catch (err) {
    return "auto";
  }
}

function effectiveTheme(preference) {
  if (preference === "auto") {
    return themeMedia.matches ? "dark" : "light";
  }
  return preference;
}

function applyTheme(preference) {
  const resolved = effectiveTheme(preference);
  document.documentElement.dataset.theme = resolved;
  if (themeColorMeta) {
    themeColorMeta.setAttribute("content", THEME_COLORS[resolved]);
  }
  if (themeToggleIcon) themeToggleIcon.textContent = THEME_ICONS[preference];
  if (themeToggleLabel) themeToggleLabel.textContent = capitalize(preference);
}

function cycleTheme() {
  const next = THEMES[(THEMES.indexOf(state.themePreference) + 1) % THEMES.length];
  state.themePreference = next;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, next);
  } catch (err) {
    // ignore
  }
  applyTheme(next);
  setStatus(
    next === "auto"
      ? "Theme follows your system."
      : `Theme locked to ${next}.`,
    `Theme: ${next}.`,
  );
}

state.themePreference = loadThemePreference();
applyTheme(state.themePreference);
themeMedia.addEventListener("change", () => {
  if (state.themePreference === "auto") {
    applyTheme("auto");
  }
});
themeToggle?.addEventListener("click", cycleTheme);

newGameButton.addEventListener("click", () => startNewGame(state.difficulty));
playAgainButton.addEventListener("click", () => startNewGame(state.difficulty));
hintButton.addEventListener("click", hint);
undoButton.addEventListener("click", undoLastMove);
eraseButton.addEventListener("click", eraseSelected);
solveButton.addEventListener("click", revealSolution);
checkButton.addEventListener("click", checkBoard);
notesToggle.addEventListener("click", toggleNotes);
highlightToggle.addEventListener("click", toggleHighlightMode);
rainbowToggle.addEventListener("click", toggleRainbowMode);
pauseButton.addEventListener("click", togglePause);
resumeButton.addEventListener("click", resumeGame);
popoverEraseButton.addEventListener("click", eraseSelected);
popoverCloseButton.addEventListener("click", hideCellPopover);

difficultyButtons.forEach((button) => {
  button.addEventListener("click", () => startNewGame(button.dataset.difficulty));
});

const placeFromButton = (button) => placeValue(button.dataset.value);
numberButtons.forEach((button) => {
  button.addEventListener("click", () => placeFromButton(button));
});
popoverNumberButtons.forEach((button) => {
  button.addEventListener("click", () => placeFromButton(button));
});

document.addEventListener("keydown", handleKeydown);
document.addEventListener("pointerdown", (event) => {
  if (
    cellPopover.classList.contains("hidden") ||
    event.target.closest(".cell-popover") ||
    event.target.closest(".sudoku-cell")
  ) {
    return;
  }
  hideCellPopover();
});

let repositionRaf = null;
function repositionPopover() {
  if (repositionRaf !== null) {
    return;
  }
  repositionRaf = requestAnimationFrame(() => {
    repositionRaf = null;
    if (state.selectedIndex !== null && !cellPopover.classList.contains("hidden")) {
      showCellPopover(state.selectedIndex);
    }
  });
}

window.addEventListener("resize", repositionPopover);
window.addEventListener("scroll", repositionPopover, true);

buildBoard();
if (!hydrateFromSave()) {
  startNewGame("easy", true);
}
