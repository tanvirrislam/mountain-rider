import Phaser from 'phaser'
import { PHYSICS, DEPTH, COLORS } from '../utils/constants'


export default class Buggy {
  constructor(scene, x, y) {
    this.scene = scene;


    const chassisW = 120
    const chassisH = 24
    const wheelRadius = 22
    const wheelOffsetX = 50
    const wheelOffsetY = 18

    // chassis Physics 
    this.chassis = scene.matter.add.rectangle(x, y, chassisW, chassisH, {
      mass: PHYSICS.BUGGY.MASS,
      friction: PHYSICS.BUGGY.FRICTION,
      restitution: PHYSICS.BUGGY.RESTITUTION,
      chamfer: { radius: 10 },
      label: 'chassis',
      // Lower the center of mass so the buggy naturally rights itself
      plugin: {}
    });

    // Shift center of mass downward for natural stability
    scene.matter.body.setCentre(this.chassis, { x: 0, y: 6 }, true);

    // Physics : Wheels
    const wheelOpts = {
      mass: PHYSICS.WHEEL.MASS,
      friction: PHYSICS.WHEEL.FRICTION,
      restitution: PHYSICS.WHEEL.RESTITUTION,
      density: PHYSICS.WHEEL.DENSITY,
      label: 'wheel'
    };
    this.wheelA = scene.matter.add.circle(x - wheelOffsetX, y + wheelOffsetY, wheelRadius, wheelOpts);
    this.wheelB = scene.matter.add.circle(x + wheelOffsetX, y + wheelOffsetY, wheelRadius, wheelOpts);

    // Physics : Suspension
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

  createChassisTexture(scene, w, h) {
    const g = scene.add.graphics();

    // Undercarriage shadow
    g.fillStyle(0x000000, 0.28);
    g.fillRoundedRect(-w / 2 - 4, -h / 2 + 8, w + 8, h + 4, 8);

    // Rear Engine block with cooling fins
    g.fillStyle(0x2b2f33, 1);
    g.fillRoundedRect(-w / 2 - 14, -h / 2 - 6, 24, 20, 4);
    g.fillStyle(0x4b5157, 1);
    g.fillRoundedRect(-w / 2 - 12, -h / 2 - 4, 20, 16, 2);
    g.lineStyle(1.5, 0x1c1f22, 0.8);
    for (let fy = -h / 2 - 1; fy <= -h / 2 + 9; fy += 4) {
      g.lineBetween(-w / 2 - 11, fy, -w / 2 + 6, fy);
    }

    // Dual Exhaust pipes with metallic highlight
    g.fillStyle(0x7d848b, 1);
    g.fillRoundedRect(-w / 2 - 21, -h / 2 + 1, 13, 6, 2);
    g.fillStyle(0xc5ccd3, 0.7);
    g.fillRect(-w / 2 - 20, -h / 2 + 2, 11, 2);
    g.fillStyle(0x16181a, 1);
    g.fillCircle(-w / 2 - 19, -h / 2 + 4, 2);

    // Main Lower Body (metallic multi-tone shading)
    g.fillStyle(COLORS.BUGGY_BODY_DARK, 1);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, 8);

    g.fillStyle(COLORS.BUGGY_BODY, 1);
    g.fillRoundedRect(-w / 2 + 2, -h / 2 + 2, w - 4, h - 5, 6);

    // Upper metallic specular highlight
    g.fillStyle(COLORS.BUGGY_ACCENT, 0.85);
    g.fillRoundedRect(-w / 2 + 4, -h / 2 + 3, w - 8, h / 3, 4);

    // Subtle panel seam & door line
    g.lineStyle(1.2, 0x5c0d0d, 0.65);
    g.lineBetween(-16, -h / 2 + 3, -16, h / 2 - 3);
    g.lineBetween(36, -h / 2 + 3, 36, h / 2 - 3);

    // Racing stripe
    g.fillStyle(0xf1f3f5, 0.92);
    g.fillRect(-w / 2 + 10, -2, w - 20, 5);
    g.fillStyle(0x1f2326, 0.85);
    g.fillRect(-w / 2 + 10, 0, w - 20, 1.5);

    // Cockpit
    const cabStartX = -15;
    const cabWidth = 55;
    const cabHeight = 30;
    const cabY = -h / 2;

    g.fillStyle(COLORS.BUGGY_BODY_DARK, 1);
    g.beginPath();
    g.moveTo(cabStartX, cabY);
    g.lineTo(cabStartX + 5, cabY - cabHeight);
    g.lineTo(cabStartX + cabWidth - 15, cabY - cabHeight);
    g.lineTo(cabStartX + cabWidth, cabY);
    g.closePath();
    g.fillPath();

    g.fillStyle(COLORS.BUGGY_BODY, 1);
    g.beginPath();
    g.moveTo(cabStartX + 2, cabY);
    g.lineTo(cabStartX + 7, cabY - cabHeight + 2);
    g.lineTo(cabStartX + cabWidth - 17, cabY - cabHeight + 2);
    g.lineTo(cabStartX + cabWidth - 2, cabY);
    g.closePath();
    g.fillPath();

    // Tinted safety-glass windows
    g.fillStyle(0x2c4657, 0.85);
    g.beginPath();
    g.moveTo(cabStartX + 7, cabY - 2);
    g.lineTo(cabStartX + 10, cabY - cabHeight + 5);
    g.lineTo(cabStartX + cabWidth - 20, cabY - cabHeight + 5);
    g.lineTo(cabStartX + cabWidth - 7, cabY - 2);
    g.closePath();
    g.fillPath();

    // Sky reflection on upper glass
    g.fillStyle(0x9bc4e2, 0.38);
    g.beginPath();
    g.moveTo(cabStartX + 10, cabY - cabHeight + 5);
    g.lineTo(cabStartX + cabWidth - 20, cabY - cabHeight + 5);
    g.lineTo(cabStartX + cabWidth - 13, cabY - cabHeight * 0.45);
    g.lineTo(cabStartX + 8, cabY - cabHeight * 0.45);
    g.closePath();
    g.fillPath();

    // Window pillar
    g.lineStyle(4.5, COLORS.BUGGY_BODY_DARK, 1);
    g.lineBetween(cabStartX + 25, cabY - cabHeight + 5, cabStartX + 25, cabY - 2);

    // Diagonal glass glare
    g.fillStyle(0xffffff, 0.25);
    g.beginPath();
    g.moveTo(cabStartX + cabWidth - 22, cabY - cabHeight + 5);
    g.lineTo(cabStartX + cabWidth - 26, cabY - cabHeight + 5);
    g.lineTo(cabStartX + cabWidth - 11, cabY - 2);
    g.lineTo(cabStartX + cabWidth - 7, cabY - 2);
    g.closePath();
    g.fillPath();

    // Tubular Steel Roll Cage
    g.lineStyle(4, 0x1c1f22, 1);
    g.lineBetween(cabStartX + 2, cabY - cabHeight - 2, cabStartX + cabWidth - 12, cabY - cabHeight - 2);
    g.beginPath();
    g.moveTo(cabStartX, cabY);
    g.lineTo(cabStartX - 15, cabY - 20);
    g.lineTo(cabStartX + 5, cabY - cabHeight);
    g.strokePath();
    g.beginPath();
    g.moveTo(cabStartX - 30, cabY);
    g.lineTo(cabStartX - 15, cabY - 20);
    g.strokePath();

    // Subtle steel highlight on roll cage
    g.lineStyle(1.2, 0x6b7278, 0.65);
    g.lineBetween(cabStartX + 3, cabY - cabHeight - 3, cabStartX + cabWidth - 13, cabY - cabHeight - 3);

    // Front Bumper / Bullbar
    g.lineStyle(4, 0x1c1f22, 1);
    g.beginPath();
    g.moveTo(w / 2 - 5, 5);
    g.lineTo(w / 2 + 10, 5);
    g.lineTo(w / 2 + 15, -5);
    g.lineTo(w / 2 + 8, -15);
    g.lineTo(w / 2 - 5, -10);
    g.strokePath();

    g.lineStyle(2.5, 0x4b5157, 1);
    g.lineBetween(w / 2 + 10, 5, w / 2 + 15, -5);

    // Wheel Arch Fenders
    g.lineStyle(8, 0x141618, 1);
    g.beginPath();
    g.arc(-50, 18, 28, Math.PI, 0, false);
    g.strokePath();
    g.beginPath();
    g.arc(50, 18, 28, Math.PI, 0, false);
    g.strokePath();

    g.lineStyle(2.5, COLORS.BUGGY_ACCENT, 0.9);
    g.beginPath();
    g.arc(-50, 18, 28, Math.PI, 0, false);
    g.strokePath();
    g.beginPath();
    g.arc(50, 18, 28, Math.PI, 0, false);
    g.strokePath();

    // Headlight with warm reflector lens
    g.fillStyle(0x2f3337, 1);
    g.fillRoundedRect(w / 2 - 4, -h / 2 - 4, 10, 12, 3);
    g.fillStyle(0xfff3b0, 1);
    g.fillCircle(w / 2 + 2, -h / 2 + 2, 4);
    g.fillStyle(0xffffff, 0.9);
    g.fillCircle(w / 2 + 3, -h / 2 + 1.5, 2);

    // Tail light
    g.fillStyle(0x1c1f22, 1);
    g.fillRoundedRect(-w / 2 - 4, -h / 2 - 2, 6, 12, 2);
    g.fillStyle(0xc62828, 1);
    g.fillRoundedRect(-w / 2 - 2, -h / 2, 4, 8, 2);

    return g;
  }

  createWheelTexture(scene, r) {
    const g = scene.add.graphics();

    // Knobby off-road tread lugs around outer circumference
    g.fillStyle(0x111214, 1);
    const lugs = 14;
    for (let a = 0; a < lugs; a++) {
      const ang = (a / lugs) * Math.PI * 2;
      const lx = Math.cos(ang) * (r - 1);
      const ly = Math.sin(ang) * (r - 1);
      g.fillCircle(lx, ly, 3.2);
    }

    // Tire outer rubber
    g.fillStyle(COLORS.WHEEL_OUTER, 1);
    g.fillCircle(0, 0, r - 1);

    // Sidewall groove & rubber depth
    g.lineStyle(2, 0x2a2d30, 0.85);
    g.strokeCircle(0, 0, r * 0.78);

    // Inner rubber sidewall
    g.fillStyle(COLORS.WHEEL_INNER, 1);
    g.fillCircle(0, 0, r * 0.64);

    // Brake disc visible behind spokes
    g.fillStyle(0x6c737a, 0.85);
    g.fillCircle(0, 0, r * 0.48);

    // Alloy rim outer lip
    g.lineStyle(3, COLORS.WHEEL_RIM, 1);
    g.strokeCircle(0, 0, r * 0.46);

    // 5-spoke alloy rim
    g.lineStyle(3.5, 0xd0d6dc, 0.95);
    for (let a = 0; a < 5; a++) {
      const ang = (a / 5) * Math.PI * 2 - Math.PI / 2;
      g.lineBetween(0, 0, Math.cos(ang) * r * 0.44, Math.sin(ang) * r * 0.44);
    }

    // Hub & lug nuts
    g.fillStyle(COLORS.WHEEL_HUB, 1);
    g.fillCircle(0, 0, r * 0.2);

    g.fillStyle(0xe5e7eb, 0.9);
    for (let a = 0; a < 5; a++) {
      const ang = (a / 5) * Math.PI * 2 - Math.PI / 2;
      g.fillCircle(Math.cos(ang) * r * 0.13, Math.sin(ang) * r * 0.13, 1.1);
    }

    // Center axle cap
    g.fillStyle(0x1a1c1e, 1);
    g.fillCircle(0, 0, r * 0.07);

    return g;
  }

  drawSuspensionStruts() {
    const g = this.suspensionGfx;
    g.clear();

    const cos = Math.cos(this.chassis.angle);
    const sin = Math.sin(this.chassis.angle);
    const cx = this.chassis.position.x;
    const cy = this.chassis.position.y;

    const mounts = [
      { localX: -this.wheelOffsetX * 0.75, localY: 2, wheel: this.wheelA },
      { localX: this.wheelOffsetX * 0.75, localY: 2, wheel: this.wheelB },
    ];

    for (const m of mounts) {
      const mx = cx + m.localX * cos - m.localY * sin;
      const my = cy + m.localX * sin + m.localY * cos;
      const wx = m.wheel.position.x;
      const wy = m.wheel.position.y;

      // Shock absorber damper tube
      g.lineStyle(4, 0x2d3136, 1);
      g.lineBetween(mx, my, wx, wy);
      // Coil spring highlight
      g.lineStyle(2, 0xc62828, 0.9);
      g.lineBetween(
        mx + (wx - mx) * 0.2,
        my + (wy - my) * 0.2,
        mx + (wx - mx) * 0.75,
        my + (wy - my) * 0.75
      );
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
    const correctionStrength = 0.002;
    const angularDamping = 0.04;

    // Apply a restoring torque proportional to current tilt
    MBody.setAngularVelocity(
      this.chassis,
      this.chassis.angularVelocity * (1 - angularDamping) - currentAngle * correctionStrength
    );

    // Input
    const accel = PHYSICS.CONTROLS.SPEED;
    const airRot = PHYSICS.CONTROLS.AIR_ROTATION;
    this.isAccelerating = false;

    if (this.cursors.right.isDown || this.keys.D.isDown) {
      MBody.setAngularVelocity(this.wheelA, accel);
      MBody.setAngularVelocity(this.wheelB, accel);
      MBody.setAngularVelocity(
        this.chassis,
        this.chassis.angularVelocity + airRot * 0.06
      );
      this.isAccelerating = true;
    } else if (this.cursors.left.isDown || this.keys.A.isDown) {
      MBody.setAngularVelocity(this.wheelA, -accel);
      MBody.setAngularVelocity(this.wheelB, -accel);
      MBody.setAngularVelocity(
        this.chassis,
        this.chassis.angularVelocity - airRot * 0.06
      );
      this.isAccelerating = true;
    }

    // Upside-down detection
    const deg = Phaser.Math.RadToDeg(this.chassis.angle) % 360;
    const norm = deg < 0 ? deg + 360 : deg;
    if (norm > 120 && norm < 240) {       // Even wider safe zone
      this.upsideDownTimer += delta;
    } else {
      this.upsideDownTimer = 0;
    }

    return {
      position: this.chassis.position,
      distance: this.chassis.position.x,
      speed: this.chassis.velocity.x,
      isAccelerating: this.isAccelerating,
      crashed: this.upsideDownTimer > 3000  // 3 full seconds upside down to crash
    };
  }
}
