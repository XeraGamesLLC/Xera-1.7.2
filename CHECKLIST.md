# XRA feature checklist

Legend: ✅ done and working · 🟡 partially built / stubbed · ⬜ not built yet

This tracks against "basically every (non-Nitro) feature 2020 Discord had," scoped down deliberately in two places you explicitly signed off on: **voice/video is Phase 2** (text chat first), and **anti-VPN is a wired-up no-op** until you plug in a provider. Everything else below is either genuinely done or explicitly marked as not.

## Accounts & security

- ✅ Register / log in / log out
- ✅ Username + 4-digit discriminator (`name#0001`), like old Discord, so usernames don't need to be globally unique
- ✅ Email verification token flow (email itself is stubbed - see "Known gaps" below)
- ✅ Password reset flow
- ✅ argon2id password hashing
- ✅ Discord-accurate auth tokens: `base64(userId).base64(tokenVersion).base64(HMAC)`, no expiry, reusable indefinitely - invalidated only by explicit logout or password reset (both bump `User.tokenVersion`, which instantly fails every previously-issued token's signature check). Deliberately not JWT-access + rotating-refresh; matches how Discord's real tokens behave, at the owner's explicit request over the more defense-in-depth default.
- ✅ Account lockout after 5 failed logins (15 min)
- ✅ Rate limiting: tiered (auth endpoints stricter than general API), Redis-backed, IP-based
- ✅ SQL injection prevention: 100% Prisma parameterized queries, zero raw SQL string concatenation anywhere in the codebase
- ✅ Input validation (zod) on every mutating endpoint
- ✅ Security headers (helmet), locked-down CORS allowlist
- ✅ File upload hardening: mime allowlist, size caps, server-generated filenames, avatars re-encoded through sharp (strips EXIF, defeats polyglot-file tricks)
- 🟡 Anti-VPN signup gate: middleware is wired into the register route and toggled by `ANTI_VPN_ENABLED`, but ships **disabled** with no provider implemented (per your call - "hook that up later"). One function to fill in when you're ready: `backend/src/middleware/antiVpn.ts`.
- ⬜ Two-factor authentication (Discord had TOTP 2FA in 2020) - not built
- ⬜ CAPTCHA on signup - not built (rate limiting + anti-VPN hook are the current defenses)

## Servers (guilds)

- ✅ Create / rename / delete server
- ✅ Server icon (upload UI not wired to icon field yet - schema + API support it, see gaps)
- ✅ Join via invite link, leave server
- ✅ Channel categories
- ✅ Text channels: create/rename/delete/reorder, topic, slowmode, NSFW flag
- ✅ Voice channels: schema + permission flags (CONNECT/SPEAK/MUTE/DEAFEN/MOVE_MEMBERS) exist, sidebar shows them - **no audio pipeline** (Phase 2, by design)
- ✅ Roles: create/edit/delete, color, hoist (show separately in member list), position/hierarchy, full permission bitfield editor in the UI
- ✅ Per-channel permission overwrites (role & member level) - API complete; UI exposes role/base permissions but not per-channel overwrite editing yet (see gaps)
- ✅ Invite links: max uses, expiry, revoke
- ✅ Audit log (channel/role/member/emoji/invite changes, all moderation actions)
- ✅ Custom server emoji (upload, use in messages, delete)

## Messaging

- ✅ Real-time send/receive over Socket.IO (token-authenticated sockets)
- ✅ Markdown: **bold**, *italic*, __underline__, ~~strikethrough~~, `inline code`, code blocks, blockquotes, ||spoilers|| - old-Discord's actual subset, not generic CommonMark
- ✅ Mentions: @user, @role, @everyone, @here - all permission-gated server-side (can't @everyone without the permission, no matter what the client sends)
- ✅ Reactions (add/remove, unicode + custom server emoji)
- ✅ Replies (quote-reply to a specific message)
- ✅ Edit / delete own messages; MANAGE_MESSAGES holders can delete anyone's
- ✅ Pinned messages
- ✅ Typing indicators
- ✅ Read state / unread tracking: per-channel unread dot + mention badge with count
- ✅ Message history with infinite-scroll pagination
- ✅ In-channel search (substring match)
- ✅ File/image attachments (upload, inline image preview, generic file download for everything else)
- ✅ Slowmode (server-enforced, not just client-side)
- ✅ Emoji picker (curated set + your server's custom emoji)
- ⬜ Link embeds / URL unfurling (rich preview cards for pasted links) - URLs currently just auto-link as plain `<a>` tags
- ⬜ GIF picker (Tenor/Giphy integration) - not built
- ⬜ Full Unicode emoji picker (currently ~48 curated emoji, not the full ~3,600) - swap-in point is `frontend/src/components/chat/EmojiPicker.tsx`

## Friends & DMs

- ✅ Friend requests: send (by username#tag), accept, decline, cancel
- ✅ Remove friend, block/unblock (blocking prevents new DMs)
- ✅ 1:1 direct messages
- ✅ Group DMs (up to 10 people, matching old Discord's cap) - service layer + API complete, basic UI (create/leave/add member); no dedicated "manage group" modal yet
- ✅ Presence: Online / Idle / DND / Invisible, multi-tab aware (you don't go "offline" just because one tab closed)
- ✅ Custom status text + About Me + avatar upload

## Moderation

- ✅ Kick, ban (+ ban list, unban), timeout (mute) - all role-hierarchy-checked (can't act on someone with an equal/higher role, owner is untouchable)
- ✅ Nickname management (self + MANAGE_NICKNAMES holders)
- ✅ Slowmode
- ✅ Full audit log

## Frontend / UX

- ✅ 2019-Discord-style dark theme: server rail, channel sidebar, chat pane, member list - deliberately similar layout, **distinct accent color** (`#6b5ce0`, not Discord's blurple) and no reused logos/wordmarks, to stay clearly inspired-by rather than a copy
- ✅ Mobile-responsive down to 375px (iPhone 12 mini) - sidebars become slide-out drawers, member list becomes a toggleable overlay, single-column chat is the default view
- ✅ Member list grouped by hoisted role, then Online, then Offline
- ✅ Full server settings modal: overview, roles/permissions editor, member management, invites, bans, audit log
- ✅ User settings modal: avatar, status, custom status, about me, logout
- ⬜ Light theme (old Discord had one) - dark only for now
- ⬜ Keyboard shortcuts (Discord had a bunch - Ctrl+K quick switcher, etc.) - not built

## Voice / video (explicitly Phase 2 - your call)

- ⬜ Voice channels (audio)
- ⬜ Video calls / DM calls
- ⬜ Screen share
- ⬜ Push-to-talk / voice activity detection
- ✅ Everything *around* voice is already in place so this is additive, not a rewrite: schema (`ChannelType.VOICE`), permission flags (CONNECT/SPEAK/MUTE_MEMBERS/DEAFEN_MEMBERS/MOVE_MEMBERS), sidebar UI, role permission editor all already handle voice channels as a concept - only the WebRTC media pipeline (recommend `mediasoup`, an SFU) is missing.

## VR game / website integration hooks

- ⬜ Rich Presence (showing "Playing [your game]" like Discord's Game SDK) - not built, but the schema (`customStatus` field, presence system) is the natural place to extend this from
- ⬜ A dedicated game-client API key/bot-token auth path, distinct from a regular user login, for your VR game to authenticate as a lightweight client. Not strictly necessary though - the token system is now just `POST /api/auth/login` returning a plain string token the game engine stores and sends as `Authorization: Bearer <token>`, no cookie jar or httpOnly handling required, so the existing login flow may already be simple enough to use directly.

## Known gaps / honest limitations

- **No real email provider.** `backend/src/services/email.service.ts` logs verification/reset links to the server console instead of sending them. Swap in SES/Postmark/Resend/etc. - every email in the app already funnels through that one file.
- **No automated test suite yet.** Given the scope, prioritize adding integration tests for auth, permissions, and the message pipeline before you have real user data at stake.
- **Local disk storage for uploads**, not object storage/CDN. Fine for one server; the `uploads` Docker volume persists across redeploys, but doesn't scale past one box or survive disk loss without your own backup (see DEPLOY.md).
- **No orphaned-attachment cleanup job.** A file uploaded via the attachment endpoint but never attached to a sent message just sits in `/uploads/attachments` forever. Low priority at 100 CCU scale, but worth a cron job eventually.
- **Search is substring match**, not ranked full-text search. Fine for a single channel's history; would need Postgres `tsvector` or a real search index (Meilisearch, Typesense) to feel good at scale.
- **HTTPS is not included** - `docker-compose.yml` serves plain HTTP. You must put a TLS-terminating reverse proxy in front before this touches the real internet (both for browsers and for your VR client). See DEPLOY.md section 3.
- **Server icon upload UI isn't wired up** even though the field/API exist - only avatar upload has a file picker in the settings modal today.
- **Per-channel permission overwrite editing** (right-click a channel → set role/member-specific overrides) has full backend support but no dedicated UI panel yet; only guild-wide role permissions are editable from Server Settings → Roles right now.
