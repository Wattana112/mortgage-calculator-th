CREATE DATABASE IF NOT EXISTS mortgage_rates
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE mortgage_rates;

CREATE TABLE IF NOT EXISTS banks (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(120) NOT NULL,
  color VARCHAR(20) NOT NULL DEFAULT '#58A6FF',
  sort_order INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_banks_slug (slug),
  KEY idx_banks_active (is_active, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS rate_periods (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  label VARCHAR(50) NOT NULL,
  quarter_year SMALLINT UNSIGNED NOT NULL,
  quarter_no TINYINT UNSIGNED NOT NULL,
  valid_from DATE NOT NULL,
  valid_to DATE NOT NULL,
  published_at DATETIME NOT NULL,
  notes VARCHAR(255) NULL,
  is_current TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_period_unique (quarter_year, quarter_no),
  KEY idx_period_current (is_current, published_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS bank_interest_rates (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  bank_id BIGINT UNSIGNED NOT NULL,
  rate_period_id BIGINT UNSIGNED NOT NULL,
  rate_type ENUM('MRR','MLR','MOR','PROMO') NOT NULL DEFAULT 'MRR',
  annual_rate DECIMAL(6,3) NOT NULL,
  source_url VARCHAR(255) NULL,
  note VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_bank_period_type (bank_id, rate_period_id, rate_type),
  KEY idx_rates_period (rate_period_id),
  KEY idx_rates_bank (bank_id),
  CONSTRAINT fk_rates_bank FOREIGN KEY (bank_id) REFERENCES banks (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_rates_period FOREIGN KEY (rate_period_id) REFERENCES rate_periods (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO banks (id, name, slug, color, sort_order) VALUES
  (1, 'กสิกรไทย', 'kasikorn', '#2DAA4F', 10),
  (2, 'กรุงเทพ', 'bangkok', '#1E3A8A', 20),
  (3, 'ไทยพาณิชย์', 'scb', '#7C3AED', 30),
  (4, 'กรุงไทย', 'krungthai', '#1B4FBB', 40),
  (5, 'ออมสิน', 'gsb', '#DC2626', 50),
  (6, 'ธอส.', 'ghbank', '#F59E0B', 60),
  (7, 'UOB', 'uob', '#0F766E', 70),
  (8, 'TTB', 'ttb', '#6366F1', 80)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  color = VALUES(color),
  sort_order = VALUES(sort_order);

INSERT INTO rate_periods (id, label, quarter_year, quarter_no, valid_from, valid_to, published_at, notes, is_current) VALUES
  (1, 'Q2/2026', 2026, 2, '2026-04-01', '2026-06-30', '2026-04-01 09:00:00', 'อัปเดตรอบไตรมาสที่ 2', 1)
ON DUPLICATE KEY UPDATE
  label = VALUES(label),
  valid_from = VALUES(valid_from),
  valid_to = VALUES(valid_to),
  published_at = VALUES(published_at),
  notes = VALUES(notes),
  is_current = VALUES(is_current);

INSERT INTO bank_interest_rates (bank_id, rate_period_id, rate_type, annual_rate, source_url, note) VALUES
  (1, 1, 'MRR', 6.970, 'https://www.kasikornbank.com', 'อัตราอ้างอิง'),
  (2, 1, 'MRR', 6.750, 'https://www.bangkokbank.com', 'อัตราอ้างอิง'),
  (3, 1, 'MRR', 7.100, 'https://www.scb.co.th', 'อัตราอ้างอิง'),
  (4, 1, 'MRR', 6.870, 'https://www.krungthai.com', 'อัตราอ้างอิง'),
  (5, 1, 'MLR', 6.395, 'https://www.gsb.or.th', 'อัตราอ้างอิง'),
  (6, 1, 'PROMO', 5.000, 'https://www.ghbank.co.th', 'โปรโมชันบ้าน'),
  (7, 1, 'MRR', 7.000, 'https://www.uob.co.th', 'อัตราอ้างอิง'),
  (8, 1, 'MRR', 6.600, 'https://www.ttbbank.com', 'อัตราอ้างอิง')
ON DUPLICATE KEY UPDATE
  annual_rate = VALUES(annual_rate),
  source_url = VALUES(source_url),
  note = VALUES(note);

