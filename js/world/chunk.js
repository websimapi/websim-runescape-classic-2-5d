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
        
        // Decide if this chunk has a campsite (roughly 15% chance)
        const hasCampsite = random(100) < 0.15;
        
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
        
        // Add campsite if determined
        if (hasCampsite) {
            this.addCampsite(chunkGroup, startX, startZ, random, chunkSize);
        }
    }
    
    addCampsite(chunkGroup, startX, startZ, random, chunkSize) {
        // Choose a position for the campsite somewhere in the chunk
        const campsiteX = startX + random(50) * chunkSize * 0.8 + chunkSize * 0.1;
        const campsiteZ = startZ + random(51) * chunkSize * 0.8 + chunkSize * 0.1;
        
        // Create a campsite group to organize and position elements
        const campsiteGroup = new THREE.Group();
        campsiteGroup.position.set(campsiteX, 0, campsiteZ);
        
        // Add fire pit in the center first
        this.addFirePit(campsiteGroup);
        
        // Track occupied positions to prevent overlaps
        const occupiedPositions = [
            { x: 0, z: 0, radius: 1.2 } // Fire pit position and radius
        ];
        
        // Add logs around the fire (2-4 logs)
        const logsCount = Math.floor(random(100) * 3) + 2;
        for (let i = 0; i < logsCount; i++) {
            const angle = (i / logsCount) * Math.PI * 2 + random(110 + i) * 0.5;
            const distance = 2.2 + random(120 + i) * 0.3;
            const logX = Math.cos(angle) * distance;
            const logZ = Math.sin(angle) * distance;
            
            this.addLog(campsiteGroup, logX, logZ, angle + Math.PI/2);
            
            // Track the log position
            occupiedPositions.push({
                x: logX,
                z: logZ,
                radius: 1.0 // Size of the log and some margin
            });
        }
        
        // Add tents (1-2 tents) in valid positions
        const tentsCount = Math.floor(random(60) * 2) + 1;
        let attemptsPerTent = 10; // Maximum placement attempts per tent
        
        for (let i = 0; i < tentsCount; i++) {
            let placed = false;
            let attempts = 0;
            
            while (!placed && attempts < attemptsPerTent) {
                const angle = random(70 + i * 10 + attempts) * Math.PI * 2;
                const distance = 3.5 + random(80 + i * 10 + attempts) * 2;
                const tentX = Math.cos(angle) * distance;
                const tentZ = Math.sin(angle) * distance;
                
                // Check if position is valid (not overlapping with existing objects)
                let isValid = true;
                for (const pos of occupiedPositions) {
                    const dx = tentX - pos.x;
                    const dz = tentZ - pos.z;
                    const distance = Math.sqrt(dx * dx + dz * dz);
                    if (distance < (pos.radius + 1.8)) { // Tent radius + buffer
                        isValid = false;
                        break;
                    }
                }
                
                if (isValid) {
                    this.addTent(
                        campsiteGroup, 
                        tentX,
                        tentZ,
                        random(90 + i) * Math.PI * 2 // rotation
                    );
                    
                    // Track the tent position
                    occupiedPositions.push({
                        x: tentX,
                        z: tentZ,
                        radius: 1.8 // Size of tent and some margin
                    });
                    
                    placed = true;
                }
                
                attempts++;
            }
        }
        
        chunkGroup.add(campsiteGroup);
        this.worldObjects.push(campsiteGroup);
    }
    
    addTent(parent, offsetX, offsetZ, rotation) {
        // Tent colors (muted earthy tones typical of RuneScape Classic)
        const tentColors = [0x8B4513, 0xA0522D, 0xCD853F, 0xD2691E];
        const colorIndex = Math.floor(rotation * 4) % 4;
        
        // Create tent group
        const tentGroup = new THREE.Group();
        tentGroup.position.set(offsetX, 0, offsetZ);
        tentGroup.rotation.y = rotation; // Rotation in radians
        
        // Tent base (flat rectangle on ground)
        const baseGeometry = new THREE.BoxGeometry(2.8, 0.1, 2.2);
        const baseMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x5D4037, 
            flatShading: true 
        });
        const base = new THREE.Mesh(baseGeometry, baseMaterial);
        base.position.set(0, 0.05, 0);
        tentGroup.add(base);
        
        // Tent sides (triangular prism shape)
        const tentMaterial = new THREE.MeshLambertMaterial({ 
            color: tentColors[colorIndex], 
            flatShading: true 
        });
        
        // Main tent body
        const tentWidth = 2.6;
        const tentDepth = 2.0;
        const tentHeight = 1.8;
        
        // Front panel (with entrance)
        const frontGeometry = new THREE.BufferGeometry();
        const frontVertices = new Float32Array([
            -tentWidth/2, 0, tentDepth/2,     // bottom left
            tentWidth/2, 0, tentDepth/2,      // bottom right
            0, tentHeight, 0                   // top
        ]);
        frontGeometry.setAttribute('position', new THREE.BufferAttribute(frontVertices, 3));
        frontGeometry.computeVertexNormals();
        const frontTriangle = new THREE.Mesh(frontGeometry, tentMaterial);
        tentGroup.add(frontTriangle);
        
        // Back panel
        const backGeometry = new THREE.BufferGeometry();
        const backVertices = new Float32Array([
            -tentWidth/2, 0, -tentDepth/2,    // bottom left
            tentWidth/2, 0, -tentDepth/2,     // bottom right
            0, tentHeight, 0                   // top
        ]);
        backGeometry.setAttribute('position', new THREE.BufferAttribute(backVertices, 3));
        backGeometry.computeVertexNormals();
        const backTriangle = new THREE.Mesh(backGeometry, tentMaterial);
        tentGroup.add(backTriangle);
        
        // Side panels
        const leftGeometry = new THREE.BufferGeometry();
        const leftVertices = new Float32Array([
            -tentWidth/2, 0, tentDepth/2,     // front bottom
            -tentWidth/2, 0, -tentDepth/2,    // back bottom
            0, tentHeight, 0                   // top
        ]);
        leftGeometry.setAttribute('position', new THREE.BufferAttribute(leftVertices, 3));
        leftGeometry.computeVertexNormals();
        const leftPanel = new THREE.Mesh(leftGeometry, tentMaterial);
        tentGroup.add(leftPanel);
        
        const rightGeometry = new THREE.BufferGeometry();
        const rightVertices = new Float32Array([
            tentWidth/2, 0, tentDepth/2,      // front bottom
            tentWidth/2, 0, -tentDepth/2,     // back bottom
            0, tentHeight, 0                   // top
        ]);
        rightGeometry.setAttribute('position', new THREE.BufferAttribute(rightVertices, 3));
        rightGeometry.computeVertexNormals();
        const rightPanel = new THREE.Mesh(rightGeometry, tentMaterial);
        tentGroup.add(rightPanel);
        
        // Add a floor inside the tent
        const floorGeometry = new THREE.PlaneGeometry(tentWidth - 0.2, tentDepth - 0.2);
        const floorMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x8B4513, 
            flatShading: true,
            side: THREE.DoubleSide
        });
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = 0.11; // Just above the base
        tentGroup.add(floor);
        
        // Add entrance flap
        const flapWidth = 1.0;
        const flapHeight = 1.2;
        const entranceGeometry = new THREE.PlaneGeometry(flapWidth, flapHeight);
        const entranceMaterial = new THREE.MeshLambertMaterial({ 
            color: tentColors[colorIndex], 
            flatShading: true,
            side: THREE.DoubleSide
        });
        const entranceFlap = new THREE.Mesh(entranceGeometry, entranceMaterial);
        
        // Position flap at front of tent, partially open
        entranceFlap.position.set(0, flapHeight/2, tentDepth/2);
        entranceFlap.rotation.y = Math.PI/4; // Partially open
        tentGroup.add(entranceFlap);
        
        // Add a small flag or banner on top
        const poleGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.8, 4);
        const poleMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x8B4513, 
            flatShading: true 
        });
        const pole = new THREE.Mesh(poleGeometry, poleMaterial);
        pole.position.set(0, tentHeight + 0.4, 0);
        tentGroup.add(pole);
        
        // Flag
        const flagGeometry = new THREE.PlaneGeometry(0.6, 0.3);
        const flagColor = 0xFFD700; // Gold color for contrast
        const flagMaterial = new THREE.MeshLambertMaterial({ 
            color: flagColor, 
            flatShading: true,
            side: THREE.DoubleSide
        });
        const flag = new THREE.Mesh(flagGeometry, flagMaterial);
        flag.position.set(0.3, tentHeight + 0.6, 0);
        flag.rotation.y = Math.PI/2;
        tentGroup.add(flag);
        
        parent.add(tentGroup);
        this.worldObjects.push(tentGroup);
    }
    
    addFirePit(parent) {
        // Create fire pit circle (stones around a fire)
        const stoneMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x808080, 
            flatShading: true 
        });
        
        // Stone circle
        const stoneCount = 8;
        for (let i = 0; i < stoneCount; i++) {
            const angle = (i / stoneCount) * Math.PI * 2;
            const x = Math.cos(angle) * 0.8;
            const z = Math.sin(angle) * 0.8;
            
            const stoneGeometry = new THREE.BoxGeometry(0.3, 0.2, 0.3);
            const stone = new THREE.Mesh(stoneGeometry, stoneMaterial);
            stone.position.set(x, 0.1, z);
            stone.rotation.y = Math.random() * Math.PI;
            parent.add(stone);
            this.worldObjects.push(stone);
        }
        
        // Fire logs (crossed in center)
        const logMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x5D4037, 
            flatShading: true 
        });
        
        const logGeometry1 = new THREE.BoxGeometry(1.2, 0.2, 0.3);
        const log1 = new THREE.Mesh(logGeometry1, logMaterial);
        log1.position.set(0, 0.15, 0);
        log1.rotation.y = Math.PI / 4;
        parent.add(log1);
        this.worldObjects.push(log1);
        
        const logGeometry2 = new THREE.BoxGeometry(1.2, 0.2, 0.3);
        const log2 = new THREE.Mesh(logGeometry2, logMaterial);
        log2.position.set(0, 0.15, 0);
        log2.rotation.y = -Math.PI / 4;
        parent.add(log2);
        this.worldObjects.push(log2);
        
        // Fire (central glowing cube)
        const fireGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
        const fireMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xFF6600, 
            flatShading: true 
        });
        const fire = new THREE.Mesh(fireGeometry, fireMaterial);
        fire.position.set(0, 0.35, 0);
        parent.add(fire);
        this.worldObjects.push(fire);
        
        // Add a light source for the fire
        const fireLight = new THREE.PointLight(0xFF6600, 1, 10);
        fireLight.position.set(0, 1, 0);
        parent.add(fireLight);
    }
    
    addLog(parent, offsetX, offsetZ, rotation) {
        // Create a sitting log
        const logMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x8B4513, 
            flatShading: true 
        });
        
        const logGeometry = new THREE.CylinderGeometry(0.3, 0.3, 1.5, 8);
        const log = new THREE.Mesh(logGeometry, logMaterial);
        
        // Position horizontally as a seat
        log.rotation.z = Math.PI / 2;
        log.rotation.y = rotation;
        log.position.set(offsetX, 0.3, offsetZ);
        
        parent.add(log);
        this.worldObjects.push(log);
    }
}