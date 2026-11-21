import argon2 from 'argon2';
import { z } from 'zod';
export const hashOptions={type:argon2.argon2id,memoryCost:65536,timeCost:3,parallelism:1};
export const passwordSchema=z.string().min(15).max(128).refine(value=>Buffer.byteLength(value,'utf8')<=512);
