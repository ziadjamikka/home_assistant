// Main Application Logic
class SmartHomeApp {
    constructor() {
        this.currentFilter = 'all';
        this.currentView = 'control';
        this.init();
    }

    init() {
        this.renderRooms();
        this.setupNavigation();
        this.setupViewSwitching();
        this.updateTime();
        this.startSimulation();
        
        setInterval(() => this.updateTime(), 1000);
    }

    // Setup view switching
    setupViewSwitching() {
        const tabButtons = document.querySelectorAll('.tab-btn');
        
        tabButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const view = btn.getAttribute('data-view');
                this.switchView(view);
                
                tabButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });
    }

    // Switch between views
    switchView(view) {
        this.currentView = view;
        
        document.querySelectorAll('.view-container').forEach(container => {
            container.classList.remove('active');
        });
        
        const viewContainer = document.getElementById(`${view}-view`);
        if (viewContainer) {
            viewContainer.classList.add('active');
        }
        
        // Initialize 3D apartment if switching to simulation view
        if (view === 'simulation') {
            if (!apartment3D) {
                // Wait for container to be visible
                setTimeout(() => {
                    apartment3D = new Apartment3D();
                }, 100);
            } else {
                // Trigger resize to fix canvas
                setTimeout(() => {
                    if (apartment3D && apartment3D.onWindowResize) {
                        apartment3D.onWindowResize();
                    }
                }, 100);
            }
        }
    }

    // Render all rooms
    renderRooms() {
        const container = document.getElementById('rooms-container');
        container.innerHTML = '';

        Object.keys(smartHomeData).forEach(roomKey => {
            const room = smartHomeData[roomKey];
            const roomCard = this.createRoomCard(roomKey, room);
            container.appendChild(roomCard);
        });
    }

    // Create room card
    createRoomCard(roomKey, room) {
        const card = document.createElement('div');
        card.className = 'room-card';
        card.dataset.room = roomKey;

        const devicesHTML = room.devices.map(device => 
            this.createDeviceHTML(roomKey, device)
        ).join('');

        card.innerHTML = `
            <div class="room-header">
                <h2 class="room-title">${room.name}</h2>
                <span class="room-icon"></span>
            </div>
            <div class="devices-list">
                ${devicesHTML}
            </div>
        `;

        return card;
    }

    // Create device HTML
    createDeviceHTML(roomKey, device) {
        const iconMap = {
            light: '',
            sensor: '',
            heater: '',
            fan: '',
            window: '',
            sound: '',
            camera: '',
            door: '',
            ac: '',
            tv: ''
        };

        return `
            <div class="device-item" data-device-id="${device.id}">
                <div class="device-info">
                    <div class="device-icon">${iconMap[device.type] || ''}</div>
                    <div>
                        <div class="device-name">${device.name}</div>
                        <div class="device-status">${device.status ? 'ON' : 'OFF'}</div>
                    </div>
                </div>
                <div class="toggle-switch ${device.status ? 'active' : ''}" 
                     onclick="app.toggleDevice('${roomKey}', '${device.id}'); return false;">
                </div>
            </div>
        `;
    }

    // Toggle device
    async toggleDevice(roomKey, deviceId) {
        const room = smartHomeData[roomKey];
        const device = room.devices.find(d => d.id === deviceId);
        
        if (device) {
            const newStatus = !device.status;
            
            // Send to AI backend first
            if (typeof aiClient !== 'undefined') {
                const action = newStatus ? 'on' : 'off';
                const result = await aiClient.controlDevice(deviceId, action);
                
                if (result.success) {
                    console.log(`Device ${deviceId} controlled via backend:`, result);
                } else {
                    console.warn(`Failed to control device ${deviceId} via backend, updating locally`);
                }
            }
            
            // Update local state
            device.status = newStatus;
            
            simulation.logEvent(`${device.name} in ${room.name} turned ${device.status ? 'ON' : 'OFF'}`);
            
            this.applyAIRules(roomKey, device);
            
            this.renderRooms();
            this.applyFilter(this.currentFilter);
            
            // Update 3D view if active
            if (apartment3D) {
                apartment3D.updateDeviceStates();
            }
        }
    }

    // Apply AI rules
    applyAIRules(roomKey, device) {
        if (device.type === 'ac' && device.status) {
            simulation.addAISuggestion("AC is on. Consider closing windows for better efficiency.");
        }

        if (device.type === 'light' && device.status) {
            const hour = new Date().getHours();
            if (hour >= 6 && hour <= 18) {
                simulation.addAISuggestion("It's daytime. Natural light might be sufficient.");
            }
        }

        if (device.type === 'tv' && device.status) {
            const room = smartHomeData[roomKey];
            const soundSystem = room.devices.find(d => d.type === 'sound');
            if (soundSystem && !soundSystem.status) {
                simulation.addAISuggestion("TV is on. Would you like to turn on the sound system?");
            }
        }

        if (device.type === 'heater' && device.status) {
            setTimeout(() => {
                if (device.status) {
                    simulation.addAlert("Water heater has been on for a while. Consider turning it off.", "warning");
                }
            }, 30000);
        }
    }

    // Setup navigation
    setupNavigation() {
        const navButtons = document.querySelectorAll('.nav-btn');
        
        navButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                navButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                const room = btn.dataset.room;
                this.applyFilter(room);
            });
        });
    }

    // Apply room filter
    applyFilter(room) {
        this.currentFilter = room;
        const cards = document.querySelectorAll('.room-card');
        
        cards.forEach(card => {
            if (room === 'all' || card.dataset.room === room) {
                card.classList.remove('hidden');
            } else {
                card.classList.add('hidden');
            }
        });
    }

    // Update time
    updateTime() {
        const now = new Date();
        const timeString = now.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            second: '2-digit'
        });
        const dateString = now.toLocaleDateString('en-US', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
        
        document.getElementById('current-time').textContent = `${dateString} ${timeString}`;
    }

    // Start simulation
    startSimulation() {
        simulation.startSimulations();
        
        // Removed automatic device toggling - user has full manual control
        // Auto Mode in AI tab handles automation when enabled
    }
}

// Initialize app when DOM is ready
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new SmartHomeApp();
});
