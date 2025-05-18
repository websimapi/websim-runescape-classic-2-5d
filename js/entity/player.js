import * as THREE from 'three';

export class PlayerManager {
    constructor(scene, playerTexture) {
        this.scene = scene;
        this.playerTexture = playerTexture;
        
        // Initialize animation properties
        this.setupAnimations();
        
        // Create the player entity
        this.createPlayer();
    }
    
    setupAnimations() {
        // Animation configuration
        this.animationState = {
            currentDirection: 'down', // 'down', 'left', 'right'
            currentFrame: 0,
            totalFrames: 4, // 4 frames per direction
            frameDuration: 150, // milliseconds per frame
            lastFrameTime: 0,
            isAnimating: false,
            facingLeft: false // Track if character should be flipped
        };
        
        // Create texture coordinates for sprite sheet
        // Our sprite sheet has 3 rows (directions) with 4 frames each
        this.animationFrames = {
            down: [],
            left: [],
            right: []
        };
        
        // Calculate UV coordinates for each frame in the sprite sheet
        const frameWidth = 1/4;  // 4 frames horizontally
        const frameHeight = 1/3; // 3 rows vertically
        
        // For each direction (row in sprite sheet)
        for (let frame = 0; frame < 4; frame++) {
            // Down animation (top row)
            this.animationFrames.down.push({
                x: frame * frameWidth,
                y: 0,
                width: frameWidth,
                height: frameHeight
            });
            
            // Left animation (middle row)
            this.animationFrames.left.push({
                x: frame * frameWidth,
                y: frameHeight,
                width: frameWidth,
                height: frameHeight
            });
            
            // Right animation (bottom row)
            this.animationFrames.right.push({
                x: frame * frameWidth,
                y: frameHeight * 2,
                width: frameWidth,
                height: frameHeight
            });
        }
    }
    
    createPlayer() {
        // Create a sprite material with initial frame
        const initialFrame = this.animationFrames.down[0];
        const spriteMaterial = new THREE.SpriteMaterial({ 
            map: this.playerTexture,
            transparent: true
        });
        
        // Set UV coordinates for the initial frame
        spriteMaterial.map.repeat.set(initialFrame.width, initialFrame.height);
        spriteMaterial.map.offset.set(initialFrame.x, initialFrame.y);
        
        // Create sprite with proper centering
        this.playerSprite = new THREE.Sprite(spriteMaterial);
        this.playerSprite.scale.set(3, 4, 1);
        this.playerSprite.position.set(0, 2, 0);
        this.playerSprite.center.set(0.5, 0.25); // Adjust sprite center to better position the character
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
            lastDirection: new THREE.Vector3(0, 0, -1) // Default facing front
        };
    }
    
    setTargetPosition(position) {
        this.playerState.targetPosition = position;
        this.playerState.isMoving = true;
        
        // Start animation when movement begins
        this.animationState.isAnimating = true;
        this.animationState.lastFrameTime = Date.now();
    }
    
    isMoving() {
        return this.playerState.isMoving;
    }
    
    getPosition() {
        return this.playerSprite ? this.playerSprite.position : new THREE.Vector3(0, 0, 0);
    }
    
    updateAnimation() {
        // Only animate if player is moving
        if (!this.animationState.isAnimating) return;
        
        const now = Date.now();
        const elapsed = now - this.animationState.lastFrameTime;
        
        // Update frame if enough time has passed
        if (elapsed > this.animationState.frameDuration) {
            // Move to next frame
            this.animationState.currentFrame = 
                (this.animationState.currentFrame + 1) % this.animationState.totalFrames;
            this.animationState.lastFrameTime = now;
            
            // Get current frame data
            const currentFrame = this.animationFrames[this.animationState.currentDirection][this.animationState.currentFrame];
            
            // Update UV coordinates for the current frame
            this.playerSprite.material.map.offset.set(currentFrame.x, currentFrame.y);
            
            // Apply horizontal flipping if needed
            if (this.animationState.facingLeft) {
                // For left-facing, we flip the sprite horizontally by negating the X-scale
                this.playerSprite.scale.setX(-Math.abs(this.playerSprite.scale.x));
            } else {
                // For right-facing, use positive scale
                this.playerSprite.scale.setX(Math.abs(this.playerSprite.scale.x));
            }
        }
    }
    
    updatePlayerDirection(direction) {
        // Determine direction based on movement vector
        let newDirection;
        
        // Check if we're moving primarily horizontally or vertically
        if (Math.abs(direction.x) > Math.abs(direction.z)) {
            // Primarily horizontal movement
            if (direction.x > 0) {
                // Moving right
                newDirection = 'right';
                this.animationState.facingLeft = false;
            } else {
                // Moving left - use right animation but flip the sprite
                newDirection = 'right'; // Use right animation frames
                this.animationState.facingLeft = true;
            }
        } else {
            // Primarily vertical movement
            newDirection = 'down';
            this.animationState.facingLeft = false;
        }
        
        // Only update direction if it changed
        if (newDirection !== this.animationState.currentDirection) {
            this.animationState.currentDirection = newDirection;
            this.animationState.currentFrame = 0; // Reset frame count when direction changes
            
            // Update sprite with first frame of new direction
            const firstFrame = this.animationFrames[newDirection][0];
            this.playerSprite.material.map.offset.set(firstFrame.x, firstFrame.y);
            
            // Apply horizontal flipping immediately
            if (this.animationState.facingLeft) {
                this.playerSprite.scale.setX(-Math.abs(this.playerSprite.scale.x));
            } else {
                this.playerSprite.scale.setX(Math.abs(this.playerSprite.scale.x));
            }
        }
    }
    
    updatePlayerMovement(deltaTime) {
        // Safety check - only update if player exists and is moving
        if (!this.playerSprite || !this.playerShadow) return;
        if (!this.playerState.isMoving || !this.playerState.targetPosition) {
            // Stop animation if not moving
            if (this.animationState.isAnimating) {
                this.animationState.isAnimating = false;
                
                // Reset to standing frame (first frame of current direction)
                const standingFrame = this.animationFrames[this.animationState.currentDirection][0];
                this.playerSprite.material.map.offset.set(standingFrame.x, standingFrame.y);
            }
            return;
        }
        
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
            this.animationState.isAnimating = false;
            
            // Reset to standing frame (first frame of current direction)
            const standingFrame = this.animationFrames[this.animationState.currentDirection][0];
            this.playerSprite.material.map.offset.set(standingFrame.x, standingFrame.y);
            return;
        }
        
        // Update player direction based on movement
        this.updatePlayerDirection(direction);
        
        // Update animation frame
        this.updateAnimation();
        
        // Normalize direction and apply movement
        direction.normalize();
        this.playerState.lastDirection.copy(direction);
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