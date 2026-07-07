
export interface Profile {
  id: string;
  name: string;
  department: string;
  role: 'admin' | 'user';
  giving_budget: number;
  received_wallet: number;
  spent_points?: number;
  created_at?: string;
  praise_reset_at?: string;
  points_migrated?: boolean;
}

export interface Transaction {
  id: string;
  sender_id: string;
  receiver_id: string;
  core_value_id: number;
  message: string;
  points: number;
  created_at: string;
  sender?: Profile;
  receiver?: Profile;
}

export interface Withdrawal {
  id: string;
  user_id: string;
  points: number;
  bank_name: string;
  account_number: string;
  account_holder: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  user?: Profile;
}

export interface Notification {
  id: string;
  user_id: string;
  transaction_id?: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface Ceragemership {
  id: number;
  text: string;
}

