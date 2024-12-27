async function initializeWebGL()  {

    console.log('testwebgl loaded');

    // HTML Elements
    const debugLabel = document.getElementById("debugLabel") as HTMLElement;
    const debugLabel2 = document.getElementById("debugLabel2") as HTMLElement;
    const testButton = document.getElementById("testButton") as HTMLButtonElement;
    const canvas = document.getElementById("webglCanvas") as HTMLCanvasElement;

    // WebGL Context
    const gl = canvas.getContext("webgl2");
    if (!gl) {
        debugLabel.innerHTML = "WebGL 2 is not supported.";
        throw new Error("WebGL 2 not supported");
    }

    // Shader Program Class
    class Program {
        program: WebGLProgram;
        rotationMatrixLocation: WebGLUniformLocation;
        aPosLocation: number;

        constructor(gl: WebGL2RenderingContext, vertexShaderSource: string, fragmentShaderSource: string) {
            this.program = this.createProgram(gl, vertexShaderSource, fragmentShaderSource);
            this.aPosLocation = gl.getAttribLocation(this.program, "aPos");
            this.rotationMatrixLocation = gl.getUniformLocation(this.program, "rotationMatrix")!;
        }

        // Create shader function
        private createShader(gl: WebGL2RenderingContext, type: GLenum, source: string): WebGLShader {
            const shader = gl.createShader(type)!;
            gl.shaderSource(shader, source);
            gl.compileShader(shader);
            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                const error = gl.getShaderInfoLog(shader);
                gl.deleteShader(shader);
                throw new Error(`Shader compilation failed: ${error}`);
            }
            return shader;
        }

        // Create program function
        private createProgram(gl: WebGL2RenderingContext, vertexShaderSource: string, fragmentShaderSource: string): WebGLProgram {
            const vertexShader = this.createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
            const fragmentShader = this.createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

            const program = gl.createProgram()!;
            gl.attachShader(program, vertexShader);
            gl.attachShader(program, fragmentShader);
            gl.linkProgram(program);

            if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
                throw new Error(`Program linking failed: ${gl.getProgramInfoLog(program)}`);
            }

            return program;
        }
    }

    // RenderMesh class with chunked buffer upload support
    class RenderMesh {
        vertices: Float32Array;
        indices: Uint32Array;
        vertexBuffer: WebGLBuffer;
        indexBuffer: WebGLBuffer;

        constructor(vertices: Float32Array, indices: Uint32Array) {
            this.vertices = vertices;
            this.indices = indices;
            this.vertexBuffer = gl.createBuffer()!;
            this.indexBuffer = gl.createBuffer()!;

            debugLabel.innerHTML = `#triangles: ${(this.indices.length / 3 / 1024 /1024).toFixed(2)}m`
        }

        // TODO: not real chunk upload
        // Upload vertices and indices in chunks to avoid memory overflow
        uploadDataInChunks(chunkSize: number = 1000 * 1000 * 800) {
            const uploadChunk = (data: ArrayBuffer, buffer: WebGLBuffer) => {
                gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
                gl.bufferData(gl.ARRAY_BUFFER, data, gl.STREAM_DRAW);
            };
        
            // Upload vertex data in chunks
            let offset = 0;
            while (offset < this.vertices.length) {
                const chunk = this.vertices.slice(offset, offset + chunkSize);  // slice by element, not byte index
                uploadChunk(chunk.buffer, this.vertexBuffer);
                offset += chunk.length;
            }
        
            // Upload index data in chunks
            offset = 0;
            while (offset < this.indices.length) {
                const chunk = this.indices.slice(offset, offset + chunkSize);  // slice by element, not byte index
                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
                gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, chunk.buffer, gl.STREAM_DRAW);
                offset += chunk.length;
            }
        }

        // Bind the buffers and set up vertex attributes
        bindData(program: Program) {
            gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
            gl.vertexAttribPointer(program.aPosLocation, 3, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(program.aPosLocation);

            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        }
    }

    // Create a plane grid with vertices and indices using 32-bit indices and chunked buffer upload
    function createPlane(gridSize: number): RenderMesh {
        // Calculate the total number of vertices and indices
        const vertexCount = (gridSize + 1) * (gridSize + 1);
        const indexCount = gridSize * gridSize * 6;

        // Create vertex buffer (Float32Array)
        const vertices = new Float32Array(vertexCount * 3);

        // Create index buffer (Uint32Array for large data)
        const indices = new Uint32Array(indexCount);

        let vertexIndex = 0;
        // Generate vertices
        for (let i = 0; i <= gridSize; i++) {
            for (let j = 0; j <= gridSize; j++) {
                // Map the vertices to the grid
                vertices[vertexIndex++] = i / gridSize - 0.5;
                vertices[vertexIndex++] = j / gridSize - 0.5;
                vertices[vertexIndex++] = 0; // Z is always 0
            }
        }

        let index = 0;
        // Generate indices for the grid using two triangles per quad
        for (let i = 0; i < gridSize; i++) {
            for (let j = 0; j < gridSize; j++) {
                const topLeft = i * (gridSize + 1) + j;
                const topRight = topLeft + 1;
                const bottomLeft = (i + 1) * (gridSize + 1) + j;
                const bottomRight = bottomLeft + 1;

                // First triangle (top-left, bottom-left, top-right)
                indices[index++] = topLeft;
                indices[index++] = bottomLeft;
                indices[index++] = topRight;

                // Second triangle (top-right, bottom-left, bottom-right)
                indices[index++] = topRight;
                indices[index++] = bottomLeft;
                indices[index++] = bottomRight;
            }
        }

        // Create and return the RenderMesh with chunked buffer uploads
        const renderMesh = new RenderMesh(vertices, indices);
        renderMesh.uploadDataInChunks(); // Upload data in chunks
        return renderMesh;
    }

    // Renderer class for managing animation
    class Renderer {
        private gl: WebGL2RenderingContext;
        private program: Program;
        private renderMesh: RenderMesh;
        private lastTime: number = performance.now();
        private frameCount: number = 0;
        private rotationAngle: number = 0;

        constructor(gl: WebGL2RenderingContext, vertexShaderSource: string, fragmentShaderSource: string, gridSize: number) {
            this.gl = gl;
            this.program = new Program(gl, vertexShaderSource, fragmentShaderSource);
            this.renderMesh = createPlane(gridSize);
            this.renderMesh.bindData(this.program);
        }

        // Method to calculate the rotation matrix based on the current rotation angle
        private calculateRotationMatrix() {
            const radians = (this.rotationAngle * Math.PI) / 180;
            const cosTheta = Math.cos(radians);
            const sinTheta = Math.sin(radians);
            return new Float32Array([
                cosTheta, -sinTheta, 0, 0,
                sinTheta, cosTheta,  0, 0,
                0,        0,         1, 0,
                0,        0,         0, 1,
            ]);
        }

        // Method to handle animation and rendering
        animate(currentTime: number) {

            const deltaTime = (currentTime - this.lastTime) / 1000; // seconds
            // this.lastTime = currentTime;
            if (deltaTime >= 1.0) {
                const title = `FPS: ${this.frameCount}`;
                debugLabel2.innerHTML = title;
                this.frameCount = 0;
                this.lastTime = currentTime; // Update lastTime for the next frame
            }

            // Update rotation angle
            this.rotationAngle += 90 * deltaTime; // 90 degrees per second
            if (this.rotationAngle > 360) this.rotationAngle -= 360;
            

            // Calculate the new rotation matrix
            const rotationMatrix = this.calculateRotationMatrix();

            // Use program and set uniform for rotation
            this.gl.useProgram(this.program.program);
            this.gl.uniformMatrix4fv(this.program.rotationMatrixLocation, false, rotationMatrix);

            // Render the mesh
            this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
            this.gl.vertexAttribPointer(this.program.aPosLocation, 3, this.gl.FLOAT, false, 0, 0);
            this.gl.enableVertexAttribArray(this.program.aPosLocation);
            this.gl.drawElements(this.gl.TRIANGLES, this.renderMesh.indices.length, this.gl.UNSIGNED_INT, 0);

            this.frameCount++;

            // Request the next frame
            requestAnimationFrame(this.animate.bind(this));
        }

        // Start the animation loop
        start() {
            requestAnimationFrame(this.animate.bind(this));
        }
    }

    // Vertex Shader Source
    const vertexShaderSource = `#version 300 es
    in vec3 aPos;
    uniform mat4 rotationMatrix;
    void main() {
        gl_Position = rotationMatrix * vec4(aPos, 1.0);
    }`;

    // Fragment Shader Source
    const fragmentShaderSource = `#version 300 es
    precision mediump float;
    out vec4 FragColor;
    void main() {
        FragColor = vec4(0.3, 0.6, 1.0, 1.0); // Light blue color
    }`;

    // WebGL Context setup
    gl.clearColor(0.0, 0.0, 0.0, 1.0); // Set clear color to black
    gl.enable(gl.DEPTH_TEST); // Enable depth testing

    // Create the Renderer
    const gridSize = 5000;
    const renderer = new Renderer(gl, vertexShaderSource, fragmentShaderSource, gridSize);

    // Start the animation
    renderer.start();

    // Test Button Functionality
    testButton.addEventListener("click", () => {
        debugLabel.innerHTML = "Test Button Clicked!";
    });

}

// Call the function to initialize the WebGPU setup
initializeWebGL();
