import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.initializeScene();
        this.createWorld();
        this.createPlayer();
        this.setupEventListeners();
        this.animate();
    }

    initializeScene() {
        // Set up renderer
        this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);

        // Set up scene
        this.scene = new THREE.Scene();
        
        // Set up camera (isometric-ish view)
        this.camera = new THREE.PerspectiveCamera(
            45, window.innerWidth / window.innerHeight, 0.1, 1000
        );
        this.camera.position.set(10, 10, 10);
        this.camera.lookAt(0, 0, 0);
        
        // Add some light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(1, 1, 1);
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

    createWorld() {
        // Create a ground plane
        const textureLoader = new THREE.TextureLoader();
        const grassTexture = textureLoader.load('grass.png');
        grassTexture.wrapS = THREE.RepeatWrapping;
        grassTexture.wrapT = THREE.RepeatWrapping;
        grassTexture.repeat.set(100, 100);
        
        const groundGeometry = new THREE.PlaneGeometry(1000, 1000);
        const groundMaterial = new THREE.MeshStandardMaterial({ 
            map: grassTexture,
            roughness: 1.0,
            metalness: 0.0
        });
        this.ground = new THREE.Mesh(groundGeometry, groundMaterial);
        this.ground.rotation.x = -Math.PI / 2; // Rotate to be flat
        this.ground.position.y = 0;
        this.scene.add(this.ground);
    }

    createPlayer() {
        // Create a billboard sprite for the player
        const textureLoader = new THREE.TextureLoader();
        const playerTexture = textureLoader.load('character.png');
        
        const spriteMaterial = new THREE.SpriteMaterial({ 
            map: playerTexture,
            transparent: true
        });
        
        this.playerSprite = new THREE.Sprite(spriteMaterial);
        this.playerSprite.scale.set(2, 2, 1);
        this.playerSprite.position.set(0, 1, 0); // Position slightly above ground
        this.scene.add(this.playerSprite);
        
        // Player movement
        this.targetPosition = new THREE.Vector3(0, 1, 0);
        this.isMoving = false;
        this.moveSpeed = 0.05;
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
            
            // Set the target position (keeping the same y height)
            this.targetPosition.set(point.x, 1, point.z);
            this.isMoving = true;
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
        
        // Render scene
        this.renderer.render(this.scene, this.camera);
    }
}

// Initialize the game once the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new Game();
});

