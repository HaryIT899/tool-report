import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ReportServiceDocument = ReportService & Document;

@Schema()
export class ReportService {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  reportUrl: string;

  @Prop({ default: 'manual', enum: ['manual', 'autofill_supported'] })
  type: string;

  @Prop({ default: true })
  active: boolean;
}

export const ReportServiceSchema = SchemaFactory.createForClass(ReportService);
