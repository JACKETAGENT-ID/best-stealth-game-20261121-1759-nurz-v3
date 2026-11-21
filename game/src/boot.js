// Boot: find the canvas, build the night, hand it the keys.
import { NightHeist } from './engine.js';

const canvas = document.getElementById('game');
if (canvas) {
  const game = new NightHeist(canvas);
  game.start();
}
