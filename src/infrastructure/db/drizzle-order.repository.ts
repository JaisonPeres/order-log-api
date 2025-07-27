import { eq, and, gte, lte } from 'drizzle-orm';
import { db } from './client';
import { User as DomainUser } from '../../domain/user';
import { Order as DomainOrder } from '../../domain/order';
import { Product as DomainProduct } from '../../domain/product';
import { FindFilters, OrderRepositoryPort } from '../../application/ports/order-repository.port';
import { users, orders, orderProducts } from './schemas';

export class DrizzleOrderRepository implements OrderRepositoryPort {
  async saveAll(domainUsers: DomainUser[]): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await db.transaction(async (tx: any) => {
      for (const domainUser of domainUsers) {
        await tx
          .insert(users)
          .values({
            id: domainUser.id,
            name: domainUser.name,
          })
          .onConflictDoUpdate({
            target: users.id,
            set: { name: domainUser.name },
          });

        for (const domainOrder of domainUser.orders) {
          await tx
            .insert(orders)
            .values({
              id: domainOrder.id,
              userId: domainUser.id,
              orderDate: domainOrder.date,
            })
            .onConflictDoUpdate({
              target: orders.id,
              set: {
                userId: domainUser.id,
                orderDate: domainOrder.date,
              },
            });

          for (const domainProduct of domainOrder.products) {
            await tx
              .insert(orderProducts)
              .values({
                orderId: domainOrder.id,
                productId: domainProduct.id,
                productName: domainProduct.name,
                productValue: domainProduct.value.toString(), // Convertendo para string para o tipo numeric
              })
              .onConflictDoUpdate({
                target: [orderProducts.orderId, orderProducts.productId],
                set: {
                  productName: domainProduct.name,
                  productValue: domainProduct.value.toString(),
                },
              });
          }
        }
      }
    });
  }

  async find(filters?: FindFilters): Promise<DomainUser[]> {
    const conditions = [];

    if (filters?.orderId) {
      conditions.push(eq(orders.id, filters.orderId));
    }

    if (filters?.startDate) {
      conditions.push(gte(orders.orderDate, filters.startDate));
    }

    if (filters?.endDate) {
      conditions.push(lte(orders.orderDate, filters.endDate));
    }

    const query = db
      .select()
      .from(users)
      .leftJoin(orders, eq(users.id, orders.userId))
      .leftJoin(orderProducts, eq(orders.id, orderProducts.orderId))
      .where(and(...conditions));

    const results = await query;
    return this.mapResultsToDomainUsers(results);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapResultsToDomainUsers(results: any[]): DomainUser[] {
    const usersMap = new Map<number, DomainUser>();
    const ordersMap = new Map<number, DomainOrder>();

    for (const row of results) {
      if (!row.orders) continue;

      const userId = row.users.id;
      const userName = row.users.name;
      const orderId = row.orders.id;
      const orderDate = row.orders.orderDate;

      let user = usersMap.get(userId);
      if (!user) {
        user = new DomainUser(userId, userName, []);
        usersMap.set(userId, user);
      }

      let order = ordersMap.get(orderId);
      if (!order) {
        order = new DomainOrder(orderId, orderDate, []);
        ordersMap.set(orderId, order);

        usersMap.set(userId, new DomainUser(userId, userName, [...user.orders, order]));
      }

      if (row.order_products) {
        const product = new DomainProduct(
          row.order_products.productId,
          row.order_products.productName,
          parseFloat(row.order_products.productValue),
        );

        const updatedOrder = new DomainOrder(orderId, orderDate, [...order.products, product]);

        ordersMap.set(orderId, updatedOrder);

        const userOrders = usersMap.get(userId)!.orders;
        const orderIndex = userOrders.findIndex((o) => o.id === orderId);

        if (orderIndex !== -1) {
          const updatedOrders = [...userOrders];
          updatedOrders[orderIndex] = updatedOrder;

          usersMap.set(userId, new DomainUser(userId, userName, updatedOrders));
        }
      }
    }

    return Array.from(usersMap.values());
  }
}
