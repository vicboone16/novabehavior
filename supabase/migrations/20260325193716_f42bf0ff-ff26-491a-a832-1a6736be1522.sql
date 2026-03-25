
-- Deduplicate nt_behaviors: merge duplicate Physical Aggression, Verbal Aggression, Property Destruction
-- Keep the oldest entry, archive newer duplicates with successor pointer

-- Physical Aggression: keep e5a08140, archive 347fad3e
UPDATE nt_learner_behavior_assignments 
SET resolved_behavior_id = 'e5a08140-ae1f-4799-9ead-04717ff76f55'
WHERE behavior_id = '347fad3e-b1a2-43d8-a079-efc37bae8c8f';

UPDATE nt_behaviors 
SET status = 'merged', successor_id = 'e5a08140-ae1f-4799-9ead-04717ff76f55',
    is_selectable = false, is_historical = true, archived_at = now()
WHERE id = '347fad3e-b1a2-43d8-a079-efc37bae8c8f';

-- Verbal Aggression: keep bf23a9a4, archive 63f623b2
UPDATE nt_learner_behavior_assignments 
SET resolved_behavior_id = 'bf23a9a4-43b4-4cc9-9de6-a6694c437b07'
WHERE behavior_id = '63f623b2-3d52-4e7c-9283-25ee2edab087';

UPDATE nt_behaviors 
SET status = 'merged', successor_id = 'bf23a9a4-43b4-4cc9-9de6-a6694c437b07',
    is_selectable = false, is_historical = true, archived_at = now()
WHERE id = '63f623b2-3d52-4e7c-9283-25ee2edab087';

-- Property Destruction: keep 38a106c6, archive 0ec2321b
UPDATE nt_learner_behavior_assignments 
SET resolved_behavior_id = '38a106c6-1dd8-464e-a09e-dc8617e9f8a4'
WHERE behavior_id = '0ec2321b-0cdc-4cd0-a3de-a5e04a030a41';

UPDATE nt_behaviors 
SET status = 'merged', successor_id = '38a106c6-1dd8-464e-a09e-dc8617e9f8a4',
    is_selectable = false, is_historical = true, archived_at = now()
WHERE id = '0ec2321b-0cdc-4cd0-a3de-a5e04a030a41';

-- Normalize "Nc/Tr" to "Noncompliance"
UPDATE nt_behaviors SET name = 'Noncompliance' WHERE name = 'Nc/Tr';
