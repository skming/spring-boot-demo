package com.example.dblab.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app")
public class AppProperties {

    private final Security security = new Security();
    private final Lab lab = new Lab();

    public Security getSecurity() {
        return security;
    }

    public Lab getLab() {
        return lab;
    }

    public static class Security {
        private String jwtSecret;
        private long jwtExpirationMinutes = 720;

        public String getJwtSecret() {
            return jwtSecret;
        }

        public long getJwtExpirationMinutes() {
            return jwtExpirationMinutes;
        }

        public void setJwtSecret(String jwtSecret) {
            this.jwtSecret = jwtSecret;
        }

        public void setJwtExpirationMinutes(long jwtExpirationMinutes) {
            this.jwtExpirationMinutes = jwtExpirationMinutes;
        }
    }

    public static class Lab {
        private int maxRows = 200;
        private long statementTimeoutMs = 5000;
        private final Datasource datasource = new Datasource();

        public int getMaxRows() {
            return maxRows;
        }

        public long getStatementTimeoutMs() {
            return statementTimeoutMs;
        }

        public Datasource getDatasource() {
            return datasource;
        }

        public void setMaxRows(int maxRows) {
            this.maxRows = maxRows;
        }

        public void setStatementTimeoutMs(long statementTimeoutMs) {
            this.statementTimeoutMs = statementTimeoutMs;
        }

        public static class Datasource {
            private String url;
            private String username;
            private String password;

            public String getUrl() {
                return url;
            }

            public String getUsername() {
                return username;
            }

            public String getPassword() {
                return password;
            }

            public void setUrl(String url) {
                this.url = url;
            }

            public void setUsername(String username) {
                this.username = username;
            }

            public void setPassword(String password) {
                this.password = password;
            }
        }
    }
}
