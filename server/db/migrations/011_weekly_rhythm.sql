-- Server-managed achievement journal in the existing private account document table.
-- Generic nutrition routes do not accept this document key.
ALTER TABLE user_nutrition DROP CONSTRAINT user_nutrition_key_check;
ALTER TABLE user_nutrition ADD CONSTRAINT user_nutrition_key_check CHECK (
 key IN ('profile','plan','targets','onboarding','meals','water-settings','rhythm')
 OR key ~ '^(day:|water:)[0-9]{4}-[0-9]{2}-[0-9]{2}$'
);
