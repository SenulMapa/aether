uniform float uTime;
varying float vLife;
varying float vDistance;

void main() {
    // Soft particle texture
    vec2 coord = gl_PointCoord - vec2(0.5);
    float dist = length(coord);
    if (dist > 0.5) discard;
    
    float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
    
    // Color Palette
    vec3 colorA = vec3(0.1, 0.4, 0.9); // Deep Blue
    vec3 colorB = vec3(0.9, 0.2, 0.5); // Magenta
    vec3 colorC = vec3(0.1, 0.9, 0.6); // Teal
    
    // Distance field coloring
    vec3 color = mix(colorA, colorB, smoothstep(0.0, 3.0, vDistance));
    color = mix(color, colorC, smoothstep(0.8, 1.0, vLife));
    
    // Glow core
    alpha = pow(alpha, 1.5);
    
    gl_FragColor = vec4(color, alpha * 0.8);
}
