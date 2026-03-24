-- Fix Teacher Mode route: /teacher-mode -> /teacher-dashboard
UPDATE app_navigation_structure 
SET route = '/teacher-dashboard' 
WHERE nav_key = 'teacher_mode';

-- Fix Teacher Mode sub-routes
UPDATE app_navigation_structure 
SET route = '/teacher-dashboard' 
WHERE nav_key = 'teacher_mode_dashboard';

UPDATE app_navigation_structure 
SET route = '/teacher-dashboard' 
WHERE nav_key = 'teacher_mode_students';