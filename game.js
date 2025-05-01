import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        
        // Initialize the core components immediately
        this.setupRenderer();
        this.setupScene();
        this.setupCamera();
        this.setupLights();
        this.setupControls();
        
        // Start animation loop right away - don't wait for textures
        this.animate();
        
        // Load textures and create world/player after animation has started
        this.loadTextures().then(() => {
            this.createWorld();
            this.createPlayer();
            this.setupEventListeners();
            console.log("Game fully initialized with textures");
        }).catch(error => {
            console.error("Error loading textures:", error);
            // Create fallback objects if textures fail
            this.createFallbackWorld();
            this.createFallbackPlayer();
            this.setupEventListeners();
        });
    }

    setupRenderer() {
        this.renderer = new THREE.WebGLRenderer({ 
            canvas: this.canvas, 
            antialias: true
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setClearColor(0x87CEEB); // Sky blue background
        
        console.log("Renderer initialized");
    }

    setupScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB); // Ensure background is set on the scene too
        console.log("Scene initialized");
    }

    setupCamera() {
        this.camera = new THREE.PerspectiveCamera(
            60, window.innerWidth / window.innerHeight, 0.1, 1000
        );
        this.camera.position.set(0, 10, 20); // Position further back and higher up
        this.camera.lookAt(0, 0, 0);
        console.log("Camera initialized");
    }

    setupLights() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
        directionalLight.position.set(10, 20, 10);
        this.scene.add(directionalLight);
        
        // Add a hemisphere light for better outdoor lighting
        const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
        this.scene.add(hemisphereLight);
        
        console.log("Lights initialized");
    }

    setupControls() {
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.screenSpacePanning = false;
        this.controls.maxPolarAngle = Math.PI / 2.5;
        this.controls.minDistance = 5;
        this.controls.maxDistance = 50;
        console.log("Controls initialized");
    }

    async loadTextures() {
        const textureLoader = new THREE.TextureLoader();
        
        // Create a promise-based loading mechanism
        const loadTexture = (url) => {
            return new Promise((resolve, reject) => {
                textureLoader.load(
                    url,
                    (texture) => {
                        console.log(`Texture loaded: ${url}`);
                        resolve(texture);
                    },
                    (progressEvent) => {
                        console.log(`Loading texture ${url}: ${progressEvent}`);
                    },
                    (error) => {
                        console.error(`Error loading texture ${url}:`, error);
                        reject(error);
                    }
                );
            });
        };
        
        try {
            // Load the grass texture
            this.grassTexture = await loadTexture('./grass.png');
            this.grassTexture.wrapS = THREE.RepeatWrapping;
            this.grassTexture.wrapT = THREE.RepeatWrapping;
            this.grassTexture.repeat.set(100, 100);
            
            // Load the player texture
            this.playerTexture = await loadTexture('./character.png');
            
            console.log("All textures loaded successfully");
            return true;
        } catch (error) {
            console.error("Texture loading failed:", error);
            throw error;
        }
    }

    createFallbackWorld() {
        // Create a ground plane with a basic material
        const groundGeometry = new THREE.PlaneGeometry(1000, 1000);
        const groundMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x33aa33, // Green color
            roughness: 1.0,
            metalness: 0.0
        });
        this.ground = new THREE.Mesh(groundGeometry, groundMaterial);
        this.ground.rotation.x = -Math.PI / 2; // Rotate to be flat
        this.ground.position.y = 0;
        this.scene.add(this.ground);
        
        // Add a grid helper for reference
        const grid = new THREE.GridHelper(100, 100, 0x000000, 0x000000);
        grid.material.opacity = 0.2;
        grid.material.transparent = true;
        this.scene.add(grid);
        
        console.log("Fallback world created");
    }

    createWorld() {
        // Create a ground plane
        const groundGeometry = new THREE.PlaneGeometry(1000, 1000);
        const groundMaterial = new THREE.MeshStandardMaterial({ 
            map: this.grassTexture,
            roughness: 1.0,
            metalness: 0.0
        });
        this.ground = new THREE.Mesh(groundGeometry, groundMaterial);
        this.ground.rotation.x = -Math.PI / 2; // Rotate to be flat
        this.ground.position.y = 0;
        this.scene.add(this.ground);
        
        // Add a grid helper for reference
        const grid = new THREE.GridHelper(100, 100, 0x000000, 0x000000);
        grid.material.opacity = 0.2;
        grid.material.transparent = true;
        this.scene.add(grid);
        
        console.log("World created with textured ground");
    }

    createFallbackPlayer() {
        // Create a simple colored cube as a fallback player
        const geometry = new THREE.BoxGeometry(1, 3, 1);
        const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        this.playerObject = new THREE.Mesh(geometry, material);
        this.playerObject.position.set(0, 1.5, 0);
        this.scene.add(this.playerObject);
        
        // Player movement properties
        this.targetPosition = new THREE.Vector3(0, 1.5, 0);
        this.isMoving = false;
        this.moveSpeed = 0.08;
        
        console.log("Fallback player created");
    }

    createPlayer() {
        // Create a billboard sprite for the player
        const spriteMaterial = new THREE.SpriteMaterial({ 
            map: this.playerTexture,
            transparent: true
        });
        
        this.playerSprite = new THREE.Sprite(spriteMaterial);
        this.playerSprite.scale.set(2, 3, 1);  // Adjusted scale for better visibility
        this.playerSprite.position.set(0, 1.5, 0); // Position higher above ground
        this.scene.add(this.playerSprite);
        
        // Add a marker below the player
        const markerGeometry = new THREE.CylinderGeometry(0.5, 0.5, 0.1, 16);
        const markerMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        this.playerMarker = new THREE.Mesh(markerGeometry, markerMaterial);
        this.playerMarker.position.set(0, 0.05, 0);
        this.scene.add(this.playerMarker);
        
        // Player movement properties
        this.targetPosition = new THREE.Vector3(0, 1.5, 0);
        this.isMoving = false;
        this.moveSpeed = 0.08;
        
        this.playerObject = this.playerSprite; // Reference for movement
        
        console.log("Player sprite created");
    }

    setupEventListeners() {
        this.raycaster = new THREE.Raycaster();
        this.pointer = new THREE.Vector2();
        
        window.addEventListener('resize', () => this.onWindowResize());
        
        // Click to move
        this.canvas.addEventListener('click', (event) => this.onCanvasClick(event));
        
        console.log("Event listeners set up");
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    onCanvasClick(event) {
        // Calculate pointer position in normalized device coordinates
        this.pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
        
        // Update the picking ray with the camera and pointer position
        this.raycaster.setFromCamera(this.pointer, this.camera);
        
        // Calculate objects intersecting the picking ray
        const intersects = this.raycaster.intersectObject(this.ground);
        
        if (intersects.length > 0) {
            // Get the clicked point on the ground
            const point = intersects[0].point;
            
            // Set the target position (keeping the same y height for sprite)
            this.targetPosition.set(point.x, 1.5, point.z);
            this.isMoving = true;
            
            console.log("Moving to:", point);
        }
    }

    movePlayer() {
        if (!this.isMoving || !this.playerObject) return;
        
        // Calculate direction and distance
        const direction = new THREE.Vector3().subVectors(this.targetPosition, this.playerObject.position);
        const distance = direction.length();
        
        // If player is close enough to target, stop moving
        if (distance < 0.1) {
            this.isMoving = false;
            return;
        }
        
        // Normalize and scale by speed
        direction.normalize().multiplyScalar(this.moveSpeed);
        
        // Move player
        this.playerObject.position.add(direction);
        
        // Update marker position if it exists
        if (this.playerMarker) {
            this.playerMarker.position.x = this.playerObject.position.x;
            this.playerMarker.position.z = this.playerObject.position.z;
        }
        
        // Make camera follow player
        this.controls.target.copy(this.playerObject.position);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        // Add a debug cube if scene is empty (only during initialization)
        if (!this.debugCubeAdded && !this.ground) {
            const debugCube = new THREE.Mesh(
                new THREE.BoxGeometry(2, 2, 2),
                new THREE.MeshBasicMaterial({ color: 0xffff00 })
            );
            debugCube.position.set(0, 1, 0);
            this.scene.add(debugCube);
            this.debugCubeAdded = true;
            console.log("Debug cube added to scene");
        }
        
        // Update player movement
        this.movePlayer();
        
        // Update controls
        this.controls.update();
        
        // Render scene
        this.renderer.render(this.scene, this.camera);
    }
}

// Initialize the game when the page loads
window.addEventListener('DOMContentLoaded', () => {
    console.log("DOM loaded, initializing game");
    window.game = new Game(); // Store in window for debugging
});