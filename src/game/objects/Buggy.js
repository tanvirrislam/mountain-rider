import Phaser from 'phaser';
import { PHYSICS, DEPTH } from '../utils/constants';
import { getOrCreateCanvasTexture } from '../utils/scenery';

export default class Buggy {
  constructor(scene, x, y) {
    this.scene = scene;

    const chassisW = 120;
    const chassisH = 24;
    const wheelRadius = 22;
    const wheelOffsetX = 50;
    const wheelOffsetY = 18;

    // Chassis Physics
    this.chassis = scene.matter.add.rectangle(x, y, chassisW, chassisH, {
      mass: PHYSICS.BUGGY.MASS,
      friction: PHYSICS.BUGGY.FRICTION,
      restitution: PHYSICS.BUGGY.RESTITUTION,
      chamfer: { radius: 10 },
      label: 'chassis',
      plugin: {}
    });

    // Lower center of mass for strong stability on hills and jumps
    scene.matter.body.setCentre(this.chassis, { x: 0, y: 7 }, true);

    // Wheels Physics
    const wheelOpts = {
      mass: PHYSICS.WHEEL.MASS,
      friction: PHYSICS.WHEEL.FRICTION,
      restitution: PHYSICS.WHEEL.RESTITUTION,
      density: PHYSICS.WHEEL.DENSITY,
      label: 'wheel'
    };
    this.wheelA = scene.matter.add.circle(x - wheelOffsetX, y + wheelOffsetY, wheelRadius, wheelOpts);
    this.wheelB = scene.matter.add.circle(x + wheelOffsetX, y + wheelOffsetY, wheelRadius, wheelOpts);

    // Suspension Physics
    const stiff = PHYSICS.SUSPENSION.STIFFNESS;
    const damp = PHYSICS.SUSPENSION.DAMPING;
    const len = PHYSICS.SUSPENSION.LENGTH;

    this.constraintA = scene.matter.add.constraint(this.chassis, this.wheelA, len, stiff, {
      pointA: { x: -wheelOffsetX, y: wheelOffsetY },
      damping: damp,
      render: { visible: false }
    });
    this.constraintB = scene.matter.add.constraint(this.chassis, this.wheelB, len, stiff, {
      pointA: { x: wheelOffsetX, y: wheelOffsetY },
      damping: damp,
      render: { visible: false }
    });

    // ── Visuals ──
    this.suspensionGfx = scene.add.graphics();
    this.suspensionGfx.setDepth(DEPTH.BUGGY - 1);
    this.wheelOffsetX = wheelOffsetX;
    this.wheelOffsetY = wheelOffsetY;

    this.chassisSprite = this.createChassisTexture(scene, chassisW, chassisH);
    this.chassisSprite.setDepth(DEPTH.BUGGY);

    this.wheelASprite = this.createWheelTexture(scene, wheelRadius);
    this.wheelBSprite = this.createWheelTexture(scene, wheelRadius);
    this.wheelASprite.setDepth(DEPTH.BUGGY + 1);
    this.wheelBSprite.setDepth(DEPTH.BUGGY + 1);

    // Input
    this.cursors = scene.input.keyboard.createCursorKeys();
    this.keys = scene.input.keyboard.addKeys('W,A,S,D');

    // State
    this.upsideDownTimer = 0;
    this.isAccelerating = false;
  }

  /**
   * Renders a photorealistic 3D-shaded off-road mountain buggy chassis
   * with automotive metallic paint, brushed aluminum skid plate, cockpit driver,
   * tubular steel roll cage, and rear twin-cam engine.
   */
  createChassisTexture(scene, w, h) {
    const texW = 190;
    const texH = 110;
    const cx = 100; // Chassis physics center X on canvas
    const cy = 68;  // Chassis physics center Y on canvas
    const key = 'buggy-chassis-ultra-v3';

    getOrCreateCanvasTexture(scene, key, texW, texH, (ctx) => {
      ctx.save();
      ctx.translate(cx, cy);

      // 1. Soft undercarriage drop shadow
      const underShd = ctx.createRadialGradient(0, 14, 6, 0, 14, w * 0.62);
      underShd.addColorStop(0, 'rgba(0, 0, 0, 0.55)');
      underShd.addColorStop(0.7, 'rgba(0, 0, 0, 0.22)');
      underShd.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = underShd;
      ctx.fillRect(-w / 2 - 18, 2, w + 36, 24);

      // 2. Rear Exposed Engine Block, Cooling Fins & Heat-Blued Chrome Exhaust
      const engGrd = ctx.createLinearGradient(-w / 2 - 18, -h / 2 - 10, -w / 2 + 6, h / 2);
      engGrd.addColorStop(0, '#6e767e');
      engGrd.addColorStop(0.5, '#3b4046');
      engGrd.addColorStop(1, '#1c1f22');
      ctx.fillStyle = engGrd;
      ctx.beginPath();
      ctx.roundRect(-w / 2 - 15, -h / 2 - 8, 26, 22, 4);
      ctx.fill();

      // Cooling fins & cylinder head detail
      ctx.strokeStyle = '#141618';
      ctx.lineWidth = 1.4;
      for (let fy = -h / 2 - 4; fy <= -h / 2 + 10; fy += 3.5) {
        ctx.beginPath();
        ctx.moveTo(-w / 2 - 13, fy);
        ctx.lineTo(-w / 2 + 6, fy);
        ctx.stroke();
      }

      // Twin chrome exhaust pipes with heat-bluing tip
      const exhGrd = ctx.createLinearGradient(-w / 2 - 24, -h / 2, -w / 2 - 8, -h / 2 + 8);
      exhGrd.addColorStop(0, '#4a628a');
      exhGrd.addColorStop(0.35, '#c8cfd6');
      exhGrd.addColorStop(0.75, '#7c848c');
      exhGrd.addColorStop(1, '#2b2f33');
      ctx.fillStyle = exhGrd;
      ctx.beginPath();
      ctx.roundRect(-w / 2 - 23, -h / 2 + 1, 14, 6.5, 2.5);
      ctx.fill();
      ctx.fillStyle = '#111315';
      ctx.beginPath();
      ctx.arc(-w / 2 - 21, -h / 2 + 4.2, 2.2, 0, Math.PI * 2);
      ctx.fill();

      // 3. Cockpit Interior, Racing Seat & Driver with Helmet
      const cabStartX = -15;
      const cabWidth = 55;
      const cabHeight = 30;
      const cabY = -h / 2;

      // Dark cockpit interior cavity
      ctx.fillStyle = '#14171a';
      ctx.beginPath();
      ctx.moveTo(cabStartX + 3, cabY);
      ctx.lineTo(cabStartX + 8, cabY - cabHeight + 3);
      ctx.lineTo(cabStartX + cabWidth - 16, cabY - cabHeight + 3);
      ctx.lineTo(cabStartX + cabWidth - 3, cabY);
      ctx.closePath();
      ctx.fill();

      // Driver racing bucket seat & helmeted silhouette
      ctx.fillStyle = '#262a2e';
      ctx.fillRect(cabStartX + 10, cabY - 18, 7, 17);
      ctx.fillStyle = '#1e242b';
      ctx.beginPath();
      ctx.ellipse(cabStartX + 19, cabY - 6, 7, 9, 0.2, 0, Math.PI * 2);
      ctx.fill();

      const helmGrd = ctx.createRadialGradient(cabStartX + 19, cabY - 20, 1, cabStartX + 20, cabY - 18, 7);
      helmGrd.addColorStop(0, '#ffffff');
      helmGrd.addColorStop(0.7, '#d0d5da');
      helmGrd.addColorStop(1, '#7a828a');
      ctx.fillStyle = helmGrd;
      ctx.beginPath();
      ctx.arc(cabStartX + 20, cabY - 18, 6.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#11161b';
      ctx.beginPath();
      ctx.ellipse(cabStartX + 23.5, cabY - 17.5, 3.2, 2.2, 0.1, 0, Math.PI * 2);
      ctx.fill();

      // 4. Tinted Polycarbonate Windshield with Sky Reflection
      const winGrd = ctx.createLinearGradient(0, cabY - cabHeight, 0, cabY);
      winGrd.addColorStop(0, 'rgba(165, 212, 245, 0.62)');
      winGrd.addColorStop(0.45, 'rgba(62, 98, 128, 0.45)');
      winGrd.addColorStop(1, 'rgba(24, 38, 48, 0.68)');
      ctx.fillStyle = winGrd;
      ctx.beginPath();
      ctx.moveTo(cabStartX + 6, cabY - 1);
      ctx.lineTo(cabStartX + 10, cabY - cabHeight + 4);
      ctx.lineTo(cabStartX + cabWidth - 18, cabY - cabHeight + 4);
      ctx.lineTo(cabStartX + cabWidth - 5, cabY - 1);
      ctx.closePath();
      ctx.fill();

      // Windshield specular glare streak
      ctx.fillStyle = 'rgba(255, 255, 255, 0.34)';
      ctx.beginPath();
      ctx.moveTo(cabStartX + cabWidth - 21, cabY - cabHeight + 4);
      ctx.lineTo(cabStartX + cabWidth - 25, cabY - cabHeight + 4);
      ctx.lineTo(cabStartX + cabWidth - 11, cabY - 1);
      ctx.lineTo(cabStartX + cabWidth - 7, cabY - 1);
      ctx.closePath();
      ctx.fill();

      // 5. 3D Chromoly Tubular Roll Cage
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      const drawTube = (x1, y1, x2, y2, width = 4.5) => {
        ctx.strokeStyle = '#16191c';
        ctx.lineWidth = width;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        ctx.strokeStyle = '#7c858e';
        ctx.lineWidth = width * 0.32;
        ctx.beginPath();
        ctx.moveTo(x1 - 0.5, y1 - 0.8);
        ctx.lineTo(x2 - 0.5, y2 - 0.8);
        ctx.stroke();
      };

      drawTube(cabStartX - 28, cabY, cabStartX - 14, cabY - 20, 4);
      drawTube(cabStartX, cabY, cabStartX - 14, cabY - 20, 4);
      drawTube(cabStartX - 14, cabY - 20, cabStartX + 6, cabY - cabHeight, 4);
      drawTube(cabStartX + 3, cabY, cabStartX + 7, cabY - cabHeight, 4.5);
      drawTube(cabStartX + 25, cabY, cabStartX + 24, cabY - cabHeight, 4);
      drawTube(cabStartX + cabWidth - 2, cabY, cabStartX + cabWidth - 16, cabY - cabHeight, 4.5);
      drawTube(cabStartX + 4, cabY - cabHeight, cabStartX + cabWidth - 14, cabY - cabHeight, 5);

      // 6. Automotive Metallic Clearcoat Main Chassis Body
      const bodyGrd = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
      bodyGrd.addColorStop(0.0, '#ff6659');
      bodyGrd.addColorStop(0.18, '#e53935');
      bodyGrd.addColorStop(0.55, '#b71c1c');
      bodyGrd.addColorStop(0.85, '#6e0e0e');
      bodyGrd.addColorStop(1.0, '#2b0909');
      ctx.fillStyle = bodyGrd;
      ctx.beginPath();
      ctx.roundRect(-w / 2, -h / 2, w, h, 8);
      ctx.fill();

      // Brushed aluminum lower skid-plate & rocker panel
      const skidGrd = ctx.createLinearGradient(-w / 2, h / 2 - 6, w / 2, h / 2);
      skidGrd.addColorStop(0, '#545b62');
      skidGrd.addColorStop(0.5, '#9aa2aa');
      skidGrd.addColorStop(1, '#34393e');
      ctx.fillStyle = skidGrd;
      ctx.beginPath();
      ctx.roundRect(-w / 2 + 8, h / 2 - 5, w - 16, 4.5, 2);
      ctx.fill();

      // Crisp metallic racing stripe & panel seams
      ctx.fillStyle = 'rgba(248, 250, 252, 0.9)';
      ctx.fillRect(-w / 2 + 8, -2.5, w - 16, 4);
      ctx.fillStyle = 'rgba(24, 26, 29, 0.85)';
      ctx.fillRect(-w / 2 + 8, -0.5, w - 16, 1.5);

      ctx.strokeStyle = 'rgba(40, 5, 5, 0.65)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-14, -h / 2 + 2);
      ctx.lineTo(-14, h / 2 - 4);
      ctx.moveTo(34, -h / 2 + 2);
      ctx.lineTo(34, h / 2 - 4);
      ctx.stroke();

      // 7. Heavy-Duty Tubular Front Bullbar
      drawTube(w / 2 - 5, 5, w / 2 + 10, 5, 4);
      drawTube(w / 2 + 10, 5, w / 2 + 15, -5, 4);
      drawTube(w / 2 + 15, -5, w / 2 + 8, -15, 4);
      drawTube(w / 2 + 8, -15, w / 2 - 5, -10, 4);

      // 8. Sculpted Mudguard Fenders over Wheel Wells
      for (const fx of [-50, 50]) {
        ctx.strokeStyle = '#121417';
        ctx.lineWidth = 7.5;
        ctx.beginPath();
        ctx.arc(fx, 18, 28, Math.PI, 0, false);
        ctx.stroke();

        ctx.strokeStyle = '#d32f2f';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.arc(fx, 18, 28.5, Math.PI + 0.15, -0.15, false);
        ctx.stroke();
      }

      // 9. Projector Halogen Headlight & LED Tail Light
      ctx.fillStyle = '#22262a';
      ctx.beginPath();
      ctx.roundRect(w / 2 - 4, -h / 2 - 4, 10, 12, 3);
      ctx.fill();

      const hlGrd = ctx.createRadialGradient(w / 2 + 3, -h / 2 + 2, 0.5, w / 2 + 2, -h / 2 + 2, 5);
      hlGrd.addColorStop(0, '#ffffff');
      hlGrd.addColorStop(0.5, '#fff3a8');
      hlGrd.addColorStop(1, 'rgba(255, 200, 60, 0)');
      ctx.fillStyle = hlGrd;
      ctx.beginPath();
      ctx.arc(w / 2 + 2.5, -h / 2 + 2, 5, 0, Math.PI * 2);
      ctx.fill();

      // LED Tail light
      ctx.fillStyle = '#181a1d';
      ctx.beginPath();
      ctx.roundRect(-w / 2 - 4, -h / 2 - 2, 6, 12, 2);
      ctx.fill();
      ctx.fillStyle = '#ff1744';
      ctx.beginPath();
      ctx.roundRect(-w / 2 - 2.5, -h / 2, 3.5, 8, 1.5);
      ctx.fill();

      ctx.restore();
    });

    const sprite = scene.add.image(0, 0, key);
    sprite.setOrigin(cx / texW, cy / texH);
    return sprite;
  }

  /**
   * Renders a photorealistic 3D-shaded off-road mud-terrain tire, drilled steel
   * brake rotor, red brake caliper, and machined 5-spoke alloy wheel.
   */
  createWheelTexture(scene, r) {
    const size = (r + 6) * 2;
    const key = `buggy-wheel-ultra-v3-${r}`;

    getOrCreateCanvasTexture(scene, key, size, size, (ctx, w, h) => {
      const cx = w / 2;
      const cy = h / 2;
      ctx.save();
      ctx.translate(cx, cy);

      // 1. Aggressive mud-terrain outer rubber tread blocks
      const lugs = 16;
      for (let i = 0; i < lugs; i++) {
        const ang = (i / lugs) * Math.PI * 2;
        ctx.save();
        ctx.rotate(ang);
        ctx.fillStyle = i % 2 === 0 ? '#141618' : '#1e2124';
        ctx.beginPath();
        ctx.roundRect(r - 4.5, -2.6, 5.2, 5.2, 1.2);
        ctx.fill();
        ctx.restore();
      }

      // 2. 3D toroidal rubber tire carcass
      const tireGrd = ctx.createRadialGradient(-r * 0.2, -r * 0.2, r * 0.45, 0, 0, r);
      tireGrd.addColorStop(0.0, '#3a3f45');
      tireGrd.addColorStop(0.68, '#222529');
      tireGrd.addColorStop(0.88, '#141618');
      tireGrd.addColorStop(1.0, '#0c0d0e');
      ctx.fillStyle = tireGrd;
      ctx.beginPath();
      ctx.arc(0, 0, r - 0.8, 0, Math.PI * 2);
      ctx.fill();

      // Molded sidewall rib rings
      ctx.strokeStyle = 'rgba(90, 98, 106, 0.35)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.77, 0, Math.PI * 2);
      ctx.stroke();

      // Dark wheel well cavity inside rim
      ctx.fillStyle = '#0f1113';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.62, 0, Math.PI * 2);
      ctx.fill();

      // 3. Drilled Steel Brake Rotor & Red Brake Caliper
      const rotorGrd = ctx.createLinearGradient(-r * 0.45, -r * 0.45, r * 0.45, r * 0.45);
      rotorGrd.addColorStop(0, '#9aa2aa');
      rotorGrd.addColorStop(0.5, '#5c636a');
      rotorGrd.addColorStop(1, '#828a92');
      ctx.fillStyle = rotorGrd;
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.46, 0, Math.PI * 2);
      ctx.fill();

      // Red performance brake caliper
      ctx.fillStyle = '#d32f2f';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.48, -0.8, 0.1);
      ctx.arc(0, 0, r * 0.30, 0.1, -0.8, true);
      ctx.closePath();
      ctx.fill();

      // 4. Machined 5-Twin-Spoke Metallic Alloy Rim
      const rimGrd = ctx.createLinearGradient(-r * 0.6, -r * 0.6, r * 0.6, r * 0.6);
      rimGrd.addColorStop(0.0, '#f1f5f9');
      rimGrd.addColorStop(0.45, '#949ca4');
      rimGrd.addColorStop(0.8, '#474d54');
      rimGrd.addColorStop(1.0, '#cbd2d9');

      ctx.strokeStyle = rimGrd;
      ctx.lineWidth = 2.8;
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.58, 0, Math.PI * 2);
      ctx.stroke();

      ctx.lineCap = 'round';
      for (let s = 0; s < 5; s++) {
        const ang = (s / 5) * Math.PI * 2 - Math.PI / 2;
        ctx.strokeStyle = rimGrd;
        ctx.lineWidth = 3.4;
        ctx.beginPath();
        ctx.moveTo(Math.cos(ang) * r * 0.16, Math.sin(ang) * r * 0.16);
        ctx.lineTo(Math.cos(ang) * r * 0.56, Math.sin(ang) * r * 0.56);
        ctx.stroke();
      }

      // 5. Anodized Red Center Hub & Chrome Lug Nuts
      ctx.fillStyle = '#b71c1c';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.21, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#e2e8f0';
      for (let s = 0; s < 5; s++) {
        const ang = (s / 5) * Math.PI * 2 - Math.PI / 2;
        ctx.beginPath();
        ctx.arc(Math.cos(ang) * r * 0.14, Math.sin(ang) * r * 0.14, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = '#181b1e';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.08, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    });

    return scene.add.image(0, 0, key);
  }

  /**
   * Draws realistic trailing-arm links, chrome damper shafts, and helical coilover springs.
   */
  drawSuspensionStruts() {
    const g = this.suspensionGfx;
    g.clear();

    const cos = Math.cos(this.chassis.angle);
    const sin = Math.sin(this.chassis.angle);
    const cx = this.chassis.position.x;
    const cy = this.chassis.position.y;

    const mounts = [
      { localX: -this.wheelOffsetX * 0.76, localY: 1, armX: -18, armY: 8, wheel: this.wheelA },
      { localX: this.wheelOffsetX * 0.76, localY: 1, armX: 18, armY: 8, wheel: this.wheelB },
    ];

    for (const m of mounts) {
      const mx = cx + m.localX * cos - m.localY * sin;
      const my = cy + m.localX * sin + m.localY * cos;
      const ax = cx + m.armX * cos - m.armY * sin;
      const ay = cy + m.armX * sin + m.armY * cos;
      const wx = m.wheel.position.x;
      const wy = m.wheel.position.y;

      // Heavy-duty steel lower control arm / trailing link
      g.lineStyle(4.5, 0x22262a, 1);
      g.lineBetween(ax, ay, wx, wy);
      g.lineStyle(1.5, 0x5c646c, 0.8);
      g.lineBetween(ax, ay - 1, wx, wy - 1);

      // Chrome telescopic shock shaft
      g.lineStyle(3.2, 0xcfd6dc, 1);
      g.lineBetween(mx, my, wx, wy);

      // Upper anodized shock body
      g.lineStyle(6, 0x2b3036, 1);
      g.lineBetween(mx, my, mx + (wx - mx) * 0.48, my + (wy - my) * 0.48);

      // Helical red coilover spring windings
      const dx = wx - mx;
      const dy = wy - my;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const nx = -dy / len;
      const ny = dx / len;

      g.lineStyle(2.2, 0xd32f2f, 0.95);
      g.beginPath();
      const coils = 5;
      for (let c = 0; c <= coils; c++) {
        const t = 0.18 + (c / coils) * 0.62;
        const side = (c % 2 === 0 ? 1 : -1) * 3.8;
        const px = mx + dx * t + nx * side;
        const py = my + dy * t + ny * side;
        if (c === 0) g.moveTo(px, py);
        else g.lineTo(px, py);
      }
      g.strokePath();
    }
  }

  update(delta) {
    const MBody = this.scene.matter.body;

    // Sync visuals → physics
    this.chassisSprite.setPosition(this.chassis.position.x, this.chassis.position.y);
    this.chassisSprite.setRotation(this.chassis.angle);

    this.wheelASprite.setPosition(this.wheelA.position.x, this.wheelA.position.y);
    this.wheelASprite.setRotation(this.wheelA.angle);

    this.wheelBSprite.setPosition(this.wheelB.position.x, this.wheelB.position.y);
    this.wheelBSprite.setRotation(this.wheelB.angle);

    this.drawSuspensionStruts();

    const currentAngle = this.chassis.angle;
    const correctionStrength = 0.0038;
    const angularDamping = 0.065;

    // Strong active pitch stabilization so the car stays planted and responsive
    MBody.setAngularVelocity(
      this.chassis,
      this.chassis.angularVelocity * (1 - angularDamping) - currentAngle * correctionStrength
    );

    // Strong, responsive 4x4 drive controls
    const accel = PHYSICS.CONTROLS.SPEED;
    const torqueForce = PHYSICS.CONTROLS.TORQUE_FORCE;
    const brakeDecel = PHYSICS.CONTROLS.BRAKE_DECEL;
    const maxSpeed = PHYSICS.CONTROLS.MAX_SPEED;
    const airRot = PHYSICS.CONTROLS.AIR_ROTATION;
    this.isAccelerating = false;

    const driveForward = this.cursors.right.isDown || this.keys.D.isDown || this.cursors.up.isDown || this.keys.W.isDown;
    const driveReverse = this.cursors.left.isDown || this.keys.A.isDown || this.cursors.down.isDown || this.keys.S.isDown;

    const vx = this.chassis.velocity.x;
    const vy = this.chassis.velocity.y;
    const cos = Math.cos(currentAngle);
    const sin = Math.sin(currentAngle);

    if (driveForward) {
      // Strong active braking if currently rolling backward
      if (vx < -0.5) {
        MBody.setVelocity(this.chassis, { x: vx * brakeDecel, y: vy });
      }
      MBody.setAngularVelocity(this.wheelA, accel);
      MBody.setAngularVelocity(this.wheelB, accel);

      // Direct forward climbing thrust when below max speed and reasonably upright
      if (vx < maxSpeed && Math.abs(currentAngle) < 1.05) {
        MBody.applyForce(this.chassis, this.chassis.position, {
          x: cos * torqueForce,
          y: sin * torqueForce,
        });
      }

      // Nose-down pitch control to keep front wheels planted on steep climbs
      MBody.setAngularVelocity(
        this.chassis,
        this.chassis.angularVelocity + airRot * 0.055
      );
      this.isAccelerating = true;
    } else if (driveReverse) {
      // Strong active braking if currently rolling forward
      if (vx > 0.5) {
        MBody.setVelocity(this.chassis, { x: vx * brakeDecel, y: vy });
      }
      MBody.setAngularVelocity(this.wheelA, -accel);
      MBody.setAngularVelocity(this.wheelB, -accel);

      if (vx > -maxSpeed * 0.75 && Math.abs(currentAngle) < 1.05) {
        MBody.applyForce(this.chassis, this.chassis.position, {
          x: -cos * torqueForce * 0.85,
          y: -sin * torqueForce * 0.85,
        });
      }

      MBody.setAngularVelocity(
        this.chassis,
        this.chassis.angularVelocity - airRot * 0.055
      );
      this.isAccelerating = true;
    }

    // Upside-down detection
    const deg = Phaser.Math.RadToDeg(this.chassis.angle) % 360;
    const norm = deg < 0 ? deg + 360 : deg;
    if (norm > 120 && norm < 240) {
      this.upsideDownTimer += delta;
    } else {
      this.upsideDownTimer = 0;
    }

    return {
      position: this.chassis.position,
      distance: this.chassis.position.x,
      speed: this.chassis.velocity.x,
      isAccelerating: this.isAccelerating,
      crashed: this.upsideDownTimer > 3000
    };
  }
}
