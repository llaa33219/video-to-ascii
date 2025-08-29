// Main application logic
class VideoToASCIIApp {
    constructor() {
        this.video = document.getElementById('sourceVideo');
        this.videoInput = document.getElementById('videoInput');
        this.processBtn = document.getElementById('processBtn');
        this.pauseBtn = document.getElementById('pauseBtn');
        this.exportBtn = document.getElementById('exportBtn');
        this.progressBar = document.querySelector('.progress-section');
        this.progressFill = document.getElementById('progressFill');
        this.progressText = document.getElementById('progressText');
        
        // Settings
        this.bgColorInput = document.getElementById('bgColor');
        this.fontSizeInput = document.getElementById('fontSize');
        this.fontSizeValue = document.getElementById('fontSizeValue');
        this.densityInput = document.getElementById('density');
        this.colorAccuracyInput = document.getElementById('colorAccuracy');
        
        // Processors
        this.asciiConverter = null;
        this.videoExporter = null;
        
        // State
        this.isProcessing = false;
        this.isPaused = false;
        this.isExporting = false;
        this.animationFrame = null;
        
        this.init();
    }
    
    async init() {
        // Initialize processors
        this.asciiConverter = new ASCIIConverter();
        await this.asciiConverter.init();
        
        this.videoExporter = new VideoExporter();
        await this.videoExporter.init();
        
        // Setup event listeners
        this.setupEventListeners();
        
        console.log('Application initialized');
    }
    
    setupEventListeners() {
        // File input
        this.videoInput.addEventListener('change', (e) => this.handleVideoSelect(e));
        
        // Control buttons
        this.processBtn.addEventListener('click', () => this.startProcessing());
        this.pauseBtn.addEventListener('click', () => this.togglePause());
        this.exportBtn.addEventListener('click', () => this.startExport());
        
        // Settings
        this.bgColorInput.addEventListener('input', () => this.updateSettings());
        this.fontSizeInput.addEventListener('input', () => {
            this.fontSizeValue.textContent = `${this.fontSizeInput.value}px`;
            this.updateSettings();
        });
        this.densityInput.addEventListener('input', () => this.updateSettings());
        this.colorAccuracyInput.addEventListener('input', () => this.updateSettings());
        
        // Video events
        this.video.addEventListener('loadedmetadata', () => {
            this.processBtn.disabled = false;
            this.updateProgress(0);
        });
        
        this.video.addEventListener('ended', () => {
            this.stopProcessing();
            if (this.isExporting) {
                this.finishExport();
            }
        });
    }
    
    handleVideoSelect(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const url = URL.createObjectURL(file);
        this.video.src = url;
        this.video.load();
        
        // Reset state
        this.isProcessing = false;
        this.isPaused = false;
        this.processBtn.textContent = 'Process Video';
        this.pauseBtn.textContent = 'Pause';
        this.pauseBtn.disabled = true;
        this.exportBtn.disabled = true;
    }
    
    updateSettings() {
        if (!this.asciiConverter) return;
        
        this.asciiConverter.updateOptions({
            fontSize: parseInt(this.fontSizeInput.value),
            density: parseInt(this.densityInput.value),
            bgColor: this.bgColorInput.value,
            colorAccuracy: parseInt(this.colorAccuracyInput.value)
        });
    }
    
    startProcessing() {
        if (!this.video.src) return;
        
        this.isProcessing = true;
        this.isPaused = false;
        this.processBtn.disabled = true;
        this.pauseBtn.disabled = false;
        this.exportBtn.disabled = false;
        this.pauseBtn.textContent = 'Pause';
        
        this.progressBar.classList.add('active');
        this.video.currentTime = 0;
        this.video.play();
        
        this.processFrame();
    }
    
    processFrame() {
        if (!this.isProcessing || this.isPaused) return;
        
        // Process current frame
        const processed = this.asciiConverter.processFrame(this.video);
        
        if (processed) {
            // Update progress
            const progress = (this.video.currentTime / this.video.duration) * 100;
            this.updateProgress(progress);
            
            // If exporting, update export canvas
            if (this.isExporting) {
                this.videoExporter.updateFrame(this.asciiConverter.canvas);
            }
            
            // Continue to next frame
            this.animationFrame = requestAnimationFrame(() => this.processFrame());
        } else {
            this.stopProcessing();
        }
    }
    
    togglePause() {
        if (!this.isProcessing) return;
        
        this.isPaused = !this.isPaused;
        
        if (this.isPaused) {
            this.video.pause();
            this.pauseBtn.textContent = 'Resume';
            if (this.animationFrame) {
                cancelAnimationFrame(this.animationFrame);
            }
        } else {
            this.video.play();
            this.pauseBtn.textContent = 'Pause';
            this.processFrame();
        }
    }
    
    stopProcessing() {
        this.isProcessing = false;
        this.isPaused = false;
        this.processBtn.disabled = false;
        this.processBtn.textContent = 'Reprocess';
        this.pauseBtn.disabled = true;
        
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
        
        this.video.pause();
    }
    
    async startExport() {
        if (this.isExporting) return;
        
        this.isExporting = true;
        this.exportBtn.disabled = true;
        this.exportBtn.textContent = 'Exporting...';
        
        // Reset video and start processing with export
        this.video.currentTime = 0;
        
        // Start export
        const exportStarted = await this.videoExporter.startExport(
            this.video,
            this.asciiConverter.canvas,
            {
                fps: 30,
                includeAudio: true,
                videoBitrate: 4000000,
                audioBitrate: 192000
            }
        );
        
        if (exportStarted) {
            // Start processing if not already
            if (!this.isProcessing) {
                this.startProcessing();
            } else {
                this.video.currentTime = 0;
                this.video.play();
            }
        } else {
            this.isExporting = false;
            this.exportBtn.disabled = false;
            this.exportBtn.textContent = 'Export as MP4';
            alert('Failed to start export. Please try again.');
        }
    }
    
    async finishExport() {
        if (!this.isExporting) return;
        
        const blob = await this.videoExporter.stopExport();
        
        if (blob) {
            // Attempt MP4 conversion if needed
            const finalBlob = await this.videoExporter.convertToMP4(blob);
            
            // Download the video
            const filename = this.video.src.includes('.mp4') ? 'ascii-video.mp4' : 'ascii-video.webm';
            this.videoExporter.downloadVideo(finalBlob, filename);
        }
        
        this.isExporting = false;
        this.exportBtn.disabled = false;
        this.exportBtn.textContent = 'Export as MP4';
    }
    
    updateProgress(percent) {
        this.progressFill.style.width = `${percent}%`;
        this.progressText.textContent = `${Math.round(percent)}%`;
        
        if (percent >= 100) {
            setTimeout(() => {
                this.progressBar.classList.remove('active');
            }, 1000);
        }
    }
    
    destroy() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
        
        if (this.asciiConverter) {
            this.asciiConverter.destroy();
        }
        
        if (this.videoExporter) {
            this.videoExporter.destroy();
        }
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new VideoToASCIIApp();
});
