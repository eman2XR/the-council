/* Shared by the interactive renderer and executable numerical checks. */
(function(root) {
  const Physics = {
    m: mass => 0.025 * mass,
    deflection(mass, b) { return 4 * this.m(mass) / b; },
    deviation(x, mass, b) { return -2 * this.m(mass) / b * (Math.hypot(x, b) + x); },
    slope(x, mass, b) { return -2 * this.m(mass) / b * (x / Math.hypot(x, b) + 1); },
    clockRatio(mass,r) { return Math.sqrt((1-2*this.m(mass)/r)/(1-2*this.m(mass)/(r+2))); },
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
