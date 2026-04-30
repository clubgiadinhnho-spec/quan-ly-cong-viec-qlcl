import { User } from './types';

export const SECURITY_QUESTIONS = [
  'Quyển sách bạn thích nhất tên là gì?',
  'Mẹ bạn tên gì?',
  'Tên con vật đầu tiên bạn nuôi là gì?',
  'Trường cấp 1 của bạn tên gì?',
  'Món ăn bạn thích nhất là gì?',
  'Thành phố bạn sinh ra là gì?'
];

export const STAFF_LIST: User[] = [
  {
    id: 'mgr-01',
    name: 'Lê Nhật Trường',
    code: 'M001',
    abbreviation: 'LNT',
    phone: '0907767304',
    zalo: '0907767304',
    companyEmail: 'lenhattruong.tpp@gmail.com',
    personalEmail: 'nhattruong@gmail.com',
    role: 'Admin',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Truong',
    status: 'ACTIVE',
    securityQuestion: SECURITY_QUESTIONS[0],
    securityAnswer: 'Dế Mèn Phiêu Lưu Ký',
  },
  {
    id: 'mgr-tp',
    name: 'Quản Trị Viên',
    code: 'TP001',
    abbreviation: 'TP',
    phone: '0901234567',
    zalo: '0901234567',
    companyEmail: 'tanphuvietnam.tpp@gmail.com',
    personalEmail: 'tanphuvietnam.tpp@gmail.com',
    role: 'Admin',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Admin',
    status: 'ACTIVE',
    securityQuestion: SECURITY_QUESTIONS[0],
    securityAnswer: 'Tan Phu',
  },
  {
    id: 'lead-01',
    name: 'Bành Nhựt Hùng',
    code: 'L001',
    abbreviation: 'BNH',
    phone: '0907654321',
    zalo: '0907654321',
    companyEmail: 'hung.banh@tanphuvietnam.vn',
    personalEmail: 'nhuthung@gmail.com',
    role: 'Nhân Viên',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Hung',
    status: 'ACTIVE',
    securityQuestion: SECURITY_QUESTIONS[2],
    securityAnswer: 'Lu'
  },
  {
    id: 'staff-01',
    name: 'Võ Thị Mỹ Tân',
    code: 'S0001',
    abbreviation: 'VMT',
    phone: '0345993542',
    zalo: '0345993542',
    companyEmail: 'tan.vo@tanphuvietnam.vn',
    personalEmail: 'mytan@gmail.com',
    role: 'Trưởng Nhóm',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Tan&mouth=smile&eyebrows=default',
    status: 'ACTIVE',
    securityQuestion: SECURITY_QUESTIONS[1],
    securityAnswer: 'Hoa'
  },
  {
    id: 'staff-02',
    name: 'Nguyễn Kiều Phan Tú',
    code: 'S002',
    abbreviation: 'NPT',
    phone: '0922345678',
    zalo: '0922345678',
    companyEmail: 'tu.nguyen@tanphuvietnam.vn',
    personalEmail: 'phantu@gmail.com',
    role: 'Nhân Viên',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=PhanTu',
    status: 'ACTIVE',
    securityQuestion: SECURITY_QUESTIONS[3],
    securityAnswer: 'Nguyễn Văn Trỗi'
  }
];
