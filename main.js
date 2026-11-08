
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js";

// LOAD PROJECT
const response = await fetch("./project.json");
const project = await response.json();

const loader = new THREE.ObjectLoader();
const scene = loader.parse(project.scene);

// FIND PLAYER FROM YOUR JSON
const player = scene.getObjectByName("Player");

if (!player) {
    throw new Error("Player object not found in project.json!");
}

// Hide capsule in first-person mode
player.visible = false;

// CREATE FIRST-PERSON CAMERA
const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);

// Attach camera to player
player.add(camera);

// Camera height relative to player
const cameraHeight = 1.2;
camera.position.set(0, cameraHeight, 0);

// RENDERER
const renderer = new THREE.WebGLRenderer({
    antialias: true
});

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;

document.body.style.margin = "0";
document.body.style.overflow = "hidden";
document.body.appendChild(renderer.domElement);

// MOUSE LOOK
let pitch = 0;
const sensitivity = 0.002;

renderer.domElement.addEventListener("click", () => {
    renderer.domElement.requestPointerLock();
});

document.addEventListener("mousemove", (event) => {
    if (document.pointerLockElement !== renderer.domElement) return;

    player.rotation.y -= event.movementX * sensitivity;

    pitch -= event.movementY * sensitivity;
    pitch = THREE.MathUtils.clamp(
        pitch,
        -Math.PI / 2 + 0.05,
        Math.PI / 2 - 0.05
    );

    camera.rotation.x = pitch;
});

// KEYBOARD
const keys = {};

document.addEventListener("keydown", (event) => {
    keys[event.code] = true;
});

document.addEventListener("keyup", (event) => {
    keys[event.code] = false;
});

// MOVEMENT SETTINGS
const clock = new THREE.Clock();

const speed = 5;
let bobTime = 0;

const baseCameraHeight = cameraHeight;

// CAMERA BOUNCE SETTINGS
const bobAmount = 0.055;
const bobSpeed = 11;

// GAME LOOP
function animate() {
    requestAnimationFrame(animate);

    const delta = Math.min(clock.getDelta(), 0.05);

    const forward = new THREE.Vector3(
        -Math.sin(player.rotation.y),
        0,
        -Math.cos(player.rotation.y)
    );

    const right = new THREE.Vector3(
        Math.cos(player.rotation.y),
        0,
        -Math.sin(player.rotation.y)
    );

    const movement = new THREE.Vector3();

    if (keys["KeyW"]) movement.add(forward);
    if (keys["KeyS"]) movement.sub(forward);
    if (keys["KeyD"]) movement.add(right);
    if (keys["KeyA"]) movement.sub(right);

    const isMoving = movement.lengthSq() > 0;

    if (isMoving) {
        movement.normalize();

        player.position.addScaledVector(
            movement,
            speed * delta
        );

        // Walking animation
        bobTime += delta * bobSpeed;

        // Smooth camera bounce
        const bounce = Math.sin(bobTime) * bobAmount;

        camera.position.y = baseCameraHeight + bounce;

        // Small side-to-side movement
        camera.position.x = Math.cos(bobTime * 0.5) * 0.025;

    } else {
        // Smoothly return camera to resting position
        camera.position.y = THREE.MathUtils.damp(
            camera.position.y,
            baseCameraHeight,
            8,
            delta
        );

        camera.position.x = THREE.MathUtils.damp(
            camera.position.x,
            0,
            8,
            delta
        );
    }

    renderer.render(scene, camera);
}

animate();

// RESIZE
window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(
        window.innerWidth,
        window.innerHeight
    );
});
