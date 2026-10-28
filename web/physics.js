/* Shared by the interactive renderer and executable numerical checks. */
(function(root) {
  const Physics = {
    m: mass => 0.025 * mass,
    deflection(mass, b) { return 4 * this.m(mass) / b; },
    deviation(x, mass, b) { return -2 * this.m(mass) / b * (Math.hypot(x, b) + x); },
    slope(x, mass, b) { return -2 * this.m(mass) / b * (x / Math.hypot(x, b) + 1); },
    // Optical geometry for the light mesh: distance is light travel time timed far away, n = 1 + 2mu/R
    // (weak field, isotropic radius R). Embedded as a surface of revolution: circumference radius R + 2mu,
    // height z with (dR)^2 + (dz)^2 = (n dR)^2, so straightest lines on the surface are light paths.
    meshHeight(mu, R) {
      if (mu < 1e-9) return 0;
      const q = Math.sqrt(mu * (R + mu));
      return 4 * (q + mu / 2 * Math.log((q - mu) / (q + mu)));
    },
    // Light path through n = 1 + 2mu/R, entering parallel to x at height b; returns [x, y] points.
    lightPath(mu, b, x0 = -7.5, x1 = 7.5, steps = 360) {
      const accel = (x, y) => { const r = Math.hypot(x, y), n = 1 + 2 * mu / r, g = -2 * mu / (r * r * r) * n; return [g * x, g * y]; };
      let x = x0, y = b, n = 1 + 2 * mu / Math.hypot(x, y), px = n, py = 0;
      const h = (x1 - x0) / steps, points = [[x, y]];
      for (let i = 0; i < steps * 3 && x < x1; i++) {
        // Hamiltonian ray tracing: dx/dt = p, dp/dt = n grad n, with |p| = n.
        const f = (X, Y, PX, PY) => { const [ax, ay] = accel(X, Y); return [PX, PY, ax, ay]; };
        const k1 = f(x, y, px, py), k2 = f(x + h / 2 * k1[0], y + h / 2 * k1[1], px + h / 2 * k1[2], py + h / 2 * k1[3]);
        const k3 = f(x + h / 2 * k2[0], y + h / 2 * k2[1], px + h / 2 * k2[2], py + h / 2 * k2[3]);
        const k4 = f(x + h * k3[0], y + h * k3[1], px + h * k3[2], py + h * k3[3]);
        x += h / 6 * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]); y += h / 6 * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]);
        px += h / 6 * (k1[2] + 2 * k2[2] + 2 * k3[2] + k4[2]); py += h / 6 * (k1[3] + 2 * k2[3] + 2 * k3[3] + k4[3]);
        points.push([x, y]);
      }
      return points;
    },
    clockRatio(mass,r) { return Math.sqrt((1-2*this.m(mass)/r)/(1-2*this.m(mass)/(r+2))); },
    // Special relativity in units where light speed is 1 (years and light-years).
    speed: a => 0.9 * a,
    gamma(v) { return 1 / Math.sqrt(1 - v * v); },
    turnaround: b => 1.6 * b,
    agingGap(a) { return 1 - 1 / this.gamma(this.speed(a)); },
    // Spacetime length of a straight step: the time a clock carried along it shows.
    properTime(t, x) { return Math.sqrt(t * t - x * x); },
    // Two coherent sources or slits with amplitudes 1 and a.
    visibility: a => 2 * a / (1 + a * a),
    separation: b => 1.6 * b,
    // Absolute brightness relative to two equal in-phase sources at a bright stripe (maximum 1).
    brightness(a, phase) { return (1 + a * a + 2 * a * Math.cos(phase)) / 4; },
    intensity(a, phase) { return (1 + a * a + 2 * a * Math.cos(phase)) / ((1 + a) * (1 + a) || 1); },
    // A wave travelling right plus a reflection of strength a travelling left.
    harmonic: b => 1 + Math.round((b - 1) / 1.5 * 4),
    rope(x, t, a, n) { const k = n * Math.PI; return Math.sin(t - k * x) - a * Math.sin(t + k * x); },
    stillness: a => 2 * a / (1 + a),
    // Quantum models in units where hbar = 1 and 2m = 1, so energy E = k^2.
    cx: {
      add:(a,b)=>[a[0]+b[0],a[1]+b[1]], sub:(a,b)=>[a[0]-b[0],a[1]-b[1]],
      mul:(a,b)=>[a[0]*b[0]-a[1]*b[1],a[0]*b[1]+a[1]*b[0]],
      div(a,b){const d=b[0]*b[0]+b[1]*b[1];return [(a[0]*b[0]+a[1]*b[1])/d,(a[1]*b[0]-a[0]*b[1])/d];},
      exp:z=>{const m=Math.exp(z[0]);return [m*Math.cos(z[1]),m*Math.sin(z[1])];},
      scale:(a,s)=>[a[0]*s,a[1]*s], abs2:a=>a[0]*a[0]+a[1]*a[1],
    },
    barrier(a, b) {
      // Particle energy 1 (k = 1) meets a rectangular barrier of height 2a and width 0.6b.
      const C=this.cx, E=1, k=1, V=2*a+(Math.abs(2*a-1)<1e-6?1e-6:0), w=.6*b;
      const q=E>=V?[Math.sqrt(E-V),0]:[0,Math.sqrt(V-E)];
      const i=[0,1], iq=C.mul(i,q), eiqa=C.exp(C.scale(iq,w)), emiqa=C.exp(C.scale(iq,-w));
      const cosqa=C.scale(C.add(eiqa,emiqa),.5), sinqa=C.div(C.sub(eiqa,emiqa),[0,2]);
      const sHalf=C.scale(C.add(C.div([k,0],q),C.div(q,[k,0])),.5);
      const teika=C.div([1,0],C.sub(cosqa,C.mul(i,C.mul(sHalf,sinqa))));
      const t=C.mul(teika,C.exp([0,-k*w]));
      const c=C.mul(C.scale(teika,.5),C.mul(C.add([1,0],C.div([k,0],q)),emiqa));
      const d=C.mul(C.scale(teika,.5),C.mul(C.sub([1,0],C.div([k,0],q)),eiqa));
      const r=C.sub(C.add(c,d),[1,0]);
      const psi=x=>{
        if(x<0)return C.add(C.exp([0,k*x]),C.mul(r,C.exp([0,-k*x])));
        if(x<=w)return C.add(C.mul(c,C.exp(C.scale(iq,x))),C.mul(d,C.exp(C.scale(iq,-x))));
        return C.mul(t,C.exp([0,k*x]));
      };
      return {E,V,w,r,t,T:C.abs2(t),R:C.abs2(r),psi};
    },
    packet(a, b) {
      // Gaussian mix of momenta around k0; the momentum spread is set by the first control.
      const k0=2+2*(b-1), sk=1.1*a, L=48, dk=2*Math.PI/L, comps=[];
      const J=a<1e-6?0:Math.min(40,Math.ceil(4*sk/dk));
      for(let j=-J;j<=J;j++){const kj=k0+j*dk, w=J?Math.exp(-((kj-k0)**2)/(4*sk*sk)):1;if(w>1e-4)comps.push([kj,w]);}
      const norm=Math.sqrt(comps.reduce((s,[,w])=>s+w*w,0));
      const psi=(x,t)=>{let re=0,im=0;for(const [kj,w] of comps){const ph=kj*x-kj*kj*t;re+=w*Math.cos(ph);im+=w*Math.sin(ph);}return [re/norm,im/norm];};
      return {k0,sk,L,comps,psi};
    },
    well(a, b) {
      // Bound states of a finite square well of depth 25a and width 1+(b-1); returns sorted levels.
      const V=25*a, L=1+(b-1), z0=L/2*Math.sqrt(V), levels=[];
      if(V<=0)return {V,L,levels};
      const root=(f,lo,hi)=>{for(let n=0;n<80;n++){const m=(lo+hi)/2;if(f(lo)*f(m)<=0)hi=m;else lo=m;}return (lo+hi)/2;};
      for(let n=0;;n++){
        const even=z=>z*Math.tan(z)-Math.sqrt(Math.max(0,z0*z0-z*z)), odd=z=>-z/Math.tan(z)-Math.sqrt(Math.max(0,z0*z0-z*z));
        let added=false;
        if(z0>n*Math.PI){const z=root(even,n*Math.PI+1e-9,Math.min(n*Math.PI+Math.PI/2-1e-9,z0));levels.push({z,parity:'even'});added=true;}
        if(z0>n*Math.PI+Math.PI/2){const z=root(odd,n*Math.PI+Math.PI/2+1e-9,Math.min(n*Math.PI+Math.PI-1e-9,z0));levels.push({z,parity:'odd'});added=true;}
        if(!added)break;
      }
      for(const l of levels){const k=2*l.z/L;l.E=k*k-V;l.k=k;l.kappa=Math.sqrt(Math.max(0,-l.E));}
      levels.sort((p,q)=>p.E-q.E);
      const psi=(l,x)=>{const h=L/2, inside=l.parity==='even'?Math.cos(l.k*x):Math.sin(l.k*x);
        if(Math.abs(x)<=h)return inside;
        const edge=l.parity==='even'?Math.cos(l.k*h):Math.sin(l.k*h)*Math.sign(x);
        return edge*Math.exp(-l.kappa*(Math.abs(x)-h));};
      return {V,L,levels,psi};
    },
    // Weak gravity, slow motion (schematic units): proper time = T + integral of (g h - v^2/2) dt.
    fall(a, b) {
      const g=.8*a, T=2+2*(b-1), ref=.8*T*T/8, best=g*T*T/8;
      const gain=apex=>(2/3)*g*apex*T-8*apex*apex/(3*T);
      const height=(apex,t)=>4*apex*t*(T-t)/(T*T);
      // The two parts of gain up to time t: height bonus g*integral(h), speed cost integral(v^2/2).
      const bonusUntil=(apex,t)=>g*4*apex/(T*T)*(T*t*t/2-t*t*t/3);
      const costUntil=(apex,t)=>8*apex*apex/Math.pow(T,4)*(T**3-Math.pow(T-2*t,3))/6;
      return {g,T,ref,best,gain,height,bonusUntil,costUntil};
    },
    // A map of height and time bent so straight lines are the paths of most time (weak gravity, schematic units):
    // radius R = 1/g - h, angle g*t. Its flat geometry (1 - g h)^2 dt^2 + dh^2 has the same free-fall paths, h'' = -g.
    fan(a, b) {
      const g=.3*a, T=2+(b-1)*4/3, R0=g>1e-6?1/g:Infinity;
      // The straight chord between the two events, written as a height against time.
      const ball=t=>g>1e-6?R0-R0*Math.cos(g*T/2)/Math.cos(g*(t-T/2)):0;
      const parabola=t=>g*t*(T-t)/2;
      return {g,T,R0,ball,parabola,apex:ball(T/2)};
    },
    // River model of a black hole (Painleve-Gullstrand, light speed 1): space flows inward at sqrt(rs/r).
    river(a, b) {
      const rs=a, re=.6+(b-1), flow=r=>rs>0?Math.sqrt(rs/r):0;
      // Light swims at light speed through the flowing space: dr/dt = +-1 - flow(r).
      const light=(r0,dir,t)=>{let r=r0;const n=Math.ceil(t/.01),h=t/Math.max(1,n),f=r=>dir-flow(Math.max(r,1e-4));
        for(let i=0;i<n&&r>.02&&r<12;i++){const k1=f(r),k2=f(r+h*k1/2),k3=f(r+h*k2/2),k4=f(r+h*k3);r+=h*(k1+2*k2+2*k3+k4)/6;}return r;};
      return {rs,re,flow,light};
    },
    // One toss seen from the ground and from the ball (weak gravity, schematic units). The throw speed is fixed;
    // gravity g = 0.8*a, so with a = 0 the ball keeps going and with a = 1 it comes back after T.
    views(a, b) {
      const g=.8*a, T=2+2*(b-1), v0=.8*T/2;
      const h=t=>v0*t-g*t*t/2, v=t=>v0-g*t;
      return {g,T,v0,h,v};
    },
    // Free fall from rest toward a planet of radius 1 (Newtonian, exact for weak gravity); stops at the surface.
    tides(a) {
      const GM=a;
      const fall=(x0,y0,t)=>{let x=x0,y=y0,vx=0,vy=0;const n=Math.ceil(t/.01),h=t/Math.max(1,n);
        const acc=(x,y)=>{const r=Math.hypot(x,y),k=-GM/(r*r*r);return [k*x,k*y];};
        for(let i=0;i<n&&Math.hypot(x,y)>1;i++){
          const [a1,b1]=acc(x,y),[a2,b2]=acc(x+vx*h/2,y+vy*h/2),[a3,b3]=acc(x+(vx+a1*h/2)*h/2,y+(vy+b1*h/2)*h/2),[a4,b4]=acc(x+(vx+a2*h/2)*h,y+(vy+b2*h/2)*h);
          const dx=(vx+2*(vx+a1*h/2)+2*(vx+a2*h/2)+(vx+a3*h))/6,dy=(vy+2*(vy+b1*h/2)+2*(vy+b2*h/2)+(vy+b3*h))/6;
          x+=h*dx;y+=h*dy;vx+=h*(a1+2*a2+2*a3+a4)/6;vy+=h*(b1+2*b2+2*b3+b4)/6;}
        const r=Math.hypot(x,y);return r<1?[x/r,y/r]:[x,y];};
      // Time to fall from rest at r0 to r (radial free fall).
      const fallTime=(r0,r)=>GM>0?Math.sqrt(r0**3/(2*GM))*(Math.sqrt((r/r0)*(1-r/r0))+Math.acos(Math.sqrt(r/r0))):Infinity;
      return {GM,fall,fallTime};
    },
    // A bathroom scale in a lift reads the floor's push: your weight times (g + a)/g, a being the lift's upward acceleration.
    lift() {
      const g=9.8, reading=a=>Math.max(0,(g+a)/g);
      // One ride in seconds and metres per second squared: rest, speed up, cruise, slow down, rest.
      const ride=[[1.5,0],[2,1.6],[4,0],[2,-1.6],[1.5,0]];
      const accelAt=t=>{let s=0;for(const [d,a] of ride){if(t<s+d)return a;s+=d;}return 0;};
      return {g,reading,ride,accelAt};
    },
    // The Moon's tidal stretch (Newtonian, exact): its pull at a point minus its pull at the Earth's centre.
    // Units: Earth radius 1, the Moon's GM = 1, the Moon on the +x axis at distance D (real distance about 60 Earth radii).
    moonTides(D = 60.3) {
      const pull=(x,y)=>{const dx=D-x,dy=-y,r=Math.hypot(dx,dy);return [dx/r**3,dy/r**3];};
      const centre=pull(0,0), tide=(x,y)=>{const p=pull(x,y);return [p[0]-centre[0],p[1]-centre[1]];};
      // Ocean height along the surface (equilibrium tide shape), with the angle measured from the Earth-Moon line.
      const shape=angle=>(3*Math.cos(angle)**2-1)/2;
      return {D,pull,centre,tide,shape};
    },
    fallGain(a,b){const f=this.fall(a,b);return f.gain(f.best)/f.T;},
    fallChecks() {
      const f=this.fall(1,1.6), scan=Array.from({length:2001},(_,i)=>i/2000*2*f.ref), top=scan.reduce((m,x)=>f.gain(x)>f.gain(m)?x:m,0);
      const near=(x,y,e=1e-9)=>Math.abs(x-y)<e;
      return Object.entries({
        'Without gravity the straight path keeps the most time':this.fall(0,1.6).best===0&&this.fallGain(0,1.6)===0,
        'Most-time path peaks at the free-fall height gT²/8':Math.abs(top-f.best)<f.ref/1000,
        'Going higher or lower than free fall gains less':f.gain(f.best)>f.gain(f.best*.7)&&f.gain(f.best)>f.gain(f.best*1.3),
        'Time gained equals g²T²/24':near(this.fallGain(1,1.6),f.g*f.g*f.T*f.T/24,1e-12),
        'Stronger gravity throws the best path higher':this.fall(1,1.6).best>this.fall(.5,1.6).best,
        'Height bonus minus speed cost over the flight equals the gain':near(f.bonusUntil(f.best*1.3,f.T)-f.costUntil(f.best*1.3,f.T),f.gain(f.best*1.3),1e-12),
        'Throwing twice as high as free fall gains nothing':near(f.gain(2*f.best),0,1e-12),
        'Both paths start and end at the same events':near(f.height(f.best,0),0)&&near(f.height(f.best,f.T),0),
      }).map(([name,pass])=>({name,pass}));
    },
    // Single gap: width shrinks from 4.2 to 0.7 units as the first control rises (0 = no barrier); wavelength 0.7 to 1.15.
    gap(a, b) {
      const lambda=.7+.3*(b-1), width=a<.005?Infinity:.7*(6-5*a);
      return {lambda,width,sinMin:width===Infinity?0:Math.min(1,lambda/width)};
    },
    spreadAngle(a,b){const g=this.gap(a,b);return Math.asin(g.sinMin)*180/Math.PI;},
    singleSlit(a,b,sinTheta){const g=this.gap(a,b);if(g.width===Infinity)return sinTheta===0?1:0;const x=Math.PI*g.width*sinTheta/g.lambda;return x===0?1:(Math.sin(x)/x)**2;},
    gapChecks() {
      const near=(x,y,e=1e-9)=>Math.abs(x-y)<e, g=this.gap(.6,1.5);
      return Object.entries({
        'No barrier means no spreading':this.spreadAngle(0,1.5)===0,
        'First dark direction sits where sin(angle) = wavelength / gap':near(this.singleSlit(.6,1.5,g.lambda/g.width),0,1e-20),
        'A narrower gap spreads the wave wider':this.spreadAngle(1,1.5)>this.spreadAngle(.4,1.5),
        'A longer wavelength spreads wider':this.spreadAngle(.6,2.5)>this.spreadAngle(.6,1),
        'Straight ahead is the brightest direction':this.singleSlit(.6,1.5,0)===1&&this.singleSlit(.6,1.5,.05)<1,
        'A gap narrower than the wavelength spreads to every side':near(this.gap(1,1.5).sinMin,1),
      }).map(([name,pass])=>({name,pass}));
    },
    reflected(a,b){return this.barrier(a,b).R;},
    momentumSpread(a){return 1.1*a;},
    levelCount(a,b){return this.well(a,b).levels.length;},
    tunnelChecks() {
      const near=(x,y,e=1e-9)=>Math.abs(x-y)<e, cases=[[.8,1],[.8,2.5],[.3,1.6],[1,1.4]];
      const deep=this.barrier(1,2.5), C=this.cx, b=this.barrier(.8,1.7);
      const k=1,kappa=Math.sqrt(2*.8-1),w=.6*1.7, analytic=1/(1+(2*.8)**2*Math.sinh(kappa*w)**2/(4*1*(2*.8-1)));
      return Object.entries({
        'No barrier lets everything through':near(this.barrier(0,1.5).T,1),
        'Reflected plus transmitted is always 100%':cases.every(([a,c])=>near(this.barrier(a,c).T+this.barrier(a,c).R,1,1e-9)),
        'A wider barrier lets less through':this.barrier(.8,2.5).T<this.barrier(.8,1).T,
        'Some still gets through a barrier taller than the energy':deep.T>0&&deep.V>deep.E,
        'Wave is continuous at both barrier edges':C.abs2(C.sub(b.psi(-1e-9),b.psi(1e-9)))<1e-12&&C.abs2(C.sub(b.psi(b.w-1e-9),b.psi(b.w+1e-9)))<1e-12,
        'Transmission matches the textbook formula':near(b.T,analytic,1e-9),
      }).map(([name,pass])=>({name,pass}));
    },
    packetChecks() {
      const spread=(a,t=0)=>{const p=this.packet(a,1.5);let s=0,s1=0,s2=0;const n=3000;
        for(let i=0;i<n;i++){const x=-p.L/2+p.L*i/n, v=this.cx.abs2(p.psi(x,t));s+=v;s1+=v*x;s2+=v*x*x;}const m=s1/s;return Math.sqrt(s2/s-m*m);};
      const sx=spread(.6), sk=this.momentumSpread(.6);
      return Object.entries({
        'A single momentum is one pure wave':this.packet(0,1.5).comps.length===1,
        'Narrower momentum mix gives a wider packet':spread(.3)>spread(.9),
        'Position spread times momentum spread is the minimum, one half':Math.abs(sx*sk-.5)<.02,
        'A packet spreads out as it moves':spread(.6,.4)>spread(.6,0),
        'Momentum spread readout is zero for one wave':this.momentumSpread(0)===0,
        'Total probability is the same for any mix':[.3,.9].every(a=>{const q=this.packet(a,1.5);let s=0;const n=4000;for(let i=0;i<n;i++)s+=this.cx.abs2(q.psi(-q.L/2+q.L*i/n,0))*q.L/n;return Math.abs(s/q.L-1)<1e-6;}),
      }).map(([name,pass])=>({name,pass}));
    },
    wellChecks() {
      const w=this.well(1,2.5), E=w.levels.map(l=>l.E), deep=this.well(1,2.5);
      return Object.entries({
        'No well holds no levels':this.levelCount(0,1.5)===0,
        'Any well in one dimension holds at least one level':this.levelCount(.02,1)>=1,
        'Deeper and wider wells hold more levels':this.levelCount(1,2.5)>this.levelCount(.3,1),
        'Levels sit between the well floor and zero':E.every(e=>e>-w.V&&e<0),
        'Levels alternate even and odd shapes':w.levels.every((l,i)=>l.parity===(i%2?'odd':'even')),
        'Lowest level lies below the infinite-well value':(deep.levels[0].E+deep.V)<(Math.PI/deep.L)**2,
      }).map(([name,pass])=>({name,pass}));
    },
    checksFor(kind) {
      return {'gravity-clocks':this.clockChecks,'spacetime':this.spacetimeChecks,'interference':this.waveChecks,
        'two-slit-particles':this.waveChecks,'standing-waves':this.ropeChecks,'tunneling':this.tunnelChecks,'wave-packet':this.packetChecks,'quantum-well':this.wellChecks,'falling-time':this.fallChecks,'diffraction':this.gapChecks,'twin-trip':this.spacetimeChecks,'spacetime-paths':this.pathChecks,'fall-fan':this.fanChecks,'fall-cone':this.fanChecks,'river':this.riverChecks,'fall-views':this.viewsChecks,'tides':this.tidesChecks,'lift':this.liftChecks,'moon-tides':this.moonChecks}[kind]?.call(this) || this.checks();
    },
    spacetimeChecks() {
      const near=(a,b)=>Math.abs(a-b)<1e-12, g=this.gamma(this.speed(1));
      return Object.entries({
        'Zero speed gives equal ages':near(this.agingGap(0),0),
        'Faster trips widen the age gap':this.agingGap(1)>this.agingGap(.5),
        'Time-dilation factor at 0.6 light speed is 1.25':near(this.gamma(.6),1.25),
        'Traveller worldline stays inside the light cone':this.speed(1)<1,
        'Round-trip traveller time is home time divided by the factor':near(2*this.turnaround(2.5)/g,2*this.turnaround(2.5)*(1-this.agingGap(1))),
        'Trip length does not change the percentage gap':near(1-1/this.gamma(this.speed(.7)),this.agingGap(.7)),
      }).map(([name,pass])=>({name,pass}));
    },
    pathChecks() {
      const near=(a,b)=>Math.abs(a-b)<1e-12, T=this.turnaround(2.5), v=this.speed(8/9*1);
      const bent=(x,t,H)=>this.properTime(t,x)+this.properTime(H-t,x);
      const kinks=Array.from({length:50},(_,i)=>[(i%10)/10*.9*((i/10|0)+1)*.8,((i/10|0)+1)*.8]);
      return [...this.spacetimeChecks(),...Object.entries({
        'Worked example: 10 years out at 8 light-years gives 6 years':near(this.properTime(10,8),6),
        'Each leg holds the home time divided by the factor':near(this.properTime(T,v*T),T/this.gamma(v)),
        'Light’s path has zero length':this.properTime(3,3)===0,
        'Every bent path holds less time than the straight one':kinks.every(([x,t])=>x===0||bent(x,t,8)<8),
        'A wider turnaround holds less time':bent(2,4,8)<bent(1,4,8),
      }).map(([name,pass])=>({name,pass}))];
    },
    fanChecks() {
      const f=this.fan(1,2.5), near=(x,y,e)=>Math.abs(x-y)<e, s=.002*f.T;
      const curv=[.25,.5,.75].map(u=>{const t=u*f.T;return (f.ball(t+s)-2*f.ball(t)+f.ball(t-s))/(s*s);});
      return Object.entries({
        'Without gravity the map stays flat and the best path is staying put':this.fan(0,2).ball(1)===0&&this.fan(0,2).R0===Infinity,
        'Straight line on the bent map starts and ends on the ground':near(f.ball(0),0,1e-12)&&near(f.ball(f.T),0,1e-12),
        'Its height matches the free-fall arc to within 5 percent':near(f.apex,f.parabola(f.T/2),.05*f.parabola(f.T/2)),
        'It falls with acceleration close to g':curv.every(c=>near(-c,f.g,.25*f.g)),
        'Weaker gravity matches free fall more closely':Math.abs(this.fan(.2,2.5).apex/this.fan(.2,2.5).parabola(this.fan(.2,2.5).T/2)-1)<Math.abs(f.apex/f.parabola(f.T/2)-1),
      }).map(([name,pass])=>({name,pass}));
    },
    riverChecks() {
      const R=this.river(1,1.8), near=(x,y,e=1e-9)=>Math.abs(x-y)<e;
      return Object.entries({
        'Flow reaches light speed exactly at the horizon':near(R.flow(R.rs),1),
        'Flow equals the Newtonian escape speed sqrt(2GM/r)':near(R.flow(4),Math.sqrt(2*(R.rs/2)/4)),
        'Outgoing light just outside the horizon still escapes':R.light(1.2,1,4)>1.2,
        'Outgoing light at the horizon stands still':near(R.light(1,1,2),1,1e-6),
        'Outgoing light inside the horizon is swept inward':R.light(.8,1,.2)<.8,
        'With no mass, light moves at light speed':near(this.river(0,1.8).light(1,1,1.5),2.5,1e-9),
      }).map(([name,pass])=>({name,pass}));
    },
    viewsChecks() {
      const V=this.views(1,1.6), near=(x,y,e)=>Math.abs(x-y)<e, n=4000, dt=V.T/n;
      let ground=0, ball=0;
      // From the ground: height gains time, speed loses it. From the ball: only the ground's motion costs time.
      for(let i=0;i<n;i++){const t=(i+.5)*dt;ground+=(V.g*V.h(t)-V.v(t)**2/2)*dt;ball+=(V.v(t)**2/2)*dt;}
      const gain=k=>{let s=0;for(let i=0;i<n;i++){const t=(i+.5)*dt;s+=(V.g*k*V.h(t)-(k*V.v(t))**2/2)*dt;}return s;};
      return Object.entries({
        'Without gravity the tossed ball keeps going in a straight line':near(this.views(0,1.6).h(2),2*this.views(0,1.6).h(1),1e-12),
        'With gravity the ball comes back to the hand at the catch':near(V.h(V.T),0,1e-12),
        'Seen from the ball, the ground speeds up at g (it is pushed)':near(-(V.h(1.01)-2*V.h(1)+V.h(.99))/1e-4,V.g,1e-6),
        'Ground view and ball view give the same extra time for the ball':near(ground,ball,1e-6)&&near(ball,V.g**2*V.T**3/24,1e-6),
        'The real toss keeps more time than a lower or higher one':gain(1)>gain(.7)&&gain(1)>gain(1.3),
      }).map(([name,pass])=>({name,pass}));
    },
    tidesChecks() {
      const P=this.tides(1), d=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]), t=1.2;
      const side=[P.fall(-.1,3,t),P.fall(.1,3,t)], stack=[P.fall(0,3,t),P.fall(0,3.2,t)], e=1e-3, s=.2;
      const sq=P.fall(e,3,s)[0]-e, st=(P.fall(0,3+e,s)[1]-P.fall(0,3,s)[1])-e;
      const gap=lat=>2*Math.asin(Math.cos(lat)*Math.sin(.35));
      return Object.entries({
        'Walkers heading north from the equator close their gap to zero at the pole':gap(Math.PI/2)<1e-12&&gap(1)<gap(.5),
        'Balls released side by side drift together':d(...side)<.2,
        'Balls released one above the other drift apart':d(...stack)>.2,
        'Stretching starts at twice the squeezing':Math.abs(st/sq+2)<.05,
        'Without the planet nothing drifts':this.tides(0).fall(.1,3,2)[0]===.1&&this.tides(0).fall(.1,3,2)[1]===3,
        'Fall time from the formula matches the simulation':Math.abs(Math.hypot(...P.fall(0,2.3,P.fallTime(2.3,1.5)))-1.5)<1e-3,
      }).map(([name,pass])=>({name,pass}));
    },
    liftChecks() {
      const L=this.lift(), near=(x,y,e=1e-9)=>Math.abs(x-y)<e;
      const net=L.ride.reduce((s,[d,a])=>s+d*a,0);
      // In free fall you and a released apple speed up together, so the gap between you stays the same.
      const gap=t=>(1.2-.5*L.g*t*t)-(0-.5*L.g*t*t);
      return Object.entries({
        'Parked, the scale reads your weight':near(L.reading(0),1),
        'Speeding up upward, it reads more':L.reading(2.5)>1,
        'Slowing on the way up, it reads less':L.reading(-2.5)<1,
        'With the cable snapped, it reads zero':L.reading(-L.g)===0,
        'A released apple keeps its place beside you':near(gap(0),gap(2.5)),
        'The ride starts and ends at rest':near(net,0),
      }).map(([name,pass])=>({name,pass}));
    },
    moonChecks() {
      const M=this.moonTides(), far=this.moonTides(2*M.D), near=(x,y,e)=>Math.abs(x-y)<e;
      const a=M.tide(1,0)[0], b=-M.tide(-1,0)[0], side=-M.tide(0,1)[1];
      const peaks=Array.from({length:360},(_,i)=>M.shape(i*Math.PI/180)).filter((v,i,arr)=>v>arr[(i+359)%360]&&v>=arr[(i+1)%360]).length;
      return Object.entries({
        'The near side is pulled toward the Moon more than the centre':a>0,
        'The far side is pulled less than the centre, so it is left behind':b>0,
        'The sides are squeezed inward':side>0,
        'Near and far bulges are almost equal at the real distance':near(a/b,1,.06),
        'The squeeze is about half the stretch':near(side/((a+b)/2),.5,.03),
        'Twice as far away, the stretch is about eight times weaker':near(far.tide(1,0)[0]*8/a,1,.03),
        'Two high tides in one turn of the Earth':peaks===2,
      }).map(([name,pass])=>({name,pass}));
    },
    waveChecks() {
      const near=(a,b)=>Math.abs(a-b)<1e-12;
      return Object.entries({
        'One source gives no stripes':near(this.visibility(0),0),
        'Equal sources give full-contrast stripes':near(this.visibility(1),1),
        'Equal path lengths give a bright stripe':near(this.intensity(1,0),1),
        'Half-wavelength path difference cancels equal waves':near(this.intensity(1,Math.PI),0),
        'Unequal sources leave dark stripes partly lit':this.intensity(.5,Math.PI)>0,
        'Two equal sources make bright stripes four times one source':near(this.brightness(1,0),4*this.brightness(0,0)),
        'Wider separation packs stripes closer':this.separation(2.5)>this.separation(1),
      }).map(([name,pass])=>({name,pass}));
    },
    ropeChecks() {
      const near=(a,b)=>Math.abs(a-b)<1e-12, n=3, ts=[.3,1.1,2.9];
      return Object.entries({
        'Full reflection makes still points':ts.every(t=>[0,1/3,2/3,1].every(x=>Math.abs(this.rope(x,t,1,n))<1e-12)),
        'No reflection leaves no still points':ts.some(t=>Math.abs(this.rope(1/6,t,0,n))>.5)&&ts.some(t=>Math.abs(this.rope(1/3,t,0,n))>.5),
        'Slider steps through whole-number patterns 1 to 5':this.harmonic(1)===1&&this.harmonic(2.5)===5,
        'Node stillness is zero without reflection':near(this.stillness(0),0),
        'Node stillness is complete with full reflection':near(this.stillness(1),1),
        'Antinodes reach the sum of both amplitudes':Math.abs(Math.max(...Array.from({length:400},(_,i)=>Math.abs(this.rope(1/6,i/20,1,n))))-2)<1e-3,
      }).map(([name,pass])=>({name,pass}));
    },
    clockChecks() {
      const q=(m,r)=>this.clockRatio(m,r), near=(a,b)=>Math.abs(a-b)<1e-12;
      return Object.entries({
        'Zero mass gives equal clock rates':near(q(0,1),1),
        'Lower stationary clock accumulates less time':q(1,1)<1 && q(1,1)>0,
        'More mass increases the clock difference':q(1,1)<q(.5,1),
        'Moving both clocks outward reduces the difference':q(1,2.5)>q(1,1),
        'Ratio matches analytic Schwarzschild value':near(q(1,1),Math.sqrt(57/59)),
        'Magnified clock motion stays positive':1-12*(1-q(1,1))>0,
      }).map(([name,pass])=>({name,pass}));
    },
    checks() {
      const near = (a,b) => Math.abs(a-b) < 1e-10;
      const cases = {
        'No mass gives a straight ray': near(this.deviation(5,0,1),0),
        'Doubling mass doubles weak-field deflection': near(this.deflection(1,1),2*this.deflection(.5,1)),
        'Doubling passing distance halves deflection': near(this.deflection(.5,2),this.deflection(.5,1)/2),
        'Far-field slope agrees with 4m/b': Math.abs(this.slope(1e6,.7,1.25)+this.deflection(.7,1.25))<1e-9,
        'Bending points toward the mass': this.deviation(3,.7,1.25)<0,
        'Controls remain in the weak-field regime': this.m(1)/1 <= .025,
        'Flat mesh when there is no mass': this.meshHeight(0,3)===0 && this.lightPath(0,1).every(p=>p[1]===1),
        'Mesh distances equal light travel time': [.5,1,3,7].every(R=>{const mu=.15,d=1e-5,dz=this.meshHeight(mu,R+d)-this.meshHeight(mu,R);
          return Math.abs(Math.hypot(d,dz)-(1+2*mu/R)*d)<1e-8;}),
        'Straightest mesh line bends by 4m/b for a light mass': (()=>{const mu=1e-4,b=1.25,X=7.5,p=this.lightPath(mu,b,-X,X,2000),
          a=p.at(-1),c=p.at(-2),bend=-Math.atan2(a[1]-c[1],a[0]-c[0]);return Math.abs(bend/(4*mu/b*X/Math.hypot(X,b))-1)<.02;})(),
        'Mesh light path bends toward the mass': this.lightPath(.15,1).at(-1)[1]<1,
      };
      return Object.entries(cases).map(([name,pass])=>({name,pass}));
    }
  };
  root.Physics = Physics;
  if (typeof module !== 'undefined') module.exports = Physics;
})(typeof window === 'undefined' ? globalThis : window);
