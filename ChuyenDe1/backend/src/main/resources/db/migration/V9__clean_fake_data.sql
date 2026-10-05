-- V9: Xóa toàn bộ dữ liệu mẫu / fake để hệ thống bắt đầu với cơ sở dữ liệu sạch (sẵn sàng cho việc Import thực tế)
-- Giữ lại các bảng cấu hình: sys_roles, sys_users (để đăng nhập admin/analyst), categories, products.

SET FOREIGN_KEY_CHECKS = 0;

TRUNCATE TABLE order_details;
TRUNCATE TABLE reviews;
TRUNCATE TABLE user_activity_logs;
TRUNCATE TABLE segment_history;
TRUNCATE TABLE customer_segments;
TRUNCATE TABLE orders;
TRUNCATE TABLE customers;
TRUNCATE TABLE import_logs;
TRUNCATE TABLE import_mappings;

SET FOREIGN_KEY_CHECKS = 1;

-- Kích hoạt lại thủ tục RFM để cập nhật trạng thái sạch cho CSDL
CALL sp_calculate_rfm();
