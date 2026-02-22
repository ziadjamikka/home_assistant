// 3D Apartment Visualization with Three.js
class Apartment3D {
    constructor() {
        this.container = document.getElementById('apartment-3d');
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.rooms = {};
        this.devices = {};
        this.lights = {};
        this.sensors = [];
        
        this.init();
        this.createApartment();
        this.createSensorsPanel();
        this.startSensorUpdates();
        this.animate();
    }

    init() {
        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0e27);
        this.scene.fog = new THREE.Fog(0x0a0e27, 50, 100);

        // Camera
        this.camera = new THREE.PerspectiveCamera(
            60,
            this.container.clientWidth / this.container.clientHeight,
            0.1,
            1000
        );
        this.camera.position.set(35, 30, 35);
        this.camera.lookAt(0, 0, 0);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);

        // Controls
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.maxPolarAngle = Math.PI / 2;

        // Ambient Light
        const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
        this.scene.add(ambientLight);

        // Main Light
        const mainLight = new THREE.DirectionalLight(0xffffff, 0.5);
        mainLight.position.set(20, 30, 20);
        mainLight.castShadow = true;
        mainLight.shadow.mapSize.width = 2048;
        mainLight.shadow.mapSize.height = 2048;
        this.scene.add(mainLight);

        // Handle resize
        window.addEventListener('resize', () => this.onWindowResize());
    }

    createApartment() {
        // Floor
        const floorGeometry = new THREE.PlaneGeometry(60, 50);
        const floorMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x1e293b,
            roughness: 0.8,
            metalness: 0.2
        });
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        this.scene.add(floor);

        // Create realistic apartment layout
        // Main entrance with outdoor area at bottom
        this.createRoom('outdoor', 0, 0, 18, 30, 8, 0x334155);
        
        // Corridors in the middle connecting all rooms
        this.createRoom('corridors', 0, 0, 6, 30, 4, 0x475569);
        
        // Left side: Bathroom (top left)
        this.createRoom('bathroom', -10, 0, -4, 8, 6, 0x475569);
        
        // Left side: Room 1 (middle left)
        this.createRoom('room1', -10, 0, 4, 8, 8, 0x475569);
        
        // Left side: Room 2 (bottom left)
        this.createRoom('room2', -10, 0, 14, 8, 8, 0x475569);
        
        // Right side: Kitchen (top right)
        this.createRoom('kitchen', 10, 0, -4, 8, 6, 0x475569);
        
        // Right side: Reception (middle right) - living room
        this.createRoom('reception', 10, 0, 4, 8, 8, 0x475569);

        // Create devices for each room
        this.createBathroomDevices();
        this.createCorridorsDevices();
        this.createReceptionDevices();
        this.createKitchenDevices();
        this.createRoom1Devices();
        this.createRoom2Devices();
        this.createOutdoorDevices();
    }

    createRoom(name, x, y, z, width, depth, color) {
        const wallHeight = 5;
        const wallThickness = 0.2;

        // Walls
        const wallMaterial = new THREE.MeshStandardMaterial({ 
            color: color,
            roughness: 0.7,
            metalness: 0.1,
            transparent: true,
            opacity: 0.6
        });

        // Back wall
        const backWall = this.createWall(width, wallHeight, wallThickness, wallMaterial);
        backWall.position.set(x, wallHeight/2, z - depth/2);
        this.scene.add(backWall);

        // Front wall
        const frontWall = this.createWall(width, wallHeight, wallThickness, wallMaterial);
        frontWall.position.set(x, wallHeight/2, z + depth/2);
        this.scene.add(frontWall);

        // Left wall
        const leftWall = this.createWall(wallThickness, wallHeight, depth, wallMaterial);
        leftWall.position.set(x - width/2, wallHeight/2, z);
        this.scene.add(leftWall);

        // Right wall
        const rightWall = this.createWall(wallThickness, wallHeight, depth, wallMaterial);
        rightWall.position.set(x + width/2, wallHeight/2, z);
        this.scene.add(rightWall);

        // Room label
        this.createRoomLabel(name, x, wallHeight + 1, z);

        this.rooms[name] = { x, y, z, width, depth };
    }

    createWall(width, height, depth, material) {
        const geometry = new THREE.BoxGeometry(width, height, depth);
        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        return mesh;
    }

    createRoomLabel(text, x, y, z) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 512;
        canvas.height = 128;
        
        context.fillStyle = '#6366f1';
        context.font = 'Bold 48px Arial';
        context.textAlign = 'center';
        context.fillText(text.toUpperCase(), 256, 80);
        
        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({ map: texture });
        const sprite = new THREE.Sprite(material);
        sprite.position.set(x, y, z);
        sprite.scale.set(4, 1, 1);
        this.scene.add(sprite);
    }

    createBathroomDevices() {
        const room = this.rooms['bathroom'];
        this.createLight('bath_light', room.x, 4, room.z);
        this.createFireSensor('bath_fire', room.x + 3, 4, room.z - 2);
        this.createHeater('bath_heater', room.x - 3, 1, room.z + 2);
        this.createFan('bath_fan', room.x + 2, 4, room.z + 2);
    }

    createCorridorsDevices() {
        const room = this.rooms['corridors'];
        this.createLight('corr_main_light', room.x - 8, 4, room.z);
        this.createLight('corr_spots', room.x - 3, 4, room.z);
        this.createLight('corr_spots', room.x + 3, 4, room.z);
        this.createLight('corr_spots', room.x + 8, 4, room.z);
        this.createFireSensor('corr_fire', room.x + 12, 4, room.z);
    }

    createReceptionDevices() {
        const room = this.rooms['reception'];
        this.createLight('rec_light', room.x, 4, room.z);
        this.createWindow('rec_window', room.x + 3.8, 2.5, room.z - 2);
        this.createFireSensor('rec_fire', room.x - 3, 4, room.z - 3);
        this.createSoundSystem('rec_sound', room.x - 3, 1, room.z + 3);
        this.createAC('rec_ac', room.x + 3, 4, room.z + 3);
    }

    createKitchenDevices() {
        const room = this.rooms['kitchen'];
        this.createLight('kit_light', room.x, 4, room.z);
        this.createWindow('kit_window', room.x + 3.8, 2.5, room.z);
        this.createFan('kit_fan', room.x - 2, 4, room.z + 2);
        this.createFireSensor('kit_fire', room.x + 2, 4, room.z - 2);
    }

    createRoom1Devices() {
        const room = this.rooms['room1'];
        this.createLight('r1_light', room.x, 4, room.z);
        this.createWindow('r1_window', room.x - 3.8, 2.5, room.z);
        this.createAC('r1_ac', room.x + 3, 4, room.z - 3);
        this.createTV('r1_tv', room.x, 1.5, room.z - 3.5);
        this.createFireSensor('r1_fire', room.x + 3, 4, room.z + 3);
        this.createSoundSystem('r1_sound', room.x - 3, 1, room.z + 3);
    }

    createRoom2Devices() {
        const room = this.rooms['room2'];
        this.createLight('r2_light', room.x, 4, room.z);
        this.createAC('r2_ac', room.x + 3, 4, room.z - 3);
        this.createFireSensor('r2_fire', room.x + 3, 4, room.z + 3);
        this.createSoundSystem('r2_sound', room.x - 3, 1, room.z + 3);
    }

    createOutdoorDevices() {
        const room = this.rooms['outdoor'];
        this.createLight('out_light', room.x - 8, 4, room.z);
        this.createLight('out_light', room.x + 8, 4, room.z);
        this.createCamera('out_camera', room.x, 4.5, room.z - 3);
        this.createDoor('out_door', room.x, 0, room.z + 3.8);
    }

    // Device creation methods
    createLight(id, x, y, z) {
        // Light bulb
        const geometry = new THREE.SphereGeometry(0.3, 16, 16);
        const material = new THREE.MeshStandardMaterial({ 
            color: 0x64748b,
            emissive: 0x64748b,
            emissiveIntensity: 0
        });
        const bulb = new THREE.Mesh(geometry, material);
        bulb.position.set(x, y, z);
        this.scene.add(bulb);

        // Point light
        const light = new THREE.PointLight(0xfbbf24, 0, 10);
        light.position.set(x, y, z);
        light.castShadow = true;
        this.scene.add(light);

        this.devices[id] = { mesh: bulb, light: light, type: 'light' };
    }

    createFireSensor(id, x, y, z) {
        const geometry = new THREE.CylinderGeometry(0.2, 0.2, 0.1, 16);
        const material = new THREE.MeshStandardMaterial({ 
            color: 0xef4444,
            emissive: 0xef4444,
            emissiveIntensity: 0
        });
        const sensor = new THREE.Mesh(geometry, material);
        sensor.position.set(x, y, z);
        this.scene.add(sensor);

        this.devices[id] = { mesh: sensor, type: 'sensor' };
    }

    createHeater(id, x, y, z) {
        const geometry = new THREE.BoxGeometry(0.8, 1.2, 0.3);
        const material = new THREE.MeshStandardMaterial({ 
            color: 0x94a3b8,
            metalness: 0.5
        });
        const heater = new THREE.Mesh(geometry, material);
        heater.position.set(x, y, z);
        this.scene.add(heater);

        // Heating element
        const elementGeometry = new THREE.BoxGeometry(0.6, 0.8, 0.1);
        const elementMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xff6b35,
            emissive: 0xff6b35,
            emissiveIntensity: 0
        });
        const element = new THREE.Mesh(elementGeometry, elementMaterial);
        element.position.set(x, y, z + 0.2);
        this.scene.add(element);

        this.devices[id] = { mesh: heater, element: element, type: 'heater' };
    }

    createFan(id, x, y, z) {
        const geometry = new THREE.CylinderGeometry(0.5, 0.5, 0.2, 32);
        const material = new THREE.MeshStandardMaterial({ 
            color: 0x64748b,
            metalness: 0.6
        });
        const fan = new THREE.Mesh(geometry, material);
        fan.position.set(x, y, z);
        this.scene.add(fan);

        // Fan blades
        const bladeGeometry = new THREE.BoxGeometry(0.8, 0.05, 0.15);
        const bladeMaterial = new THREE.MeshStandardMaterial({ color: 0x475569 });
        const blades = new THREE.Group();
        
        for (let i = 0; i < 4; i++) {
            const blade = new THREE.Mesh(bladeGeometry, bladeMaterial);
            blade.rotation.y = (Math.PI / 2) * i;
            blades.add(blade);
        }
        blades.position.set(x, y - 0.15, z);
        this.scene.add(blades);

        this.devices[id] = { mesh: fan, blades: blades, type: 'fan', rotation: 0 };
    }

    createWindow(id, x, y, z) {
        const geometry = new THREE.BoxGeometry(0.1, 2, 1.5);
        const material = new THREE.MeshStandardMaterial({ 
            color: 0x3b82f6,
            transparent: true,
            opacity: 0.3,
            metalness: 0.8
        });
        const window = new THREE.Mesh(geometry, material);
        window.position.set(x, y, z);
        this.scene.add(window);

        this.devices[id] = { mesh: window, type: 'window' };
    }

    createAC(id, x, y, z) {
        const geometry = new THREE.BoxGeometry(1.2, 0.4, 0.3);
        const material = new THREE.MeshStandardMaterial({ 
            color: 0xe0e7ff,
            metalness: 0.5
        });
        const ac = new THREE.Mesh(geometry, material);
        ac.position.set(x, y, z);
        this.scene.add(ac);

        // AC particles
        const particlesGeometry = new THREE.BufferGeometry();
        const particlesMaterial = new THREE.PointsMaterial({
            color: 0x06b6d4,
            size: 0.1,
            transparent: true,
            opacity: 0
        });
        const particles = new THREE.Points(particlesGeometry, particlesMaterial);
        particles.position.set(x, y - 0.5, z);
        this.scene.add(particles);

        this.devices[id] = { mesh: ac, particles: particles, type: 'ac' };
    }

    createTV(id, x, y, z) {
        const geometry = new THREE.BoxGeometry(2, 1.2, 0.1);
        const material = new THREE.MeshStandardMaterial({ 
            color: 0x1e293b,
            metalness: 0.8
        });
        const tv = new THREE.Mesh(geometry, material);
        tv.position.set(x, y, z);
        this.scene.add(tv);

        // Screen
        const screenGeometry = new THREE.BoxGeometry(1.8, 1, 0.05);
        const screenMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x000000,
            emissive: 0x3b82f6,
            emissiveIntensity: 0
        });
        const screen = new THREE.Mesh(screenGeometry, screenMaterial);
        screen.position.set(x, y, z + 0.1);
        this.scene.add(screen);

        this.devices[id] = { mesh: tv, screen: screen, type: 'tv' };
    }

    createSoundSystem(id, x, y, z) {
        const geometry = new THREE.BoxGeometry(0.4, 0.6, 0.3);
        const material = new THREE.MeshStandardMaterial({ 
            color: 0x1e293b,
            metalness: 0.6
        });
        
        const speaker1 = new THREE.Mesh(geometry, material);
        speaker1.position.set(x - 0.5, y, z);
        this.scene.add(speaker1);
        
        const speaker2 = new THREE.Mesh(geometry, material);
        speaker2.position.set(x + 0.5, y, z);
        this.scene.add(speaker2);

        this.devices[id] = { mesh: speaker1, mesh2: speaker2, type: 'sound' };
    }

    createCamera(id, x, y, z) {
        const bodyGeometry = new THREE.CylinderGeometry(0.2, 0.3, 0.4, 16);
        const bodyMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x1e293b,
            metalness: 0.7
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.set(x, y, z);
        body.rotation.x = Math.PI / 4;
        this.scene.add(body);

        // Lens
        const lensGeometry = new THREE.CircleGeometry(0.15, 32);
        const lensMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x3b82f6,
            emissive: 0x3b82f6,
            emissiveIntensity: 0.5
        });
        const lens = new THREE.Mesh(lensGeometry, lensMaterial);
        lens.position.set(x, y - 0.2, z + 0.2);
        lens.rotation.x = -Math.PI / 4;
        this.scene.add(lens);

        this.devices[id] = { mesh: body, lens: lens, type: 'camera' };
    }

    createDoor(id, x, y, z) {
        const geometry = new THREE.BoxGeometry(1.5, 3, 0.2);
        const material = new THREE.MeshStandardMaterial({ 
            color: 0x8b5cf6,
            metalness: 0.4
        });
        const door = new THREE.Mesh(geometry, material);
        door.position.set(x, y + 1.5, z);
        this.scene.add(door);

        this.devices[id] = { mesh: door, type: 'door', openAngle: 0 };
    }

    updateDeviceStates() {
        Object.keys(smartHomeData).forEach(roomKey => {
            smartHomeData[roomKey].devices.forEach(device => {
                const deviceObj = this.devices[device.id];
                if (!deviceObj) return;

                switch (deviceObj.type) {
                    case 'light':
                        if (device.status) {
                            deviceObj.mesh.material.emissiveIntensity = 1;
                            deviceObj.light.intensity = 2;
                        } else {
                            deviceObj.mesh.material.emissiveIntensity = 0;
                            deviceObj.light.intensity = 0;
                        }
                        break;

                    case 'heater':
                        if (device.status) {
                            deviceObj.element.material.emissiveIntensity = 0.8;
                        } else {
                            deviceObj.element.material.emissiveIntensity = 0;
                        }
                        break;

                    case 'fan':
                        if (device.status) {
                            deviceObj.rotation += 0.2;
                            deviceObj.blades.rotation.y = deviceObj.rotation;
                        }
                        break;

                    case 'window':
                        if (device.status) {
                            deviceObj.mesh.material.opacity = 0.8;
                        } else {
                            deviceObj.mesh.material.opacity = 0.3;
                        }
                        break;

                    case 'ac':
                        if (device.status) {
                            deviceObj.particles.material.opacity = 0.6;
                        } else {
                            deviceObj.particles.material.opacity = 0;
                        }
                        break;

                    case 'tv':
                        if (device.status) {
                            deviceObj.screen.material.emissiveIntensity = 0.5;
                        } else {
                            deviceObj.screen.material.emissiveIntensity = 0;
                        }
                        break;

                    case 'sound':
                        if (device.status) {
                            const scale = 1 + Math.sin(Date.now() * 0.01) * 0.1;
                            deviceObj.mesh.scale.set(1, scale, 1);
                            if (deviceObj.mesh2) deviceObj.mesh2.scale.set(1, scale, 1);
                        } else {
                            deviceObj.mesh.scale.set(1, 1, 1);
                            if (deviceObj.mesh2) deviceObj.mesh2.scale.set(1, 1, 1);
                        }
                        break;

                    case 'door':
                        if (device.status) {
                            deviceObj.openAngle = Math.min(deviceObj.openAngle + 0.02, Math.PI / 2);
                        } else {
                            deviceObj.openAngle = Math.max(deviceObj.openAngle - 0.02, 0);
                        }
                        deviceObj.mesh.rotation.y = deviceObj.openAngle;
                        break;
                }
            });
        });

        // Update fire sensors
        Object.keys(this.devices).forEach(id => {
            const device = this.devices[id];
            if (device.type === 'sensor') {
                if (simulation.smokeDetected) {
                    device.mesh.material.emissiveIntensity = 1;
                } else {
                    device.mesh.material.emissiveIntensity = 0;
                }
            }
        });
    }

    createSensorsPanel() {
        this.sensors = [
            { id: 'temp', name: 'Temperature', unit: '°C', value: 25, location: 'Living Area', type: 'temperature' },
            { id: 'humidity', name: 'Humidity', unit: '%', value: 45, location: 'Bathroom', type: 'humidity' },
            { id: 'motion', name: 'Motion Sensor', unit: '', value: 'No Motion', location: 'Corridors', type: 'motion' },
            { id: 'smoke', name: 'Smoke Detector', unit: '', value: 'Clear', location: 'Kitchen', type: 'smoke' },
            { id: 'door', name: 'Door Sensor', unit: '', value: 'Closed', location: 'Main Entrance', type: 'door' },
            { id: 'light_level', name: 'Light Level', unit: 'lux', value: 320, location: 'Reception', type: 'light' },
            { id: 'energy', name: 'Power Usage', unit: 'kW', value: 0, location: 'Main Panel', type: 'energy' }
        ];

        this.renderSensors();
    }

    renderSensors() {
        const container = document.getElementById('sensors-grid');
        if (!container) return;
        
        container.innerHTML = '';

        this.sensors.forEach(sensor => {
            const card = document.createElement('div');
            card.className = 'sensor-card';
            
            const isActive = this.getSensorStatus(sensor);
            const displayValue = this.getSensorDisplayValue(sensor);
            
            card.innerHTML = `
                <div class="sensor-header">
                    <span class="sensor-name">${sensor.name}</span>
                    <span class="sensor-status ${isActive ? 'active' : 'inactive'}">
                        ${isActive ? 'Active' : 'Inactive'}
                    </span>
                </div>
                <div class="sensor-value">${displayValue}</div>
                <div class="sensor-location">${sensor.location}</div>
            `;
            
            container.appendChild(card);
        });
    }

    getSensorStatus(sensor) {
        if (sensor.type === 'motion') return simulation.motionDetected;
        if (sensor.type === 'smoke') return simulation.smokeDetected;
        return true;
    }

    getSensorDisplayValue(sensor) {
        if (sensor.type === 'temperature') {
            return `${simulation.temperature.toFixed(1)}${sensor.unit}`;
        }
        if (sensor.type === 'motion') {
            return simulation.motionDetected ? 'Motion Detected' : 'No Motion';
        }
        if (sensor.type === 'smoke') {
            return simulation.smokeDetected ? 'SMOKE DETECTED!' : 'Clear';
        }
        if (sensor.type === 'energy') {
            return `${simulation.calculateEnergyUsage()} ${sensor.unit}`;
        }
        if (sensor.type === 'humidity') {
            const humidity = 40 + Math.random() * 20;
            return `${humidity.toFixed(0)}${sensor.unit}`;
        }
        if (sensor.type === 'light') {
            const hour = new Date().getHours();
            const lightLevel = hour >= 6 && hour <= 18 ? 300 + Math.random() * 200 : 50 + Math.random() * 100;
            return `${lightLevel.toFixed(0)} ${sensor.unit}`;
        }
        if (sensor.type === 'door') {
            return Math.random() > 0.95 ? 'Open' : 'Closed';
        }
        return `${sensor.value}${sensor.unit}`;
    }

    startSensorUpdates() {
        setInterval(() => {
            this.renderSensors();
        }, 1000);
    }

    onWindowResize() {
        if (!this.container || !this.container.clientWidth) return;
        
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        if (this.controls) this.controls.update();
        if (this.scene && this.camera && this.renderer) {
            this.updateDeviceStates();
            this.renderer.render(this.scene, this.camera);
        }
    }
}

// Initialize 3D apartment when simulation view is active
let apartment3D = null;


// Make Apartment3D available globally
window.Apartment3D = Apartment3D;
