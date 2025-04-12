document.addEventListener('DOMContentLoaded', () => {
  const startButton = document.getElementById('start-tracking');
  const statusElement = document.getElementById('status');
  const accelerationElement = document.getElementById('acceleration');
  const rotationElement = document.getElementById('rotation');
  const positionElement = document.getElementById('position-display');

  // 位置データを保存する変数
  let position = { x: 0, y: 0, z: 0 };
  let velocity = { x: 0, y: 0, z: 0 };
  let lastTimestamp = null;

  // 重力加速度を除去するための変数
  let gravityFilter = { x: 0, y: 0, z: 0 };
  const alpha = 0.8; // ローパスフィルターの係数

  startButton.addEventListener('click', () => {
    // iOS の場合は DeviceMotionEvent.requestPermission() が必要
    if (typeof DeviceMotionEvent.requestPermission === 'function') {
      DeviceMotionEvent.requestPermission()
        .then(permissionState => {
          if (permissionState === 'granted') {
            startTracking();
          } else {
            statusElement.textContent = '許可が拒否されました';
            statusElement.style.color = 'red';
          }
        })
        .catch(error => {
          statusElement.textContent = `エラー: ${error}`;
          statusElement.style.color = 'red';
        });
    } else {
      // Android などの場合は直接開始
      startTracking();
    }
  });

  function startTracking() {
    statusElement.textContent = 'トラッキング中...';
    statusElement.style.color = 'green';

    window.addEventListener('devicemotion', handleMotion);
    window.addEventListener('deviceorientation', handleOrientation);
  }

  function handleMotion(event) {
    // 加速度データを取得
    const acceleration = event.accelerationIncludingGravity;

    // 重力フィルタリング（簡易的なローパスフィルター）
    gravityFilter.x = alpha * gravityFilter.x + (1 - alpha) * acceleration.x;
    gravityFilter.y = alpha * gravityFilter.y + (1 - alpha) * acceleration.y;
    gravityFilter.z = alpha * gravityFilter.z + (1 - alpha) * acceleration.z;

    // 重力を除去した加速度
    const linearAcceleration = {
      x: acceleration.x - gravityFilter.x,
      y: acceleration.y - gravityFilter.y,
      z: acceleration.z - gravityFilter.z
    };

    // 加速度データを表示
    accelerationElement.textContent = `
            X: ${linearAcceleration.x.toFixed(2)} m/s², 
            Y: ${linearAcceleration.y.toFixed(2)} m/s², 
            Z: ${linearAcceleration.z.toFixed(2)} m/s²
        `;

    // 時間間隔を計算
    const currentTime = Date.now();
    if (lastTimestamp) {
      const deltaTime = (currentTime - lastTimestamp) / 1000; // 秒単位に変換

      // 速度を更新（加速度 × 時間）
      velocity.x += linearAcceleration.x * deltaTime;
      velocity.y += linearAcceleration.y * deltaTime;
      velocity.z += linearAcceleration.z * deltaTime;

      // 位置を更新（速度 × 時間）
      position.x += velocity.x * deltaTime;
      position.y += velocity.y * deltaTime;
      position.z += velocity.z * deltaTime;

      // 位置データを表示
      positionElement.textContent = `
                X: ${position.x.toFixed(2)} m, 
                Y: ${position.y.toFixed(2)} m, 
                Z: ${position.z.toFixed(2)} m
            `;
    }

    lastTimestamp = currentTime;
  }

  function handleOrientation(event) {
    console.log(event)
    // 回転データを表示
    rotationElement.textContent = `
            α: ${event.alpha.toFixed(2)}°, 
            β: ${event.beta.toFixed(2)}°, 
            γ: ${event.gamma.toFixed(2)}°
        `;
  }

  // ドリフト補正（長時間の使用で誤差が蓄積するのを防ぐ）
  setInterval(() => {
    // 微小な動きを無視する（ノイズ対策）
    const threshold = 0.05;
    if (Math.abs(velocity.x) < threshold) velocity.x = 0;
    if (Math.abs(velocity.y) < threshold) velocity.y = 0;
    if (Math.abs(velocity.z) < threshold) velocity.z = 0;

    // 徐々に速度を減衰させる（摩擦のシミュレーション）
    const dampingFactor = 0.95;
    velocity.x *= dampingFactor;
    velocity.y *= dampingFactor;
    velocity.z *= dampingFactor;
  }, 100);
});