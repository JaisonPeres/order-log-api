import { User } from '../../domain/user';
import { OrderRepositoryPort } from '../ports/order-repository.port';

export interface OrderFilters {
  orderId?: string;
  startDate?: Date;
  endDate?: Date;
}

export class QueryOrders {
  constructor(private readonly repository: OrderRepositoryPort) {}

  async execute(filters?: OrderFilters): Promise<User[]> {
    return this.repository.find(filters);
  }
}
