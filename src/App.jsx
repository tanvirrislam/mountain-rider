import React, { useEffect, useRef, useState } from 'react';
import initGame from './game/Game';
import './index.css';

function App() {
  const gameRef = useRef(null);
  const [gameState, setGameState] = useState('menu');
  const [stats, setStats] = useState({ distance: 0, time: 0, speed: 0 });

  useEffect(() => {
    const game = initGame('game-container', { setGameState, setStats });
    gameRef.current = game;
    return () => game.destroy(true);
  }, []);

  const handleStart = () => {
    setGameState('playing');
    const scene = gameRef.current.scene.getScene('MenuScene');
    if (scene) scene.scene.start('GameScene');
    else gameRef.current.scene.start('GameScene');
  };

  const handleRestart = () => {
    setGameState('playing');
    const scene = gameRef.current.scene.getScene('GameScene');
    if (scene) scene.scene.restart();
    else gameRef.current.scene.start('GameScene');
  };

  return (
    <>
      <div id="game-container" />

      {/* show speed, time and other */}
      {gameState === 'playing' && (
        <div className="ui-overlay">
          <div className="hud-top">
            <div className="hud-panel">
              <span className="hud-label">Distance</span>
              <span className="hud-value distance">{Math.floor(stats.distance)}m</span>
            </div>
            <div className="hud-panel">
              <span className="hud-label">Time</span>
              <span className="hud-value timer">{stats.time.toFixed(1)}s</span>
            </div>
            <div className="hud-panel">
              <span className="hud-label">Speed</span>
              <span className="hud-value speed">{Math.floor(stats.speed)} km/h</span>
            </div>
          </div>
        </div>
      )}

      {/* main menu */}
      {gameState === 'menu' && (
        <div className="menu-overlay">
          <div className="menu-icon">🏔️</div>
          <h1 className="menu-title">Mountain Rider</h1>
          <p className="menu-subtitle">Physics Driving Game</p>
          <button className="btn" onClick={handleStart}>
            ▶ Start Engine
          </button>
          <div className="controls-hint">
            <span className="key-badge">A</span>
            <span>Reverse</span>
            <span className="key-badge">D</span>
            <span>Accelerate</span>
          </div>
        </div>
      )}

      {/* show when game is over */}
      {gameState === 'gameover' && (
        <div className="menu-overlay">
          <h1 className="menu-title">Crashed!</h1>
          <div className="result-stats">
            <div className="result-stat">
              <div className="stat-label">Distance</div>
              <div className="stat-value orange">{Math.floor(stats.distance)}m</div>
            </div>
            <div className="result-stat">
              <div className="stat-label">Time</div>
              <div className="stat-value red">{stats.time.toFixed(1)}s</div>
            </div>
          </div>
          <button className="btn" onClick={handleRestart}>Try Again</button>
        </div>
      )}

      {/* show when game is finished */}
      {gameState === 'victory' && (
        <div className="menu-overlay">
          <div className="menu-icon">🏁</div>
          <h1 className="menu-title">Victory!</h1>
          <div className="result-stats">
            <div className="result-stat">
              <div className="stat-label">Time</div>
              <div className="stat-value green">{stats.time.toFixed(1)}s</div>
            </div>
            <div className="result-stat">
              <div className="stat-label">Distance</div>
              <div className="stat-value green">{Math.floor(stats.distance)}m</div>
            </div>
          </div>
          <button className="btn btn-green" onClick={handleRestart}>▶ Play Again</button>
        </div>
      )}
    </>
  );
}

export default App;
