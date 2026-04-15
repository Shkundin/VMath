import { Injectable } from "@nestjs/common";
import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scrypt = promisify(scryptCallback);

@Injectable()
export class PasswordService {
  async hashPassword(password: string): Promise<string> {
    const salt = randomBytes(16).toString("base64url");
    const derived = (await scrypt(password, salt, 64)) as Buffer;
    return `scrypt$${salt}$${derived.toString("base64url")}`;
  }

  async verifyPassword(password: string, storedHash: string): Promise<boolean> {
    const [algorithm, salt, digest] = storedHash.split("$");
    if (algorithm !== "scrypt" || !salt || !digest) {
      return false;
    }

    const derived = (await scrypt(password, salt, 64)) as Buffer;
    const actual = Buffer.from(digest, "base64url");

    if (actual.length !== derived.length) {
      return false;
    }

    return timingSafeEqual(actual, derived);
  }

  hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }
}
