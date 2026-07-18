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
  const entangleButton = document.querySelector("#entangleButton");
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
      reviewingResult: false,
      winningCells: new Set(),
      selectedReviewIndex: null,
      entangleRemaining: { black: 1, white: 1 },
      entangleMode: false,
      entangleAnchor: null,
      nextEntanglementId: 1,
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
    if (state.observing || state.result) return;

    if (state.entangleMode) {
      handleEntangleSelection(index);
      return;
    }
    if (state.cells[index]) return;

    const player = state.turn;
    state.cells[index] = {
      probabilityWhite: probabilityFor(player),
      placedBy: player,
      observed: null,
      entanglementId: null,
    };
    state.placed[player] += 1;
    state.observeUnlocked ||= hasPotentialFive();
    state.turn = player === "black" ? "white" : "black";
    render();
  }

  function toggleEntangleMode() {
    const player = state.turn;
    if (state.observing || state.result || state.entangleRemaining[player] === 0) return;
    if (!state.cells.some((cell) => cell?.placedBy === player && !cell.entanglementId)) return;
    state.entangleMode = !state.entangleMode;
    state.entangleAnchor = null;
    render();
  }

  function handleEntangleSelection(index) {
    const cell = state.cells[index];
    const player = state.turn;
    if (cell) {
      if (cell.placedBy === player && !cell.entanglementId) state.entangleAnchor = index;
      render();
      return;
    }
    if (state.entangleAnchor === null) return;

    const entanglementId = state.nextEntanglementId;
    state.nextEntanglementId += 1;
    state.cells[state.entangleAnchor].entanglementId = entanglementId;
    state.cells[index] = {
      probabilityWhite: probabilityFor(player),
      placedBy: player,
      observed: null,
      entanglementId,
    };
    state.placed[player] += 1;
    state.entangleRemaining[player] = 0;
    state.entangleMode = false;
    state.entangleAnchor = null;
    state.observeUnlocked ||= hasPotentialFive();
    state.turn = player === "black" ? "white" : "black";
    render();
  }

  function selectReviewStone(index) {
    if (!state.reviewingResult || !state.cells[index]) return;
    state.selectedReviewIndex = index;
    render();
  }

  function hasPotentialFive() {
    return hasLine((cell) => Boolean(cell));
  }

  function hasFive(color) {
    return findWinningCells(color).size > 0;
  }

  function findWinningCells(color) {
    const winning = new Set();
    for (let row = 0; row < SIZE; row += 1) {
      for (let column = 0; column < SIZE; column += 1) {
        if (state.cells[cellIndex(row, column)]?.observed !== color) continue;
        for (const [rowStep, columnStep] of DIRECTIONS) {
          const line = [];
          let nextRow = row;
          let nextColumn = column;
          while (isInside(nextRow, nextColumn)
            && state.cells[cellIndex(nextRow, nextColumn)]?.observed === color) {
            line.push(cellIndex(nextRow, nextColumn));
            nextRow += rowStep;
            nextColumn += columnStep;
          }
          if (line.length >= 5) line.forEach((index) => winning.add(index));
        }
      }
    }
    return winning;
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
    if (state.result) {
      state.reviewingResult = !state.reviewingResult;
      state.selectedReviewIndex = null;
      render();
      return;
    }
    if (!state.observeUnlocked) return;
    if (state.observing) {
      stopObserving();
      return;
    }

    state.observing = true;
    const entangledRolls = new Map();
    state.cells.forEach((cell) => {
      if (!cell) return;
      let roll = Math.random() * 100;
      if (cell.entanglementId) {
        if (!entangledRolls.has(cell.entanglementId)) entangledRolls.set(cell.entanglementId, roll);
        roll = entangledRolls.get(cell.entanglementId);
      }
      cell.observed = roll < cell.probabilityWhite ? "white" : "black";
    });

    const whiteWins = hasFive("white");
    const blackWins = hasFive("black");
    state.winningCells = new Set([
      ...findWinningCells("white"),
      ...findWinningCells("black"),
    ]);
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
    if (state.result && state.reviewingResult) {
      const selected = state.cells[state.selectedReviewIndex];
      if (selected) {
        const placedColor = selected.placedBy === "black" ? "黒" : "白";
        const observedColor = selected.observed === "black" ? "黒" : "白";
        const betrayal = selected.observed !== selected.placedBy ? "（裏切り）" : "";
        const winning = state.winningCells.has(state.selectedReviewIndex) ? "・勝負を決めた駒" : "";
        const entangled = selected.entanglementId ? "・もつれ駒" : "";
        return `${placedColor}${ownColorProbability(selected)}% → ${observedColor}${betrayal}${winning}${entangled}`;
      }
      const betrayals = state.cells.filter((cell) => cell && cell.observed !== cell.placedBy).length;
      return `裏切り ${betrayals}個。気になる駒をタップすると詳細を確認できます。`;
    }
    if (state.result === "draw") return "白と黒が同時に五目を完成。引き分けです。";
    if (state.result) return `${state.result === "black" ? "黒" : "白"}の五目が完成しました。`;
    if (state.observing) return "観測中です。勝負はまだ確定していません。";
    if (state.entangleMode && state.entangleAnchor === null) return "もつれさせる自分の駒を1個選んでください。";
    if (state.entangleMode) return "次に空いている交点を選ぶと、次の駒ともつれます。";
    return `${state.turn === "black" ? "黒" : "白"}番です。交点を選んでください。`;
  }

  function renderBoard() {
    boardElement.innerHTML = "";
    state.cells.forEach((cell, index) => {
      const row = Math.floor(index / SIZE);
      const column = index % SIZE;
      const button = document.createElement("button");
      button.type = "button";
      button.className = `cell${cell ? " occupied" : ""}${state.winningCells.has(index) ? " winning" : ""}${state.selectedReviewIndex === index ? " selected" : ""}${state.entangleAnchor === index ? " entangle-anchor" : ""}`;
      button.setAttribute("role", "gridcell");
      button.setAttribute("aria-label", cell
        ? `${row + 1}行${column + 1}列、${cell.placedBy === "black" ? "黒" : "白"}になる確率${ownColorProbability(cell)}%`
        : `${row + 1}行${column + 1}列に置く`);
      button.disabled = state.reviewingResult
        ? !cell
        : state.entangleMode
          ? Boolean(state.observing || state.result || (cell && (cell.placedBy !== state.turn || cell.entanglementId)))
          : Boolean(cell || state.observing || state.result);
      button.addEventListener("click", () => state.reviewingResult ? selectReviewStone(index) : placeStone(index));

      if (cell) {
        const stone = document.createElement("span");
        const isBetrayal = cell.observed && cell.observed !== cell.placedBy;
        const showObservedColor = cell.observed && !state.reviewingResult;
        stone.className = `stone${showObservedColor ? ` ${cell.observed}` : ""}${state.reviewingResult ? " review" : ""}${isBetrayal && state.reviewingResult ? " betrayal" : ""}`;
        stone.style.setProperty("--white-p", `${cell.probabilityWhite}%`);
        stone.dataset.probability = showObservedColor
          ? ""
          : state.reviewingResult
            ? ownColorProbability(cell)
            : `${cell.placedBy === "black" ? "黒" : "白"}${ownColorProbability(cell)}`;
        button.append(stone);
      }
      boardElement.append(button);
    });
    renderEntanglementLines();
  }

  function renderEntanglementLines() {
    const groups = new Map();
    state.cells.forEach((cell, index) => {
      if (!cell?.entanglementId) return;
      if (!groups.has(cell.entanglementId)) groups.set(cell.entanglementId, []);
      groups.get(cell.entanglementId).push(index);
    });
    if (groups.size === 0) return;

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.classList.add("entanglement-layer");
    svg.setAttribute("viewBox", "0 0 100 100");
    svg.setAttribute("aria-hidden", "true");
    groups.forEach((indices) => {
      if (indices.length !== 2) return;
      const [first, second] = indices;
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", ((first % SIZE + 0.5) / SIZE) * 100);
      line.setAttribute("y1", ((Math.floor(first / SIZE) + 0.5) / SIZE) * 100);
      line.setAttribute("x2", ((second % SIZE + 0.5) / SIZE) * 100);
      line.setAttribute("y2", ((Math.floor(second / SIZE) + 0.5) / SIZE) * 100);
      svg.append(line);
    });
    boardElement.append(svg);
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

    const hasEligibleAnchor = state.cells.some((cell) => cell?.placedBy === state.turn && !cell.entanglementId);
    entangleButton.disabled = Boolean(
      state.observing
      || state.result
      || state.entangleRemaining[state.turn] === 0
      || !hasEligibleAnchor
    );
    entangleButton.classList.toggle("active", state.entangleMode);
    entangleButton.textContent = state.entangleRemaining[state.turn] === 0
      ? "もつれ済み"
      : state.entangleMode ? "もつれ取消" : "もつれ 1";

    observeButton.disabled = !state.observeUnlocked || state.entangleMode;
    observeButton.textContent = state.result
      ? state.reviewingResult ? "結果に戻る" : "確率を確認"
      : state.observing ? "観測をやめる" : "観測する";
    observeHint.textContent = state.result
      ? state.reviewingResult
        ? "赤い輪＝裏切り、金の輪＝勝負を決めた駒。タップで詳細。"
        : "金色に光る駒が勝負を決めた五目です。"
      : state.observeUnlocked
        ? state.observing ? "観測をやめるまで次の駒は置けません。" : "観測は以降いつでも行えます。"
        : "駒が5つ連続すると観測できるようになります。";
  }

  observeButton.addEventListener("click", observe);
  entangleButton.addEventListener("click", toggleEntangleMode);
  resetButton.addEventListener("click", resetGame);
  resetGame();
})();
