# Pocket Arcade

A small static website of games and toys built to run on old browsers
(tested against iOS 6 Safari / iPod touch 4th gen) — no ES6, no fetch,
no flexbox/grid, no CSS variables.

## Games
Snake, Pong, Tic Tac Toe (vs CPU or 2-player), Memory Match, Whack-a-Mole, 2048.

## Toys
Doodle Pad, Starfield, Color Lab, Shoutbox (a private local note board).

All progress/high scores are saved with `localStorage`, so once the page
has loaded once it keeps working even if the connection drops.

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

```bash
sudo mkdir -p /opt/pocket-arcade
sudo cp -r ./* /opt/pocket-arcade/
sudo cp pocket-arcade.service /etc/systemd/system/pocket-arcade.service
sudo systemctl daemon-reload
sudo systemctl enable --now pocket-arcade
```

Check it's up with `systemctl status pocket-arcade`.
