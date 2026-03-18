export interface Member {
  id?: string;
  name: string;
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
  gender: string;
  photoUrl: string;
  address: string;
  mobile: string;
  dob: string;
  age: number;
  standard: string;
  medium: string;
  board: string;
  education: string;
  job: string;
  jobField: string;
  maritalStatus: string;
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
