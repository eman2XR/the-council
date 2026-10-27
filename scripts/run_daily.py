#!/usr/bin/env python3
"""Launchd entry point with an explicit project import path."""
import os
from pathlib import Path
import runpy
import sys

root=Path(__file__).resolve().parents[1]
os.chdir(root)
sys.path.insert(0,str(root))
sys.argv=['lab','daily',*sys.argv[1:]]
runpy.run_module('lab',run_name='__main__')
