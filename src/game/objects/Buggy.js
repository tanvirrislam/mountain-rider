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
    
    // Shadow
    g.fillStyle(0x000000, 0.2);
    g.fillRoundedRect(-w / 2 - 4, -h / 2 + 8, w + 8, h + 4, 8);

    // Rear Engine 
    // Engine block
    g.fillStyle(0x424242, 1);
    g.fillRoundedRect(-w/2 - 14, -h/2 - 6, 24, 20, 4);
    g.fillStyle(0x616161, 1);
    g.fillRoundedRect(-w/2 - 12, -h/2 - 4, 20, 16, 2);
    
    // Exhaust pipes
    g.fillStyle(0x9e9e9e, 1);
    g.fillRoundedRect(-w/2 - 20, -h/2 + 2, 12, 6, 2);
    g.fillStyle(0x212121, 1);
    g.fillCircle(-w/2 - 18, -h/2 + 5, 2);

    // Main Lower Body
    g.fillStyle(COLORS.BUGGY_BODY_DARK, 1);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, 8);
    
    // layering for the body
    g.fillStyle(COLORS.BUGGY_BODY, 1);
    g.fillRoundedRect(-w / 2 + 2, -h / 2 + 2, w - 4, h - 4, 6);
    
    g.fillStyle(COLORS.BUGGY_ACCENT, 1);
    g.fillRoundedRect(-w / 2 + 4, -h / 2 + 4, w - 8, h / 2.5, 4);

    // Racing stripe
    g.fillStyle(0xffffff, 0.9);
    g.fillRect(-w/2 + 10, -2, w - 20, 6);
    g.fillStyle(0x212121, 0.8);
    g.fillRect(-w/2 + 10, 0, w - 20, 2);

    // Cockpit
    const cabStartX = -15;
    const cabWidth = 55;
    const cabHeight = 30;
    const cabY = -h/2; // bottom of cab
    
    g.fillStyle(COLORS.BUGGY_BODY_DARK, 1);
    g.beginPath();
    g.moveTo(cabStartX, cabY); // back bottom
    g.lineTo(cabStartX + 5, cabY - cabHeight); // back top
    g.lineTo(cabStartX + cabWidth - 15, cabY - cabHeight); // front top
    g.lineTo(cabStartX + cabWidth, cabY); // front bottom
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

    // Windows (front and back side windows)
    g.fillStyle(0x81d4fa, 0.7); 
    g.beginPath();
    g.moveTo(cabStartX + 7, cabY - 2); 
    g.lineTo(cabStartX + 10, cabY - cabHeight + 5);
    g.lineTo(cabStartX + cabWidth - 20, cabY - cabHeight + 5); 
    g.lineTo(cabStartX + cabWidth - 7, cabY - 2); 
    g.closePath();
    g.fillPath();

    // Window pillar
    g.lineStyle(5, COLORS.BUGGY_BODY_DARK, 1);
    g.lineBetween(cabStartX + 25, cabY - cabHeight + 5, cabStartX + 25, cabY - 2);

    // Window shine
    g.fillStyle(0xffffff, 0.3);
    g.beginPath();
    g.moveTo(cabStartX + cabWidth - 22, cabY - cabHeight + 5);
    g.lineTo(cabStartX + cabWidth - 25, cabY - cabHeight + 5);
    g.lineTo(cabStartX + cabWidth - 10, cabY - 2);
    g.lineTo(cabStartX + cabWidth - 7, cabY - 2);
    g.closePath();
    g.fillPath();

    // Roll Cage
    g.lineStyle(4, 0x212121, 1);
    // Top roof rack
    g.lineBetween(cabStartX + 2, cabY - cabHeight - 2, cabStartX + cabWidth - 12, cabY - cabHeight - 2);
    // Rear bars
    g.beginPath();
    g.moveTo(cabStartX, cabY);
    g.lineTo(cabStartX - 15, cabY - 20);
    g.lineTo(cabStartX + 5, cabY - cabHeight);
    g.strokePath();

    g.beginPath();
    g.moveTo(cabStartX - 30, cabY);
    g.lineTo(cabStartX - 15, cabY - 20);
    g.strokePath();

    // Front Bumper
    g.lineStyle(4, 0x212121, 1);
    g.beginPath();
    g.moveTo(w/2 - 5, 5);
    g.lineTo(w/2 + 10, 5);
    g.lineTo(w/2 + 15, -5);
    g.lineTo(w/2 + 8, -15);
    g.lineTo(w/2 - 5, -10);
    g.strokePath();

    g.lineStyle(3, 0x424242, 1);
    g.lineBetween(w/2 + 10, 5, w/2 + 15, -5);

    // Fenders
    // Background of fenders (dark)
    g.lineStyle(8, 0x111111, 1);
    g.beginPath();
    g.arc(-50, 18, 28, Math.PI, 0, false); 
    g.strokePath();
    g.beginPath();
    g.arc(50, 18, 28, Math.PI, 0, false);
    g.strokePath();

    // Accent on fenders
    g.lineStyle(3, COLORS.BUGGY_ACCENT, 1);
    g.beginPath();
    g.arc(-50, 18, 28, Math.PI, 0, false); 
    g.strokePath();
    g.beginPath();
    g.arc(50, 18, 28, Math.PI, 0, false);
    g.strokePath();

    // Headlight
    // Housing
    g.fillStyle(0x424242, 1);
    g.fillRoundedRect(w / 2 - 4, -h/2 - 4, 10, 12, 3);
    // Light
    g.fillStyle(0xffea00, 1);
    g.fillCircle(w / 2 + 2, -h/2 + 2, 4);
    // Glow
    g.fillStyle(0xffffff, 0.8);
    g.fillCircle(w / 2 + 3, -h/2 + 2, 2);

    // Tail light
    g.fillStyle(0x212121, 1);
    g.fillRoundedRect(-w / 2 - 4, -h/2 - 2, 6, 12, 2);
    g.fillStyle(0xd50000, 1);
    g.fillRoundedRect(-w / 2 - 2, -h/2, 4, 8, 2);

    return g;
  }

  createWheelTexture(scene, r) {
    const g = scene.add.graphics();

    // Tire background
    g.fillStyle(COLORS.WHEEL_OUTER, 1);
    g.fillCircle(0, 0, r);

    // Chunky tread pattern
    g.lineStyle(4, 0x050505, 1);
    for (let a = 0; a < 8; a++) {
      const ang = (a / 8) * Math.PI * 2;
      g.lineBetween(
        Math.cos(ang) * (r - 6), Math.sin(ang) * (r - 6),
        Math.cos(ang) * (r + 1), Math.sin(ang) * (r + 1)
      );
    }

    // Inner rubber
    g.fillStyle(COLORS.WHEEL_INNER, 1);
    g.fillCircle(0, 0, r * 0.65);

    // Rim outer
    g.fillStyle(COLORS.WHEEL_RIM, 1);
    g.fillCircle(0, 0, r * 0.45);
    
    // Rim inner shadow
    g.fillStyle(0x757575, 1);
    g.fillCircle(0, 0, r * 0.35);

    // Hub
    g.fillStyle(COLORS.WHEEL_HUB, 1);
    g.fillCircle(0, 0, r * 0.2);

    // Spoke star (5 points)
    g.lineStyle(3, 0xe0e0e0, 0.8);
    for (let a = 0; a < 5; a++) {
      const ang = (a / 5) * Math.PI * 2 - Math.PI / 2;
      g.lineBetween(0, 0, Math.cos(ang) * r * 0.4, Math.sin(ang) * r * 0.4);
    }

    // Center bolt
    g.fillStyle(0x212121, 1);
    g.fillCircle(0, 0, r * 0.08);

    return g;
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
