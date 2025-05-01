import * as THREE from 'three';

export class PlayerManager {
    constructor(scene, playerTexture) {
        this.scene = scene;
        this.playerTexture = playerTexture;
        
        // Create the player entity
        this.createPlayer();
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
    
    setTargetPosition(position) {
        this.playerState.targetPosition = position;
        this.playerState.isMoving = true;
    }
    
    isMoving() {
        return this.playerState.isMoving;
    }
    
    getPosition() {
        return this.playerSprite ? this.playerSprite.position : new THREE.Vector3(0, 0, 0);
    }
    
    updatePlayerMovement(deltaTime) {
        // Safety check - only update if player exists and is moving
        if (!this.playerSprite || !this.playerShadow) return;
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
}