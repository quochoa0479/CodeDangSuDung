export interface SegmentMeta {
  key: string;
  nameVi: string;
  color: string;
  bgLight: string;
  badgeBg: string;
  borderColor: string;
  description: string;
  actionStrategy: string;
}

export const SEGMENT_METAS: Record<string, SegmentMeta> = {
  CHAMPIONS: {
    key: 'CHAMPIONS',
    nameVi: 'Khách hàng VIP (Champions)',
    color: '#10B981',
    bgLight: 'rgba(16, 185, 129, 0.12)',
    badgeBg: '#D1FAE5',
    borderColor: '#34D399',
    description: 'Mua thường xuyên nhất, gần đây nhất và chi tiêu nhiều nhất.',
    actionStrategy: 'Tri ân VIP, quyền lợi ưu tiên, mời tham gia trải nghiệm sản phẩm mới đầu tiên.',
  },
  LOYAL_CUSTOMERS: {
    key: 'LOYAL_CUSTOMERS',
    nameVi: 'Khách hàng Trung thành',
    color: '#3B82F6',
    bgLight: 'rgba(59, 130, 246, 0.12)',
    badgeBg: '#DBEAFE',
    borderColor: '#60A5FA',
    description: 'Thường xuyên mua hàng, chi tiêu tốt và có độ gắn bó cao.',
    actionStrategy: 'Upsell sản phẩm giá trị cao hơn, áp dụng chương trình tích lũy điểm đổi quà.',
  },
  POTENTIAL_LOYALISTS: {
    key: 'POTENTIAL_LOYALISTS',
    nameVi: 'Khách hàng Tiềm năng',
    color: '#8B5CF6',
    bgLight: 'rgba(139, 92, 246, 0.12)',
    badgeBg: '#EDE9FE',
    borderColor: '#A78BFA',
    description: 'Đã mua gần đây với tần suất khá, chi tiêu triển vọng.',
    actionStrategy: 'Đề xuất danh mục ưa chuộng, tặng voucher cho lần mua kế tiếp.',
  },
  NEW_CUSTOMERS: {
    key: 'NEW_CUSTOMERS',
    nameVi: 'Khách hàng Mới',
    color: '#06B6D4',
    bgLight: 'rgba(6, 182, 212, 0.12)',
    badgeBg: '#CFFAFE',
    borderColor: '#22D3EE',
    description: 'Vừa mới mua đơn đầu tiên gần đây.',
    actionStrategy: 'Onboarding hướng dẫn dịch vụ, khảo sát độ hài lòng sau đơn hàng đầu.',
  },
  PROMISING: {
    key: 'PROMISING',
    nameVi: 'Khách hàng Triển vọng',
    color: '#F59E0B',
    bgLight: 'rgba(245, 158, 11, 0.12)',
    badgeBg: '#FEF3C7',
    borderColor: '#FBBF24',
    description: 'Mua sắm gần đây nhưng số lượng đơn và chi tiêu chưa cao.',
    actionStrategy: 'Gợi ý các combo ưu đãi, tăng nhận thức về các dòng sản phẩm đa dạng.',
  },
  CANNOT_LOSE_THEM: {
    key: 'CANNOT_LOSE_THEM',
    nameVi: 'Không thể để mất (Can\'t Lose)',
    color: '#EC4899',
    bgLight: 'rgba(236, 72, 153, 0.12)',
    badgeBg: '#FCE7F3',
    borderColor: '#F472B6',
    description: 'Từng là khách VIP chi tiêu cực lớn nhưng đã lâu chưa quay lại mua hàng.',
    actionStrategy: 'Chăm sóc 1-1 khẩn cấp từ quản lý, tặng ưu đãi đặc biệt để kích hoạt lại.',
  },
  AT_RISK: {
    key: 'AT_RISK',
    nameVi: 'Nguy cơ rời bỏ (At Risk)',
    color: '#F97316',
    bgLight: 'rgba(249, 115, 22, 0.12)',
    badgeBg: '#FFEDD5',
    borderColor: '#FB923C',
    description: 'Từng mua thường xuyên nhưng thời gian không mua đã kéo dài.',
    actionStrategy: 'Gửi email/SMS cá nhân hóa, cung cấp mã giảm giá giới hạn thời gian.',
  },
  ABOUT_TO_SLEEP: {
    key: 'ABOUT_TO_SLEEP',
    nameVi: 'Sắp ngủ đông (About to Sleep)',
    color: '#EAB308',
    bgLight: 'rgba(234, 179, 8, 0.12)',
    badgeBg: '#FEF9C3',
    borderColor: '#FDE047',
    description: 'Điểm R và F thấp, có nguy cơ trở thành khách ngủ đông hoàn toàn.',
    actionStrategy: 'Chia sẻ thông tin sản phẩm mới hấp dẫn, chiến dịch tái tương tác.',
  },
  HIBERNATING: {
    key: 'HIBERNATING',
    nameVi: 'Đang ngủ đông (Hibernating)',
    color: '#64748B',
    bgLight: 'rgba(100, 116, 139, 0.12)',
    badgeBg: '#F1F5F9',
    borderColor: '#94A3B8',
    description: 'Lần mua cuối đã rất lâu, tổng số đơn và chi tiêu thấp.',
    actionStrategy: 'Khảo sát lý do ngừng mua, giảm giá xả kho hoặc thông báo sự kiện lớn.',
  },
  LOST: {
    key: 'LOST',
    nameVi: 'Đã rời bỏ (Lost)',
    color: '#EF4444',
    bgLight: 'rgba(239, 68, 68, 0.12)',
    badgeBg: '#FEE2E2',
    borderColor: '#F87171',
    description: 'Chỉ số RFM thấp nhất, không còn tương tác với hệ thống.',
    actionStrategy: 'Không nên tốn nhiều chi phí tiếp thị, chỉ gửi chiến dịch remarketing tự động.',
  },
};

export const getSegmentMeta = (segment?: string): SegmentMeta => {
  if (!segment) {
    return {
      key: 'UNKNOWN',
      nameVi: 'Chưa phân loại',
      color: '#94A3B8',
      bgLight: 'rgba(148, 163, 184, 0.12)',
      badgeBg: '#F1F5F9',
      borderColor: '#CBD5E1',
      description: 'Chưa có đủ lịch sử giao dịch để phân loại.',
      actionStrategy: 'Khuyến khích thực hiện đơn hàng đầu tiên.',
    };
  }
  const normalized = segment.toUpperCase().replace(/\s+/g, '_');
  return SEGMENT_METAS[normalized] || {
    key: normalized,
    nameVi: segment,
    color: '#6366F1',
    bgLight: 'rgba(99, 102, 241, 0.12)',
    badgeBg: '#E0E7FF',
    borderColor: '#818CF8',
    description: 'Phân khúc khách hàng',
    actionStrategy: 'Tương tác thông thường',
  };
};
