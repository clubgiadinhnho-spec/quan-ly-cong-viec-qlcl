import { User } from '../types';

export const SYSTEM_ADMIN_EMAILS = [
  "truong.le@tanphuvietnam.vn", 
  "lenhattruong.tpp@gmail.com", 
  "lenhattruong.caphef1@gmail.com",
  "club.nhuatanphu@gmail.com", 
  "tanphuvietnam.tpp@gmail.com", 
  "truongln.tanhongngoc@gmail.com"
];

export const FIXED_STAFF: User[] = [
  {
    id: 'LeNhatTruong0907767304',
    name: 'Lê Nhật Trường',
    code: 'ADMIN-01',
    uniqueKey: 'LeNhatTruong0907767304',
    abbreviation: 'LNT',
    role: 'Admin',
    phone: '',
    companyEmail: 'truong.le@tanphuvietnam.vn',
    personalEmail: 'lenhattruong.tpp@gmail.com',
    status: 'ACTIVE',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Truong'
  },
  {
    id: 'ADMIN_SYSTEM',
    name: 'Quản Trị Viên',
    code: 'ADMIN-00',
    uniqueKey: 'QuanTriVien0900000000',
    abbreviation: 'QTV',
    role: 'Admin',
    phone: '0900000000',
    companyEmail: 'admin@tanphuvietnam.vn',
    personalEmail: 'admin@gmail.com',
    status: 'ACTIVE',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Admin'
  }
];
