// game.js
// Game rules depend on maze.js globals: MAZE, TUNNEL_ROW, PACMAN_START, and
// GHOST_STARTS. Logical cell centers are the movement authority.

const DIRS = {
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
};
const OPPOSITE = { left: 'right', right: 'left', up: 'down', down: 'up' };
const PACMAN_SPEED = 0.08;
const ACTOR_RADIUS = 0.45;
const EPSILON = 1e-9;

const GHOST_SPEEDS = {
  blinky: 0.07,
  pinky: 0.06,
  inky: 0.055,
  clyde: 0.05,
};

function createGame() {
  const grid = MAZE.map( ( row ) => row.slice() );
  grid[ PACMAN_START.y ][ PACMAN_START.x ] = 0;

  let dots = 0;
  for ( const row of grid ) for ( const tile of row ) if ( tile === 2 ) dots++;

  return {
    state: 'start',
    score: 0,
    lives: 3,
    dotsRemaining: dots,
    grid,
    snapshots: null,
    pacman: {
      x: PACMAN_START.x,
      y: PACMAN_START.y,
      dir: 'left',
      nextDir: null,
      speed: PACMAN_SPEED,
    },
    ghosts: GHOST_STARTS.map( ( start ) => ( {
      x: start.x,
      y: start.y,
      dir: 'up',
      speed: GHOST_SPEEDS[ start.kind ] ?? 0.05,
      kind: start.kind,
      mode: 'active',
      scatter: start.scatter,
    } ) ),
  };
}

function atCenter( actor ) {
  return Math.abs( actor.x - Math.round( actor.x ) ) < EPSILON &&
    Math.abs( actor.y - Math.round( actor.y ) ) < EPSILON;
}

function snapToCenter( actor ) {
  actor.x = Math.round( actor.x );
  actor.y = Math.round( actor.y );
}

function isBlocked( grid, x, y, actorType, actor ) {
  if ( y < 0 || y >= grid.length || x < 0 || x >= grid[ 0 ].length ) return true;

  const tile = grid[ y ][ x ];
  if ( tile === 1 ) return true;
  return tile === 3 && ( actorType === 'pacman' || actor.mode !== 'active' );
}

function canMove( grid, x, y, dir, actorType, actor ) {
  const vector = DIRS[ dir ];
  if ( !vector ) return false;

  const nextX = x + vector.x;
  const nextY = y + vector.y;
  if ( nextY === TUNNEL_ROW && ( nextX < 0 || nextX >= grid[ 0 ].length ) ) return true;

  return !isBlocked( grid, nextX, nextY, actorType, actor );
}

function legalDirections( grid, cell, actor, actorType ) {
  return Object.keys( DIRS ).filter( ( dir ) =>
    canMove( grid, cell.x, cell.y, dir, actorType, actor )
  );
}

function wrapTunnel( actor, width ) {
  if ( Math.round( actor.y ) !== TUNNEL_ROW ) return;
  if ( actor.x < 0 ) actor.x += width;
  else if ( actor.x >= width ) actor.x -= width;
}

function distanceToNextCenter( actor, dir ) {
  if ( dir === 'left' ) return atCenter( actor ) ? 1 : actor.x - Math.floor( actor.x );
  if ( dir === 'right' ) return atCenter( actor ) ? 1 : Math.ceil( actor.x ) - actor.x;
  if ( dir === 'up' ) return atCenter( actor ) ? 1 : actor.y - Math.floor( actor.y );
  return atCenter( actor ) ? 1 : Math.ceil( actor.y ) - actor.y;
}

function consumeDot( game, cell ) {
  const row = game.grid[ cell.y ];
  if ( !row || row[ cell.x ] !== 2 ) return false;

  row[ cell.x ] = 0;
  game.score += 10;
  game.dotsRemaining--;
  return true;
}

function choosePacmanDirection( game, pacman, cell ) {
  const legal = legalDirections( game.grid, cell, pacman, 'pacman' );
  if ( !legal.length ) return null;

  if ( pacman.nextDir && legal.includes( pacman.nextDir ) ) {
    const turn = pacman.nextDir;
    pacman.nextDir = null;
    return turn;
  }
  if ( legal.includes( pacman.dir ) ) return pacman.dir;

  return legal.find( ( dir ) => dir !== OPPOSITE[ pacman.dir ] ) ?? legal[ 0 ];
}

function chooseDirTowards( ghost, target, choices ) {
  let best = choices[ 0 ];
  let bestDistance = Infinity;
  for ( const dir of choices ) {
    const vector = DIRS[ dir ];
    const distance = Math.abs( ghost.x + vector.x - target.x ) +
      Math.abs( ghost.y + vector.y - target.y );
    if ( distance < bestDistance ) {
      best = dir;
      bestDistance = distance;
    }
  }
  return best;
}

function pinkyTarget( pacman, direction ) {
  return { x: pacman.x + 4 * direction.x, y: pacman.y + 4 * direction.y };
}

function inkyTarget( game, pacman, direction ) {
  const blinky = game.ghosts[ 0 ];
  const ahead = pinkyTarget( pacman, direction );
  return {
    x: 2 * ahead.x - Math.round( blinky.x ),
    y: 2 * ahead.y - Math.round( blinky.y ),
  };
}

function ghostTarget( game, ghost ) {
  const pacman = { x: Math.round( game.pacman.x ), y: Math.round( game.pacman.y ) };
  const direction = DIRS[ game.pacman.dir ] ?? { x: 0, y: 0 };

  if ( ghost.kind === 'pinky' ) return pinkyTarget( pacman, direction );
  if ( ghost.kind === 'inky' ) return inkyTarget( game, pacman, direction );
  if ( ghost.kind === 'clyde' ) {
    const distance = Math.abs( ghost.x - pacman.x ) + Math.abs( ghost.y - pacman.y );
    return distance > 8 ? pacman : ghost.scatter;
  }
  return pacman;
}

function chooseGhostDirection( game, ghost, cell ) {
  const legal = legalDirections( game.grid, cell, ghost, 'ghost' );
  if ( !legal.length ) return null;

  const choices = legal.filter( ( dir ) => dir !== OPPOSITE[ ghost.dir ] );
  return chooseDirTowards( ghost, ghostTarget( game, ghost ), choices.length ? choices : legal );
}

function chooseDirectionAtCenter( game, actor, actorType, cell ) {
  if ( actorType === 'pacman' ) {
    consumeDot( game, cell );
    return choosePacmanDirection( game, actor, cell );
  }
  return chooseGhostDirection( game, actor, cell );
}

function advanceActor( game, actor, actorType ) {
  const width = game.grid[ 0 ].length;
  let remaining = actor.speed;

  while ( remaining > EPSILON ) {
    if ( atCenter( actor ) ) {
      snapToCenter( actor );
      actor.dir = chooseDirectionAtCenter( game, actor, actorType, { x: actor.x, y: actor.y } );
      if ( !actor.dir ) return;
    }

    const distance = distanceToNextCenter( actor, actor.dir );
    const vector = DIRS[ actor.dir ];
    const step = Math.min( remaining, distance );
    actor.x += vector.x * step;
    actor.y += vector.y * step;
    wrapTunnel( actor, width );
    remaining -= step;

    if ( step + EPSILON >= distance && atCenter( actor ) ) snapToCenter( actor );
  }
}

function snapshotActor( actor ) {
  return Object.freeze( { x: actor.x, y: actor.y, dir: actor.dir } );
}

function snapshotActors( game ) {
  return Object.freeze( {
    pacman: snapshotActor( game.pacman ),
    ghosts: Object.freeze( game.ghosts.map( snapshotActor ) ),
  } );
}

function collidesDuringStep( pacman, ghost, pacmanStart = pacman, ghostStart = ghost ) {
  const relativeStart = { x: pacmanStart.x - ghostStart.x, y: pacmanStart.y - ghostStart.y };
  const relativeVelocity = {
    x: ( pacman.x - pacmanStart.x ) - ( ghost.x - ghostStart.x ),
    y: ( pacman.y - pacmanStart.y ) - ( ghost.y - ghostStart.y ),
  };
  const velocityLength = relativeVelocity.x ** 2 + relativeVelocity.y ** 2;
  const time = velocityLength === 0 ? 0 : Math.max( 0, Math.min( 1,
    -( relativeStart.x * relativeVelocity.x + relativeStart.y * relativeVelocity.y ) / velocityLength
  ) );
  const separationX = relativeStart.x + relativeVelocity.x * time;
  const separationY = relativeStart.y + relativeVelocity.y * time;
  const contactDistance = ACTOR_RADIUS * 2;
  return separationX ** 2 + separationY ** 2 <= contactDistance ** 2;
}

function resetPositions( game ) {
  const pacman = game.pacman;
  pacman.x = PACMAN_START.x;
  pacman.y = PACMAN_START.y;
  pacman.dir = 'left';
  pacman.nextDir = null;
  game.ghosts.forEach( ( ghost, index ) => {
    ghost.x = GHOST_STARTS[ index ].x;
    ghost.y = GHOST_STARTS[ index ].y;
    ghost.dir = 'up';
    ghost.mode = 'active';
  } );
}

function update( game ) {
  game.snapshots = snapshotActors( game );
  advanceActor( game, game.pacman, 'pacman' );
  game.ghosts.forEach( ( ghost ) => advanceActor( game, ghost, 'ghost' ) );

  for ( let index = 0; index < game.ghosts.length; index++ ) {
    const ghost = game.ghosts[ index ];
    if ( ghost.mode !== 'active' ) continue;
    if ( collidesDuringStep( game.pacman, ghost, game.snapshots.pacman, game.snapshots.ghosts[ index ] ) ) {
      game.lives--;
      if ( game.lives <= 0 ) {
        game.state = 'lost';
        return;
      }
      resetPositions( game );
      break;
    }
  }

  if ( game.dotsRemaining === 0 ) game.state = 'won';
}

window.createGame = createGame;
window.update = update;
window.DIRS = DIRS;
