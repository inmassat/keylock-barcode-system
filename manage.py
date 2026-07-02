#!/usr/bin/env python
"""Convenience shim so `python manage.py <cmd>` works from the repo root.

The real Django project lives in ``backend_qrcode/``. This forwards every
command (runserver, migrate, createsuperuser, ...) to that project.
"""
import os
import sys

BACKEND_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend_qrcode")


def main():
    # Run as if we were inside backend_qrcode/ so settings, .env and media
    # paths all resolve exactly like the real manage.py.
    os.chdir(BACKEND_DIR)
    sys.path.insert(0, BACKEND_DIR)
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "backend_qrcode.settings")
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Activate the virtualenv first:\n"
            r"    env\Scripts\Activate.ps1"
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == "__main__":
    main()
