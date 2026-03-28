import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AccountDocument = Account & Document;

@Schema({ timestamps: true })
export class Account {
  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ default: 'google', enum: ['google'] })
  provider: string;

  @Prop()
  profilePath: string;

  @Prop()
  encryptedPassword: string;

  @Prop()
  iv: string;

  @Prop()
  authTag: string;

  @Prop({ default: 'ACTIVE', enum: ['ACTIVE', 'NEED_RELOGIN', 'INVALID', 'LOCKED'] })
  status: string;

  @Prop()
  lastUsedAt: Date;

  @Prop({ default: 0 })
  reportCount: number;

  @Prop()
  createdAt: Date;
}

export const AccountSchema = SchemaFactory.createForClass(Account);
