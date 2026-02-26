// Voice Control System
// Speech-to-Text (STT) and Text-to-Speech (TTS)

class VoiceControl {
    constructor() {
        this.recognition = null;
        this.synthesis = window.speechSynthesis;
        this.isListening = false;
        this.isEnabled = false;
        this.isAwake = false;  // Wake word state
        this.voices = [];
        this.restartAttempts = 0;
        this.maxRestartAttempts = 999999; // Unlimited restarts
        this.keepAliveInterval = null;
        this.isSpeaking = false;
        
        this.initSpeechRecognition();
        this.initSpeechSynthesis();
        this.startKeepAlive();
    }
    
    initSpeechRecognition() {
        // Check browser support
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        if (!SpeechRecognition) {
            console.error('Speech Recognition not supported in this browser');
            return;
        }
        
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;  // Keep listening continuously
        this.recognition.interimResults = false;
        this.recognition.lang = 'en-US';
        this.recognition.maxAlternatives = 1;
        
        // Event handlers
        this.recognition.onstart = () => {
            console.log('Voice recognition started (continuous mode)');
            this.isListening = true;
            this.updateUI('listening');
        };
        
        this.recognition.onresult = (event) => {
            // Ignore results while speaking to prevent echo
            if (this.isSpeaking) {
                console.log('🔇 Ignoring input while speaking...');
                return;
            }
            
            const last = event.results.length - 1;
            const transcript = event.results[last][0].transcript.toLowerCase().trim();
            const confidence = event.results[last][0].confidence;
            
            console.log(`Heard: "${transcript}" (confidence: ${confidence.toFixed(2)})`);
            
            // Check for wake word - multiple variations
            if (transcript.includes('hey my home') || 
                transcript.includes('hi my home') ||
                transcript.includes('my home') ||
                transcript.includes('home') ||
                transcript.includes('hey home')) {
                if (!this.isAwake) {
                    this.isAwake = true;
                    this.speak("Yes, I'm listening. How can I help you?");
                    console.log('✓ System AWAKE');
                }
                return;
            }
            
            // Check for sleep word
            if (transcript.includes('sleep')) {
                if (this.isAwake) {
                    this.isAwake = false;
                    this.speak("Going to sleep. Say Hey My Home when you need me.");
                    console.log('✓ System SLEEPING');
                }
                return;
            }
            
            // Process command only if awake
            if (this.isAwake) {
                this.processVoiceCommand(transcript);
            } else {
                console.log('💤 System sleeping. Say "Hey My Home" to wake up.');
            }
        };
        
        this.recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            
            // Don't stop on no-speech error in continuous mode
            if (event.error === 'no-speech') {
                console.log('No speech detected, continuing to listen...');
                return;
            }
            
            if (event.error === 'not-allowed') {
                this.isListening = false;
                this.isEnabled = false;
                this.updateUI('error');
                this.speak("Microphone access denied. Please allow microphone access.");
            } else if (event.error === 'aborted' || event.error === 'network') {
                // Restart immediately if aborted or network error
                if (this.isEnabled && this.restartAttempts < this.maxRestartAttempts) {
                    this.restartAttempts++;
                    console.log(`Recognition ${event.error}, restarting... (attempt ${this.restartAttempts})`);
                    this.isListening = false;
                    setTimeout(() => this.startListening(), 100);
                }
            } else if (event.error === 'audio-capture') {
                // Audio capture error - restart after short delay
                if (this.isEnabled) {
                    console.log('Audio capture error, restarting in 1 second...');
                    this.isListening = false;
                    setTimeout(() => this.startListening(), 1000);
                }
            }
        };
        
        this.recognition.onend = () => {
            console.log('Voice recognition ended');
            this.isListening = false;
            
            // ALWAYS auto-restart if enabled - NEVER stop
            if (this.isEnabled) {
                console.log('🔄 Auto-restarting continuous listening...');
                setTimeout(() => {
                    if (this.isEnabled) {
                        this.startListening();
                    }
                }, 100);
            } else {
                this.updateUI('idle');
            }
        };
    }
    
    initSpeechSynthesis() {
        // Load available voices
        if (this.synthesis) {
            this.loadVoices();
            
            // Voices may load asynchronously
            if (speechSynthesis.onvoiceschanged !== undefined) {
                speechSynthesis.onvoiceschanged = () => this.loadVoices();
            }
        }
    }
    
    loadVoices() {
        this.voices = this.synthesis.getVoices();
        console.log(`Loaded ${this.voices.length} voices`);
        
        // Prefer English voices
        this.selectedVoice = this.voices.find(voice => 
            voice.lang.startsWith('en') && voice.name.includes('Female')
        ) || this.voices.find(voice => 
            voice.lang.startsWith('en')
        ) || this.voices[0];
        
        if (this.selectedVoice) {
            console.log(`Selected voice: ${this.selectedVoice.name}`);
        }
    }
    
    startListening() {
        if (!this.recognition) {
            alert('Speech recognition not supported in this browser. Please use Chrome or Edge.');
            return;
        }
        
        if (this.isListening) {
            console.log('Already listening...');
            return;
        }
        
        try {
            this.recognition.start();
            this.isListening = true;
            this.restartAttempts = 0; // Reset restart counter
            console.log('🎤 Microphone started. Waiting for "Hey My Home"...');
            this.updateUI('listening');
        } catch (error) {
            console.error('Error starting recognition:', error);
            // If already started, just mark as listening
            if (error.message && error.message.includes('already started')) {
                this.isListening = true;
                console.log('Recognition already active');
            } else {
                // Retry after short delay
                this.isListening = false;
                if (this.isEnabled) {
                    setTimeout(() => this.startListening(), 500);
                }
            }
        }
    }
    
    stopListening() {
        if (this.recognition && this.isListening) {
            this.isEnabled = false;  // Disable to prevent auto-restart
            this.recognition.stop();
            this.isListening = false;
        }
    }
    
    async processVoiceCommand(command) {
        // Show command in UI
        this.displayCommand(command);
        
        // Send to AI backend
        try {
            const result = await aiClient.sendCommand(command);
            
            if (result.success) {
                const response = result.ai_response || result.message;
                this.speak(response);
                
                // If multiple devices affected, show count
                if (result.devices_affected) {
                    console.log(`✓ Controlled ${result.devices_affected} devices`);
                }
                
                // Update UI
                await aiClient.syncDeviceStates();
                
                // Update 3D simulation
                if (typeof apartment3D !== 'undefined' && apartment3D) {
                    apartment3D.updateDeviceStates();
                }
            } else {
                this.speak(result.message || "Sorry, I couldn't execute that command.");
            }
        } catch (error) {
            console.error('Error processing voice command:', error);
            this.speak("Sorry, something went wrong.");
        }
    }
    
    speak(text) {
        if (!this.synthesis) {
            console.error('Speech synthesis not supported');
            return;
        }
        
        // Cancel any ongoing speech
        this.synthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Configure voice
        if (this.selectedVoice) {
            utterance.voice = this.selectedVoice;
        }
        
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        
        utterance.onstart = () => {
            console.log(`Speaking: "${text}"`);
            this.isSpeaking = true;
            this.updateUI('speaking');
        };
        
        utterance.onend = () => {
            console.log('Finished speaking');
            this.isSpeaking = false;
            this.updateUI('listening');
        };
        
        utterance.onerror = (event) => {
            console.error('Speech synthesis error:', event);
            this.isSpeaking = false;
            this.updateUI('listening');
        };
        
        this.synthesis.speak(utterance);
    }
    
    toggle() {
        this.isEnabled = !this.isEnabled;
        
        if (this.isEnabled) {
            this.speak("Voice control enabled");
            this.startKeepAlive();
            setTimeout(() => this.startListening(), 1500);
        } else {
            this.speak("Voice control disabled");
            this.isAwake = false;
            this.stopKeepAlive();
            this.stopListening();
            this.synthesis.cancel();
        }
        
        this.updateUI(this.isEnabled ? 'listening' : 'disabled');
        return this.isEnabled;
    }
    
    updateUI(state) {
        const button = document.getElementById('voice-control-btn');
        const indicator = document.getElementById('voice-indicator');
        const status = document.getElementById('voice-status');
        
        if (!button) return;
        
        // Update button
        button.className = 'voice-control-btn simulation-voice-btn';
        
        switch (state) {
            case 'listening':
                button.classList.add('listening');
                if (indicator) indicator.textContent = 'Listening...';
                if (status) status.textContent = 'Listening (Continuous Mode)';
                break;
                
            case 'speaking':
                button.classList.add('speaking');
                if (indicator) indicator.textContent = 'Speaking...';
                if (status) status.textContent = 'Speaking...';
                break;
                
            case 'idle':
                button.classList.add('active');
                if (indicator) indicator.textContent = 'Active';
                if (status) status.textContent = 'Active - Say a command';
                break;
                
            case 'disabled':
                button.classList.remove('active', 'listening', 'speaking');
                if (indicator) indicator.textContent = '🔇 Disabled';
                if (status) status.textContent = 'Click to enable';
                break;
                
            case 'error':
                button.classList.remove('active', 'listening', 'speaking');
                if (indicator) indicator.textContent = 'Error';
                if (status) status.textContent = 'Error - Check permissions';
                break;
        }
    }
    
    displayCommand(command) {
        const container = document.getElementById('voice-commands-log');
        if (!container) return;
        
        const timestamp = new Date().toLocaleTimeString();
        const entry = document.createElement('div');
        entry.className = 'voice-command-entry';
        entry.innerHTML = `
            <span class="voice-time">[${timestamp}]</span>
            <span class="voice-text">"${command}"</span>
        `;
        
        container.appendChild(entry);
        container.scrollTop = container.scrollHeight;
        
        // Keep only last 10 commands
        while (container.children.length > 10) {
            container.removeChild(container.firstChild);
        }
    }
    
    // Keep-alive mechanism to prevent microphone from closing
    startKeepAlive() {
        // Check every 3 seconds if microphone is still active
        this.keepAliveInterval = setInterval(() => {
            if (this.isEnabled && !this.isListening && !this.isSpeaking) {
                console.log('⚠️ Microphone inactive, restarting...');
                this.startListening();
            }
        }, 3000);
        
        // Handle page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.isEnabled && !this.isListening) {
                console.log('📱 Page visible again, ensuring microphone is active...');
                setTimeout(() => {
                    if (this.isEnabled && !this.isListening) {
                        this.startListening();
                    }
                }, 500);
            }
        });
        
        // Handle window focus
        window.addEventListener('focus', () => {
            if (this.isEnabled && !this.isListening) {
                console.log('🔍 Window focused, ensuring microphone is active...');
                setTimeout(() => {
                    if (this.isEnabled && !this.isListening) {
                        this.startListening();
                    }
                }, 500);
            }
        });
    }
    
    // Stop keep-alive when voice control is disabled
    stopKeepAlive() {
        if (this.keepAliveInterval) {
            clearInterval(this.keepAliveInterval);
            this.keepAliveInterval = null;
        }
    }
}

// Global instance
const voiceControl = new VoiceControl();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Voice control button in simulation view
    const voiceBtn = document.getElementById('voice-control-btn');
    if (voiceBtn) {
        voiceBtn.addEventListener('click', () => {
            voiceControl.toggle();
        });
    }
    
    // Toggle button in AI Control tab
    const toggleBtn = document.getElementById('voice-toggle-btn');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            const enabled = voiceControl.toggle();
            toggleBtn.textContent = enabled ? 'Disable Voice' : 'Enable Voice';
            toggleBtn.style.background = enabled ? 
                'linear-gradient(135deg, #ef4444, #dc2626)' : 
                'linear-gradient(135deg, #10b981, #059669)';
        });
    }
    
    // Auto-start microphone after 2 seconds
    setTimeout(() => {
        console.log('🎤 Auto-starting microphone...');
        voiceControl.isEnabled = true;
        voiceControl.startListening();
        
        // Update button states
        if (voiceBtn) {
            voiceBtn.classList.add('active', 'listening');
        }
        if (toggleBtn) {
            toggleBtn.textContent = 'Disable Voice';
            toggleBtn.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
        }
        
        console.log('✓ Microphone active. Say "Hey My Home" to wake up the system.');
    }, 2000);
});
