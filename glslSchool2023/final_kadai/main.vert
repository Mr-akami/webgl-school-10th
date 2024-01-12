
attribute vec3 position;   // 座標
attribute vec3 normal;     // 法線
attribute vec2 texCoord;   // テクスチャ座標
uniform mat4 mvpMatrix;    // MVP 行列
uniform mat4 normalMatrix; // 法線変換行列

varying vec3 vNormal;
varying vec2 vTexCoord;

void main() {
  vNormal = (normalMatrix * vec4(normal, 0.0)).xyz;
  vTexCoord = texCoord;
  gl_Position = mvpMatrix * vec4(position, 1.0);
}

