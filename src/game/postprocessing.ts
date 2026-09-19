import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

export const MotionBlurTunnelShader = {
  name: 'MotionBlurTunnelShader',
  uniforms: {
    tDiffuse: { value: null },
    uCenter: { value: new THREE.Vector2(0.5, 0.46) },
    uIntensity: { value: 0.0 },           // 0.0 = none, 1.0 = max radial motion blur
    uTunnelVision: { value: 0.0 },        // 0.0 to 1.0 peripheral vignette & focus tunnel
    uChromaticAberration: { value: 0.0 }, // 0.0 to 1.0 RGB optical split
    uTime: { value: 0.0 },
    uAspect: { value: 16 / 9 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform vec2 uCenter;
    uniform float uIntensity;
    uniform float uTunnelVision;
    uniform float uChromaticAberration;
    uniform float uTime;
    uniform float uAspect;

    varying vec2 vUv;

    // Fast PRNG for subtle jitter to eliminate banding
    float rand(vec2 n) {
      return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453);
    }

    void main() {
      // Direct pass-through when inactive to conserve GPU fill rate
      if (uIntensity < 0.005 && uTunnelVision < 0.005) {
        gl_FragColor = texture2D(tDiffuse, vUv);
        return;
      }

      vec2 dir = vUv - uCenter;
      vec2 aspectDir = vec2(dir.x * uAspect, dir.y);
      float dist = length(aspectDir);

      // 1. Radial Motion Blur
      // Blur increases non-linearly outward from vanishing point
      float radialFactor = pow(clamp(dist * 1.4, 0.0, 1.8), 1.35);
      float blurStrength = uIntensity * 0.038 * radialFactor;

      float jitter = (rand(vUv + vec2(uTime * 0.08, 0.0)) - 0.5) * 0.2;
      vec2 stepVec = (dir / 10.0) * blurStrength;

      vec4 accum = vec4(0.0);
      float totalWeight = 0.0;

      // 10 multi-tap radial samples with linear falloff
      const int SAMPLES = 10;
      for (int i = 0; i < SAMPLES; i++) {
        float f = float(i) + jitter;
        float weight = 1.0 - (float(i) / float(SAMPLES)) * 0.5;
        vec2 sampleUv = vUv - stepVec * f;

        // Radial Chromatic Aberration during heavy nitro bursts
        if (uChromaticAberration > 0.02 && i > 1) {
          float caOffset = uChromaticAberration * 0.016 * dist * (float(i) / float(SAMPLES));
          vec2 rUv = clamp(sampleUv + dir * caOffset, 0.0, 1.0);
          vec2 gUv = clamp(sampleUv, 0.0, 1.0);
          vec2 bUv = clamp(sampleUv - dir * caOffset, 0.0, 1.0);

          float r = texture2D(tDiffuse, rUv).r;
          float g = texture2D(tDiffuse, gUv).g;
          float b = texture2D(tDiffuse, bUv).b;
          accum += vec4(r, g, b, 1.0) * weight;
        } else {
          vec2 clampedUv = clamp(sampleUv, 0.0, 1.0);
          accum += texture2D(tDiffuse, clampedUv) * weight;
        }

        totalWeight += weight;
      }

      vec4 finalColor = accum / totalWeight;

      // 2. High-Speed Cyber Warp Streaks (peripheral radial speed rays)
      if (uIntensity > 0.18) {
        float angle = atan(aspectDir.y, aspectDir.x);
        float streak1 = sin(angle * 32.0 + uTime * 22.0);
        float streak2 = cos(angle * 48.0 - uTime * 17.0);
        float streakVal = smoothstep(0.70, 0.98, streak1 * streak2);
        float streakAlpha = streakVal * uIntensity * pow(clamp(dist * 0.9, 0.0, 1.0), 2.2) * 0.42;

        // Electric cyan to neon indigo speed streaks
        vec3 streakColor = mix(vec3(0.0, 0.94, 1.0), vec3(0.3, 0.6, 1.0), sin(uTime * 4.0) * 0.5 + 0.5);
        finalColor.rgb += streakColor * streakAlpha;
      }

      // 3. Tunnel Vision Vignette & Peripheral Occlusion
      // Focuses driver perception on the apex of the road ahead
      if (uTunnelVision > 0.01) {
        float innerRadius = mix(0.92, 0.36, uTunnelVision);
        float outerRadius = mix(1.38, 0.82, uTunnelVision);
        float vignette = 1.0 - smoothstep(innerRadius, outerRadius, dist);

        // Cyberpunk peripheral dusk tone
        vec3 edgeTint = vec3(0.01, 0.04, 0.10);
        finalColor.rgb = mix(finalColor.rgb * edgeTint * 2.2, finalColor.rgb, vignette);

        // Deepen peripheral darkness
        finalColor.rgb *= mix(1.0, vignette, uTunnelVision * 0.85);
      }

      gl_FragColor = finalColor;
    }
  `,
};

export class PostProcessingSystem {
  composer: EffectComposer;
  renderPass: RenderPass;
  motionBlurPass: ShaderPass;
  outputPass: OutputPass;

  private currentIntensity: number = 0;
  private targetIntensity: number = 0;
  private currentTunnel: number = 0;
  private targetTunnel: number = 0;
  private currentCA: number = 0;
  private targetCA: number = 0;

  enabled: boolean = true;

  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera,
    width: number,
    height: number
  ) {
    const renderTarget = new THREE.WebGLRenderTarget(width, height, {
      type: THREE.HalfFloatType,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      stencilBuffer: false,
      depthBuffer: true,
    });

    this.composer = new EffectComposer(renderer, renderTarget);

    this.renderPass = new RenderPass(scene, camera);
    this.composer.addPass(this.renderPass);

    this.motionBlurPass = new ShaderPass(MotionBlurTunnelShader);
    this.motionBlurPass.uniforms.uAspect.value = width / height;
    this.composer.addPass(this.motionBlurPass);

    this.outputPass = new OutputPass();
    this.composer.addPass(this.outputPass);
  }

  setSize(width: number, height: number) {
    this.composer.setSize(width, height);
    if (this.motionBlurPass) {
      this.motionBlurPass.uniforms.uAspect.value = width / height;
    }
  }

  /**
   * Update motion blur, tunnel vision and chromatic aberration
   * @param speedKmH Current vehicle speed in km/h
   * @param isNitro Whether nitro is currently active
   * @param delta Frame delta in seconds
   * @param screenFocus 2D screen-space vanishing point (0..1, 0..1)
   */
  update(
    speedKmH: number,
    isNitro: boolean,
    delta: number,
    screenFocus: THREE.Vector2 = new THREE.Vector2(0.5, 0.46)
  ) {
    const dt = Math.min(delta, 0.05);

    // Speed contribution: kicks in above 120 km/h, maxes at 260 km/h
    const speedRatio = Math.min(1.0, Math.max(0.0, (speedKmH - 120) / 140));

    if (isNitro) {
      // Instant adrenaline surge on nitro engagement
      this.targetIntensity = 0.85 + speedRatio * 0.15; // 0.85 - 1.0
      this.targetTunnel = 0.72 + speedRatio * 0.28;    // 0.72 - 1.0
      this.targetCA = 0.85 + speedRatio * 0.15;        // 0.85 - 1.0
    } else {
      // Natural speed blur when speeding without nitro
      this.targetIntensity = speedRatio * 0.40;
      this.targetTunnel = speedRatio * 0.30;
      this.targetCA = speedRatio * 0.25;
    }

    // Fast attack rate on nitro/acceleration, smooth natural dissipation on deceleration
    const attackRate = isNitro ? 16.0 : 8.0;
    const decayRate = 6.0;

    const rate = this.targetIntensity > this.currentIntensity ? attackRate : decayRate;
    this.currentIntensity = THREE.MathUtils.lerp(this.currentIntensity, this.targetIntensity, rate * dt);
    this.currentTunnel = THREE.MathUtils.lerp(this.currentTunnel, this.targetTunnel, rate * dt);
    this.currentCA = THREE.MathUtils.lerp(this.currentCA, this.targetCA, rate * dt);

    // Update uniform values
    const uniforms = this.motionBlurPass.uniforms;
    uniforms.uIntensity.value = this.currentIntensity;
    uniforms.uTunnelVision.value = this.currentTunnel;
    uniforms.uChromaticAberration.value = this.currentCA;
    uniforms.uCenter.value.lerp(screenFocus, 10.0 * dt);
    uniforms.uTime.value += delta;
  }

  render(delta: number, camera?: THREE.Camera) {
    if (camera) {
      this.renderPass.camera = camera;
    }
    this.composer.render(delta);
  }

  dispose() {
    this.composer.renderTarget1?.dispose();
    this.composer.renderTarget2?.dispose();
  }
}
