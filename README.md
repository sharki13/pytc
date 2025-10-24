# pytc - PyTest (Workspace) Config

A VS Code extension that provides a graphical interface to configure pytest testing arguments in your workspace settings.

## Features

This extension adds a new panel to the Activity Bar that allows you to easily configure pytest arguments through a native VS Code interface organized into three sections:

### Pytest Section
- **Traceback Output**: Configure `--tb` parameter with options: auto, long, short, native, no, or none
- **Number of Processes**: Configure `--numprocesses` parameter for parallel execution - dynamically generates options based on your CPU cores (none, auto, 1, and steps of 2 up to your CPU count)
- **Verbosity Level**: Control output verbosity with -q (Quiet), -v (Verbose), -vv (More verbose), -vvv (Very verbose)
- **Capture Output**: Toggle `-s` parameter to show/hide captured output
- **Show Locals**: Toggle `--showlocals` parameter to show local variables in tracebacks

### Playwright Section
- **Browser**: Configure `--browser` parameter with options: chromium, firefox, webkit, or none
- **Show Playwright Browser**: Toggle `--headed` parameter for Playwright tests
- **Slow Motion**: Toggle `--slowmo` parameter to slow down Playwright operations
- **Tracing**: Configure `--tracing` parameter with options: on, off, retain-on-failure, or none
- **Video**: Configure `--video` parameter with options: on, off, retain-on-failure, or none

### Debugging Section
- **Wait for Delve Attach**: Toggle `--delve=1` parameter for debugging

## Requirements

- VS Code must be opened with a workspace (not just a single file)
- The extension automatically detects existing pytest configuration and updates it

**Enjoy!**
