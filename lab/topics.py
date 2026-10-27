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
Fields named mass/distance control mass/lower radius. The exact UI label is "Lower radius (gap: 2 units)"; refer to it as "Lower radius". Prefer distance=1 initially so the comparison at 2.5 is clear. ray_count and line_width unused.
Explain gravitational time dilation intuitively without saying a clock is malfunctioning.
The lag is determined by the gravitational potential difference, not by the gradient of gravity (tidal forces). For a small fixed gap, the lag scales with local gravitational acceleration times the gap. Never say the lag is independent of gravity strength. No new-discovery claims; checks validate implementation only.'''

TOPICS = {
    'light-bending': {'label':'Light bending', 'question':'Why does gravity bend light?', 'notes':MODEL_NOTES},
    'gravity-clocks': {'label':'Gravity and clocks', 'question':'Why do clocks at different heights tick at different rates?', 'notes':CLOCK_NOTES},
}
