import * as THREE from '../js/vendor/three/build/three.module.js';
    import { OrbitControls } from '../js/vendor/three/examples/jsm/controls/OrbitControls.js';
    import { GLTFLoader } from '../js/vendor/three/examples/jsm/loaders/GLTFLoader.js';
    import { Reflector } from '../js/vendor/three/examples/jsm/objects/Reflector.js';

    window.__worldBootState.started = true;

    const ASSETS = {
      character: '/world/models/犬夜叉.glb?v=20260613-1315',
      environment: {
        url: '/world/models/环境-树.glb?v=20260613-full-local',
        manifest: '/world/models/environment-trees.manifest.json?v=20260613-edgeone25'
      }
    };
    const WORLD_BOUNDS = {
      minX: -46,
      maxX: 46,
      minZ: -22,
      maxZ: 22
    };
    const COLLISION_PADDING = 0.25;
    const CHARACTER_COLLISION_RADIUS = 0.9;
    const DEFAULT_MODEL_COLLISION_RADIUS = 1;
    const MAX_COLLISION_SOLVE_STEPS = 8;
    const CHARACTER_TARGET_HEIGHT = 2.4;
    const ENVIRONMENT_TARGET_WIDTH = 82;
    const CAMERA_DEFAULTS = {
      x: 10,
      y: 7,
      z: 14,
      targetY: 1.8
    };
    const LIGHT_DEFAULTS = {
      background: '#2e2c81',
      waterColor: '#54a9ab',
      ambientIntensity: 8,
      sunIntensity: 12,
      sunColor: '#ff0000'
    };
    const DROPPED_MODEL_SCALE_MULTIPLIERS = {
      cabin: 5
    };

    const WORLD_CHAT_API_URL = (() => {
      const localHosts = new Set(['localhost', '127.0.0.1', '::1']);
      if (localHosts.has(window.location.hostname) || window.location.hostname.endsWith('.vercel.app')) {
        return '/api/world-chat';
      }

      return 'https://my-website-zeta-indol-39.vercel.app/api/world-chat';
    })();

    const IS_LOCAL_PREVIEW = ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);

    const stage = document.querySelector('[data-world-stage]');
    const canvas = document.getElementById('world-canvas');
    const statusText = document.querySelector('[data-world-status]');
    const loaderPanel = document.querySelector('[data-loader]');
    const loaderTitle = document.querySelector('[data-loader-title]');
    const loaderDetail = document.querySelector('[data-loader-detail]');
    const resetViewButton = document.querySelector('[data-reset-view]');
    const chat = document.querySelector('[data-chat]');
    const closeChat = document.querySelector('[data-close-chat]');
    const chatState = document.querySelector('[data-chat-state]');
    const messages = document.querySelector('[data-messages]');
    const chatForm = document.querySelector('[data-chat-form]');
    const chatInput = document.querySelector('[data-chat-input]');
    const chatSubmit = document.querySelector('[data-chat-submit]');
    const dropzone = document.getElementById('dropzone');
    const cameraXInput = document.querySelector('[data-camera-x]');
    const cameraYInput = document.querySelector('[data-camera-y]');
    const cameraZInput = document.querySelector('[data-camera-z]');
    const cameraXValue = document.querySelector('[data-camera-x-value]');
    const cameraYValue = document.querySelector('[data-camera-y-value]');
    const cameraZValue = document.querySelector('[data-camera-z-value]');
    const cameraDefaultButton = document.querySelector('[data-camera-default]');
    const backgroundColorInput = document.querySelector('[data-background-color]');
    const backgroundColorValue = document.querySelector('[data-background-color-value]');
    const waterColorInput = document.querySelector('[data-water-color]');
    const waterColorValue = document.querySelector('[data-water-color-value]');
    const ambientLightInput = document.querySelector('[data-ambient-light]');
    const ambientLightValue = document.querySelector('[data-ambient-light-value]');
    const sunLightInput = document.querySelector('[data-sun-light]');
    const sunLightValue = document.querySelector('[data-sun-light-value]');
    const sunColorInput = document.querySelector('[data-sun-color]');
    const sunColorValue = document.querySelector('[data-sun-color-value]');
    const lightDefaultButton = document.querySelector('[data-light-default]');
    const modelCards = Array.from(document.querySelectorAll('[data-model-key]'));

    const state = {
      renderer: null,
      camera: null,
      controls: null,
      scene: null,
      loader: null,
      waterSurface: null,
      ambientLight: null,
      sunLight: null,
      clock: new THREE.Clock(),
      environment: null,
      characterModel: null,
      characterPivot: new THREE.Group(),
      characterHitTargets: [],
      droppedModels: new Map(),
      droppedModelHitTargets: [],
      characterMixer: null,
      characterHover: false,
      hoveredDroppedModelKey: '',
      dragging: false,
      dragSubject: null,
      dragSubjectType: '',
      dragSubjectKey: '',
      dragMoved: false,
      dragStart: new THREE.Vector2(),
      chatOpenedOnce: false,
      chatSending: false,
      syncingCameraPanel: false
    };

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const dragPoint = new THREE.Vector3();
    const dragOffset = new THREE.Vector3();

    function setStatus(text) {
      statusText.textContent = text;
    }

    function describeObject(object) {
      if (!object) return null;
      object.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(object);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      return {
        name: object.name,
        position: object.position.toArray(),
        scale: object.scale.toArray(),
        box: {
          min: box.min.toArray(),
          max: box.max.toArray(),
          size: size.toArray(),
          center: center.toArray()
        }
      };
    }

    function exposeDebugState() {
      window.__worldDebug = () => ({
        status: statusText.textContent,
        camera: state.camera ? state.camera.position.toArray() : null,
        target: state.controls ? state.controls.target.toArray() : null,
        environment: describeObject(state.environment),
        character: describeObject(state.characterPivot),
        droppedModels: Array.from(state.droppedModels, ([key, entry]) => ({
          key,
          name: entry.name,
          object: describeObject(entry.object)
        }))
      });
    }

    function showLoader(title, detail) {
      loaderTitle.textContent = title;
      loaderDetail.textContent = detail;
      loaderPanel.hidden = false;
    }

    function hideLoader() {
      loaderPanel.hidden = true;
    }

    function showFatal(error) {
      const message = error && error.message ? error.message : String(error);
      window.__worldBootState.error = message;
      showLoader('3D 世界启动失败', message);
      setStatus('启动失败：' + message);
      console.error('[world] fatal:', error);
    }

    function detectWebGL2() {
      const testCanvas = document.createElement('canvas');
      let gl = null;
      try {
        gl = testCanvas.getContext('webgl2', { antialias: true });
      } catch (error) {
        return { ok: false, message: error.message || String(error) };
      }

      if (!gl) {
        return { ok: false, message: '当前浏览器没有提供 WebGL2 上下文。Three.js r165 需要 WebGL2。' };
      }

      return { ok: true, message: gl.getParameter(gl.VERSION) };
    }

    function createRenderer() {
      const webgl = detectWebGL2();
      if (!webgl.ok) {
        throw new Error(webgl.message);
      }

      const renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance'
      });

      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      return renderer;
    }

    function resizeRenderer() {
      if (!state.renderer || !state.camera) return;
      const rect = stage.getBoundingClientRect();
      const width = Math.max(1, Math.floor(rect.width));
      const height = Math.max(1, Math.floor(rect.height));
      state.camera.aspect = width / height;
      state.camera.updateProjectionMatrix();
      state.renderer.setSize(width, height, false);
    }

    function getCameraSettings() {
      return {
        x: Number(cameraXInput.value),
        y: Number(cameraYInput.value),
        z: Number(cameraZInput.value)
      };
    }

    function updateCameraLabels(settings) {
      cameraXValue.value = settings.x.toFixed(1);
      cameraYValue.value = settings.y.toFixed(1);
      cameraZValue.value = settings.z.toFixed(1);
    }

    function syncCameraPanelFromCamera() {
      if (!state.camera || state.syncingCameraPanel) return;
      const settings = {
        x: THREE.MathUtils.clamp(state.camera.position.x, Number(cameraXInput.min), Number(cameraXInput.max)),
        y: THREE.MathUtils.clamp(state.camera.position.y, Number(cameraYInput.min), Number(cameraYInput.max)),
        z: THREE.MathUtils.clamp(state.camera.position.z, Number(cameraZInput.min), Number(cameraZInput.max))
      };
      state.syncingCameraPanel = true;
      cameraXInput.value = settings.x.toFixed(1);
      cameraYInput.value = settings.y.toFixed(1);
      cameraZInput.value = settings.z.toFixed(1);
      updateCameraLabels(settings);
      state.syncingCameraPanel = false;
    }

    function applyCameraSettings(settings = getCameraSettings()) {
      if (!state.camera || !state.controls) return;
      state.camera.position.set(settings.x, settings.y, settings.z);
      state.controls.target.set(0, CAMERA_DEFAULTS.targetY, 0);
      state.camera.lookAt(state.controls.target);
      state.controls.update();
      updateCameraLabels(settings);
    }

    function setCameraInputs(settings) {
      cameraXInput.value = String(settings.x);
      cameraYInput.value = String(settings.y);
      cameraZInput.value = String(settings.z);
      applyCameraSettings(settings);
    }

    function resetCamera() {
      setCameraInputs(CAMERA_DEFAULTS);
    }

    function focusFullScene() {
      if (!state.camera || !state.controls) return;
      const settings = { x: 20, y: 16, z: 30 };
      state.camera.position.set(settings.x, settings.y, settings.z);
      state.controls.target.set(0, 4.5, 0);
      state.camera.lookAt(state.controls.target);
      state.controls.update();
      syncCameraPanelFromCamera();
    }

    function getLightSettings() {
      return {
        background: backgroundColorInput.value,
        waterColor: waterColorInput.value,
        ambientIntensity: Number(ambientLightInput.value),
        sunIntensity: Number(sunLightInput.value),
        sunColor: sunColorInput.value
      };
    }

    function updateLightLabels(settings) {
      backgroundColorValue.value = settings.background;
      waterColorValue.value = settings.waterColor;
      ambientLightValue.value = settings.ambientIntensity.toFixed(1);
      sunLightValue.value = settings.sunIntensity.toFixed(1);
      sunColorValue.value = settings.sunColor;
    }

    function applyLightSettings(settings = getLightSettings()) {
      if (!state.scene) return;
      state.scene.background = new THREE.Color(settings.background);
      state.scene.fog = new THREE.FogExp2(settings.background, 0.018);
      if (state.ambientLight) {
        state.ambientLight.intensity = settings.ambientIntensity;
      }
      if (state.sunLight) {
        state.sunLight.intensity = settings.sunIntensity;
        state.sunLight.color.set(settings.sunColor);
      }
      if (state.waterSurface?.material?.uniforms?.color) {
        state.waterSurface.material.uniforms.color.value.set(settings.waterColor);
      }
      updateLightLabels(settings);
    }

    function setLightInputs(settings) {
      backgroundColorInput.value = settings.background;
      waterColorInput.value = settings.waterColor;
      ambientLightInput.value = String(settings.ambientIntensity);
      sunLightInput.value = String(settings.sunIntensity);
      sunColorInput.value = settings.sunColor;
      applyLightSettings(settings);
    }

    function resetLightSettings() {
      setLightInputs(LIGHT_DEFAULTS);
      setStatus('灯光和背景已恢复默认');
    }

    function addBaseWorld() {
      const scene = state.scene;
      scene.background = new THREE.Color(LIGHT_DEFAULTS.background);
      scene.fog = new THREE.FogExp2(LIGHT_DEFAULTS.background, 0.018);

      const ambient = new THREE.HemisphereLight(0xe6fbff, 0x243141, LIGHT_DEFAULTS.ambientIntensity);
      state.ambientLight = ambient;
      scene.add(ambient);

      const sun = new THREE.DirectionalLight(LIGHT_DEFAULTS.sunColor, LIGHT_DEFAULTS.sunIntensity);
      state.sunLight = sun;
      sun.position.set(8, 13, 7);
      sun.castShadow = true;
      sun.shadow.mapSize.set(2048, 2048);
      sun.shadow.camera.near = 0.5;
      sun.shadow.camera.far = 80;
      sun.shadow.camera.left = -30;
      sun.shadow.camera.right = 30;
      sun.shadow.camera.top = 30;
      sun.shadow.camera.bottom = -30;
      scene.add(sun);

      const fill = new THREE.PointLight(0x75d2da, 5.6, 42);
      fill.position.set(-5, 6, -5);
      scene.add(fill);

      const waterSurface = new Reflector(
        new THREE.PlaneGeometry(96, 48),
        {
          clipBias: 0.003,
          textureWidth: Math.min(2048, window.innerWidth * window.devicePixelRatio),
          textureHeight: Math.min(2048, window.innerHeight * window.devicePixelRatio),
          color: LIGHT_DEFAULTS.waterColor,
          multisample: 4
        }
      );
      waterSurface.name = 'ReflectiveWaterSurface';
      waterSurface.rotation.x = -Math.PI / 2;
      waterSurface.position.y = -0.012;
      waterSurface.receiveShadow = true;
      state.waterSurface = waterSurface;
      scene.add(waterSurface);

      const grid = new THREE.GridHelper(96, 96, 0x9be8ef, 0x2f6170);
      grid.scale.z = 0.5;
      grid.position.y = 0.018;
      grid.material.transparent = true;
      grid.material.opacity = 0.12;
      grid.material.depthWrite = false;
      scene.add(grid);

      const centerRing = new THREE.Mesh(
        new THREE.TorusGeometry(5.2, 0.035, 10, 160),
        new THREE.MeshBasicMaterial({ color: 0x9be8ef, transparent: true, opacity: 0.62 })
      );
      centerRing.name = 'CenterVisibleRing';
      centerRing.rotation.x = Math.PI / 2;
      centerRing.position.y = 0.06;
      scene.add(centerRing);

      if (new URLSearchParams(window.location.search).has('debug')) {
        const axes = new THREE.Group();
        const red = new THREE.Mesh(
          new THREE.BoxGeometry(1.1, 1.1, 1.1),
          new THREE.MeshBasicMaterial({ color: 0xff4040 })
        );
        red.name = 'VisibleRedDebugBox';
        red.position.set(-2.7, 0.55, 0);
        const green = new THREE.Mesh(
          new THREE.SphereGeometry(0.58, 32, 18),
          new THREE.MeshBasicMaterial({ color: 0x44ff88 })
        );
        green.name = 'VisibleGreenDebugSphere';
        green.position.set(2.7, 0.58, 0);
        axes.add(red, green);
        scene.add(axes);
      }
    }

    function createFallbackCharacter() {
      const group = new THREE.Group();
      group.name = 'FallbackInuyashaCharacter';

      const coat = new THREE.MeshStandardMaterial({
        color: 0xd63d35,
        roughness: 0.46,
        metalness: 0.03,
        emissive: 0x361010,
        emissiveIntensity: 0.08
      });
      const skin = new THREE.MeshStandardMaterial({ color: 0xf0d4bf, roughness: 0.52 });
      const hair = new THREE.MeshStandardMaterial({ color: 0xf4f4ea, roughness: 0.58 });
      const dark = new THREE.MeshStandardMaterial({ color: 0x1b1d23, roughness: 0.6 });

      const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.58, 1.35, 8, 18), coat);
      body.position.y = 1.35;
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.46, 34, 20), skin);
      head.position.y = 2.38;
      const hairCap = new THREE.Mesh(new THREE.SphereGeometry(0.52, 34, 16, 0, Math.PI * 2, 0, Math.PI * 0.62), hair);
      hairCap.position.y = 2.52;
      const sword = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.25, 0.12), dark);
      sword.position.set(0.78, 1.42, -0.18);
      sword.rotation.z = -0.58;
      const glow = new THREE.Mesh(
        new THREE.TorusGeometry(0.86, 0.025, 8, 96),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.76 })
      );
      glow.position.y = 2.95;
      glow.rotation.x = Math.PI / 2;

      group.add(body, head, hairCap, sword, glow);
      group.traverse((node) => {
        if (node.isMesh) {
          node.castShadow = true;
          node.receiveShadow = true;
          node.frustumCulled = false;
        }
      });
      return group;
    }

    function fitObject(object, options) {
      const targetHeight = options.targetHeight || null;
      const targetWidth = options.targetWidth || null;
      object.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(object);
      const size = new THREE.Vector3();
      box.getSize(size);
      const horizontal = Math.max(size.x, size.z, 0.0001);
      const height = Math.max(size.y, 0.0001);
      let scale = 1;

      if (targetHeight) {
        scale = targetHeight / height;
      } else if (targetWidth) {
        scale = targetWidth / horizontal;
      }

      if (Number.isFinite(scale) && scale > 0) {
        object.scale.multiplyScalar(scale);
      }

      object.updateMatrixWorld(true);
      const fittedBox = new THREE.Box3().setFromObject(object);
      const center = fittedBox.getCenter(new THREE.Vector3());
      object.position.x -= center.x;
      object.position.z -= center.z;
      object.position.y -= fittedBox.min.y;
      object.updateMatrixWorld(true);
    }

    function calculateCollisionRadius(object, fallback = DEFAULT_MODEL_COLLISION_RADIUS) {
      object.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(object);
      const size = box.getSize(new THREE.Vector3());
      const radius = Math.max(size.x, size.z) * 0.5;
      return Number.isFinite(radius) && radius > 0 ? radius + COLLISION_PADDING : fallback;
    }

    function setCollisionRadius(object, fallback) {
      object.userData.collisionRadius = calculateCollisionRadius(object, fallback);
      return object.userData.collisionRadius;
    }

    function getObjectCollisionRadius(object) {
      return object?.userData?.collisionRadius || DEFAULT_MODEL_COLLISION_RADIUS;
    }

    function getCollisionBodies(ignoreObject = null) {
      const bodies = [];
      if (state.characterPivot && state.characterPivot !== ignoreObject) {
        bodies.push({
          object: state.characterPivot,
          radius: getObjectCollisionRadius(state.characterPivot)
        });
      }
      state.droppedModels.forEach((entry) => {
        if (!entry.object || entry.object === ignoreObject) return;
        bodies.push({
          object: entry.object,
          radius: getObjectCollisionRadius(entry.object)
        });
      });
      return bodies;
    }

    function hasCollisionAtPosition(object, position, bodies = getCollisionBodies(object)) {
      const radius = getObjectCollisionRadius(object);
      return bodies.some((body) => {
        const dx = position.x - body.object.position.x;
        const dz = position.z - body.object.position.z;
        return Math.hypot(dx, dz) < radius + body.radius - 0.001;
      });
    }

    function findNearestFreePosition(object, desiredPosition, bodies) {
      const radius = getObjectCollisionRadius(object);
      const clampedDesired = clampToWorldBounds(desiredPosition);
      if (!hasCollisionAtPosition(object, clampedDesired, bodies)) {
        return clampedDesired;
      }

      for (let ring = 1; ring <= 10; ring += 1) {
        const distance = radius * 0.65 * ring;
        const samples = 16 + ring * 4;
        for (let sample = 0; sample < samples; sample += 1) {
          const angle = (Math.PI * 2 * sample) / samples;
          const candidate = clampToWorldBounds({
            x: clampedDesired.x + Math.cos(angle) * distance,
            z: clampedDesired.z + Math.sin(angle) * distance
          });
          if (!hasCollisionAtPosition(object, candidate, bodies)) {
            return candidate;
          }
        }
      }

      const currentPosition = clampToWorldBounds(object.position);
      return hasCollisionAtPosition(object, currentPosition, bodies) ? clampedDesired : currentPosition;
    }

    function resolveNonOverlappingPosition(object, desiredPosition) {
      const radius = getObjectCollisionRadius(object);
      const bodies = getCollisionBodies(object);
      const candidate = clampToWorldBounds(desiredPosition);

      for (let step = 0; step < MAX_COLLISION_SOLVE_STEPS; step += 1) {
        let moved = false;
        bodies.forEach((body, index) => {
          const otherPosition = body.object.position;
          const minDistance = radius + body.radius;
          const dx = candidate.x - otherPosition.x;
          const dz = candidate.z - otherPosition.z;
          const distance = Math.hypot(dx, dz);
          if (distance >= minDistance) return;

          const angle = distance > 0.0001
            ? Math.atan2(dz, dx)
            : (index + 1) * Math.PI * 0.73;
          candidate.x = otherPosition.x + Math.cos(angle) * minDistance;
          candidate.z = otherPosition.z + Math.sin(angle) * minDistance;
          const clamped = clampToWorldBounds(candidate);
          candidate.x = clamped.x;
          candidate.z = clamped.z;
          moved = true;
        });
        if (!moved) break;
      }

      return hasCollisionAtPosition(object, candidate, bodies)
        ? findNearestFreePosition(object, desiredPosition, bodies)
        : candidate;
    }

    function moveObjectWithCollision(object, desiredPosition) {
      const nextPosition = resolveNonOverlappingPosition(object, desiredPosition);
      object.position.x = nextPosition.x;
      object.position.z = nextPosition.z;
      return nextPosition;
    }

    function makeModelRenderable(root) {
      root.traverse((node) => {
        if (!node.isMesh) return;
        node.castShadow = true;
        node.receiveShadow = true;
        node.frustumCulled = false;
        if (Array.isArray(node.material)) {
          node.material.forEach((material) => {
            material.needsUpdate = true;
          });
        } else if (node.material) {
          node.material.needsUpdate = true;
        }
      });
    }

    function rebuildCharacterTargets() {
      state.characterHitTargets.length = 0;
      state.characterPivot.traverse((node) => {
        if (node.isMesh) {
          state.characterHitTargets.push(node);
        }
      });
    }

    function rebuildDroppedModelTargets() {
      state.droppedModelHitTargets.length = 0;
      state.droppedModels.forEach((entry, key) => {
        entry.object.traverse((node) => {
          if (node.isMesh) {
            node.userData.droppedModelKey = key;
            state.droppedModelHitTargets.push(node);
          }
        });
      });
    }

    function getModelCard(key) {
      return modelCards.find((card) => card.dataset.modelKey === key) || null;
    }

    function getModelKeyFromObject(object) {
      let current = object;
      while (current) {
        if (current.userData?.droppedModelKey) return current.userData.droppedModelKey;
        current = current.parent;
      }
      return '';
    }

    function updateModelEditor(key) {
      const card = getModelCard(key);
      if (!card) return;
      const entry = state.droppedModels.get(key);
      const editor = card.querySelector('[data-model-editor]');
      const stateLabel = card.querySelector('[data-model-state]');
      card.classList.toggle('is-active', Boolean(entry));
      editor.hidden = !entry;
      if (!entry) return;
      stateLabel.textContent = `已投放：${entry.name}`;
      const inputs = {
        x: card.querySelector('[data-model-x]'),
        y: card.querySelector('[data-model-y]'),
        z: card.querySelector('[data-model-z]')
      };
      const numberInputs = {
        x: card.querySelector('[data-model-x-number]'),
        y: card.querySelector('[data-model-y-number]'),
        z: card.querySelector('[data-model-z-number]')
      };
      const outputs = {
        x: card.querySelector('[data-model-x-value]'),
        y: card.querySelector('[data-model-y-value]'),
        z: card.querySelector('[data-model-z-value]')
      };
      ['x', 'y', 'z'].forEach((axis) => {
        const value = entry.object.position[axis].toFixed(1);
        inputs[axis].value = value;
        numberInputs[axis].value = value;
        outputs[axis].value = value;
      });
    }

    function setDroppedModelAxis(card, axis, rawValue) {
      const entry = state.droppedModels.get(card.dataset.modelKey);
      if (!entry) return;
      const rangeInput = card.querySelector(`[data-model-${axis}]`);
      const min = Number(rangeInput?.min ?? -Infinity);
      const max = Number(rangeInput?.max ?? Infinity);
      const value = THREE.MathUtils.clamp(Number(rawValue), min, max);
      if (!Number.isFinite(value)) return;
      entry.object.position[axis] = value;
      if (axis === 'x' || axis === 'z') {
        moveObjectWithCollision(entry.object, entry.object.position);
      }
      rebuildDroppedModelTargets();
      updateModelEditor(card.dataset.modelKey);
      setStatus(`${entry.name} 坐标已调整`);
    }

    function updateAllModelEditors() {
      modelCards.forEach((card) => updateModelEditor(card.dataset.modelKey));
    }

    function clearDroppedModel(key) {
      const entry = state.droppedModels.get(key);
      if (entry) {
        state.scene.remove(entry.object);
        entry.object.traverse((node) => {
          if (!node.isMesh) return;
          node.geometry?.dispose?.();
          if (Array.isArray(node.material)) {
            node.material.forEach((material) => material.dispose?.());
          } else {
            node.material?.dispose?.();
          }
        });
      }
      state.droppedModels.delete(key);
      if (state.hoveredDroppedModelKey === key) state.hoveredDroppedModelKey = '';
      rebuildDroppedModelTargets();
      updateModelEditor(key);
    }

    function installCharacter(object, label) {
      state.characterPivot.clear();
      object.name = label;
      makeModelRenderable(object);
      fitObject(object, { targetHeight: CHARACTER_TARGET_HEIGHT });
      state.characterPivot.add(object);
      state.characterPivot.position.set(0, 0, 0);
      state.scene.add(state.characterPivot);
      state.characterModel = object;
      state.characterPivot.userData.collisionRadius = Math.max(
        CHARACTER_COLLISION_RADIUS,
        calculateCollisionRadius(state.characterPivot, CHARACTER_COLLISION_RADIUS)
      );
      moveObjectWithCollision(state.characterPivot, state.characterPivot.position);
      rebuildCharacterTargets();
    }

    async function loadGltfFromChunks(asset, label) {
      setStatus(`正在从分片还原${label}...`);
      const manifestResponse = await fetch(asset.manifest);
      if (!manifestResponse.ok) {
        throw new Error(`${label}分片清单加载失败：${manifestResponse.status}`);
      }

      const manifest = await manifestResponse.json();
      const baseUrl = new URL(asset.manifest, window.location.href);
      const blobs = [];
      let totalSize = 0;

      for (let index = 0; index < manifest.chunks.length; index += 1) {
        const chunk = manifest.chunks[index];
        setStatus(`正在加载${label}分片 ${index + 1}/${manifest.chunks.length}...`);
        const chunkUrl = new URL(chunk.file, baseUrl);
        const response = await fetch(chunkUrl);
        if (!response.ok) {
          throw new Error(`${label}分片 ${index + 1} 加载失败：${response.status}`);
        }
        const blob = await response.blob();
        if (chunk.size && blob.size !== chunk.size) {
          throw new Error(`${label}分片 ${index + 1} 大小不一致`);
        }
        blobs.push(blob);
        totalSize += blob.size;
      }

      if (manifest.size && totalSize !== manifest.size) {
        throw new Error(`${label}总大小不一致`);
      }

      setStatus(`正在解析完整${label}...`);
      const objectUrl = URL.createObjectURL(new Blob(blobs, {
        type: manifest.mime || 'model/gltf-binary'
      }));
      try {
        return await state.loader.loadAsync(objectUrl);
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    }

    async function loadEnvironmentGltf() {
      const forceDirect = IS_LOCAL_PREVIEW && new URLSearchParams(window.location.search).has('env_direct');
      if (ASSETS.environment.url && forceDirect) {
        try {
          return await state.loader.loadAsync(ASSETS.environment.url);
        } catch (error) {
          console.warn('[world] direct environment load failed, falling back to chunks:', error);
        }
      }
      return loadGltfFromChunks(ASSETS.environment, '完整树环境');
    }

    async function loadEnvironment() {
      setStatus('正在加载完整树环境...');
      const gltf = await loadEnvironmentGltf();
      const environment = gltf.scene;
      environment.name = 'EnvironmentTreesGLB';
      makeModelRenderable(environment);
      fitObject(environment, { targetWidth: ENVIRONMENT_TARGET_WIDTH });
      state.scene.add(environment);
      state.environment = environment;
      focusFullScene();
      setStatus('完整树环境已加载：角色可拖动，点击角色可 AI 对话');
      return environment;
    }

    async function loadCharacter() {
      const gltf = await state.loader.loadAsync(ASSETS.character);
      const character = gltf.scene;
      installCharacter(character, 'InuyashaGLB');
      if (gltf.animations && gltf.animations.length) {
        state.characterMixer = new THREE.AnimationMixer(character);
        state.characterMixer.clipAction(gltf.animations[0]).play();
      }
      setStatus('犬夜叉已加载：完整树环境继续加载中，拖动角色，点击角色对话');
    }

    function pointerFromEvent(event) {
      const rect = canvas.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    }

    function hitCharacter(event) {
      pointerFromEvent(event);
      raycaster.setFromCamera(pointer, state.camera);
      return raycaster.intersectObjects(state.characterHitTargets, true);
    }

    function hitDroppedModel(event) {
      pointerFromEvent(event);
      raycaster.setFromCamera(pointer, state.camera);
      return raycaster.intersectObjects(state.droppedModelHitTargets, true);
    }

    function getDroppedHit(event) {
      const hits = hitDroppedModel(event);
      if (!hits.length) return null;
      const key = getModelKeyFromObject(hits[0].object);
      const entry = state.droppedModels.get(key);
      return entry ? { key, entry, object: entry.object } : null;
    }

    function getGroundPoint(event) {
      pointerFromEvent(event);
      raycaster.setFromCamera(pointer, state.camera);
      raycaster.ray.intersectPlane(dragPlane, dragPoint);
      return dragPoint;
    }

    function addMessage(text, user) {
      const bubble = document.createElement('div');
      bubble.className = 'msg' + (user ? ' user' : '');
      bubble.textContent = text;
      messages.appendChild(bubble);
      messages.scrollTop = messages.scrollHeight;
    }

    function openChat() {
      chat.hidden = false;
      chatState.textContent = '在线';
      setStatus('已打开犬夜叉 AI 对话');
      if (!state.chatOpenedOnce) {
        addMessage('我在这里。', false);
        state.chatOpenedOnce = true;
      }
      requestAnimationFrame(() => chatInput.focus());
    }

    function closeChatPanel() {
      chat.hidden = true;
      chatState.textContent = '待机';
      setStatus('拖动角色，点击角色对话');
    }

    async function sendToAI(message) {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 28000);

      try {
        const response = await fetch(WORLD_CHAT_API_URL, {
          method: 'POST',
          signal: controller.signal,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ character: '犬夜叉', message })
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data.error || 'AI 接口暂时不可用');
        }
        return data.reply || data.message || '我听见了。';
      } catch (error) {
        if (error.name === 'AbortError') {
          return 'AI 后端响应超时了，稍后再试一次。';
        }
        return 'AI 对话接口暂时没连上，但角色点击入口已经正常。';
      } finally {
        window.clearTimeout(timeout);
      }
    }

    function setChatSending(sending) {
      state.chatSending = sending;
      chatInput.disabled = sending;
      chatSubmit.disabled = sending;
      chatInput.placeholder = sending ? '等待回复中...' : '输入一句话';
    }

    function createDroppedPlaceholder(key, type, modelName, position) {
      const clampedPosition = clampToWorldBounds(position);
      clearDroppedModel(key);
      const material = new THREE.MeshStandardMaterial({
        color: type === 'stone' ? 0x97a9b7 : 0x9be8ef,
        roughness: 0.5,
        metalness: type === 'stone' ? 0.06 : 0.22,
        emissive: type === 'stone' ? 0x0 : 0x103642,
        emissiveIntensity: type === 'stone' ? 0 : 0.18
      });
      const geometry = type === 'stone'
        ? new THREE.DodecahedronGeometry(0.72, 0)
        : new THREE.OctahedronGeometry(0.82, 0);
      const mesh = new THREE.Mesh(geometry, material);
      mesh.name = 'DroppedPlaceholder';
      mesh.userData.droppedModelKey = key;
      mesh.position.set(clampedPosition.x, 0.82, clampedPosition.z);
      setCollisionRadius(mesh, DEFAULT_MODEL_COLLISION_RADIUS);
      moveObjectWithCollision(mesh, clampedPosition);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      state.scene.add(mesh);
      state.droppedModels.set(key, {
        key,
        name: modelName || (type === 'stone' ? '占位石块' : '占位水晶'),
        object: mesh
      });
      rebuildDroppedModelTargets();
      updateModelEditor(key);
      setStatus('已把右侧占位模型拖入 3D 世界，可拖动，可取消');
    }

    async function loadDroppedModelGltf(modelAsset, modelName) {
      if (typeof modelAsset === 'string') {
        return state.loader.loadAsync(modelAsset);
      }
      if (modelAsset?.manifest) {
        return loadGltfFromChunks(modelAsset, modelName);
      }
      return state.loader.loadAsync(modelAsset.url);
    }

    async function createDroppedModel(key, modelAsset, modelName, position) {
      const clampedPosition = clampToWorldBounds(position);
      clearDroppedModel(key);
      setStatus(`正在加载${modelName}...`);
      try {
        const gltf = await loadDroppedModelGltf(modelAsset, modelName);
        const model = gltf.scene;
        model.name = `DroppedModel_${modelName}`;
        model.userData.droppedModelKey = key;
        makeModelRenderable(model);
        fitObject(model, { targetHeight: 2.2 });
        model.scale.multiplyScalar(DROPPED_MODEL_SCALE_MULTIPLIERS[key] || 1);
        setCollisionRadius(model, DEFAULT_MODEL_COLLISION_RADIUS);
        moveObjectWithCollision(model, {
          x: model.position.x + clampedPosition.x,
          z: model.position.z + clampedPosition.z
        });
        state.scene.add(model);
        state.droppedModels.set(key, { key, name: modelName, object: model });
        rebuildDroppedModelTargets();
        updateModelEditor(key);
        setStatus(`${modelName}已放入 3D 世界，可拖动，可取消`);
      } catch (error) {
        console.warn('[world] dropped model load failed:', error);
        setStatus(`${modelName}加载失败，已放入占位模型`);
        createDroppedPlaceholder(key, 'crystal', modelName, clampedPosition);
      }
    }

    function clampToWorldBounds(position) {
      return {
        x: THREE.MathUtils.clamp(position.x, WORLD_BOUNDS.minX, WORLD_BOUNDS.maxX),
        z: THREE.MathUtils.clamp(position.z, WORLD_BOUNDS.minZ, WORLD_BOUNDS.maxZ)
      };
    }

    function setupEvents() {
      window.addEventListener('resize', resizeRenderer);
      resetViewButton.addEventListener('click', resetCamera);
      cameraDefaultButton.addEventListener('click', resetCamera);
      lightDefaultButton.addEventListener('click', resetLightSettings);
      [backgroundColorInput, waterColorInput, ambientLightInput, sunLightInput, sunColorInput].forEach((input) => {
        input.addEventListener('input', () => {
          applyLightSettings();
          setStatus('灯光和背景已调整');
        });
      });
      [cameraXInput, cameraYInput, cameraZInput].forEach((input) => {
        input.addEventListener('input', () => {
          if (state.syncingCameraPanel) return;
          applyCameraSettings();
          setStatus('摄像机位置已调整');
        });
      });
      closeChat.addEventListener('click', closeChatPanel);

      canvas.addEventListener('pointermove', (event) => {
        if (state.dragging) {
          const point = getGroundPoint(event);
          const nextPosition = clampToWorldBounds({
            x: point.x + dragOffset.x,
            z: point.z + dragOffset.z
          });
          if (state.dragSubject) {
            moveObjectWithCollision(state.dragSubject, nextPosition);
            if (state.dragSubjectType === 'dropped') {
              updateModelEditor(state.dragSubjectKey);
            }
          }
          if (state.dragStart.distanceTo(new THREE.Vector2(event.clientX, event.clientY)) > 4) {
            state.dragMoved = true;
          }
          return;
        }

        const droppedHit = getDroppedHit(event);
        state.hoveredDroppedModelKey = droppedHit?.key || '';
        state.characterHover = !droppedHit && hitCharacter(event).length > 0;
        canvas.classList.toggle('is-character-hover', state.characterHover || Boolean(droppedHit));
      });

      canvas.addEventListener('pointerdown', (event) => {
        const droppedHit = getDroppedHit(event);
        const characterHits = droppedHit ? [] : hitCharacter(event);
        if (!droppedHit && !characterHits.length) return;

        state.dragSubject = droppedHit ? droppedHit.object : state.characterPivot;
        state.dragSubjectType = droppedHit ? 'dropped' : 'character';
        state.dragSubjectKey = droppedHit?.key || '';

        const point = getGroundPoint(event);
        dragOffset.set(
          state.dragSubject.position.x - point.x,
          0,
          state.dragSubject.position.z - point.z
        );
        state.dragging = true;
        state.dragMoved = false;
        state.dragStart.set(event.clientX, event.clientY);
        canvas.classList.add('is-dragging');
        state.controls.enabled = false;
        canvas.setPointerCapture(event.pointerId);
      });

      canvas.addEventListener('pointerup', (event) => {
        if (!state.dragging) return;
        state.dragging = false;
        canvas.classList.remove('is-dragging');
        state.controls.enabled = true;
        try {
          canvas.releasePointerCapture(event.pointerId);
        } catch {}

        if (!state.dragMoved && state.dragSubject === state.characterPivot) {
          openChat();
        } else if (state.dragSubjectType === 'dropped') {
          const entry = state.droppedModels.get(state.dragSubjectKey);
          if (entry) updateModelEditor(state.dragSubjectKey);
          setStatus(`${entry?.name || '模型'}已移动，可继续拖动或取消`);
        } else {
          setStatus('角色已移动：点击角色可打开 AI 对话');
        }
        state.dragSubject = null;
        state.dragSubjectType = '';
        state.dragSubjectKey = '';
      });

      canvas.addEventListener('pointerleave', () => {
        if (state.dragging) return;
        state.characterHover = false;
        state.hoveredDroppedModelKey = '';
        canvas.classList.remove('is-character-hover');
      });

      chatForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (state.chatSending) return;
        const text = chatInput.value.trim();
        if (!text) return;
        chatInput.value = '';
        addMessage(text, true);
        chatState.textContent = '思考中';
        setChatSending(true);
        try {
          const reply = await sendToAI(text);
          addMessage(reply, false);
        } finally {
          setChatSending(false);
          chatState.textContent = '在线';
          chatInput.focus();
        }
      });

      document.querySelectorAll('[data-dummy-model], [data-model-url], [data-model-manifest]').forEach((card) => {
        card.addEventListener('dragstart', (event) => {
          if (event.target instanceof Element && event.target.closest('[data-model-editor], [data-clear-model]')) {
            event.preventDefault();
            return;
          }
          const payload = {
            key: card.dataset.modelKey,
            type: card.dataset.modelUrl || card.dataset.modelManifest ? 'model' : 'placeholder',
            placeholder: card.dataset.dummyModel || 'crystal',
            url: card.dataset.modelUrl || '',
            manifest: card.dataset.modelManifest || '',
            name: card.dataset.modelName || card.querySelector('strong')?.textContent || '模型'
          };
          event.dataTransfer.setData('application/json', JSON.stringify(payload));
          event.dataTransfer.setData('text/plain', payload.placeholder);
          event.dataTransfer.effectAllowed = 'copy';
        });

        card.querySelector('[data-clear-model]')?.addEventListener('click', (event) => {
          event.preventDefault();
          event.stopPropagation();
          clearDroppedModel(card.dataset.modelKey);
          setStatus(`已取消${card.dataset.modelName || '模型'}`);
        });

        ['x', 'y', 'z'].forEach((axis) => {
          card.querySelector(`[data-model-${axis}]`)?.addEventListener('input', (event) => {
            setDroppedModelAxis(card, axis, event.currentTarget.value);
          });
          card.querySelector(`[data-model-${axis}-number]`)?.addEventListener('input', (event) => {
            setDroppedModelAxis(card, axis, event.currentTarget.value);
          });
        });
      });

      dropzone.addEventListener('dragover', (event) => {
        event.preventDefault();
        dropzone.classList.add('dragover');
      });

      dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('dragover');
      });

      dropzone.addEventListener('drop', (event) => {
        event.preventDefault();
        dropzone.classList.remove('dragover');
        setStatus('把模型卡片拖到左侧 3D 世界里');
      });

      stage.addEventListener('dragover', (event) => {
        event.preventDefault();
      });

      stage.addEventListener('drop', (event) => {
        event.preventDefault();
        const point = getGroundPoint(event);
        const json = event.dataTransfer.getData('application/json');
        if (json) {
          try {
            const payload = JSON.parse(json);
            if (payload.type === 'model' && (payload.url || payload.manifest)) {
              createDroppedModel(
                payload.key,
                { url: payload.url || '', manifest: payload.manifest || '' },
                payload.name || '模型',
                point
              );
              return;
            }
            createDroppedPlaceholder(payload.key, payload.placeholder || 'crystal', payload.name || '模型', point);
            return;
          } catch (error) {
            console.warn('[world] drop payload parse failed:', error);
          }
        }
        const type = event.dataTransfer.getData('text/plain') || 'crystal';
        createDroppedPlaceholder(`placeholder-${type}`, type, '模型', point);
      });
    }

    function animate() {
      const delta = state.clock.getDelta();
      const elapsed = state.clock.elapsedTime;

      if (state.characterPivot && !state.dragging) {
        state.characterPivot.position.y = Math.sin(elapsed * 1.35) * 0.045;
      }

      if (state.characterMixer) {
        state.characterMixer.update(delta);
      }

      state.controls.update();
      syncCameraPanelFromCamera();
      state.renderer.render(state.scene, state.camera);

      if (!window.__worldBootState.firstFrame) {
        window.__worldBootState.firstFrame = true;
        hideLoader();
        setStatus('基础 3D 已显示，模型继续加载中...');
      }

      requestAnimationFrame(animate);
    }

    async function loadAssetsInBackground() {
      try {
        await loadCharacter();
      } catch (error) {
        console.warn('[world] character load failed:', error);
        setStatus('犬夜叉 GLB 加载失败，正在显示红色占位角色');
      }

      try {
        await loadEnvironment();
      } catch (error) {
        console.warn('[world] environment load failed:', error);
        setStatus('环境树加载失败，但基础 3D 和角色仍会显示：' + (error.message || error));
      }
    }

    async function init() {
      showLoader('正在检查 WebGL', '正在确认浏览器能创建 WebGL2 画布。');
      state.renderer = createRenderer();
      state.scene = new THREE.Scene();
      state.camera = new THREE.PerspectiveCamera(48, 1, 0.1, 500);
      state.loader = new GLTFLoader();
      state.characterPivot.name = 'DraggableCharacterPivot';
      exposeDebugState();

      addBaseWorld();
      installCharacter(createFallbackCharacter(), 'FallbackCharacter');

      state.controls = new OrbitControls(state.camera, state.renderer.domElement);
      state.controls.enableDamping = true;
      state.controls.target.set(0, 1.8, 0);
      state.controls.minDistance = 1.2;
      state.controls.maxDistance = 110;
      state.controls.maxPolarAngle = Math.PI * 0.49;
      state.controls.addEventListener('change', syncCameraPanelFromCamera);

      resizeRenderer();
      resetCamera();
      updateAllModelEditors();
      setupEvents();
      animate();
      loadAssetsInBackground();
    }

    init().catch(showFatal);
  

