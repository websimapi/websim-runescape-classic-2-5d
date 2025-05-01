import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.initializeScene();
        this.loadTextures().then(() => {
            this.createWorld();
            this.createPlayer();
            this.setupEventListeners();
            this.animate();
            console.log("Game initialized successfully");
        }).catch(error => {
            console.error("Error loading textures:", error);
        });
    }

    initializeScene() {
        // Set up renderer
        this.renderer = new THREE.WebGLRenderer({ 
            canvas: this.canvas, 
            antialias: true,
            alpha: true
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setClearColor(0x87CEEB); // Sky blue background

        // Set up scene
        this.scene = new THREE.Scene();
        
        // Set up camera (isometric-ish view)
        this.camera = new THREE.PerspectiveCamera(
            60, window.innerWidth / window.innerHeight, 0.1, 1000
        );
        this.camera.position.set(5, 8, 15);
        this.camera.lookAt(0, 0, 0);
        
        // Add some light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
        directionalLight.position.set(10, 20, 10);
        directionalLight.castShadow = true;
        this.scene.add(directionalLight);
        
        // Add controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.screenSpacePanning = false;
        this.controls.maxPolarAngle = Math.PI / 2.5;
        this.controls.minDistance = 5;
        this.controls.maxDistance = 50;
    }

    async loadTextures() {
        const textureLoader = new THREE.TextureLoader();
        
        // Create a promise-based loading mechanism
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
            this.grassTexture = await loadTexture('grass.png');
            this.grassTexture.wrapS = THREE.RepeatWrapping;
            this.grassTexture.wrapT = THREE.RepeatWrapping;
            this.grassTexture.repeat.set(100, 100);
            
            this.playerTexture = await loadTexture('character.png');
            console.log("Textures loaded successfully");
            return true;
        } catch (error) {
            console.error("Error loading textures:", error);
            throw error;
        }
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
        
        // Add a simple grid for reference
        const grid = new THREE.GridHelper(20, 20, 0x000000, 0x000000);
        grid.material.opacity = 0.2;
        grid.material.transparent = true;
        this.scene.add(grid);
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
        
        // Debug object to verify scene rendering
        const debugSphere = new THREE.Mesh(
            new THREE.SphereGeometry(0.2, 16, 16),
            new THREE.MeshBasicMaterial({ color: 0xff0000 })
        );
        debugSphere.position.copy(this.playerSprite.position);
        debugSphere.position.y -= 0.5;  // Just below the sprite
        this.scene.add(debugSphere);
        
        // Player movement
        this.targetPosition = new THREE.Vector3(0, 1.5, 0);
        this.isMoving = false;
        this.moveSpeed = 0.08;
    }

    setupEventListeners() {
        this.raycaster = new THREE.Raycaster();
        this.pointer = new THREE.Vector2();
        
        window.addEventListener('resize', () => this.onWindowResize());
        
        // Click to move
        this.canvas.addEventListener('click', (event) => this.onCanvasClick(event));
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
        if (this.isMoving) {
            // Calculate direction and distance
            const direction = new THREE.Vector3().subVectors(this.targetPosition, this.playerSprite.position);
            const distance = direction.length();
            
            // If player is close enough to target, stop moving
            if (distance < 0.1) {
                this.isMoving = false;
                return;
            }
            
            // Normalize and scale by speed
            direction.normalize().multiplyScalar(this.moveSpeed);
            
            // Move player
            this.playerSprite.position.add(direction);
            
            // Make camera follow player
            this.controls.target.copy(this.playerSprite.position);
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        // Update player movement
        this.movePlayer();
        
        // Update controls
        this.controls.update();
        
        // Ensure the sprite always faces the camera (already handled by THREE.Sprite)
        
        // Render scene
        this.renderer.render(this.scene, this.camera);
    }
}

// Initialize the game when the page loads
window.addEventListener('load', () => {
    console.log("Page loaded, initializing game");
    new Game();
});