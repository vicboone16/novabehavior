
UPDATE behavior_strategies SET strategy_group = 'functional_communication_training' WHERE strategy_key IN ('break_request', 'help_request') AND (strategy_group IS NULL OR strategy_group = '');
UPDATE behavior_strategies SET strategy_group = 'attention_based' WHERE strategy_key = 'planned_ignoring' AND (strategy_group IS NULL OR strategy_group = '');
UPDATE behavior_strategies SET strategy_group = 'antecedent_interventions' WHERE strategy_key IN ('antecedent_mod', 'visual_schedule') AND (strategy_group IS NULL OR strategy_group = '');
UPDATE behavior_strategies SET strategy_group = 'reinforcement_systems' WHERE strategy_key = 'token_economy' AND (strategy_group IS NULL OR strategy_group = '');
