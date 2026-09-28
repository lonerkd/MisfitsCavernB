-- The writing loop: a daily word goal and sprint length per writer, and a row
-- per writer per day of the words they actually typed (pastes aren't writing;
-- the editor counts keystrokes, not the script's size) and sprints finished.
-- Streaks and records are computed from these rows (lib/writing).
--
-- A day's row is written only through log_writing(), which adds to it within
-- bounds — no direct writes, so a streak can't be set by hand.

ALTER TABLE public.profiles ADD COLUMN daily_word_goal integer DEFAULT 500 NOT NULL
  CONSTRAINT profiles_daily_word_goal_check CHECK (daily_word_goal BETWEEN 50 AND 20000);
ALTER TABLE public.profiles ADD COLUMN sprint_minutes integer DEFAULT 15 NOT NULL
  CONSTRAINT profiles_sprint_minutes_check CHECK (sprint_minutes BETWEEN 5 AND 120);

CREATE TABLE public.writing_days (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  day date NOT NULL,
  words integer DEFAULT 0 NOT NULL CONSTRAINT writing_days_words_check CHECK (words BETWEEN 0 AND 100000),
  sprints integer DEFAULT 0 NOT NULL CONSTRAINT writing_days_sprints_check CHECK (sprints BETWEEN 0 AND 500),
  -- The goal that day, so changing it later doesn't rewrite the past.
  goal integer NOT NULL CONSTRAINT writing_days_goal_check CHECK (goal BETWEEN 50 AND 20000),
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  PRIMARY KEY (user_id, day)
);

ALTER TABLE public.writing_days ENABLE ROW LEVEL SECURITY;
CREATE POLICY "writing_days own" ON public.writing_days FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- Adds the words typed (and a finished sprint) to the caller's day. `p_day` is
-- the writer's local date, which must be within a day of the server's.
CREATE FUNCTION public.log_writing(p_day date, p_words integer, p_sprint boolean DEFAULT false)
 RETURNS public.writing_days
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  uid uuid := (select auth.uid());
  g integer;
  r public.writing_days;
begin
  if uid is null then
    raise exception 'Sign in to log writing' using errcode = '42501';
  end if;
  if p_day is null or p_day < current_date - 1 or p_day > current_date + 1 then
    raise exception 'That isn''t today' using errcode = '22023';
  end if;
  if p_words is null or p_words < 0 or p_words > 5000 then
    raise exception 'Words out of range' using errcode = '22023';
  end if;
  select daily_word_goal into g from public.profiles where id = uid;
  insert into public.writing_days (user_id, day, words, sprints, goal)
  values (uid, p_day, p_words, case when p_sprint then 1 else 0 end, coalesce(g, 500))
  on conflict (user_id, day) do update
    set words = least(100000, public.writing_days.words + excluded.words),
        sprints = least(500, public.writing_days.sprints + excluded.sprints),
        goal = excluded.goal,
        updated_at = now()
  returning * into r;
  return r;
end;
$function$;
REVOKE ALL ON FUNCTION public.log_writing(date, integer, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.log_writing(date, integer, boolean) TO authenticated;

-- Profile columns are granted one by one (private ones stay private); the
-- writer's own goal and sprint length come back through this, to them only.
CREATE FUNCTION public.get_my_writing_prefs()
 RETURNS TABLE(daily_word_goal integer, sprint_minutes integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select p.daily_word_goal, p.sprint_minutes from public.profiles p where p.id = (select auth.uid());
$function$;
REVOKE ALL ON FUNCTION public.get_my_writing_prefs() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_writing_prefs() TO authenticated;
