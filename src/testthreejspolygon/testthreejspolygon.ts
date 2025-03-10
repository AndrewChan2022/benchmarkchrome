// import * as THREE from 'three';
import * as THREE from 'three/src/Three.WebGPU';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// Create Scene, Camera, Renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 5);

const canvas = document.getElementById("webglCanvas") as HTMLCanvasElement;
const renderer = new THREE.WebGPURenderer({canvas, antialias: true });
// const renderer = new THREE.WebGLRenderer({canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
// document.body.appendChild(renderer.domElement);

 // Orbit Controls (Camera Controls)
 const controls = new OrbitControls(camera, renderer.domElement);
 controls.enableDamping = true; // Smooth camera motion

// Light Source
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(3, 5, 5);
scene.add(light);

// Default Sphere (Solid)
const sphereGeometry = new THREE.SphereGeometry(1, 32, 32);
const sphereMaterial = new THREE.MeshStandardMaterial({ color: 0x0077ff });
const sphereMesh = new THREE.Mesh(sphereGeometry, sphereMaterial);
scene.add(sphereMesh);

// Wireframe Sphere with Polygon Offset  1.0 perfect good, 0.01 perfect bad, 0.1 not so good
const wireframeMaterial = new THREE.MeshBasicMaterial({
    color: 0xff0000,
    // wireframe: true,
    depthTest: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: 1.01, // 1180,
    polygonOffsetUnits: 1.01
});
// const wireframeMaterial = new THREE.MeshStandardMaterial({
//   color: 0xff0000,
//   // wireframe: true,
//   depthTest: true,
//   depthWrite: false,
//   polygonOffset: true,
//   polygonOffsetFactor: 1.11, // 200.0, // 1180,
//   polygonOffsetUnits: 1.11
// });


const wireframeMesh = new THREE.Mesh(sphereGeometry, wireframeMaterial);
// wireframeMesh.scale.x = 1.01;
// wireframeMesh.scale.y = 1.01;
// wireframeMesh.scale.z = 1.01;
scene.add(wireframeMesh);


// Render Loop
function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}
animate();

// Handle Window Resize
window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});
