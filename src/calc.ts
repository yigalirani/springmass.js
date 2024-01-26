import {Ball,Vec,new_vector,Spring,Timer,Orientation} from './helpers.js'
function norm(x){
  if (Math.abs(x)<2)
    return 0
  return x*20
}
export function calc_new_frame(balls:Ball[], springs:Spring[], radius, timer:Timer, width, height,orientation:Orientation) {
  var STRING_LEN = 100;
  var NUM_STEPS = 10;
  var num_balls = balls.length;
  var is_colide = false;
  function wall_power2(pos: number, wall_pos: number) {
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
  function wall_power(p: Ball) {
    var ans = new Vec();
    is_colide = false;
    ans.x = wall_power2(p.pos.x, width);
    ans.y = wall_power2(p.pos.y, height);
    if (is_colide) ans.sub_to(p.speed.mult(10));
    return ans;
  }
  function calc_collide_power(p1: Ball, p2: Ball, dist: number) {
    if (dist > radius * 2) return new Vec();
    var speed_diff = p2.speed.sub(p1.speed);
    var force = 1000 * (dist - radius * 2);
    var npos1 = p1.pos.div(dist);
    var npos2 = p2.pos.div(dist);
    force += 10 * speed_diff.dot_mult(npos2.sub(npos1));
    var ans = npos2.sub(npos1).mult(force);
    return ans;
  }
  function calc_spring_power(p1: Ball, p2: Ball) {
    var dist = p1.pos.calc_dist(p2.pos);
    var speed_diff = p2.speed.sub(p1.speed);
    var force = 1000 * (dist - STRING_LEN);
    var npos1 = p1.pos.div(dist);
    var npos2 = p2.pos.div(dist);
    force += 100 * speed_diff.dot_mult(npos2.sub(npos1));
    var ans = npos2.sub(npos1).mult(force);
    return ans;
  }
  function encode_balls(balls: Ball[], y: Ball[] | Float64Array) {
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
      //d.speed.y += 1000; //gravity
      d.speed.y+=norm(orientation.beta)
      d.speed.x+=norm(orientation.gamma)
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
  function call_rk4(cur_time: number, time_diff: number) {
    var y = new_vector(num_balls * 4);
    var dydx = new_vector(num_balls * 4);
    encode_balls(balls, y);
    the_derive(cur_time, y, dydx); //the current implementation of derive does not uses the time, but can envision an implementation that might (gravity is off every second, perhaps?)
    rk4({y, dydx, n:num_balls * 4, x:cur_time, h:time_diff,yout:y});
    balls = decode_balls(y);
  }
  function rk4({y, dydx, n, x,h, yout}:{
    y: Float64Array, 
    dydx: Float64Array, 
    n: number, 
    x: number, 
    h: number, 
    yout: Float64Array}) 
  {
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