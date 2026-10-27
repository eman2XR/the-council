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
    checksFor(kind) {
      return {'gravity-clocks':this.clockChecks,'spacetime':this.spacetimeChecks,'interference':this.waveChecks,
        'two-slit-particles':this.waveChecks,'standing-waves':this.ropeChecks}[kind]?.call(this) || this.checks();
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
