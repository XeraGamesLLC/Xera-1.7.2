/**
 * Discord-style snowflake ID generator: a 64-bit integer encoding
 * (timestamp | worker | sequence), returned as a decimal string so it's safe
 * to store/transmit without precision loss. IDs are monotonically increasing,
 * which gives free chronological sort order for messages without needing a
 * separate createdAt index for pagination ("give me messages before id X").
 */

const XRA_EPOCH = 1_700_000_000_000n; // custom epoch, arbitrary fixed point in the past
const WORKER_ID = BigInt(process.env.WORKER_ID ?? "1") & 0x3ffn; // 10 bits

let sequence = 0n;
let lastTimestamp = -1n;

export function generateSnowflake(): string {
  let timestamp = BigInt(Date.now()) - XRA_EPOCH;

  if (timestamp === lastTimestamp) {
    sequence = (sequence + 1n) & 0xfffn; // 12 bits
    if (sequence === 0n) {
      // sequence exhausted within the same millisecond, spin to the next ms
      while (BigInt(Date.now()) - XRA_EPOCH <= lastTimestamp) {
        /* busy-wait a fraction of a millisecond */
      }
      timestamp = BigInt(Date.now()) - XRA_EPOCH;
    }
  } else {
    sequence = 0n;
  }

  lastTimestamp = timestamp;

  const id = (timestamp << 22n) | (WORKER_ID << 12n) | sequence;
  return id.toString();
}

export function snowflakeToDate(id: string): Date {
  const ms = (BigInt(id) >> 22n) + XRA_EPOCH;
  return new Date(Number(ms));
}
