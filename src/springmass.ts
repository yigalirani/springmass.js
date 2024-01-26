"use strict";
import {Ball,Vec,Spring,Timer,TouchEx,Orientation} from './helpers.js'
import {calc_new_frame} from './calc.js'
function balls_widget() {
  //project a global variabl wall_widget
  const orientation=new Orientation();
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
    ball.pos.x = my_rand(radius, canvas.width - radius);
    ball.pos.y = my_rand(radius, canvas.height - radius);
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
    const indexes = ongoingTouches.map((touch) => touch.dragged_ball);
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
      ctx.fillText(i+','+ball.x+','+ball.y, ball.x, ball.y);
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
    ctx.fillStyle = "black";
    JSON.stringify(orientation,null,2).split('\n').forEach((txt,y)=>
      ctx.fillText(txt,100, 100+y*10)
    )

  }
  function handleOrientation(event) {
    orientation.absolute = event.absolute;
    orientation.alpha = event.alpha;
    orientation.beta = event.beta;
    orientation.gamma = event.gamma;
  
    // Do stuff with the new orientation data
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
    window.addEventListener("deviceorientation", handleOrientation, true);
    setInterval(draw, 30);
  }
  init_world();
  attach_handlers();
}
balls_widget();
