// WebGL Noise Shader (simplex noise implementation)
const webglNoiseShader = `
vec3 mod289(vec3 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 mod289(vec4 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 permute(vec4 x) {
  return mod289(((x*34.0)+10.0)*x);
}

vec4 taylorInvSqrt(vec4 r) {
  return 1.79284291400159 - 0.85373472095314 * r;
}

float snoise(vec3 v) {
  const vec2  C = vec2(1.0/6.0, 1.0/3.0);
  const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);

  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);

  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;

  i = mod289(i);
  vec4 p = permute(permute(permute(
            i.z + vec4(0.0, i1.z, i2.z, 1.0))
          + i.y + vec4(0.0, i1.y, i2.y, 1.0))
          + i.x + vec4(0.0, i1.x, i2.x, 1.0));

  float n_ = 0.142857142857;
  vec3  ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);

  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);

  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;

  vec3 p0 = vec3(a0.xy,h.x);
  vec3 p1 = vec3(a0.zw,h.y);
  vec3 p2 = vec3(a1.xy,h.z);
  vec3 p3 = vec3(a1.zw,h.w);

  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  vec4 m = max(0.5 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 105.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}
`;

class Molecule extends THREE.Object3D {
    constructor() {
        super();
        this.material;
        this.geometry;
        this.mesh;
        this.radius = 1.5;
        this.detail = 40;
        this.particleSizeMin = 0.01;
        this.particleSizeMax = 0.08;
        
        this.build();
    }

    build() {
        this.geometry = new THREE.IcosahedronBufferGeometry(1, this.detail);
        this.material = new THREE.PointsMaterial({
            map: this.dot(),
            blending: THREE.AdditiveBlending,
            color: 0x101A88,
            depthTest: false
        });

        this.setupShader(this.material);
        this.mesh = new THREE.Points(this.geometry, this.material);
        this.add(this.mesh);
    }
    
    dot(size = 32, color = "#FFFFFF") {
        const sizeH = size * 0.5;
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = size;
        const ctx = canvas.getContext('2d');
        const circle = new Path2D();
        circle.arc(sizeH, sizeH, sizeH, 0, 2 * Math.PI);
        ctx.fillStyle = color;
        ctx.fill(circle);
        return new THREE.CanvasTexture(canvas);
    }

    setupShader(material) {
        material.onBeforeCompile = (shader) => {
            shader.uniforms.time = { value: 0 };
            shader.uniforms.radius = { value: this.radius };
            shader.uniforms.particleSizeMin = { value: this.particleSizeMin };
            shader.uniforms.particleSizeMax = { value: this.particleSizeMax };
            shader.vertexShader = 'uniform float particleSizeMax;\n' + shader.vertexShader;
            shader.vertexShader = 'uniform float particleSizeMin;\n' + shader.vertexShader;
            shader.vertexShader = 'uniform float radius;\n' + shader.vertexShader;
            shader.vertexShader = 'uniform float time;\n' + shader.vertexShader;
            shader.vertexShader = webglNoiseShader + "\n" + shader.vertexShader;
            shader.vertexShader = shader.vertexShader.replace(
                '#include <begin_vertex>',
                `
                    vec3 p = position;
                    float n = snoise(vec3(p.x*.6 + time*0.2, p.y*0.4 + time*0.3, p.z*.2 + time*0.2));
                    p += n * 0.4;

                    float l = radius / length(p);
                    p *= l;
                    float s = mix(particleSizeMin, particleSizeMax, n);
                    vec3 transformed = vec3(p.x, p.y, p.z);
                `
            );
            shader.vertexShader = shader.vertexShader.replace(
                'gl_PointSize = size;',
                'gl_PointSize = s;'
            );
            material.userData.shader = shader;
        };
    }

    animate(time) {
        this.mesh.rotation.set(0, time * 0.2, 0);
        if (this.material.userData.shader) {
            this.material.userData.shader.uniforms.time.value = time;
        }
    }
}

class World {
    constructor() {
        this.renderer;
        this.scene;
        this.camera;
        this.molecule;
        this.container = document.getElementById('canvas-container');
        
        this.build();
        window.addEventListener('resize', this.resize.bind(this));
        this.animate = this.animate.bind(this);
        this.animate();
    }

    build() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(
            75,
            this.container.clientWidth / this.container.clientHeight,
            0.1,
            1000
        );
        this.camera.position.z = 3;

        this.renderer = new THREE.WebGLRenderer({
            alpha: true,
            antialias: true
        });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.container.appendChild(this.renderer.domElement);
        
        this.molecule = new Molecule();
        this.scene.add(this.molecule);
    }

    resize() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    animate() {
        requestAnimationFrame(this.animate);
        const time = performance.now() * 0.001;
        this.molecule.animate(time);
        this.renderer.render(this.scene, this.camera);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new World();
});
