-- The app was renamed from Fretly to Guitar Workouts: only the descriptions
-- (comments) of the table and the function change; data and access stay the same.

comment on table public.lesson_progress is 'Finished lessons per user (Guitar Workouts). Written by the app with the publishable key; RLS limits every user to their own rows.';

comment on function public.delete_own_account() is 'Guitar Workouts: deletes the calling user (and, by cascade, their progress).';
