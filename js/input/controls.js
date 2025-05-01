import * as THREE from 'three';

export class InputHandler {
    constructor(canvas, camera, cameraManager, worldManager, playerManager, moveQueue) {
        this.canvas = canvas;
        this.camera = camera;
        this.cameraManager = cameraManager;
        this.worldManager = worldManager;
        this.playerManager = playerManager;
        this.moveQueue = moveQueue;
        
        this.keysPressed = {};
        
        // Initialize raycaster and mouse position tracker
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        
        // Set up input event listeners
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Add click listener for player movement
        this.canvas.addEventListener('click', (event) => this.onCanvasClick(event));
        
        // Add keyboard controls for camera
        window.addEventListener('keydown', (event) => this.handleKeyDown(event));
        window.addEventListener('keyup', (event) => this.handleKeyUp(event));
        
        // Add mouse wheel for zooming
        window.addEventListener('wheel', (event) => this.handleMouseWheel(event));
    }
    
    handleKeyDown(event) {
        this.keysPressed[event.key] = true;
    }
    
    handleKeyUp(event) {
        this.keysPressed[event.key] = false;
    }
    
    handleMouseWheel(event) {
        // Determine scroll direction - inverting the scroll direction
        const scrollAmount = event.deltaY * -0.01;
        
        // Adjust camera zoom
        this.cameraManager.adjustZoom(scrollAmount);
    }
    
    processKeyboardInput(deltaTime) {
        const rotationSpeed = 1.5 * deltaTime; // Rotation speed in radians per second
        const angleSpeed = 0.5 * deltaTime; // Angle change speed in radians per second

        // Rotate camera left/right
        if (this.keysPressed['ArrowLeft']) {
            this.cameraManager.rotateCamera(-rotationSpeed); // Rotate left
        }
        if (this.keysPressed['ArrowRight']) {
            this.cameraManager.rotateCamera(rotationSpeed); // Rotate right
        }

        // Adjust camera vertical angle
        if (this.keysPressed['ArrowUp']) {
            // Look more from above (increase angle)
            this.cameraManager.adjustCameraAngle(angleSpeed);
        }
        if (this.keysPressed['ArrowDown']) {
            // Look more level (decrease angle)
            this.cameraManager.adjustCameraAngle(-angleSpeed);
        }
    }
    
    onCanvasClick(event) {
        // Get mouse position
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        
        // Raycast to find clicked position
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        // Check for intersection with any tile
        const intersects = this.raycaster.intersectObjects(this.worldManager.getTiles());
        if (intersects.length > 0) {
            const clickPoint = intersects[0].point;
            
            // Queue movement action (classic RS style)
            this.moveQueue.push({
                type: 'move',
                target: new THREE.Vector3(clickPoint.x, 2, clickPoint.z)
            });
            
            // Visual feedback
            this.playerManager.showClickMarker(clickPoint);
        }
    }
}