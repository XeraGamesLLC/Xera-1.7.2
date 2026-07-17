export interface ParsedMentions {
  userIds: string[];
  roleIds: string[];
  everyone: boolean;
  here: boolean;
}

const USER_MENTION_RE = /<@(\d+)>/g;
const ROLE_MENTION_RE = /<@&(\d+)>/g;

/** Parses Discord-style mention syntax out of raw message content. */
export function parseMentions(content: string): ParsedMentions {
  const userIds = new Set<string>();
  const roleIds = new Set<string>();

  for (const match of content.matchAll(ROLE_MENTION_RE)) roleIds.add(match[1]);
  for (const match of content.matchAll(USER_MENTION_RE)) {
    // Avoid double-counting the numeric id captured by the role-mention regex (<@&id>)
    if (!content.includes(`<@&${match[1]}>`)) userIds.add(match[1]);
  }

  return {
    userIds: [...userIds],
    roleIds: [...roleIds],
    everyone: /(?:^|\s)@everyone(?:\s|$)/.test(content),
    here: /(?:^|\s)@here(?:\s|$)/.test(content),
  };
}
