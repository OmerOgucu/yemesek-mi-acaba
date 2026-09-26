import { Injectable } from '@nestjs/common';
import type { PolicyField } from './dto/policy-field';
import { collectPolicyIssues } from './content-policy';

@Injectable()
export class ModerationService {
  collect(fields: PolicyField[]): string[] {
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
