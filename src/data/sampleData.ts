import { Task } from '../types';

export const SAMPLE_TASKS: Omit<Task, 'id'>[] = [
  {
    code: 'C0001',
    issueDate: '2026-03-01',
    title: 'Thống kê tổng hợp Khiếu nại khách hàng của các chi nhánh và báo cáo hàng tuần',
    objective: 'Báo cáo BLĐ để nắm về tình hình chất lượng',
    assigneeId: 'lead-01', // Hùng
    startDate: '2026-03-01',
    expectedEndDate: '2026-05-30',
    prevProgress: 'Đã báo cáo theo dõi KNKH W15 đến BLĐ',
    currentUpdate: 'Đã báo cáo theo dõi KNKH W17 đến BLĐ',
    status: 'IN_PROGRESS',
    priority: 'HIGH',
    isHighlighted: true,
    isLocked: false,
    history: [{ version: 1, content: 'Khởi tạo công việc.', timestamp: new Date().toISOString(), authorId: 'mgr-01' }]
  },
  {
    code: 'C0002',
    issueDate: '2024-05-31',
    title: 'Phối hợp với CN.BNI triển khai kiểm soát NVL đầu vào (Hạt màu)',
    objective: 'Đáp ứng yêu cầu đã đề ra',
    assigneeId: 'lead-01', // Hùng
    startDate: '2024-05-31',
    expectedEndDate: '2026-05-30',
    prevProgress: 'Đã trao đổi với Anh Cường để nhắc lại vấn đề này',
    currentUpdate: 'BNI phản hồi sẽ xem xét và triển khai lại',
    status: 'IN_PROGRESS',
    priority: 'MEDIUM',
    isHighlighted: false,
    isLocked: false,
    history: [{ version: 1, content: 'Khởi tạo công việc.', timestamp: new Date().toISOString(), authorId: 'mgr-01' }]
  },
  {
    code: 'C0003',
    issueDate: '2024-12-20',
    title: 'Theo dõi các đơn SHTT (INOCHI, AOI) nước ngoài',
    objective: 'Đáp ứng yêu cầu BLĐ',
    assigneeId: 'staff-01', // Tân
    startDate: '2024-12-20',
    expectedEndDate: '2026-05-30',
    prevProgress: 'Xem xét các yêu cầu phúc đáp đơn SHTT ở Mỹ.',
    currentUpdate: 'Gửi danh sách liệt kê dự kiến cho Bross đánh giá qua Luật Sư Mỹ',
    status: 'IN_PROGRESS',
    priority: 'MEDIUM',
    isHighlighted: false,
    isLocked: false,
    history: [{ version: 1, content: 'Khởi tạo công việc.', timestamp: new Date().toISOString(), authorId: 'mgr-01' }]
  },
  {
    code: 'C0004',
    issueDate: '2025-03-13',
    title: 'Xác định hạn sử dụng (HSD) sản phẩm Nước pha sữa AOI',
    objective: 'Đáp ứng yêu cầu khách hàng',
    assigneeId: 'staff-01', // Tân
    startDate: '2025-03-13',
    expectedEndDate: '2026-05-30',
    prevProgress: 'CN BNI tổng hợp và gửi vào W16',
    currentUpdate: 'Đã gửi báo cáo theo dõi HSD, Đạt tiếp tục theo dõi',
    status: 'IN_PROGRESS',
    priority: 'MEDIUM',
    isHighlighted: false,
    isLocked: false,
    history: [{ version: 1, content: 'Khởi tạo công việc.', timestamp: new Date().toISOString(), authorId: 'mgr-01' }]
  },
  {
    code: 'C0005',
    issueDate: '2025-04-28',
    title: 'Theo dõi vụ thử lại màu Avent cho VNM (test lại cho EU)',
    objective: 'Đáp ứng yêu cầu KD',
    assigneeId: 'staff-02', // Tú
    startDate: '2025-08-01',
    expectedEndDate: '2026-05-30',
    prevProgress: 'Tiếp tục theo dõi qua W15',
    currentUpdate: 'Hương PVT cung cấp còn 11 màu chưa đặt, đang chờ phản hồi PKD',
    status: 'IN_PROGRESS',
    priority: 'MEDIUM',
    isHighlighted: false,
    isLocked: false,
    history: [{ version: 1, content: 'Khởi tạo công việc.', timestamp: new Date().toISOString(), authorId: 'mgr-01' }]
  },
  {
    code: 'C0006',
    issueDate: '2025-06-30',
    title: 'Rà soát thông tin viết tắt trên tem nhãn Inochi',
    objective: 'Phù hợp NĐ 15, NĐ 43, NĐ 111',
    assigneeId: 'staff-01', // Tân
    startDate: '2025-06-30',
    expectedEndDate: '2026-05-30',
    prevProgress: 'Tick vào danh mục HSTCB và cập nhật',
    currentUpdate: 'Tiếp tục thực hiện cập nhật theo danh mục',
    status: 'IN_PROGRESS',
    priority: 'MEDIUM',
    isHighlighted: false,
    isLocked: false,
    history: [{ version: 1, content: 'Khởi tạo công việc.', timestamp: new Date().toISOString(), authorId: 'mgr-01' }]
  },
  {
    code: 'C0007',
    issueDate: '2025-10-01',
    title: 'Soát xét lại HD gửi mẫu kiểm nghiệm bên ngoài',
    objective: 'Đáp ứng yêu cầu',
    assigneeId: 'staff-02', // Tú
    startDate: '2025-10-01',
    expectedEndDate: '2026-05-30',
    prevProgress: 'Đã gửi Tân xem xét',
    currentUpdate: 'Tiếp tục rà soát, dự kiến hoàn thành 30/04',
    status: 'IN_PROGRESS',
    priority: 'MEDIUM',
    isHighlighted: false,
    isLocked: false,
    history: [{ version: 1, content: 'Khởi tạo công việc.', timestamp: new Date().toISOString(), authorId: 'mgr-01' }]
  },
  {
    code: 'C0008',
    issueDate: '2025-10-30',
    title: 'Cảnh báo bổ dung chỉ tiêu ĐỘ BỀN MÀU đối với TCCL',
    objective: 'Đáp ứng yêu cầu',
    assigneeId: 'lead-01', // Hùng
    startDate: '2025-10-30',
    expectedEndDate: '2026-05-30',
    prevProgress: 'Lên kế hoạch thông tin nhắc lại',
    currentUpdate: 'CN.BNI đang thử nghiệm để đưa ra tiêu chuẩn phù hợp',
    status: 'IN_PROGRESS',
    priority: 'MEDIUM',
    isHighlighted: false,
    isLocked: false,
    history: [{ version: 1, content: 'Khởi tạo công việc.', timestamp: new Date().toISOString(), authorId: 'mgr-01' }]
  },
  {
    code: 'C0009',
    issueDate: '2025-11-12',
    title: 'Bổ sung ký duyệt TCCL khách hàng kênh dự án',
    objective: 'Đáp ứng yêu cầu',
    assigneeId: 'lead-01', // Hùng
    startDate: '2025-11-12',
    expectedEndDate: '2026-05-30',
    prevProgress: 'Yêu cầu kinh doanh B2C gửi hợp đồng',
    currentUpdate: 'Đã gửi một số hợp đồng bổ sung điều khoản cho Anh Trường xem xét',
    status: 'IN_PROGRESS',
    priority: 'MEDIUM',
    isHighlighted: false,
    isLocked: false,
    history: [{ version: 1, content: 'Khởi tạo công việc.', timestamp: new Date().toISOString(), authorId: 'mgr-01' }]
  },
  {
    code: 'C0010',
    issueDate: '2025-11-18',
    title: 'Xem xét hồ sơ kiểm soát chất lượng NCC Today cosmetics',
    objective: 'Đáp ứng yêu cầu',
    assigneeId: 'lead-01', // Hùng
    startDate: '2025-11-18',
    expectedEndDate: '2026-05-30',
    prevProgress: 'Đang tiếp nhận hồ sơ',
    currentUpdate: 'Tiếp tục theo dõi tiến độ phân tích mẫu',
    status: 'IN_PROGRESS',
    priority: 'MEDIUM',
    isHighlighted: false,
    isLocked: false,
    history: [{ version: 1, content: 'Khởi tạo công việc.', timestamp: new Date().toISOString(), authorId: 'mgr-01' }]
  },
  {
    code: 'C0011',
    issueDate: '2025-11-27',
    title: 'Đánh giá nội bộ Kho ICD',
    objective: 'Đáp ứng yêu cầu',
    assigneeId: 'staff-01', // Tân
    startDate: '2025-11-27',
    expectedEndDate: '2026-05-30',
    prevProgress: 'Kho ICD gửi hồ sơ khắc phục W16',
    currentUpdate: 'Tiếp tục rà soát các điểm còn tồn đọng',
    status: 'IN_PROGRESS',
    priority: 'MEDIUM',
    isHighlighted: false,
    isLocked: false,
    history: [{ version: 1, content: 'Khởi tạo công việc.', timestamp: new Date().toISOString(), authorId: 'mgr-01' }]
  },
  {
    code: 'C0012',
    issueDate: '2025-12-22',
    title: 'Đôn đốc lập quy trình theo dõi đơn hàng xuất khẩu',
    objective: 'Đáp ứng yêu cầu',
    assigneeId: 'staff-01', // Tân
    startDate: '2025-12-22',
    expectedEndDate: '2026-05-30',
    prevProgress: 'W16 trình ký hồ sơ sơ bộ',
    currentUpdate: 'Đã hoàn thành, đang trình TGĐ phê duyệt chính thức',
    status: 'IN_PROGRESS',
    priority: 'MEDIUM',
    isHighlighted: false,
    isLocked: false,
    history: [{ version: 1, content: 'Khởi tạo công việc.', timestamp: new Date().toISOString(), authorId: 'mgr-01' }]
  },
  {
    code: 'C0013',
    issueDate: '2025-12-24',
    title: 'Xây dựng quy trình BÁN HÀNG KDA CHO B2C',
    objective: 'Đáp ứng yêu cầu',
    assigneeId: 'lead-01', // Hùng
    startDate: '2024-12-24',
    expectedEndDate: '2026-05-30',
    prevProgress: 'Đã nhận quy trình hoàn thiện từ Mr Hoàng',
    currentUpdate: 'Yêu cầu bổ sung biểu mẫu chi tiết vào quy trình',
    status: 'IN_PROGRESS',
    priority: 'MEDIUM',
    isHighlighted: false,
    isLocked: false,
    history: [{ version: 1, content: 'Khởi tạo công việc.', timestamp: new Date().toISOString(), authorId: 'mgr-01' }]
  },
  {
    code: 'C0014',
    issueDate: '2026-01-12',
    title: 'Triển khai cho các BP/ĐV đánh giá rủi ro 2026',
    objective: 'Đáp ứng yêu cầu',
    assigneeId: 'staff-01', // Tân
    startDate: '2026-01-12',
    expectedEndDate: '2026-05-30',
    prevProgress: 'Đang tổng hợp các báo cáo từ đơn vị',
    currentUpdate: 'Đã thực hiện xong và đang rà soát lại dữ liệu cuối',
    status: 'IN_PROGRESS',
    priority: 'MEDIUM',
    isHighlighted: false,
    isLocked: false,
    history: [{ version: 1, content: 'Khởi tạo công việc.', timestamp: new Date().toISOString(), authorId: 'mgr-01' }]
  },
  {
    code: 'C0015',
    issueDate: '2026-01-29',
    title: 'Triển khai hồ sơ Ấm đun siêu tốc KDA - KH PMG',
    objective: 'Đáp ứng yêu cầu',
    assigneeId: 'lead-01', // Hùng
    startDate: '2026-01-29',
    expectedEndDate: '2026-05-30',
    prevProgress: 'Hoàn thiện bản nháp hồ sơ kiểm nghiệm',
    currentUpdate: 'Đã gửi SATTP, chờ phê duyệt để đăng tải web',
    status: 'IN_PROGRESS',
    priority: 'MEDIUM',
    isHighlighted: false,
    isLocked: false,
    history: [{ version: 1, content: 'Khởi tạo công việc.', timestamp: new Date().toISOString(), authorId: 'mgr-01' }]
  }
];
