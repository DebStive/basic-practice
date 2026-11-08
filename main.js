
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js";

// ============================================
// 1. LOAD PROJECT
// ============================================

async function startGame() {

    const response = await fetch("./project.json");

    if (!response.ok) {
        throw new Error("Cannot find project.json");
    }

    const data = await response.json();
    const loader = new THREE.ObjectLoader();

    const scene = loader.parse(data.scene);

    const player = scene.getObjectByName("Player");
    const floor = scene.getObjectByName("Floor");

    if (!player || !floor) {
        throw new Error("Player or Floor is missing!");
    }

    // ============================================
    // 2. FIX FLOOR VISIBILITY
    // ============================================

    floor.material.side = THREE.DoubleSide;
    floor.material.needsUpdate = true;

    floor.material.color.set(0xffffff);

    scene.updateMatrixWorld(true);

    const floorBox = new THREE.Box3().setFromObject(floor);
    const floorCenter = new THREE.Vector3();

    floorBox.getCenter(floorCenter);

    // ============================================
    // 3. LIGHTING
    // ============================================

    scene.background = new THREE.Color(0x252525);

    scene.add(
        new THREE.HemisphereLight(
            0xffffff,
            0x555555,
            2
        )
    );

    const sunlight = new THREE.DirectionalLight(
        0xffffff,
        2
    );

    sunlight.position.set(10, 20, 10);
    scene.add(sunlight);

    // ============================================
    // 4. PLAYER
    // ============================================

    player.visible = false;

    // Remove the exported capsule's scaling
    player.scale.set(1, 1, 1);

    // Spawn at the actual center of the floor
    player.position.set(
        floorCenter.x,
        floorBox.max.y,
        floorCenter.z
    );

    player.rotation.set(0, 0, 0);

    const playerRadius = 0.35;

    // ============================================
    // 5. CAMERA
    // ============================================

    const camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );

    player.add(camera);

    const cameraHeight = 1.6;

    camera.position.set(0, cameraHeight, 0);

    // ============================================
    // 6. RENDERER
    // ============================================

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

    renderer.outputColorSpace = THREE.SRGBColorSpace;

    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;

    document.body.style.margin = "0";
    document.body.style.overflow = "hidden";

    document.body.appendChild(renderer.domElement);

    // ============================================
    // 7. MOUSE CONTROL
    // ============================================

    let pitch = 0;
    const sensitivity = 0.002;

    function lockMouse() {
        renderer.domElement.requestPointerLock();
    }

    const playButton = document.getElementById("startButton");

    if (playButton) {
        playButton.addEventListener("click", lockMouse);
    }

    renderer.domElement.addEventListener("click", () => {
        if (document.pointerLockElement !== renderer.domElement) {
            lockMouse();
        }
    });

    const instructions = document.getElementById("instructions");

    document.addEventListener("pointerlockchange", () => {
        if (instructions) {
            instructions.style.display =
                document.pointerLockElement === renderer.domElement
                    ? "none"
                    : "flex";
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
            -1.5,
            1.5
        );

        camera.rotation.x = pitch;
    });

    // ============================================
    // 8. KEYBOARD
    // ============================================

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

    // ============================================
    // 9. MOVEMENT
    // ============================================

    const clock = new THREE.Clock();

    const speed = 5;

    const forward = new THREE.Vector3();
    const right = new THREE.Vector3();
    const movement = new THREE.Vector3();

    let bobTime = 0;

    const bobAmount = 0.055;
    const bobSpeed = 11;

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
        if (keys["KeyA"]) movement.sub(right);
        if (keys["KeyD"]) movement.add(right);

        const moving = movement.lengthSq() > 0;

        if (moving) {

            movement.normalize();

            const next = player.position.clone();

            next.addScaledVector(
                movement,
                speed * delta
            );

            // FLOOR BOUNDARIES
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

            // WALKING CAMERA BOUNCE
            bobTime += delta * bobSpeed;

            camera.position.y =
                cameraHeight + Math.sin(bobTime) * bobAmount;

            camera.position.x =
                Math.cos(bobTime * 0.5) * 0.025;

        } else {

            // SMOOTH CAMERA RESET
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

    // ============================================
    // 10. GAME LOOP
    // ============================================

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

    // ============================================
    // 11. RESIZE
    // ============================================

    window.addEventListener("resize", () => {

        camera.aspect = window.innerWidth / window.innerHeight;

        camera.updateProjectionMatrix();

        renderer.setSize(
            window.innerWidth,
            window.innerHeight
        );
    });

    console.log("GAME SUCCESSFULLY LOADED");
    console.log("Floor:", floorBox);
    console.log("Player:", player.position);
}

startGame().catch(error => {
    console.error("GAME FAILED:", error);
});
