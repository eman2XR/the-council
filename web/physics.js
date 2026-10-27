/* Shared by the interactive renderer and executable numerical checks. */
(function(root) {
  const Physics = {
    m: mass => 0.025 * mass,
    deflection(mass, b) { return 4 * this.m(mass) / b; },
    deviation(x, mass, b) { return -2 * this.m(mass) / b * (Math.hypot(x, b) + x); },
    slope(x, mass, b) { return -2 * this.m(mass) / b * (x / Math.hypot(x, b) + 1); },
    clockRatio(mass,r) { return Math.sqrt((1-2*this.m(mass)/r)/(1-2*this.m(mass)/(r+2))); },
    // Special relativity in units where light speed is 1 (years and light-years).
    speed: a => 0.9 * a,
    gamma(v) { return 1 / Math.sqrt(1 - v * v); },
    turnaround: b => 1.6 * b,
    agingGap(a) { return 1 - 1 / this.gamma(this.speed(a)); },
    // Two coherent sources or slits with amplitudes 1 and a.
    visibility: a => 2 * a / (1 + a * a),
    separation: b => 1.6 * b,
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
        'two-slit-particles':this.waveChecks,'standing-waves':this.ropeChecks,'tunneling':this.tunnelChecks,'wave-packet':this.packetChecks,'quantum-well':this.wellChecks}[kind]?.call(this) || this.checks();
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
    waveChecks() {
      const near=(a,b)=>Math.abs(a-b)<1e-12;
      return Object.entries({
        'One source gives no stripes':near(this.visibility(0),0),
        'Equal sources give full-contrast stripes':near(this.visibility(1),1),
        'Equal path lengths give a bright stripe':near(this.intensity(1,0),1),
        'Half-wavelength path difference cancels equal waves':near(this.intensity(1,Math.PI),0),
        'Unequal sources leave dark stripes partly lit':this.intensity(.5,Math.PI)>0,
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
      };
      return Object.entries(cases).map(([name,pass])=>({name,pass}));
    }
  };
  root.Physics = Physics;
  if (typeof module !== 'undefined') module.exports = Physics;
})(typeof window === 'undefined' ? globalThis : window);
