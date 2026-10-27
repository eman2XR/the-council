"""Supported visual models constrain what the daily planner may promise."""
from .contracts import MODEL_NOTES

CLOCK_NOTES = '''CLOCK MODEL. Two stationary clocks outside a spherical, nonrotating mass.
Use Schwarzschild static-clock comparison: m=GM/c^2=.025*mass, lower radius r=distance,
upper radius R=r+2 (arbitrary units). Rate ratio lower/upper=sqrt((1-2m/r)/(1-2m/R)).
Mass 0..1, r 1..2.5. These are supported stationary observers, not freely falling clocks.
Each clock ticks normally locally; the ratio compares proper times over the same Schwarzschild
coordinate-time interval. Do not conflate this with a distant camera's raw view or Doppler effects.
The animated deficit is magnified 12 times: displayed lower rate=1-12*(1-ratio).
The percentage readout is physical and UNMAGNIFIED. The sketch is not to spatial scale.
Three beats: 1 zero mass/equal rates; 2 add mass/two clocks; 3 adjust mass and lower radius.
Increasing mass increases the deficit; moving the pair outward with fixed separation reduces it.
No black holes, Earth-specific numbers, satellite velocities, or full GPS simulation.
Fields named mass/distance control mass/lower radius. The UI label is "Lower radius" with the hint "gap stays 2 units"; refer to it as "Lower radius". Prefer distance=1 initially so the comparison at 2.5 is clear. ray_count and line_width unused.
Explain gravitational time dilation intuitively without saying a clock is malfunctioning.
The lag is determined by the gravitational potential difference, not by the gradient of gravity (tidal forces). For a small fixed gap, the lag scales with local gravitational acceleration times the gap. Never say the lag is independent of gravity strength. No new-discovery claims; checks validate implementation only.'''

COMMON = '''
Shared player behavior: chapter 1 automatically sets the first control (field "mass") to zero; chapter 2 restores
the scene value; during chapter 3 playback the first control dips and returns, then the second control (field "distance")
sweeps to its maximum 2.5. The viewer reads one subtitle sentence at a time below the stage. ray_count is unused.'''

SPACETIME_NOTES = '''SPACETIME DIAGRAM. Special relativity in flat spacetime, units of years and light-years (light speed 1).
Time runs up the page, space runs right; light moves at 45 degrees, and a shaded light cone from the departure event marks
everything reachable. A home twin stays at rest (vertical worldline, a tick each half year). A traveller leaves at constant
speed v, turns around instantly at home time T and returns at the same speed (straight out-and-back worldline, a dot each half
year of the traveller's own time). Field mass sets v = 0.9*mass (UI "Speed"); field distance sets T = 1.6*distance years
(UI "Trip length"). Moving markers sweep both worldlines upward in step with home time and label each twin's elapsed years.
A dashed line through the traveller shows the traveller's line of simultaneity ("now"); it tilts with speed and swings at
the turnaround. The readout is the real fractional ageing gap 1 - 1/gamma, gamma = 1/sqrt(1-v^2), independent of trip length.
Supported questions: moving clocks tick slowly, relativity of simultaneity, the twin asymmetry (the traveller changes
direction; the paths differ in spacetime length), and why speed stays below light speed (worldlines stay inside the cone).
The instant turnaround is an idealization; no acceleration physics, gravity, Doppler views or what anyone "sees" visually.
Do not claim the traveller feels time slow; each clock ticks normally for its owner. No new-discovery claims.'''+COMMON

INTERFERENCE_NOTES = '''TWO-SOURCE RIPPLE TANK. Top-down view of circular waves of one wavelength from two in-phase point sources,
drawn as crests (accent) and troughs (faint dark), plus a screen strip showing the time-averaged brightness
I = (1 + a^2 + 2a cos(k*path difference)) / (1+a)^2. Field mass sets the second source amplitude a (UI "Second source",
0 means off); field distance sets source spacing 1.6*distance wavelengths (UI "Source spacing"). The readout is fringe
contrast 2a/(1+a^2). Supported questions: superposition (waves add and pass through each other), constructive and
destructive interference, why stripes need two coherent sources, why wider spacing packs stripes closer. Amplitude falls off
as 1/sqrt(distance) (2D). Not to scale; no light/sound specifics beyond analogy, no single-photon claims, no diffraction
from slit width. No new-discovery claims.'''+COMMON

PARTICLE_NOTES = '''ONE-AT-A-TIME TWO-SLIT EXPERIMENT. A source sends particles toward a barrier with two slits; each arrival
appears as one dot on a screen, and a histogram beside the screen fills in. Arrivals are pseudo-random samples drawn from the
predicted probability pattern: a broad single-slit envelope times (1 + a^2 + 2a cos(phase)). Faint ripples spreading from the
source and through each open slit depict the probability amplitude, NOT a particle trajectory; never say the animation shows
which slit a particle used. Field mass sets the second slit's amplitude a (UI "Second slit", 0 closed, 1 fully open);
field distance sets slit spacing (UI "Slit spacing"). show_reference draws the predicted pattern as a dashed curve. The
readout is fringe contrast 2a/(1+a^2). Supported questions: why single particles still build stripes, why closing a slit
removes them, probability amplitudes adding. Do not model measurement/which-path detectors, decoherence, or specific
particles' wavelengths; electrons and photons both show this, but the sketch is generic and not to scale.
No new-discovery claims.'''+COMMON

ROPE_NOTES = '''STANDING WAVES ON A ROPE. A hand shakes the left end of a rope; the right end is tied to a wall. The rope's
shape is a wave travelling right plus a reflected, inverted wave of strength a travelling left:
y = sin(wt - k x) - a sin(wt + k x), with k L = n pi so n half-wavelengths fit. Field mass sets reflection a (UI "Reflection");
field distance steps n through whole numbers 1..5 (UI "Pattern", shown as "n half-waves fit"). show_reference draws both
travelling components dashed. With a = 1 there are still points (nodes) at the wall and n-1 points between; the readout is
node stillness 2a/(1+a). Supported questions: superposition of opposite waves, why only certain patterns (notes) fit between
fixed ends, why higher notes have more nodes. Height exaggerated; partial reflection is an idealized lossy wall; no tension,
mass density, real frequencies or musical-instrument acoustics beyond analogy. No new-discovery claims.'''+COMMON

TUNNEL_NOTES = '''QUANTUM BARRIER (TUNNELLING). Exact steady-state solution of the one-dimensional Schrodinger equation
(units hbar = 1, 2m = 1, particle energy E = 1, wavelength 2 pi) for a stream of particles meeting a rectangular barrier.
Drawn: a band for the barrier; the real part of the wave at one instant (line, rotating in phase over time) and its
magnitude (shaded band). Left of the barrier the incoming and reflected waves overlap into ripples; inside it decays (or
oscillates if the barrier is lower than the energy); right of it the transmitted wave is flat in magnitude.
Field mass sets barrier height V = 2*mass*E (UI "Barrier height", shown as a multiple of the energy, 0 = none); field
distance sets width 0.6*distance (UI "Barrier width", shown in wavelengths). The readout is the exact reflected fraction R;
the canvas prints the transmitted percentage T = 1 - R. Supported questions: how a particle can pass a barrier taller than
its energy, why thicker or taller barriers let less through, why some reflects even from a low barrier. This is a steady
stream, not one particle's path; do not say the particle "borrows energy" or travels inside the barrier classically.
No new-discovery claims.'''+COMMON

PACKET_NOTES = '''WAVE PACKET AND UNCERTAINTY. A free quantum particle's wave built from a Gaussian blend of plane waves
(units hbar = 1, 2m = 1). Top: the real part of the wave (line) and its magnitude (shaded band) along a line; the packet
moves and slowly spreads (correct free-particle dispersion, time slowed down, loops). Bottom: bars showing how strongly
each momentum (wavelength) is blended in. Field mass sets the momentum spread 1.1*mass (UI "Momentum mix"; 0 means one pure
wave with exact momentum, spread over all space); field distance sets the average momentum 2 + 2*(distance - 1)
(UI "Average momentum"). The readout is the momentum spread; for a Gaussian the position spread times the momentum spread
equals one half (the minimum allowed). Supported questions: why pinning down position blurs momentum and vice versa, why
packets spread. Do not describe uncertainty as measurement clumsiness or disturbance; it is a property of waves.
No new-discovery claims.'''+COMMON

WELL_NOTES = '''FINITE SQUARE WELL (ALLOWED ENERGIES). Bound states of a particle in a one-dimensional finite well
(units hbar = 1, 2m = 1), found by solving the standard even/odd matching conditions numerically. Drawn: the well (flat
outside, floor of depth V inside), each allowed energy as a level line with its wave shape drawn on it (the wave leaks
slightly into the walls), and at the bottom the probability of a mix of the two lowest levels sloshing back and forth
(time scaled). Field mass sets depth V = 25*mass (UI "Well depth", 0 = no well); field distance sets width
1 + (distance - 1) (UI "Well width"). The readout is the number of allowed levels; any well in one dimension holds at
least one, deeper or wider wells hold more. Supported questions: why trapped particles have only certain energies
(standing waves that fit), why a bigger well has more and closer levels, why the wave leaks into the walls. Energies are to
scale; wave heights are not. Not an atom model; no spin or 3D. No new-discovery claims.'''+COMMON

TOPICS = {
    'light-bending': {'label':'Light bending', 'question':'Why does gravity bend light?', 'notes':MODEL_NOTES},
    'gravity-clocks': {'label':'Gravity and clocks', 'question':'Why do clocks at different heights tick at different rates?', 'notes':CLOCK_NOTES},
    'spacetime': {'label':'Spacetime diagram', 'question':'Why is the travelling twin younger?', 'notes':SPACETIME_NOTES},
    'interference': {'label':'Wave interference', 'question':'What happens when two waves meet?', 'notes':INTERFERENCE_NOTES},
    'two-slit-particles': {'label':'Particles through two slits', 'question':'Why do particles fired one at a time still make stripes?', 'notes':PARTICLE_NOTES},
    'standing-waves': {'label':'Standing waves', 'question':'Why does a guitar string only play certain notes?', 'notes':ROPE_NOTES},
    'tunneling': {'label':'Quantum tunnelling', 'question':'How can a particle pass through a wall it cannot climb over?', 'notes':TUNNEL_NOTES},
    'wave-packet': {'label':'Wave packets and uncertainty', 'question':"Why can't you pin down both where a particle is and how it moves?", 'notes':PACKET_NOTES},
    'quantum-well': {'label':'Allowed energies in a well', 'question':'Why can a trapped particle only have certain energies?', 'notes':WELL_NOTES},
}
