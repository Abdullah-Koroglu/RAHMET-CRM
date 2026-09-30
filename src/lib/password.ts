import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
const KEY_LENGTH = 64;
const COST = 32768;
const BLOCK_SIZE = 8;
const PARALLELIZATION = 1;
const MAX_MEMORY = 64 * 1024 * 1024;

export const DUMMY_PASSWORD_HASH = "scrypt$32768$8$1$0123456789abcdef0123456789abcdef$64aae10c95078c31640b61e0fc03ba1d25d06684dfcbe7a04632269583d360eb468626780f90d4ab3862884b1efad0e4b8ebe114450df33622df61faf1b1a0f2";

function derive(password: string, salt: Buffer, cost: number, blockSize: number, parallelization: number) {
  return new Promise<Buffer>((resolve, reject) => {
    scryptCallback(password, salt, KEY_LENGTH, { N: cost, r: blockSize, p: parallelization, maxmem: MAX_MEMORY }, (error, result) => error ? reject(error) : resolve(result));
  });
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const derived = await derive(password, salt, COST, BLOCK_SIZE, PARALLELIZATION);
  return `scrypt$${COST}$${BLOCK_SIZE}$${PARALLELIZATION}$${salt.toString("hex")}$${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, encoded: string) {
  const [algorithm, cost, blockSize, parallelization, saltHex, hashHex] = encoded.split("$");
  if (algorithm !== "scrypt" || !cost || !blockSize || !parallelization || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  if (expected.length !== KEY_LENGTH) return false;
  const actual = await derive(password, Buffer.from(saltHex, "hex"), Number(cost), Number(blockSize), Number(parallelization));
  return timingSafeEqual(actual, expected);
}
