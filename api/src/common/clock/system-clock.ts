import { Injectable } from '@nestjs/common';
import { Clock } from './clock.types';

@Injectable()
export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}
