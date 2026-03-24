-- Fix sub-routes that don't exist in App.tsx -> redirect to parent with query params

-- Optimization sub-routes -> use parent route with tab params
UPDATE app_navigation_structure SET route = '/optimization?tab=dashboard' WHERE nav_key = 'optimization_dashboard';
UPDATE app_navigation_structure SET route = '/optimization?tab=workflows' WHERE nav_key = 'optimization_workflows';
UPDATE app_navigation_structure SET route = '/optimization?tab=recommendations' WHERE nav_key = 'optimization_recommendations';

-- Supervision sub-routes -> use parent route with tab params
UPDATE app_navigation_structure SET route = '/supervision?tab=dashboard' WHERE nav_key = 'supervision_dashboard';
UPDATE app_navigation_structure SET route = '/supervision?tab=caseload' WHERE nav_key = 'supervision_caseload';
UPDATE app_navigation_structure SET route = '/supervision?tab=fieldwork' WHERE nav_key = 'supervision_fieldwork';
UPDATE app_navigation_structure SET route = '/supervision?tab=team' WHERE nav_key = 'supervision_team';
UPDATE app_navigation_structure SET route = '/supervision?tab=logs' WHERE nav_key = 'supervision_logs';

-- Nova AI sub-routes
UPDATE app_navigation_structure SET route = '/nova-ai?tab=assistant' WHERE nav_key = 'nova_ai_assistant';
UPDATE app_navigation_structure SET route = '/nova-ai?tab=clinical-tools' WHERE nav_key = 'nova_ai_clinical';
UPDATE app_navigation_structure SET route = '/nova-ai?tab=insights' WHERE nav_key = 'nova_ai_insights';
UPDATE app_navigation_structure SET route = '/nova-ai?tab=reports' WHERE nav_key = 'nova_ai_reports';

-- Resource Hub sub-routes
UPDATE app_navigation_structure SET route = '/resource-hub?tab=team-files' WHERE nav_key = 'resource_hub_team_files';
UPDATE app_navigation_structure SET route = '/resource-hub?tab=personal-files' WHERE nav_key = 'resource_hub_personal_files';
UPDATE app_navigation_structure SET route = '/resource-hub?tab=upload' WHERE nav_key = 'resource_hub_upload';

-- Clinical Library sub-routes
UPDATE app_navigation_structure SET route = '/clinical-library?tab=organization' WHERE nav_key = 'clinical_library_org';
UPDATE app_navigation_structure SET route = '/clinical-library?tab=personal' WHERE nav_key = 'clinical_library_personal';
UPDATE app_navigation_structure SET route = '/clinical-library?tab=reviews' WHERE nav_key = 'clinical_library_reviews';
UPDATE app_navigation_structure SET route = '/clinical-library?tab=templates' WHERE nav_key = 'clinical_library_templates';