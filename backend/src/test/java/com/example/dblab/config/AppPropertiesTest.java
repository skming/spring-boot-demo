package com.example.dblab.config;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

class AppPropertiesTest {

    private final ApplicationContextRunner contextRunner = new ApplicationContextRunner()
            .withUserConfiguration(AppConfig.class);

    @Test
    void bindsConfiguredSecurityAndLabProperties() {
        String jwtSecret = UUID.randomUUID().toString();
        contextRunner.withPropertyValues(
                "app.security.jwt-secret=" + jwtSecret,
                "app.security.jwt-expiration-minutes=60",
                "app.lab.max-rows=50",
                "app.lab.statement-timeout-ms=3000",
                "app.lab.datasource.url=jdbc:sqlite::memory:"
        ).run(context -> {
            assertThat(context).hasNotFailed();
            AppProperties properties = context.getBean(AppProperties.class);
            assertThat(properties.getSecurity().getJwtSecret()).isEqualTo(jwtSecret);
            assertThat(properties.getSecurity().getJwtExpirationMinutes()).isEqualTo(60);
            assertThat(properties.getLab().getMaxRows()).isEqualTo(50);
            assertThat(properties.getLab().getStatementTimeoutMs()).isEqualTo(3000);
            assertThat(properties.getLab().getDatasource().getUrl()).isEqualTo("jdbc:sqlite::memory:");
        });
    }

    @Test
    void retainsDefaultsWhenPropertiesAreNotConfigured() {
        contextRunner.run(context -> {
            assertThat(context).hasNotFailed();
            AppProperties properties = context.getBean(AppProperties.class);
            assertThat(properties.getSecurity().getJwtExpirationMinutes()).isEqualTo(720);
            assertThat(properties.getLab().getMaxRows()).isEqualTo(200);
            assertThat(properties.getLab().getStatementTimeoutMs()).isEqualTo(5000);
        });
    }
}
