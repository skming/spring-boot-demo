package com.example.dblab;

import static org.junit.jupiter.api.Assertions.*;

import com.example.dblab.auth.dto.RegisterRequest;
import com.example.dblab.auth.service.AuthService;
import com.example.dblab.movie.dto.MovieRequest;
import com.example.dblab.movie.repository.MovieRepository;
import com.example.dblab.movie.service.MovieService;
import com.example.dblab.oplog.repository.OperationLogRepository;
import com.example.dblab.security.UserPrincipal;
import com.example.dblab.support.MySqlTestSupport;
import jakarta.persistence.EntityManager;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

/** 需要真实 MySQL；外层先写入并 flush，再验证内层独立提交。 */
@SpringBootTest
@ActiveProfiles("mysql")
@Import(MySqlTransactionPropagationIntegrationTest.Configuration.class)
class MySqlTransactionPropagationIntegrationTest extends MySqlTestSupport {
    @Autowired AuthService auth;
    @Autowired MovieService movies;
    @Autowired MovieRepository repository;
    @Autowired OperationLogRepository logs;
    @Autowired IndependentWriter independent;
    @Autowired PlatformTransactionManager manager;
    @Autowired EntityManager entityManager;

    @AfterEach
    void clearIdentity() { SecurityContextHolder.clearContext(); }

    @Test
    void independentCommitSurvivesOuterRollbackAfterTheOuterHasWritten() {
        var account = auth.register(new RegisterRequest(UUID.randomUUID() + "@example.com", UUID.randomUUID().toString()));
        var principal = new UserPrincipal(account.userId(), account.email());
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
        assertThrows(IllegalStateException.class, () -> new TransactionTemplate(manager).executeWithoutResult(status -> {
            movies.create(new MovieRequest("outer rolled back", "教学导演", List.of("剧情"), null, 2014));
            entityManager.flush();
            independent.save();
            throw new IllegalStateException("test-only outer failure");
        }));
        var remaining = repository.findByOwnerIdOrderByUpdatedAtDesc(account.userId());
        assertEquals(List.of("independent committed"), remaining.stream().map(movie -> movie.getTitle()).toList());
        assertEquals(2, logs.countByUserId(account.userId()));
    }

    @TestConfiguration(proxyBeanMethods = false)
    static class Configuration {
        @Bean IndependentWriter independentWriter(MovieService movies) { return new IndependentWriter(movies); }
    }

    public static class IndependentWriter {
        private final MovieService movies;
        IndependentWriter(MovieService movies) { this.movies = movies; }
        @Transactional(propagation = Propagation.REQUIRES_NEW)
        public void save() { movies.create(new MovieRequest("independent committed", "教学导演", List.of("科幻"), null, 2014)); }
    }
}
