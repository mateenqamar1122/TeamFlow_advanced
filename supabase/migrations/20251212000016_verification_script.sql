-- Verification and Test Script for Task Dependencies
-- ==================================================
-- Run this to verify the schema is correct and test basic operations

-- 1. Verify table structure
SELECT
    'Current task_dependencies schema:' as info,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'task_dependencies' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Verify constraints
SELECT
    'Current constraints:' as info,
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
LEFT JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
LEFT JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'task_dependencies'
    AND tc.table_schema = 'public'
ORDER BY tc.constraint_type, tc.constraint_name;

-- 3. Verify RLS policies
SELECT
    'Current RLS policies:' as info,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'task_dependencies';

-- 4. Show sample data if any exists
SELECT
    'Sample data:' as info,
    COUNT(*) as row_count
FROM task_dependencies;

-- 5. Test basic insert (will be rolled back)
DO $$
DECLARE
    test_workspace_id UUID;
    test_task1_id UUID;
    test_task2_id UUID;
    test_user_id UUID;
BEGIN
    -- Get some test IDs (if they exist)
    SELECT id INTO test_workspace_id FROM workspaces LIMIT 1;
    SELECT id INTO test_task1_id FROM tasks LIMIT 1;
    SELECT id INTO test_task2_id FROM tasks LIMIT 1 OFFSET 1;
    SELECT id INTO test_user_id FROM auth.users LIMIT 1;

    IF test_workspace_id IS NOT NULL AND test_task1_id IS NOT NULL AND test_task2_id IS NOT NULL AND test_user_id IS NOT NULL THEN
        -- Test insert (this will be rolled back)
        BEGIN
            INSERT INTO task_dependencies (
                workspace_id,
                task_id,
                depends_on_task_id,
                dependency_type,
                lag_days,
                created_by
            ) VALUES (
                test_workspace_id,
                test_task1_id,
                test_task2_id,
                'finish_to_start',
                0,
                test_user_id
            );

            RAISE NOTICE 'SUCCESS: Test insert worked - schema is correct!';

            -- Clean up the test record
            DELETE FROM task_dependencies
            WHERE task_id = test_task1_id AND depends_on_task_id = test_task2_id;

        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE 'ERROR: Test insert failed - %', SQLERRM;
        END;
    ELSE
        RAISE NOTICE 'SKIPPED: No test data available for insert test';
    END IF;
END $$;
