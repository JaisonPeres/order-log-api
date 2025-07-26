import { Product } from './product';

export class Order {
  constructor(
    public readonly id: string,
    public readonly date: Date,
    public readonly products: Product[],
  ) {}

  get total(): number {
    return this.products.reduce((sum, p) => sum + p.value, 0);
  }
}
