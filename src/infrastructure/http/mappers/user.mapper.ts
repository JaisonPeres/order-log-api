import { User } from '../../../domain/user';
import { ResultUserSchema } from '../schemas/orders/result-user.schema';

export class UserMapper {
  static toResponse(users: User[]): ResultUserSchema {
    return users.map((user) => ({
      user_id: user.id,
      name: user.name,
      orders: user.orders.map((order) => ({
        order_id: order.id,
        total: this.parseMoney(order.products.reduce((sum, product) => sum + product.value, 0)),
        date: order.date.toISOString().split('T')[0],
        products: order.products.map((product) => ({
          product_id: product.id,
          product_value: this.parseMoney(product.value),
        })),
      })),
    }));
  }
  static parseMoney(moneyInCents: number): string {
    return (moneyInCents / 100).toString();
  }
}
