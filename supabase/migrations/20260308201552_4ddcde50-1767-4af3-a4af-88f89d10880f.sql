
-- Allow admins full access to reservations
CREATE POLICY "Admins can manage all reservations"
ON public.reservations
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Allow agents to view reservations on their properties
CREATE POLICY "Agents can view reservations on own properties"
ON public.reservations
FOR SELECT
TO authenticated
USING (agent_id = get_my_profile_id());

-- Allow agents to update reservations on their properties
CREATE POLICY "Agents can update reservations on own properties"
ON public.reservations
FOR UPDATE
TO authenticated
USING (agent_id = get_my_profile_id());

-- Allow admins to delete reservations
CREATE POLICY "Admins can delete reservations"
ON public.reservations
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
