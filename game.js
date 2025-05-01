import * as THREE from 'three';

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
        this.setupRenderer();
        this.setupScene();
        this.setupCamera();
        this.setupLights();
        
        // Load assets first, then initialize game objects and start loop
        this.loadAssets().then(() => {
            this.createWorld();
            this.createPlayer();
            this.setupEventListeners();
            this.gameInitialized = true;
            this.lastTick = Date.now();
            // Start game loop only after initialization
            this.animate();
            console.log("Game fully initialized");
        });
    }

    setupRenderer() {
        this.renderer = new THREE.WebGLRenderer({ 
            canvas: this.canvas, 
            antialias: false // Deliberately disable for that classic blocky look
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(1); // Force lower pixel ratio for retro look
        this.renderer.setClearColor(0x87CEEB); // Sky blue background
    }

    setupScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB);
    }

    setupCamera() {
        // Fixed isometric-style camera
        const aspectRatio = window.innerWidth / window.innerHeight;
        this.camera = new THREE.OrthographicCamera(
            -15 * aspectRatio, 15 * aspectRatio, 
            15, -15, 
            0.1, 1000
        );
        
        // Position for isometric view (fixed angle, no rotation allowed)
        this.camera.position.set(20, 25, 20);
        this.camera.lookAt(0, 0, 0);
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

    createWorld() {
        // Create ground tiles (a grid of flat squares rather than a single plane)
        const worldSize = 20;
        const tileSize = 4;
        
        this.tiles = [];
        
        for (let x = -worldSize/2; x < worldSize/2; x++) {
            for (let z = -worldSize/2; z < worldSize/2; z++) {
                // Create a simple tile geometry
                const tileGeometry = new THREE.PlaneGeometry(tileSize, tileSize);
                
                // Create material with flat shading and the grass texture
                const tileMaterial = new THREE.MeshLambertMaterial({
                    map: this.grassTexture,
                    flatShading: true
                });
                
                // Create the tile mesh
                const tile = new THREE.Mesh(tileGeometry, tileMaterial);
                
                // Position and rotate
                tile.position.set(x * tileSize, 0, z * tileSize);
                tile.rotation.x = -Math.PI / 2; // Lay flat
                
                // Add to scene and tracking array
                this.scene.add(tile);
                this.tiles.push(tile);
            }
        }
        
        // Add some simple blocky objects to the scene
        this.addBlockyObjects();
    }
    
    addBlockyObjects() {
        // Create some simple blocky objects in the classic RS style (flat-shaded, no textures)
        const colors = [0x964B00, 0x7B3F00, 0x5D2E00]; // Brown shades
        
        // Create a blocky tree
        for (let i = 0; i < 5; i++) {
            const x = Math.random() * 40 - 20;
            const z = Math.random() * 40 - 20;
            
            // Tree trunk
            const trunkGeometry = new THREE.BoxGeometry(1, 3, 1);
            const trunkMaterial = new THREE.MeshLambertMaterial({ color: colors[1], flatShading: true });
            const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
            trunk.position.set(x, 1.5, z);
            this.scene.add(trunk);
            
            // Tree top (cube)
            const topGeometry = new THREE.BoxGeometry(3, 3, 3);
            const topMaterial = new THREE.MeshLambertMaterial({ color: 0x006400, flatShading: true });
            const top = new THREE.Mesh(topGeometry, topMaterial);
            top.position.set(x, 4.5, z);
            this.scene.add(top);
        }
        
        // Create a blocky rock
        for (let i = 0; i < 7; i++) {
            const x = Math.random() * 40 - 20;
            const z = Math.random() * 40 - 20;
            
            const rockGeometry = new THREE.BoxGeometry(2, 1.5, 2);
            const rockMaterial = new THREE.MeshLambertMaterial({ color: 0x808080, flatShading: true });
            const rock = new THREE.Mesh(rockGeometry, rockMaterial);
            rock.position.set(x, 0.75, z);
            this.scene.add(rock);
        }
    }

    createPlayer() {
        // Create a billboard-style sprite for the player (2D in 3D world)
        const spriteMaterial = new THREE.SpriteMaterial({ 
            map: this.playerTexture,
            transparent: true
        });
        
        this.playerSprite = new THREE.Sprite(spriteMaterial);
        this.playerSprite.scale.set(3, 4, 1);
        this.playerSprite.position.set(0, 2, 0);
        this.scene.add(this.playerSprite);
        
        // Add a shadow circle under the player
        const shadowGeometry = new THREE.CircleGeometry(0.7, 16);
        const shadowMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x000000, 
            transparent: true,
            opacity: 0.4
        });
        this.playerShadow = new THREE.Mesh(shadowGeometry, shadowMaterial);
        this.playerShadow.rotation.x = -Math.PI / 2; // Make flat on ground
        this.playerShadow.position.set(0, 0.01, 0); // Just above ground
        this.scene.add(this.playerShadow);
        
        // Player state
        this.playerState = {
            position: new THREE.Vector3(0, 2, 0),
            targetPosition: null,
            isMoving: false,
            moveSpeed: 2, // Units per second
        };
    }

    setupEventListeners() {
        window.addEventListener('resize', () => this.onWindowResize());
        this.canvas.addEventListener('click', (event) => this.onCanvasClick(event));
        
        // Mouse cursor handling for interaction
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
    }

    onWindowResize() {
        const aspectRatio = window.innerWidth / window.innerHeight;
        
        // Update orthographic camera
        this.camera.left = -15 * aspectRatio;
        this.camera.right = 15 * aspectRatio;
        this.camera.updateProjectionMatrix();
        
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    onCanvasClick(event) {
        // Get mouse position
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        
        // Raycast to find clicked position
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        // Check for intersection with any tile
        const intersects = this.raycaster.intersectObjects(this.tiles);
        if (intersects.length > 0) {
            const clickPoint = intersects[0].point;
            
            // Queue movement action (classic RS style)
            this.moveQueue.push({
                type: 'move',
                target: new THREE.Vector3(clickPoint.x, 2, clickPoint.z)
            });
            
            // Visual feedback
            this.showClickMarker(clickPoint);
        }
    }
    
    showClickMarker(position) {
        // Show a temporary click marker
        if (!this.clickMarker) {
            const markerGeometry = new THREE.CircleGeometry(0.5, 8);
            const markerMaterial = new THREE.MeshBasicMaterial({ 
                color: 0xffff00,
                transparent: true,
                opacity: 0.7
            });
            this.clickMarker = new THREE.Mesh(markerGeometry, markerMaterial);
            this.clickMarker.rotation.x = -Math.PI / 2; // Make flat on ground
        }
        
        // Position and add to scene if not already
        this.clickMarker.position.set(position.x, 0.02, position.z);
        this.scene.add(this.clickMarker);
        
        // Remove after delay
        setTimeout(() => {
            this.scene.remove(this.clickMarker);
        }, 500);
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
    
    updatePlayerMovement(deltaTime) {
        // Safety check - only update if player exists and is moving
        if (!this.gameInitialized || !this.playerSprite || !this.playerShadow) return;
        if (!this.playerState.isMoving || !this.playerState.targetPosition) return;
        
        // Calculate direction vector
        const direction = new THREE.Vector3().subVectors(
            this.playerState.targetPosition,
            this.playerSprite.position
        );
        
        // If close enough to target, snap to position and stop
        if (direction.length() < 0.1) {
            this.playerSprite.position.copy(this.playerState.targetPosition);
            this.playerState.isMoving = false;
            this.playerState.targetPosition = null;
            return;
        }
        
        // Normalize direction and apply movement
        direction.normalize();
        const moveAmount = this.playerState.moveSpeed * deltaTime;
        
        // Move player and update shadow
        this.playerSprite.position.add(direction.multiplyScalar(moveAmount));
        this.playerShadow.position.x = this.playerSprite.position.x;
        this.playerShadow.position.z = this.playerSprite.position.z;
        
        // Update camera to follow player (maintaining isometric view)
        this.updateCameraPosition();
    }
    
    updateCameraPosition() {
        // Safety check - only update if player exists
        if (!this.gameInitialized || !this.playerSprite) return;
        
        // Get player position
        const targetPos = new THREE.Vector3(
            this.playerSprite.position.x,
            0,
            this.playerSprite.position.z
        );
        
        // Move camera target to follow player
        this.camera.lookAt(targetPos);
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
        
        // Update player movement
        this.updatePlayerMovement(deltaTime);
        
        // Render the scene
        this.renderer.render(this.scene, this.camera);
    }
}

// Initialize game when page loads
window.addEventListener('DOMContentLoaded', () => {
    console.log("Starting RuneScape Classic 2.5D game");
    window.game = new RunescapeClassicGame();
});