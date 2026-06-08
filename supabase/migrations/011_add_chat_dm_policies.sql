-- Migration 011: Add RLS policies to allow direct messaging (DMs) between team members

-- Allow users to read messages in DMs they are part of
CREATE POLICY "Users can read DMs they are part of"
    ON public.messages
    FOR SELECT
    USING (
        company_id = get_jwt_company_id() AND
        channel_name LIKE 'dm_%' AND
        channel_name LIKE '%' || auth.uid()::text || '%'
    );

-- Allow users to insert messages in DMs they are part of
CREATE POLICY "Users can insert DMs they are part of"
    ON public.messages
    FOR INSERT
    WITH CHECK (
        company_id = get_jwt_company_id() AND
        channel_name LIKE 'dm_%' AND
        channel_name LIKE '%' || auth.uid()::text || '%'
    );
