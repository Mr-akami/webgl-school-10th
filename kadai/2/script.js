// = 016 ======================================================================
// １つ前のサンプルで見たようにエフェクトコンポーザーを使っている場合は、描画さ
// れる順番を管理しているのはエフェクトコンポーザーになります。
// さらに新しいパスをコンポーザーに追加する際には、その順序が非常に重要になりま
// すので、ここでドットスクリーンパスをさらに追加し、それらについてしっかりと理
// 解を深めておきましょう。
// ============================================================================

// 必要なモジュールを読み込み
import * as THREE from '../lib/three.module.js'
import { OrbitControls } from '../lib/OrbitControls.js'
import { EffectComposer } from '../lib/EffectComposer.js'
import { RenderPass } from '../lib/RenderPass.js'
import { GlitchPass } from '../lib/GlitchPass.js'
// ポストプロセス用のファイルを追加 @@@
import { DotScreenPass } from '../lib/DotScreenPass.js'

// DOM がパースされたことを検出するイベントで App3 クラスをインスタンス化する
window.addEventListener(
  'DOMContentLoaded',
  () => {
    const app = new App3()

    // 画像をロードしテクスチャを初期化する（Promise による非同期処理）
    app.load().then(() => {
      // ロードが終わってから初期化し、描画する
      app.init()
      app.render()
    })
  },
  false
)

/**
 * three.js を効率よく扱うために自家製の制御クラスを定義
 */
class App3 {
  /**
   * カメラ定義のための定数
   */
  static get CAMERA_PARAM() {
    return {
      fovy: 60,
      aspect: window.innerWidth / window.innerHeight,
      near: 0.1,
      far: 20.0,
      x: 0.0,
      y: 2.0,
      z: 10.0,
      lookAt: new THREE.Vector3(0.0, 0.0, 0.0),
    }
  }
  /**
   * レンダラー定義のための定数
   */
  static get RENDERER_PARAM() {
    return {
      clearColor: 0xffffff,
      width: window.innerWidth,
      height: window.innerHeight,
    }
  }
  /**
   * ディレクショナルライト定義のための定数
   */
  static get DIRECTIONAL_LIGHT_PARAM() {
    return {
      color: 0xffffff, // 光の色
      intensity: 1.0, // 光の強度
      x: 1.0, // 光の向きを表すベクトルの X 要素
      y: 1.0, // 光の向きを表すベクトルの Y 要素
      z: 1.0, // 光の向きを表すベクトルの Z 要素
    }
  }
  /**
   * アンビエントライト定義のための定数
   */
  static get AMBIENT_LIGHT_PARAM() {
    return {
      color: 0xffffff, // 光の色
      intensity: 0.2, // 光の強度
    }
  }
  /**
   * マテリアル定義のための定数
   */
  static get MATERIAL_PARAM() {
    return {
      color: 0xffffff,
      side: THREE.FrontSide,
    }
  }
  /**
   * フォグの定義のための定数
   */
  static get FOG_PARAM() {
    return {
      fogColor: 0xffffff, // フォグの色
      fogNear: 10.0, // フォグの掛かり始めるカメラからの距離
      fogFar: 20.0, // フォグが完全に掛かるカメラからの距離
    }
  }

  /**
   * コンストラクタ
   * @constructor
   */
  constructor() {
    this.renderer // レンダラ
    this.scene // シーン
    this.camera // カメラ
    this.directionalLight // ディレクショナルライト
    this.ambientLight // アンビエントライト
    this.material // マテリアル
    this.torusGeometry // トーラスジオメトリ
    this.torusArray // トーラスメッシュの配列
    this.controls // オービットコントロール
    this.axesHelper // 軸ヘルパー
    this.group // グループ
    this.texture // テクスチャ
    this.composer // エフェクトコンポーザー
    this.renderPass // レンダーパス
    this.glitchPass // グリッチパス
    this.dotScreenPass // ドットスクリーンパス @@@
    this.isRight = true
    this.rotateCount = 0

    this.isDown = false // キーの押下状態を保持するフラグ

    // 再帰呼び出しのための this 固定
    this.render = this.render.bind(this)

    // キーの押下や離す操作を検出できるようにする
    window.addEventListener(
      'keydown',
      (keyEvent) => {
        switch (keyEvent.key) {
          case ' ':
            this.isDown = true
            break
          default:
        }
      },
      false
    )
    window.addEventListener(
      'keyup',
      (keyEvent) => {
        this.isDown = false
      },
      false
    )

    // リサイズイベント
    window.addEventListener(
      'resize',
      () => {
        this.renderer.setSize(window.innerWidth, window.innerHeight)
        this.camera.aspect = window.innerWidth / window.innerHeight
        this.camera.updateProjectionMatrix()
      },
      false
    )
  }

  /**
   * アセット（素材）のロードを行う Promise
   */
  load() {
    return new Promise((resolve) => {
      // 読み込む画像のパス
      const imagePath = './sample.jpg'
      // テクスチャ用のローダーのインスタンスを生成
      const loader = new THREE.TextureLoader()
      // ローダーの load メソッドに読み込む画像のパスと、ロード完了時のコールバックを指定
      loader.load(imagePath, (texture) => {
        // コールバック関数の引数として、初期化済みのテクスチャオブジェクトが渡されてくる
        this.texture = texture
        // Promise を解決
        resolve()
      })
    })
  }

  /**
   * 初期化処理
   */
  init() {
    // レンダラー
    this.renderer = new THREE.WebGLRenderer()
    this.renderer.setClearColor(new THREE.Color(App3.RENDERER_PARAM.clearColor))
    this.renderer.setSize(App3.RENDERER_PARAM.width, App3.RENDERER_PARAM.height)
    const wrapper = document.querySelector('#webgl')
    wrapper.appendChild(this.renderer.domElement)

    // シーンとフォグ
    this.scene = new THREE.Scene()
    this.scene.fog = new THREE.Fog(
      App3.FOG_PARAM.fogColor,
      App3.FOG_PARAM.fogNear,
      App3.FOG_PARAM.fogFar
    )

    // カメラ
    this.camera = new THREE.PerspectiveCamera(
      App3.CAMERA_PARAM.fovy,
      App3.CAMERA_PARAM.aspect,
      App3.CAMERA_PARAM.near,
      App3.CAMERA_PARAM.far
    )
    this.camera.position.set(
      App3.CAMERA_PARAM.x,
      App3.CAMERA_PARAM.y,
      App3.CAMERA_PARAM.z
    )
    this.camera.lookAt(App3.CAMERA_PARAM.lookAt)

    // ディレクショナルライト（平行光源）
    this.directionalLight = new THREE.DirectionalLight(
      App3.DIRECTIONAL_LIGHT_PARAM.color,
      App3.DIRECTIONAL_LIGHT_PARAM.intensity
    )
    this.directionalLight.position.set(
      App3.DIRECTIONAL_LIGHT_PARAM.x,
      App3.DIRECTIONAL_LIGHT_PARAM.y,
      App3.DIRECTIONAL_LIGHT_PARAM.z
    )
    this.scene.add(this.directionalLight)

    // アンビエントライト（環境光）
    this.ambientLight = new THREE.AmbientLight(
      App3.AMBIENT_LIGHT_PARAM.color,
      App3.AMBIENT_LIGHT_PARAM.intensity
    )
    this.scene.add(this.ambientLight)

    // マテリアル
    this.material = new THREE.MeshPhongMaterial(App3.MATERIAL_PARAM)
    // マテリアルにテクスチャを適用
    this.material.map = this.texture

    // グループ
    this.group = new THREE.Group()
    this.scene.add(this.group)
    this.fanGroup = new THREE.Group()
    this.wingsGroup = new THREE.Group()
    this.headGroup = new THREE.Group()
    this.bodyGroup = new THREE.Group()
    this.headGroup.add(this.wingsGroup)
    this.fanGroup.add(this.headGroup)
    this.fanGroup.add(this.bodyGroup)
    this.scene.add(this.fanGroup)

    // fan
    const wing1Geometry = new THREE.CylinderGeometry(0.5, 0.5, 0.1, 32)
    const wing1 = new THREE.Mesh(wing1Geometry, this.material)
    this.wingsGroup.add(wing1)
    this.wingsGroup.rotation.x = 1.5

    const wingShaftGeometry = new THREE.CylinderGeometry(0.2, 0.2, 0.5)
    const wingShaft = new THREE.Mesh(wingShaftGeometry, this.material)
    wingShaft.position.y = -0.2
    this.wingsGroup.add(wingShaft)
    this.wingsGroup.position.z = 0.8

    // head
    const headGeometry = new THREE.SphereGeometry(0.5, 32, 16)
    const head = new THREE.Mesh(headGeometry, this.material)
    const headShaftGeometry = new THREE.CylinderGeometry(0.2, 0.2, 2.0)
    const headShaft = new THREE.Mesh(headShaftGeometry, this.material)
    headShaft.position.y = -1.0
    this.headGroup.add(head)
    this.headGroup.add(headShaft)

    // body
    const bodyGeometry = new THREE.CylinderGeometry(0.5, 0.9, 0.2)
    const body = new THREE.Mesh(bodyGeometry, this.material)
    body.position.y = -2.0
    this.bodyGroup.add(body)

    // トーラスメッシュ
    // const TORUS_COUNT = 1
    // const TRANSFORM_SCALE = 5.0
    // this.torusGeometry = new THREE.TorusGeometry(0.5, 0.2, 8, 16)
    // this.torusArray = []
    // for (let i = 0; i < TORUS_COUNT; ++i) {
    //   // トーラスメッシュのインスタンスを生成
    //   const torus = new THREE.Mesh(this.torusGeometry, this.material)
    //   // 座標をランダムに散らす
    //   torus.position.x = (Math.random() * 2.0 - 1.0) * TRANSFORM_SCALE
    //   torus.position.y = (Math.random() * 2.0 - 1.0) * TRANSFORM_SCALE
    //   torus.position.z = (Math.random() * 2.0 - 1.0) * TRANSFORM_SCALE
    //   this.group.add(torus)
    //   this.torusArray.push(torus)
    // }

    // プレーンメッシュ
    // const PLANE_COUNT = 1
    // this.planeGeometry = new THREE.PlaneGeometry(1.0, 1.0)
    // this.planeArray = []
    // for (let i = 0; i < PLANE_COUNT; ++i) {
    //   // プレーンメッシュのインスタンスを生成
    //   // ※マテリアルはトーラスと共通のものを使う
    //   const plane = new THREE.Mesh(this.planeGeometry, this.material)
    //   // 座標をランダムに散らす
    //   plane.position.x = (Math.random() * 2.0 - 1.0) * TRANSFORM_SCALE
    //   plane.position.y = (Math.random() * 2.0 - 1.0) * TRANSFORM_SCALE
    //   plane.position.z = (Math.random() * 2.0 - 1.0) * TRANSFORM_SCALE
    //   this.group.add(plane)
    // }

    // コントロール
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)

    // コンポーザーの設定 @@@
    // // 1. コンポーザーにレンダラを渡して初期化する
    this.composer = new EffectComposer(this.renderer)
    // 2. コンポーザーに、まず最初に「レンダーパス」を設定する
    this.renderPass = new RenderPass(this.scene, this.camera)
    this.composer.addPass(this.renderPass)
    // 3. コンポーザーに第２のパスとして「グリッチパス」を設定する
    this.glitchPass = new GlitchPass()
    this.composer.addPass(this.glitchPass)
    // 4. コンポーザーに第３のパスとして「ドットスクリーンパス」を設定する
    this.dotScreenPass = new DotScreenPass()
    this.composer.addPass(this.dotScreenPass)
    // 5. パスの追加がすべて終わったら画面に描画結果を出すよう指示する
    this.dotScreenPass.renderToScreen = true

    // ヘルパー
    const axesBarLength = 5.0
    this.axesHelper = new THREE.AxesHelper(axesBarLength)
    this.scene.add(this.axesHelper)
  }

  /**
   * 描画処理
   */
  render() {
    // 恒常ループ
    requestAnimationFrame(this.render)

    // コントロールを更新
    this.controls.update()

    // フラグに応じてオブジェクトの状態を変化させる
    if (this.isDown === true) {
      this.wingsGroup.rotation.y += 0.05
      this.rotateCount += 1
      if (this.isRight) {
        this.headGroup.rotation.y += 0.02
      } else {
        this.headGroup.rotation.y -= 0.02
      }
      if (this.rotateCount > 80) {
        this.isRight = this.isRight ? false : true
        this.rotateCount = 0
      }
    }

    // レンダラーではなく、コンポーザーに対して描画を指示する
    // this.composer.render()

    this.renderer.render(this.scene, this.camera)
  }
}
