import { Injectable } from '@nestjs/common';
import { collectPolicyIssues } from './content-policy';

@Injectable()
export class ModerationService {
  collect(fields: { value: string | null | undefined; addressHint?: boolean }[]): string[] {
    return collectPolicyIssues(fields);
  }

  /**
   * A new complaint is evidence-backed, not moderator-approved.
   * The public badge means the files exist. This flag stays false until a person reviews them.
   */
  stampEvidence(): { evidenceVerified: false } {
    return { evidenceVerified: false };
  }
}
