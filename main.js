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

        // Render
        renderer.render(scene, camera);
    }

    animate();

    // 4. Resize Handling
    window.addEventListener("resize", () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        particleSystem.resize();
    });
})();
