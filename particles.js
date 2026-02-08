export default class ParticleSystem {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        
        // Mobile Check & Adaptive Count
        const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent);
        this.count = isMobile ? 12000 : 30000;
        
        this.stateTarget = 0;
        this.currentState = 0;

        this.initParticles();
    }

    initParticles() {
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(this.count * 3);
        const randoms = new Float32Array(this.count * 3);
        const sizes = new Float32Array(this.count);

        for (let i = 0; i < this.count; i++) {
            positions[i * 3] = 0; // Handled in shader
            positions[i * 3 + 1] = 0;
            positions[i * 3 + 2] = 0;

            randoms[i * 3] = (Math.random() - 0.5) * 2;
            randoms[i * 3 + 1] = (Math.random() - 0.5) * 2;
            randoms[i * 3 + 2] = (Math.random() - 0.5) * 2;

            sizes[i] = Math.random() * 20.0 + 10.0;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('aRandom', new THREE.BufferAttribute(randoms, 3));
        geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));

        this.material = new THREE.ShaderMaterial({
            // shaders will be injected at runtime by main.js
            vertexShader: '',
            fragmentShader: '',
            uniforms: {
                uTime: { value: 0 },
                uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 1.5) },
                uAttractor: { value: new THREE.Vector3(0, 0, 0) },
                uAttractorStrength: { value: 0 },
                uTurbulence: { value: 0 },
                uState: { value: 0 },
                uAspect: { value: window.innerWidth / window.innerHeight }
            },
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });

        this.mesh = new THREE.Points(geometry, this.material);
        this.mesh.frustumCulled = false; // GPU driven off-screen
        this.scene.add(this.mesh);
    }

    update(dt, gesture) {
        // Uniform updates
        this.material.uniforms.uTime.value += dt;
        
        // Gesture Mapping
        // Center: Attractor
        this.material.uniforms.uAttractor.value.set(gesture.x * 4, gesture.y * 2, 0); // Scale to screen
        
        // Active Hand strength
        const targetStrength = gesture.active ? 1.0 : 0.0;
        this.material.uniforms.uAttractorStrength.value += (targetStrength - this.material.uniforms.uAttractorStrength.value) * 0.1;

        // Openness -> Turbulence
        this.material.uniforms.uTurbulence.value += (gesture.openness - this.material.uniforms.uTurbulence.value) * 0.1;

        // Pinch -> State Trigger
        // State 0: Orbital, 1: Vortex, 2: Bloom
        if (gesture.pinch > 0.8 && !this.pinchLocked) {
            this.stateTarget = (this.stateTarget + 1) % 3;
            this.pinchLocked = true;
        } else if (gesture.pinch < 0.5) {
            this.pinchLocked = false;
        }

        // Smooth state transition
        this.currentState += (this.stateTarget - this.currentState) * 0.05;
        this.material.uniforms.uState.value = this.currentState;
    }
    
    resize() {
        this.material.uniforms.uAspect.value = window.innerWidth / window.innerHeight;
    }
}
