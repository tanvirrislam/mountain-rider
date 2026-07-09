import Phaser from 'phaser';
import { PHYSICS, DEPTH, COLORS } from '../utils/constants';

/**
 * Buggy — fully code-drawn off-road vehicle.
 * Wide wheelbase + low center of gravity + self-righting torque = very hard to flip.
 */
export default class Buggy {
  constructor(scene, x, y) {
    this.scene = scene;

    // ── Dimensions — wider wheelbase for stability ──
    const chassisW = 120;
    const chassisH = 24;       // Flatter body = lower CoG
    const wheelRadius = 22;
    const wheelOffsetX = 50;   // Wider wheelbase = much more stable
    const wheelOffsetY = 18;

    // ── Physics : Chassis ──
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

    // ── Physics : Wheels ──
    const wheelOpts = {
      mass: PHYSICS.WHEEL.MASS,
      friction: PHYSICS.WHEEL.FRICTION,
      restitution: PHYSICS.WHEEL.RESTITUTION,
      density: PHYSICS.WHEEL.DENSITY,
      label: 'wheel'
    };
    this.wheelA = scene.matter.add.circle(x - wheelOffsetX, y + wheelOffsetY, wheelRadius, wheelOpts);
    this.wheelB = scene.matter.add.circle(x + wheelOffsetX, y + wheelOffsetY, wheelRadius, wheelOpts);

    // ── Physics : Suspension (Spring constraints) ──
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
    this.chassisSprite = this.createChassisTexture(scene, chassisW, chassisH);
    this.chassisSprite.setDepth(DEPTH.BUGGY);

    this.wheelASprite = this.createWheelTexture(scene, wheelRadius);
    this.wheelBSprite = this.createWheelTexture(scene, wheelRadius);
    this.wheelASprite.setDepth(DEPTH.BUGGY + 1);
    this.wheelBSprite.setDepth(DEPTH.BUGGY + 1);

    // ── Input ──
    this.cursors = scene.input.keyboard.createCursorKeys();
    this.keys = scene.input.keyboard.addKeys('W,A,S,D');

    // ── State ──
    this.upsideDownTimer = 0;
    this.isAccelerating = false;
  }

  /* ---------- texture helpers ---------- */

  createChassisTexture(scene, w, h) {
    const g = scene.add.graphics();

    // Shadow
    g.fillStyle(0x000000, 0.12);
    g.fillRoundedRect(-w / 2, -h / 2 + 4, w, h, 10);

    // Body base
    g.fillStyle(COLORS.BUGGY_BODY_DARK, 1);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, 10);

    // Body highlight
    g.fillStyle(COLORS.BUGGY_BODY, 1);
    g.fillRoundedRect(-w / 2 + 3, -h / 2 + 3, w - 6, h - 6, 8);

    // Window / windshield
    g.fillStyle(0x90caf9, 0.8);
    g.fillRoundedRect(14, -h / 2 + 4, 28, h - 10, 5);

    // Top shine
    g.fillStyle(COLORS.BUGGY_ACCENT, 0.3);
    g.fillRoundedRect(-w / 2 + 8, -h / 2 + 3, w - 16, 6, 5);

    // Roll cage outline
    g.lineStyle(2.5, 0x333333, 0.85);
    g.strokeRoundedRect(-w / 2 + 2, -h / 2 + 2, w - 4, h - 4, 8);

    // Front bumper
    g.fillStyle(0x333333, 1);
    g.fillRoundedRect(w / 2 - 7, -5, 9, 10, 3);

    // Rear bumper
    g.fillStyle(0x333333, 1);
    g.fillRoundedRect(-w / 2 - 2, -5, 9, 10, 3);

    // Headlight
    g.fillStyle(0xfff176, 0.9);
    g.fillCircle(w / 2 - 1, -2, 3.5);
    g.fillStyle(0xffffff, 0.5);
    g.fillCircle(w / 2 - 1, -2, 1.8);

    // Tail light
    g.fillStyle(0xff1744, 0.8);
    g.fillCircle(-w / 2 + 1, -2, 3);

    return g;
  }

  createWheelTexture(scene, r) {
    const g = scene.add.graphics();

    // Tire
    g.fillStyle(COLORS.WHEEL_OUTER, 1);
    g.fillCircle(0, 0, r);

    // Tread grooves
    g.lineStyle(2.5, 0x0a0a0a, 0.5);
    for (let a = 0; a < 8; a++) {
      const ang = (a / 8) * Math.PI * 2;
      g.lineBetween(
        Math.cos(ang) * (r - 5), Math.sin(ang) * (r - 5),
        Math.cos(ang) * r, Math.sin(ang) * r
      );
    }

    // Inner rubber
    g.fillStyle(COLORS.WHEEL_INNER, 1);
    g.fillCircle(0, 0, r * 0.58);

    // Rim
    g.fillStyle(COLORS.WHEEL_RIM, 1);
    g.fillCircle(0, 0, r * 0.38);

    // Hub
    g.fillStyle(COLORS.WHEEL_HUB, 1);
    g.fillCircle(0, 0, r * 0.16);

    // Spoke cross (visible rotation indicator)
    g.lineStyle(2, 0x777777, 0.5);
    g.lineBetween(0, -(r * 0.5), 0, r * 0.5);
    g.lineBetween(-(r * 0.5), 0, r * 0.5, 0);

    return g;
  }

  /* ---------- update ---------- */

  update(delta) {
    const MBody = this.scene.matter.body;

    // Sync visuals → physics
    this.chassisSprite.setPosition(this.chassis.position.x, this.chassis.position.y);
    this.chassisSprite.setRotation(this.chassis.angle);

    this.wheelASprite.setPosition(this.wheelA.position.x, this.wheelA.position.y);
    this.wheelASprite.setRotation(this.wheelA.angle);

    this.wheelBSprite.setPosition(this.wheelB.position.x, this.wheelB.position.y);
    this.wheelBSprite.setRotation(this.wheelB.angle);

    // ── Self-righting torque ──
    // Always gently push the chassis back toward upright (angle = 0).
    // This is the KEY to preventing easy flips.
    const currentAngle = this.chassis.angle;
    const correctionStrength = 0.002;
    const angularDamping = 0.04;

    // Apply a restoring torque proportional to current tilt
    MBody.setAngularVelocity(
      this.chassis,
      this.chassis.angularVelocity * (1 - angularDamping) - currentAngle * correctionStrength
    );

    // ── Input ──
    const accel = PHYSICS.CONTROLS.SPEED;
    const airRot = PHYSICS.CONTROLS.AIR_ROTATION;
    this.isAccelerating = false;

    if (this.cursors.right.isDown || this.keys.D.isDown) {
      MBody.setAngularVelocity(this.wheelA, accel);
      MBody.setAngularVelocity(this.wheelB, accel);
      // Very gentle air tilt — reduced from 0.15 to 0.06
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

    // ── Upside-down detection ──
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
