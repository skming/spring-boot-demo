package com.example.dblab;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;

import com.example.dblab.auth.dto.LoginRequest;
import com.example.dblab.auth.dto.RegisterRequest;
import com.example.dblab.auth.service.AuthService;
import com.example.dblab.auth.repository.UserRepository;
import com.example.dblab.movie.dto.MovieRequest;
import com.example.dblab.movie.entity.WatchStatus;
import com.example.dblab.movie.repository.MovieRepository;
import com.example.dblab.movie.service.MovieService;
import com.example.dblab.oplog.entity.OperationLog;
import com.example.dblab.oplog.repository.OperationLogRepository;
import com.example.dblab.lab.service.LabQueryService;
import com.example.dblab.common.exception.BusinessException;
import com.example.dblab.security.UserPrincipal;
import jakarta.persistence.EntityManager;
import java.nio.file.Path;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.UnexpectedRollbackException;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import com.example.dblab.movie.dto.WatchRecordRequest;
import java.io.IOException;
import java.time.LocalDate;

/** 故障只注入审计仓库；业务数据、事务管理器与 SQLite 都是真实实现。 */
@SpringBootTest(properties = "logging.level.org.springframework.boot=ERROR")
@ActiveProfiles("sqlite")
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
@Import(TransactionConsistencyIntegrationTest.Experiments.class)
class TransactionConsistencyIntegrationTest {
    @TempDir static Path directory;
    @DynamicPropertySource
    static void database(DynamicPropertyRegistry registry) {
        String url = "jdbc:sqlite:" + directory.resolve("transactions.sqlite");
        registry.add("spring.datasource.url", () -> url);
        registry.add("app.lab.datasource.url", () -> url);
        registry.add("app.security.jwt-secret", () -> UUID.randomUUID().toString());
    }

    @Autowired AuthService auth;
    @Autowired MovieService movies;
    @Autowired MovieRepository movieRepository;
    @Autowired UserRepository users;
    @Autowired LabQueryService lab;
    @Autowired EntityManager entityManager;
    @Autowired PlatformTransactionManager transactionManager;
    @MockitoSpyBean OperationLogRepository logs;
    @Autowired TransactionExperiments experiments;
    private UUID userId;
    private String email;
    private String password;

    @BeforeEach
    void login() {
        email = UUID.randomUUID() + "@example.com";
        password = UUID.randomUUID().toString();
        userId = auth.register(new RegisterRequest(email, password)).userId();
        var principal = new UserPrincipal(userId, email);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
    }

    @AfterEach
    void clearIdentity() { SecurityContextHolder.clearContext(); }

    @Test
    void auditFailureRollsBackCreateUpdateAndDelete() {
        var original = movies.create(input("original"));
        long logCount = logs.countByUserId(userId);
        failAudit();
        assertThrows(RuntimeException.class, () -> movies.create(input("not saved")));
        assertThrows(RuntimeException.class, () -> movies.update(original.id(), input("not updated")));
        assertThrows(RuntimeException.class, () -> movies.delete(original.id()));
        var actual = movieRepository.findByOwnerIdOrderByUpdatedAtDesc(userId);
        assertEquals(1, actual.size());
        assertEquals("original", actual.getFirst().getTitle());
        assertEquals(logCount, logs.countByUserId(userId));
    }

    @Test
    void releaseYearChangesRollBackWhenAuditFails() {
        var original = movies.create(new MovieRequest("年份回滚", "教学导演", List.of("科幻"), null, 2014));
        long logCount = logs.countByUserId(userId);
        failAudit();
        for (Integer year : List.of(1994, 2100)) {
            assertThrows(RuntimeException.class, () -> movies.update(original.id(),
                    new MovieRequest("年份回滚", "教学导演", List.of("科幻"), null, year)));
            assertEquals(2014, movieRepository.findById(original.id()).orElseThrow().getReleaseYear());
            assertEquals(logCount, logs.countByUserId(userId));
        }
    }

    @Test
    void businessFailureAfterFlushRollsBackBothActualWrites() {
        long logCount = logs.countByUserId(userId);
        var transaction = new TransactionTemplate(transactionManager);
        assertThrows(IllegalStateException.class, () -> transaction.executeWithoutResult(status -> {
            movies.create(input("flushed then rolled back"));
            entityManager.flush();
            assertEquals(1, movieRepository.findByOwnerIdOrderByUpdatedAtDesc(userId).size());
            assertEquals(logCount + 1, logs.countByUserId(userId));
            throw new IllegalStateException("test-only business failure");
        }));
        assertTrue(movieRepository.findByOwnerIdOrderByUpdatedAtDesc(userId).isEmpty());
        assertEquals(logCount, logs.countByUserId(userId));
    }

    @Test
    void authenticationRequiresItsAuditToCommitBeforeReturningCredentials() {
        failAudit();
        String unregistered = UUID.randomUUID() + "@example.com";
        assertThrows(RuntimeException.class, () -> auth.register(new RegisterRequest(unregistered, password)));
        assertFalse(users.existsByEmailIgnoreCase(unregistered));
        assertThrows(RuntimeException.class, () -> auth.login(new LoginRequest(email, password)));
        assertEquals(1, logs.countByUserId(userId));
    }

    @Test
    void auditFailureCannotTurnAnExecutedSqlWriteIntoAnExecutionError() {
        var movie = movies.create(input("before sql"));
        failAudit();
        var result = lab.execute("UPDATE movies SET title = 'after sql' WHERE id = '" + movie.id() + "'");
        assertEquals(1, result.affectedRows());
        assertFalse(result.auditRecorded());
        assertEquals("after sql", movies.getMine(movie.id()).title());
        assertThrows(BusinessException.class, () -> lab.execute("SELECT FROM movies"));
        assertThrows(BusinessException.class, () -> lab.execute("DELETE FROM movies"));
    }

    @Test
    void viewingMutationsAlsoRollBackWhenAuditFails() {
        var movie = movies.create(input("history"));
        var request = new WatchRecordRequest(LocalDate.of(2026, 1, 1), 5, "original");
        var original = movies.addWatch(movie.id(), request);
        var recordId = original.watchRecords().getFirst().id();
        long logCount = logs.countByUserId(userId);
        failAudit();
        assertThrows(RuntimeException.class, () -> movies.addWatch(movie.id(), request));
        assertThrows(RuntimeException.class, () -> movies.updateWatch(movie.id(), recordId,
                new WatchRecordRequest(LocalDate.of(2026, 2, 1), 1, "not saved")));
        assertThrows(RuntimeException.class, () -> movies.deleteWatch(movie.id(), recordId));
        var records = movies.getMine(movie.id()).watchRecords();
        assertEquals(1, records.size());
        assertEquals(5, records.getFirst().rating());
        assertEquals("original", records.getFirst().notes());
        assertEquals(logCount, logs.countByUserId(userId));
    }

    @Test
    void catchingAnInnerRequiredFailureDoesNotClearRollbackOnly() {
        long before = logs.countByUserId(userId);
        var transaction = new TransactionTemplate(transactionManager);
        assertThrows(UnexpectedRollbackException.class, () -> transaction.executeWithoutResult(status -> {
            try { experiments.requiredFailure(); } catch (IllegalStateException ignored) { /* 模拟调用方继续返回。 */ }
        }));
        assertTrue(movieRepository.findByOwnerIdOrderByUpdatedAtDesc(userId).isEmpty());
        assertEquals(before, logs.countByUserId(userId));
    }

    @Test
    void checkedExceptionDefaultCommitsButExplicitRollbackForRollsBack() {
        assertThrows(IOException.class, () -> experiments.defaultCheckedFailure());
        assertEquals(1, movieRepository.findByOwnerIdOrderByUpdatedAtDesc(userId).size());
        assertThrows(IOException.class, () -> experiments.rollbackCheckedFailure());
        assertEquals(1, movieRepository.findByOwnerIdOrderByUpdatedAtDesc(userId).size());
        assertEquals(2, logs.countByUserId(userId)); // 注册 + 默认受检异常方法内的新增。
    }

    @Test
    void onlyCallsThroughTheSpringProxyStartTheAnnotatedTransaction() {
        assertFalse(experiments.selfInvocation());
        assertTrue(experiments.transactionActive());
    }

    @TestConfiguration(proxyBeanMethods = false)
    static class Experiments {
        @Bean TransactionExperiments transactionExperiments(MovieService movies, EntityManager entityManager) {
            return new TransactionExperiments(movies, entityManager);
        }
    }

    public static class TransactionExperiments {
        private final MovieService movies;
        private final EntityManager entityManager;
        TransactionExperiments(MovieService movies, EntityManager entityManager) {
            this.movies = movies; this.entityManager = entityManager;
        }
        @Transactional
        public void requiredFailure() {
            movies.create(new MovieRequest("required failure", "教学导演", List.of("剧情"), null, 2014));
            entityManager.flush();
            throw new IllegalStateException("test-only required failure");
        }
        @Transactional
        public void defaultCheckedFailure() throws IOException {
            movies.create(new MovieRequest("checked commit", "教学导演", List.of("剧情"), null, 2014));
            throw new IOException("test-only checked failure");
        }
        @Transactional(rollbackFor = IOException.class)
        public void rollbackCheckedFailure() throws IOException {
            movies.create(new MovieRequest("checked rollback", "教学导演", List.of("剧情"), null, 2014));
            throw new IOException("test-only checked failure");
        }
        public boolean selfInvocation() { return transactionActive(); }
        @Transactional
        public boolean transactionActive() { return TransactionSynchronizationManager.isActualTransactionActive(); }
    }

    private void failAudit() {
        doThrow(new IllegalStateException("test-only audit failure")).when(logs).save(any(OperationLog.class));
    }

    private MovieRequest input(String title) {
        return new MovieRequest(title, "教学导演", List.of("剧情"), null, 2014);
    }
}
