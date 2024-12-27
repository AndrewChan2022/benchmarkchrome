import * as THREE from 'three/src/Three.WebGPU';
// import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
// import { OBJExporter } from 'three/examples/jsm/exporters/OBJExporter.js';


// HTML Elements
const debugLabel = document.getElementById("debugLabel") as HTMLElement;
const debugLabel2 = document.getElementById("debugLabel2") as HTMLElement;
const testButton = document.getElementById("testButton") as HTMLButtonElement;
const canvas = document.getElementById("webgpuCanvas") as HTMLCanvasElement;

let initThreejs = async() => {

    if (navigator.gpu === undefined) {
        return;
    }
    let adapter = await navigator.gpu.requestAdapter();

    // scene, render, camera
    const width = canvas.width, height = canvas.height;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(70, width / height, 0.1, 1000);
    camera.position.z = 100;
    const rendererParas = {
        canvas: canvas,
        antialias: true,
        requiredLimits: {
            maxBufferSize: adapter.limits.maxBufferSize,
             maxStorageBufferBindingSize: adapter.limits.maxStorageBufferBindingSize,
        },
    };
    const renderer = new THREE.WebGPURenderer(rendererParas);
    renderer.setSize(width, height);
    renderer.setClearColor(new THREE.Color(0x000000)); //
    // document.body.appendChild(renderer.domElement);
    // const gl = renderer.getContext();
    

    // build scene
    // const geometry = new THREE.BoxGeometry( 10.2, 10.2, 10.2, 100, 100, 100 );
    // const radius = 20;  // 1;
    // const tube = 10;    // 0.4;
    // const tubularSegments = 100;
    // const radialSegments = 100;
    // const geometry = new THREE.TorusKnotGeometry( radius, tube, tubularSegments, radialSegments );
    // const material = new THREE.MeshNormalMaterial();
    // const mesh = new THREE.Mesh( geometry, material );
    // scene.add( mesh );


    const geometrys = Array<THREE.BufferGeometry>();
    const meshes = Array<THREE.Mesh>();
    let ntriangle = 0;
    let nmesh = 3;
    for (let index = 0; index < nmesh; index++) {
        // const gridSize = 5120;   
        // const gridSize = 7250;
        const gridSize = 3970; // 
        let rendermesh = createPlane(gridSize, 50, 50);
        ntriangle += rendermesh.indices.length / 3;
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(rendermesh.vertices, 3));
        geometry.setAttribute('normal', new THREE.BufferAttribute(rendermesh.normals, 3));
        geometry.setIndex(new THREE.BufferAttribute(rendermesh.indices, 1));
        const material = new THREE.MeshNormalMaterial();
        const mesh = new THREE.Mesh( geometry, material );
        mesh.position.x += -50  + 30 * index;
        geometrys.push(geometry);
        meshes.push(mesh);
        scene.add( mesh );
    }
    debugLabel.innerHTML = `#triangles: ${(ntriangle / 1024 /1024).toFixed(2)}m`

    let frameCount = 0;
    let lastTime = performance.now();
    let rotationAngle = 0.0;

    // render loop and animation
    renderer.setAnimationLoop( animate );
    function animate( currentTime: number ) {

        const deltaTime = (currentTime - lastTime) / 1000;
        if (deltaTime >= 1.0) {
            const title = `FPS: ${frameCount}`;
            debugLabel2.innerHTML = title;
            frameCount = 0;
            lastTime = currentTime;
        }
        rotationAngle += 90 * deltaTime;
        if (rotationAngle > 360) rotationAngle -= 360;

        for (const mesh of meshes) {
            mesh.rotation.z = - rotationAngle / 180.0;
        }
        // mesh.rotation.z = - rotationAngle / 180.0;

        renderer.render( scene, camera );

        frameCount++;

    }
}


class RenderMesh {
    vertices: Float32Array;
    normals: Float32Array;
    indices: Uint32Array;

    constructor(vertices: Float32Array, normals: Float32Array, indices: Uint32Array) {
        this.vertices = vertices;
        this.normals = normals;
        this.indices = indices;

    }
}

// Create a plane grid with vertices and indices using 32-bit indices and chunked buffer upload
function createPlane(gridSize: number, width: number, height: number): RenderMesh {
    // Calculate the total number of vertices and indices
    const vertexCount = (gridSize + 1) * (gridSize + 1);
    const indexCount = gridSize * gridSize * 6;

    // Create vertex buffer (Float32Array)
    const vertices = new Float32Array(vertexCount * 3);
    const normals = new Float32Array(vertexCount * 3);

    // Create index buffer (Uint32Array for large data)
    const indices = new Uint32Array(indexCount);

    let vertexIndex = 0;
    // Generate vertices
    for (let i = 0; i <= gridSize; i++) {
        for (let j = 0; j <= gridSize; j++) {
            // Map the vertices to the grid
            vertices[vertexIndex++] = (i / gridSize - 0.5) * width / 2;
            vertices[vertexIndex++] = (j / gridSize - 0.5) * height / 2;
            vertices[vertexIndex++] = 0; // Z is always 0
        }
    }

    vertexIndex = 0;
    // Generate normals
    for (let i = 0; i <= gridSize; i++) {
        for (let j = 0; j <= gridSize; j++) {
            // Map the vertices to the grid
            normals[vertexIndex++] = 0;
            normals[vertexIndex++] = 0;
            normals[vertexIndex++] = 1; // pointer to +z
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
    const renderMesh = new RenderMesh(vertices, normals, indices);
    return renderMesh;
}

initThreejs();