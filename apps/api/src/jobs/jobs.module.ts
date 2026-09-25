import { Module } from '@nestjs/common';
import { EvidenceModule } from '@yemesek/evidence';
import { MailModule } from '@yemesek/mail';
import { JobsService } from './jobs.service';

@Module({
  imports: [MailModule, EvidenceModule],
  providers: [JobsService],
  exports: [MailModule, JobsService],
})
export class JobsModule {}
