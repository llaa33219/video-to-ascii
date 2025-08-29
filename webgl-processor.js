// WebGL Shader for GPU-accelerated ASCII conversion
class WebGLProcessor {
    constructor(canvas) {
        this.canvas = canvas;
        this.gl = canvas.getContext('webgl2', { 
            alpha: true, 
            premultipliedAlpha: false,
            preserveDrawingBuffer: true 
        }) || canvas.getContext('webgl', { 
            alpha: true, 
            premultipliedAlpha: false,
            preserveDrawingBuffer: true 
        }) || canvas.getContext('experimental-webgl', { 
            alpha: true, 
            premultipliedAlpha: false,
            preserveDrawingBuffer: true 
        });
        
        if (!this.gl) {
            throw new Error('WebGL not supported in this browser');
        }
        
        this.asciiChars = ' .:-=+*#%@';
        this.initialized = false;
        
        try {
            this.init();
        } catch (error) {
            console.error('WebGL initialization error:', error);
            this.initialized = false;
            throw error;
        }
    }
    
    init() {
        const gl = this.gl;
        
        // Vertex shader - handles positioning
        const vertexShaderSource = `
            attribute vec2 a_position;
            attribute vec2 a_texCoord;
            varying vec2 v_texCoord;
            
            void main() {
                gl_Position = vec4(a_position, 0.0, 1.0);
                v_texCoord = a_texCoord;
            }
        `;
        
        // Fragment shader - converts pixels to ASCII
        const fragmentShaderSource = `
            precision highp float;
            
            uniform sampler2D u_image;
            uniform vec2 u_resolution;
            uniform float u_charSize;
            uniform float u_density;
            uniform vec3 u_bgColor;
            uniform float u_colorAccuracy;
            
            varying vec2 v_texCoord;
            
            const float charCount = 10.0;
            
            // ASCII character patterns (simplified for performance)
            float getCharPattern(float brightness, vec2 localCoord) {
                int charIndex = int(brightness * (charCount - 1.0));
                
                // Simple patterns for each ASCII character
                if (charIndex == 0) return 0.0; // space
                if (charIndex == 1) return step(0.5, length(localCoord - 0.5)); // dot
                if (charIndex == 2) return step(0.4, abs(localCoord.x - 0.5)); // :
                if (charIndex == 3) return step(0.3, abs(localCoord.y - 0.5)); // -
                if (charIndex == 4) return step(0.2, max(abs(localCoord.x - 0.5), abs(localCoord.y - 0.5))); // =
                if (charIndex == 5) return 1.0 - step(0.3, length(localCoord - 0.5)); // +
                if (charIndex == 6) return step(0.2, length(localCoord - 0.5)); // *
                if (charIndex == 7) return 1.0 - step(0.4, max(abs(localCoord.x - 0.5), abs(localCoord.y - 0.5))); // #
                if (charIndex == 8) return 0.8; // %
                return 1.0; // @
            }
            
            void main() {
                vec2 cellSize = vec2(u_charSize) / u_resolution;
                vec2 cellCoord = floor(v_texCoord / cellSize) * cellSize;
                vec2 localCoord = fract(v_texCoord / cellSize);
                
                // Sample the center of the cell
                vec4 color = texture2D(u_image, cellCoord + cellSize * 0.5);
                
                // Calculate brightness
                float brightness = dot(color.rgb, vec3(0.299, 0.587, 0.114));
                
                // Get character pattern
                float charPattern = getCharPattern(brightness, localCoord);
                
                // Mix character color with background
                vec3 finalColor = mix(u_bgColor, color.rgb * u_colorAccuracy + (1.0 - u_colorAccuracy) * vec3(brightness), charPattern);
                
                gl_FragColor = vec4(finalColor, 1.0);
            }
        `;
        
        // Create and compile shaders
        this.program = this.createShaderProgram(vertexShaderSource, fragmentShaderSource);
        
        // Get uniform locations
        this.uniforms = {
            u_image: gl.getUniformLocation(this.program, 'u_image'),
            u_resolution: gl.getUniformLocation(this.program, 'u_resolution'),
            u_charSize: gl.getUniformLocation(this.program, 'u_charSize'),
            u_density: gl.getUniformLocation(this.program, 'u_density'),
            u_bgColor: gl.getUniformLocation(this.program, 'u_bgColor'),
            u_colorAccuracy: gl.getUniformLocation(this.program, 'u_colorAccuracy')
        };
        
        // Create vertex buffer
        const positions = new Float32Array([
            -1, -1,  1, -1,  -1, 1,
            -1,  1,  1, -1,   1, 1
        ]);
        
        const texCoords = new Float32Array([
            0, 1,  1, 1,  0, 0,
            0, 0,  1, 1,  1, 0
        ]);
        
        // Position buffer
        this.positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
        
        // Texture coordinate buffer
        this.texCoordBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);
        
        // Create texture
        this.texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        
        this.initialized = true;
    }
    
    createShaderProgram(vertexSource, fragmentSource) {
        const gl = this.gl;
        
        const vertexShader = this.createShader(gl.VERTEX_SHADER, vertexSource);
        const fragmentShader = this.createShader(gl.FRAGMENT_SHADER, fragmentSource);
        
        const program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);
        
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error('Program link failed:', gl.getProgramInfoLog(program));
            return null;
        }
        
        return program;
    }
    
    createShader(type, source) {
        const gl = this.gl;
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error('Shader compile failed:', gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }
        
        return shader;
    }
    
    processFrame(videoOrCanvas, options = {}) {
        if (!this.initialized) return;
        
        const gl = this.gl;
        const {
            fontSize = 24,
            density = 3,
            bgColor = [0, 0, 0],
            colorAccuracy = 0.8
        } = options;
        
        // Update texture with video frame
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, videoOrCanvas);
        
        // Set viewport
        gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        
        // Use shader program
        gl.useProgram(this.program);
        
        // Set uniforms
        gl.uniform1i(this.uniforms.u_image, 0);
        gl.uniform2f(this.uniforms.u_resolution, this.canvas.width, this.canvas.height);
        gl.uniform1f(this.uniforms.u_charSize, fontSize);
        gl.uniform1f(this.uniforms.u_density, density / 10);
        gl.uniform3f(this.uniforms.u_bgColor, bgColor[0], bgColor[1], bgColor[2]);
        gl.uniform1f(this.uniforms.u_colorAccuracy, colorAccuracy);
        
        // Bind position buffer
        const positionLocation = gl.getAttribLocation(this.program, 'a_position');
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.enableVertexAttribArray(positionLocation);
        gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
        
        // Bind texture coordinate buffer
        const texCoordLocation = gl.getAttribLocation(this.program, 'a_texCoord');
        gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
        gl.enableVertexAttribArray(texCoordLocation);
        gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 0, 0);
        
        // Clear and draw
        gl.clearColor(bgColor[0], bgColor[1], bgColor[2], 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
    
    destroy() {
        const gl = this.gl;
        if (this.program) gl.deleteProgram(this.program);
        if (this.positionBuffer) gl.deleteBuffer(this.positionBuffer);
        if (this.texCoordBuffer) gl.deleteBuffer(this.texCoordBuffer);
        if (this.texture) gl.deleteTexture(this.texture);
    }
}

// Export for use in other modules
window.WebGLProcessor = WebGLProcessor;
