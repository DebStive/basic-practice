
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js";

// ======================================
// 1. LOAD PROJECT
// ======================================

async function startGame() {

    const response = await fetch("./project.json");

    if (!response.ok) {
        throw new Error("Cannot load project.json");
    }

    const data = await response.json();

    const loader = new THREE.ObjectLoader();
    const scene = loader.parse(data.scene);

    scene.background = new THREE.Color(0x555963);

    // ======================================
    // 2. FIND PLAYER AND FLOOR
    // ======================================

    const player = scene.getObjectByName("Player");
    const floor = scene.getObjectByName("Floor");

    if (!player || !floor) {
        throw new Error("Player or Floor missing!");
    }

    scene.updateMatrixWorld(true);

    const floorBox = new THREE.Box3().setFromObject(floor);

    const playerRadius = 0.35;
    const playerHeight = 2;

    // ======================================
    // 3. PLAYER SPAWN
    // ======================================

    player.position.set(
        0,
        floorBox.max.y + playerHeight / 2,
        -10
    );

    player.rotation.set(0, Math.PI, 0);
    player.visible = false;

    // ======================================
    // 4. FIRST PERSON CAMERA
    // ======================================

    const camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );

    player.add(camera);

    const cameraHeight = 1.2;

    camera.position.set(0, cameraHeight, 0);
    camera.rotation.set(-0.12, 0, 0);

    // ======================================
    // 5. RENDERER
    // ======================================

    const renderer = new THREE.WebGLRenderer({
        antialias: true
    });

    renderer.setSize(window.innerWidth, window.innerHeight);

    renderer.setPixelRatio(
        Math.min(window.devicePixelRatio, 2)
    );

    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;

    document.body.style.margin = "0";
    document.body.style.overflow = "hidden";

    document.body.appendChild(renderer.domElement);

    // ======================================
    // 6. LIGHTING
    // ======================================

    scene.traverse((object) => {
        if (object.isLight) {
            object.castShadow = true;
        }
    });

    // ======================================
    // 7. MOUSE LOOK
    // ======================================

    let pitch = -0.12;
    const sensitivity = 0.002;

    renderer.domElement.addEventListener("click", () => {
        renderer.domElement.requestPointerLock();
    });

    document.addEventListener("mousemove", (event) => {

        if (document.pointerLockElement !== renderer.domElement) {
            return;
        }

        player.rotation.y -= event.movementX * sensitivity;

        pitch -= event.movementY * sensitivity;

        pitch = THREE.MathUtils.clamp(
            pitch,
            -1.5,
            1.5
        );

        camera.rotation.x = pitch;
    });

    // ======================================
    // 8. PLAY BUTTON
    // ======================================

    const startButton = document.getElementById("startButton");
    const instructions = document.getElementById("instructions");

    if (startButton) {
        startButton.addEventListener("click", () => {
            renderer.domElement.requestPointerLock();
        });
    }

    document.addEventListener("pointerlockchange", () => {

        if (instructions) {
            instructions.style.display =
                document.pointerLockElement === renderer.domElement
                    ? "none"
                    : "flex";
        }

    });

    // ======================================
    // 9. KEYBOARD
    // ======================================

    const keys = {};

    document.addEventListener("keydown", (event) => {
        keys[event.code] = true;
    });

    document.addEventListener("keyup", (event) => {
        keys[event.code] = false;
    });

    window.addEventListener("blur", () => {
        Object.keys(keys).forEach(key => {
            keys[key] = false;
        });
    });

    // ======================================
    // 10. MOVEMENT SETTINGS
    // ======================================

    const clock = new THREE.Clock();

    const speed = 5;

    let bobTime = 0;

    const bobAmount = 0.055;
    const bobSpeed = 11;

    const forward = new THREE.Vector3();
    const right = new THREE.Vector3();
    const movement = new THREE.Vector3();

    // ======================================
    // 11. PLAYER MOVEMENT
    // ======================================

    function updateMovement(delta) {

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

            const next = player.position.clone();

            next.addScaledVector(
                movement,
                speed * delta
            );

            // FLOOR COLLISION
            next.x = THREE.MathUtils.clamp(
                next.x,
                floorBox.min.x + playerRadius,
                floorBox.max.x - playerRadius
            );

            next.z = THREE.MathUtils.clamp(
                next.z,
                floorBox.min.z + playerRadius,
                floorBox.max.z - playerRadius
            );

            player.position.x = next.x;
            player.position.z = next.z;

            // CAMERA BOUNCE
            bobTime += delta * bobSpeed;

            camera.position.y =
                cameraHeight + Math.sin(bobTime) * bobAmount;

            camera.position.x =
                Math.cos(bobTime * 0.5) * 0.025;

        } else {

            // RETURN TO REST POSITION
            camera.position.y = THREE.MathUtils.damp(
                camera.position.y,
                cameraHeight,
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

    // ======================================
    // 12. GAME LOOP
    // ======================================

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

    // ======================================
    // 13. RESIZE
    // ======================================

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

    console.log("3D GAME READY!");
    console.log("Player:", player);
    console.log("Floor:", floor);
}

startGame().catch(error => {
    console.error("GAME ERROR:", error);
});
