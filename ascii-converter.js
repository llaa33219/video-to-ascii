// ASCII Art Converter - Main conversion logic
class ASCIIConverter {
    constructor() {
        this.asciiChars = ' .:-=+*#%@';
        this.canvas = document.getElementById('asciiCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.offscreenCanvas = document.getElementById('offscreenCanvas');
        this.offscreenCtx = this.offscreenCanvas.getContext('2d');
        
        this.webglProcessor = null;
        this.wasmProcessor = null;
        
        this.currentOptions = {
            fontSize: 24,
            density: 3,
            bgColor: '#000000',
            colorAccuracy: 0.8,
            useWebGL: true,
            useWASM: true
        };
    }
    
    async init() {
        // Initialize WebGL processor
        try {
            this.webglProcessor = new WebGLProcessor(this.canvas);
            console.log('WebGL processor initialized');
        } catch (error) {
            console.warn('WebGL initialization failed:', error);
            this.currentOptions.useWebGL = false;
        }
        
        // Initialize WASM processor
        try {
            this.wasmProcessor = new WASMProcessor();
            await this.wasmProcessor.init();
            console.log('WASM processor initialized');
        } catch (error) {
            console.warn('WASM initialization failed:', error);
            this.currentOptions.useWASM = false;
        }
        
        return true;
    }
    
    updateOptions(options) {
        this.currentOptions = { ...this.currentOptions, ...options };
    }
    
    processFrame(video, timestamp) {
        if (!video || video.paused || video.ended) return false;
        
        // Set canvas size based on video and font size
        const fontSize = this.currentOptions.fontSize;
        const charWidth = Math.floor(video.videoWidth / fontSize);
        const charHeight = Math.floor(video.videoHeight / fontSize);
        
        // Set canvas size to match video
        this.canvas.width = video.videoWidth;
        this.canvas.height = video.videoHeight;
        
        // Try WebGL processing first (fastest)
        if (this.currentOptions.useWebGL && this.webglProcessor) {
            try {
                const bgColor = this.hexToRgb(this.currentOptions.bgColor);
                this.webglProcessor.processFrame(video, {
                    fontSize: this.currentOptions.fontSize,
                    density: this.currentOptions.density,
                    bgColor: [bgColor.r / 255, bgColor.g / 255, bgColor.b / 255],
                    colorAccuracy: this.currentOptions.colorAccuracy / 100
                });
                return true;
            } catch (error) {
                console.error('WebGL processing failed:', error);
            }
        }
        
        // Fallback to Canvas + WASM/JS processing
        this.offscreenCanvas.width = video.videoWidth;
        this.offscreenCanvas.height = video.videoHeight;
        this.offscreenCtx.drawImage(video, 0, 0);
        
        const imageData = this.offscreenCtx.getImageData(0, 0, video.videoWidth, video.videoHeight);
        
        // Process with WASM if available
        let processedData;
        if (this.currentOptions.useWASM && this.wasmProcessor) {
            processedData = this.wasmProcessor.processVideoFrame(imageData, {
                charSize: this.currentOptions.fontSize,
                colorAccuracy: this.currentOptions.colorAccuracy / 100,
                asciiChars: this.asciiChars
            });
        }
        
        // Render ASCII art
        this.renderASCII(processedData || imageData, charWidth, charHeight);
        
        return true;
    }
    
    renderASCII(data, charWidth, charHeight) {
        const ctx = this.ctx;
        const fontSize = this.currentOptions.fontSize;
        const bgColor = this.currentOptions.bgColor;
        
        // Clear canvas
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Set font with proper monospace font
        ctx.font = `${fontSize}px 'Courier New', Courier, monospace`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        
        // Render characters
        for (let y = 0; y < charHeight; y++) {
            for (let x = 0; x < charWidth; x++) {
                const idx = (y * charWidth + x) * 4;
                
                if (data instanceof Uint8Array && data.length > idx + 3) {
                    // Processed data from WASM
                    const r = data[idx];
                    const g = data[idx + 1];
                    const b = data[idx + 2];
                    const charIndex = data[idx + 3];
                    
                    ctx.fillStyle = `rgb(${r},${g},${b})`;
                    ctx.fillText(this.asciiChars[charIndex], x * fontSize, y * fontSize);
                } else {
                    // Fallback: sample from original image data
                    const sampleX = Math.floor(x * this.canvas.width / charWidth);
                    const sampleY = Math.floor(y * this.canvas.height / charHeight);
                    const sampleIdx = (sampleY * this.canvas.width + sampleX) * 4;
                    
                    if (data.data && sampleIdx < data.data.length) {
                        const r = data.data[sampleIdx];
                        const g = data.data[sampleIdx + 1];
                        const b = data.data[sampleIdx + 2];
                        
                        const brightness = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
                        const charIndex = Math.floor(brightness * (this.asciiChars.length - 1));
                        
                        const colorAccuracy = this.currentOptions.colorAccuracy / 100;
                        const finalR = Math.floor(r * colorAccuracy + brightness * 255 * (1 - colorAccuracy));
                        const finalG = Math.floor(g * colorAccuracy + brightness * 255 * (1 - colorAccuracy));
                        const finalB = Math.floor(b * colorAccuracy + brightness * 255 * (1 - colorAccuracy));
                        
                        ctx.fillStyle = `rgb(${finalR},${finalG},${finalB})`;
                        ctx.fillText(this.asciiChars[charIndex], x * fontSize, y * fontSize);
                    }
                }
            }
        }
    }
    
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 0, g: 0, b: 0 };
    }
    
    getCanvasDataURL() {
        return this.canvas.toDataURL('image/png');
    }
    
    destroy() {
        if (this.webglProcessor) {
            this.webglProcessor.destroy();
        }
        if (this.wasmProcessor) {
            this.wasmProcessor.destroy();
        }
    }
}

// Export globally
window.ASCIIConverter = ASCIIConverter;
