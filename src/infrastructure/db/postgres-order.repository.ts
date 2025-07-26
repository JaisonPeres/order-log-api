import { Pool } from 'pg';
import { User } from '../../domain/user';
import { Order } from '../../domain/order';
import { Product } from '../../domain/product';
import { OrderRepositoryPort } from '../../application/ports/order-repository.port';

export class PostgresOrderRepository implements OrderRepositoryPort {
  constructor(private readonly pool: Pool) {}

  async saveAll(users: User[]): Promise<void> {
    // Use a client from the pool and transaction to ensure data consistency
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      for (const user of users) {
        // Insert or update user
        const userResult = await client.query(
          `INSERT INTO users (id, name) 
           VALUES ($1, $2) 
           ON CONFLICT (id) DO UPDATE SET name = $2
           RETURNING id`,
          [user.id, user.name]
        );
        
        for (const order of user.orders) {
          // Insert order
          const orderResult = await client.query(
            `INSERT INTO orders (id, user_id, order_date) 
             VALUES ($1, $2, $3)
             ON CONFLICT (id) DO UPDATE SET user_id = $2, order_date = $3
             RETURNING id`,
            [order.id, user.id, order.date]
          );
          
          // Insert products for this order
          for (const product of order.products) {
            await client.query(
              `INSERT INTO order_products (order_id, product_id, product_name, product_value) 
               VALUES ($1, $2, $3, $4)
               ON CONFLICT (order_id, product_id) DO UPDATE SET 
               product_name = $3, product_value = $4`,
              [order.id, product.id, product.name, product.value]
            );
          }
        }
      }
      
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async find(filters?: { orderId?: number, startDate?: Date, endDate?: Date }): Promise<User[]> {
    // Build the query based on filters
    let query = `
      SELECT 
        u.id as user_id, 
        u.name as user_name,
        o.id as order_id, 
        o.order_date,
        p.product_id, 
        p.product_name, 
        p.product_value
      FROM users u
      LEFT JOIN orders o ON u.id = o.user_id
      LEFT JOIN order_products p ON o.id = p.order_id
      WHERE 1=1
    `;
    
    const params: any[] = [];
    let paramIndex = 1;
    
    // Add filters if provided
    if (filters?.orderId) {
      query += ` AND o.id = $${paramIndex}`;
      params.push(filters.orderId);
      paramIndex++;
    }
    
    if (filters?.startDate) {
      query += ` AND o.order_date >= $${paramIndex}`;
      params.push(filters.startDate);
      paramIndex++;
    }
    
    if (filters?.endDate) {
      query += ` AND o.order_date <= $${paramIndex}`;
      params.push(filters.endDate);
      paramIndex++;
    }
    
    query += ' ORDER BY u.id, o.order_date, p.product_id';
    
    // Execute the query
    const result = await this.pool.query(query, params);
    
    // Process the result into domain objects
    return this.mapResultToUsers(result.rows);
  }

  private mapResultToUsers(rows: any[]): User[] {
    const usersMap = new Map<number, User>();
    const ordersMap = new Map<number, Order>();
    
    for (const row of rows) {
      // Skip if no order data (possible with LEFT JOIN)
      if (!row.order_id) continue;
      
      // Get or create user
      let user = usersMap.get(row.user_id);
      if (!user) {
        user = new User(row.user_id, row.user_name, []);
        usersMap.set(row.user_id, user);
      }
      
      // Get or create order
      let order = ordersMap.get(row.order_id);
      if (!order) {
        order = new Order(row.order_id, new Date(row.order_date), []);
        ordersMap.set(row.order_id, order);
        
        // Create a new User with the updated orders
        usersMap.set(row.user_id, new User(
          user.id,
          user.name,
          [...user.orders, order]
        ));
      }
      
      // Add product to order
      if (row.product_id) {
        const product = new Product(
          row.product_id,
          row.product_name,
          row.product_value
        );
        
        // Update order with new product
        const updatedOrder = new Order(
          order.id,
          order.date,
          [...order.products, product]
        );
        
        // Replace old order with updated one
        ordersMap.set(row.order_id, updatedOrder);
        
        // Find and replace the order in the user's orders array
        const userOrders = usersMap.get(row.user_id)!.orders;
        const orderIndex = userOrders.findIndex(o => o.id === row.order_id);
        
        if (orderIndex !== -1) {
          const updatedOrders = [...userOrders];
          updatedOrders[orderIndex] = updatedOrder;
          
          // Create a new User with updated orders
          usersMap.set(row.user_id, new User(
            row.user_id,
            row.user_name,
            updatedOrders
          ));
        }
      }
    }
    
    return Array.from(usersMap.values());
  }
}
