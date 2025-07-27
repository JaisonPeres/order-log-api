import { Order } from './order';

export class User {
  constructor(
    public readonly id: number,
    public readonly name: string,
    public readonly orders: Order[] = [],
  ) {}
}
