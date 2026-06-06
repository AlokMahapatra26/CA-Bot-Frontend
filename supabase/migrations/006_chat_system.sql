-- Migration 006: Chat System schema & RLS policies

-- 1. Create the messages table
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    channel_name TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 2. Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies

-- Policy: Users can only select messages within their own company AND their allowed channels
CREATE POLICY "Users can read messages in their company and allowed channels"
    ON public.messages
    FOR SELECT
    USING (
        company_id = get_jwt_company_id() AND
        (
            channel_name = 'firm_general' OR
            (channel_name = 'management' AND (auth.jwt() -> 'app_metadata' ->> 'role' IN ('admin', 'hod'))) OR
            (channel_name = 'dept_itr' AND (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin' OR auth.jwt() -> 'app_metadata' ->> 'department' = 'ITR')) OR
            (channel_name = 'dept_gst' AND (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin' OR auth.jwt() -> 'app_metadata' ->> 'department' = 'GST')) OR
            (channel_name = 'dept_dsc' AND (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin' OR auth.jwt() -> 'app_metadata' ->> 'department' = 'DSC'))
        )
    );

-- Policy: Users can only insert messages into their own company AND their allowed channels
CREATE POLICY "Users can insert messages into their company and allowed channels"
    ON public.messages
    FOR INSERT
    WITH CHECK (
        company_id = get_jwt_company_id() AND
        (
            channel_name = 'firm_general' OR
            (channel_name = 'management' AND (auth.jwt() -> 'app_metadata' ->> 'role' IN ('admin', 'hod'))) OR
            (channel_name = 'dept_itr' AND (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin' OR auth.jwt() -> 'app_metadata' ->> 'department' = 'ITR')) OR
            (channel_name = 'dept_gst' AND (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin' OR auth.jwt() -> 'app_metadata' ->> 'department' = 'GST')) OR
            (channel_name = 'dept_dsc' AND (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin' OR auth.jwt() -> 'app_metadata' ->> 'department' = 'DSC'))
        )
    );

-- 4. Enable Supabase Realtime for the messages table
-- Note: 'supabase_realtime' is the default publication created by Supabase.
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'messages'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE messages;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Failed to add messages to supabase_realtime publication: %', SQLERRM;
END;
$$;
