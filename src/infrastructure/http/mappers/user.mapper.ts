import { User } from '../../../domain/user';
import { UsersSchema } from '../schemas/orders/user.schema';

export class UserMapper {
  static toResponse(users: User[]): UsersSchema {
    return users.map(user => ({
      id: user.id,
      name: user.name,
      orders: user.orders.map(order => ({
        id: order.id,
        date: order.date.toISOString(),
        products: order.products.map(product => ({
          id: product.id,
          name: product.name,
          value: product.value
        })),
        total: order.products.reduce((sum, product) => sum + product.value, 0)
      }))
    }));
  }
}
