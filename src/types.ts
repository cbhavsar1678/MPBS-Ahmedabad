export interface Member {
  id?: string;
  name: string;
  dob?: string;
  age: number;
  maritalStatus: string;
  mobile: string;
  area: string;
  address: string;
  isAlive: boolean;
  status: string;
  education: string;
  profession: string;
  gender: string;
  photoUrl: string;
  isActive: boolean;
  role: 'admin' | 'member';
  email: string;
}

export interface FamilyMember {
  id?: string;
  memberId: string;
  name: string;
  relation: string;
  dob?: string;
  age: number;
  gender: string;
  address: string;
  area: string;
  mobile: string;
  email: string;
  isAlive: boolean;
  maritalStatus: string;
  education: string;
  profession: string;
}

export interface Child {
  id?: string;
  memberId: string;
  name: string;
  relation: string;
  gender: string;
  photoUrl: string;
  address: string;
  area: string;
  mobile: string;
  email: string;
  dob?: string;
  age: number;
  isAlive: boolean;
  maritalStatus: string;
  education: string;
  profession: string;
  standard?: string;
  medium?: string;
  board?: string;
  job?: string;
  jobField?: string;
}

export interface Event {
  id?: string;
  name: string;
  description: string;
  date: string;
  location?: string;
  time?: string;
  photos: string[];
  attendees: string[];
  attendedCount?: number;
}

export interface Donation {
  id?: string;
  memberId: string;
  amount: number;
  date: string;
  purpose?: string;
}

export interface AnnualFee {
  id?: string;
  memberId: string;
  amount: number;
  date: string;
  year: string;
}

export interface Team {
  id?: string;
  name: string;
  description?: string;
  creationDate: string;
  members: string[];
  eventName?: string;
}

export interface ExpenseEntry {
  amount: number;
  description: string;
  date: string;
}

export interface EventExpense {
  id?: string;
  eventId: string;
  eventName: string;
  year: string;
  expenses: ExpenseEntry[];
  totalAmount: number;
}

export interface BankDeposit {
  id?: string;
  bankName: string;
  depositorName: string;
  depositAmount: number;
  depositDate: string;
  maturityDate: string;
  maturityTime: string;
  finalAmount: number;
}
