# Pocket Arcade

A small static site built to run on old browsers (tested against iOS 6
Safari / iPod touch 4th gen) — no ES6, no fetch, no flexbox/grid, no CSS
variables. The home screen mocks an iOS 6 SpringBoard with a single app
icon that opens the one game here:

## Claude Clicker
A full idle/incremental game (Cookie Clicker, but Claude/AI-themed and
click-for-tokens) with 20 tiers of "compute" buildings, a research tree,
active abilities on real-time-regenerating "cycles," bugs and insight
mechanics, 49 achievements, golden token events, and a prestige system.
Styled as a native-feeling iOS 6 app: navigation bar, grouped table-view
rows, a segmented-control tab bar, and iOS-style toggle switches.

Progress is saved with `localStorage`, so once the page has loaded once
it keeps working even if the connection drops.

## Running it

```bash
python3 server.py        # serves on port 6969
python3 server.py 8080   # or pick a different port
```

Then on the iPod, open Safari and go to `http://<your-vps-ip>:6969/`.

If the VPS has a firewall (ufw, iptables, or a cloud provider's security
group), open port 6969:

```bash
sudo ufw allow 6969/tcp
```

## Keep it running (systemd)

Running `python3 server.py` directly in an SSH session dies the moment you
disconnect (SIGHUP kills it). Use systemd instead so it runs as a real
background service, survives closing SSH, and auto-restarts on crash or
reboot. `pocket-arcade.service` in this repo is already set up for
`/root/ios6` on port 443 — adjust `WorkingDirectory`/`ExecStart` if your
path or port differ.

```bash
sudo cp pocket-arcade.service /etc/systemd/system/pocket-arcade.service
sudo systemctl daemon-reload
sudo systemctl enable --now pocket-arcade
```

Check it's up with `systemctl status pocket-arcade`. After any `git pull`
with code changes, restart it with `sudo systemctl restart pocket-arcade`.
