
import * as THREE from 'three';
import { MeshBVH, acceleratedRaycast } from 'three-mesh-bvh';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import { OBJExporter } from 'three/examples/jsm/exporters/OBJExporter.js';

console.log('Subpage 1 loaded');

// bvh inject
THREE.Mesh.prototype.raycast = acceleratedRaycast;

// scene, render, camera
const width = window.innerWidth, height = window.innerHeight;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, width / height, 0.1, 1000);
camera.position.z = 100;
const renderer = new THREE.WebGLRenderer();
renderer.setSize(width, height);
document.body.appendChild(renderer.domElement);


let buildBVH = true;
//
// build scene
// const geometry = new THREE.BoxGeometry( 10.2, 10.2, 10.2, 100, 100, 100 );

const radius = 20;  // 1;
const tube = 10;    // 0.4;
const tubularSegments = 100;
const radialSegments = 100;
const geometry = new THREE.TorusKnotGeometry( radius, tube, tubularSegments, radialSegments );
// const geometry = new THREE.TorusKnotGeometry( 20, 5, 100, 100 );
// const geometry = new THREE.SphereGeometry(10, 100, 100);
// const geometry = new THREE.BoxGeometry(10, 10, 10, 100, 100, 10);

if(buildBVH) {
    geometry.boundsTree = new MeshBVH( geometry );
}
const material = new THREE.MeshNormalMaterial();

const mesh = new THREE.Mesh( geometry, material );
scene.add( mesh );

// testBVH(mesh);
// testBVH0();
// testBVH2();

// render loop and animation
renderer.setAnimationLoop( animate );

function animate( time: number ) {

	mesh.rotation.x = time / 2000;
	mesh.rotation.y = time / 1000;

	renderer.render( scene, camera );

}


// Load OBJ file
const objLoader = new OBJLoader();


function testBVH0() {

    const raycaster = new THREE.Raycaster();
    const O = new THREE.Vector3(1000, 1000, 1000);
    // const O = new THREE.Vector3(1.1, 1.1, 1.1);
    const D = new THREE.Vector3(0, 0, 0);
    D.sub(O); 
    raycaster.set(O, D);

    // new bvh
    const bvh = new MeshBVH( geometry );

    for (let i = 0; i < 10; i++) {
        let start = performance.now();
        const hit = bvh.raycastFirst( raycaster.ray );
        let end = performance.now();
        console.log(hit);
        console.log(`time: ${end - start}ms`);

        start = performance.now();
        const hits = bvh.raycast(raycaster.ray);
        end = performance.now();
        console.log(hits);
        console.log(`time: ${end - start}ms`);

        const point = new THREE.Vector3(100, 100, 100);
        const sphere = new THREE.Sphere(point, 1);
        start = performance.now();
        const isects = bvh.intersectsSphere( sphere );
        end = performance.now();
        console.log(isects);
        console.log(`time: ${end - start}ms`);

    }

    let start = performance.now();
    for (let i = 0; i < 1000 * 1000; i++) {
        // const hits = bvh.raycast(raycaster.ray);
        const hit = bvh.raycastFirst( raycaster.ray );
    }
    let end = performance.now();
    console.log(`time: ${end - start}ms`);

    let debugLabel = document.getElementById("debugLabel") as HTMLElement;
    debugLabel.innerHTML = `time: ${end - start}ms`;


    const point = new THREE.Vector3(100, 100, 100);
    const sphere = new THREE.Sphere(point, 1);
    start = performance.now();
    for (let i = 0; i < 1000 * 1000; i++) {
        // const hits = bvh.raycast(raycaster.ray);
        const hit = bvh.raycastFirst( raycaster.ray );
    }
    end = performance.now();
    console.log(`time: ${end - start}ms`);
    debugLabel.innerHTML += `\ntime: ${end - start}ms`;

    // hit.point.applyMatrixWorld( mesh.matrixWorld );
    // sphere.applyMatrix4( invMat );
    // const intersects = bvh.intersectsSphere( sphere );
}

function testBVH2() {

    const raycaster = new THREE.Raycaster();
    const O = new THREE.Vector3(1000, 1000, 1000);
    const D = new THREE.Vector3(0, 0, 0);
    D.sub(O); 
    raycaster.set(O, D);

    const invMat = new THREE.Matrix4();
    const bvh = new MeshBVH( geometry );
    invMat.copy( mesh.matrixWorld ).invert();

    raycaster.ray.applyMatrix4( invMat );
    const hit = bvh.raycastFirst( raycaster.ray );

    console.log(hit);

    // hit.point.applyMatrixWorld( mesh.matrixWorld );
    // sphere.applyMatrix4( invMat );
    // const intersects = bvh.intersectsSphere( sphere );

}

function testBVH(mesh: THREE.Mesh) {

    // bvh setup
    const bvh = new MeshBVH(mesh.geometry as THREE.BufferGeometry);
    mesh.geometry = bvh.geometry; // Use the BVH geometry


    // Raycasting setup
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    window.addEventListener('click', (event) => {
        // Calculate mouse position in normalized device coordinates
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        // Update the raycaster
        // raycaster.setFromCamera(mouse, camera);
        raycaster.set(new THREE.Vector3(1000, 1000, 1000), new THREE.Vector3(0 - 1000, 0 - 1000, 0 - 1000))
        raycaster.firstHitOnly = true;
        let isects = raycaster.intersectObjects( [ mesh ] );
        
        console.log(isects);
        // Perform intersection test with the BVH
        // let ray = new THREE.Ray(new THREE.Vector3(0, 0, 0), new THREE.Vector3(1000, 1000, 1000))
        // let is: THREE.Intersection = bvh.raycastFirst(ray);
        // console.log(is);
        // const intersects = bvh.intersectRay(raycaster.ray);
        // if (intersects.length > 0) {
        //     console.log('Intersection:', intersects[0]);
        //     console.log('t:', intersects[0].t); // Distance to the intersection point
        // }
    });
}


// Save the OBJ file
function saveMesh() {

    const material = new THREE.MeshNormalMaterial(); // Example material
    const mesh = new THREE.Mesh(geometry, material);

    const exporter = new OBJExporter();
    const text = exporter.parse(mesh);
    const filename = 'torus_knot.obj';

    const blob = new Blob([text], { type: 'text/plain' });
    const link = document.createElement('a');
    link.style.display = 'none';
    document.body.appendChild(link);
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    document.body.removeChild(link);
}


let debugLabel = document.getElementById("debugLabel") as HTMLElement;

function GetMemoryInfoText() {
    let memory = (performance as any).memory;
    const memoryInfo = `
    Total JS Heap Size: ${(memory.totalJSHeapSize / 1024 / 1024).toFixed(2)} MB
    Used JS Heap Size: ${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB
    JS Heap Size Limit: ${(memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)} MB
    `;
    return memoryInfo;
}
                    

function testarray() {
    let a = [];
    try {
        for (let index = 0; index < 1000 * 1000 * 200; index++) {
            a.push(index * 1.0);
        }
    } catch(error) {
            console.error("An error occurred:", error); 
            console.log((performance as any).memory);
            console.log("vertices.len:", a.length);
            throw new Error("Aborting execution due to error."); 
    }
}

function testbuffer() {
    console.log((performance as any).memory);
    let a = new Uint8Array(1000 * 1000 * 2000);
    console.log((performance as any).memory);
    debugLabel.innerHTML += GetMemoryInfoText();
    try {
        for (let index = 0; index < 1000 * 1000 * 2000; index++) {
            a[index] = 1.0;
        }
    } catch(error) {
            debugLabel.innerHTML += "An error occurred:" + error;
            console.error("An error occurred:", error); 
            console.log((performance as any).memory);
            console.log("vertices.len:", a.length);
            throw new Error("Aborting execution due to error."); 
    }
    console.log((performance as any).memory);
    debugLabel.innerHTML += GetMemoryInfoText();
}

const canvas = document.getElementById('glCanvas') as HTMLCanvasElement;
const gl = canvas.getContext('webgl');

function testglbufer() {
    // Create WebGL context
    // const canvas = document.createElement('glCanvas') as HTMLCanvasElement;
    // const gl = canvas.getContext('webgl');

    // Total data size (6 GB) and chunk size (100 MB)
    const totalDataSize = Math.floor(1.9 * 1024 * 1024 * 1024); // max 2G
    const chunkSize = 100 * 1024 * 1024; // 100 MB
    const totalElements = totalDataSize / Float32Array.BYTES_PER_ELEMENT;
    const chunkElements = chunkSize / Float32Array.BYTES_PER_ELEMENT;

    // Create buffer
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

    // Allocate total size on GPU
    gl.bufferData(gl.ARRAY_BUFFER, totalDataSize, gl.STATIC_DRAW);

    // Simulate uploading chunks
    let offset = 0;
    while (offset < totalElements) {
        const currentChunkElements = Math.min(chunkElements, totalElements - offset);

        // Create a smaller Float32Array for the current chunk
        const chunkData = new Float32Array(currentChunkElements);
        for (let i = 0; i < currentChunkElements; i++) {
            chunkData[i] = Math.random(); // Simulated data
        }

        // Upload the current chunk to the GPU
        gl.bufferSubData(gl.ARRAY_BUFFER, offset * Float32Array.BYTES_PER_ELEMENT, chunkData);

        console.log(`Uploaded chunk: ${offset} to ${offset + currentChunkElements}`);
        offset += currentChunkElements;
    }

    // Verify completion
    console.log('All data uploaded to GPU');

    debugLabel.innerHTML += 'All data uploaded to GPU';
}

async function testgpubuffer() {
    // WebGPU device and queue initialization
    const adapter = await navigator.gpu.requestAdapter();
    console.log(adapter.limits);
    let deviceDescriptor = {
        requiredLimits: {
            maxBufferSize: adapter.limits.maxBufferSize,         // max 2G, else 256M
            maxStorageBufferBindingSize: adapter.limits.maxStorageBufferBindingSize,
        }
    };
    // buffer limit: 2147483648

    const device = await adapter.requestDevice(deviceDescriptor);
    //const device = await adapter.requestDevice();
    const queue = device.queue;

    // Total size of the buffer (3GB)
    const totalSize = Math.floor(1.2 * 1024 * 1024 * 1024); // max 2G
    const chunkSize = 100 * 1024 * 1024; // 100MB per chunk
    const numChunks = Math.ceil(totalSize / chunkSize);

    // Create the large WebGPU buffer
    const gpuBuffer = device.createBuffer({
        size: totalSize,
        usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.STORAGE,
        mappedAtCreation: false, // Not mapping for direct write
    });

    // Function to upload a single chunk
    async function uploadChunk(offset: number, size: number) {
        // Create a Float32Array for this chunk
        const chunkArray = new Float32Array(size / Float32Array.BYTES_PER_ELEMENT);
        
        // Populate the chunk with data (e.g., fill with random numbers)
        for (let i = 0; i < chunkArray.length; i++) {
            chunkArray[i] = Math.random();
        }

        // Upload the chunk to the GPU buffer
        queue.writeBuffer(gpuBuffer, offset, chunkArray.buffer, 0, size);
        console.log(`Uploaded chunk at offset ${offset} with size ${size}`);
    }

    // Upload all chunks incrementally
    for (let i = 0; i < numChunks; i++) {
        const offset = i * chunkSize;
        const currentChunkSize = Math.min(chunkSize, totalSize - offset);
        await uploadChunk(offset, currentChunkSize);
    }

    console.log("All data uploaded to GPU buffer");

}


///////////
(async () =>{

    // debug lable
    let debugLabel = document.getElementById("debugLabel") as HTMLElement;

    // file loader
    let fileLoader = document.getElementById("fileLoader") as HTMLInputElement;
    fileLoader.onchange = async e => {
        const [file] = (e.target as HTMLInputElement).files; // File
        if (file === undefined) { // cancel file choose
            return;
        }

        let urlstr = URL.createObjectURL(file);
        const fileURL = new URL(urlstr);
        let data = await objLoader.loadAsync(urlstr);

        // create mesh
        const group = data as THREE.Group;
        console.log(group);


        group.traverse( function ( child : THREE.Object3D ) {
            if ( child instanceof THREE.Mesh ) {
                child.material = material;
            }
        });

        // (group.children[0] as THREE.Mesh).material = material;
        // mesh.geometry = new THREE.SphereGeometry(0.5);

        scene.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                scene.remove(child);
            }
            if (child instanceof THREE.Group) {
                scene.remove(child);
            }
        });
        
        const newmesh = new THREE.Mesh((group.children[0] as THREE.Mesh).geometry, material);
        console.log(newmesh);

        scene.add(group);
    }

    
    // test button
    let testbutton = document.getElementById("testbtn1") as HTMLButtonElement;
    testbutton.onclick = () => {
        // alert("hello");

        let sum: number = 0;
        for (let index = 1; index <= 100; index++) {
            sum += index;
        }
        console.log(sum);

        debugLabel.innerHTML = "sum:" + sum;

        testBVH0();
    };

    let savebtn = document.getElementById("savebtn1") as HTMLButtonElement;
    savebtn.onclick = () => {
        saveMesh();
    };

    let testbutton0 = document.getElementById("testbtn0") as HTMLButtonElement;
    testbutton0.onclick = async () => {
        testbuffer();
        // testbuffer();
        // testgpubuffer();
    };
    
})();