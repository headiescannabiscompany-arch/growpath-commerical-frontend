# GrowPath Database Schema Diff (Pricing & Permissions)

-- Users Table
ALTER TABLE users
    ADD COLUMN plan VARCHAR(32) DEFAULT 'free',
    ADD COLUMN role VARCHAR(32) DEFAULT 'user';

-- Courses Table
ALTER TABLE courses
    ADD COLUMN creator_id UUID REFERENCES users(id),
    ADD COLUMN status VARCHAR(16) DEFAULT 'pending', -- pending, approved, rejected
    ADD COLUMN is_paid BOOLEAN DEFAULT FALSE,
    ADD COLUMN lessons_count INT DEFAULT 0;

-- Course Sales Table
CREATE TABLE IF NOT EXISTS course_sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES courses(id),
    buyer_id UUID REFERENCES users(id),
    price_cents INT NOT NULL,
    purchased_at TIMESTAMP DEFAULT now(),
    payout_status VARCHAR(16) DEFAULT 'pending' -- pending, paid, failed
);

-- Feature Flags Table (optional, for dynamic flags)
CREATE TABLE IF NOT EXISTS feature_flags (
    id SERIAL PRIMARY KEY,
    flag_name VARCHAR(64) NOT NULL,
    plan VARCHAR(32) NOT NULL,
    enabled BOOLEAN DEFAULT TRUE
);

-- Moderation Table (for course approval)
CREATE TABLE IF NOT EXISTS course_moderation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES courses(id),
    moderator_id UUID REFERENCES users(id),
    status VARCHAR(16) DEFAULT 'pending',
    reviewed_at TIMESTAMP
);

-- Add indexes as needed for plan, role, and course status
CREATE INDEX IF NOT EXISTS idx_users_plan ON users(plan);
CREATE INDEX IF NOT EXISTS idx_courses_status ON courses(status);
