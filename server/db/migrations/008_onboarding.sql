-- Extend only the permitted document names; existing records are preserved.
ALTER TABLE user_nutrition DROP CONSTRAINT user_nutrition_key_check;
ALTER TABLE user_nutrition ADD CONSTRAINT user_nutrition_key_check CHECK
 (key IN ('profile','plan','targets','onboarding') OR key ~ '^day:[0-9]{4}-[0-9]{2}-[0-9]{2}$');
