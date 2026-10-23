package com.example.dblab.lab.config;

import com.example.dblab.config.AppProperties;
import com.zaxxer.hikari.HikariDataSource;
import jakarta.annotation.PreDestroy;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.util.StringUtils;

/**
 * Lab 数据源。
 * <p>
 * 教学环境允许受控 DML（INSERT/UPDATE/DELETE），因此不再强制只读连接。
 * 安全主要依赖 {@link com.example.dblab.lab.service.SqlGuard} 白名单。
 * 不把 lab DataSource 注册成第二套主 DataSource，以免干扰 JPA 自动配置。
 */
@Configuration
public class LabDataSourceConfig {

    private HikariDataSource labDataSource;

    @Bean
    JdbcTemplate labJdbcTemplate(AppProperties appProperties) {
        AppProperties.Lab.Datasource props = appProperties.getLab().getDatasource();
        HikariDataSource dataSource = new HikariDataSource();
        dataSource.setPoolName("lab-sql-pool");
        dataSource.setJdbcUrl(props.getUrl());
        if (StringUtils.hasText(props.getUsername())) {
            dataSource.setUsername(props.getUsername());
        }
        if (StringUtils.hasText(props.getPassword())) {
            dataSource.setPassword(props.getPassword());
        }
        boolean sqlite = isSqlite(props.getUrl());
        dataSource.setMaximumPoolSize(sqlite ? 1 : 3);
        if (sqlite) {
            dataSource.setConnectionInitSql("PRAGMA foreign_keys = ON");
        }
        this.labDataSource = dataSource;
        return new JdbcTemplate(dataSource);
    }

    @PreDestroy
    void closeLabDataSource() {
        if (labDataSource != null) {
            labDataSource.close();
        }
    }

    private static boolean isSqlite(String jdbcUrl) {
        return jdbcUrl != null && jdbcUrl.startsWith("jdbc:sqlite:");
    }
}
