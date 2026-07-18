(() => {
  "use strict";

  const SIZE = 15;
  const PROBABILITIES = {
    black: [10, 30, 50, 70, 90],
    white: [90, 70, 50, 30, 10],
  };
  const DIRECTIONS = [[1, 0], [0, 1], [1, 1], [1, -1]];

  const boardElement = document.querySelector("#board");
  const turnText = document.querySelector("#turnText");
  const nextStone = document.querySelector("#nextStone");
  const nextProbability = document.querySelector("#nextProbability");
  const message = document.querySelector("#message");
  const observeButton = document.querySelector("#observeButton");
  const observeHint = document.querySelector("#observeHint");
  const resetButton = document.querySelector("#resetButton");

  let state;

  function initialState() {
    return {
      cells: Array(SIZE * SIZE).fill(null),
      turn: "black",
      placed: { black: 0, white: 0 },
      observeUnlocked: false,
      observing: false,
      result: null,
    };
  }

  function probabilityFor(player) {
    const cycle = PROBABILITIES[player];
    return cycle[state.placed[player] % cycle.length];
  }

  function ownColorProbability(cell) {
    return cell.placedBy === "white" ? cell.probabilityWhite : 100 - cell.probabilityWhite;
  }

  function cellIndex(row, column) { return row * SIZE + column; }
  function isInside(row, column) { return row >= 0 && row < SIZE && column >= 0 && column < SIZE; }

  function placeStone(index) {
    if (state.cells[index] || state.observing || state.result) return;

    const player = state.turn;
    state.cells[index] = { probabilityWhite: probabilityFor(player), placedBy: player, observed: null };
    state.placed[player] += 1;
    state.observeUnlocked ||= hasPotentialFive();
    state.turn = player === "black" ? "white" : "black";
    render();
  }

  function hasPotentialFive() {
    return hasLine((cell) => Boolean(cell));
  }

  function hasFive(color) {
    return hasLine((cell) => cell?.observed === color);
  }

  function hasLine(matches) {
    for (let row = 0; row < SIZE; row += 1) {
      for (let column = 0; column < SIZE; column += 1) {
        if (!matches(state.cells[cellIndex(row, column)])) continue;
        for (const [rowStep, columnStep] of DIRECTIONS) {
          let length = 1;
          while (length < 5) {
            const nextRow = row + rowStep * length;
            const nextColumn = column + columnStep * length;
            if (!isInside(nextRow, nextColumn) || !matches(state.cells[cellIndex(nextRow, nextColumn)])) break;
            length += 1;
          }
          if (length === 5) return true;
        }
      }
    }
    return false;
  }

  function observe() {
    if (!state.observeUnlocked || state.result) return;
    if (state.observing) {
      stopObserving();
      return;
    }

    state.observing = true;
    state.cells.forEach((cell) => {
      if (cell) cell.observed = Math.random() * 100 < cell.probabilityWhite ? "white" : "black";
    });

    const whiteWins = hasFive("white");
    const blackWins = hasFive("black");
    if (whiteWins && blackWins) state.result = "draw";
    else if (whiteWins) state.result = "white";
    else if (blackWins) state.result = "black";
    render();
  }

  function stopObserving() {
    if (state.result) return;
    state.observing = false;
    state.cells.forEach((cell) => { if (cell) cell.observed = null; });
    render();
  }

  function resetGame() {
    state = initialState();
    render();
  }

  function statusMessage() {
    if (state.result === "draw") return "白と黒が同時に五目を完成。引き分けです。";
    if (state.result) return `${state.result === "black" ? "黒" : "白"}の五目が完成しました。`;
    if (state.observing) return "観測中です。勝負はまだ確定していません。";
    return `${state.turn === "black" ? "黒" : "白"}番です。交点を選んでください。`;
  }

  function renderBoard() {
    boardElement.innerHTML = "";
    state.cells.forEach((cell, index) => {
      const row = Math.floor(index / SIZE);
      const column = index % SIZE;
      const button = document.createElement("button");
      button.type = "button";
      button.className = `cell${cell ? " occupied" : ""}`;
      button.setAttribute("role", "gridcell");
      button.setAttribute("aria-label", cell
        ? `${row + 1}行${column + 1}列、${cell.placedBy === "black" ? "黒" : "白"}になる確率${ownColorProbability(cell)}%`
        : `${row + 1}行${column + 1}列に置く`);
      button.disabled = Boolean(cell || state.observing || state.result);
      button.addEventListener("click", () => placeStone(index));

      if (cell) {
        const stone = document.createElement("span");
        stone.className = `stone${cell.observed ? ` ${cell.observed}` : ""}`;
        stone.style.setProperty("--white-p", `${cell.probabilityWhite}%`);
        stone.dataset.probability = cell.observed
          ? ""
          : `${cell.placedBy === "black" ? "黒" : "白"}${ownColorProbability(cell)}`;
        button.append(stone);
      }
      boardElement.append(button);
    });
  }

  function render() {
    const probability = probabilityFor(state.turn);
    renderBoard();
    turnText.textContent = state.result ? "対局終了" : state.observing ? "観測中" : `${state.turn === "black" ? "黒" : "白"}番`;
    nextStone.style.setProperty("--white-p", `${probability}%`);
    const ownProbability = state.turn === "white" ? probability : 100 - probability;
    const playerLabel = state.turn === "black" ? "黒" : "白";
    nextStone.dataset.probability = `${playerLabel}${ownProbability}`;
    nextProbability.textContent = `${playerLabel} ${ownProbability}%`;
    message.textContent = statusMessage();

    observeButton.disabled = !state.observeUnlocked || Boolean(state.result);
    observeButton.textContent = state.observing ? "観測をやめる" : "観測する";
    observeHint.textContent = state.result
      ? "「最初から」で新しい対局を始められます。"
      : state.observeUnlocked
        ? state.observing ? "観測をやめるまで次の駒は置けません。" : "観測は以降いつでも行えます。"
        : "駒が5つ連続すると観測できるようになります。";
  }

  observeButton.addEventListener("click", observe);
  resetButton.addEventListener("click", resetGame);
  resetGame();
})();
