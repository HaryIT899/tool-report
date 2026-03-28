import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ReportLogDocument = ReportLog & Document;

@Schema({ timestamps: true })
export class ReportLog {
  @Prop({ type: Types.ObjectId, ref: 'Domain', required: true })
  domainId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'ReportService', required: true })
  serviceId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Account' })
  accountId: Types.ObjectId;

  @Prop()
  email: string;

  @Prop({ type: Types.ObjectId, ref: 'Proxy' })
  proxyId: Types.ObjectId;

  @Prop()
  proxyHost: string;

  @Prop({ required: true, enum: ['pending', 'success', 'failed', 'processing'] })
  status: string;

  @Prop()
  stage: string;

  @Prop()
  stageMessage: string;

  @Prop()
  stageUpdatedAt: Date;

  @Prop({
    type: [{ stage: String, message: String, at: Date }],
    default: [],
  })
  events: { stage: string; message?: string; at: Date }[];

  @Prop()
  errorMessage: string;

  @Prop()
  screenshot: string;

  @Prop()
  jobId: string;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const ReportLogSchema = SchemaFactory.createForClass(ReportLog);
