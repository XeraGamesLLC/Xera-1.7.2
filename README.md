# Pocket Arcade

A small static website of games and toys built to run on old browsers
(tested against iOS 6 Safari / iPod touch 4th gen) — no ES6, no fetch,
no flexbox/grid, no CSS variables.

## Games
Snake, Pong, Tic Tac Toe (vs CPU or 2-player), Memory Match, Whack-a-Mole, 2048,
Breakout, Flappy, Connect Four (vs CPU), Minesweeper, Simon Says, Reaction Test,
Word Scramble, Hangman, Trivia, Clicker.

## Toys
Doodle Pad, Starfield, Color Lab, Shoutbox (a private local note board), Music
(radio stations + your own local library), Magic 8 Ball, Jokes, Beat Pad, Pixel Pet.

Drop your own MP3/OGG/M4A/WAV files into the `music/` folder on the server and
they'll show up automatically in the Music player's "My Music" section. That
folder is gitignored so your files won't be touched by `git pull`.

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
