# Video to Color ASCII Art Converter

A high-performance web application that converts videos to colored ASCII art using WebGL and WebAssembly for GPU acceleration.
<img width="1383" height="1055" alt="image" src="https://github.com/user-attachments/assets/d50504af-7d4c-4012-9304-fb5d830e435a" />

## Features

- **Real-time video to ASCII conversion** with color preservation
- **GPU acceleration** using WebGL shaders for fast processing
- **WebAssembly optimization** for performance-critical operations
- **MP4/WebM export** with original audio preservation
- **Customizable settings**:
  - Background color selection
  - Font size adjustment
  - ASCII density control
  - Color accuracy tuning

## How to Use

1. Open `index.html` in a modern web browser (Chrome, Firefox, Edge recommended)
2. Click "Select Video" and choose your MP4, WebM, or other video file
3. Adjust settings as desired:
   - Background Color: Choose the background color for ASCII art
   - Font Size: Controls the size of ASCII characters (smaller = more detail)
   - ASCII Density: Controls character density
   - Color Accuracy: Balance between color fidelity and ASCII visibility
4. Click "Process Video" to start real-time conversion
5. Use "Pause/Resume" to control playback
6. Click "Export as MP4" to save the ASCII version with audio

## Technical Details

### Performance Optimization

- **WebGL Shaders**: GPU-accelerated pixel sampling and ASCII character rendering
- **WebAssembly**: Fast pixel processing and color calculations
- **Canvas Streaming**: Efficient frame capture and export

### Browser Compatibility

- Chrome/Edge: Full support including MP4 export
- Firefox: Full support (exports as WebM)
- Safari: Limited WebGL support, may use fallback rendering

### File Formats

- **Input**: MP4, WebM, MOV, AVI, and other browser-supported formats
- **Output**: WebM (default) or MP4 (if supported by browser)

## Limitations

- Browser-based MP4 encoding is limited; most browsers export as WebM
- Large videos may require significant processing time
- Memory usage scales with video resolution

## Future Enhancements

- Integration with ffmpeg.wasm for true MP4 encoding
- Additional ASCII character sets
- Custom color palettes
- Batch processing support
