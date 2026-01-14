-- Add payday_date column to profiles (specific date to exclude from current cycle)
ALTER TABLE public.profiles 
ADD COLUMN payday_date DATE;

-- Add comment for clarity
COMMENT ON COLUMN public.profiles.payday_date IS 'The specific payday date. Recurring transactions on this date belong to the next cycle, not the current one.';

-- Drop the old day_of_week column since we're replacing it
ALTER TABLE public.profiles 
DROP COLUMN IF EXISTS payday_day_of_week;