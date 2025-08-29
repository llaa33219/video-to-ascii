// Video Exporter - Handles MP4 export with audio preservation
class VideoExporter {
    constructor() {
        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.exportCanvas = document.createElement('canvas');
        this.exportCtx = this.exportCanvas.getContext('2d');
        this.audioContext = null;
        this.isRecording = false;
    }
    
    async init() {
        // Initialize audio context for audio processing
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        return true;
    }
    
    async startExport(sourceVideo, asciiCanvas, options = {}) {
        const {
            videoBitrate = 2500000,
            audioBitrate = 128000,
            fps = 30,
            includeAudio = true
        } = options;
        
        this.recordedChunks = [];
        this.isRecording = true;
        
        // Set export canvas size to match ASCII canvas
        this.exportCanvas.width = asciiCanvas.width;
        this.exportCanvas.height = asciiCanvas.height;
        
        // Create stream from canvas
        const canvasStream = this.exportCanvas.captureStream(fps);
        
        // Handle audio stream
        let finalStream = canvasStream;
        if (includeAudio && sourceVideo && !sourceVideo.muted) {
            try {
                // Get audio tracks from the video element's srcObject if available
                const audioTracks = sourceVideo.srcObject ? 
                    sourceVideo.srcObject.getAudioTracks() : [];
                
                if (audioTracks.length > 0) {
                    // Use existing audio tracks
                    finalStream = new MediaStream([
                        ...canvasStream.getVideoTracks(),
                        ...audioTracks
                    ]);
                } else if (sourceVideo.captureStream) {
                    // Try to capture audio stream from video element
                    const videoStream = sourceVideo.captureStream();
                    const videoAudioTracks = videoStream.getAudioTracks();
                    if (videoAudioTracks.length > 0) {
                        finalStream = new MediaStream([
                            ...canvasStream.getVideoTracks(),
                            ...videoAudioTracks
                        ]);
                    }
                }
            } catch (error) {
                console.warn('Audio capture failed, exporting video only:', error);
            }
        }
        
        // Configure MediaRecorder
        const mimeType = this.getSupportedMimeType();
        const recorderOptions = {
            mimeType: mimeType,
            videoBitsPerSecond: videoBitrate
        };
        
        if (includeAudio) {
            recorderOptions.audioBitsPerSecond = audioBitrate;
        }
        
        try {
            this.mediaRecorder = new MediaRecorder(finalStream, recorderOptions);
            
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.recordedChunks.push(event.data);
                }
            };
            
            this.mediaRecorder.onstart = () => {
                console.log('Export started');
            };
            
            this.mediaRecorder.onstop = () => {
                console.log('Export completed');
                this.isRecording = false;
            };
            
            this.mediaRecorder.onerror = (error) => {
                console.error('MediaRecorder error:', error);
                this.isRecording = false;
            };
            
            // Start recording
            this.mediaRecorder.start(100); // Collect data every 100ms
            
            return true;
        } catch (error) {
            console.error('Failed to start MediaRecorder:', error);
            this.isRecording = false;
            return false;
        }
    }
    
    // Update export canvas with ASCII art
    updateFrame(asciiCanvas) {
        if (!this.isRecording) return;
        
        // Draw ASCII canvas to export canvas
        this.exportCtx.drawImage(asciiCanvas, 0, 0);
    }
    
    async stopExport() {
        if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
            return null;
        }
        
        return new Promise((resolve) => {
            this.mediaRecorder.onstop = () => {
                const blob = new Blob(this.recordedChunks, {
                    type: this.mediaRecorder.mimeType
                });
                this.recordedChunks = [];
                this.isRecording = false;
                resolve(blob);
            };
            
            this.mediaRecorder.stop();
        });
    }
    
    getSupportedMimeType() {
        const types = [
            'video/webm;codecs=vp9,opus',
            'video/webm;codecs=vp8,opus',
            'video/webm;codecs=vp9',
            'video/webm;codecs=vp8',
            'video/webm',
            'video/mp4;codecs=h264,aac',
            'video/mp4'
        ];
        
        for (const type of types) {
            if (MediaRecorder.isTypeSupported(type)) {
                console.log('Using mime type:', type);
                return type;
            }
        }
        
        return 'video/webm'; // Default fallback
    }
    
    async convertToMP4(webmBlob) {
        // Note: Direct MP4 encoding in browser is limited
        // MediaRecorder typically outputs WebM format
        // For true MP4 conversion, we'd need a library like ffmpeg.js
        
        // Check if MP4 is directly supported
        if (this.getSupportedMimeType().includes('mp4')) {
            return webmBlob; // Already in MP4 format
        }
        
        // For now, we'll return the WebM blob
        // In a production app, you'd use ffmpeg.wasm for conversion
        console.log('MP4 conversion would require ffmpeg.wasm integration');
        return webmBlob;
    }
    
    downloadVideo(blob, filename = 'ascii-video.webm') {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    
    destroy() {
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
        }
        if (this.audioContext) {
            this.audioContext.close();
        }
        this.recordedChunks = [];
        this.isRecording = false;
    }
}

// Export globally
window.VideoExporter = VideoExporter;
