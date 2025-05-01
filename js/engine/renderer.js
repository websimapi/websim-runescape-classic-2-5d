import * as THREE from 'three';

export function setupRenderer(canvas) {
    const renderer = new THREE.WebGLRenderer({ 
        canvas: canvas, 
        antialias: false // Deliberately disable for that classic blocky look
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(1); // Force lower pixel ratio for retro look
    renderer.setClearColor(0x87CEEB); // Sky blue background
    
    // Handle window resizing
    window.addEventListener('resize', () => {
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
    
    return renderer;
}