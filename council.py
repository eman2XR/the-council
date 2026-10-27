#!/usr/bin/env python3
"""
The Council — CLI MVP
Three AI personas (Socrates, Feynman, The Madman) debate a physics claim.
User is the Chair: can speak after every round or in open-floor mode.
"""

import json
import subprocess
import sys
from pathlib import Path

# ── Personas ──────────────────────────────────────────────────────────────────

PERSONAS = {
    "Socrates": {
        "color": "\033[96m",
        "system_prompt": (
            "You are Socrates in a council debate on theoretical physics. "
            "Your role is ONLY to question — never to assert, never to explain. "
            "You expose contradictions, force precision, and surface hidden assumptions. "
            "Speak only when you have a genuinely sharp question that moves things forward. "
            "React to whatever is most worth pressing — you do not need to answer everyone. "
            "One or two short questions, under 40 words. Conversational, not a lecture. "
            "If you have nothing new to ask this turn, pass."
        ),
    },
    "Feynman": {
        "color": "\033[93m",
        "system_prompt": (
            "You are Richard Feynman in a council debate on theoretical physics. "
            "You are a bullshit detector first, physicist second. "
            "You demand a concrete example or toy model before accepting any abstract claim, "
            "and you translate jargon into plain language. "
            "Make ONE point per turn — no essays, no piling on every speaker. "
            "React to whatever is most worth engaging, or advance your own line. "
            "Under 60 words, conversational. If you have nothing real to add this turn, pass."
        ),
    },
    "The Madman": {
        "color": "\033[95m",
        "system_prompt": (
            "You are The Madman in a council debate on theoretical physics. "
            "You break assumptions and make wild, specific connections across domains. "
            "Question the framing; propose reversals — what if the opposite is true? "
            "Vague wildness is useless; specific wildness is generative. "
            "ONE idea per turn, stated fast — no essays. "
            "Speak only when you have a genuine spark, not to fill the air. "
            "Under 60 words, conversational. If you have nothing new this turn, pass."
        ),
    },
}

PERSONA_ORDER = list(PERSONAS.keys())

# ── Terminal styling ───────────────────────────────────────────────────────────

RESET   = "\033[0m"
BOLD    = "\033[1m"
DIM     = "\033[2m"
GREEN   = "\033[92m"

# ── Session persistence ────────────────────────────────────────────────────────

SESSION_DIR = Path(__file__).parent / ".sessions"
SESSION_DIR.mkdir(exist_ok=True)


def _session_file(name: str) -> Path:
    return SESSION_DIR / f"{name.lower().replace(' ', '_')}.session"


def load_session_id(name: str) -> str | None:
    f = _session_file(name)
    return f.read_text().strip() if f.exists() else None


def save_session_id(name: str, session_id: str):
    _session_file(name).write_text(session_id)


def clear_session(name: str):
    f = _session_file(name)
    if f.exists():
        f.unlink()


# ── Claude invocation ──────────────────────────────────────────────────────────

def claude_turn(
    message: str,
    session_id: str | None = None,
    system_prompt: str | None = None,
) -> tuple[str, str | None]:
    """
    Run one Claude turn. Returns (response_text, session_id).
    One subprocess per turn — claude -p exits after each response.
    """
    cmd = ["claude", "-p", "--verbose", "--output-format", "stream-json"]

    if session_id:
        cmd += ["--resume", session_id]
    elif system_prompt:
        cmd += ["--system-prompt", system_prompt]

    result = subprocess.run(
        cmd,
        input=message,
        capture_output=True,
        text=True,
    )

    response_text = ""
    returned_session_id: str | None = None

    for line in result.stdout.splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            event = json.loads(line)
        except json.JSONDecodeError:
            continue

        etype = event.get("type", "")

        if etype == "system":
            returned_session_id = event.get("session_id") or returned_session_id

        elif etype == "assistant":
            content = event.get("message", {}).get("content", "")
            if isinstance(content, list):
                for block in content:
                    if isinstance(block, dict) and block.get("type") == "text":
                        response_text += block["text"]
            elif isinstance(content, str):
                response_text += content

        elif etype == "result":
            # result event may also carry session_id
            sid = event.get("session_id")
            if sid:
                returned_session_id = sid

    if result.returncode != 0 and not response_text:
        # Surface stderr for debugging
        err = result.stderr.strip()
        if err:
            print(f"\n{DIM}[claude error: {err}]{RESET}")

    return response_text.strip(), returned_session_id


# ── Persona session ────────────────────────────────────────────────────────────

class PersonaSession:
    def __init__(self, name: str):
        self.name = name
        self.color = PERSONAS[name]["color"]
        self.system_prompt = PERSONAS[name]["system_prompt"]
        self.session_id: str | None = load_session_id(name)

    def speak(self, message: str) -> str:
        text, new_id = claude_turn(
            message,
            session_id=self.session_id,
            system_prompt=None if self.session_id else self.system_prompt,
        )

        if not text and self.session_id:
            # Session may have expired — restart fresh
            clear_session(self.name)
            self.session_id = None
            text, new_id = claude_turn(
                message,
                session_id=None,
                system_prompt=self.system_prompt,
            )

        if new_id and new_id != self.session_id:
            self.session_id = new_id
            save_session_id(self.name, new_id)

        return text or "[no response]"


# ── Printing ───────────────────────────────────────────────────────────────────

def print_persona(session: PersonaSession, text: str):
    print(f"\n{BOLD}{session.color}{session.name}{RESET}")
    print(f"{session.color}{text}{RESET}")


def print_chair(text: str):
    print(f"\n{BOLD}{GREEN}[You — The Chair]{RESET}")
    print(f"{GREEN}{text}{RESET}")


def print_divider(label: str = ""):
    line = "─" * 58
    if label:
        pad = (58 - len(label) - 2) // 2
        print(f"\n{DIM}{'─' * pad} {label} {'─' * pad}{RESET}\n")
    else:
        print(f"\n{DIM}{line}{RESET}\n")


# ── Debate context builder ─────────────────────────────────────────────────────

def build_context(claim: str, transcript: list[dict]) -> str:
    lines = [f"Claim under debate: {claim}", ""]
    if transcript:
        lines.append("Debate so far:")
        for entry in transcript:
            lines.append(f"  {entry['speaker']}: {entry['text']}")
        lines.append("")
    lines.append(
        "Now take your turn. React to whatever is most worth engaging or advance your own "
        "line — you do not need to address everyone. Stay in character and keep it short. "
        "If you genuinely have nothing new to add this turn, reply with exactly: PASS"
    )
    return "\n".join(lines)


# ── Orchestrator ───────────────────────────────────────────────────────────────

def is_pass(text: str) -> bool:
    return text.strip().upper().strip("().!") == "PASS"


def persona_turn(
    session: PersonaSession,
    claim: str,
    transcript: list[dict],
    verb: str = "thinking",
) -> None:
    """Run one persona's turn. Prints the response, or a pass, and records it."""
    print(f"{DIM}{session.name} is {verb}...{RESET}", end="\r", flush=True)
    context = build_context(claim, transcript)
    response = session.speak(context)
    print(" " * 50, end="\r")

    if is_pass(response):
        print(f"\n{DIM}{session.name} passes.{RESET}")
        return

    print_persona(session, response)
    transcript.append({"speaker": session.name, "text": response})


def run_rounds(
    claim: str,
    sessions: dict[str, PersonaSession],
    transcript: list[dict],
    rounds: int = 2,
):
    for round_num in range(1, rounds + 1):
        print_divider(f"ROUND {round_num}")

        for name in PERSONA_ORDER:
            persona_turn(sessions[name], claim, transcript)

        # Chair interjection after each round
        print()
        print(f"{DIM}[Enter to continue to round {round_num + 1 if round_num < rounds else 'open floor'}, or type a message to interject]{RESET}")
        try:
            chair_input = input(f"{BOLD}{GREEN}You > {RESET}").strip()
        except (EOFError, KeyboardInterrupt):
            return

        if chair_input:
            print_chair(chair_input)
            transcript.append({"speaker": "The Chair", "text": chair_input})

            print_divider("COUNCIL RESPONDS")
            for name in PERSONA_ORDER:
                persona_turn(sessions[name], claim, transcript, verb="responding")


def open_floor(
    claim: str,
    sessions: dict[str, PersonaSession],
    transcript: list[dict],
):
    print_divider("OPEN FLOOR")
    print(f"{DIM}Structured rounds complete. Continue freely. Type 'exit' to quit.{RESET}\n")

    while True:
        try:
            user_input = input(f"{BOLD}{GREEN}You > {RESET}").strip()
        except (EOFError, KeyboardInterrupt):
            break

        if not user_input:
            continue
        if user_input.lower() in ("exit", "quit", "q"):
            break

        print_chair(user_input)
        transcript.append({"speaker": "The Chair", "text": user_input})

        for name in PERSONA_ORDER:
            persona_turn(sessions[name], claim, transcript)
        print()


# ── Entry point ────────────────────────────────────────────────────────────────

def main():
    print(f"\n{BOLD}THE COUNCIL{RESET}  {DIM}v0.1{RESET}")
    print(f"{DIM}Council: {', '.join(PERSONA_ORDER)}{RESET}\n")

    if len(sys.argv) > 1:
        claim = " ".join(sys.argv[1:])
    else:
        try:
            claim = input(f"{BOLD}Claim or question for the council:{RESET} ").strip()
        except (EOFError, KeyboardInterrupt):
            sys.exit(0)

    if not claim:
        print("No claim provided.")
        sys.exit(1)

    sessions = {name: PersonaSession(name) for name in PERSONA_ORDER}
    transcript: list[dict] = []

    print(f"\n{DIM}Claim: {claim}{RESET}")

    try:
        run_rounds(claim, sessions, transcript, rounds=2)
        open_floor(claim, sessions, transcript)
    except KeyboardInterrupt:
        pass

    print(f"\n{DIM}The council rests.{RESET}\n")


if __name__ == "__main__":
    main()
