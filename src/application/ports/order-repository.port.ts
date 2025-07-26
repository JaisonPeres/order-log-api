import { User } from '../../domain/user';

export interface FindFilters {
  orderId?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface OrderRepositoryPort {
  saveAll(users: User[]): Promise<void>;
  find(filters?: FindFilters): Promise<User[]>;
}
