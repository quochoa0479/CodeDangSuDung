

DROP TRIGGER IF EXISTS trg_track_segment_change$$
CREATE TRIGGER trg_track_segment_change
AFTER UPDATE ON customer_segments
FOR EACH ROW
BEGIN
    IF (NOT(OLD.segment <=> NEW.segment) OR NOT(OLD.rfm_total <=> NEW.rfm_total)) THEN
        INSERT INTO segment_history (
            customer_id,
            old_segment,
            new_segment,
            old_rfm_total,
            new_rfm_total,
            changed_at,
            reason
        ) VALUES (
            NEW.customer_id,
            OLD.segment,
            NEW.segment,
            OLD.rfm_total,
            NEW.rfm_total,
            NOW(),
            'SCHEDULED_RECALCULATION'
        );
    END IF;
END$$

DELIMITER ;
