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
        this.camera.left = -15 * aspectRatio;
        this.camera.right = 15 * aspectRatio;
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
        
        // Adjust camera angle slightly when at extreme zoom levels to prevent culling
        let adjustedCameraAngle = this.cameraAngle;
        if (this.cameraDistance > this.maxZoom * 0.7) {
            // Gradually increase angle as we approach max zoom
            const zoomRatio = (this.cameraDistance - this.maxZoom * 0.7) / (this.maxZoom * 0.3);
            const angleAdjustment = zoomRatio * 0.05; // Small additional tilt
            adjustedCameraAngle += angleAdjustment;
        }
        
        // Calculate camera position based on rotation angle and distance
        const cameraX = targetPos.x + this.cameraDistance * Math.sin(this.cameraRotation);
        const cameraY = this.cameraDistance * Math.sin(adjustedCameraAngle);
        const cameraZ = targetPos.z + this.cameraDistance * Math.cos(this.cameraRotation);
        
        // Update camera position
        this.camera.position.set(cameraX, cameraY, cameraZ);
        this.camera.lookAt(new THREE.Vector3(targetPos.x, 0, targetPos.z));
        
        // Adjust orthographic camera zoom based on distance
        // Add a scaling factor that increases as we zoom out to prevent culling
        const baseZoom = 15;
        const zoomFactor = 25 / this.cameraDistance;
        const scalingFactor = 1 + (this.cameraDistance - this.minZoom) / (this.maxZoom - this.minZoom) * 0.4;
        const zoom = baseZoom * zoomFactor * scalingFactor;
        
        const aspectRatio = window.innerWidth / window.innerHeight;
        this.camera.left = -zoom * aspectRatio;
        this.camera.right = zoom * aspectRatio;
        this.camera.top = zoom;
        this.camera.bottom = -zoom;
        
        // Increase far plane as we zoom out to ensure nothing gets culled
        this.camera.far = Math.max(1000, this.cameraDistance * 20);
        this.camera.updateProjectionMatrix();
    }
}