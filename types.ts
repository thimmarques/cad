
export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  status: 'active' | 'inactive' | 'pending';
  notes: string;
  createdAt: string;
}

export interface ClientStats {
  total: number;
  active: number;
  inactive: number;
  pending: number;
}
