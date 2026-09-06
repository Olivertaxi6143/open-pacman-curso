// game.js
// Estado y reglas. Depende de globals de maze.js: MAZE, TUNNEL_ROW,
// PACMAN_START, GHOST_STARTS.

const DIRS = {
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
};
const OPPOSITE = { left: 'right', right: 'left', up: 'down', down: 'up' };

const PACMAN_SPEED = 0.125; // 1/8 celda/frame -> alinea cada 8 frames
const GHOST_SPEED = 0.1;    // 1/10 celda/frame

// Crea una partida nueva. Copia MAZE (pristino) a game.grid para poder comer
// dots sin destruir el original, y reiniciar.
function createGame() {
  const grid = MAZE.map( ( row ) => row.slice() );
  // La celda de inicio de Pacman arranca sin dot.
  grid[ PACMAN_START.y ][ PACMAN_START.x ] = 0;

  let dots = 0;
  for ( const row of grid ) for ( const v of row ) if ( v === 2 ) dots++;

  return {
    state: 'start',
    score: 0,
    lives: 3,
    dotsRemaining: dots,
    grid,
    pacman: {
      x: PACMAN_START.x,
      y: PACMAN_START.y,
      dir: 'left',
      nextDir: null,
      speed: PACMAN_SPEED,
    },
    ghosts: GHOST_STARTS.map( ( g ) => ( {
      x: g.x,
      y: g.y,
      dir: 'up',
      speed: GHOST_SPEED,
      kind: g.kind,
    } ) ),
  };
}

function aligned( v ) {
  return Math.abs( v - Math.round( v ) ) < 1e-3;
}

// Una celda es muro para el actor dado?
//   pacman: bloqueado por pared (1) y puerta (3)
//   ghost:  bloqueado solo por pared (1)
function isWall( grid, x, y, actor ) {
  if ( y < 0 || y >= grid.length ) return true;
  if ( x < 0 || x >= grid[ 0 ].length ) return true;
  const v = grid[ y ][ x ];
  if ( v === 1 ) return true;
  if ( v === 3 && actor === 'pacman' ) return true;
  return false;
}

// Puede el actor avanzar desde (x,y) en la direccion dir?
function canMove( grid, x, y, dir, actor ) {
  const d = DIRS[ dir ];
  if ( !d ) return false;
  const tx = x + d.x;
  const ty = y + d.y;
  // Tunel: salir por un borde en la fila del tunel siempre es valido.
  if ( ty === TUNNEL_ROW && ( tx < 0 || tx >= grid[ 0 ].length ) ) return true;
  return !isWall( grid, tx, ty, actor );
}

function wrapTunnel( a, width ) {
  if ( Math.round( a.y ) === TUNNEL_ROW ) {
    if ( a.x < 0 ) a.x += width;
    else if ( a.x >= width ) a.x -= width;
  }
}

function movePacman( game ) {
  const p = game.pacman;
  const grid = game.grid;
  const width = grid[ 0 ].length;

  if ( aligned( p.x ) && aligned( p.y ) ) {
    p.x = Math.round( p.x );
    p.y = Math.round( p.y );

    // Aplicar giro pendiente si es posible.
    if ( p.nextDir && canMove( grid, p.x, p.y, p.nextDir, 'pacman' ) ) {
      p.dir = p.nextDir;
      p.nextDir = null;
    }
    // Comer dot.
    if ( grid[ p.y ][ p.x ] === 2 ) {
      grid[ p.y ][ p.x ] = 0;
      game.score += 10;
      game.dotsRemaining--;
    }
    // Si no puede seguir, se detiene en la celda.
    if ( !canMove( grid, p.x, p.y, p.dir, 'pacman' ) ) return;
  }

  const d = DIRS[ p.dir ];
  p.x += d.x * p.speed;
  p.y += d.y * p.speed;
  wrapTunnel( p, width );
}

function decideGhost( game, g ) {
  const grid = game.grid;
  const p = game.pacman;
  const pd = DIRS[ p.dir ] || { x: 0, y: 0 };

  const options = Object.keys( DIRS ).filter(
    ( dir ) => dir !== OPPOSITE[ g.dir ] && canMove( grid, g.x, g.y, dir, 'ghost' )
  );
  // Sin salida (callejon): permitir el giro de 180.
  const choices = options.length ? options : [ '' + OPPOSITE[ g.dir ] ];

  switch ( g.kind ) {
    case 'blinky':
      g.dir = chooseDirTowards( grid, g, { x: Math.round( p.x ), y: Math.round( p.y ) }, choices );
      break;
    case 'pinky':
      g.dir = chooseDirTowards( grid, g, pinkyTarget( Math.round( p.x ), Math.round( p.y ), pd ), choices );
      break;
    case 'inky':
      g.dir = chooseDirTowards( grid, g, inkyTarget( game, Math.round( p.x ), Math.round( p.y ), pd ), choices );
      break;
    case 'clyde':
      g.dir = clydeDecision( grid, g, { x: Math.round( p.x ), y: Math.round( p.y ) }, choices );
      break;
    default:
      // Safe fallback: random among legal moves
      g.dir = choices[ Math.floor( Math.random() * choices.length ) ];
  }
}

// Elegir dirección hacia un objetivo fijo (posición de celda objetivo).
function chooseDirTowards( grid, ghost, target, choices ) {
  let best = choices[ 0 ];
  let bestDist = Infinity;
  for ( const dir of choices ) {
    const d = DIRS[ dir ];
    const nx = ghost.x + d.x;
    const ny = ghost.y + d.y;
    const dist = Math.abs( nx - target.x ) + Math.abs( ny - target.y );
    if ( dist < bestDist ) {
      bestDist = dist;
      best = dir;
    }
  }
  return best;
}

// Pinky: emboscador — objetivo varias celdas adelante de Pac-Man.
function pinkyTarget( px, py, pd ) {
  // 4 celdas adelante en la dirección actual de Pac-Man
  return { x: px + 4 * pd.x, y: py + 4 * pd.y };
}

// Inky: flanqueador — objetivo derivado de "adelante de Pac-Man" + posición de Blinky.
// Fórmula clásica: target = 2 * (4-ahead) - Blinky_position
function inkyTarget( game, px, py, pd ) {
  const blinky = game.ghosts[ 0 ]; // Blinky siempre está en ghosts[0]
  const ahead = { x: px + 4 * pd.x, y: py + 4 * pd.y };
  // Double-vector: duplicar el vector "4-ahead" y restar la posición de Blinky
  const blinkyRounded = { x: Math.round( blinky.x ), y: Math.round( blinky.y ) };
  return { x: 2 * ahead.x - blinkyRounded.x, y: 2 * ahead.y - blinkyRounded.y };
}

// Clyde: persigue cuando está lejos, se esconde cuando está cerca.
function clydeDecision( grid, g, p, choices ) {
  const gx = Math.round( g.x );
  const gy = Math.round( g.y );
  const px = p.x;
  const py = p.y;
  const dist = Math.abs( gx - px ) + Math.abs( gy - py );

  if ( dist > 8 ) {
    // Persigue a Pac-Man
    let best = choices[ 0 ];
    let bestDist = Infinity;
    for ( const dir of choices ) {
      const d = DIRS[ dir ];
      const nx = gx + d.x;
      const ny = gy + d.y;
      const d2 = Math.abs( nx - px ) + Math.abs( ny - py );
      if ( d2 < bestDist ) {
        bestDist = d2;
        best = dir;
      }
    }
    return best;
  } else {
    // Cuando está cerca, ir a su área de scatter (esquina inferior-derecha)
    const scatterTarget = { x: 27, y: 31 };
    let best = choices[ 0 ];
    let bestDist = Infinity;
    for ( const dir of choices ) {
      const d = DIRS[ dir ];
      const nx = gx + d.x;
      const ny = gy + d.y;
      const d2 = Math.abs( nx - scatterTarget.x ) + Math.abs( ny - scatterTarget.y );
      if ( d2 < bestDist ) {
        bestDist = d2;
        best = dir;
      }
    }
    return best;
  }
}

function moveGhost( game, g ) {
  const grid = game.grid;
  const width = grid[ 0 ].length;

  if ( aligned( g.x ) && aligned( g.y ) ) {
    g.x = Math.round( g.x );
    g.y = Math.round( g.y );
    decideGhost( game, g );
    if ( !canMove( grid, g.x, g.y, g.dir, 'ghost' ) ) return;
  }

  const d = DIRS[ g.dir ];
  g.x += d.x * g.speed;
  g.y += d.y * g.speed;
  wrapTunnel( g, width );
}

function resetPositions( game ) {
  const p = game.pacman;
  p.x = PACMAN_START.x;
  p.y = PACMAN_START.y;
  p.dir = 'left';
  p.nextDir = null;
  game.ghosts.forEach( ( g, i ) => {
    g.x = GHOST_STARTS[ i ].x;
    g.y = GHOST_STARTS[ i ].y;
    g.dir = 'up';
  } );
}

function collides( a, b ) {
  return Math.abs( a.x - b.x ) < 0.5 && Math.abs( a.y - b.y ) < 0.5;
}

function update( game ) {
  movePacman( game );
  game.ghosts.forEach( ( g ) => moveGhost( game, g ) );

  for ( const g of game.ghosts ) {
    if ( collides( game.pacman, g ) ) {
      game.lives--;
      if ( game.lives <= 0 ) {
        game.state = 'lost';
        return;
      }
      resetPositions( game );
      break;
    }
  }

  if ( game.dotsRemaining <= 0 ) game.state = 'won';
}

window.createGame = createGame;
window.update = update;
window.DIRS = DIRS;
