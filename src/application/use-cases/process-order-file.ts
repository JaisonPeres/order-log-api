import { User } from "../../domain/user";
import { Order } from "../../domain/order";
import { Product } from "../../domain/product";
import { OrderRepositoryPort } from "../ports/order-repository.port";

export class ProcessOrderFile {
  constructor(private readonly repository: OrderRepositoryPort) {}

  async execute(fileContent: string): Promise<User[]> {
    const parsedUsers = this.parseLegacyFile(fileContent);
    console.log(parsedUsers);
    // todo: save users to repository
    return parsedUsers;
  }

  parseLegacyFile(content: string): User[] {
    const lines = content.split('\n').filter(line => line.trim().length > 0);
    
    const usersMap = new Map<string, User>();
    
    for (const line of lines) {
      if (line.includes('userId') || line.includes('|-') || line.trim().length === 0) {
        continue;
      }
      
      const rawLine = line.trim();
      
      if (rawLine.length < 65) {
        console.warn(`Invalid line format (too short): ${rawLine}`);
        continue;
      }
      
      const userIdStr = rawLine.substring(0, 10).trim();
      const userName = rawLine.substring(10, 40).trim();
      const orderIdStr = rawLine.substring(40, 50).trim();
      const productIdStr = rawLine.substring(50, 58).trim();
      const valueStr = rawLine.substring(58, 67).trim();
      const dateStr = rawLine.substring(67).trim();
      
      
      const userId = userIdStr || '0';
      const orderId = orderIdStr || Date.now();
      const productId = productIdStr || '0';
      const productValue = parseFloat(valueStr) || 0;
      
      let orderDate;
      try {
        if (dateStr && dateStr.length >= 8) {
          const year = parseInt(dateStr.substring(0, 4), 10) || 2000;
          const month = (parseInt(dateStr.substring(4, 6), 10) || 1) - 1;
          const day = parseInt(dateStr.substring(6, 8), 10) || 1;
          orderDate = new Date(year, month, day);
          
          if (isNaN(orderDate.getTime())) {
            orderDate = new Date();
          }
        } else {
          orderDate = new Date();
        }
      } catch (error) {
        console.warn(`Invalid date format: ${dateStr}`);
        orderDate = new Date();
      }
      
      const product = new Product(productId, `Product ${productId}`, productValue);
      
      let user = usersMap.get(userId);
      if (!user) {
        user = new User(userId, userName, []);
        usersMap.set(userId, user);
      }
      
      let order = user.orders.find(o => o.date.toDateString() === orderDate.toDateString());
      
      if (!order) {
        const orderId = (Date.now() + Math.floor(Math.random() * 1000)).toString();
        order = new Order(orderId, orderDate, [product]);
        
        usersMap.set(userId, new User(
          user.id,
          user.name,
          [...user.orders, order]
        ));
      } else {
        const orderIndex = user.orders.findIndex(o => o.date.toDateString() === orderDate.toDateString());
        
        const updatedOrder = new Order(
          order.id,
          order.date,
          [...order.products, product]
        );
        
        const updatedOrders = [...user.orders];
        updatedOrders[orderIndex] = updatedOrder;
        
        usersMap.set(userId, new User(
          user.id,
          user.name,
          updatedOrders
        ));
      }
    }
    
    return Array.from(usersMap.values());
  }
}
