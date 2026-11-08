
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js";

// ==========================================
// 1. LOAD 3D PROJECT
// ==========================================

const response = await fetch("./project.json");

if (!response.ok) {
    throw new Error("Could not load project.json");
}

const project = await response.json();

const loader = new THREE.ObjectLoader();

const scene = loader.parse(project.scene);

scene.background = new THREE.Color(0x777777);

// ==========================================
// 2. FIND PLAYER AND FLOOR
// ==========================================

const player = scene.getObjectByName("Player");
const floor = scene.getObjectByName("Floor");

if (!player) {
    throw new Error("Player object missing!");
}

if (!floor) {
    throw new Error("Floor object missing!");
}

// Hide player capsule in first person
player.visible = false;

// Update world transforms
scene.updateMatrixWorld(true);

// Calculate floor bounds
const floorBox = new THREE.Box3().setFromObject(floor);

const floorTop = floorBox.max.y;

const playerRadius = 0.35;
const playerHeight = 2.0;

// ==========================================
// 3. FIRST PERSON CAMERA
// ==========================================

const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);

player.add(camera);

const cameraHeight = 1.2;

camera.position.set(0, cameraHeight, 0);

// ==========================================
// 4. RENDERER
// ==========================================

const renderer = new THREE.WebGLRenderer({
    antialias: true
});

renderer.setSize(
    window.innerWidth,
    window.innerHeight
);

renderer.setPixelRatio(
    Math.min(window.devicePixelRatio, 2)
);

renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1;

document.body.style.margin = "0";
document.body.style.overflow = "hidden";

document.body.appendChild(renderer.domElement);

// ==========================================
// 5. LIGHTING
// ==========================================

scene.traverse((object) => {
    if (object.isLight) {
        object.castShadow = true;
    }
});

// ==========================================
// 6. MOUSE LOOK
// ==========================================

let pitch = 0;

const sensitivity = 0.002;

renderer.domElement.addEventListener("click", () => {
    if (document.pointerLockElement !== renderer.domElement) {
        renderer.domElement.requestPointerLock();
    }
});

document.addEventListener("mousemove", (event) => {

    if (document.pointerLockElement !== renderer.domElement) {
        return;
    }

    player.rotation.y -= event.movementX * sensitivity;

    pitch -= event.movementY * sensitivity;

    pitch = THREE.MathUtils.clamp(
        pitch,
        -Math.PI / 2 + 0.05,
        Math.PI / 2 - 0.05
    );

    camera.rotation.x = pitch;
});

// ==========================================
// 7. KEYBOARD INPUT
// ==========================================

const keys = {};

document.addEventListener("keydown", (event) => {
    keys[event.code] = true;
});

document.addEventListener("keyup", (event) => {
    keys[event.code] = false;
});

window.addEventListener("blur", () => {
    for (const key in keys) {
        keys[key] = false;
    }
});

// ==========================================
// 8. MOVEMENT SETTINGS
// ==========================================

const clock = new THREE.Clock();

const speed = 5;

const forward = new THREE.Vector3();
const right = new THREE.Vector3();
const movement = new THREE.Vector3();

let bobTime = 0;

const bobAmount = 0.055;
const bobSpeed = 11;

const baseCameraHeight = cameraHeight;

// ==========================================
// 9. PLAYER MOVEMENT
// ==========================================

function updateMovement(delta) {

    // Get player directions
    forward.set(
        -Math.sin(player.rotation.y),
        0,
        -Math.cos(player.rotation.y)
    );

    right.set(
        Math.cos(player.rotation.y),
        0,
        -Math.sin(player.rotation.y)
    );

    movement.set(0, 0, 0);

    if (keys["KeyW"]) movement.add(forward);
    if (keys["KeyS"]) movement.sub(forward);

    if (keys["KeyD"]) movement.add(right);
    if (keys["KeyA"]) movement.sub(right);

    const isMoving = movement.lengthSq() > 0;

    if (isMoving) {

        movement.normalize();

        // Calculate next position
        const nextPosition = player.position.clone();

        nextPosition.addScaledVector(
            movement,
            speed * delta
        );

        // Floor boundary collision
        const minX = floorBox.min.x + playerRadius;
        const maxX = floorBox.max.x - playerRadius;

        const minZ = floorBox.min.z + playerRadius;
        const maxZ = floorBox.max.z - playerRadius;

        nextPosition.x = THREE.MathUtils.clamp(
            nextPosition.x,
            minX,
            maxX
        );

        nextPosition.z = THREE.MathUtils.clamp(
            nextPosition.z,
            minZ,
            maxZ
        );

        // Apply position
        player.position.x = nextPosition.x;
        player.position.z = nextPosition.z;

        // Keep player on floor
        player.position.y = floorTop + playerHeight / 2;

        // Walking head bob
        bobTime += delta * bobSpeed;

        const bounce = Math.sin(bobTime) * bobAmount;

        camera.position.y = baseCameraHeight + bounce;

        camera.position.x = Math.cos(bobTime * 0.5) * 0.025;

    } else {

        // Smoothly stop camera bounce
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
}

// ==========================================
// 10. GAME LOOP
// ==========================================

function animate() {

    requestAnimationFrame(animate);

    const delta = Math.min(
        clock.getDelta(),
        0.05
    );

    updateMovement(delta);

    renderer.render(scene, camera);
}

animate();

// ==========================================
// 11. SCREEN RESIZE
// ==========================================

window.addEventListener("resize", () => {

    camera.aspect = window.innerWidth / window.innerHeight;

    camera.updateProjectionMatrix();

    renderer.setSize(
        window.innerWidth,
        window.innerHeight
    );

    renderer.setPixelRatio(
        Math.min(window.devicePixelRatio, 2)
    );
});

console.log("3D GAME LOADED");
console.log("Player:", player);
console.log("Floor:", floor);
console.log("First-person controller ready!");
