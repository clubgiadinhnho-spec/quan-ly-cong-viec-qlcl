import { User } from '../types';

export const FIXED_STAFF: User[] = [
  {
    id: 'ADMIN_TRUONG',
    name: 'Lê Nhật Trường',
    code: 'ADMIN-01',
    abbreviation: 'LNT',
    role: 'Admin',
    phone: '0901234567',
    companyEmail: 'truong.le@tanphu.vn',
    personalEmail: 'truong.le@gmail.com',
    status: 'ACTIVE',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Truong',
    securityQuestion: 'Tên con vật đầu tiên của bạn?',
    securityAnswer: 'Cho'
  },
  {
    id: 'ADMIN_SYSTEM',
    name: 'Quản Trị Viên',
    code: 'ADMIN-00',
    abbreviation: 'QTV',
    role: 'Admin',
    phone: '0900000000',
    companyEmail: 'admin@tanphu.vn',
    personalEmail: 'admin@gmail.com',
    status: 'ACTIVE',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Admin',
    securityQuestion: 'Mã số bí mật?',
    securityAnswer: '9999'
  },
  {
    id: 'STAFF_HUNG',
    name: 'Bành Nhựt Hùng',
    code: 'QC-001',
    abbreviation: 'BNH',
    role: 'Staff',
    phone: '0901112233',
    companyEmail: 'hung.banh@tanphu.vn',
    personalEmail: 'hung.banh@gmail.com',
    status: 'ACTIVE',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Hung',
    securityQuestion: 'Thành phố yêu thích?',
    securityAnswer: 'Saigon'
  },
  {
    id: 'LEADER_TAN',
    name: 'Võ Thị Mỹ Tân',
    code: 'QC-002',
    abbreviation: 'VMT',
    role: 'Leader',
    phone: '0902223344',
    companyEmail: 'tan.vo@tanphu.vn',
    personalEmail: 'tan.vo@gmail.com',
    status: 'ACTIVE',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Tan',
    securityQuestion: 'Màu sắc yêu thích?',
    securityAnswer: 'Xanh'
  },
  {
    id: 'STAFF_TU',
    name: 'Nguyễn Kiều Phan Tú',
    code: 'QC-003',
    abbreviation: 'NKPT',
    role: 'Staff',
    phone: '0903334455',
    companyEmail: 'tu.nguyen@tanphu.vn',
    personalEmail: 'tu.nguyen@gmail.com',
    status: 'ACTIVE',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Tu',
    securityQuestion: 'Tên trường tiểu học?',
    securityAnswer: 'TanPhu'
  }
];
