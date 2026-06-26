-- CivicLoom AI Phase 3 additive schema.
-- Review and run once in Hostinger phpMyAdmin before switching fully to Auth.js + Prisma + Stripe.
-- This script is intentionally additive: it does not drop existing tables or data.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS email_verified DATETIME NULL AFTER password_hash,
  ADD COLUMN IF NOT EXISTS image VARCHAR(512) NULL AFTER email_verified,
  ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255) NULL AFTER image,
  ADD UNIQUE INDEX IF NOT EXISTS users_stripe_customer_id_key (stripe_customer_id);

ALTER TABLE reports
  ADD COLUMN IF NOT EXISTS report_json JSON NULL AFTER recommendation;

ALTER TABLE ai_summaries
  ADD COLUMN IF NOT EXISTS structured_json JSON NULL AFTER recommendation;

CREATE TABLE IF NOT EXISTS accounts (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  type VARCHAR(255) NOT NULL,
  provider VARCHAR(255) NOT NULL,
  provider_account_id VARCHAR(255) NOT NULL,
  refresh_token TEXT,
  access_token TEXT,
  expires_at INT,
  token_type VARCHAR(255),
  scope VARCHAR(255),
  id_token TEXT,
  session_state VARCHAR(255),
  UNIQUE KEY accounts_provider_provider_account_id_key (provider, provider_account_id),
  INDEX accounts_user_id_idx (user_id),
  CONSTRAINT fk_accounts_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS sessions (
  id VARCHAR(64) PRIMARY KEY,
  session_token VARCHAR(255) UNIQUE NOT NULL,
  user_id VARCHAR(64) NOT NULL,
  expires DATETIME NOT NULL,
  INDEX sessions_user_id_idx (user_id),
  CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS verification_tokens (
  identifier VARCHAR(255) NOT NULL,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires DATETIME NOT NULL,
  UNIQUE KEY verification_tokens_identifier_token_key (identifier, token)
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  stripe_subscription_id VARCHAR(255) UNIQUE,
  stripe_price_id VARCHAR(255),
  plan VARCHAR(64) NOT NULL DEFAULT 'free',
  status VARCHAR(64) NOT NULL DEFAULT 'inactive',
  report_limit INT NOT NULL DEFAULT 1,
  current_period_start DATETIME NULL,
  current_period_end DATETIME NULL,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX subscriptions_user_id_idx (user_id),
  CONSTRAINT fk_subscriptions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS usage_events (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(64),
  report_id VARCHAR(64),
  event_type VARCHAR(80) NOT NULL,
  plan VARCHAR(64),
  metadata JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX usage_events_user_id_created_at_idx (user_id, created_at),
  INDEX usage_events_report_id_idx (report_id),
  CONSTRAINT fk_usage_events_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_usage_events_report FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS business_templates (
  id VARCHAR(64) PRIMARY KEY,
  slug VARCHAR(120) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  demand_weight INT NOT NULL DEFAULT 35,
  income_weight INT NOT NULL DEFAULT 25,
  customer_fit_weight INT NOT NULL DEFAULT 25,
  risk_weight INT NOT NULL DEFAULT 15,
  assumptions JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS watchlist_locations (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  business_type VARCHAR(255) NOT NULL,
  location_name VARCHAR(255) NOT NULL,
  geography_type VARCHAR(32) NOT NULL DEFAULT 'county',
  state_code VARCHAR(8),
  county_code VARCHAR(8),
  place_code VARCHAR(16),
  last_score INT,
  last_checked_at DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX watchlist_locations_user_id_created_at_idx (user_id, created_at),
  CONSTRAINT fk_watchlist_locations_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

INSERT IGNORE INTO business_templates
  (id, slug, name, description, demand_weight, income_weight, customer_fit_weight, risk_weight, assumptions)
VALUES
  ('tmpl_coffee_shop', 'coffee-shop', 'Coffee shop', 'Weights walkable demand, young professionals, income fit, and rent sensitivity.', 35, 25, 25, 15, JSON_OBJECT('idealCustomers', JSON_ARRAY('young professionals', 'students', 'remote workers'), 'riskSignals', JSON_ARRAY('high rent', 'dense competition'))),
  ('tmpl_daycare', 'daycare', 'Daycare', 'Weights family households, employment, income, and population stability.', 40, 20, 25, 15, JSON_OBJECT('idealCustomers', JSON_ARRAY('working parents', 'families with children'), 'riskSignals', JSON_ARRAY('licensing complexity', 'low household density'))),
  ('tmpl_fitness_studio', 'fitness-studio', 'Fitness studio', 'Weights population density, income fit, renter share, and commute patterns.', 35, 25, 25, 15, JSON_OBJECT('idealCustomers', JSON_ARRAY('health-conscious adults', 'young professionals'), 'riskSignals', JSON_ARRAY('membership churn', 'parking constraints')));
