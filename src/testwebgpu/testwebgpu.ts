
async function initializeWebGPU()  {

    // HTML Elements
    const debugLabel = document.getElementById("debugLabel") as HTMLElement;
    const debugLabel2 = document.getElementById("debugLabel2") as HTMLElement;
    const testButton = document.getElementById("testButton") as HTMLButtonElement;
    const canvas = document.getElementById("webgpuCanvas") as HTMLCanvasElement;

    // WebGPU Context setup
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
        debugLabel.innerHTML = "WebGPU Adapter not available.";
        throw new Error("WebGPU Adapter not available");
    }

    const device = await adapter.requestDevice();
    const context = canvas.getContext("webgpu");

    if (!context) {
        debugLabel.innerHTML = "WebGPU is not supported.";
        throw new Error("WebGPU not supported");
    }

    const format = 'bgra8unorm';
    context.configure({
        device,
        format: format,
        usage: GPUTextureUsage.RENDER_ATTACHMENT
    });

    // Get adapter limits
    const adapterLimits = adapter.limits;
    console.log(adapterLimits); // Log adapter limits to check buffer size limits

    // Shader Program Class using WGSL
    class State {
        pipeline: GPURenderPipeline;

        constructor(device: GPUDevice, vertexShaderSource: string, fragmentShaderSource: string) {
            this.pipeline = this.createPipeline(device, vertexShaderSource, fragmentShaderSource);
        }

        // Create shader function using WGSL
        private createShader(device: GPUDevice, type: "vertex" | "fragment", source: string): GPUShaderModule {
            return device.createShaderModule({code: source,});
        }

        // Create pipeline function
        private createPipeline(device: GPUDevice, vertexShaderSource: string, fragmentShaderSource: string): GPURenderPipeline {
            const vertexShader = this.createShader(device, "vertex", vertexShaderSource);
            const fragmentShader = this.createShader(device, "fragment", fragmentShaderSource);

            let vertexState = {
                module: vertexShader,
                entryPoint: "main",
                buffers: [
                    {
                        arrayStride: 12,
                        attributes: [{ format: "float32x3" as GPUVertexFormat, offset: 0, shaderLocation: 0 }],
                    },
                ],
            };
            let fragmentState = {
                module: fragmentShader,
                entryPoint: "main",
                targets: [{ format: format as GPUTextureFormat }],
            };

            return device.createRenderPipeline({
                layout: "auto", // Important: Use "auto" here
                vertex: vertexState,
                fragment: fragmentState,
                primitive: {
                    topology: "triangle-list",
                    cullMode: "none",
                },
            });
        }
    }

    // RenderMesh class with chunked buffer upload and adapter limit check
    class RenderMesh {
        vertices: Float32Array;
        indices: Uint32Array;
        vertexBuffer: GPUBuffer;
        indexBuffer: GPUBuffer;

        constructor(device: GPUDevice, vertices: Float32Array, indices: Uint32Array) {
            this.vertices = vertices;
            this.indices = indices;

            this.vertexBuffer = device.createBuffer({
                size: vertices.byteLength,
                usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
            });
            this.indexBuffer = device.createBuffer({
                size: indices.byteLength,
                usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
            });

            device.queue.writeBuffer(this.vertexBuffer, 0, this.vertices);
            device.queue.writeBuffer(this.indexBuffer, 0, this.indices);

            debugLabel.innerHTML = `#triangles: ${(this.indices.length / 3 / 1024 / 1024).toFixed(2)}m`;
        }
    }

    function createPlane(gridSize: number): RenderMesh {
        const vertexCount = (gridSize + 1) * (gridSize + 1);
        const indexCount = gridSize * gridSize * 6;

        const vertices = new Float32Array(vertexCount * 3);
        const indices = new Uint32Array(indexCount);

        let vertexIndex = 0;
        for (let i = 0; i <= gridSize; i++) {
            for (let j = 0; j <= gridSize; j++) {
                vertices[vertexIndex++] = i / gridSize - 0.5;
                vertices[vertexIndex++] = j / gridSize - 0.5;
                vertices[vertexIndex++] = 0;
            }
        }

        let index = 0;
        for (let i = 0; i < gridSize; i++) {
            for (let j = 0; j < gridSize; j++) {
                const topLeft = i * (gridSize + 1) + j;
                const topRight = topLeft + 1;
                const bottomLeft = (i + 1) * (gridSize + 1) + j;
                const bottomRight = bottomLeft + 1;

                indices[index++] = topLeft;
                indices[index++] = bottomLeft;
                indices[index++] = topRight;

                indices[index++] = topRight;
                indices[index++] = bottomLeft;
                indices[index++] = bottomRight;
            }
        }

        return new RenderMesh(device, vertices, indices);
    }

    class Renderer {
        private device: GPUDevice;
        private program: State;
        private renderMesh: RenderMesh;
        private lastTime: number = performance.now();
        private frameCount: number = 0;
        private rotationAngle: number = 0;
        private paramsBuffer: GPUBuffer;
        private paramsBindGroupLayout: GPUBindGroupLayout;
        private paramsBindGroup: GPUBindGroup;

        constructor(device: GPUDevice, vertexShaderSource: string, fragmentShaderSource: string, gridSize: number) {
            this.device = device;
            this.program = new State(device, vertexShaderSource, fragmentShaderSource);
            this.renderMesh = createPlane(gridSize);

            this.paramsBuffer = device.createBuffer({
                size: 12 * 4, // Size of mat3x4 (3 rows * 4 columns * 4 bytes/float)
                usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
            });

            this.paramsBindGroupLayout = device.createBindGroupLayout({
                entries: [{
                    binding: 0,
                    visibility: GPUShaderStage.VERTEX,
                    buffer: { type: "uniform" }
                }]
            });
        }

        private calculateRotationMatrix(): Float32Array {
            const radians = (this.rotationAngle * Math.PI) / 180;
            const cosTheta = Math.cos(radians);
            const sinTheta = Math.sin(radians);
            return new Float32Array([
                cosTheta, -sinTheta, 0, 0,
                sinTheta, cosTheta, 0, 0,
                0, 0, 1, 0
            ]);
        }

        animate(currentTime: number) {
            const deltaTime = (currentTime - this.lastTime) / 1000;
            if (deltaTime >= 1.0) {
                const title = `FPS: ${this.frameCount}`;
                debugLabel2.innerHTML = title;
                this.frameCount = 0;
                this.lastTime = currentTime;
            }

            this.rotationAngle += 90 * deltaTime;
            if (this.rotationAngle > 360) this.rotationAngle -= 360;

            const rotationMatrix = this.calculateRotationMatrix();

            this.device.queue.writeBuffer(this.paramsBuffer, 0, rotationMatrix);

            const commandEncoder = this.device.createCommandEncoder();
            const renderPassDescriptor: GPURenderPassDescriptor = {
                colorAttachments: [{
                    view: context.getCurrentTexture().createView(),
                    loadOp: "clear",
                    clearValue: [0.0, 0.0, 0.0, 1.0],
                    storeOp: 'store',
                }],
            };

            const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
            passEncoder.setPipeline(this.program.pipeline);
            passEncoder.setVertexBuffer(0, this.renderMesh.vertexBuffer);
            passEncoder.setIndexBuffer(this.renderMesh.indexBuffer, "uint32");

            this.paramsBindGroup = this.device.createBindGroup({
                layout: this.paramsBindGroupLayout,
                entries: [{
                    binding: 0,
                    resource: { buffer: this.paramsBuffer }
                }]
            });

            passEncoder.setBindGroup(0, this.paramsBindGroup);
            passEncoder.drawIndexed(this.renderMesh.indices.length, 1, 0, 0, 0);
            passEncoder.end();

            this.device.queue.submit([commandEncoder.finish()]);
            this.frameCount++;
            requestAnimationFrame(this.animate.bind(this));
        }

        start() {
            requestAnimationFrame(this.animate.bind(this));
        }
    }

    const vertexShaderSource = `
        struct VertexInput {
            [[location(0)]] position : vec3<f32>;
        };

        struct Uniforms {
            rotationMatrix: mat4x4<f32>;
        };

        [[group(0), binding(0)]] var<uniform> uniforms : Uniforms;

        [[stage(vertex)]]
        fn main(input : VertexInput) -> [[builtin(position)]] vec4<f32> {
            return uniforms.rotationMatrix * vec4<f32>(input.position, 1.0);
        }
    `;

    const fragmentShaderSource = `
        [[stage(fragment)]]
        fn main() -> [[location(0)]] vec4<f32> {
            return vec4<f32>(0.3, 0.6, 1.0, 1.0);
        }
    `;

    const gridSize = 100;
    const renderer = new Renderer(device, vertexShaderSource, fragmentShaderSource, gridSize);
    renderer.start();

    testButton.addEventListener("click", () => {
        debugLabel.innerHTML = "Test Button Clicked!";
    });

}

// Call the function to initialize the WebGPU setup
initializeWebGPU();