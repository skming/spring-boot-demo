package com.example.dblab;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * DB Lab 启动入口。
 * <p>
 * 默认 profile 为 sqlite（无需 Docker）；有 MySQL 时可切换 mysql profile。
 */
@SpringBootApplication
public class DbLabApplication {

    public static void main(String[] args) {
        SpringApplication.run(DbLabApplication.class, args);
    }
}
