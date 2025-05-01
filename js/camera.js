import * as THREE from 'three';

export function setupCamera(aspectRatio) {
    // Fixed isometric-style camera
    const camera = new THREE.OrthographicCamera(
        -15 * aspectRatio, 15 * aspectRatio, 
        15, -15, 
        0.1, 1000
    );
    
    return camera;
}

export function updateCameraPosition(game) {
    // Get player position or use origin if no player
    const targetPos = game.playerSprite ? 
        new THREE.Vector3(game.playerSprite.position.x, 0, game.playerSprite.position.z) : 
        new THREE.Vector3(0, 0, 0);
    
    // Calculate camera position based on rotation angle and distance
    const cameraX = targetPos.x + game.cameraDistance * Math.sin(game.cameraRotation);
    const cameraY = game.cameraDistance * Math.sin(game.cameraAngle);
    const cameraZ = targetPos.z + game.cameraDistance * Math.cos(game.cameraRotation);
    
    // Update camera position
    game.camera.position.set(cameraX, cameraY, cameraZ);
    game.camera.lookAt(new THREE.Vector3(targetPos.x, 0, targetPos.z));
    
    // Adjust orthographic camera zoom based on distance
    const zoom = 15 * (25 / game.cameraDistance);
    const aspectRatio = window.innerWidth / window.innerHeight;
    game.camera.left = -zoom * aspectRatio;
    game.camera.right = zoom * aspectRatio;
    game.camera.top = zoom;
    game.camera.bottom = -zoom;
    game.camera.updateProjectionMatrix();
}

export function onWindowResize(game) {
    const aspectRatio = window.innerWidth / window.innerHeight;
    
    // Update orthographic camera
    game.camera.left = -15 * aspectRatio;
    game.camera.right = 15 * aspectRatio;
    game.camera.updateProjectionMatrix();
    
    game.renderer.setSize(window.innerWidth, window.innerHeight);
}