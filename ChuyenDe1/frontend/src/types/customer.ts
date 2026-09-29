export interface CustomerSegmentDto {
  id: number;
  customerId: number;
  customerCode: string;
  fullName: string;
  email: string;
  phone: string;
  city: string;
  recencyDays: number;
  frequency: number;
  monetary: number;
  rScore?: number;
  fScore?: number;
  mScore?: number;
  rscore?: number;
  fscore?: number;
  mscore?: number;
  rfmTotal: number;
  segment: string;
  totalViews: number;
  totalCartAdds: number;
  totalPurchases: number;
  totalReviews: number;
  avgOrderValue: number;
  preferredCategory?: string;
  lastPurchaseAt?: string;
  calculatedAt: string;
}

export interface OrderDetailDto {
  id: number;
  productId: number;
  productName: string;
  categoryName?: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface OrderDto {
  id: number;
  orderCode: string;
  customerId: number;
  customerName: string;
  totalAmount: number;
  orderStatus: string;
  paymentMethod?: string;
  orderDate: string;
  itemsCount: number;
  items: OrderDetailDto[];
}

export interface UserActivityLogDto {
  id: number;
  customerId: number;
  customerName: string;
  actionType: string;
  productId?: number;
  productName?: string;
  categoryId?: number;
  categoryName?: string;
  searchKeyword?: string;
  durationSeconds?: number;
  deviceType?: string;
  createdAt: string;
}

export interface SegmentHistory {
  id: number;
  customerId: number;
  oldSegment?: string;
  newSegment: string;
  oldRfmTotal?: number;
  newRfmTotal: number;
  changedAt: string;
  reason?: string;
}

export interface CustomerDetailDto {
  id: number;
  customerCode: string;
  fullName: string;
  email: string;
  phone: string;
  gender?: string;
  city?: string;
  createdAt: string;

  segment: string;
  rScore?: number;
  fScore?: number;
  mScore?: number;
  rscore?: number;
  fscore?: number;
  mscore?: number;
  rfmTotal: number;
  recencyDays: number;
  frequency: number;
  monetary: number;
  avgOrderValue: number;
  preferredCategory?: string;
  lastPurchaseAt?: string;
  lastActiveAt?: string;
  calculatedAt?: string;

  totalViews: number;
  totalCartAdds: number;
  totalPurchases: number;
  totalReviews: number;

  recentOrders: OrderDto[];
  recentActivities: UserActivityLogDto[];
  segmentHistory: SegmentHistory[];
}
