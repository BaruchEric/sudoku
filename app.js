const SOLUTION =
  "534678912672195348198342567859761423426853791713924856961537284287419635345286179";

const DIGITS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

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
const checkButton = document.querySelector("#check-button");
const undoButton = document.querySelector("#undo-button");
const progressFill = document.querySelector("#progress-fill");
const cellPopover = document.querySelector("#cell-popover");
const celebration = document.querySelector("#celebration");
const celebrationMessage = document.querySelector("#celebration-message");
const numberButtons = document.querySelectorAll(".number-button");

const state = {
  difficulty: "easy",
  solution: [],
  given: new Set(),
  values: [],
  notes: [],
  selectedIndex: null,
  notesMode: false,
  mistakes: 0,
  history: [],
  completed: false,
  startTime: 0,
  timerId: null,
};

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
  const baseSolution = SOLUTION;

  if (fixed) {
    return {
      puzzle: basePuzzle,
      solution: baseSolution,
    };
  }

  const plan = createTransformPlan();

  return {
    puzzle: transformBoardString(basePuzzle, plan),
    solution: transformBoardString(baseSolution, plan),
  };
}

function buildBoard() {
  boardElement.innerHTML = "";

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
    }
  }
}

function startTimer() {
  clearInterval(state.timerId);
  state.startTime = Date.now();
  state.timerId = window.setInterval(updateTimer, 1000);
  updateTimer();
}

function updateTimer() {
  const elapsed = Math.floor((Date.now() - state.startTime) / 1000);
  const minutes = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const seconds = String(elapsed % 60).padStart(2, "0");
  timerLabel.textContent = `${minutes}:${seconds}`;
}

function startNewGame(difficulty, fixed = false) {
  const { puzzle, solution } = createPuzzle(difficulty, fixed);
  const puzzleGrid = stringToGrid(puzzle);

  state.difficulty = difficulty;
  state.solution = stringToGrid(solution);
  state.values = puzzleGrid.map((char) => (char === "." ? "" : char));
  state.notes = Array.from({ length: 81 }, () => new Set());
  state.given = new Set(
    puzzleGrid
      .map((char, index) => (char !== "." ? index : -1))
      .filter((index) => index !== -1),
  );
  state.selectedIndex = state.values.findIndex((value) => value === "");
  state.notesMode = false;
  state.mistakes = 0;
  state.history = [];
  state.completed = false;

  celebration.classList.add("hidden");
  difficultyLabel.textContent =
    difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
  mistakesCount.textContent = "0";
  notesToggle.textContent = "Notes";
  notesToggle.classList.remove("is-active");
  document
    .querySelectorAll("[data-difficulty]")
    .forEach((button) =>
      button.classList.toggle("is-active", button.dataset.difficulty === difficulty),
    );

  startTimer();
  render();

  if (state.selectedIndex !== -1 && state.selectedIndex !== null) {
    const cell = getCell(state.selectedIndex);
    cell?.focus();
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

function getCell(index) {
  return boardElement.querySelector(`[data-index="${index}"]`);
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

  const cell = getCell(index);

  if (!cell) {
    return;
  }

  cellPopover.classList.remove("hidden");
  positionCellPopover(cell);
}

function getPeers(index) {
  const row = Math.floor(index / 9);
  const col = index % 9;
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;
  const peers = new Set();

  for (let position = 0; position < 9; position += 1) {
    peers.add(row * 9 + position);
    peers.add(position * 9 + col);
  }

  for (let rowOffset = 0; rowOffset < 3; rowOffset += 1) {
    for (let colOffset = 0; colOffset < 3; colOffset += 1) {
      peers.add((boxRow + rowOffset) * 9 + (boxCol + colOffset));
    }
  }

  peers.delete(index);
  return peers;
}

function countValues() {
  const filled = state.values.filter(Boolean).length;
  const correct = state.values.filter(
    (value, index) => value !== "" && value === state.solution[index],
  ).length;
  const notesTotal = state.notes.reduce((total, noteSet) => total + noteSet.size, 0);
  return { filled, correct, notesTotal };
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
  const cell = getCell(index);
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

  cell.classList.toggle("is-fixed", isFixed);
  cell.classList.toggle("is-related", isRelated);
  cell.classList.toggle("is-selected", isSelected);
  cell.classList.toggle("is-match", isMatch);
  cell.classList.toggle("is-error", isError);
  cell.setAttribute(
    "aria-label",
    `Row ${cell.dataset.row} Column ${cell.dataset.col}${
      value ? ` value ${value}` : notes.size ? ` notes ${[...notes].join(", ")}` : " empty"
    }${isFixed ? ", given clue" : ""}`,
  );

  if (value) {
    cell.innerHTML = `<span class="cell-value">${value}</span>`;
    return;
  }

  const noteMarkup = Array.from({ length: 9 }, (_, offset) => {
    const digit = String(offset + 1);
    return `<span>${notes.has(digit) ? digit : ""}</span>`;
  }).join("");

  cell.innerHTML = `<div class="note-grid" aria-hidden="true">${noteMarkup}</div>`;
}

function render() {
  const ctx = {
    selectedIndex: state.selectedIndex,
    selectedValue:
      state.selectedIndex !== null ? state.values[state.selectedIndex] : "",
    peers: state.selectedIndex !== null ? getPeers(state.selectedIndex) : new Set(),
  };

  const digitCounts = new Map();
  for (let index = 0; index < 81; index += 1) {
    renderCell(index, ctx);
    const value = state.values[index];
    if (value) {
      digitCounts.set(value, (digitCounts.get(value) ?? 0) + 1);
    }
  }

  const { filled, correct, notesTotal } = countValues();
  const remaining = 81 - filled;
  mistakesCount.textContent = String(state.mistakes);
  filledCount.textContent = `${filled} / 81`;
  correctCount.textContent = String(correct);
  noteCount.textContent = String(notesTotal);
  progressLabel.textContent = `${state.given.size} clues, ${remaining} open`;
  progressFill.style.width = `${Math.round((filled / 81) * 100)}%`;
  undoButton.disabled = state.history.length === 0 || state.completed;

  numberButtons.forEach((button) => {
    const count = digitCounts.get(button.dataset.value) ?? 0;
    button.classList.toggle("is-complete", count >= 9);
  });
}

function handleCellSelection(index) {
  state.selectedIndex = index;
  render();
  showCellPopover(index);
  const { row, col } = cellRC(index);
  announce(`Selected row ${row}, column ${col}.`);
}

function clearNotesFromPeers(index, value) {
  for (const peerIndex of getPeers(index)) {
    state.notes[peerIndex].delete(value);
  }
}

function placeValue(rawValue) {
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
  checkCompletion();

  if (!state.completed) {
    hideCellPopover();
  }
}

function eraseSelected() {
  if (state.completed || state.selectedIndex === null) {
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
  setStatus("Square cleared.");
}

function moveSelection(deltaRow, deltaCol) {
  const current = state.selectedIndex ?? 0;
  const row = Math.floor(current / 9);
  const col = current % 9;
  const nextRow = (row + deltaRow + 9) % 9;
  const nextCol = (col + deltaCol + 9) % 9;
  const nextIndex = nextRow * 9 + nextCol;
  state.selectedIndex = nextIndex;
  render();
  showCellPopover(nextIndex);
  getCell(nextIndex)?.focus();
}

function toggleNotes() {
  state.notesMode = !state.notesMode;
  notesToggle.classList.toggle("is-active", state.notesMode);
  notesToggle.textContent = state.notesMode ? "Notes On" : "Notes";
  setStatus(
    state.notesMode ? "Pencil marks are active." : "Final entries are active.",
    state.notesMode ? "Notes mode on." : "Notes mode off.",
  );
}

function undoLastMove() {
  if (state.history.length === 0) {
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
  setStatus("Last move undone.");
}

function checkBoard() {
  const incorrect = state.values
    .map((value, index) =>
      value !== "" && value !== state.solution[index] && !state.given.has(index)
        ? index
        : -1,
    )
    .filter((index) => index !== -1);

  render();

  if (incorrect.length === 0) {
    setStatus(
      "Everything on the board is currently consistent. Keep going.",
      "Board check complete. No incorrect squares found.",
    );
    return;
  }

  setStatus(
    `${incorrect.length} square${
      incorrect.length === 1 ? "" : "s"
    } need attention. They are highlighted in rose.`,
    `Board check found ${incorrect.length} incorrect squares.`,
  );
}

function hint() {
  if (state.completed) {
    return;
  }

  const targetIndex =
    state.selectedIndex !== null &&
    !state.given.has(state.selectedIndex) &&
    state.values[state.selectedIndex] !== state.solution[state.selectedIndex]
      ? state.selectedIndex
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
  const { row, col } = cellRC(targetIndex);
  setStatus(`Hint placed at row ${row}, column ${col}.`, "Hint placed.");
  checkCompletion();
}

function revealSolution() {
  hideCellPopover();
  pushHistory();
  state.values = [...state.solution];
  state.notes = Array.from({ length: 81 }, () => new Set());
  render();
  setStatus("The full solution is on the board.", "Solution revealed.");
  checkCompletion(true);
}

function checkCompletion(revealed = false) {
  const solved = state.values.every((value, index) => value === state.solution[index]);

  if (!solved) {
    return;
  }

  state.completed = true;
  clearInterval(state.timerId);
  hideCellPopover();
  render();

  const timeTaken = timerLabel.textContent;
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
  } else if (event.key.toLowerCase() === "h") {
    hint();
  } else if (event.key === "Escape") {
    hideCellPopover();
  }
}

document.querySelector("#new-game-button").addEventListener("click", () => {
  startNewGame(state.difficulty);
});

document.querySelector("#hint-button").addEventListener("click", hint);
document.querySelector("#undo-button").addEventListener("click", undoLastMove);
document.querySelector("#erase-button").addEventListener("click", eraseSelected);
document.querySelector("#solve-button").addEventListener("click", revealSolution);
document.querySelector("#notes-toggle").addEventListener("click", toggleNotes);
document.querySelector("#popover-erase").addEventListener("click", eraseSelected);
document.querySelector("#popover-close").addEventListener("click", hideCellPopover);
checkButton.addEventListener("click", checkBoard);
document.querySelector("#play-again-button").addEventListener("click", () => {
  startNewGame(state.difficulty);
});

document.querySelectorAll("[data-difficulty]").forEach((button) => {
  button.addEventListener("click", () => {
    startNewGame(button.dataset.difficulty);
  });
});

numberButtons.forEach((button) => {
  button.addEventListener("click", () => placeValue(button.dataset.value));
});

document.querySelectorAll(".popover-number").forEach((button) => {
  button.addEventListener("click", () => placeValue(button.dataset.popValue));
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
startNewGame("easy", true);
