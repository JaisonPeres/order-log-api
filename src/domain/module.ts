import { FastifyTypeInstance } from '../infrastructure/types';

export interface IModule {
  register(app: FastifyTypeInstance): void;
  info: {
    name: string;
    description: string;
  };
}
