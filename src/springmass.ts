"use strict";
import {Ball,Vec,new_vector,Spring,Timer,TouchEx} from './helpers.js'
function calc_new_frame(balls, springs, radius, timer, width, height) {
  var STRING_LEN = 100;
  var NUM_STEPS = 10;
  var num_balls = balls.length;
  var is_colide = false;
  function wall_power2(pos, wall_pos) {
    //todo: use speed to calc friction
    if (pos + radius > wall_pos) {
      is_colide = true;
      return -(pos + radius - wall_pos) * 1000;
    }
    if (pos - radius < 0) {
      is_colide = true;
      return -(pos - radius) * 1000;
    }
    return 0;
  }
  function wall_power(p) {
    var ans = new Vec();
    is_colide = false;
    ans.x = wall_power2(p.pos.x, width);
    ans.y = wall_power2(p.pos.y, height);
    if (is_colide) ans.sub_to(p.speed.mult(10));
    return ans;
  }
  function calc_collide_power(p1, p2, dist) {
    if (dist > radius * 2) return new Vec();
    var speed_diff = p2.speed.sub(p1.speed);
    var force = 1000 * (dist - radius * 2);
    var npos1 = p1.pos.div(dist);
    var npos2 = p2.pos.div(dist);
    force += 10 * speed_diff.dot_mult(npos2.sub(npos1));
    var ans = npos2.sub(npos1).mult(force);
    return ans;
  }
  function calc_spring_power(p1, p2) {
    var dist = p1.pos.calc_dist(p2.pos);
    var speed_diff = p2.speed.sub(p1.speed);
    var force = 1000 * (dist - STRING_LEN);
    var npos1 = p1.pos.div(dist);
    var npos2 = p2.pos.div(dist);
    force += 100 * speed_diff.dot_mult(npos2.sub(npos1));
    var ans = npos2.sub(npos1).mult(force);
    return ans;
  }
  function encode_balls(balls, y) {
    for (var i = 0; i < num_balls; i++) {
      var p = balls[i];
      y[i * 4 + 1] = p.pos.x;
      y[i * 4 + 2] = p.pos.y;
      y[i * 4 + 3] = p.speed.x;
      y[i * 4 + 4] = p.speed.y;
    }
  }
  function decode_balls(y) {
    var ans: Ball[] = [];
    for (var i = 0; i < num_balls; i++) {
      var p = new Ball();
      p.pos.x = y[i * 4 + 1];
      p.pos.y = y[i * 4 + 2];
      p.speed.x = y[i * 4 + 3];
      p.speed.y = y[i * 4 + 4];
      ans.push(p);
    }
    return ans;
  }
  function far_away_fast_calc2(p1, p2, dist) {
    return p2 - p1 > dist || p1 - p2 > dist;
  }
  function far_away_fast_calc(p1, p2, dist) {
    if (far_away_fast_calc2(p1.x, p2.x, dist)) return true;
    if (far_away_fast_calc2(p1.y, p2.y, dist)) return true;
    return false;
  }
  function the_derive(time, y, dy) {
    //int i;
    var balls = decode_balls(y);
    var dballs: Ball[] = [];
    var i;
    for (i = 0; i < num_balls; i++) {
      var p = balls[i];
      var d = new Ball();
      d.pos = p.speed;
      d.speed = wall_power(p);
      d.speed.y += 1000; //gravity
      dballs.push(d);
    }
    for (i = 0; i < num_balls; i++)
      for (var j = i + 1; j < num_balls; j++) {
        var p1 = balls[i];
        var p2 = balls[j];
        if (far_away_fast_calc(p1.pos, p2.pos, radius * 2)) continue;
        var dist = p1.pos.calc_dist(p2.pos);
        var collide_power = calc_collide_power(p1, p2, dist);
        dballs[i].speed.add_to(collide_power);
        dballs[j].speed.sub_to(collide_power);
      }
    for (i = 0; i < springs.length; i++) {
      var s = springs[i];
      var spring_power = calc_spring_power(balls[s.start], balls[s.end]);
      dballs[s.start].speed.add_to(spring_power);
      dballs[s.end].speed.sub_to(spring_power);
    }
    encode_balls(dballs, dy);
  }
  function call_rk4(cur_time, time_diff) {
    var y = new_vector(num_balls * 4);
    var dy = new_vector(num_balls * 4);
    encode_balls(balls, y);
    the_derive(cur_time, y, dy); //the current implementation of derive does not uses the time, but can envision an implementation that might (gravity is off every second, perhaps?)
    rk4(y, dy, num_balls * 4, cur_time, time_diff, y);
    balls = decode_balls(y);
  }
  function rk4(y, dydx, n, x, h, yout) {
    /*translated to java from numerical recipies (see nr.com). here is the original doc:
      Given values for the variables y[1..n] and their derivatives dydx[1..n] known at x, use the
    fourth-order Runge-Kutta method to advance the solution over an interval h and return the
    incremented variables as yout[1..n], which need not be a distinct array from y. The user
    supplies the routine derivs(x,y,dydx), which returns derivatives dydx at x.*/ var i;
    var xh, hh, h6;
    var dym = new_vector(n);
    var dyt = new_vector(n);
    //16.1 Runge-Kutta Method 713
    var yt = new_vector(n);
    hh = h * 0.5;
    h6 = h / 6.0;
    xh = x + hh;
    for (i = 1; i <= n; i++) yt[i] = y[i] + hh * dydx[i]; //First step.
    the_derive(xh, yt, dyt); //Second step.
    for (i = 1; i <= n; i++) yt[i] = y[i] + hh * dyt[i];
    the_derive(xh, yt, dym); //Third step.
    for (i = 1; i <= n; i++) {
      yt[i] = y[i] + h * dym[i];
      dym[i] += dyt[i];
    }
    the_derive(x + h, yt, dyt); //Fourth step.
    for (
      i = 1;
      i <= n;
      i++ //Accumulate increments with proper
    )
      yout[i] = y[i] + h6 * (dydx[i] + dyt[i] + 2.0 * dym[i]); //weights.
  }
  for (var i = 0; i < NUM_STEPS; i++)
    call_rk4(timer.cur_time, timer.time_diff / NUM_STEPS); //too: acum the time?
  return balls;
}
function balls_widget() {
  //project a global variabl wall_widget
  var origin = 0;
  var balls: Ball[] = [];
  var radius = 40;
  var springs: Spring[] = [];
  var canvas = document.querySelector("canvas") as HTMLCanvasElement;
  var timer = new Timer();
  var hover_ball = -1;
  var dragged_ball = -1;
  var dragged_ball_offset = new Vec();
  var ongoingTouches: TouchEx[] = [];
  var num_touch_start = 0;
  function dist(a, b) {
    return Math.sqrt((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y));
  }
  function init_rand(ball) {
    ball.pos.x = my_rand(radius, (<any>canvas)?.width - radius);
    ball.pos.y = my_rand(radius, (<any>canvas)?.height - radius);
    ball.speed.x = my_rand(-1, 1);
    ball.speed.y = my_rand(1, 2);
  }
  function my_rand(min: number, max: number) {
    const r = Math.random();
    //r=r%1000;
    return r * (max - min) + min;
  }
  function add_spring(_start, _end) {
    springs.push({ start: _start, end: _end });
  }
  function init_world() {
    add_spring(0, 1);
    add_spring(1, 2);
    add_spring(2, 0);
    add_spring(3, 4);
    add_spring(4, 5);
    add_spring(5, 3);
    add_spring(0, 4);
    for (var i = 0; i < 10; i++) {
      var p = new Ball();
      init_rand(p);
      balls.push(p);
    }
  }
  function get_dragged_indexes() {
    // Extract "l" property values from ongoingTouches
    const indexes = ongoingTouches.map((touch) => (<any>touch).l);
    // Add dragged_ball to the array
    indexes.push(dragged_ball);
    // Filter out all -1 values
    const filteredIndexes = indexes.filter((index) => index !== -1);
    return filteredIndexes;
  }
  function animate() {
    if (timer.time_diff === 0) return; //not enought time has passed, dont animate-crach fix
    if (balls.length === 0) return;
    var new_balls = calc_new_frame(
      balls,
      springs,
      radius,
      timer,
      canvas?.width,
      canvas?.height
    );
    var dragged = get_dragged_indexes();
    for (const x of dragged) {
      new_balls[x] = balls[x]; //when dragging, dissregard animate results for dragged ball
    }
    balls = new_balls;
  }
  function find_ball(event) {
    return balls.findIndex(function (x) {
      return dist(event, x.pos) < radius;
    });
  }
  function point_from_event(event) {
    var rect = canvas.getBoundingClientRect();
    return new Vec(event.clientX - rect.left, event.clientY - rect.top);
  }
  function mouseup() {
    dragged_ball = -1;
  }
  function mousedown(event) {
    var mousedown_point = point_from_event(event);
    dragged_ball = find_ball(mousedown_point);
    if (dragged_ball == -1) balls.push(new Ball(mousedown_point));
    else {
      dragged_ball_offset = balls[dragged_ball].pos.sub(mousedown_point);
    }
  }
  function mousemove(event) {
    var mouse_point = point_from_event(event);
    if (dragged_ball != -1) {
      var mouse_speed = new Vec(event.movementX, event.movementY);
      var newpoint = point_from_event(event);
      balls[dragged_ball].pos = newpoint.add(dragged_ball_offset);
      balls[dragged_ball].speed = mouse_speed.mult(20);
      draw();
      return;
    }
    hover_ball = find_ball(mouse_point);
  }
  function draw() {
    if (!canvas.getContext) return;
    timer.mark_time();
    animate();
    origin += 10;
    if (origin > 500) origin = 10;
    var ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
    ctx.canvas.width = window.innerWidth - 20;
    ctx.canvas.height = window.innerHeight - 20;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "rgb(0,0,0)";
    ctx.fill();
    var i;
    for (i = 0; i < balls.length; i++) {
      ctx.beginPath();
      var ball = balls[i].pos;
      ctx.arc(ball.x, ball.y, radius, 0, Math.PI * 2, true);
      ctx.fillStyle = "rgba(0, 0, 200, 0.5)";
      if (hover_ball == i) ctx.fillStyle = "rgba(200, 0,0 , 0.5)";
      if (dragged_ball == i) ctx.fillStyle = "rgba(0, 100,200 , 0.5)";
      ctx.fill();
      ctx.fillStyle = "white";
      ctx.fillText(i, ball.x, ball.y);
    }
    ctx.setLineDash([3, 3]);
    for (i = 0; i < springs.length; i++) {
      var a = balls[springs[i].start].pos;
      var b = balls[springs[i].end].pos;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
  }
  function touch_start(evt) {
    num_touch_start=num_touch_start+1;
    evt.preventDefault();
    var touches = evt.changedTouches;
    for (const x of touches) {
      var touch = new TouchEx(x);
      var point = point_from_touch(x);
      touch.last_pos = point;
      touch.dragged_ball = find_ball(point);
      if (touch.dragged_ball == -1) balls.push(new Ball(point));
      else {
        touch.dragged_ball_offset = balls[touch.dragged_ball].pos.sub(point);
      }
      ongoingTouches.push(touch);
    }
  }
  function findTouch(touch) {
    return ongoingTouches.findIndex(function (t) {
      return t.identifier === touch.identifier;
    });
  }
  function point_from_touch(touch) {
    return point_from_event(touch);
  }
  function touch_move(evt) {
    evt.preventDefault();
    var touches = evt.changedTouches;
    for (const touch of touches) {
      var idx = findTouch(touch);
      var exist = ongoingTouches[idx];
      if (!exist || exist.dragged_ball == -1) return;
      var pos = point_from_touch(touch).add(exist.dragged_ball_offset);
      balls[exist.dragged_ball].pos = pos;
      exist.timer.mark_time();
      var speed = pos.sub(exist.last_pos).div(exist.timer.time_diff);
      balls[exist.dragged_ball].speed = speed;
      exist.last_pos = pos;
    }
    draw();
  }
  function touch_end(evt) {
    evt.preventDefault();
    for (const touch of evt.changedTouches) {
      var idx = findTouch(touch);
      if (idx != -1) ongoingTouches.splice(idx, 1);
    }
  }
  function attach_handlers() {
    canvas.addEventListener("mouseup", mouseup, false);
    canvas.addEventListener("mousemove", mousemove, false);
    canvas.addEventListener("mousedown", mousedown, false);
    canvas.addEventListener("touchstart", touch_start, false);
    canvas.addEventListener("touchmove", touch_move, false);
    canvas.addEventListener("touchend", touch_end, false);
    setInterval(draw, 30);
  }
  init_world();
  attach_handlers();
}
balls_widget();
