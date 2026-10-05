
SET GLOBAL event_scheduler = ON;

DELIMITER $$

DROP EVENT IF EXISTS evt_daily_rfm_calculation$$
CREATE EVENT evt_daily_rfm_calculation
ON SCHEDULE EVERY 1 DAY
STARTS (TIMESTAMP(CURRENT_DATE) + INTERVAL 1 DAY) -- Bắt đầu vào 00:00:00 đêm nay
COMMENT 'Tự động tính toán phân khúc RFM khách hàng hàng ngày lúc 00:00'
DO
BEGIN
    CALL sp_calculate_rfm();
END$$

DELIMITER ;
