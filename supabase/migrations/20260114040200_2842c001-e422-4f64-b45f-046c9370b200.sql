-- Add payday_day_of_week to profiles (0=Sunday, 1=Monday, ..., 5=Friday, 6=Saturday)
ALTER TABLE public.profiles 
ADD COLUMN payday_day_of_week INTEGER DEFAULT 5 CHECK (payday_day_of_week >= 0 AND payday_day_of_week <= 6);

-- Add comment for clarity
COMMENT ON COLUMN public.profiles.payday_day_of_week IS 'Day of week user gets paid (0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat). Transactions on this day at cycle end belong to next cycle.';