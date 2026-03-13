/* ============================================================
   2048 Birthday Edition
   Based on gabrielecirulli/2048 (MIT License)
   All game logic merged into a single file with photo-tile tweak.
   ============================================================ */

(function () {
  'use strict';

  // === Grid ===
  const SIZE = 4;

  function Grid() {
    this.size = SIZE;
    this.cells = [];
    this.build();
  }

  Grid.prototype.build = function () {
    for (let x = 0; x < this.size; x++) {
      this.cells[x] = [];
      for (let y = 0; y < this.size; y++) {
        this.cells[x][y] = null;
      }
    }
  };

  Grid.prototype.availableCells = function () {
    const cells = [];
    for (let x = 0; x < this.size; x++) {
      for (let y = 0; y < this.size; y++) {
        if (!this.cells[x][y]) cells.push({ x, y });
      }
    }
    return cells;
  };

  Grid.prototype.randomAvailableCell = function () {
    const cells = this.availableCells();
    if (cells.length) return cells[Math.floor(Math.random() * cells.length)];
    return null;
  };

  Grid.prototype.cellAvailable = function (cell) {
    return !this.cells[cell.x][cell.y];
  };

  Grid.prototype.cellContent = function (cell) {
    if (this.withinBounds(cell)) return this.cells[cell.x][cell.y];
    return null;
  };

  Grid.prototype.insertTile = function (tile) {
    this.cells[tile.x][tile.y] = tile;
  };

  Grid.prototype.removeTile = function (tile) {
    this.cells[tile.x][tile.y] = null;
  };

  Grid.prototype.withinBounds = function (pos) {
    return pos.x >= 0 && pos.x < this.size && pos.y >= 0 && pos.y < this.size;
  };

  // === Tile ===
  function Tile(position, value) {
    this.x = position.x;
    this.y = position.y;
    this.value = value || 2;
    this.previousPosition = null;
    this.mergedFrom = null;
  }

  Tile.prototype.savePosition = function () {
    this.previousPosition = { x: this.x, y: this.y };
  };

  Tile.prototype.updatePosition = function (position) {
    this.x = position.x;
    this.y = position.y;
  };

  // === HTML Actuator ===
  function HTMLActuator() {
    this.tileContainer = document.getElementById('tile-container');
    this.scoreEl = document.getElementById('score');
    this.bestScoreEl = document.getElementById('best-score');
    this.messageContainer = document.getElementById('game-message');
    this.messageText = document.getElementById('game-message-text');
    this.messageBtn = document.getElementById('message-btn');
    this.score = 0;
  }

  HTMLActuator.prototype.actuate = function (grid, metadata) {
    const self = this;
    window.requestAnimationFrame(function () {
      self.clearContainer(self.tileContainer);

      grid.cells.forEach(function (column) {
        column.forEach(function (cell) {
          if (cell) self.addTile(cell);
        });
      });

      self.updateScore(metadata.score);
      self.updateBestScore(metadata.bestScore);

      if (metadata.terminated) {
        if (metadata.over) self.message(false);
        else if (metadata.won) self.message(true);
      }
    });
  };

  HTMLActuator.prototype.clearContainer = function (container) {
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
  };

  HTMLActuator.prototype.addTile = function (tile) {
    const el = document.createElement('div');
    const position = tile.previousPosition || { x: tile.x, y: tile.y };
    const posClass = 'tile-pos-' + position.x + '-' + position.y;

    let tileClass = 'tile-' + tile.value;
    if (tile.value > 2048) tileClass = 'tile-super';

    const classes = ['tile', tileClass, posClass];

    if (tile.previousPosition) {
      // Animate movement
      window.requestAnimationFrame(function () {
        el.className = '';
        const newPosClass = 'tile-pos-' + tile.x + '-' + tile.y;
        el.classList.add('tile', tileClass, newPosClass);
      });
    } else if (tile.mergedFrom) {
      classes.push('merged');
      // Render merged-from tiles briefly
      tile.mergedFrom.forEach(function (merged) {
        this.addTile(merged);
      }, this);
    } else {
      classes.push('new');
    }

    el.className = classes.join(' ');

    if (tile.value >= 32 && tile.value <= 2048) {
      el.textContent = '';
      el.classList.add('photo-tile');
    } else {
      el.textContent = tile.value;
    }

    this.tileContainer.appendChild(el);
  };

  HTMLActuator.prototype.updateScore = function (score) {
    this.scoreEl.textContent = score;
  };

  HTMLActuator.prototype.updateBestScore = function (bestScore) {
    this.bestScoreEl.textContent = bestScore;
  };

  HTMLActuator.prototype.message = function (won) {
    if (won) {
      this.messageText.innerHTML =
        '🎉 耶！你也太厉害啦！<br><br>' +
        '<span style="font-size:1.1rem;color:var(--color-text);">那就告诉你密码：</span><br>' +
        '<span style="font-size:1.8rem;color:var(--color-accent);letter-spacing:0.15em;font-weight:700;">kawaii</span>' +
        '<span style="font-size:1.1rem;"> ~</span>';
      this.messageBtn.textContent = 'Keep Going!';
      const self = this;
      this.messageBtn.onclick = function () {
        self.messageContainer.style.display = 'none';
        // Signal game manager to keep playing via custom event
        document.dispatchEvent(new Event('keepPlaying'));
      };
    } else {
      this.messageText.textContent = 'Game over! Try again?';
      this.messageBtn.textContent = 'Try Again';
      this.messageBtn.onclick = null;
    }
    this.messageContainer.style.display = 'flex';
  };

  HTMLActuator.prototype.clearMessage = function () {
    this.messageContainer.style.display = 'none';
  };

  // === Input Manager ===
  function InputManager() {
    this.events = {};
    this.listen();
  }

  InputManager.prototype.on = function (event, callback) {
    if (!this.events[event]) this.events[event] = [];
    this.events[event].push(callback);
  };

  InputManager.prototype.emit = function (event, data) {
    const callbacks = this.events[event];
    if (callbacks) callbacks.forEach(function (cb) { cb(data); });
  };

  InputManager.prototype.listen = function () {
    const self = this;
    const map = { 38: 0, 39: 1, 40: 2, 37: 3, 75: 0, 76: 1, 74: 2, 72: 3 };

    document.addEventListener('keydown', function (e) {
      const mapped = map[e.which];
      if (mapped !== undefined) {
        e.preventDefault();
        self.emit('move', mapped);
      }
    });

    // Touch / swipe
    let touchStartX, touchStartY;
    const gameContainer = document.getElementById('grid-container');

    gameContainer.addEventListener('touchstart', function (e) {
      if (e.touches.length > 1) return;
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      e.preventDefault();
    });

    gameContainer.addEventListener('touchmove', function (e) {
      e.preventDefault();
    });

    gameContainer.addEventListener('touchend', function (e) {
      if (e.changedTouches.length > 1) return;
      const dx = e.changedTouches[0].clientX - touchStartX;
      const dy = e.changedTouches[0].clientY - touchStartY;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      if (Math.max(absDx, absDy) > 10) {
        // 0: up, 1: right, 2: down, 3: left
        self.emit('move', absDx > absDy ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0));
      }
    });

    // Buttons
    document.getElementById('new-game-btn').addEventListener('click', function () {
      self.emit('restart');
    });
    document.getElementById('message-btn').addEventListener('click', function () {
      self.emit('restart');
    });
  };

  // === Storage Manager ===
  function StorageManager() {
    this.bestScoreKey = '2048-birthday-best';
    this.gameStateKey = '2048-birthday-state';
  }

  StorageManager.prototype.getBestScore = function () {
    return parseInt(localStorage.getItem(this.bestScoreKey)) || 0;
  };

  StorageManager.prototype.setBestScore = function (score) {
    localStorage.setItem(this.bestScoreKey, score);
  };

  StorageManager.prototype.getGameState = function () {
    const stateJSON = localStorage.getItem(this.gameStateKey);
    return stateJSON ? JSON.parse(stateJSON) : null;
  };

  StorageManager.prototype.setGameState = function (gameState) {
    localStorage.setItem(this.gameStateKey, JSON.stringify(gameState));
  };

  StorageManager.prototype.clearGameState = function () {
    localStorage.removeItem(this.gameStateKey);
  };

  // === Game Manager ===
  function GameManager() {
    this.size = SIZE;
    this.inputManager = new InputManager();
    this.storageManager = new StorageManager();
    this.actuator = new HTMLActuator();
    this.startTiles = 2;

    this.inputManager.on('move', this.move.bind(this));
    this.inputManager.on('restart', this.restart.bind(this));

    const self = this;
    document.addEventListener('keepPlaying', function () {
      self.keepPlaying = true;
    });

    this.setup();
  }

  GameManager.prototype.restart = function () {
    this.storageManager.clearGameState();
    this.actuator.clearMessage();
    this.setup();
  };

  GameManager.prototype.setup = function () {
    const previousState = this.storageManager.getGameState();

    if (previousState) {
      this.grid = new Grid();
      previousState.grid.cells.forEach(function (column, x) {
        column.forEach(function (cell, y) {
          if (cell) {
            this.grid.cells[x][y] = new Tile({ x: cell.x, y: cell.y }, cell.value);
          }
        }, this);
      }, this);
      this.score = previousState.score;
      this.over = previousState.over;
      this.won = previousState.won;
      this.keepPlaying = previousState.keepPlaying;
    } else {
      this.grid = new Grid();
      this.score = 0;
      this.over = false;
      this.won = false;
      this.keepPlaying = false;
      this.addStartTiles();
    }

    this.actuate();
  };

  GameManager.prototype.addStartTiles = function () {
    for (let i = 0; i < this.startTiles; i++) {
      this.addRandomTile();
    }
  };

  GameManager.prototype.addRandomTile = function () {
    const cell = this.grid.randomAvailableCell();
    if (cell) {
      const value = Math.random() < 0.9 ? 2 : 4;
      const tile = new Tile(cell, value);
      this.grid.insertTile(tile);
    }
  };

  GameManager.prototype.actuate = function () {
    if (this.storageManager.getBestScore() < this.score) {
      this.storageManager.setBestScore(this.score);
    }

    if (this.over) {
      this.storageManager.clearGameState();
    } else {
      this.storageManager.setGameState(this.serialize());
    }

    this.actuator.actuate(this.grid, {
      score: this.score,
      over: this.over,
      won: this.won,
      bestScore: this.storageManager.getBestScore(),
      terminated: this.isGameTerminated()
    });
  };

  GameManager.prototype.serialize = function () {
    return {
      grid: {
        cells: this.grid.cells.map(function (column) {
          return column.map(function (cell) {
            return cell ? { x: cell.x, y: cell.y, value: cell.value } : null;
          });
        })
      },
      score: this.score,
      over: this.over,
      won: this.won,
      keepPlaying: this.keepPlaying
    };
  };

  GameManager.prototype.isGameTerminated = function () {
    return this.over || (this.won && !this.keepPlaying);
  };

  GameManager.prototype.prepareTiles = function () {
    this.grid.cells.forEach(function (column) {
      column.forEach(function (cell) {
        if (cell) {
          cell.mergedFrom = null;
          cell.savePosition();
        }
      });
    });
  };

  GameManager.prototype.moveTile = function (tile, cell) {
    this.grid.cells[tile.x][tile.y] = null;
    this.grid.cells[cell.x][cell.y] = tile;
    tile.updatePosition(cell);
  };

  GameManager.prototype.move = function (direction) {
    if (this.isGameTerminated()) return;

    const self = this;
    const vector = this.getVector(direction);
    const traversals = this.buildTraversals(vector);
    let moved = false;

    this.prepareTiles();

    traversals.x.forEach(function (x) {
      traversals.y.forEach(function (y) {
        const cell = { x: x, y: y };
        const tile = self.grid.cellContent(cell);

        if (tile) {
          const positions = self.findFarthestPosition(cell, vector);
          const next = self.grid.cellContent(positions.next);

          if (next && next.value === tile.value && !next.mergedFrom) {
            const merged = new Tile(positions.next, tile.value * 2);
            merged.mergedFrom = [tile, next];

            self.grid.insertTile(merged);
            self.grid.removeTile(tile);

            tile.updatePosition(positions.next);

            self.score += merged.value;

            if (merged.value === 2048) self.won = true;
          } else {
            self.moveTile(tile, positions.farthest);
          }

          if (cell.x !== tile.x || cell.y !== tile.y) {
            moved = true;
          }
        }
      });
    });

    if (moved) {
      this.addRandomTile();
      if (!this.movesAvailable()) {
        this.over = true;
      }
      this.actuate();
    }
  };

  GameManager.prototype.getVector = function (direction) {
    const map = [
      { x: 0, y: -1 }, // Up
      { x: 1, y: 0 },  // Right
      { x: 0, y: 1 },  // Down
      { x: -1, y: 0 }  // Left
    ];
    return map[direction];
  };

  GameManager.prototype.buildTraversals = function (vector) {
    const traversals = { x: [], y: [] };
    for (let pos = 0; pos < this.size; pos++) {
      traversals.x.push(pos);
      traversals.y.push(pos);
    }
    if (vector.x === 1) traversals.x.reverse();
    if (vector.y === 1) traversals.y.reverse();
    return traversals;
  };

  GameManager.prototype.findFarthestPosition = function (cell, vector) {
    let previous;
    do {
      previous = cell;
      cell = { x: previous.x + vector.x, y: previous.y + vector.y };
    } while (this.grid.withinBounds(cell) && this.grid.cellAvailable(cell));

    return { farthest: previous, next: cell };
  };

  GameManager.prototype.movesAvailable = function () {
    return this.grid.availableCells().length > 0 || this.tileMatchesAvailable();
  };

  GameManager.prototype.tileMatchesAvailable = function () {
    for (let x = 0; x < this.size; x++) {
      for (let y = 0; y < this.size; y++) {
        const tile = this.grid.cellContent({ x: x, y: y });
        if (tile) {
          for (let d = 0; d < 4; d++) {
            const vector = this.getVector(d);
            const other = this.grid.cellContent({ x: x + vector.x, y: y + vector.y });
            if (other && other.value === tile.value) return true;
          }
        }
      }
    }
    return false;
  };

  // === Start ===
  new GameManager();
})();
