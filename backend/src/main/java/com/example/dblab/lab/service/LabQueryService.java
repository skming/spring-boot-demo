package com.example.dblab.lab.service;

import com.example.dblab.common.exception.BusinessException;
import com.example.dblab.config.AppProperties;
import com.example.dblab.lab.dto.SqlQueryResponse;
import com.example.dblab.oplog.service.OperationLogService;
import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ScheduledThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import jakarta.annotation.PreDestroy;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * 执行 Lab SQL（查询 + 受控增删改）。
 * <p>
 * 先过 {@link SqlGuard}，再走 lab 数据源；限制超时与最大返回行数。
 */
@Service
public class LabQueryService {
    private static final Logger logger = LoggerFactory.getLogger(LabQueryService.class);

    private final JdbcTemplate labJdbcTemplate;
    private final SqlGuard sqlGuard;
    private final AppProperties appProperties;
    private final OperationLogService operationLogService;
    private final ScheduledThreadPoolExecutor queryTimeouts;

    public LabQueryService(
            JdbcTemplate labJdbcTemplate,
            SqlGuard sqlGuard,
            AppProperties appProperties,
            OperationLogService operationLogService
    ) {
        this.labJdbcTemplate = labJdbcTemplate;
        this.sqlGuard = sqlGuard;
        this.appProperties = appProperties;
        this.operationLogService = operationLogService;
        queryTimeouts = new ScheduledThreadPoolExecutor(1,
                Thread.ofPlatform().daemon().name("lab-query-timeout").factory());
        queryTimeouts.setRemoveOnCancelPolicy(true);
    }

    /** 在本地业务工作台数据源执行 SQL。 */
    public SqlQueryResponse execute(String rawSql) {
        return executeOn(rawSql, labJdbcTemplate, "LAB_SQL");
    }

    /** 在教学样本数据源执行 SQL，并记录为教学操作。 */
    public SqlQueryResponse executeLesson(String rawSql, JdbcTemplate lessonJdbcTemplate) {
        return executeOn(rawSql, lessonJdbcTemplate, "LEARN_SQL");
    }

    private SqlQueryResponse executeOn(String rawSql, JdbcTemplate jdbcTemplate, String auditAction) {
        String sql;
        try {
            sql = sqlGuard.validateAndNormalize(rawSql);
        } catch (BusinessException ex) {
            recordAudit(auditAction, null, rawSql, false, ex.getMessage());
            throw ex;
        }

        StatementKind kind = sqlGuard.detectKind(sql);
        int maxRows = appProperties.getLab().getMaxRows();
        long timeoutMs = appProperties.getLab().getStatementTimeoutMs();
        long started = System.currentTimeMillis();

        SqlQueryResponse response;
        try {
            response = jdbcTemplate.execute((Statement statement) -> {
                statement.setQueryTimeout((int) Math.max(1, timeoutMs / 1000));
                // JDBC 超时的具体行为因驱动而异，另行取消才能限制 SQLite 的长时间计算。
                Object cancellationLock = new Object();
                boolean[] completed = {false};
                var cancellation = queryTimeouts.schedule(() -> {
                    synchronized (cancellationLock) {
                        if (completed[0]) return;
                        try { statement.cancel(); } catch (SQLException ignored) { /* 语句可能已结束。 */ }
                    }
                }, Math.max(1, timeoutMs), TimeUnit.MILLISECONDS);
                try {
                    return executeStatement(statement, sql, kind, maxRows, started);
                } finally {
                    // 等待取消操作结束后才释放连接，避免延迟取消误中下一条语句。
                    synchronized (cancellationLock) { completed[0] = true; }
                    cancellation.cancel(false);
                }
            });

        } catch (BusinessException ex) {
            recordAudit(auditAction, null, sql, false, ex.getMessage());
            throw ex;
        } catch (Exception ex) {
            String message = "SQL execution failed: " + rootMessage(ex);
            recordAudit(auditAction, null, sql, false, message);
            throw new BusinessException(HttpStatus.BAD_REQUEST, message);
        }
        String message = response.affectedRows() != null
                ? "affectedRows=" + response.affectedRows() : "rowCount=" + response.rowCount();
        boolean recorded = recordAudit(auditAction, response.statementType(), sql, true,
                message + ", durationMs=" + response.durationMs());
        return response.withAuditRecorded(recorded);
    }

    /** 将 JDBC 查询结果或写入影响行数转换为响应。 */
    private SqlQueryResponse executeStatement(Statement statement, String sql, StatementKind kind,
                                              int maxRows, long started) throws SQLException {
        if (statement.execute(sql)) {
            try (ResultSet resultSet = statement.getResultSet()) {
                return toSelectResponse(kind.name(), kind.getLabel(), resultSet, maxRows, started);
            }
        }
        int affected = Math.max(statement.getUpdateCount(), 0);
        return new SqlQueryResponse(kind.name(), kind.getLabel(), List.of("affected_rows", "statement"),
                List.of(Map.of("affected_rows", affected, "statement", kind.name())),
                1, affected, false, System.currentTimeMillis() - started, false);
    }

    /** 在事务代理外捕获，包括日志事务提交阶段的失败；不能重试已执行的 SQL。 */
    private boolean recordAudit(String action, String kind, String sql, boolean success, String message) {
        try {
            operationLogService.record(action, action.equals("LEARN_SQL") ? "lesson" : "lab", kind, sql, success, message);
            return true;
        } catch (RuntimeException ex) {
            // 不输出 SQL、用户信息或数据库错误中的敏感内容。
            logger.warn("SQL audit was not recorded ({})", ex.getClass().getSimpleName());
            return false;
        }
    }

    private static SqlQueryResponse toSelectResponse(
            String statementType,
            String statementTypeLabel,
            ResultSet resultSet,
            int maxRows,
            long started
    ) throws SQLException {
        ResultSetMetaData metaData = resultSet.getMetaData();
        int columnCount = metaData.getColumnCount();
        List<String> columns = new ArrayList<>(columnCount);
        for (int i = 1; i <= columnCount; i++) {
            columns.add(metaData.getColumnLabel(i));
        }

        List<Map<String, Object>> rows = new ArrayList<>();
        boolean truncated = false;
        while (resultSet.next()) {
            if (rows.size() >= maxRows) {
                truncated = true;
                break;
            }
            Map<String, Object> row = new LinkedHashMap<>();
            for (String column : columns) {
                row.put(column, normalizeCellValue(resultSet.getObject(column)));
            }
            rows.add(row);
        }
        return new SqlQueryResponse(
                statementType,
                statementTypeLabel,
                columns,
                rows,
                rows.size(),
                null,
                truncated,
                System.currentTimeMillis() - started,
                false
        );
    }

    /** 将 JDBC 返回的 UUID 值统一为可复制的标准字符串。 */
    static Object normalizeCellValue(Object value) {
        if (value instanceof UUID uuid) {
            return uuid.toString();
        }
        return value;
    }

    private static String rootMessage(Throwable ex) {
        Throwable current = ex;
        while (current.getCause() != null) {
            current = current.getCause();
        }
        return current.getMessage() == null ? ex.getClass().getSimpleName() : current.getMessage();
    }

    @PreDestroy
    public void close() { queryTimeouts.shutdownNow(); }
}
