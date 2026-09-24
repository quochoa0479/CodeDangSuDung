package com.cd1.rfmanalytics.service;

import com.cd1.rfmanalytics.dto.CsvPreviewDto;
import com.cd1.rfmanalytics.dto.ImportRequestDto;
import com.cd1.rfmanalytics.entity.*;
import com.cd1.rfmanalytics.repository.*;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.opencsv.CSVReader;
import com.opencsv.exceptions.CsvException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.FileReader;
import java.io.IOException;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
@RequiredArgsConstructor
public class CsvImportService {

    private final CustomerRepository customerRepository;
    private final OrderRepository orderRepository;
    private final OrderDetailRepository orderDetailRepository;
    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final UserActivityLogRepository activityLogRepository;
    private final ReviewRepository reviewRepository;
    private final ImportLogRepository importLogRepository;
    private final ImportMappingRepository mappingRepository;
    private final ObjectMapper objectMapper;
    private final JdbcTemplate jdbcTemplate;

    private final Map<String, Path> tempFileStorage = new ConcurrentHashMap<>();

    private static final Map<String, List<String>> TARGET_FIELDS = Map.of(
            "customers", List.of("customer_code", "full_name", "email", "phone", "gender", "city"),
            "orders", List.of("order_code", "customer_code", "total_amount", "order_status", "payment_method", "order_date"),
            "user_activity_logs", List.of("customer_code", "action_type", "product_id", "duration_seconds", "device_type", "created_at"),
            "reviews", List.of("customer_code", "product_id", "rating", "comment", "created_at")
    );

    public CsvPreviewDto previewCsv(MultipartFile file, String targetTable) throws IOException, CsvException {
        String fileId = UUID.randomUUID().toString();
        Path tempPath = Files.createTempFile("csv_import_" + fileId, ".csv");
        file.transferTo(tempPath.toFile());
        tempFileStorage.put(fileId, tempPath);

        try (CSVReader reader = new CSVReader(new FileReader(tempPath.toFile()))) {
            List<String[]> allRows = reader.readAll();
            if (allRows.isEmpty()) {
                throw new IllegalArgumentException("CSV file is empty");
            }

            String[] headerArray = allRows.get(0);
            List<String> headers = Arrays.asList(headerArray);

            List<Map<String, String>> sampleRows = new ArrayList<>();
            int maxSamples = Math.min(5, allRows.size() - 1);
            for (int i = 1; i <= maxSamples; i++) {
                String[] row = allRows.get(i);
                Map<String, String> rowMap = new LinkedHashMap<>();
                for (int j = 0; j < headers.size() && j < row.length; j++) {
                    rowMap.put(headers.get(j), row[j]);
                }
                sampleRows.add(rowMap);
            }

            List<String> targetFields = TARGET_FIELDS.getOrDefault(targetTable.toLowerCase(), Collections.emptyList());

            return CsvPreviewDto.builder()
                    .fileId(fileId)
                    .fileName(file.getOriginalFilename())
                    .totalRows(allRows.size() - 1)
                    .headers(headers)
                    .sampleRows(sampleRows)
                    .targetFields(targetFields)
                    .build();
        }
    }

    public ImportLog processImport(ImportRequestDto request) throws IOException, CsvException {
        Path filePath = tempFileStorage.get(request.getFileId());
        if (filePath == null || !Files.exists(filePath)) {
            throw new IllegalArgumentException("Uploaded file session expired or not found. Please re-upload.");
        }

        ImportLog logEntry = ImportLog.builder()
                .importType("FULL")
                .source("CSV")
                .tableName(request.getTargetTable())
                .status("RUNNING")
                .startedAt(LocalDateTime.now())
                .recordsImported(0)
                .recordsUpdated(0)
                .recordsFailed(0)
                .build();
        logEntry = importLogRepository.save(logEntry);

        int imported = 0;
        int failed = 0;

        try (CSVReader reader = new CSVReader(new FileReader(filePath.toFile()))) {
            List<String[]> rows = reader.readAll();
            if (rows.size() > 1) {
                String[] headers = rows.get(0);
                Map<String, Integer> headerIndexMap = new HashMap<>();
                for (int i = 0; i < headers.length; i++) {
                    headerIndexMap.put(headers[i].trim(), i);
                }

                if ("customers".equalsIgnoreCase(request.getTargetTable())) {
                    for (int i = 1; i < rows.size(); i++) {
                        String[] row = rows.get(i);
                        try {
                            String code = getMappedValue(row, headerIndexMap, request.getColumnMapping().get("customer_code"));
                            String name = getMappedValue(row, headerIndexMap, request.getColumnMapping().get("full_name"));
                            String email = getMappedValue(row, headerIndexMap, request.getColumnMapping().get("email"));
                            String phone = getMappedValue(row, headerIndexMap, request.getColumnMapping().get("phone"));
                            String city = getMappedValue(row, headerIndexMap, request.getColumnMapping().get("city"));
                            String gender = getMappedValue(row, headerIndexMap, request.getColumnMapping().get("gender"));

                            if (name == null || name.isBlank()) {
                                name = "Customer " + (code != null ? code : i);
                            }

                            Customer customer = Customer.builder()
                                    .customerCode(code != null ? code : "CUST_" + System.currentTimeMillis() + "_" + i)
                                    .fullName(name)
                                    .email(email != null && !email.isBlank() ? email : "cust" + System.currentTimeMillis() + "_" + i + "@example.com")
                                    .phone(phone)
                                    .gender(gender)
                                    .city(city)
                                    .createdAt(LocalDateTime.now())
                                    .build();

                            customerRepository.save(customer);
                            imported++;
                        } catch (Exception ex) {
                            failed++;
                        }
                    }
                } else if ("orders".equalsIgnoreCase(request.getTargetTable())) {
                    for (int i = 1; i < rows.size(); i++) {
                        String[] row = rows.get(i);
                        try {
                            String orderCode = getMappedValue(row, headerIndexMap, request.getColumnMapping().get("order_code"));
                            String custCode = getMappedValue(row, headerIndexMap, request.getColumnMapping().get("customer_code"));
                            String amountStr = getMappedValue(row, headerIndexMap, request.getColumnMapping().get("total_amount"));
                            String status = getMappedValue(row, headerIndexMap, request.getColumnMapping().get("order_status"));
                            String paymentMethod = getMappedValue(row, headerIndexMap, request.getColumnMapping().get("payment_method"));

                            Customer customer = customerRepository.findByCustomerCode(custCode)
                                    .orElseGet(() -> customerRepository.findAll().stream().findFirst().orElse(null));

                            if (customer != null) {
                                BigDecimal totalAmount = (amountStr != null && !amountStr.isBlank())
                                        ? new BigDecimal(amountStr.replaceAll("[^0-9.]", ""))
                                        : BigDecimal.valueOf(500000);

                                Order order = Order.builder()
                                        .orderCode(orderCode != null ? orderCode : "ORD_" + System.currentTimeMillis() + "_" + i)
                                        .customer(customer)
                                        .totalAmount(totalAmount)
                                        .orderStatus(status != null ? status : "COMPLETED")
                                        .paymentMethod(paymentMethod != null ? paymentMethod : "COD")
                                        .orderDate(LocalDateTime.now().minusDays((long) (Math.random() * 60)))
                                        .build();

                                orderRepository.save(order);
                                imported++;
                            } else {
                                failed++;
                            }
                        } catch (Exception ex) {
                            failed++;
                        }
                    }
                }
            }

            logEntry.setStatus("SUCCESS");
            logEntry.setRecordsImported(imported);
            logEntry.setRecordsFailed(failed);
            logEntry.setCompletedAt(LocalDateTime.now());
            importLogRepository.save(logEntry);

            if (request.isSaveAsTemplate() && request.getTemplateName() != null && !request.getTemplateName().isBlank()) {
                saveMapping(request.getTemplateName(), request.getTargetTable(), request.getColumnMapping());
            }

            // Tự động kích hoạt lại thuật toán RFM
            try {
                jdbcTemplate.execute("CALL sp_calculate_rfm()");
            } catch (Exception e) {
                log.warn("Auto RFM calculation after import encountered notice: {}", e.getMessage());
            }

        } catch (Exception e) {
            logEntry.setStatus("FAILED");
            logEntry.setErrorMessage(e.getMessage());
            logEntry.setCompletedAt(LocalDateTime.now());
            importLogRepository.save(logEntry);
            throw e;
        } finally {
            try {
                Files.deleteIfExists(filePath);
                tempFileStorage.remove(request.getFileId());
            } catch (Exception ignored) {}
        }

        return logEntry;
    }

    public List<ImportMapping> getSavedMappings(String targetTable) {
        return mappingRepository.findByTableTarget(targetTable);
    }

    public ImportMapping saveMapping(String name, String targetTable, Map<String, String> mappingConfig) throws JsonProcessingException {
        ImportMapping mapping = ImportMapping.builder()
                .name(name)
                .tableTarget(targetTable)
                .mappingConfig(objectMapper.writeValueAsString(mappingConfig))
                .createdAt(LocalDateTime.now())
                .build();
        return mappingRepository.save(mapping);
    }

    public Page<ImportLog> getImportHistory(Pageable pageable) {
        return importLogRepository.findAllByOrderByStartedAtDesc(pageable);
    }

    @Transactional
    public Map<String, Object> generateSampleData(int customerCount) {
        log.info("Generating sample data for {} customers...", customerCount);
        List<Product> products = productRepository.findAll();
        List<Category> categories = categoryRepository.findAll();

        String[] firstNames = {"Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Huỳnh", "Phan", "Vũ", "Võ", "Đặng", "Bùi", "Đỗ", "Hồ", "Ngô", "Dương"};
        String[] middleNames = {"Văn", "Thị", "Đình", "Hồng", "Minh", "Thanh", "Đức", "Ngọc", "Quang", "Xuân"};
        String[] lastNames = {"An", "Bình", "Cường", "Dũng", "Giang", "Hà", "Hải", "Hùng", "Huy", "Khánh", "Lan", "Linh", "Long", "Mai", "Nam", "Nga", "Phong", "Phúc", "Quân", "Quỳnh", "Sơn", "Tâm", "Thảo", "Thịnh", "Trang", "Trung", "Tuấn", "Tùng", "Vinh", "Yên"};
        String[] cities = {"Hà Nội", "TP. Hồ Chí Minh", "Đà Nẵng", "Hải Phòng", "Cần Thơ", "Bình Dương", "Đồng Nai", "Khánh Hòa", "Quảng Ninh", "Huế"};
        String[] genders = {"Nam", "Nữ"};
        String[] actions = {"VIEW_PRODUCT", "ADD_CART", "SEARCH", "PURCHASE", "REVIEW"};
        String[] keywords = {"áo sơ mi", "váy dạ hội", "quần jean", "áo polo", "giày sneaker", "ví da"};

        Random rand = new Random();
        int createdCustomers = 0;
        int createdOrders = 0;
        int createdActivities = 0;

        for (int i = 0; i < customerCount; i++) {
            String fullName = firstNames[rand.nextInt(firstNames.length)] + " " +
                              middleNames[rand.nextInt(middleNames.length)] + " " +
                              lastNames[rand.nextInt(lastNames.length)];
            String code = "KH" + String.format("%04d", (int) (customerRepository.count() + i + 1));
            String email = "user_" + code.toLowerCase() + "_" + (1000 + rand.nextInt(9000)) + "@gmail.com";
            String phone = "09" + String.format("%08d", rand.nextInt(100000000));
            String city = cities[rand.nextInt(cities.length)];
            String gender = genders[rand.nextInt(genders.length)];

            Customer cust = Customer.builder()
                    .customerCode(code)
                    .fullName(fullName)
                    .email(email)
                    .phone(phone)
                    .gender(gender)
                    .city(city)
                    .createdAt(LocalDateTime.now().minusDays(rand.nextInt(365)))
                    .build();
            cust = customerRepository.save(cust);
            createdCustomers++;

            // Create 1 to 8 orders for this customer
            int orderCount = rand.nextInt(8) + 1;
            for (int o = 0; o < orderCount; o++) {
                int daysAgo = rand.nextInt(300);
                LocalDateTime orderDate = LocalDateTime.now().minusDays(daysAgo);

                Order order = Order.builder()
                        .orderCode("ORD" + System.currentTimeMillis() % 1000000 + String.format("%03d", rand.nextInt(1000)))
                        .customer(cust)
                        .totalAmount(BigDecimal.ZERO)
                        .orderStatus("COMPLETED")
                        .paymentMethod(rand.nextBoolean() ? "COD" : "BANK_TRANSFER")
                        .orderDate(orderDate)
                        .build();
                order = orderRepository.save(order);
                createdOrders++;

                // Order details
                BigDecimal orderTotal = BigDecimal.ZERO;
                int items = rand.nextInt(3) + 1;
                for (int item = 0; item < items; item++) {
                    Product prod = products.isEmpty() ? null : products.get(rand.nextInt(products.size()));
                    if (prod != null) {
                        int qty = rand.nextInt(2) + 1;
                        BigDecimal sub = prod.getPrice().multiply(BigDecimal.valueOf(qty));
                        orderTotal = orderTotal.add(sub);

                        OrderDetail detail = OrderDetail.builder()
                                .order(order)
                                .product(prod)
                                .quantity(qty)
                                .unitPrice(prod.getPrice())
                                .subtotal(sub)
                                .build();
                        orderDetailRepository.save(detail);
                    }
                }
                if (orderTotal.compareTo(BigDecimal.ZERO) > 0) {
                    order.setTotalAmount(orderTotal);
                    orderRepository.save(order);
                }
            }

            // Create activities
            int actCount = rand.nextInt(10) + 3;
            for (int a = 0; a < actCount; a++) {
                Product prod = products.isEmpty() ? null : products.get(rand.nextInt(products.size()));
                Category cat = categories.isEmpty() ? null : categories.get(rand.nextInt(categories.size()));
                String action = actions[rand.nextInt(actions.length)];

                UserActivityLog act = UserActivityLog.builder()
                        .customer(cust)
                        .actionType(action)
                        .product(prod)
                        .category(cat)
                        .searchKeyword(action.equals("SEARCH") ? keywords[rand.nextInt(keywords.length)] : null)
                        .durationSeconds(rand.nextInt(180) + 10)
                        .deviceType(rand.nextBoolean() ? "MOBILE" : "DESKTOP")
                        .createdAt(LocalDateTime.now().minusDays(rand.nextInt(90)))
                        .build();
                activityLogRepository.save(act);
                createdActivities++;
            }
        }

        // Trigger RFM Calculation
        jdbcTemplate.execute("CALL sp_calculate_rfm()");

        // Record to import log
        ImportLog logEntry = ImportLog.builder()
                .importType("GENERATED")
                .source("GENERATED")
                .tableName("all")
                .status("SUCCESS")
                .recordsImported(createdCustomers + createdOrders)
                .recordsFailed(0)
                .startedAt(LocalDateTime.now())
                .completedAt(LocalDateTime.now())
                .build();
        importLogRepository.save(logEntry);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("createdCustomers", createdCustomers);
        result.put("createdOrders", createdOrders);
        result.put("createdActivities", createdActivities);
        result.put("message", "Generated realistic sample data successfully and recalculated RFM!");
        return result;
    }

    private String getMappedValue(String[] row, Map<String, Integer> headerIndexMap, String csvColumnName) {
        if (csvColumnName == null || !headerIndexMap.containsKey(csvColumnName)) {
            return null;
        }
        int index = headerIndexMap.get(csvColumnName);
        return index < row.length ? row[index].trim() : null;
    }
}
