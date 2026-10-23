package com.example.dblab.learning.service;

import com.example.dblab.common.exception.BusinessException;
import com.example.dblab.lab.dto.SqlQueryResponse;
import com.example.dblab.lab.service.LabQueryService;
import com.example.dblab.security.CurrentUserService;
import jakarta.annotation.PreDestroy;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import java.util.Properties;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.SingleConnectionDataSource;
import org.springframework.jdbc.datasource.init.ScriptUtils;
import org.springframework.stereotype.Service;

/** 实验只访问本服务创建的临时 SQLite 文件，不接收文件路径或数据源参数。 */
@Service
public class LessonSandboxService {
    private static final int MAX_SANDBOXES = 32;
    private final Path directory;
    private final Map<UUID, Path> databases = new HashMap<>();
    private final CurrentUserService currentUser;
    private final LabQueryService queries;

    public LessonSandboxService(CurrentUserService currentUser, LabQueryService queries) throws IOException {
        this.currentUser = currentUser;
        this.queries = queries;
        this.directory = Files.createTempDirectory("db-lab-lessons-");
    }

    /** 在当前用户独立的临时数据库中执行一条 SQL。 */
    public synchronized SqlQueryResponse execute(String sql) {
        Path path = databaseFor(currentUser.requireUserId());
        try (Connection connection = open(path)) {
            return queries.executeLesson(sql, new JdbcTemplate(new SingleConnectionDataSource(connection, true)));
        } catch (SQLException ex) {
            throw new BusinessException(HttpStatus.INTERNAL_SERVER_ERROR, "教学样本库暂不可用");
        }
    }

    /** 重建当前用户的教学表和初始样本。 */
    public synchronized void reset() {
        Path path = databaseFor(currentUser.requireUserId());
        try (Connection connection = open(path)) {
            connection.setAutoCommit(false);
            try {
                // 仅重建当前用户的实验表；事务失败时保留重置之前的实验状态。
                try (var statement = connection.createStatement()) {
                    statement.execute("DROP TABLE watch_records");
                    statement.execute("DROP TABLE movies");
                    statement.execute("DROP TABLE users");
                }
                seed(connection);
                connection.commit();
            } catch (RuntimeException | SQLException ex) {
                connection.rollback();
                throw ex;
            }
        } catch (SQLException ex) {
            throw new BusinessException(HttpStatus.INTERNAL_SERVER_ERROR, "重置教学样本失败");
        }
    }

    /** 获取用户样本库，不存在时初始化。 */
    private Path databaseFor(UUID userId) {
        Path existing = databases.get(userId);
        if (existing != null) return existing;
        if (databases.size() >= MAX_SANDBOXES) {
            throw new BusinessException(HttpStatus.SERVICE_UNAVAILABLE, "教学实验数量已达上限，请重启本地服务释放样本库");
        }
        Path path = directory.resolve(userId + ".sqlite");
        try (Connection connection = open(path)) {
            connection.setAutoCommit(false);
            try {
                seed(connection);
                connection.commit();
            } catch (RuntimeException | SQLException ex) {
                connection.rollback();
                throw ex;
            }
        } catch (SQLException ex) {
            throw new BusinessException(HttpStatus.INTERNAL_SERVER_ERROR, "初始化教学样本失败");
        }
        databases.put(userId, path);
        return path;
    }

    private Connection open(Path path) throws SQLException {
        Properties config = new Properties();
        config.setProperty("enable_load_extension", "false");
        Connection connection = DriverManager.getConnection("jdbc:sqlite:" + path, config);
        try (var statement = connection.createStatement()) {
            statement.execute("PRAGMA foreign_keys = ON");
            statement.execute("PRAGMA busy_timeout = 1000");
            // 限制单个实验库为约 16 MiB（默认 4 KiB page），不能无限写满本机磁盘。
            statement.execute("PRAGMA max_page_count = 4096");
        } catch (SQLException ex) {
            connection.close();
            throw ex;
        }
        return connection;
    }

    private void seed(Connection connection) {
        ScriptUtils.executeSqlScript(connection, new ClassPathResource("db/lesson-samples.sql"));
    }

    @PreDestroy
    public synchronized void close() throws IOException {
        // 目录由本实例独占，数据库连接均已关闭；不遍历或删除业务 data/ 目录。
        try (var files = Files.list(directory)) {
            for (Path file : files.toList()) Files.deleteIfExists(file);
        }
        Files.deleteIfExists(directory);
    }
}
