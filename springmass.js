(function (){
function trim(x,min_value,max_value){
    return Math.min(Math.max(x,min_value),max_value); 
}   
function Vec(_x,_y){ 
    this.x=Number(_x||0);
    this.y=Number(_y||0);
};

Object.prototype.toString=function(){
    return JSON.stringify(this);
}

Vec.prototype.trim=function(min_value,max_value){
    return new Vec(
        trim(this.x,min_value,max_value),
        trim(this.y,min_value,max_value)
            );
    }
Vec.prototype.div=function( a){
    return new Vec(this.x/a,this.y/a);
}    
Vec.prototype.add=function(right){
    return new Vec(this.x+right.x,this.y+right.y);
}
Object.prototype.add_to=function(right){
    this.x+=right.x;
    this.y+=right.y;
}
Object.prototype.sub_to=function(right){
    this.x-=right.x;
    this.y-=right.y;
}
Object.prototype.sub=function(right){
    return new Vec(this.x-right.x,this.y-right.y);
}
Object.prototype.mult=function(scalar){
    return new Vec(this.x*scalar,this.y*scalar)
}
Object.prototype.dot_mult=function(right){
    return this.x*right.x+this.y*right.y;
}
Object.prototype.calc_dist=function(p2){
    var p1=this;
    return Math.sqrt((p2.x-p1.x)*(p2.x-p1.x)+(p2.y-p1.y)*(p2.y-p1.y));
}
function Ball(pos){
    this.pos=pos||new Vec();
    this.speed=new Vec();
};
function Timer(){
    this.cur_time=0;
    this.time_diff=0;
    var epoch_time=system_time(); //private class member hua
    function system_time(){
        return new Date().getTime()/1000;
    }
    this.mark_time=function(){
        var time=system_time()-epoch_time;
        this.time_diff=Math.min(time-this.cur_time,.05);
        this.cur_time=time;
    }
};

function calc_new_frame(balls, springs,radius,timer,width,height){

    var STRING_LEN= .4;
    var NUM_STEPS =10;
    var num_balls = balls.length;
    var is_colide=false;

    function wall_power2(pos,wall_pos){
        //todo: use speed to calc friction
        if (pos+radius>wall_pos){
            is_colide=true;
            return -(pos+radius-1)*100;
        }
        if (pos-radius<0){
            is_colide=true;
            return -(pos-radius+1)*100;
        }
        return 0;
    }


    function wall_power(p){
        var ans=new Vec();
        is_colide=false;
        ans.x=wall_power2(p.pos.x,width);
        ans.y=wall_power2(p.pos.y,height);
        if (is_colide)
            ans.sub_to(p.speed.mult(10));
        return ans;
    }


    function calc_collide_power( p1, p2, dist){
        if (dist>radius*2)
            return new Vec();//Friday, August 29, 2008 15:26:33: stickiness bug fix
        var speed_diff=p2.speed.sub(p1.speed);
        var force=1000*(dist-radius*2);
        var npos1=p1.pos.div(dist); //normalized
        var npos2=p2.pos.div(dist);
        force+=10*speed_diff.dot_mult(npos2.sub(npos1));
        var ans=npos2.sub(npos1).mult(force);
        return ans;
    /*    colide_power_x=force*(x2-x1)/dist;
        colide_power_y=force*(y2-y1)/dist;*/

    }
    function calc_spring_power( p1, p2){
        var dist=p1.pos.calc_dist(p2.pos);
        //if (abs(dist-STRING_LEN)<.1)
    //  return;
        var speed_diff=p2.speed.sub(p1.speed);
        var force=1000*(dist-STRING_LEN);
        var npos1=p1.pos.div(dist); //normalized
        var npos2=p2.pos.div(dist);
        force+=100*speed_diff.dot_mult(npos2.sub(npos1));
        var ans=npos2.sub(npos1).mult(force);
        return ans;
        //force*=force;
    //    colide_power_x=(x2-x1)/dist*force;
     //   colide_power_y=(y2-y1)/dist*force;

    }

    function encode_balls(balls,y){
        for (var i=0;i<num_balls;i++){
            var p=balls[i];
            y[i*4+1]=p.pos.x;
            y[i*4+2]=p.pos.y;
            y[i*4+3]=p.speed.x;
            y[i*4+4]=p.speed.y;
        }
    }
    function decode_balls(y ){
        var ans= [];
        for (var i=0;i<num_balls;i++){
            var p=new Ball();
            p.pos.x=y[i*4+1];
            p.pos.y=y[i*4+2];
            p.speed.x=y[i*4+3];
            p.speed.y=y[i*4+4];
            ans.push(p);
        }
        return ans;

    }
    function far_away_fast_calc2(p1,p2,dist){
        return (p2-p1>dist||p1-p2>dist);
    }
    function far_away_fast_calc(p1,p2,dist){
        if (far_away_fast_calc2(p1.x,p2.x,dist))
            return true;
        if (far_away_fast_calc2(p1.y,p2.y,dist))
            return true;
        return false;
    }
    function the_derive( time,y,dy){
        //int i;
        var balls = decode_balls(y);//new BallVector();//Ball[num_balls];
        var dballs= [];//new Ball[num_balls];

        for (var i=0;i<num_balls;i++){
            var  p=balls[i];
            var d=new Ball();
            d.pos=p.speed;
            d.speed=wall_power(p);
            d.speed.y+=100; //gravity
            dballs.push(d);
        }

        for (var i=0;i<num_balls;i++)
            for (var j=i+1;j<num_balls;j++){
                var p1=balls[i];
                var p2=balls[j];
                if (far_away_fast_calc(p1.pos,p2.pos,radius*2))
                    continue;
                var dist=p1.pos.calc_dist(p2.pos);
                //if (dist>radius*2)
                //  continue;

                var collide_power=calc_collide_power(p1,p2,dist);
                dballs[i].speed.add_to(collide_power);
                dballs[j].speed.sub_to(collide_power);
        }
        for (var i=0;i<springs.length;i++){
            var s=springs[i];
            var collide_power=calc_spring_power(balls[s.start],balls[s.end]);
            dballs[s.start].speed.add_to(collide_power);
            dballs[s.end].speed.sub_to(collide_power);
        }
        encode_balls(dballs,dy);

    };
    function new_vector( size){
        return new Float64Array(size+1);
    }
    function call_rk4( cur_time, time_diff){
        var y=new_vector(num_balls*4);
        var dy=new_vector(num_balls*4);
        encode_balls(balls,y);
        the_derive(cur_time,y,dy); //the current implementation of derive does not uses the time, but can envision an implementation that might (gravity is off every second, perhaps?)
        rk4(y, dy, num_balls*4, cur_time, time_diff, y);
        //balls=new BallVector();
        balls=decode_balls(y);
        //free_vector(y,1,num_balls*4);
//      free_vector(dy,1,num_balls*4);
    }

    function rk4(y,dydx, n,  x,  h,yout)
    /*translated to java from numerical recipies (see nr.com). here is the original doc:
     Given values for the variables y[1..n] and their derivatives dydx[1..n] known at x, use the
    fourth-order Runge-Kutta method to advance the solution over an interval h and return the
    incremented variables as yout[1..n], which need not be a distinct array from y. The user
    supplies the routine derivs(x,y,dydx), which returns derivatives dydx at x.*/
    {
        var i;
        var xh,hh,h6;
        var dym=new_vector(n);
        var dyt=new_vector(n);
        //16.1 Runge-Kutta Method 713
        var yt=new_vector(n);
        hh=h*0.5;
        h6=h/6.0;
        xh=x+hh;
        for (i=1;i<=n;i++) yt[i]=y[i]+hh*dydx[i]; //First step.
            the_derive(xh,yt,dyt); //Second step.
        for (i=1;i<=n;i++) yt[i]=y[i]+hh*dyt[i];
            the_derive(xh,yt,dym); //Third step.
        for (i=1;i<=n;i++) {
            yt[i]=y[i]+h*dym[i];
            dym[i] += dyt[i];
        }
        the_derive(x+h,yt,dyt); //Fourth step.
        for (i=1;i<=n;i++) //Accumulate increments with proper
            yout[i]=y[i]+h6*(dydx[i]+dyt[i]+2.0*dym[i]); //weights.
    }
    for (i=0;i<NUM_STEPS;i++)
        call_rk4(timer.cur_time,timer.time_diff/NUM_STEPS); //too: acum the time?
    return balls;
};
balls_widget=function(canvasid){
    var origin=0;
    var balls=[];
    var radius=40;
    var mouse_point=new Vec()
    var mousedown_point;
    var springs=[];
    var canvas = document.getElementById(canvasid);
    var timer=new Timer();
    var selected_ball=-1;
    var dragged_ball=-1;
    var dragged_ball_orig_point;
    function dist(a,b){
        return Math.sqrt( (a.x-b.x)*(a.x-b.x) + (a.y-b.y)*(a.y-b.y) );
    }
    function init_rand(ball){
        ball.pos.x=my_rand(-1+2*radius,1-2*radius);
        ball.pos.y=my_rand(-1+2*radius,1-2*radius);
        ball.speed.x=my_rand(-1,1);
        ball.speed.y=my_rand(1,2);
    }
    function my_rand(min,max){
        var r=Math.random();
        //r=r%1000;
        return r*(max-min)+min;
    };
    function add_spring(_start,_end){
        springs.push({start:_start,end:_end});
    }    
    function init_world(){
        add_spring(0,1);
        add_spring(1,2);
        add_spring(2,0);
        add_spring(3,4);
        add_spring(4,5);
        add_spring(5,3);
        add_spring(0,4);
        for (var i=0;i<10;i++){
            var p= new Ball();
            init_rand(p);
            balls.push(p);
        }
    }    
    function animate(){
        if(timer.time_diff==0)
            return;//not enought time has passed, dont animate-crach fix
        /*dragged_speed=dragged_vec.sub(last_dragged_vec).div(timer.time_diff);
        last_dragged_vec=dragged_vec;
        if (dragged_ball!=-1){
            balls.get2(dragged_ball).pos=dragged_vec.add(find_offset).trim(-1,1);
            balls.get2(dragged_ball).speed=dragged_speed;
        }*/
        if (balls.length==0)
            return;
        if (balls.length==2)
            console.log("before bug")

        balls=calc_new_frame(balls, springs,radius,timer,canvas.width,canvas.height);
    }    
    function find_ball(event){
        for (var i=0;i<balls.length;i++)
            if (dist(event,balls[i].pos)<radius)
                return i
        return -1;

    }
    function point_from_event(event){
        var rect = canvas.getBoundingClientRect();
        return new Vec (
            event.clientX-rect.left,
            event.clientY-rect.top
        );
    }
    function mouseup(event){
        dragged_ball=-1;
    }
    function mousedown(event){

        mousedown_point=point_from_event(event);
        dragged_ball=find_ball(mousedown_point);
        if (dragged_ball==-1)
            balls.push(new Ball(mousedown_point));
        else{
            dragged_ball_orig_point=balls[dragged_ball].pos;
        }
    }
    function mousemove(event){
        if (dragged_ball!=-1){
            newpoint=point_from_event(event);
            newpoint.x-=mousedown_point.x;
            newpoint.y-=mousedown_point.y;
            newpoint.x+=dragged_ball_orig_point.x;
            newpoint.y+=dragged_ball_orig_point.y;
            balls[dragged_ball].pos=newpoint;
            draw();
        }
        mouse_point=point_from_event(event);
        selected_ball=find_ball(mouse_point);
    }
    function formatxy(p){
        return "("+p.x+","+p.y+")";
    }
    function draw() {
        if (!canvas.getContext)
            return;

        timer.mark_time();
        animate()
        origin+=10;
        if (origin>500)
            origin=10
        var ctx = canvas.getContext("2d");
  ctx.canvas.width  = window.innerWidth;
  ctx.canvas.height = window.innerHeight;
          ctx.clearRect(0,0,canvas.width,canvas.height);

        ctx.fillStyle = "rgb(0,0,0)";
        ctx.fill();    
        for (var i=0;i<balls.length;i++){
            ctx.beginPath();
            var ball=balls[i].pos;
            ctx.arc(ball.x,ball.y,radius,0,Math.PI*2,true);
            ctx.fillStyle = "rgba(0, 0, 200, 0.5)";
            if (selected_ball==i)
                ctx.fillStyle = "rgba(200, 0,0 , 0.5)";
            if (dragged_ball==i)
                 ctx.fillStyle = "rgba(0, 100,200 , 0.5)";
            ctx.fill(); 
            ctx.fillStyle = 'white';
            ctx.fillText(i,ball.x,ball.y);
        }
    }
    function attach_handlers(){
        canvas.addEventListener("mouseup", mouseup, false);
        canvas.addEventListener("mousemove", mousemove, false);
        canvas.addEventListener("mousedown", mousedown, false);
        setInterval(draw, 30) 
    }   
    init_world();    
    attach_handlers()
}
})();