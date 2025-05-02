import * as THREE from 'three';
import { ChunkManager } from './chunk.js';

export class WorldManager {
    constructor(scene, grassTexture) {
        this.scene = scene;
        this.grassTexture = grassTexture;
        
        // World settings
        this.chunkSize = 4; // Size of a single tile
        this.chunksPerDimension = 5; // How many chunks to render in each direction
        this.visibleDistance = 150; // Increased from 50 to 150 for better zoom-out view
        
        this.tiles = [];
        this.worldObjects = []; // Track all objects in the world
        this.loadedChunks = new Map(); // Map to track loaded chunks by coordinates
        
        // Initialize the chunk manager
        this.chunkManager = new ChunkManager(
            this.scene,
            this.grassTexture,
            this.chunkSize,
            this.chunksPerDimension,
            this.tiles,
            this.worldObjects
        );
        
        // Generate initial chunks around origin
        this.updateVisibleChunks(new THREE.Vector3(0, 0, 0));
    }
    
    getChunkKey(x, z) {
        // Convert world coordinates to chunk coordinates and create a unique string key
        const chunkX = Math.floor(x / (this.chunkSize * this.chunksPerDimension));
        const chunkZ = Math.floor(z / (this.chunkSize * this.chunksPerDimension));
        return `${chunkX},${chunkZ}`;
    }
    
    updateVisibleChunks(centerPosition) {
        // Get the player's chunk coordinates
        const centerChunkX = Math.floor(centerPosition.x / (this.chunkSize * this.chunksPerDimension));
        const centerChunkZ = Math.floor(centerPosition.z / (this.chunkSize * this.chunksPerDimension));
        
        // Calculate view distance in chunks
        const viewDistanceInChunks = Math.ceil(this.visibleDistance / (this.chunkSize * this.chunksPerDimension));
        
        // Track which chunks should be visible
        const visibleChunkKeys = new Set();
        
        // Generate or make visible all chunks within view distance
        for (let xOffset = -viewDistanceInChunks; xOffset <= viewDistanceInChunks; xOffset++) {
            for (let zOffset = -viewDistanceInChunks; zOffset <= viewDistanceInChunks; zOffset++) {
                const chunkX = centerChunkX + xOffset;
                const chunkZ = centerChunkZ + zOffset;
                const chunkKey = `${chunkX},${chunkZ}`;
                
                visibleChunkKeys.add(chunkKey);
                
                // If this chunk isn't loaded yet, generate it
                if (!this.loadedChunks.has(chunkKey)) {
                    const chunk = this.chunkManager.generateChunk(chunkX, chunkZ);
                    this.loadedChunks.set(chunkKey, chunk);
                }
            }
        }
        
        // Remove chunks that are too far away
        for (const [key, chunk] of this.loadedChunks.entries()) {
            if (!visibleChunkKeys.has(key)) {
                this.scene.remove(chunk);
                this.loadedChunks.delete(key);
                
                // Remove the tiles from this chunk from the tiles array
                this.tiles = this.tiles.filter(tile => !chunk.children.includes(tile));
            }
        }
    }
    
    getTiles() {
        return this.tiles;
    }
}