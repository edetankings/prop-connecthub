CREATE POLICY "Thread members can update last_message_at"
ON public.chat_threads
FOR UPDATE
USING (
  buyer_id = get_my_profile_id() OR agent_id = get_my_profile_id()
)
WITH CHECK (
  buyer_id = get_my_profile_id() OR agent_id = get_my_profile_id()
);