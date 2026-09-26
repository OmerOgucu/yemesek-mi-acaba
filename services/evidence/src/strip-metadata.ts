function stripJpeg(buffer: Buffer): Buffer {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return buffer;
  const chunks: Buffer[] = [buffer.subarray(0, 2)];
  let index = 2;
  while (index + 1 < buffer.length) {
    if (buffer[index] !== 0xff) {
      chunks.push(buffer.subarray(index));
      break;
    }
    while (index < buffer.length && buffer[index] === 0xff) index += 1;
    if (index >= buffer.length) break;
    const marker = buffer[index];
    index += 1;
    if (marker === 0xd9 || marker === 0xda) {
      chunks.push(Buffer.from([0xff, marker]), buffer.subarray(index));
      break;
    }
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      chunks.push(Buffer.from([0xff, marker]));
      continue;
    }
    if (index + 1 >= buffer.length) break;
    const length = buffer.readUInt16BE(index);
    if (length < 2 || index + length > buffer.length) break;
    const drop = (marker >= 0xe0 && marker <= 0xef) || marker === 0xfe;
    if (!drop) chunks.push(buffer.subarray(index - 2, index + length));
    index += length;
  }
  return Buffer.concat(chunks);
}

function stripPng(buffer: Buffer): Buffer {
  const signature = buffer.subarray(0, 8);
  if (signature.toString('hex') !== '89504e470d0a1a0a') return buffer;
  const chunks: Buffer[] = [signature];
  let index = 8;
  const drop = new Set(['eXIf', 'tEXt', 'zTXt', 'iTXt']);
  while (index + 8 <= buffer.length) {
    const length = buffer.readUInt32BE(index);
    const type = buffer.subarray(index + 4, index + 8).toString('ascii');
    const end = index + 12 + length;
    if (end > buffer.length) break;
    if (!drop.has(type)) chunks.push(buffer.subarray(index, end));
    index = end;
    if (type === 'IEND') break;
  }
  return Buffer.concat(chunks);
}

function stripWebp(buffer: Buffer): Buffer {
  if (buffer.length < 12 || buffer.subarray(0, 4).toString('ascii') !== 'RIFF') return buffer;
  if (buffer.subarray(8, 12).toString('ascii') !== 'WEBP') return buffer;
  const chunks: Buffer[] = [];
  let index = 12;
  while (index + 8 <= buffer.length) {
    const type = buffer.subarray(index, index + 4).toString('ascii');
    const size = buffer.readUInt32LE(index + 4);
    const padded = size + (size % 2);
    const end = index + 8 + padded;
    if (end > buffer.length) break;
    if (type !== 'EXIF' && type !== 'XMP ') chunks.push(buffer.subarray(index, end));
    index = end;
  }
  const body = Buffer.concat(chunks);
  const out = Buffer.alloc(12 + body.length);
  out.write('RIFF', 0, 'ascii');
  out.writeUInt32LE(body.length + 4, 4);
  out.write('WEBP', 8, 'ascii');
  body.copy(out, 12);
  return out;
}

export function stripImageMetadata(buffer: Buffer, ext: 'jpg' | 'png' | 'webp'): Buffer {
  if (ext === 'jpg') return stripJpeg(buffer);
  if (ext === 'png') return stripPng(buffer);
  return stripWebp(buffer);
}
