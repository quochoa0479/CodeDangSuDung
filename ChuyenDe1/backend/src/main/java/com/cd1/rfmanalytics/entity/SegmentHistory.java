package com.cd1.rfmanalytics.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "segment_history")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SegmentHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id", nullable = false)
    private Customer customer;

    @Column(name = "old_segment", length = 50)
    private String oldSegment;

    @Column(name = "new_segment", nullable = false, length = 50)
    private String newSegment;

    @Column(name = "old_rfm_total", precision = 4, scale = 2)
    private BigDecimal oldRfmTotal;

    @Column(name = "new_rfm_total", precision = 4, scale = 2)
    private BigDecimal newRfmTotal;

    @Column(name = "changed_at")
    private LocalDateTime changedAt;

    @Column(length = 100)
    private String reason;
}
