import { Order } from './order';

export class User {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly orders: Order[] = []
  ) {}
}
