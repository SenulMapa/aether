import GestureManager from "./gesture.js";
import ParticleSystem from "./particles.js";

// Fetch Shaders Helper (since we arent using a bundler)
async function loadShaders() {
    const v = await fetch("./shaders/vertex.glsl").then(r => r.text());
    const f = await fetch("./shaders/fragment.glsl").then(r => r.text());
    return { v, f };
}

(async () => {
    // 1. Scene Setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.z = 5;

    // Inset (secondary) camera for alternate view
    const insetCamera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    insetCamera.position.set(0, 5, 0);
    insetCamera.up.set(0, 0, -1); // rotate so Y points up in inset
    insetCamera.lookAt(new THREE.Vector3(0, 0, 0));
    let showInset = true;

    const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance" });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    document.body.appendChild(renderer.domElement);

    // 2. Load Shaders & Init System
    const shaders = await loadShaders();
    
    // Initialize Managers
    const gesture = new GestureManager();
    
    // Initialize particle system and inject shaders
    const particleSystem = new ParticleSystem(scene, camera);
    particleSystem.material.vertexShader = shaders.v;
    particleSystem.material.fragmentShader = shaders.f;
    particleSystem.material.needsUpdate = true;

    // Start Camera
    gesture.start();
    document.getElementById("loader").style.opacity = 0;

    // 3. Loop
    const clock = new THREE.Clock();

    function animate() {
        requestAnimationFrame(animate);

        const dt = clock.getDelta();

        // Update Logic
        gesture.update();
        particleSystem.update(dt, gesture.data);

        // Render main view
        renderer.setViewport(0, 0, window.innerWidth, window.innerHeight);
        renderer.setScissorTest(false);
        renderer.render(scene, camera);

        // Render inset view (bottom-left corner)
        if (showInset) {
            const insetW = Math.floor(window.innerWidth * 0.25);
            const insetH = Math.floor(window.innerHeight * 0.25);
            const insetX = window.innerWidth - insetW - 10;
            const insetY = 10; // from bottom

            renderer.clearDepth(); // clear depth buffer for second camera
            renderer.setScissor(insetX, insetY, insetW, insetH);
            renderer.setScissorTest(true);
            renderer.setViewport(insetX, insetY, insetW, insetH);

            // keep inset camera aspect correct
            insetCamera.aspect = insetW / insetH || 1;
            insetCamera.updateProjectionMatrix();

            renderer.render(scene, insetCamera);
            renderer.setScissorTest(false);
            renderer.setViewport(0, 0, window.innerWidth, window.innerHeight);
        }
    }

    animate();

    // 4. Resize Handling
    window.addEventListener("resize", () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        particleSystem.resize();
    });

    // Toggle inset camera with `c`
    window.addEventListener('keydown', (e) => {
        if (e.key === 'c' || e.key === 'C') showInset = !showInset;
    });
})();
