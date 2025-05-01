import * as THREE from 'three';

export function createWorld(game) {
    // Initialize the world manager
    updateVisibleChunks(game, new THREE.Vector3(0, 0, 0));
}

export function getChunkKey(game, x, z) {
    // Convert world coordinates to chunk coordinates and create a unique string key
    const chunkX = Math.floor(x / (game.chunkSize * game.chunksPerDimension));
    const chunkZ = Math.floor(z / (game.chunkSize * game.chunksPerDimension));
    return `${chunkX},${chunkZ}`;
}

export function generateChunk(game, chunkX, chunkZ) {
    // Create a chunk of terrain at the specified chunk coordinates
    const chunkGroup = new THREE.Group();
    const startX = chunkX * game.chunkSize * game.chunksPerDimension;
    const startZ = chunkZ * game.chunkSize * game.chunksPerDimension;
    
    // Create the grid of tiles for this chunk
    for (let x = 0; x < game.chunksPerDimension; x++) {
        for (let z = 0; z < game.chunksPerDimension; z++) {
            const worldX = startX + x * game.chunkSize;
            const worldZ = startZ + z * game.chunkSize;
            
            // Create tile geometry
            const tileGeometry = new THREE.PlaneGeometry(game.chunkSize, game.chunkSize);
            
            // Create material with grass texture
            const tileMaterial = new THREE.MeshLambertMaterial({
                map: game.grassTexture,
                flatShading: true
            });
            
            // Create the tile mesh
            const tile = new THREE.Mesh(tileGeometry, tileMaterial);
            
            // Position and rotate
            tile.position.set(worldX, 0, worldZ);
            tile.rotation.x = -Math.PI / 2; // Lay flat
            
            // Add to chunk group and tracking array
            chunkGroup.add(tile);
            game.tiles.push(tile);
        }
    }
    
    // Add some random decorations to the chunk (trees and rocks)
    addDecorationsToChunk(game, chunkGroup, startX, startZ);
    
    // Add the chunk to the scene
    game.scene.add(chunkGroup);
    
    return chunkGroup;
}

export function addDecorationsToChunk(game, chunkGroup, startX, startZ) {
    // Create pseudo-random decorations for this chunk
    // Use chunk coordinates as seed for deterministic random generation
    const chunkSeed = startX * 1000 + startZ;
    const random = (offset = 0) => {
        const x = Math.sin(chunkSeed + offset) * 10000;
        return x - Math.floor(x);
    };
    
    const chunkSize = game.chunkSize * game.chunksPerDimension;
    const treesCount = Math.floor(random() * 3) + 1; // 1-3 trees per chunk
    const rocksCount = Math.floor(random(1) * 4) + 1; // 1-4 rocks per chunk
    
    // Colors for objects
    const treeColors = [0x006400, 0x008000, 0x228B22]; // Green shades
    const trunkColors = [0x964B00, 0x7B3F00, 0x5D2E00]; // Brown shades
    
    // Add trees
    for (let i = 0; i < treesCount; i++) {
        const x = startX + random(i * 2) * chunkSize;
        const z = startZ + random(i * 2 + 1) * chunkSize;
        
        // Tree trunk
        const trunkGeometry = new THREE.BoxGeometry(1, 3, 1);
        const trunkMaterial = new THREE.MeshLambertMaterial({ 
            color: trunkColors[Math.floor(random(i * 3) * 3)], 
            flatShading: true 
        });
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.set(x, 1.5, z);
        chunkGroup.add(trunk);
        game.worldObjects.push(trunk);
        
        // Tree top (cube)
        const topGeometry = new THREE.BoxGeometry(3, 3, 3);
        const topMaterial = new THREE.MeshLambertMaterial({ 
            color: treeColors[Math.floor(random(i * 4) * 3)], 
            flatShading: true 
        });
        const top = new THREE.Mesh(topGeometry, topMaterial);
        top.position.set(x, 4.5, z);
        chunkGroup.add(top);
        game.worldObjects.push(top);
    }
    
    // Add rocks
    for (let i = 0; i < rocksCount; i++) {
        const x = startX + random(i * 5 + 10) * chunkSize;
        const z = startZ + random(i * 5 + 11) * chunkSize;
        
        const rockGeometry = new THREE.BoxGeometry(2, 1.5, 2);
        const rockMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x808080, 
            flatShading: true 
        });
        const rock = new THREE.Mesh(rockGeometry, rockMaterial);
        rock.position.set(x, 0.75, z);
        chunkGroup.add(rock);
        game.worldObjects.push(rock);
    }
}

export function updateVisibleChunks(game, centerPosition) {
    // Get the player's chunk coordinates
    const centerChunkX = Math.floor(centerPosition.x / (game.chunkSize * game.chunksPerDimension));
    const centerChunkZ = Math.floor(centerPosition.z / (game.chunkSize * game.chunksPerDimension));
    
    // Calculate view distance in chunks
    const viewDistanceInChunks = Math.ceil(game.visibleDistance / (game.chunkSize * game.chunksPerDimension));
    
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
            if (!game.loadedChunks.has(chunkKey)) {
                const chunk = generateChunk(game, chunkX, chunkZ);
                game.loadedChunks.set(chunkKey, chunk);
            }
        }
    }
    
    // Remove chunks that are too far away
    for (const [key, chunk] of game.loadedChunks.entries()) {
        if (!visibleChunkKeys.has(key)) {
            game.scene.remove(chunk);
            game.loadedChunks.delete(key);
            
            // Remove the tiles from this chunk from the tiles array
            game.tiles = game.tiles.filter(tile => !chunk.children.includes(tile));
        }
    }
}