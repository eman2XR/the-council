#!/usr/bin/env python3
"""Launchd entry point with an explicit project import path.

Before a publishing run the checkout catches up with GitHub, so the run uses the latest pushed code and its own
publication is not refused. It only fast-forwards, or replays its own unpushed publication commits on top; it never
touches local edits, and when anything fails the run continues on the code it has."""
import os
from pathlib import Path
import runpy
import subprocess
import sys

PUBLICATION=('web/published/','web/dashboard.json','web/proposals.json')


def update(root):
    """Bring the checkout up to date with origin/main and say what happened."""
    git=lambda *args: subprocess.run(['git',*args],cwd=root,text=True,capture_output=True,timeout=120)
    try:
        if git('branch','--show-current').stdout.strip()!='main':
            return 'not on main, not updated'
        if git('status','--porcelain','--untracked-files=no').stdout.strip():
            return 'local edits present, not updated'
        if git('fetch','origin','main').returncode:
            return 'could not reach GitHub, not updated'
        ahead,behind=map(int,git('rev-list','--left-right','--count','HEAD...origin/main').stdout.split())
        if not behind:
            return 'up to date'
        if not ahead:
            return 'updated' if not git('merge','--ff-only','origin/main').returncode else 'fast-forward failed, not updated'
        # Commits a failed push left behind: replay them on top only when they hold nothing but the publication.
        unpushed=git('diff','--name-only','origin/main...HEAD').stdout.split()
        if any(not path.startswith(PUBLICATION) for path in unpushed):
            return 'unpushed commits outside the publication, not updated'
        if git('rebase','origin/main').returncode:
            git('rebase','--abort')
            return 'unpushed publication conflicts with GitHub, not updated'
        return 'updated, unpushed publication replayed on top'
    except (OSError,ValueError,subprocess.SubprocessError) as error:
        return f'not updated ({error})'


if __name__=='__main__':
    root=Path(__file__).resolve().parents[1]
    os.chdir(root)
    if '--publish' in sys.argv:
        print(f'Worker checkout: {update(root)}.',flush=True)
    sys.path.insert(0,str(root))
    sys.argv=['lab','daily',*sys.argv[1:]]
    runpy.run_module('lab',run_name='__main__')
