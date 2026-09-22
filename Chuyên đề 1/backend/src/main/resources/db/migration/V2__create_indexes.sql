-- =====================================================================
-- V2__create_indexes.sql
-- Tối ưu hóa hiệu năng truy vấn (Index Optimization cho CĐ1)
-- =====================================================================

-- 1. Tối ưu hóa truy vấn tính toán RFM trên bảng orders:
-- Covering index phục vụ GROUP BY customer_id, ORDER BY order_date, SUM(total_amount), lọc order_status
CREATE INDEX idx_orders_customer_rfm ON orders (customer_id, order_status, order_date, total_amount);
CREATE INDEX idx_orders_date ON orders (order_date);

-- 2. Tối ưu hóa bảng user_activity_logs (hàng triệu dòng log hành vi):
CREATE INDEX idx_activity_cust_action_time ON user_activity_logs (customer_id, action_type, created_at);
CREATE INDEX idx_activity_product_action ON user_activity_logs (product_id, action_type);

-- 3. Tối ưu hóa tìm kiếm và lọc phân khúc khách hàng:
CREATE INDEX idx_segments_segment_rfm ON customer_segments (segment, rfm_total);
CREATE INDEX idx_segments_scores ON customer_segments (r_score, f_score, m_score);

-- 4. Tối ưu hóa chi tiết đơn hàng:
CREATE INDEX idx_order_details_product ON order_details (product_id, quantity, unit_price);

-- 5. Tối ưu hóa đánh giá:
CREATE INDEX idx_reviews_product_rating ON reviews (product_id, rating);
