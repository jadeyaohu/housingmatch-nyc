"""Fail closed when a build is missing or server-only configuration leaks into client assets."""
from pathlib import Path
root=Path('.next/static')
if not root.is_dir(): raise SystemExit('Missing client build; cannot scan')
identifiers=[b'CONSULTATION_SUPABASE_SERVICE_ROLE_KEY',b'CONSULTATION_STRIPE_SECRET_KEY',b'CONSULTATION_STRIPE_WEBHOOK_SECRET',b'SUPABASE_SERVICE_ROLE_KEY',b'BETA_SUPABASE_SERVICE_ROLE_KEY',b'SUBSCRIPTIONS_STRIPE_SECRET_KEY',b'SUBSCRIPTIONS_STRIPE_WEBHOOK_SECRET',b'CHAT_APPS_SCRIPT_URL']
files=[p for p in root.rglob('*') if p.is_file()]
if not files: raise SystemExit('Empty client build; cannot scan')
violations=[str(p) for p in files if any(name in p.read_bytes() for name in identifiers)]
if violations: raise SystemExit('Server-only identifiers in client files: '+', '.join(violations))
print('PASS: server-only configuration identifiers absent from browser bundle')
