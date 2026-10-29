"""Supported visual models constrain what the daily planner may promise."""
from .contracts import MODEL_NOTES

CLOCK_NOTES = '''CLOCK MODEL. Two stationary clocks outside a spherical, nonrotating mass.
Use Schwarzschild static-clock comparison: m=GM/c^2=.025*mass, lower radius r=distance,
upper radius R=r+2 (arbitrary units). Rate ratio lower/upper=sqrt((1-2m/r)/(1-2m/R)).
Mass 0..1, r 1..2.5. These are supported stationary observers, not freely falling clocks.
Each clock ticks normally locally; the ratio compares proper times over the same Schwarzschild
coordinate-time interval. Do not conflate this with a distant camera's raw view or Doppler effects.
The animated deficit is magnified 12 times (disclosed in the investigation details): displayed lower rate=1-12*(1-ratio).
The percentage readout is physical and UNMAGNIFIED. The sketch is not to spatial scale.
Three beats: 1 zero mass/equal rates; 2 add mass/two clocks; 3 adjust mass and lower radius.
Increasing mass increases the deficit; moving the pair outward with fixed separation reduces it.
No black holes, Earth-specific numbers, satellite velocities, or full GPS simulation.
Fields named mass/distance control mass/lower radius. The UI label is "Lower radius" with the hint "gap stays 2 units"; refer to it as "Lower radius". Prefer distance=1 initially so the comparison at 2.5 is clear. ray_count and line_width unused.
Explain gravitational time dilation intuitively without saying a clock is malfunctioning.
The lag is determined by the gravitational potential difference, not by the gradient of gravity (tidal forces). For a small fixed gap, the lag scales with local gravitational acceleration times the gap. Never say the lag is independent of gravity strength. No new-discovery claims; checks validate implementation only.'''

COMMON = '''
Shared player behaviour: a scene has three or four chapters. Chapter 1 automatically sets the first control (field
"mass") to zero; later chapters use the scene values. In the last chapter, unless this model says otherwise, playback
demonstrates the controls: during its first half the first control dips to about half and returns; during its second half
the second control (field "distance") moves to 2.5. Write the last chapter's sentences to describe those changes in that
order. The viewer reads one subtitle sentence at a time below the stage; screenshots show exactly what playback shows.
ray_count is unused. The stage carries no scale or magnification disclaimers: drawings are illustrations, and each model's
caveats are shown once in the investigation details. Do not ask for on-stage "not to scale" or "magnified" labels.
Field controls chooses which sliders the viewer gets: none, first, second or both. Offer a slider only when moving
it builds intuition beyond what playback already shows; otherwise choose none.'''

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

ROPE_NOTES = '''STANDING WAVES ON A ROPE. A drawn hand shakes one end of a rope tied to a wall; the rope is simulated
with the damped wave equation (length 1, wave speed 2, a little friction), so the slowest in-step shaking is one shake a
second (all slowed down). Five chapters with fixed choreography and no slider demo: 1 one shake, a hump runs to the wall and
comes back upside down (shown extra slowly); 2 steady shaking at 1 a second, in step, the swing builds to about 6 times
the hand's; 3 shaking at 1.5 a second, out of step, the rope only jiggles; 4 shaking at 2 a second (two loops and a still
point) then, from the chapter's second sentence, 3 a second (three loops); 5 a guitar string, plucked open
(220 Hz) and, from the third sentence, pressed at the middle and plucked again (440 Hz). The rope is silent; only plucks sound. Labels: your hand, tied to a wall, shakes a
second, in step: N loops, still point, out of step. Readout: the steady swing for the current shaking, as a multiple of the
hand's. Sound: a tone at 220 Hz per shake a second, as loud as the rope swings. After playback the field distance sets the
shaking rate 0.5 + 2*(distance - 1) (UI "How fast you shake"); field mass is how hard the hand shakes. Supported questions:
why a string rings only at certain notes, why in-step shaking builds a big swing (like pushing a swing), why still
points appear. No tension, mass density or real instrument acoustics beyond analogy. No new-discovery claims.'''+COMMON

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
slightly into the walls and gently vibrates like a plucked string), and an energy ladder showing that only these
rungs are allowed. Field mass sets depth V = 25*mass (UI "Well depth", 0 = no well); field distance sets width
1 + (distance - 1) (UI "Well width"). The readout is the number of allowed levels; any well in one dimension holds at
least one, deeper or wider wells hold more. Supported questions: why trapped particles have only certain energies
(standing waves that fit), why a bigger well has more and closer levels, why the wave leaks into the walls. Energies are to
scale; wave heights are not. Not an atom model; no spin or 3D. No new-discovery claims.'''+COMMON

FALL_NOTES = '''MOST-TIME PATH (WHY THINGS FALL). Weak gravity, slow motion, schematic units with effects hugely exaggerated.
Two clocks leave the ground together and meet again a time T later: one is held at the ground, one is thrown up and falls
back. Between those same two events, a path's elapsed (proper) time is T plus the integral of (g h - v^2/2): height gains
time because clocks run faster higher up, speed loses time. Drawn: height against time with
warm shading where clocks run slower, a side view of the same throw straight up, four paths between the same two events
(held at the ground, a low throw, the real throw with apex g T^2 / 8, a high throw at 1.75 times that), and a scoreboard
that builds up each path's height gain and speed loss as the clocks travel, with a tick at the total; the real throw ends
with the most time, a throw twice as high gains nothing. With gravity off, every throw only loses and staying put wins. Field mass sets gravity
g = 0.8*mass (UI "Gravity", 0 = none); field distance sets T = 2 + 2*(distance - 1) (UI "Time in the air"). The readout is
the best path's extra time as a fraction of T, g^2 T^2 / 24 in these units. Supported questions: if gravity slows time,
why do things fall; why free fall is the path of most elapsed time; why gravity is mostly a time effect for slow objects.
This is the weak-field, low-speed limit only; not a black hole, orbit or precise Earth numbers. No new-discovery claims.'''+COMMON

GAP_NOTES = '''SINGLE-GAP DIFFRACTION. Top-down ripple tank: a plane wave of one wavelength arrives at a barrier with one
gap; below the gap the wave is drawn as a Huygens sum of in-phase point sources across the gap (crests accent, troughs faint
dark). A screen strip shows the time-averaged single-slit pattern I = (sin x / x)^2, x = pi * gap * sin(angle) / wavelength,
with dashed lines at the first dark directions sin(angle) = wavelength / gap. Field mass sets the gap: 0 removes the barrier
entirely (no spreading); higher values narrow it from 4.2 to 0.7 units (UI "Gap"). Field distance sets the wavelength
0.7 to 1.15 units (UI "Wavelength"). The readout is the angle of the first dark direction (90 degrees when the gap is
narrower than the wavelength). Supported questions: why waves spread after a narrow gap, why narrower gaps and longer
waves spread more, why sound bends around doorways more than light. Not to scale; no single-photon claims.
No new-discovery claims.'''+COMMON

TWIN_NOTES = '''TWIN TRIP. Special relativity, exact, in years and light-years (light speed 1), drawn as a concrete scene:
Earth on the left, a destination star on the right, and a rocket that flies out at constant speed v, turns around
instantly, and flies back. Below, each twin has an age bar that grows with that twin's own time, with one notch per birthday
and a small clock beside it (one turn per year); at the reunion one line states how many years younger the traveller is.
Field mass sets v = 0.9*mass (UI "Speed", shown as a percentage of light speed; 0 keeps the rocket on Earth); field
distance sets the turnaround at T = 1.6*distance home years (UI "Trip"). The star's distance v*T light-years is labelled.
The readout is the real ageing gap 1 - 1/gamma, independent of trip length. Supported questions: why a moving clock
ticks slowly, why the travelling twin is younger, why nothing can be pushed past light speed (gamma grows without
limit as v approaches 1). Each clock ticks normally for its owner; do not say the traveller feels time slow. The instant
turnaround is an idealization; no acceleration physics, gravity or Doppler views. No new-discovery claims.'''+COMMON

PATHS_NOTES = '''SPACETIME PATHS (WHY THE TRAVELLER IS YOUNGER). Special relativity in flat spacetime, years and light-years
(light speed 1). Each chapter has its own drawing, and there is no slider demo. Chapter 1: a map of space and time (time up,
distance from Earth sideways), light's dotted 45-degree path, one dot per year on each twin's path; the first control is
zero, so both twins share one straight path. Chapter 2: two light clocks (light bouncing between two mirrors, one tick per
crossing), one on Earth and one on a rocket moving at v, seen from Earth: the rocket's light must slant to hit the moving
mirrors, a longer path at the same speed, so each tick takes longer; tick counters and a line "the rocket clock ticks N
times for every 10 on Earth". Chapter 3: the trip on the map, out to a star v*T light-years away and back; the traveller's
slow clock gives fewer dots; readouts "Home twin's clock" and "Traveller's clock" in years, "Each leg: T years pass on Earth,
T/gamma on the traveller's slow clock", and at the reunion how many years younger the traveller is. An optional chapter 4
holds the finished trip for discussion, for example why the home twin is not the younger one: while both coast each sees
the other's clock run slow, but only the traveller turns around and feels it, so only their path bends; between two
meetings the straight path holds the most time, though on the map the bent one looks longer. Field mass sets v = 0.9*mass
(UI "Speed"); field distance sets T = 1.6*distance years (UI "Trip"); the viewer can drag the turnaround. Prefer speeds
where the numbers do not coincide (for example mass 0.9623 gives 87% of light speed and exactly half the time). The
readout is "Traveller's clock counts less by" 1 - 1/gamma, independent of trip length. Define a light-year when it is
used. Each clock ticks normally for its owner. The turnaround is instant; no acceleration physics, gravity or Doppler views.
No new-discovery claims.'''+COMMON
LIGHT_CLOCK_NOTES = '''LIGHT CLOCK (WHY A MOVING CLOCK TICKS SLOWLY). Special relativity; light's speed is the same for every
observer, as experiments since 1887 show. Drawn: two light clocks, each two mirrors with light bouncing between them, one
tick per crossing. Top: a clock on Earth whose light goes straight up and down. Bottom: the same kind of clock on a rocket
moving right at speed v, seen from Earth; its light must slant to hit the moving mirrors, tracing a dashed zigzag, a longer
path at the same speed, so each tick takes longer; the rocket crosses the stage once per chapter. Dots along both light
paths mark equal steps of time, so light visibly covers the same distance per step but needs more steps on the slant. Each
clock's label carries its tick count, and after a few seconds a line says how many times the rocket clock ticks for every
10 on Earth (10/gamma). In the last chapter playback speeds the rocket up to 90% of light speed (no dip), so write that
chapter about approaching light speed. Field mass sets v = 0.9*mass (UI "Speed", shown as a percentage of light speed; 0 parks the rocket and
the clocks agree); field distance is unused, so set controls to "first" or "none". The readout is how much slower the
rocket clock ticks, 1 - 1/gamma. Supported questions: why a moving clock ticks slowly, why the effect only matters near
light speed, why clocks agree again when the rocket stops. Honesty points: the rocket clock ticks normally for anyone on
board; the slowing is how the moving clock runs as measured from Earth, and the crew would say the same of Earth's clocks
while both coast; every kind of clock, and the crew's bodies, slow the same way, or the crew could tell they were moving.
No twin-paradox resolution, acceleration, gravity or Doppler effects. Slowed down for viewing and not to scale.
No new-discovery claims.'''+COMMON

ATTENTION_NOTES = '''ATTENTION (WHICH WORDS MATTER TO EACH OTHER). Scaled dot-product attention, the core step of the Transformer from
the 2017 paper "Attention Is All You Need" (Vaswani and others), computed exactly on one tiny hand-made example. The sentence
"The animal didn't cross the street because it was too tired" is drawn as a row of word tiles (on phones, one row per
word). The asking word is "it", highlighted. Each word offers a key (what it is) and carries a value (what it means, drawn
as that word's colour); "it" has a query (what it looks for), shown as "it asks: which thing here could be tired?". Each
word's share of attention is the softmax of the query times that word's key, divided by the square root of the vector
length (four numbers here): shares are positive and add up to 100%, and "it" also gives a small share to itself (printed
under its tile, no line). A line runs from every other word into "it", thicker for a bigger share, with dots in the word's
colour flowing along it into "it"; the
share is printed under the word. A bar at the bottom shows what "it" takes in: the words' colours side by side in
proportion to their shares, labelled for example "mostly 'animal'"; the strip on the "it" tile shows the blended colour.
A caption states the focus ("focus off: every word gets the same share", "focus 100%: the attention formula itself").
Field mass sets Focus (UI "Focus", 0..1), which scales the scores before the softmax: at 0 every word gets an equal share
(9% each, a muddy blend of everything); at 1 it is the formula itself: about 70% goes to "animal", about 10% to "street",
about 4% to "it" and about 2% to each other word. Field distance chooses the last word (UI "Last word"): below about 1.6
"tired", above about 1.9 "wide", swapped smoothly in between. With "wide" the question becomes "which thing here could be
wide?" and about 70% goes to "street". The readout names the word "it" looks at most, with its share.
Choreography: chapter 1 has Focus at zero (equal shares); later chapters use the scene's mass (use 1) and distance (use 1,
so the sentence ends in "tired"). In the last chapter, playback first dips Focus to about half and back (the shares spread
out, about 30% on "animal", then sharpen again), then swaps the last word to "wide" about two thirds of the way through the
chapter, and the attention moves to "street". Write the last chapter's sentences in that order.
Supported questions: how a language AI works out which words in a sentence matter to each other; how "it" gets linked to the
right word; what the attention in "Attention Is All You Need" computes; why the shares add up to 100%; why the same word
looks at different words in different sentences. Honesty points: the numbers are hand-made to show the mechanism, not taken
from a trained model. Real models learn their queries, keys and values from huge amounts of text, use hundreds of numbers
per word, run many attention heads side by side and stack many layers. Here the question "it" asks already depends on the
last word; in a real model "it" picks that up in earlier layers, where it first takes in the words around it. As in the
paper's encoder, every word may look at words after it too ("it" looks ahead to "tired"); models that write text one word
at a time, such as chatbots, let a word look only at the words before it. Attention
alone ignores word order, so real models add position information. Do not say the AI understands, thinks or reads like a
person; give no model sizes or company claims; do not present Focus as a setting real models have (it shows how scores
become shares; the real formula is Focus 100%). Plain words: query = what a word looks for, key = what a word offers,
value = what it passes on. Describe changes concretely; this is mathematics, not physics. No new-discovery claims.'''+COMMON

# Models whose picture explains why, not only what, and that passed owner review and beginner tests.
# Only these are planned; the others wait for a redesign. attention (2026-10-29) was added at the owner's request
# for the next run after subagent beginner tests; the owner has not reviewed its picture yet.
READY = {'light-bending', 'gravity-clocks', 'spacetime-paths', 'light-clock', 'interference',
         'wave-packet', 'diffraction', 'quantum-well', 'attention'}
# Not ready (2026-10-28): twin-trip shows what rather than why; spacetime, falling-time and tunneling are graph-style;
# standing-waves is a hand-made five-chapter guide (agents write three or four chapters);
# two-slit-particles failed a beginner test (faint ripples, slits read as one gap, unexplained screen marks, stripes
# form before the narration says so).

TOPICS = {
    'light-bending': {'label':'Light bending', 'question':'Why does gravity bend light?', 'notes':MODEL_NOTES},
    'gravity-clocks': {'label':'Gravity and clocks', 'question':'Why do clocks at different heights tick at different rates?', 'notes':CLOCK_NOTES},
    'twin-trip': {'label':'Twin trip', 'question':'Why is the travelling twin younger?', 'notes':TWIN_NOTES},
    'light-clock': {'label':'Light clock', 'question':'Why does a moving clock tick slowly?', 'notes':LIGHT_CLOCK_NOTES},
    'spacetime-paths': {'label':'Paths through spacetime', 'question':'Why is the travelling twin younger?', 'notes':PATHS_NOTES},
    'spacetime': {'label':'Spacetime diagram', 'question':'Why is the travelling twin younger?', 'notes':SPACETIME_NOTES},
    'interference': {'label':'Wave interference', 'question':'What happens when two waves meet?', 'notes':INTERFERENCE_NOTES},
    'two-slit-particles': {'label':'Particles through two slits', 'question':'Why do particles fired one at a time still make stripes?', 'notes':PARTICLE_NOTES},
    'standing-waves': {'label':'Standing waves', 'question':'Why does a guitar string only play certain notes?', 'notes':ROPE_NOTES},
    'tunneling': {'label':'Quantum tunnelling', 'question':'How can a particle pass through a wall it cannot climb over?', 'notes':TUNNEL_NOTES},
    'wave-packet': {'label':'Wave packets and uncertainty', 'question':"Why can't you pin down both where a particle is and how it moves?", 'notes':PACKET_NOTES},
    'falling-time': {'label':'Why things fall', 'question':'If gravity slows time, why do things fall?', 'notes':FALL_NOTES},
    'diffraction': {'label':'Spreading through a gap', 'question':'Why do waves spread out after passing a narrow gap?', 'notes':GAP_NOTES},
    'quantum-well': {'label':'Allowed energies in a well', 'question':'Why can a trapped particle only have certain energies?', 'notes':WELL_NOTES},
    'attention': {'label':'Attention in language AI', 'question':'What does the “attention” in “Attention Is All You Need” do when an AI reads a sentence?', 'notes':ATTENTION_NOTES},
}
