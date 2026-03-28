import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ProxyDocument = Proxy & Document;

@Schema({ timestamps: true })
export class Proxy {
  @Prop({ required: true })
  host: string;

  @Prop({ required: true })
  port: number;

  @Prop()
  username: string;

  @Prop()
  password: string;

  @Prop({ default: 'http', enum: ['http', 'https', 'socks4', 'socks5'] })
  type: string;

  @Prop({ default: 'active', enum: ['active', 'banned', 'inactive'] })
  status: string;

  @Prop()
  lastUsedAt: Date;

  @Prop({ default: 0 })
  useCount: number;

  @Prop({ default: 0 })
  failCount: number;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const ProxySchema = SchemaFactory.createForClass(Proxy);
