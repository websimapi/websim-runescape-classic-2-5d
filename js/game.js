import * as THREE from 'three';
import { setupRenderer } from './js/renderer.js';
import { setupCamera, updateCameraPosition } from './js/camera.js';
import { createWorld, updateVisibleChunks } from './js/world.js';
import { createPlayer, updatePlayerMovement } from './js/player.js';
import { setupEventListeners, processKeyboardInput } from './js/input.js';

class RunescapeClassicGame {
    constructor() {
        // Core components
        this.canvas = document.getElementById('gameCanvas');
        this.clock = new THREE.Clock();
        this.moveQueue = [];
        this.isProcessingActions = false;
        this.tickRate = 600; // 0.6 seconds per tick, classic RS timing
        this.gameInitialized = false;
        
        // World generation settings
        this.chunkSize = 4; // Size of a single tile
        this.chunksPerDimension = 5; // How many chunks to render in each direction
        this.loadedChunks = new Map(); // Map to track loaded chunks by coordinates
        this.visibleDistance = 50; // Distance at which chunks are visible
        
        // Camera controls
        this.cameraRotation = 0; // Current rotation angle
        this.cameraDistance = 25; // Distance from center
        this.cameraHeight = 25;   // Height of camera
        this.cameraAngle = Math.PI/4; // Vertical camera angle in radians
        this.minCameraAngle = Math.PI/6; // Minimum angle (more horizontal view)
        this.maxCameraAngle = Math.PI/3; // Maximum angle (more top-down view)
        this.minZoom = 15; // Minimum zoom level (closest to character)
        this.maxZoom = 40; // Maximum zoom level (furthest from character)
        this.keysPressed = {};    // Track keys currently pressed
        
        // Initialize game systems
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB);
        
        this.renderer = setupRenderer(this.canvas);
        this.camera = setupCamera(window.innerWidth / window.innerHeight);
        
        this.setupLights();
        
        // Load assets first, then initialize game objects and start loop
        this.loadAssets().then(() => {
            this.tiles = [];
            this.worldObjects = []; // Track all objects in the world
            
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

    setupLights() {
        // Simple directional light for flat shading
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 20, 10);
        this.scene.add(directionalLight);
    }

    async loadAssets() {
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
    
    processActionQueue() {
        // Safety check - only process if game is initialized
        if (!this.gameInitialized || this.isProcessingActions || this.moveQueue.length === 0) return;
        
        // Get next action
        const nextAction = this.moveQueue.shift();
        this.isProcessingActions = true;
        
        if (nextAction.type === 'move') {
            // Set player target position
            this.playerState.targetPosition = nextAction.target;
            this.playerState.isMoving = true;
        }
        
        // In classic RS, actions are processed on ticks, not instantly
        setTimeout(() => {
            this.isProcessingActions = false;
        }, this.tickRate);
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        const deltaTime = this.clock.getDelta();
        
        // Process the action queue on RS classic tick rate
        const now = Date.now();
        if (now - this.lastTick > this.tickRate) {
            this.processActionQueue();
            this.lastTick = now;
        }
        
        // Process keyboard input for camera control
        processKeyboardInput(this, deltaTime);
        
        // Update player movement
        updatePlayerMovement(this, deltaTime);
        
        // Render the scene
        this.renderer.render(this.scene, this.camera);
    }
}

// Initialize game when page loads
window.addEventListener('DOMContentLoaded', () => {
    console.log("Starting RuneScape Classic 2.5D game");
    window.game = new RunescapeClassicGame();
});