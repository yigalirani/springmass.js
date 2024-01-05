"use strict";
function trim(x, min_value, max_value) {
  return Math.min(Math.max(x, min_value), max_value);
}
export class Vec {
  x: number;
  y: number;
  constructor(_x = 0, _y = 0) {
    this.x = _x;
    this.y = _y;
  }
  trim(min_value: number, max_value: number) {
    return new Vec(
      trim(this.x, min_value, max_value),
      trim(this.y, min_value, max_value)
    );
  }
  div(a: number) {
    return new Vec(this.x / a, this.y / a);
  }
  add(right: Vec) {
    return new Vec(this.x + right.x, this.y + right.y);
  }
  add_to(right: Vec) {
    this.x += right.x;
    this.y += right.y;
  }
  sub_to(right: Vec) {
    this.x -= right.x;
    this.y -= right.y;
  }
  sub(right) {
    return new Vec(this.x - right.x, this.y - right.y);
  }
  mult(scalar) {
    return new Vec(this.x * scalar, this.y * scalar);
  }
  dot_mult = function (right) {
    return this.x * right.x + this.y * right.y;
  };
  calc_dist = function (p2) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    var p1 = this;
    return Math.sqrt(
      (p2.x - p1.x) * (p2.x - p1.x) + (p2.y - p1.y) * (p2.y - p1.y)
    );
  };
}
export class Ball {
  pos: Vec;
  speed: Vec;
  constructor(pos: Vec = new Vec(), speed: Vec = new Vec()) {
    this.pos = pos;
    this.speed = speed;
  }
}
function system_time() {
  return new Date().getTime() / 1000;
}
export class Timer {
  cur_time = 0;
  time_diff = 0;
  epoch_time = system_time(); //private class member hua
  mark_time() {
    var time = system_time() - this.epoch_time;
    this.time_diff = Math.min(time - this.cur_time, 0.05);
    this.cur_time = time;
  }
  constructor() {
    this.mark_time();
  }
}
export function new_vector(size) {
  return new Float64Array(size + 1);
}
export interface Spring {
  start: number;
  end: number;
}

export class TouchEx {
  dragged_ball = -1;
  dragged_ball_offset = new Vec();
  timer = new Timer();
  last_pos = new Vec();
  identifier;
  pageX: number;
  pageY: number;
  constructor(touch: Touch) {
    this.identifier = touch.identifier;
    this.pageX = touch.pageX;
    this.pageY = touch.pageY;
  }
}
