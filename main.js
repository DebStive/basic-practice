
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js";
import { PointerLockControls } from "https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/controls/PointerLockControls.js";

// Load your project
const response = await fetch("./project.json");
const project = await response.json();

const loader = new THREE.ObjectLoader();

// Load the exported 3D scene and camera
const scene = loader.parse(project.scene);
const camera = loader.parse(project.camera);

scene.add(camera);

// Create renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// First-person controls
const controls = new PointerLockControls(
    camera,
    renderer.domElement
);

document.addEventListener("click", () => {
    controls.lock();
});

// Keyboard movement
const keys = {};

document.addEventListener("keydown", (event) => {
    keys[event.code] = true;
});

document.addEventListener("keyup", (event) => {
    keys[event.code] = false;
});

function animate() {
    requestAnimationFrame(animate);

    const speed = 0.12;

    if (controls.isLocked) {
        if (keys["KeyW"]) controls.moveForward(speed);
        if (keys["KeyS"]) controls.moveForward(-speed);
        if (keys["KeyA"]) controls.moveRight(-speed);
        if (keys["KeyD"]) controls.moveRight(speed);
    }

    renderer.render(scene, camera);
}

animate();

// Resize screen
window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
});
