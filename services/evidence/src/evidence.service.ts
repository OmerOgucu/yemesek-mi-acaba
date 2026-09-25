import { Injectable } from '@nestjs/common';
import {
  assertEvidenceFiles,
  photoUrlList,
  removeStoredFile,
  type IncomingImage,
} from './evidence-files';

@Injectable()
export class EvidenceService {
  assert(photos: IncomingImage[] | undefined, receipt: IncomingImage[] | undefined) {
    return assertEvidenceFiles(photos, receipt);
  }

  remove(key: string): Promise<boolean> {
    return removeStoredFile(key);
  }

  photoUrls(value: unknown): string[] {
    return photoUrlList(value);
  }

  publicPath(value: unknown): string | null {
    return photoUrlList([value])[0] ?? null;
  }
}
