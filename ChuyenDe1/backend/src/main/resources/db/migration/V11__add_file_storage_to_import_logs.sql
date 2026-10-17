-- V11: Thêm trường lưu trữ file vật lý trên server vào bảng import_logs
ALTER TABLE import_logs
ADD COLUMN file_name VARCHAR(255) NULL AFTER source,
ADD COLUMN stored_file_path VARCHAR(500) NULL AFTER file_name,
ADD COLUMN file_size BIGINT NULL AFTER stored_file_path;
