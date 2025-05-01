import * as THREE from 'three';

export class ChunkManager {
    constructor(scene, grassTexture, chunkSize, chunksPerDimension, tilesArray, worldObjectsArray) {
        this.scene = scene;
        this.grassTexture = grassTexture;
        this.chunkSize = chunkSize;
        this.chunksPerDimension = chunksPerDimension;
        this.tiles = tilesArray;
        this.worldObjects = worldObjectsArray;
    }
    
    generateChunk(chunkX, chunkZ) {
        // Create a chunk of terrain at the specified chunk coordinates
        const chunkGroup = new THREE.Group();
        const startX = chunkX * this.chunkSize * this.chunksPerDimension;
        const startZ = chunkZ * this.chunkSize * this.chunksPerDimension;
        
        // Create the grid of tiles for this chunk
        for (let x = 0; x < this.chunksPerDimension; x++) {
            for (let z = 0; z < this.chunksPerDimension; z++) {
                const worldX = startX + x * this.chunkSize;
                const worldZ = startZ + z * this.chunkSize;
                
                // Create tile geometry
                const tileGeometry = new THREE.PlaneGeometry(this.chunkSize, this.chunkSize);
                
                // Create material with grass texture
                const tileMaterial = new THREE.MeshLambertMaterial({
                    map: this.grassTexture,
                    flatShading: true
                });
                
                // Create the tile mesh
                const tile = new THREE.Mesh(tileGeometry, tileMaterial);
                
                // Position and rotate
                tile.position.set(worldX, 0, worldZ);
                tile.rotation.x = -Math.PI / 2; // Lay flat
                
                // Add to chunk group and tracking array
                chunkGroup.add(tile);
                this.tiles.push(tile);
            }
        }
        
        // Add decorations to the chunk
        this.addDecorationsToChunk(chunkGroup, startX, startZ);
        
        // Add the chunk to the scene
        this.scene.add(chunkGroup);
        
        return chunkGroup;
    }
    
    addDecorationsToChunk(chunkGroup, startX, startZ) {
        // Create pseudo-random decorations for this chunk
        // Use chunk coordinates as seed for deterministic random generation
        const chunkSeed = startX * 1000 + startZ;
        const random = (offset = 0) => {
            const x = Math.sin(chunkSeed + offset) * 10000;
            return x - Math.floor(x);
        };
        
        const chunkSize = this.chunkSize * this.chunksPerDimension;
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
            this.worldObjects.push(trunk);
            
            // Tree top (cube)
            const topGeometry = new THREE.BoxGeometry(3, 3, 3);
            const topMaterial = new THREE.MeshLambertMaterial({ 
                color: treeColors[Math.floor(random(i * 4) * 3)], 
                flatShading: true 
            });
            const top = new THREE.Mesh(topGeometry, topMaterial);
            top.position.set(x, 4.5, z);
            chunkGroup.add(top);
            this.worldObjects.push(top);
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
            this.worldObjects.push(rock);
        }
    }
}