export default class GestureManager {
    constructor() {
        this.videoElement = document.getElementById('input_video');
        this.hands = new Hands({
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
        });

        this.hands.setOptions({
            maxNumHands: 1,
            modelComplexity: 0,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });

        this.hands.onResults(this.onResults.bind(this));
        
        // Raw Data
        this.raw = { x: 0.5, y: 0.5, z: 0 };
        this.prevRaw = { x: 0.5, y: 0.5 };
        
        // Processed / Smoothed Data
        this.data = {
            x: 0, y: 0, z: 0,         // Normalized Coordinate (-1 to 1)
            active: false,            // Hand detected?
            openness: 0,              // 0 (fist) to 1 (open)
            pinch: 0,                 // 0 to 1
            velocity: 0               // Movement speed
        };

        this.smoothing = 0.15;
    }

    start() {
        const camera = new Camera(this.videoElement, {
            onFrame: async () => {
                await this.hands.send({image: this.videoElement});
            },
            width: 640,
            height: 480
        });
        camera.start();
    }

    onResults(results) {
        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            const landmarks = results.multiHandLandmarks[0];
            
            // 1. Palm Center (approximate using wrist(0), index(5), pinky(17))
            const cx = (landmarks[0].x + landmarks[5].x + landmarks[17].x) / 3;
            const cy = (landmarks[0].y + landmarks[5].y + landmarks[17].y) / 3;
            const cz = landmarks[0].z; // Relative depth

            // 2. Openness (Avg dist of finger tips to wrist)
            const wrist = landmarks[0];
            const tips = [8, 12, 16, 20];
            let totalDist = 0;
            tips.forEach(idx => {
                const tip = landmarks[idx];
                totalDist += Math.hypot(tip.x - wrist.x, tip.y - wrist.y);
            });
            // Approximate max dist is ~0.4, min is ~0.1
            const openness = Math.min(Math.max((totalDist / 4 - 0.1) / 0.25, 0), 1);

            // 3. Pinch (Thumb tip 4 to Index tip 8)
            const pinchDist = Math.hypot(landmarks[4].x - landmarks[8].x, landmarks[4].y - landmarks[8].y);
            const pinch = Math.max(0, 1.0 - (pinchDist / 0.08));

            // Set Raw
            this.raw.x = (cx - 0.5) * 2; // -1 to 1
            this.raw.y = -(cy - 0.5) * 2; // Invert Y
            this.raw.z = cz;
            this.data.active = true;
            this.raw.openness = openness;
            this.raw.pinch = pinch;

        } else {
            this.data.active = false;
        }
    }

    update() {
        if (!this.data.active) {
            // Auto wander if no hand
            this.data.openness = this.lerp(this.data.openness, 0.2, 0.05);
            this.data.pinch = this.lerp(this.data.pinch, 0, 0.1);
            return;
        }

        // LERP for smoothness
        this.data.x = this.lerp(this.data.x, this.raw.x, this.smoothing);
        this.data.y = this.lerp(this.data.y, this.raw.y, this.smoothing);
        this.data.z = this.lerp(this.data.z, this.raw.z, this.smoothing);
        this.data.openness = this.lerp(this.data.openness, this.raw.openness, this.smoothing);
        this.data.pinch = this.lerp(this.data.pinch, this.raw.pinch, 0.2); // Fast reaction

        // Velocity Calc
        const dx = this.data.x - this.prevRaw.x;
        const dy = this.data.y - this.prevRaw.y;
        this.data.velocity = Math.sqrt(dx*dx + dy*dy) * 10.0;

        this.prevRaw.x = this.data.x;
        this.prevRaw.y = this.data.y;
    }

    lerp(start, end, amt) {
        return (1 - amt) * start + amt * end;
    }
}
