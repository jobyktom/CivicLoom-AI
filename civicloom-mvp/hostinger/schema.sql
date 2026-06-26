CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  password_hash VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reports (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64),
  business_type VARCHAR(255) NOT NULL,
  location_name VARCHAR(255) NOT NULL,
  geography_type VARCHAR(32) NOT NULL DEFAULT 'county',
  state_code VARCHAR(8),
  county_code VARCHAR(8),
  place_code VARCHAR(16),
  radius INT,
  target_customer VARCHAR(255),
  report_type VARCHAR(120),
  opportunity_score INT,
  ai_summary TEXT,
  risk_summary TEXT,
  recommendation TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_reports_user_created (user_id, created_at),
  CONSTRAINT fk_reports_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS report_locations (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  report_id VARCHAR(64) NOT NULL,
  location_name VARCHAR(255) NOT NULL,
  geography_type VARCHAR(32) NOT NULL,
  state_code VARCHAR(8),
  county_code VARCHAR(8),
  place_code VARCHAR(16),
  radius INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_report_locations_report (report_id),
  CONSTRAINT fk_report_locations_report FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS census_metrics (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  report_id VARCHAR(64) NOT NULL,
  metric_name VARCHAR(120) NOT NULL,
  metric_value DOUBLE,
  source_year INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_census_metrics_report (report_id),
  CONSTRAINT fk_census_metrics_report FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ai_summaries (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  report_id VARCHAR(64) NOT NULL,
  executive_summary TEXT,
  risks TEXT,
  ideal_customer TEXT,
  marketing_angle TEXT,
  recommendation TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_ai_summaries_report (report_id),
  CONSTRAINT fk_ai_summaries_report FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE
);
