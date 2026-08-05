import type { Readable } from 'node:stream';

/** Consome o stream de export CSV; os seis specs de export repetiam este loop. */
export async function streamToString(stream: Readable): Promise<string> {
  const chunks: Buffer[] = [];

  for await (const chunk of stream) {
    let buf = chunk;
    if (typeof chunk === 'string') buf = Buffer.from(chunk);
    chunks.push(buf);
  }

  return Buffer.concat(chunks).toString('utf-8');
}
