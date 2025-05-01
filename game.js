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
        this.assetsLoaded = false; // New flag to track asset loading status
        
        // World generation settings
        this.chunkSize = 4; // Size of a single tile
        this.chunksPerDimension = 5; // How many chunks to render in each direction
        this.loadedChunks = new Map(); // Map to track loaded chunks by coordinates
        this.visibleDistance = 120; // Increased from 50 to ensure larger render distance
        
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
        this.setupRenderer();
        this.setupScene();
        this.setupCamera();
        this.setupLights();
        
        // Load assets first, then initialize game objects and start loop
        this.loadAssets().then(() => {
            this.assetsLoaded = true; // Mark assets as loaded
            this.createWorld();
            this.createPlayer();
            this.setupEventListeners();
            this.gameInitialized = true;
            this.lastTick = Date.now();
            // Update camera position after assets are loaded
            this.updateCameraPosition();
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
        
        // Just set initial camera position without updating chunks
        this.camera.position.set(
            this.cameraDistance * Math.sin(this.cameraRotation),
            this.cameraDistance * Math.sin(this.cameraAngle),
            this.cameraDistance * Math.cos(this.cameraRotation)
        );
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
        // Instead of creating a fixed world, we'll initialize the world manager
        this.tiles = [];
        this.worldObjects = []; // Track all objects in the world
        
        // Generate initial chunks around origin
        this.updateVisibleChunks(new THREE.Vector3(0, 0, 0));
    }
    
    getChunkKey(x, z) {
        // Convert world coordinates to chunk coordinates and create a unique string key
        const chunkX = Math.floor(x / (this.chunkSize * this.chunksPerDimension));
        const chunkZ = Math.floor(z / (this.chunkSize * this.chunksPerDimension));
        return `${chunkX},${chunkZ}`;
    }
    
    generateChunk(chunkX, chunkZ) {
        // Safety check - don't try to generate chunks if textures aren't loaded
        if (!this.assetsLoaded || !this.grassTexture) {
            console.warn("Attempted to generate chunk before assets were loaded");
            return new THREE.Group(); // Return empty group to prevent errors
        }
        
        // Create a chunk of terrain at the specified chunk coordinates
        const chunkGroup = new THREE.Group();
        const startX = chunkX * this.chunkSize * this.chunksPerDimension;
        const startZ = chunkZ * this.chunkSize * this.chunksPerDimension;
        
        // Create the grid of tiles for this chunk
        for (let x = 0; x < this.chunksPerDimension; x++) {
            for (let z = 0; z < this.chunksPerDimension; z++) {
                const worldX = startX + x * this.chunkSize;
                const worldZ = startZ + z * this.chunkSize;
                
                // Create tile geometry
                const tileGeometry = new THREE.PlaneGeometry(this.chunkSize, this.chunkSize);
                
                // Create material with grass texture
                const tileMaterial = new THREE.MeshLambertMaterial({
                    map: this.grassTexture,
                    flatShading: true
                });
                
                // Create the tile mesh
                const tile = new THREE.Mesh(tileGeometry, tileMaterial);
                
                // Position and rotate
                tile.position.set(worldX, 0, worldZ);
                tile.rotation.x = -Math.PI / 2; // Lay flat
                
                // Add to chunk group and tracking array
                chunkGroup.add(tile);
                this.tiles.push(tile);
            }
        }
        
        // Add some random decorations to the chunk (trees and rocks)
        this.addDecorationsToChunk(chunkGroup, startX, startZ);
        
        // Add the chunk to the scene
        this.scene.add(chunkGroup);
        
        return chunkGroup;
    }
    
    addDecorationsToChunk(chunkGroup, startX, startZ) {
        // Create pseudo-random decorations for this chunk
        // Use chunk coordinates as seed for deterministic random generation
        const chunkSeed = startX * 1000 + startZ;
        const random = (offset = 0) => {
            const x = Math.sin(chunkSeed + offset) * 10000;
            return x - Math.floor(x);
        };
        
        const chunkSize = this.chunkSize * this.chunksPerDimension;
        const treesCount = Math.floor(random() * 3) + 1; // 1-3 trees per chunk
        const rocksCount = Math.floor(random(1) * 4) + 1; // 1-4 rocks per chunk
        
        // Colors for objects
        const treeColors = [0x006400, 0x008000, 0x228B22]; // Green shades
        const trunkColors = [0x964B00, 0x7B3F00, 0x5D2E00]; // Brown shades
        
        // Add trees
        for (let i = 0; i < treesCount; i++) {
            const x = startX + random(i * 2) * chunkSize;
            const z = startZ + random(i * 2 + 1) * chunkSize;
            
            // Tree trunk
            const trunkGeometry = new THREE.BoxGeometry(1, 3, 1);
            const trunkMaterial = new THREE.MeshLambertMaterial({ 
                color: trunkColors[Math.floor(random(i * 3) * 3)], 
                flatShading: true 
            });
            const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
            trunk.position.set(x, 1.5, z);
            chunkGroup.add(trunk);
            this.worldObjects.push(trunk);
            
            // Tree top (cube)
            const topGeometry = new THREE.BoxGeometry(3, 3, 3);
            const topMaterial = new THREE.MeshLambertMaterial({ 
                color: treeColors[Math.floor(random(i * 4) * 3)], 
                flatShading: true 
            });
            const top = new THREE.Mesh(topGeometry, topMaterial);
            top.position.set(x, 4.5, z);
            chunkGroup.add(top);
            this.worldObjects.push(top);
        }
        
        // Add rocks
        for (let i = 0; i < rocksCount; i++) {
            const x = startX + random(i * 5 + 10) * chunkSize;
            const z = startZ + random(i * 5 + 11) * chunkSize;
            
            const rockGeometry = new THREE.BoxGeometry(2, 1.5, 2);
            const rockMaterial = new THREE.MeshLambertMaterial({ 
                color: 0x808080, 
                flatShading: true 
            });
            const rock = new THREE.Mesh(rockGeometry, rockMaterial);
            rock.position.set(x, 0.75, z);
            chunkGroup.add(rock);
            this.worldObjects.push(rock);
        }
    }
    
    updateVisibleChunks(centerPosition) {
        // Skip chunk generation if assets aren't loaded yet
        if (!this.assetsLoaded) {
            return;
        }
        
        // Get the player's chunk coordinates
        const centerChunkX = Math.floor(centerPosition.x / (this.chunkSize * this.chunksPerDimension));
        const centerChunkZ = Math.floor(centerPosition.z / (this.chunkSize * this.chunksPerDimension));
        
        // Calculate view distance in chunks - adding buffer based on camera distance
        const cameraBuffer = this.cameraDistance / 10; // Add additional buffer based on zoom level
        const viewDistanceInChunks = Math.ceil((this.visibleDistance + cameraBuffer) / (this.chunkSize * this.chunksPerDimension));
        
        // Track which chunks should be visible
        const visibleChunkKeys = new Set();
        
        // Generate or make visible all chunks within view distance
        for (let xOffset = -viewDistanceInChunks; xOffset <= viewDistanceInChunks; xOffset++) {
            for (let zOffset = -viewDistanceInChunks; zOffset <= viewDistanceInChunks; zOffset++) {
                const chunkX = centerChunkX + xOffset;
                const chunkZ = centerChunkZ + zOffset;
                const chunkKey = `${chunkX},${chunkZ}`;
                
                visibleChunkKeys.add(chunkKey);
                
                // If this chunk isn't loaded yet, generate it
                if (!this.loadedChunks.has(chunkKey)) {
                    const chunk = this.generateChunk(chunkX, chunkZ);
                    this.loadedChunks.set(chunkKey, chunk);
                }
            }
        }
        
        // Remove chunks that are too far away
        for (const [key, chunk] of this.loadedChunks.entries()) {
            if (!visibleChunkKeys.has(key)) {
                this.scene.remove(chunk);
                this.loadedChunks.delete(key);
                
                // Remove the tiles from this chunk from the tiles array
                this.tiles = this.tiles.filter(tile => !chunk.children.includes(tile));
            }
        }
    }
    
    addBlockyObjects() {
        // This is no longer needed as objects are created with chunks
        // The function remains but is empty for backward compatibility
    }
    
    createPlayer() {
        // Safety check - don't try to create player if textures aren't loaded
        if (!this.assetsLoaded || !this.playerTexture) {
            console.warn("Attempted to create player before assets were loaded");
            return;
        }
        
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
        
        // Add keyboard controls for camera
        window.addEventListener('keydown', (event) => this.handleKeyDown(event));
        window.addEventListener('keyup', (event) => this.handleKeyUp(event));
        
        // Add mouse wheel for zooming
        window.addEventListener('wheel', (event) => this.handleMouseWheel(event));
        
        // Mouse cursor handling for interaction
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
    }

    handleMouseWheel(event) {
        // Determine scroll direction - inverting the scroll direction
        const scrollAmount = event.deltaY * -0.01;
        
        // Adjust camera distance (zoom)
        this.cameraDistance = Math.max(
            this.minZoom, 
            Math.min(this.maxZoom, this.cameraDistance + scrollAmount)
        );
        
        // Update camera position with new distance
        this.updateCameraPosition();
    }

    handleKeyDown(event) {
        this.keysPressed[event.key] = true;
    }

    handleKeyUp(event) {
        this.keysPressed[event.key] = false;
    }

    processKeyboardInput(deltaTime) {
        // Return if game not initialized
        if (!this.gameInitialized) return;

        const rotationSpeed = 1.5 * deltaTime; // Rotation speed in radians per second
        const angleSpeed = 0.5 * deltaTime; // Angle change speed in radians per second

        // Rotate camera left/right
        if (this.keysPressed['ArrowLeft']) {
            this.cameraRotation -= rotationSpeed; // Rotate left
            this.updateCameraPosition();
        }
        if (this.keysPressed['ArrowRight']) {
            this.cameraRotation += rotationSpeed; // Rotate right
            this.updateCameraPosition();
        }

        // Adjust camera vertical angle
        if (this.keysPressed['ArrowUp']) {
            // Look more from above (increase angle)
            this.cameraAngle = Math.min(this.maxCameraAngle, this.cameraAngle + angleSpeed);
            this.updateCameraPosition();
        }
        if (this.keysPressed['ArrowDown']) {
            // Look more level (decrease angle, but not too low to prevent seeing under terrain)
            this.cameraAngle = Math.max(this.minCameraAngle, this.cameraAngle - angleSpeed);
            this.updateCameraPosition();
        }
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
        
        // Update visible chunks as player moves
        this.updateVisibleChunks(this.playerSprite.position);
        
        // Update camera to follow player (maintaining isometric view)
        this.updateCameraPosition();
    }
    
    updateCameraPosition() {
        // Get player position or use origin if no player
        const targetPos = this.playerSprite ? 
            new THREE.Vector3(this.playerSprite.position.x, 0, this.playerSprite.position.z) : 
            new THREE.Vector3(0, 0, 0);
        
        // Calculate camera position based on rotation angle and distance
        const cameraX = targetPos.x + this.cameraDistance * Math.sin(this.cameraRotation);
        const cameraY = this.cameraDistance * Math.sin(this.cameraAngle);
        const cameraZ = targetPos.z + this.cameraDistance * Math.cos(this.cameraRotation);
        
        // Update camera position
        this.camera.position.set(cameraX, cameraY, cameraZ);
        this.camera.lookAt(new THREE.Vector3(targetPos.x, 0, targetPos.z));
        
        // Adjust orthographic camera zoom based on distance
        const zoom = 15 * (25 / this.cameraDistance);
        const aspectRatio = window.innerWidth / window.innerHeight;
        this.camera.left = -zoom * aspectRatio;
        this.camera.right = zoom * aspectRatio;
        this.camera.top = zoom;
        this.camera.bottom = -zoom;
        this.camera.updateProjectionMatrix();
        
        // Only update chunks if assets are loaded
        if (this.assetsLoaded) {
            this.updateVisibleChunks(targetPos);
        }
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
        this.processKeyboardInput(deltaTime);
        
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