import { User } from '../../domain/user';
import { Order } from '../../domain/order';
import { Product } from '../../domain/product';
import { OrderRepositoryPort } from '../ports/order-repository.port';
import { Logger } from '../../infrastructure/config/logger';

const logger = Logger.create('ProcessOrderFile');

const COLUMN_SCHEMA: { [key: string]: [number, number] } = {
  id: [0, 10],
  name: [10, 55],
  orderId: [55, 65],
  productId: [65, 75],
  amount: [75, 87], //71 +12
  date: [87, 95],
};
export class ProcessOrderFile {
  constructor(private readonly repository: OrderRepositoryPort) {}

  async execute(fileContent: string): Promise<void> {
    const parsedUsers = this.parseLegacyFile(fileContent);
    await this.repository.saveAll(parsedUsers);
  }

  parseLegacyFile(content: string): User[] {
    const lines = content.split('\n').filter((line) => line.trim().length > 0);

    const usersMap = new Map<number, User>();

    for (const line of lines) {
      if (line.includes('userId') || line.includes('|-') || line.trim().length === 0) {
        continue;
      }

      const rawLine = line.trim();

      if (rawLine.length < 65) {
        logger.warn(`Invalid line format (too short): ${rawLine}`);
        continue;
      }

      const { id, name, orderId, productId, amount, date } = this.parseLine(rawLine);

      let orderDate;
      try {
        if (date && date.length >= 10) {
          orderDate = new Date(date);
          if (isNaN(orderDate.getTime())) {
            orderDate = new Date();
          }
        } else {
          orderDate = new Date();
        }
      } catch (error: unknown) {
        logger.error(error as string);
        logger.error(`Invalid date format: ${date}`);
        orderDate = new Date();
      }

      const product = new Product(productId, `Product ${productId}`, amount);

      let user = usersMap.get(id);
      if (!user) {
        user = new User(id, name, []);
        usersMap.set(id, user);
      }

      let order = user.orders.find((o) => o.date.toDateString() === orderDate.toDateString());

      if (!order) {
        order = new Order(orderId, orderDate, [product]);

        usersMap.set(id, new User(user.id, user.name, [...user.orders, order]));
      } else {
        const orderIndex = user.orders.findIndex(
          (o) => o.date.toDateString() === orderDate.toDateString(),
        );

        const updatedOrder = new Order(order.id, order.date, [...order.products, product]);

        const updatedOrders = [...user.orders];
        updatedOrders[orderIndex] = updatedOrder;

        usersMap.set(id, new User(user.id, user.name, updatedOrders));
      }
    }

    return Array.from(usersMap.values());
  }

  private parseLine(line: string) {
    const get = (range: [number, number]) => line.slice(range[0], range[1]).trim();

    return {
      id: parseInt(get(COLUMN_SCHEMA.id)),
      name: get(COLUMN_SCHEMA.name),
      orderId: parseInt(get(COLUMN_SCHEMA.orderId)),
      productId: parseInt(get(COLUMN_SCHEMA.productId)),
      amount: parseFloat(get(COLUMN_SCHEMA.amount).replace(/\./g, '')) || 0,
      date: get(COLUMN_SCHEMA.date).replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'), // YYYY-MM-DD
    };
  }
}
