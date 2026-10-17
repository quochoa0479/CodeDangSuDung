package com.cd1.rfmanalytics.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "import_logs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ImportLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "import_type", nullable = false, length = 20)
    private String importType;

    @Column(nullable = false, length = 20)
    private String source;

    @Column(name = "table_name", nullable = false, length = 50)
    private String tableName;

    @Column(name = "file_name")
    private String fileName;

    @Column(name = "stored_file_path", length = 500)
    private String storedFilePath;

    @Column(name = "file_size")
    private Long fileSize;

    @Column(name = "records_imported")
    @Builder.Default
    private Integer recordsImported = 0;

    @Column(name = "records_updated")
    @Builder.Default
    private Integer recordsUpdated = 0;

    @Column(name = "records_failed")
    @Builder.Default
    private Integer recordsFailed = 0;

    @Column(length = 20)
    @Builder.Default
    private String status = "RUNNING";

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @Column(name = "started_at")
    private LocalDateTime startedAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;
}
