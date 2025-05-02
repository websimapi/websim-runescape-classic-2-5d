import * as THREE from 'three';

export class CameraManager {
    constructor(canvas) {
        // Camera configuration
        this.cameraRotation = 0; // Current rotation angle
        this.cameraDistance = 25; // Distance from center
        this.cameraHeight = 25;   // Height of camera
        this.cameraAngle = Math.PI/4; // Vertical camera angle in radians
        this.minCameraAngle = Math.PI/6; // Minimum angle (more horizontal view)
        this.maxCameraAngle = Math.PI/3; // Maximum angle (more top-down view)
        this.minZoom = 15; // Minimum zoom level (closest to character)
        this.maxZoom = 40; // Maximum zoom level (furthest from character)
        
        // Initialize camera
        const aspectRatio = window.innerWidth / window.innerHeight;
        this.camera = new THREE.OrthographicCamera(
            -15 * aspectRatio, 15 * aspectRatio, 
            15, -15, 
            0.1, 1000
        );
        
        // Position for isometric view (updates with camera rotation)
        this.updateCameraPosition(new THREE.Vector3(0, 0, 0));
        
        // Handle window resizing
        window.addEventListener('resize', () => this.onWindowResize());
    }
    
    onWindowResize() {
        const aspectRatio = window.innerWidth / window.innerHeight;
        
        // Update orthographic camera
        const zoom = 15 * (25 / this.cameraDistance);
        this.camera.left = -zoom * aspectRatio;
        this.camera.right = zoom * aspectRatio;
        this.camera.top = zoom;
        this.camera.bottom = -zoom;
        this.camera.updateProjectionMatrix();
    }
    
    rotateCamera(amount) {
        this.cameraRotation += amount;
        this.updateCameraPosition();
    }
    
    adjustCameraAngle(amount) {
        // Adjust camera vertical angle within limits
        this.cameraAngle = Math.max(
            this.minCameraAngle, 
            Math.min(this.maxCameraAngle, this.cameraAngle + amount)
        );
        this.updateCameraPosition();
    }
    
    adjustZoom(amount) {
        // Adjust camera distance (zoom) within limits
        this.cameraDistance = Math.max(
            this.minZoom, 
            Math.min(this.maxZoom, this.cameraDistance + amount)
        );
        this.updateCameraPosition();
    }
    
    updateCameraPosition(targetPos = null) {
        // Use provided position or default to origin
        if (!targetPos) {
            targetPos = new THREE.Vector3(0, 0, 0);
        }
        
        // Calculate camera position based on rotation angle and distance
        const cameraX = targetPos.x + this.cameraDistance * Math.sin(this.cameraRotation);
        const cameraY = this.cameraHeight * Math.sin(this.cameraAngle);
        const cameraZ = targetPos.z + this.cameraDistance * Math.cos(this.cameraRotation);
        
        // Update camera position
        this.camera.position.set(cameraX, cameraY, cameraZ);
        this.camera.lookAt(new THREE.Vector3(targetPos.x, 0, targetPos.z));
        
        // Adjust orthographic camera zoom based on distance - scale based on zoom level
        // The factor needs to be larger when zoomed out to avoid culling
        const zoomFactor = Math.max(1.0, this.cameraDistance / 25);
        const zoom = 15 * zoomFactor;
        const aspectRatio = window.innerWidth / window.innerHeight;
        
        this.camera.left = -zoom * aspectRatio;
        this.camera.right = zoom * aspectRatio;
        this.camera.top = zoom;
        this.camera.bottom = -zoom;
        
        // Increase far plane to prevent distant objects from being culled when zoomed out
        this.camera.near = 0.1;
        this.camera.far = 1000 * zoomFactor;
        this.camera.updateProjectionMatrix();
    }
}