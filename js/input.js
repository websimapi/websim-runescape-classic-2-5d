import * as THREE from 'three';
import { updateCameraPosition } from './camera.js';
import { onWindowResize } from './camera.js';

export function setupEventListeners(game) {
    window.addEventListener('resize', () => onWindowResize(game));
    game.canvas.addEventListener('click', (event) => onCanvasClick(game, event));
    
    // Add keyboard controls for camera
    window.addEventListener('keydown', (event) => handleKeyDown(game, event));
    window.addEventListener('keyup', (event) => handleKeyUp(game, event));
    
    // Add mouse wheel for zooming
    window.addEventListener('wheel', (event) => handleMouseWheel(game, event));
    
    // Mouse cursor handling for interaction
    game.raycaster = new THREE.Raycaster();
    game.mouse = new THREE.Vector2();
}

export function handleMouseWheel(game, event) {
    // Determine scroll direction - inverting the scroll direction
    const scrollAmount = event.deltaY * -0.01;
    
    // Adjust camera distance (zoom)
    game.cameraDistance = Math.max(
        game.minZoom, 
        Math.min(game.maxZoom, game.cameraDistance + scrollAmount)
    );
    
    // Update camera position with new distance
    updateCameraPosition(game);
}

export function handleKeyDown(game, event) {
    game.keysPressed[event.key] = true;
}

export function handleKeyUp(game, event) {
    game.keysPressed[event.key] = false;
}

export function processKeyboardInput(game, deltaTime) {
    // Return if game not initialized
    if (!game.gameInitialized) return;

    const rotationSpeed = 1.5 * deltaTime; // Rotation speed in radians per second
    const angleSpeed = 0.5 * deltaTime; // Angle change speed in radians per second

    // Rotate camera left/right
    if (game.keysPressed['ArrowLeft']) {
        game.cameraRotation -= rotationSpeed; // Rotate left
        updateCameraPosition(game);
    }
    if (game.keysPressed['ArrowRight']) {
        game.cameraRotation += rotationSpeed; // Rotate right
        updateCameraPosition(game);
    }

    // Adjust camera vertical angle
    if (game.keysPressed['ArrowUp']) {
        // Look more from above (increase angle)
        game.cameraAngle = Math.min(game.maxCameraAngle, game.cameraAngle + angleSpeed);
        updateCameraPosition(game);
    }
    if (game.keysPressed['ArrowDown']) {
        // Look more level (decrease angle, but not too low to prevent seeing under terrain)
        game.cameraAngle = Math.max(game.minCameraAngle, game.cameraAngle - angleSpeed);
        updateCameraPosition(game);
    }
}

export function onCanvasClick(game, event) {
    // Get mouse position
    game.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    game.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    // Raycast to find clicked position
    game.raycaster.setFromCamera(game.mouse, game.camera);
    
    // Check for intersection with any tile
    const intersects = game.raycaster.intersectObjects(game.tiles);
    if (intersects.length > 0) {
        const clickPoint = intersects[0].point;
        
        // Queue movement action (classic RS style)
        game.moveQueue.push({
            type: 'move',
            target: new THREE.Vector3(clickPoint.x, 2, clickPoint.z)
        });
        
        // Visual feedback
        showClickMarker(game, clickPoint);
    }
}

export function showClickMarker(game, position) {
    // Show a temporary click marker
    if (!game.clickMarker) {
        const markerGeometry = new THREE.CircleGeometry(0.5, 8);
        const markerMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xffff00,
            transparent: true,
            opacity: 0.7
        });
        game.clickMarker = new THREE.Mesh(markerGeometry, markerMaterial);
        game.clickMarker.rotation.x = -Math.PI / 2; // Make flat on ground
    }
    
    // Position and add to scene if not already
    game.clickMarker.position.set(position.x, 0.02, position.z);
    game.scene.add(game.clickMarker);
    
    // Remove after delay
    setTimeout(() => {
        game.scene.remove(game.clickMarker);
    }, 500);
}