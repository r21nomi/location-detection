document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('canvas');
  const startButton = document.getElementById('start-button');
  const statusElement = document.getElementById('status');
  const positionDisplay = document.getElementById('position-display');

  // WebXR セッション変数
  let xrSession = null;
  let xrRefSpace = null;
  let gl = null;

  // 初期位置を保存する変数
  let initialPosition = null;

  // WebXR がサポートされているか確認
  if (navigator.xr) {
    // AR がサポートされているか確認
    navigator.xr.isSessionSupported('immersive-ar').then((supported) => {
      if (supported) {
        statusElement.textContent = 'AR がサポートされています。開始ボタンをタップしてください。';
        startButton.disabled = false;
      } else {
        statusElement.textContent = 'お使いのデバイスは AR をサポートしていません。';
        startButton.disabled = true;
      }
    });
  } else {
    statusElement.textContent = 'WebXR はこのブラウザでサポートされていません。';
    startButton.disabled = true;
  }

  // AR セッション開始ボタンのイベントリスナー
  startButton.addEventListener('click', startARSession);

  // AR セッションを開始する関数
  function startARSession() {
    if (!navigator.xr) return;

    // WebGL コンテキストの初期化
    gl = canvas.getContext('webgl', { xrCompatible: true });

    if (!gl) {
      statusElement.textContent = 'WebGL がサポートされていません。';
      return;
    }

    // AR セッションをリクエスト
    navigator.xr.requestSession('immersive-ar', {
      requiredFeatures: ['local-floor'], // 床を基準とした空間追跡
      optionalFeatures: ['dom-overlay'],
      domOverlay: { root: document.getElementById('ui-container') }
    }).then(onSessionStarted)
      .catch(error => {
        statusElement.textContent = `AR セッションの開始に失敗しました: ${error.message}`;
      });
  }

  // AR セッション開始時の処理
  function onSessionStarted(session) {
    xrSession = session;
    statusElement.textContent = 'AR セッションが開始されました。';
    startButton.classList.add('hidden');

    // セッション終了時の処理
    session.addEventListener('end', () => {
      xrSession = null;
      statusElement.textContent = 'AR セッションが終了しました。';
      startButton.classList.remove('hidden');
      initialPosition = null;
    });

    // キャンバスのサイズ設定
    setupWebGLCanvas();

    // XR レンダリングループの設定
    session.updateRenderState({
      baseLayer: new XRWebGLLayer(session, gl)
    });

    // リファレンススペースの取得
    session.requestReferenceSpace('local-floor').then((refSpace) => {
      xrRefSpace = refSpace;

      // フレームループの開始
      session.requestAnimationFrame(onXRFrame);
    });
  }

  // WebGL キャンバスの設定
  function setupWebGLCanvas() {
    // キャンバスのリサイズ
    function onResize() {
      canvas.width = canvas.clientWidth * window.devicePixelRatio;
      canvas.height = canvas.clientHeight * window.devicePixelRatio;
    }

    window.addEventListener('resize', onResize);
    onResize();

    // 基本的な WebGL 設定
    gl.clearColor(0, 0, 0, 0);
  }

  // XR フレームごとの処理
  function onXRFrame(time, frame) {
    // 次のフレームをリクエスト
    if (xrSession) {
      xrSession.requestAnimationFrame(onXRFrame);
    }

    // WebGL レイヤーの取得
    const glLayer = xrSession.renderState.baseLayer;

    // ビューポートの設定
    gl.bindFramebuffer(gl.FRAMEBUFFER, glLayer.framebuffer);
    gl.viewport(0, 0, glLayer.framebufferWidth, glLayer.framebufferHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // デバイスの位置と向きを取得
    const pose = frame.getViewerPose(xrRefSpace);

    if (pose) {
      const position = pose.transform.position;
      const orientation = pose.transform.orientation;

      // 初期位置を記録（まだ設定されていない場合）
      if (!initialPosition) {
        initialPosition = {
          x: position.x,
          y: position.y,
          z: position.z
        };
      }

      // 初期位置からの距離を計算
      const distance = Math.sqrt(
        Math.pow(position.x - initialPosition.x, 2) +
        Math.pow(position.y - initialPosition.y, 2) +
        Math.pow(position.z - initialPosition.z, 2)
      );

      // 位置情報を表示
      positionDisplay.innerHTML = `
                <div>位置: X=${position.x.toFixed(2)}, Y=${position.y.toFixed(2)}, Z=${position.z.toFixed(2)}</div>
                <div>向き: X=${orientation.x.toFixed(2)}, Y=${orientation.y.toFixed(2)}, Z=${orientation.z.toFixed(2)}, W=${orientation.w.toFixed(2)}</div>
                <div>初期位置からの距離: ${distance.toFixed(2)}m</div>
                <div>初期位置: X=${initialPosition.x.toFixed(2)}, Y=${initialPosition.y.toFixed(2)}, Z=${initialPosition.z.toFixed(2)}</div>
            `;

      // ここに 3D オブジェクトのレンダリングコードを追加できます
      // 例: 現在位置にマーカーを表示するなど
    }
  }

  // AR セッション終了ボタンの追加
  const endButton = document.createElement('button');
  endButton.textContent = 'AR 終了';
  endButton.style.backgroundColor = '#f44336';
  endButton.style.display = 'none';
  endButton.style.marginLeft = '10px';
  document.getElementById('ui-container').appendChild(endButton);

  endButton.addEventListener('click', () => {
    if (xrSession) {
      xrSession.end();
    }
  });

  // AR セッションが開始されたら終了ボタンを表示
  const originalStartARSession = startARSession;
  startARSession = function() {
    originalStartARSession();
    endButton.style.display = 'inline-block';
  };
});