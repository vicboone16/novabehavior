-- Hide separate behavior nav items, they now live inside Clinical Library
UPDATE app_navigation_structure 
SET is_visible = false 
WHERE nav_key IN ('behavior_bank', 'behavior_library_full');
