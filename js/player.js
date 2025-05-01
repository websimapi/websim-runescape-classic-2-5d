import * as THREE from 'three';
import { updateCameraPosition } from './camera.js';
import { updateVisibleChunks } from './world.js';

export function createPlayer(game) {
    // Create a billboard-style sprite for the player (2D in 3D world)
    const spriteMaterial = new THREE.SpriteMaterial({ 
        map: game.playerTexture,
        transparent: true
    });
    
    game.playerSprite = new THREE.Sprite(spriteMaterial);
    game.playerSprite.scale.set(3, 4, 1);
    game.playerSprite.position.set(0, 2, 0);
    game.scene.add(game.playerSprite);
    
    // Add a shadow circle under the player
    const shadowGeometry = new THREE.CircleGeometry(0.7, 16);
    const shadowMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x000000, 
        transparent: true,
        opacity: 0.4
    });
    game.playerShadow = new THREE.Mesh(shadowGeometry, shadowMaterial);
    game.playerShadow.rotation.x = -Math.PI / 2; // Make flat on ground
    game.playerShadow.position.set(0, 0.01, 0); // Just above ground
    game.scene.add(game.playerShadow);
    
    // Player state
    game.playerState = {
        position: new THREE.Vector3(0, 2, 0),
        targetPosition: null,
        isMoving: false,
        moveSpeed: 2, // Units per second
    };
}

export function updatePlayerMovement(game, deltaTime) {
    // Safety check - only update if player exists and is moving
    if (!game.gameInitialized || !game.playerSprite || !game.playerShadow) return;
    if (!game.playerState.isMoving || !game.playerState.targetPosition) return;
    
    // Calculate direction vector
    const direction = new THREE.Vector3().subVectors(
        game.playerState.targetPosition,
        game.playerSprite.position
    );
    
    // If close enough to target, snap to position and stop
    if (direction.length() < 0.1) {
        game.playerSprite.position.copy(game.playerState.targetPosition);
        game.playerState.isMoving = false;
        game.playerState.targetPosition = null;
        return;
    }
    
    // Normalize direction and apply movement
    direction.normalize();
    const moveAmount = game.playerState.moveSpeed * deltaTime;
    
    // Move player and update shadow
    game.playerSprite.position.add(direction.multiplyScalar(moveAmount));
    game.playerShadow.position.x = game.playerSprite.position.x;
    game.playerShadow.position.z = game.playerSprite.position.z;
    
    // Update visible chunks as player moves
    updateVisibleChunks(game, game.playerSprite.position);
    
    // Update camera to follow player (maintaining isometric view)
    updateCameraPosition(game);
}