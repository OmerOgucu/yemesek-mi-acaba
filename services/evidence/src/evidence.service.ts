import { Injectable } from '@nestjs/common';
import {
  assertEvidenceFiles,
  photoUrlList,
  publicUploadPath,
  removeStoredFile,
  type IncomingImage,
} from './evidence-files';

@Injectable()
export class EvidenceService {
  assert(photos: IncomingImage[] | undefined, receipt: IncomingImage[] | undefined) {
    return assertEvidenceFiles(photos, receipt);
  }

  remove(url: string): void {
    removeStoredFile(url);
  }

  photoUrls(value: unknown): string[] {
    return photoUrlList(value);
  }

  publicPath(value: unknown): string | null {
    return publicUploadPath(value);
  }
}
