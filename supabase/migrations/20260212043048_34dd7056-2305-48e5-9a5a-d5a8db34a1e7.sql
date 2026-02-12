
-- Add AFLS Social Skills (Elementary) as a separate curriculum system
INSERT INTO curriculum_systems (name, type, description, active)
VALUES (
  'AFLS - Social Skills (Elementary)',
  'assessment',
  'Assessment of Functional Living Skills - Social Skills module for elementary-age students. Uses 0-4 scoring scale across social interaction, communication, and community participation skill areas.',
  true
);

-- Add AFLS Social Skills (High School) as a separate curriculum system
INSERT INTO curriculum_systems (name, type, description, active)
VALUES (
  'AFLS - Social Skills (High School)',
  'assessment',
  'Assessment of Functional Living Skills - Social Skills module for high school-age students. Uses 0-4 scoring scale across social interaction, communication, and community participation skill areas.',
  true
);
