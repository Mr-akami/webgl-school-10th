precision mediump float;

uniform sampler2D textureUnit;
varying vec3 vNormal;
varying vec2 vTexCoord;

const vec3 DIRECTIONAL_LIGHT = normalize(vec3(1.0, 1.0, 1.0));

void main() {
  float diffuse = dot(normalize(vNormal), DIRECTIONAL_LIGHT) * 0.5 + 0.5;
  vec4 samplerColor = texture2D(textureUnit, vTexCoord);
  gl_FragColor = vec4(samplerColor.rgb * diffuse, samplerColor.a);
}

