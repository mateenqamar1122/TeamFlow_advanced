-- Fix for infinite recursion in workspace_members policies
-- This script drops and recreates the policies to fix the recursion issue

BEGIN;

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view workspace members" ON public.workspace_members;
DROP POLICY IF EXISTS "Users can insert workspace members" ON public.workspace_members;
DROP POLICY IF EXISTS "Users can update workspace members" ON public.workspace_members;
DROP POLICY IF EXISTS "Users can delete workspace members" ON public.workspace_members;

-- Recreate workspace_members policies without recursion
CREATE POLICY "Users can view workspace members"
ON public.workspace_members FOR SELECT
USING (
    user_id = auth.uid()
    OR workspace_id IN (
        SELECT workspace_id
        FROM public.workspace_members wm2
        WHERE wm2.user_id = auth.uid()
        AND wm2.is_active = true
        AND wm2.role IN ('admin', 'manager', 'member')
    )
);

CREATE POLICY "Users can insert workspace members"
ON public.workspace_members FOR INSERT
WITH CHECK (
    workspace_id IN (
        SELECT workspace_id
        FROM public.workspace_members wm2
        WHERE wm2.user_id = auth.uid()
        AND wm2.is_active = true
        AND wm2.role IN ('admin', 'manager')
    )
);

CREATE POLICY "Users can update workspace members"
ON public.workspace_members FOR UPDATE
USING (
    user_id = auth.uid()
    OR workspace_id IN (
        SELECT workspace_id
        FROM public.workspace_members wm2
        WHERE wm2.user_id = auth.uid()
        AND wm2.is_active = true
        AND wm2.role IN ('admin', 'manager')
    )
);

CREATE POLICY "Users can delete workspace members"
ON public.workspace_members FOR DELETE
USING (
    workspace_id IN (
        SELECT workspace_id
        FROM public.workspace_members wm2
        WHERE wm2.user_id = auth.uid()
        AND wm2.is_active = true
        AND wm2.role = 'admin'
    )
);

-- Fix workspace_invitations table if it exists
DO $$
BEGIN
    -- Add workspace_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'workspace_invitations'
        AND column_name = 'workspace_id'
    ) THEN
        ALTER TABLE public.workspace_invitations
        ADD COLUMN workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;
    END IF;

    -- Make workspace_id NOT NULL if it's currently NULL
    UPDATE public.workspace_invitations
    SET workspace_id = (
        SELECT w.id
        FROM public.workspaces w
        WHERE w.id IS NOT NULL
        LIMIT 1
    )
    WHERE workspace_id IS NULL;

    -- Add NOT NULL constraint
    ALTER TABLE public.workspace_invitations
    ALTER COLUMN workspace_id SET NOT NULL;
END $$;

-- Fix comments table relationships
DO $$
BEGIN
    -- Ensure comments table exists with proper structure
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'comments') THEN
        CREATE TABLE public.comments (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            content TEXT NOT NULL,
            author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
            entity_type VARCHAR(50) NOT NULL,
            entity_id UUID NOT NULL,
            parent_comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
            attachments TEXT[] DEFAULT ARRAY[]::TEXT[],
            mentions UUID[] DEFAULT ARRAY[]::UUID[],
            reactions JSONB DEFAULT '{}',
            is_edited BOOLEAN DEFAULT false,
            edited_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Create indexes
        CREATE INDEX idx_comments_entity ON public.comments(entity_type, entity_id);
        CREATE INDEX idx_comments_author ON public.comments(author_id);
        CREATE INDEX idx_comments_workspace ON public.comments(workspace_id);
        CREATE INDEX idx_comments_parent ON public.comments(parent_comment_id);

        -- Enable RLS
        ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

        -- Create policies
        CREATE POLICY "Users can view comments in their workspaces"
        ON public.comments FOR SELECT
        USING (
            workspace_id IN (
                SELECT workspace_id
                FROM public.workspace_members
                WHERE user_id = auth.uid()
                AND is_active = true
            )
        );

        CREATE POLICY "Users can insert comments in their workspaces"
        ON public.comments FOR INSERT
        WITH CHECK (
            author_id = auth.uid()
            AND workspace_id IN (
                SELECT workspace_id
                FROM public.workspace_members
                WHERE user_id = auth.uid()
                AND is_active = true
            )
        );

        CREATE POLICY "Users can update their own comments"
        ON public.comments FOR UPDATE
        USING (author_id = auth.uid());

        CREATE POLICY "Users can delete their own comments"
        ON public.comments FOR DELETE
        USING (
            author_id = auth.uid()
            OR workspace_id IN (
                SELECT workspace_id
                FROM public.workspace_members
                WHERE user_id = auth.uid()
                AND is_active = true
                AND role IN ('admin', 'manager')
            )
        );
    END IF;
END $$;

-- Fix comment_reactions table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'comment_reactions') THEN
        CREATE TABLE public.comment_reactions (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            comment_id UUID NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
            user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
            reaction_type VARCHAR(20) NOT NULL CHECK (reaction_type IN ('like', 'love', 'laugh', 'wow', 'sad', 'angry')),
            created_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(comment_id, user_id, reaction_type)
        );

        -- Enable RLS
        ALTER TABLE public.comment_reactions ENABLE ROW LEVEL SECURITY;

        -- Create policies
        CREATE POLICY "Users can view reactions in their workspaces"
        ON public.comment_reactions FOR SELECT
        USING (
            workspace_id IN (
                SELECT workspace_id
                FROM public.workspace_members
                WHERE user_id = auth.uid()
                AND is_active = true
            )
        );

        CREATE POLICY "Users can add reactions in their workspaces"
        ON public.comment_reactions FOR INSERT
        WITH CHECK (
            user_id = auth.uid()
            AND workspace_id IN (
                SELECT workspace_id
                FROM public.workspace_members
                WHERE user_id = auth.uid()
                AND is_active = true
            )
        );

        CREATE POLICY "Users can remove their own reactions"
        ON public.comment_reactions FOR DELETE
        USING (user_id = auth.uid());
    END IF;
END $$;

-- Fix project_health_scores table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'project_health_scores') THEN
        -- Drop and recreate with proper structure
        DROP TABLE public.project_health_scores CASCADE;
    END IF;

    CREATE TABLE public.project_health_scores (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
        workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
        overall_score INTEGER NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
        health_status VARCHAR(20) NOT NULL CHECK (health_status IN ('excellent', 'good', 'fair', 'poor', 'critical')),
        completion_rate DECIMAL(5,2) DEFAULT 0,
        schedule_adherence DECIMAL(5,2) DEFAULT 0,
        team_productivity DECIMAL(5,2) DEFAULT 0,
        quality_indicators JSONB DEFAULT '{}',
        risk_factors JSONB DEFAULT '[]',
        recommendations JSONB DEFAULT '[]',
        analysis_data JSONB DEFAULT '{}',
        generated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Create indexes
    CREATE INDEX idx_project_health_scores_project ON public.project_health_scores(project_id);
    CREATE INDEX idx_project_health_scores_workspace ON public.project_health_scores(workspace_id);
    CREATE INDEX idx_project_health_scores_created ON public.project_health_scores(created_at DESC);

    -- Enable RLS
    ALTER TABLE public.project_health_scores ENABLE ROW LEVEL SECURITY;

    -- Create policies
    CREATE POLICY "Users can view health scores in their workspaces"
    ON public.project_health_scores FOR SELECT
    USING (
        workspace_id IN (
            SELECT workspace_id
            FROM public.workspace_members
            WHERE user_id = auth.uid()
            AND is_active = true
        )
    );

    CREATE POLICY "Users can insert health scores in their workspaces"
    ON public.project_health_scores FOR INSERT
    WITH CHECK (
        workspace_id IN (
            SELECT workspace_id
            FROM public.workspace_members
            WHERE user_id = auth.uid()
            AND is_active = true
        )
    );
END $$;

COMMIT;
