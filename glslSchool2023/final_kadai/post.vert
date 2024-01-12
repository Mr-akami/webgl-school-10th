attribute vec3 position;
varying vec2 vTexCoord;

void main() {
  // 頂点の座標情報からテクスチャ座標を作る
  vTexCoord = position.xy * 0.5 + 0.5;
  // 行列による変換等は一切行わずに、そのまま出力する
  gl_Position = vec4(position, 1.0);
}

