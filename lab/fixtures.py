"""Hand-authored offline example; NEVER represented as live agent output."""
from copy import deepcopy

RESEARCH = {
    'claim': 'A massive object changes the path of light passing nearby.',
    'explanation': 'General relativity describes gravity through the geometry of spacetime. Light follows a null geodesic: the natural path for light in that geometry. Near a mass, that path can look bent when viewed from far away.',
    'assumptions': ['An isolated, spherical, non-rotating mass.', 'Light passes far outside the strong-gravity region.', 'A first-order weak-field approximation; source and observer are treated as distant.'],
    'prediction': 'At the same passing distance, doubling the mass doubles the small deflection angle. At the same mass, doubling the passing distance halves it.',
    'falsifier': 'A precise measurement of light deflection inconsistent with the predicted angle, after accounting for the mass, geometry and measurement uncertainty, would challenge this model in its stated regime.',
    'limitations': ['Bending is magnified six times in the drawing.', 'This is not a black-hole simulation or a literal picture of curved spacetime.', 'The moving dot illustrates a path; its screen speed is not a physical measurement.', 'Passing these checks does not establish a new scientific result.'],
    'sources': [
        {'title': 'Einstein Online · Gravitational deflection of light', 'url': 'https://www.einstein-online.info/en/spotlight/light_deflection/', 'supports': 'General relativity predicts gravitational light deflection, tested with astronomical observations.'},
        {'title': 'Einstein Online · The equivalence principle and light', 'url': 'https://www.einstein-online.info/en/spotlight/equivalence_light/', 'supports': 'Local equivalence alone does not determine the full deflection; spacetime geometry matters.'},
    ],
}
SCENE = {
    'title': 'Light takes the natural path.\nGravity changes the geometry.',
    'subtitle': 'An introduction to general relativity, one beam of light at a time.',
    'beats': [
        {'title': 'First, a universe without this mass.', 'body': 'Follow the beam. With no nearby mass in this model, its path is straight. The faint line is our reference: where the light would go without the object.'},
        {'title': 'Now put something massive in its way.', 'body': 'The mass changes the geometry of spacetime around it. Light follows a natural path through that geometry. From this distant view, the path bends toward the mass.'},
        {'title': 'Same light. A different route.', 'body': 'Increase the mass, then move the beam farther away. More mass means more bending; a more distant pass means less. Light still travels at the speed of light when measured locally.'},
    ],
    'mass': 0.7, 'distance': 1.25, 'ray_count': 3,
    'show_reference': True, 'show_labels': True, 'accent': 'mint',
    'line_width': 2.5, 'duration': 24,
    'takeaway': 'Gravity does not need to give light a rest mass. It changes the spacetime geometry that light travels through.',
}


class FixtureProvider:
    name = 'fixture'
    calls = 0
    usage = []

    def generate(self, role, prompt, schema=None, images=(), research=False):
        self.calls += 1
        if role == 'researcher':
            return 'OFFLINE FIXTURE: hand-authored source notes, no live search performed.'
        if role == 'scientist':
            return deepcopy(RESEARCH)
        if role == 'director':
            scene = deepcopy(SCENE)
            if 'Previous scene' not in prompt:
                scene.update(show_reference=False, show_labels=False, line_width=1)
            return scene
        if role == 'visual_reviewer' and '"show_reference": false' in prompt:
            return {'pass': False, 'score': 5, 'summary': 'Fixture critique: the bent path has no baseline for comparison.', 'changes': ['Enable the straight reference path and labels.', 'Increase line width to 2.5 for small screens.'], 'blocking_issues': ['Missing visual comparison.']}
        return {'pass': True, 'score': 8, 'summary': 'Fixture review only: scripted acceptance exercises the pipeline.', 'changes': [], 'blocking_issues': []}
