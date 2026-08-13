
ALTER TABLE public.assessment_capture_records
  DROP CONSTRAINT IF EXISTS assessment_capture_records_record_type_check;

ALTER TABLE public.assessment_capture_records
  ADD CONSTRAINT assessment_capture_records_record_type_check
  CHECK (record_type = ANY (ARRAY[
    'fba_structured_observation'::text,
    'cold_probe_session'::text,
    'observation_notes'::text,
    'fba_findings'::text,
    'bip_document'::text,
    'fidelity_check'::text,
    'brief_record_review'::text,
    'brief_teacher_input'::text,
    'historical_observation'::text,
    'abc_function_tags'::text
  ]));
