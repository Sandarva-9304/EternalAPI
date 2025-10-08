import { Redis } from "@upstash/redis";
import dotenv from "dotenv";

dotenv.config();
// export const redis = new Redis({
//   url: "https://eminent-chow-9004.upstash.io",
//   token: "ASMsAAImcDFmMzhmOGIwZTNkZjc0NjJkOTg1NmUxOWU5MDA4ZmNkMnAxOTAwNA",
// });
export const redis = new Redis({
  url: process.env.UPSTASH_URL!,
  token: process.env.UPSTASH_TOKEN!,
})
