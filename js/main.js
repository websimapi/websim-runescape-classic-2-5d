import * as THREE from 'three';
import { setupRenderer } from './engine/renderer.js';
import { CameraManager } from './engine/camera.js';
import { WorldManager } from './world/world.js';
import { PlayerManager } from './entity/player.js';
import { InputHandler } from './input/controls.js';

class RunescapeClassicGame {
    constructor() {
        // Core components
        this.canvas = document.getElementById('gameCanvas');
        this.clock = new THREE.Clock();
        this.moveQueue = [];
        this.isProcessingActions = false;
        this.tickRate = 600; // 0.6 seconds per tick, classic RS timing
        this.gameInitialized = false;
        this.lastTick = Date.now();

        // Initialize core systems
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB);
        
        this.renderer = setupRenderer(this.canvas);
        this.setupLights();
        
        // Initialize managers
        this.cameraManager = new CameraManager(this.canvas);
        this.camera = this.cameraManager.camera;
        
        // Load assets first, then initialize game objects and start loop
        this.loadAssets().then(() => {
            this.worldManager = new WorldManager(this.scene, this.grassTexture);
            this.playerManager = new PlayerManager(this.scene, this.characterSpritesheet);
            this.inputHandler = new InputHandler(
                this.canvas, 
                this.camera, 
                this.cameraManager,
                this.worldManager,
                this.playerManager,
                this.moveQueue
            );
            
            this.gameInitialized = true;
            // Start game loop only after initialization
            this.animate();
            console.log("Game fully initialized");
        });
    }

    setupLights() {
        // Simple lighting
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
            
            this.characterSpritesheet = await loadTexture('./character_spritesheet.png');
            this.characterSpritesheet.magFilter = THREE.NearestFilter;
            this.characterSpritesheet.minFilter = THREE.NearestFilter;
            
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
            this.playerManager.setTargetPosition(nextAction.target);
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
        if (this.inputHandler) {
            this.inputHandler.processKeyboardInput(deltaTime);
        }
        
        // Update player movement
        if (this.playerManager) {
            this.playerManager.updatePlayerMovement(deltaTime);
            
            // Update visible chunks as player moves
            if (this.playerManager.isMoving() && this.worldManager) {
                this.worldManager.updateVisibleChunks(this.playerManager.getPosition());
            }
            
            // Update camera to follow player
            if (this.cameraManager) {
                this.cameraManager.updateCameraPosition(this.playerManager.getPosition());
            }
        }
        
        // Render the scene
        this.renderer.render(this.scene, this.camera);
    }
}

// Initialize game when page loads
window.addEventListener('DOMContentLoaded', () => {
    console.log("Starting RuneScape Classic 2.5D game");
    window.game = new RunescapeClassicGame();
});