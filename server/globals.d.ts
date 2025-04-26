import { Express } from 'express';

declare global {
  var app: Express | undefined;
}