precision mediump float;
uniform sampler2D textureUnit; // フレームバッファ由来のテクスチャ
uniform float time; // 時間の経過
uniform float intensity; // 強さ係数
uniform float contrast; // コントラスト係数
uniform vec2 resolution; // 解像度
uniform vec2 mouse; // 正規化済みマウス座標
varying vec2 vTexCoord;

const int OCT = 8; // オクターブ
const float PST = 0.5; // パーセンテージ
const float PI = 3.1415926; // 円周率

// 補間関数
float interpolate(float a, float b, float x) {
  float f = (1.0 - cos(x * PI)) * 0.5;
  return a * (1.0 - f) + b * f;
}
// 乱数生成器
float rnd(vec2 n) {
  float a = 0.129898;
  float b = 0.78233;
  float c = 437.585453;
  float dt= dot(n ,vec2(a, b));
  float sn= mod(dt, 3.14);
  return fract(sin(sn) * c);
}
// 補間＋乱数
float irnd(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec4 v = vec4(rnd(vec2(i.x,       i.y      )),
                rnd(vec2(i.x + 1.0, i.y      )),
                rnd(vec2(i.x,       i.y + 1.0)),
                rnd(vec2(i.x + 1.0, i.y + 1.0)));
  return interpolate(interpolate(v.x, v.y, f.x), interpolate(v.z, v.w, f.x), f.y);
}
// ノイズ
float noise(vec2 p) {
  float t = 0.0;
  for (int i = 0; i < OCT; i++) {
    float freq = pow(2.0, float(i));
    float amp  = pow(PST, float(OCT - i));
    t += irnd(vec2(p.x / freq, p.y / freq)) * amp;
  }
  return t;
}
// シームレスノイズ
float snoise(vec2 p, vec2 q, vec2 r) {
  return noise(vec2(p.x,       p.y      )) *        q.x  *        q.y  +
         noise(vec2(p.x,       p.y + r.y)) *        q.x  * (1.0 - q.y) +
         noise(vec2(p.x + r.x, p.y      )) * (1.0 - q.x) *        q.y  +
         noise(vec2(p.x + r.x, p.y + r.y)) * (1.0 - q.x) * (1.0 - q.y);
}

void main() {
  // 本来のレンダリング結果
  vec4 samplerColor = texture2D(textureUnit, vTexCoord);

  // グレイスケール
  float gray = dot(samplerColor.rgb, vec3(1.0)) / 3.0;

  // シームレスなバリューノイズを生成する
  float n = snoise(gl_FragCoord.st - vec2(0.0, time * 200.0), vTexCoord, resolution);

  // そのまま合成して出力する場合の例
  // gl_FragColor = vec4(vec3(gray) * n, 1.0);

  // 炎風（ここではサークル状に炎の輪を出している）
  vec2 coord = vTexCoord * 2.0 - 1.0;
  // float m = intensity * 0.1 / abs(length(mouse - coord) - 0.5);
  float m = 0.03 * 0.1 / abs(length(mouse - coord) - 0.5);
  
  float twist = intensity * 0.1 / abs(length(mouse - coord) - 0.5);
  
  float distance = length(mouse - coord);
  vec3 color = vec3(gray);
  if(distance < 0.5) {
    // color = vec3(1.0, 0.0, 0.0);
    // vec2 newTexCoord = (vTexCoord - mouse) * (1.0 - m) + mouse; // なかがぐちゃぐちゃ
    // vec2 newTexCoord = (mouse - vTexCoord) * 0.5 + mouse;
    //  vec2 newTexCoord = vec2(mouse.x - vTexCoord.x, vTexCoord.y - mouse.y) * 0.5 + mouse; // 上下反転の問題を修正　しかし左右反転
    float scale = 0.5;
    vec2 offset = mouse - 0.5 * scale + 0.5;
    vec2 newTexCoord = vec2(vTexCoord - mouse) * scale * (1.0 - twist) + offset;
    color = texture2D(textureUnit, newTexCoord).rgb;
  }
  
  // vec3 fire = vec3(1.0, 0.4, 0.1) * m * m;
  vec3 fire = vec3(1.0, 0.4, 0.1)* m * m;
  float contrastNoise = pow(n, contrast);
  // gl_FragColor = vec4(color + contrastNoise * fire, 1.0);
  gl_FragColor = vec4(color + fire, 1.0);
}

