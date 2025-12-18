-- Fix Foreign Key Constraints for Team Reminders and Availability
-- ============================================================================
-- This migration adds the missing foreign key constraints that are expected
-- by the queries in useTeamReminders.ts

-- 1. Add foreign key constraint for team_availability -> profiles
-- ============================================================================

-- First, check if the constraint already exists and drop it if needed
DO $$
BEGIN
    -- Check if the old constraint exists and drop it
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'team_availability'
        AND constraint_name = 'team_availability_user_id_fkey'
    ) THEN
        ALTER TABLE public.team_availability DROP CONSTRAINT team_availability_user_id_fkey;
    END IF;
END $$;

-- Add the new foreign key constraint referencing profiles table
ALTER TABLE public.team_availability
ADD CONSTRAINT team_availability_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 2. Add foreign key constraint for reminders -> profiles
-- ============================================================================

-- First, check if the old constraint exists and drop it
DO $$
BEGIN
    -- Check if the old constraint exists and drop it
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'reminders'
        AND constraint_name = 'reminders_created_by_fkey'
    ) THEN
        ALTER TABLE public.reminders DROP CONSTRAINT reminders_created_by_fkey;
    END IF;
END $$;

-- Add the new foreign key constraint referencing profiles table
ALTER TABLE public.reminders
ADD CONSTRAINT reminders_created_by_fkey
FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 3. Verify the constraints were created successfully
-- ============================================================================

-- Check that the constraints exist
SELECT
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name IN ('team_availability', 'reminders')
AND tc.constraint_name IN ('team_availability_user_id_fkey', 'reminders_created_by_fkey')
ORDER BY tc.table_name, tc.constraint_name;
