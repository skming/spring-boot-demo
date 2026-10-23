package com.example.dblab.lab.service;

import com.example.dblab.common.exception.BusinessException;
import com.example.dblab.common.exception.ResourceNotFoundException;
import com.example.dblab.lab.dto.ColumnInfoResponse;
import com.example.dblab.lab.dto.TableDetailResponse;
import com.example.dblab.lab.dto.TableSummaryResponse;
import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import javax.sql.DataSource;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

/**
 * 读取表结构元数据。
 * <p>
 * 使用 JDBC DatabaseMetaData，兼容 SQLite 与 MySQL，避免方言 SQL 分裂。
 */
@Service
public class LabMetadataService {

    // 这里只控制结构面板的展示；它不是任意 SQL 的表权限或行权限检查。
    private static final Set<String> VISIBLE_TABLES = Set.of("users", "movies", "watch_records", "operation_logs");

    private final JdbcTemplate labJdbcTemplate;

    public LabMetadataService(JdbcTemplate labJdbcTemplate) {
        this.labJdbcTemplate = labJdbcTemplate;
    }

    public List<TableSummaryResponse> listTables() {
        return withMetaData((connection, metaData) -> {
            List<TableSummaryResponse> tables = new ArrayList<>();
            try (ResultSet resultSet = metaData.getTables(connection.getCatalog(), null, "%", new String[] {"TABLE"})) {
                while (resultSet.next()) {
                    String tableName = resultSet.getString("TABLE_NAME");
                    if (tableName != null && VISIBLE_TABLES.contains(tableName.toLowerCase(Locale.ROOT))) {
                        tables.add(new TableSummaryResponse(
                                tableName.toLowerCase(Locale.ROOT),
                                resultSet.getString("TABLE_TYPE")
                        ));
                    }
                }
            }
            tables.sort((left, right) -> left.tableName().compareTo(right.tableName()));
            return tables;
        });
    }

    public TableDetailResponse getTable(String tableName) {
        String normalized = tableName.toLowerCase(Locale.ROOT);
        if (!VISIBLE_TABLES.contains(normalized)) {
            throw new ResourceNotFoundException("Table not found");
        }

        return withMetaData((connection, metaData) -> {
            String catalog = connection.getCatalog();
            List<ColumnInfoResponse> columns = new ArrayList<>();
            try (ResultSet resultSet = metaData.getColumns(catalog, null, resolveTableName(metaData, catalog, normalized), null)) {
                while (resultSet.next()) {
                    columns.add(new ColumnInfoResponse(
                            resultSet.getString("COLUMN_NAME"),
                            resultSet.getString("TYPE_NAME"),
                            resultSet.getInt("NULLABLE") == DatabaseMetaData.columnNullable,
                            resultSet.getString("COLUMN_DEF")
                    ));
                }
            }

            List<String> primaryKeys = new ArrayList<>();
            try (ResultSet resultSet = metaData.getPrimaryKeys(catalog, null, resolveTableName(metaData, catalog, normalized))) {
                while (resultSet.next()) {
                    primaryKeys.add(resultSet.getString("COLUMN_NAME"));
                }
            }

            Set<String> indexes = new LinkedHashSet<>();
            try (ResultSet resultSet = metaData.getIndexInfo(catalog, null, resolveTableName(metaData, catalog, normalized), false, false)) {
                while (resultSet.next()) {
                    String indexName = resultSet.getString("INDEX_NAME");
                    if (indexName != null && !indexName.isBlank()) {
                        indexes.add(indexName);
                    }
                }
            }

            return new TableDetailResponse(normalized, columns, primaryKeys, List.copyOf(indexes));
        });
    }

    private String resolveTableName(DatabaseMetaData metaData, String catalog, String normalized) throws SQLException {
        try (ResultSet resultSet = metaData.getTables(catalog, null, "%", new String[] {"TABLE"})) {
            while (resultSet.next()) {
                String tableName = resultSet.getString("TABLE_NAME");
                if (tableName != null && tableName.equalsIgnoreCase(normalized)) {
                    return tableName;
                }
            }
        }
        return normalized;
    }

    private <T> T withMetaData(MetaDataCallback<T> callback) {
        DataSource dataSource = labJdbcTemplate.getDataSource();
        if (dataSource == null) {
            throw new BusinessException(HttpStatus.INTERNAL_SERVER_ERROR, "Lab datasource is not configured");
        }
        try (Connection connection = dataSource.getConnection()) {
            return callback.doInMetaData(connection, connection.getMetaData());
        } catch (SQLException ex) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "Unable to read database metadata: " + ex.getMessage());
        }
    }

    @FunctionalInterface
    private interface MetaDataCallback<T> {
        T doInMetaData(Connection connection, DatabaseMetaData metaData) throws SQLException;
    }
}
