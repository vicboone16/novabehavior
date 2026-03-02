
GRANT EXECUTE ON FUNCTION public.rpc_join_agency_with_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_join_agency_with_code(text) TO anon;
NOTIFY pgrst, 'reload schema';
