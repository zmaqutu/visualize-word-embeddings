uniform sampler2D textTexture; // The pre-rendered text texture
uniform bool isHovered; // Boolean to check if the sphere is hovered
varying vec2 vUv;

void main() {
    if (isHovered) {
        gl_FragColor = texture2D(textTexture, vUv);
    } else {
        discard; // Don't render anything when not hovered
    }
}
