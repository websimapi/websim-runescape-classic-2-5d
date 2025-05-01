// Import necessary modules
import { setupCamera } from './js/engine/camera.js';
import { setupRenderer } from './js/engine/renderer.js';
import { createWorld } from './js/world/world.js';
import { createPlayer } from './js/entity/player.js';
import { setupEventListeners } from './js/input/controls.js';

class RunescapeClassicGame {
    constructor() {
        // Core components
        this.canvas = document.getElementById('gameCanvas');
        this.clock = new THREE.Clock();
        this.moveQueue = [];
        this.isProcessingActions = false;
        this.tickRate = 600; // 0.6 seconds per tick, classic RS timing
        this.gameInitialized = false;

        // Initialize game systems
        setupRenderer(this);
        setupCamera(this);

        // Load assets first, then initialize game objects and start loop
        this.loadAssets().then(() => {
            createWorld(this);
            createPlayer(this);
            setupEventListeners(this);
            this.gameInitialized = true;
            this.lastTick = Date.now();
            // Start game loop only after initialization
            this.animate();
            console.log("Game fully initialized");
        });
    }

    loadAssets() {
        // Load textures
        const textureLoader = new THREE.TextureLoader();
        
        const loadTexture = (url) => {
            return new Promise((resolve, reject) => {
                textureLoader.load(
                    url,
                    (texture) => resolve(texture),
                    undefined,
                    (error) => reject(error)
                );
            });
        };
        
        try {
            this.grassTexture = await loadTexture('./grass.png');
            this.grassTexture.magFilter = THREE.NearestFilter;
            this.grassTexture.minFilter = THREE.NearestFilter;
            
            this.playerTexture = await loadTexture('./character.png');
            this.playerTexture.magFilter = THREE.NearestFilter;
            this.playerTexture.minFilter = THREE.NearestFilter;
            
            return true;
        } catch (error) {
            console.error("Failed to load textures:", error);
            return false;
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        const deltaTime = this.clock.getDelta();
        
        // Process the action queue on RS classic tick rate
        const now = Date.now();
        if (now - this.lastTick > this.tickRate) {
            // Process action queue (not implemented in the given plan)
            this.lastTick = now;
        }
        
        // Process keyboard input for camera control (not implemented in the given plan)
        
        // Update player movement (not implemented in the given plan)
        
        // Render the scene
        this.renderer.render(this.scene, this.camera);
    }
}

// Initialize game when page loads
window.addEventListener('DOMContentLoaded', () => {
    console.log("Starting RuneScape Classic 2.5D game");
    window.game = new RunescapeClassicGame();
});