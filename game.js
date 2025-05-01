// game.js
import * as THREE from 'three';
import './renderer.js';
import './camera.js';
import './world.js';
import './player.js';
import './input.js';
import './utils.js';

// Initialize game when page loads
window.addEventListener('DOMContentLoaded', () => {
    console.log("Starting RuneScape Classic 2.5D game");
    // Initialize the game using the new modular implementation
    // Replace with the actual initialization function from the modular implementation
    // For example:
    import('./js/game-init.js').then(module => module.initGame());
});