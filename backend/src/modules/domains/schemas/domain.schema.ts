import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type DomainDocument = Domain & Document;

@Schema({ timestamps: true })
export class Domain {
  @Prop({ required: true })
  domain: string;

  @Prop({ required: true })
  reason: string;

  @Prop({ default: 'pending', enum: ['pending', 'processing', 'reported', 'failed'] })
  status: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop()
  registrar: string;

  @Prop()
  nameserver: string;

  @Prop()
  template: string;

  @Prop({ type: [String], default: [] })
  reportedServices: string[];

  @Prop({ type: [String], default: [] })
  failedServices: string[];

  @Prop({ default: 0 })
  reportProgress: number;

  @Prop({ default: 5 })
  priority: number;

  @Prop()
  authorizedUrl?: string;

  @Prop()
  infringingUrls?: string;

  @Prop()
  workDescription?: string;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const DomainSchema = SchemaFactory.createForClass(Domain);
