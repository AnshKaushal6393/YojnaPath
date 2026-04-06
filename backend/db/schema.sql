CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(10) UNIQUE NOT NULL,
  name VARCHAR(120),
  lang VARCHAR(2) NOT NULL DEFAULT 'hi'
    CHECK (lang IN ('hi', 'en')),
  registration_completed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_login TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS kiosks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(120) NOT NULL,
  state VARCHAR(50),
  district VARCHAR(80),
  center_code VARCHAR(40),
  login_code VARCHAR(16) NOT NULL UNIQUE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  profile_name VARCHAR(120) NOT NULL DEFAULT 'Family member',
  relation VARCHAR(40),
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  gender VARCHAR(10)
    CHECK (gender IN ('male', 'female', 'other')),
  caste VARCHAR(10)
    CHECK (caste IN ('sc', 'st', 'obc', 'general')),
  occupation VARCHAR(30)
    CHECK (
      occupation IN (
        'farmer',
        'business',
        'women',
        'worker',
        'health',
        'housing',
        'senior',
        'disability',
        'shopkeeper',
        'artisan',
        'daily_wage',
        'student',
        'retired',
        'disabled',
        'migrant_worker'
      )
    ),
  state VARCHAR(50) NOT NULL,
  annual_income INTEGER DEFAULT 0 CHECK (annual_income >= 0),
  district VARCHAR(80),
  age INTEGER CHECK (age >= 0),
  land_acres NUMERIC(6,2) DEFAULT 0 CHECK (land_acres >= 0),
  disability_pct INTEGER DEFAULT 0 CHECK (disability_pct BETWEEN 0 AND 100),
  is_student BOOLEAN NOT NULL DEFAULT FALSE,
  is_migrant BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS saved_schemes (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scheme_id VARCHAR(180) NOT NULL,
  saved_at TIMESTAMP NOT NULL DEFAULT NOW(),
  notes TEXT,
  PRIMARY KEY (user_id, scheme_id)
);

CREATE TABLE IF NOT EXISTS applications (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scheme_id VARCHAR(180) NOT NULL,
  applied_at DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'applied'
    CHECK (status IN ('applied', 'pending', 'approved', 'rejected')),
  notes TEXT,
  remind_at DATE,
  PRIMARY KEY (user_id, scheme_id)
);
